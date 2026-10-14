import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { customerAccounts, emailOutbox, orderItems, orders } from "../drizzle/schema";
import { getDb } from "./db";
import { sendCustomerMagicLink, sendOrderCredentialEmail } from "./emailDelivery";
import { clearCustomerSessionCookie, hashMagicToken, newMagicToken, setCustomerSessionCookie } from "./customerAuth";
import { customerProcedure, router, sameOriginProcedure } from "./_core/trpc";

const failedAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxFailures: number, intervalMs: number): boolean {
  const now = Date.now();
  const current = failedAttempts.get(key);
  if (!current || current.resetAt <= now) return true;
  return current.count < maxFailures;
}
function recordFailure(key: string, intervalMs: number): void {
  const now = Date.now();
  const current = failedAttempts.get(key);
  if (!current || current.resetAt <= now) {
    failedAttempts.set(key, { count: 1, resetAt: now + intervalMs });
  } else {
    current.count += 1;
  }
}
function clearFailure(key: string): void {
  failedAttempts.delete(key);
}
function normalizeCodes(raw: string | null, _quantity?: number): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) {
      if (typeof value === "string" && value.trim()) return [value.trim()];
      return [];
    }
    return value.map(entry => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.codeValue === "string") return obj.codeValue.trim();
        if (typeof obj.code === "string") return obj.code.trim();
        if (typeof obj.value === "string") return obj.value.trim();
        if (typeof obj.secret === "string") return obj.secret.trim();
        return JSON.stringify(obj);
      }
      return String(entry ?? "").trim();
    }).filter(Boolean);
  } catch {
    return raw?.trim() ? [raw.trim()] : [];
  }
}

function normalizePhone(p: string | null | undefined): string {
  if (!p) return "";
  const cleaned = p.replace(/\D/g, "");
  if (cleaned.length >= 10) return cleaned.slice(-10);
  return cleaned;
}

function normalizeOrderNo(o: string | null | undefined): string {
  if (!o) return "";
  return o.trim().toUpperCase().replace(/^#/, "").replace(/^AZ-/, "").replace(/[^A-Z0-9]/g, "");
}

export const customerAccountRouter = router({
  loginDirect: sameOriginProcedure.input(z.object({
    email: z.string().trim().max(320).optional(),
    identifier: z.string().trim().max(320).optional(),
    phoneOrOrder: z.string().trim().min(3).max(64),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });

    const first = (input.email || input.identifier || "").trim();
    const second = input.phoneOrOrder.trim();
    if (!first || !second) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Email/Phone এবং Order code দিন।" });
    }

    const rateKey = `login:${createHash("sha256").update(`${first}:${second}`).digest("hex")}`;
    if (!checkRateLimit(rateKey, 25, 10 * 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।" });
    }

    let candidateEmail: string | null = first.includes("@") ? first.toLowerCase() : second.includes("@") ? second.toLowerCase() : null;
    let matchedOrder: typeof orders.$inferSelect | undefined;

    if (candidateEmail) {
      const secret = candidateEmail === first.toLowerCase() ? second : first;
      const customerOrders = await db.select().from(orders).where(eq(orders.customerEmail, candidateEmail));
      const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.email, candidateEmail)).limit(1);

      if (!customerOrders.length && !account) {
        recordFailure(rateKey, 10 * 60_000);
        throw new TRPCError({ code: "NOT_FOUND", message: "এই Email ঠিকানায় কোনো অর্ডার বা অ্যাকাউন্ট পাওয়া যায়নি।" });
      }

      const accountPhone = normalizePhone(account?.phone);
      const secretPhone = normalizePhone(secret);
      const secretOrder = normalizeOrderNo(secret);

      if (accountPhone && secretPhone && accountPhone === secretPhone) {
        matchedOrder = customerOrders[0];
      }
      if (!matchedOrder) {
        for (const ord of customerOrders) {
          const ordPhone = normalizePhone(ord.customerPhone);
          const ordNo = normalizeOrderNo(ord.orderNo);
          if ((ordPhone && secretPhone && ordPhone === secretPhone) ||
              (ordNo && secretOrder && ordNo === secretOrder) ||
              (ord.orderNo && (ord.orderNo === secret.toUpperCase() || ord.orderNo.endsWith(secret.toUpperCase())))) {
            matchedOrder = ord;
            break;
          }
        }
      }
    } else {
      // Neither term has '@' -> One is Phone number and one is Order ID
      const secretOrderA = normalizeOrderNo(first);
      const secretPhoneB = normalizePhone(second);
      const secretOrderB = normalizeOrderNo(second);
      const secretPhoneA = normalizePhone(first);

      const allRecentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
      for (const ord of allRecentOrders) {
        const ordNo = normalizeOrderNo(ord.orderNo);
        const ordPhone = normalizePhone(ord.customerPhone);
        if ((ordNo === secretOrderA && ordPhone === secretPhoneB) ||
            (ordNo === secretOrderB && ordPhone === secretPhoneA)) {
          matchedOrder = ord;
          candidateEmail = ord.customerEmail.toLowerCase();
          break;
        }
      }
    }

    if (!matchedOrder && !candidateEmail) {
      recordFailure(rateKey, 10 * 60_000);
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "প্রদত্ত Phone নম্বর বা Order code-এর সাথে কোনো অর্ডারের তথ্যের মিল পাওয়া যায়নি।",
      });
    }

    const email = candidateEmail || matchedOrder?.customerEmail?.toLowerCase();
    if (!email) {
      recordFailure(rateKey, 10 * 60_000);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "অর্ডারের সাথে যুক্ত Email পাওয়া যায়নি।" });
    }

    let [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.email, email)).limit(1);
    const customerOrders = await db.select().from(orders).where(eq(orders.customerEmail, email));

    // Clear failure count on success
    clearFailure(rateKey);

    if (!account) {
      const [newAcc] = await db.insert(customerAccounts).values({
        name: customerOrders[0]?.customerName || email.split("@")[0] || "Customer",
        email,
        phone: customerOrders[0]?.customerPhone || "",
        emailVerifiedAt: new Date(),
      }).returning();
      account = newAcc;
    } else if (!account.emailVerifiedAt) {
      await db.update(customerAccounts).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(customerAccounts.id, account.id));
    }

    await db.update(orders).set({ customerAccountId: account.id, updatedAt: new Date() }).where(eq(orders.customerEmail, email));

    const originHeader = ctx.req.headers.origin;
    setCustomerSessionCookie(ctx.res, account.id, Array.isArray(originHeader) ? originHeader[0] : originHeader);

    return { success: true, email: account.email } as const;
  }),

  requestLink: sameOriginProcedure.input(z.object({
    email: z.string().trim().email().max(320),
    phoneOrOrder: z.string().trim().max(64).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const email = input.email.toLowerCase().trim();
    const rateKey = `req:${createHash("sha256").update(email).digest("hex")}`;
    if (!checkRateLimit(rateKey, 30, 10 * 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "অনেকবার লিঙ্ক চাওয়া হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।" });
    }

    const secret = input.phoneOrOrder?.trim();
    if (secret) {
      let [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.email, email)).limit(1);
      const customerOrders = await db.select().from(orders).where(eq(orders.customerEmail, email));

      let matched = false;
      const accountPhone = normalizePhone(account?.phone);
      const secretPhone = normalizePhone(secret);
      const secretOrder = normalizeOrderNo(secret);
      if (accountPhone && secretPhone && accountPhone === secretPhone) {
        matched = true;
      }
      for (const ord of customerOrders) {
        const ordPhone = normalizePhone(ord.customerPhone);
        const ordNo = normalizeOrderNo(ord.orderNo);
        if (ordPhone && secretPhone && ordPhone === secretPhone) {
          matched = true;
          break;
        }
        if ((ordNo && secretOrder && ordNo === secretOrder) ||
            (ord.orderNo && (ord.orderNo === secret.toUpperCase() || ord.orderNo.endsWith(secret.toUpperCase())))) {
          matched = true;
          break;
        }
      }

      if (matched) {
        if (!account) {
          const [newAcc] = await db.insert(customerAccounts).values({
            name: customerOrders[0]?.customerName || email.split("@")[0] || "Customer",
            email,
            phone: customerOrders[0]?.customerPhone || secret,
            emailVerifiedAt: new Date(),
          }).returning();
          account = newAcc;
        } else if (!account.emailVerifiedAt) {
          await db.update(customerAccounts).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(customerAccounts.id, account.id));
        }
        await db.update(orders).set({ customerAccountId: account.id, updatedAt: new Date() }).where(eq(orders.customerEmail, email));
        const originHeader = ctx.req.headers.origin;
        setCustomerSessionCookie(ctx.res, account.id, Array.isArray(originHeader) ? originHeader[0] : originHeader);
        return {
          success: true,
          verified: true,
          directUrl: null as string | null,
          message: "অ্যাকাউন্টে সরাসরি প্রবেশ করা হয়েছে।",
        } as const;
      }
    }

    try {
      let generatedToken: string | null = null;
      const result = await db.transaction(async tx => {
        let [account] = await tx.select().from(customerAccounts).where(eq(customerAccounts.email, email)).for("update");
        if (!account) {
          const [matchingOrder] = await tx.select().from(orders).where(eq(orders.customerEmail, email)).limit(1);
          if (matchingOrder) {
            const [newAcc] = await tx.insert(customerAccounts).values({
              name: matchingOrder.customerName || email.split("@")[0] || "Customer",
              email,
              phone: matchingOrder.customerPhone || "",
            }).returning();
            account = newAcc;
          }
        }
        if (!account) return null;
        const token = newMagicToken();
        const purpose = account.emailVerifiedAt ? "login" as const : "verify" as const;
        await tx.update(customerAccounts).set({ magicTokenHash: token.hash, magicTokenExpiresAt: token.expiresAt, magicTokenPurpose: purpose, updatedAt: new Date() }).where(eq(customerAccounts.id, account.id));
        return { id: account.id, token: token.token, purpose };
      });

      if (result) {
        generatedToken = result.token;
        const mailResult = await sendCustomerMagicLink(result.id, result.token, result.purpose);
        if (mailResult === "sent") {
          return {
            success: true,
            verified: false,
            directUrl: null as string | null,
            message: "আপনার ইমেইলে sign-in link পাঠানো হয়েছে। Link ১০ মিনিট কার্যকর থাকবে।",
          } as const;
        }
      }

      if (generatedToken) {
        return {
          success: true,
          verified: false,
          directUrl: `/account/verify#token=${generatedToken}`,
          message: "কাস্টম ডোমেইন ছাড়া সরাসরি প্রবেশের লিঙ্ক তৈরি হয়েছে। নিচের বাটনে ক্লিক করে অ্যাকাউন্টে প্রবেশ করুন।",
        } as const;
      }
    } catch {
      // Always return gracefully
    }

    return {
      success: true,
      verified: false,
      directUrl: null as string | null,
      message: "যদি এই email-এ অর্ডার থাকে, অ্যাকাউন্ট লিঙ্ক প্রস্তুত করা হবে।",
    } as const;
  }),

  verifyLink: sameOriginProcedure.input(z.object({ token: z.string().min(24).max(128) })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const hash = hashMagicToken(input.token);
    const verified = await db.transaction(async tx => {
      const [account] = await tx.select().from(customerAccounts).where(eq(customerAccounts.magicTokenHash, hash)).for("update");
      if (!account || !account.magicTokenExpiresAt || new Date(account.magicTokenExpiresAt).getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "এই sign-in link expire হয়েছে বা ইতিমধ্যে ব্যবহার করা হয়েছে। নতুন link চান।" });
      }
      await tx.update(customerAccounts).set({ emailVerifiedAt: account.emailVerifiedAt ?? new Date(), magicTokenHash: null, magicTokenExpiresAt: null, magicTokenPurpose: null, updatedAt: new Date() }).where(eq(customerAccounts.id, account.id));
      await tx.update(orders).set({ customerAccountId: account.id, updatedAt: new Date() }).where(eq(orders.customerEmail, account.email.toLowerCase()));
      return { id: account.id, email: account.email };
    });
    const originHeader = ctx.req.headers.origin;
    setCustomerSessionCookie(ctx.res, verified.id, Array.isArray(originHeader) ? originHeader[0] : originHeader);
    void (async () => {
      const completed = await db.select({ id: orders.id }).from(orders)
        .where(and(eq(orders.customerEmail, verified.email), eq(orders.status, "fulfilled")))
        .orderBy(desc(orders.createdAt)).limit(25);
      for (const order of completed) await sendOrderCredentialEmail(order.id);
    })().catch(() => undefined);
    return { success: true } as const;
  }),

  me: customerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const email = ctx.customer.email.toLowerCase();
    const recentOrders = await db.select().from(orders)
      .where(or(eq(orders.customerAccountId, ctx.customer.id), eq(orders.customerEmail, email)))
      .orderBy(desc(orders.createdAt)).limit(100);
    const messages = await db.select().from(emailOutbox)
      .where(and(eq(emailOutbox.customerAccountId, ctx.customer.id), eq(emailOutbox.kind, "delivery")))
      .orderBy(desc(emailOutbox.createdAt)).limit(200);
    const deliveryByOrder = new Map<number, { status: string; sentAt: Date | null; attemptedAt: Date }>();
    for (const message of messages) if (message.orderId && !deliveryByOrder.has(message.orderId)) {
      deliveryByOrder.set(message.orderId, { status: message.status, sentAt: message.sentAt, attemptedAt: message.createdAt });
    }
    const itemsByOrder = await Promise.all(recentOrders.map(async order => {
      const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return [order.id, rows] as const;
    }));
    const itemMap = new Map(itemsByOrder);
    return {
      customer: { name: ctx.customer.name, email: ctx.customer.email, phone: ctx.customer.phone, emailVerifiedAt: ctx.customer.emailVerifiedAt },
      orders: recentOrders.map(order => ({
        id: order.id, orderNo: order.orderNo, status: order.status, createdAt: order.createdAt,
        totalAmount: order.totalAmount, currency: order.currency, paymentMethod: order.paymentMethod,
        deliveryEmail: deliveryByOrder.get(order.id) ?? null,
        items: (itemMap.get(order.id) ?? []).map(item => ({
          serviceName: item.serviceName, quantity: item.quantity, fulfillmentState: item.fulfillmentState,
          codes: order.status === "fulfilled" && item.fulfillmentState === "fulfilled" ? normalizeCodes(item.resultCodes, item.quantity) : [],
        })),
      })),
    };
  }),

  resendCredentials: customerProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    if (!checkRateLimit(`resend:${ctx.customer.id}`, 5, 60 * 60_000)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "এই account-এর delivery email resend limit পূর্ণ হয়েছে। পরে আবার চেষ্টা করুন।" });
    recordFailure(`resend:${ctx.customer.id}`, 60 * 60_000);
    const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), or(eq(orders.customerAccountId, ctx.customer.id), eq(orders.customerEmail, ctx.customer.email.toLowerCase())))).limit(1);
    if (!order || order.status !== "fulfilled") throw new TRPCError({ code: "NOT_FOUND", message: "সম্পূর্ণ order পাওয়া যায়নি।" });
    const recent = await db.select().from(emailOutbox).where(and(eq(emailOutbox.orderId, order.id), eq(emailOutbox.kind, "delivery"), gte(emailOutbox.createdAt, new Date(Date.now() - 60 * 60_000)))).limit(1);
    if (recent.length) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "এই order-এর delivery email সম্প্রতি পাঠানো হয়েছে বা delivery review চলছে। এক ঘণ্টা পরে retry করুন।" });
    const result = await sendOrderCredentialEmail(order.id, randomUUID());
    return { status: result } as const;
  }),

  logout: sameOriginProcedure.mutation(({ ctx }) => {
    const originHeader = ctx.req.headers.origin;
    clearCustomerSessionCookie(ctx.res, Array.isArray(originHeader) ? originHeader[0] : originHeader);
    return { success: true } as const;
  }),
});

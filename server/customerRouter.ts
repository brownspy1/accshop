import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { customerAccounts, emailOutbox, orderItems, orders } from "../drizzle/schema";
import { getDb } from "./db";
import { sendCustomerMagicLink, sendOrderCredentialEmail } from "./emailDelivery";
import { clearCustomerSessionCookie, hashMagicToken, newMagicToken, setCustomerSessionCookie } from "./customerAuth";
import { customerProcedure, router, sameOriginProcedure } from "./_core/trpc";

const accessRate = new Map<string, { count: number; resetAt: number }>();
function allow(key: string, maximum: number, intervalMs: number) {
  const now = Date.now();
  const current = accessRate.get(key);
  if (!current || current.resetAt <= now) {
    accessRate.set(key, { count: 1, resetAt: now + intervalMs });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count += 1;
  return true;
}
function normalizeCodes(raw: string | null, quantity: number): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const codes = value.map(entry => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object" && "codeValue" in entry && typeof (entry as { codeValue?: unknown }).codeValue === "string") return (entry as { codeValue: string }).codeValue.trim();
      return "";
    }).filter(Boolean);
    return codes.length === quantity && new Set(codes).size === codes.length ? codes : [];
  } catch { return []; }
}

export const customerAccountRouter = router({
  requestLink: sameOriginProcedure.input(z.object({ email: z.string().trim().email().max(320) })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
    const email = input.email.toLowerCase();
    const rateKey = `${ctx.req.ip || "unknown"}:${createHash("sha256").update(email).digest("hex")}`;
    if (!allow(rateKey, 3, 10 * 60_000) || !allow(`ip:${ctx.req.ip || "unknown"}`, 12, 10 * 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "অনেকবার link চাওয়া হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।" });
    }
    try {
      const result = await db.transaction(async tx => {
        const [account] = await tx.select().from(customerAccounts).where(eq(customerAccounts.email, email)).for("update");
        if (!account) return null;
        const token = newMagicToken();
        const purpose = account.emailVerifiedAt ? "login" as const : "verify" as const;
        await tx.update(customerAccounts).set({ magicTokenHash: token.hash, magicTokenExpiresAt: token.expiresAt, magicTokenPurpose: purpose, updatedAt: new Date() }).where(eq(customerAccounts.id, account.id));
        return { id: account.id, token: token.token, purpose };
      });
      if (result) await sendCustomerMagicLink(result.id, result.token, result.purpose);
    } catch {
      // Always return the same response so account existence is not disclosed.
    }
    return { success: true, message: "যদি এই email-এ store account থাকে এবং email service configured থাকে, sign-in link পাঠানো হবে। Link ১০ মিনিট কার্যকর থাকবে।" } as const;
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
    if (!allow(`resend:${ctx.customer.id}`, 3, 60 * 60_000)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "এই account-এর delivery email resend limit পূর্ণ হয়েছে। পরে আবার চেষ্টা করুন।" });
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

import { createHash, randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, inArray, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { activationServices, customerAccounts, customProductInventory, orderItems, orders, providerCredentials, storeSettings } from "../drizzle/schema";
import { AcczoneError, buyActivation, getBalance, getHistory, getServices, hasApiKey, testAndSaveApiKey } from "./acczone";
import { CouponShopsError, createCouponOrder, getCouponBalance, getCouponServices, retrieveCouponOrder, verifyAndSaveCouponShopsKey } from "./couponshops";
import { BotResellerError, createBotResellerOrder, getBotResellerBalance, normalizeBotResellerUrl, retrieveBotResellerOrder, testBotResellerConnection } from "./botReseller";
import { deleteProviderCredentials, getProviderApiKey, getProviderCredentialStatus, getProviderDetails, hasProviderApiKey, listAllConfiguredProviders, saveBotResellerProvider, verifyAndSaveProviderApiKey, type ShopProvider } from "./providerCredentials";
import { getDb } from "./db";
import { mysqlAffectedRows, mysqlInsertId } from "./dbResults";
import { refreshCatalogIfNeeded, SUPPLIER_STOCK_MAX_AGE_MS, syncProviderCatalog } from "./catalogSync";
import { markupRatioForManualRetailPrice, supplierCostInStoreCurrency } from "./pricing";
import { hashMagicToken, newMagicToken } from "./customerAuth";
import { customerRecentDeliveryMail, inspectEmailConfigForAdmin, sendCustomerMagicLink, sendOrderCredentialEmail } from "./emailDelivery";
import { saveGmailCredentials, sendGmailEmail } from "./gmailMailer";
import { listResendDomains, verifiedSenderDomain } from "./resend";
import { setDynamicAdminEmail } from "./_core/adminAllowlist";
import { hashAdminPassword, verifyAdminPassword, verifyFallbackAdminSecret } from "./adminAuth";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { ensureProductThumbnailsInDb, getProductThumbnail } from "./productThumbnails";
import { createCustomProduct, addBulkCredentialsToVault, listCustomProductsWithStats, listVaultItems, deleteVaultItem, returnVaultItemToStock, updateVaultItem } from "./customInventory";

const newOrderNo = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 13);
const defaultSettings = {
  id: 1, currency: "BDT", paymentInstructions: "", bkashNumber: "", nagadNumber: "", bankDetails: "", supportContact: "",
  inrToStoreRate: 0, usdtToStoreRate: 0, acczoneUnitToStoreRate: 0,
  resendFromEmail: "", publicSiteUrl: "",
  adminUsername: "admin",
  adminEmail: "",
  adminPasswordHash: null as string | null,
  adminPasswordSalt: null as string | null,
};
const rateBuckets = new Map<string, { count: number; since: number }>();

let storeSettingsColumnsMigrated = false;
async function ensureStoreSettingsColumns(db: any) {
  if (storeSettingsColumnsMigrated) return;
  try {
    await db.execute(sql`
      ALTER TABLE store_settings 
      ADD COLUMN IF NOT EXISTS "adminUsername" varchar(128) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS "adminEmail" varchar(320),
      ADD COLUMN IF NOT EXISTS "adminPasswordHash" varchar(256),
      ADD COLUMN IF NOT EXISTS "adminPasswordSalt" varchar(64);
    `);
    storeSettingsColumnsMigrated = true;
  } catch (err) {
    // If table doesn't exist yet or already has columns, log and continue
    console.warn("[DB Migration] store_settings columns ensure:", err);
  }
}

async function settings() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureStoreSettingsColumns(db);
  const [saved] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  const combined = { ...defaultSettings, ...saved };
  if (combined.adminEmail) {
    setDynamicAdminEmail(combined.adminEmail);
  }
  return combined;
}

function publicPaymentMethods(s: Awaited<ReturnType<typeof settings>>) {
  return [
    ...(s.bkashNumber?.trim() ? [{ id: "bkash" as const, label: "bKash", account: s.bkashNumber }] : []),
    ...(s.nagadNumber?.trim() ? [{ id: "nagad" as const, label: "Nagad", account: s.nagadNumber }] : []),
    ...(s.bankDetails?.trim() ? [{ id: "bank" as const, label: "Bank transfer", account: s.bankDetails }] : []),
  ];
}

function safelyParseCodes(value: string | null) {
  if (!value) return [];
  try {
    const result: unknown = JSON.parse(value);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export function extractCodeStrings(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const result: unknown = JSON.parse(raw);
    if (!Array.isArray(result)) {
      if (typeof result === "string" && result.trim()) return [result.trim()];
      return [];
    }
    return result
      .map(entry => {
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
      })
      .filter(Boolean);
  } catch {
    return raw.trim() ? [raw.trim()] : [];
  }
}

function queueCredentialEmail(orderId: number) {
  void sendOrderCredentialEmail(orderId).catch(() => undefined);
}

function assertRateLimit(action: string, ip: string, limit: number) {
  const now = Date.now();
  if (rateBuckets.size > 4_000) {
    for (const [key, bucket] of rateBuckets) if (now - bucket.since >= 60_000) rateBuckets.delete(key);
    while (rateBuckets.size > 4_000) rateBuckets.delete(rateBuckets.keys().next().value!);
  }
  const key = `${action}:${ip}`;
  const current = rateBuckets.get(key);
  if (!current || now - current.since >= 60_000) {
    rateBuckets.set(key, { count: 1, since: now });
    return;
  }
  if (current.count >= limit) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।" });
  current.count += 1;
}

function paymentLabel(method: "bkash" | "nagad" | "bank") {
  return method === "bkash" ? "bKash" : method === "nagad" ? "Nagad" : "Bank transfer";
}

type PricingTier = { minQuantity: number; maxQuantity: number; priceInr: number; priceUsdt: number };

function pricingTiers(raw: string | null): PricingTier[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): PricingTier[] => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const minQuantity = Math.trunc(Number(row.minQuantity));
      const maxQuantity = Math.trunc(Number(row.maxQuantity));
      const priceInr = Number(row.priceInr);
      const priceUsdt = Number(row.priceUsdt);
      return Number.isInteger(minQuantity) && minQuantity >= 1 && maxQuantity >= minQuantity
        && Number.isFinite(priceInr) && priceInr >= 0 && Number.isFinite(priceUsdt) && priceUsdt >= 0
        ? [{ minQuantity, maxQuantity, priceInr, priceUsdt }]
        : [];
    });
  } catch {
    return [];
  }
}

function couponServiceKey(serviceId: string) {
  return `cs_${createHash("sha256").update(serviceId).digest("hex").slice(0, 40)}`;
}

function couponTierForQuantity(product: typeof activationServices.$inferSelect, quantity: number) {
  return pricingTiers(product.pricingTiers).find(tier => quantity >= tier.minQuantity && quantity <= tier.maxQuantity);
}

function couponCodes(order: Awaited<ReturnType<typeof createCouponOrder>>, serviceKey: string) {
  return order.coupons.map((codeValue, index) => ({
    id: `${order.orderId}-${index}`,
    serviceKey,
    codeType: "coupon",
    codeValue,
    usedAt: "",
  }));
}

function botResellerCodes(delivered: string[], orderRef: string, serviceKey: string) {
  return delivered.map((codeValue, index) => ({
    id: `${orderRef}-${index}`,
    serviceKey,
    codeType: "credential",
    codeValue,
    usedAt: "",
  }));
}

function allUniqueCodes(codes: Array<{ codeValue: string }>) {
  return codes.length > 0 && new Set(codes.map(code => code.codeValue)).size === codes.length;
}

function couponStatusToOrderStatus(lines: Array<{ fulfillmentState: string }>) {
  if (lines.length && lines.every(line => line.fulfillmentState === "fulfilled")) return "fulfilled" as const;
  if (lines.some(line => line.fulfillmentState === "unknown" || line.fulfillmentState === "processing")) return "fulfillment_unknown" as const;
  if (lines.some(line => line.fulfillmentState === "fulfilled")) return "partially_fulfilled" as const;
  if (lines.some(line => line.fulfillmentState === "failed")) return "fulfillment_failed" as const;
  return "paid" as const;
}

const itemInput = z.object({ serviceKey: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/), quantity: z.number().int().min(1).max(100) });

const FALLBACK_STORE_CATALOG = [
  {
    serviceKey: "cs_24f8a6e1bbb3d0e7695f12bc8237964e13a291b4",
    name: "Gemini 18 month pro",
    description: "Gemini 1.5 Pro & Advanced AI subscription with full access to Gemini features",
    customDescription: "Gemini 1.5 Pro ও Advanced AI মডেলের ফুল অ্যাক্সেস",
    imageUrl: "brand:gemini",
    retailPrice: 40,
    stock: 13,
    stockFresh: true,
    stockSyncedAt: new Date().toISOString(),
    quantityTiers: [{ minQuantity: 1, maxQuantity: 10 }],
    maxAllowedQuantity: 10,
    isListed: 1,
    isActive: 1,
  },
  {
    serviceKey: "geminilive",
    name: "Gemini Pro 18M NEW",
    description: "New Gemini Pro 18 Months subscription for your personal account",
    customDescription: "Gemini 1.5 Pro ও Advanced AI মডেলের ফুল অ্যাক্সেস (নতুন ব্যাচ)",
    imageUrl: "brand:gemini",
    retailPrice: 45,
    stock: 8,
    stockFresh: true,
    stockSyncedAt: new Date().toISOString(),
    quantityTiers: [{ minQuantity: 1, maxQuantity: 10 }],
    maxAllowedQuantity: 10,
    isListed: 1,
    isActive: 1,
  },
  {
    serviceKey: "ADOBE_EXPRESS",
    name: "Adobe Express 12M",
    description: "Adobe Express 12 Months creative subscription on your own personal email account",
    customDescription: "নিজের ইমেইলে Adobe Express ক্রিয়েটিভ সুইটের অ্যাক্সেস",
    imageUrl: "brand:adobe",
    retailPrice: 50,
    stock: 45,
    stockFresh: true,
    stockSyncedAt: new Date().toISOString(),
    quantityTiers: [{ minQuantity: 1, maxQuantity: 10 }],
    maxAllowedQuantity: 10,
    isListed: 1,
    isActive: 1,
  },
  {
    serviceKey: "cs_fa83028def2911a1d43c8daf401640e2d495c640",
    name: "Adobe Express 12M readyMade ID",
    description: "Adobe Express 12 Months pre-activated readyMade ID and password",
    customDescription: "রেডিমেড আইডি সহ Adobe Express প্রিমিয়ামের পূর্ণ সুবিধা",
    imageUrl: "brand:adobe",
    retailPrice: 100,
    stock: 15,
    stockFresh: true,
    stockSyncedAt: new Date().toISOString(),
    quantityTiers: [{ minQuantity: 1, maxQuantity: 10 }],
    maxAllowedQuantity: 10,
    isListed: 1,
    isActive: 1,
  },
  {
    serviceKey: "DUOLINGO",
    name: "Duolingo Super 12M",
    description: "Duolingo Super 12 Months ad-free language learning with unlimited hearts",
    customDescription: "বিজ্ঞাপনহীন সুপার লার্নিং, আনলিমিটেড হার্টস ও প্র্যাকটিস টেস্ট",
    imageUrl: "brand:duolingo",
    retailPrice: 60,
    stock: 30,
    stockFresh: true,
    stockSyncedAt: new Date().toISOString(),
    quantityTiers: [{ minQuantity: 1, maxQuantity: 10 }],
    maxAllowedQuantity: 10,
    isListed: 1,
    isActive: 1,
  },
  {
    serviceKey: "cs_e659101c6b5f5ef88295ad5db35a327b810b990d",
    name: "PocketFM 3M",
    description: "Pocket FM 3 Months VIP subscription for unlimited audio stories and series",
    customDescription: "সব অডিও সিরিজ ও এক্সক্লুসিভ স্টোরিজের আনলিমিটেড স্ট্রিমিং",
    imageUrl: "brand:pocket",
    retailPrice: 50,
    stock: 25,
    stockFresh: true,
    stockSyncedAt: new Date().toISOString(),
    quantityTiers: [{ minQuantity: 1, maxQuantity: 10 }],
    maxAllowedQuantity: 10,
    isListed: 1,
    isActive: 1,
  },
];


export const shopRouter = router({
  catalog: router({
    list: publicProcedure.query(async () => {
      await refreshCatalogIfNeeded();
      const db = await getDb();
      if (!db) return FALLBACK_STORE_CATALOG;
      void ensureProductThumbnailsInDb(db);
      const rows = await db.select().from(activationServices).where(and(
        eq(activationServices.isListed, 1), eq(activationServices.isActive, 1),
      )).orderBy(activationServices.name);
      if (!rows.length && !process.env.DATABASE_URL) return FALLBACK_STORE_CATALOG;
      return rows.flatMap(row => {
        const available = Math.max(0, row.stock - row.reservedStock);
        if (available < 1 || row.retailPrice <= 0) return [];
        const allTiers = pricingTiers(row.pricingTiers);
        const purchasableTiers = row.provider === "couponshops" ? allTiers.filter(tier => tier.minQuantity <= Math.min(tier.maxQuantity, available)) : [];
        if (row.provider === "couponshops" && !purchasableTiers.length) return [];
        const tiers = purchasableTiers.map(({ minQuantity, maxQuantity }) => ({ minQuantity, maxQuantity: Math.min(maxQuantity, available) }));
        const maxAllowedQuantity = row.provider === "couponshops"
          ? Math.min(100, available, Math.max(...purchasableTiers.map(tier => tier.maxQuantity)))
          : row.provider === "custom"
            ? Math.min(50, available)
            : Math.min(10, available);
        const { supplierPrice: _cost, supplierCurrency: _currency, providerRate: _rate, providerServiceId: _providerId,
          provider: _provider, pricingTiers: _tiers, priceMarkupRatio: _markupRatio, reservedStock, stock, lastStockSyncedAt, ...item } = row;
        const stockAge = lastStockSyncedAt ? Date.now() - new Date(lastStockSyncedAt).getTime() : Number.POSITIVE_INFINITY;
        return [{
          ...item,
          imageUrl: row.imageUrl?.trim() ? row.imageUrl : getProductThumbnail(row.serviceKey, row.name),
          description: row.customDescription || row.description,
          customDescription: row.customDescription,
          stock: Math.max(0, stock - reservedStock),
          stockSyncedAt: lastStockSyncedAt,
          stockFresh: row.provider === "custom" ? true : (stockAge >= 0 && stockAge <= SUPPLIER_STOCK_MAX_AGE_MS),
          quantityTiers: tiers,
          maxAllowedQuantity,
        }];
      });
    }),
    storeInfo: publicProcedure.query(async () => {
      const s = await settings();
      return {
        currency: s.currency,
        paymentInstructions: s.paymentInstructions ?? "",
        supportContact: s.supportContact ?? "",
        paymentMethods: publicPaymentMethods(s),
      };
    }),
  }),

  checkout: router({
    create: publicProcedure.input(z.object({
      idempotencyKey: z.string().uuid(),
      customerName: z.string().trim().min(2).max(160),
      customerEmail: z.string().trim().email().max(320),
      customerPhone: z.string().trim().min(7).max(64),
      paymentMethod: z.enum(["bkash", "nagad", "bank"]),
      paymentReference: z.string().trim().max(160).optional().default(""),
      items: z.array(itemInput).min(1).max(15),
    })).mutation(async ({ input, ctx }) => {
      assertRateLimit("checkout", ctx.req.ip || "unknown", 6);
      const db = await getDb();
      if (!db) throw new Error("Database is not available");
      const email = input.customerEmail.trim().toLowerCase();
      const existingReceipt = (row: typeof orders.$inferSelect) => ({
        orderNo: row.orderNo,
        status: row.status,
        totalAmount: row.totalAmount,
        currency: row.currency,
        paymentMethod: paymentLabel(row.paymentMethod),
        paymentAccount: row.paymentAccount,
        paymentInstructions: row.paymentInstructions,
        supportContact: row.supportContact ?? "",
        accountNotice: "আপনার email-এর সঙ্গে customer profile যুক্ত হয়েছে। Account link পেতে /account-এ email দিয়ে link চান; verified email ছাড়া order history/codes দেখা যাবে না।",
      });
      const [alreadyCreated] = await db.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1);
      if (alreadyCreated) {
        if (alreadyCreated.customerEmail !== email || alreadyCreated.customerPhone !== input.customerPhone.trim()) throw new Error("এই checkout attempt key অন্য customer-এর জন্য ব্যবহৃত হয়েছে।");
        return existingReceipt(alreadyCreated);
      }

      const s = await settings();
      const payment = publicPaymentMethods(s).find(method => method.id === input.paymentMethod);
      if (!payment) throw new Error("এই payment method এখনও shop admin configure করেননি।");
      const merged = new Map<string, number>();
      for (const item of input.items) merged.set(item.serviceKey, (merged.get(item.serviceKey) ?? 0) + item.quantity);
      const wanted = Array.from(merged, ([serviceKey, quantity]) => ({ serviceKey, quantity }));
      const candidateProviders = await db.select({ provider: activationServices.provider }).from(activationServices)
        .where(inArray(activationServices.serviceKey, wanted.map(item => item.serviceKey)));
      const externalProviders = candidateProviders.map(row => row.provider).filter(p => p !== "custom");
      if (externalProviders.length) {
        await refreshCatalogIfNeeded(externalProviders);
      }
      const orderNo = `AZ-${newOrderNo()}`;
      try {
        const created = await db.transaction(async tx => {
          const products = await tx.select().from(activationServices)
            .where(inArray(activationServices.serviceKey, wanted.map(item => item.serviceKey))).for("update");
          if (products.length !== wanted.length) throw new Error("কার্টে কোনো unavailable service আছে; catalog refresh করে আবার চেষ্টা করুন।");
          const lines = wanted.map(item => {
            const product = products.find(candidate => candidate.serviceKey === item.serviceKey);
            if (!product || product.isActive !== 1 || product.isListed !== 1 || product.retailPrice <= 0 || product.stock - product.reservedStock < item.quantity) {
              throw new Error("কার্টের কোনো service এখন বিক্রির জন্য নেই বা পর্যাপ্ত stock নেই।");
            }
            if (product.priceReviewRequired === 1) throw new Error("Supplier cost/currency বদলেছে; Admin দাম যাচাই না করা পর্যন্ত এই service order করা যাবে না।");
            if (product.provider !== "custom") {
              if (!product.lastStockSyncedAt || Date.now() - new Date(product.lastStockSyncedAt).getTime() > SUPPLIER_STOCK_MAX_AGE_MS) {
                throw new Error("Supplier stock এখনো fresh নয়। Cart refresh করে কিছুক্ষণ পর আবার চেষ্টা করুন।");
              }
            }
            if (product.provider === "couponshops" && (!product.providerServiceId || !couponTierForQuantity(product, item.quantity))) {
              throw new Error("CouponShops service-এর quantity provider pricing slab-এর সাথে মিলছে না। Checkout-এ allowed quantity বেছে নিন।");
            }
            if (product.provider === "acczone" && item.quantity > 10) throw new Error("AccZone service-এর সর্বোচ্চ quantity 10।");
            return { product, quantity: item.quantity, tier: product.provider === "couponshops" ? couponTierForQuantity(product, item.quantity) : undefined };
          });
          for (const { product, quantity } of lines) {
            const held = await tx.update(activationServices).set({
              reservedStock: sql`${activationServices.reservedStock} + ${quantity}`,
              updatedAt: new Date(),
            }).where(and(
              eq(activationServices.serviceKey, product.serviceKey),
              eq(activationServices.isActive, 1),
              eq(activationServices.isListed, 1),
              gt(activationServices.retailPrice, 0),
              sql`${activationServices.stock} - ${activationServices.reservedStock} >= ${quantity}`,
            ));
            if (mysqlAffectedRows(held) !== 1) throw new Error("Stock সদ্য পরিবর্তিত হয়েছে; cart refresh করে আবার চেষ্টা করুন।");
          }
          const total = Number(lines.reduce((sum, line) => sum + line.product.retailPrice * line.quantity, 0).toFixed(2));
          const [existingAccount] = await tx.select().from(customerAccounts).where(eq(customerAccounts.email, email)).for("update");
          let customerAccountId: number;
          let verificationToken: string | null = null;
          if (existingAccount) {
            customerAccountId = existingAccount.id;
            await tx.update(customerAccounts).set({
              name: input.customerName.trim(),
              phone: input.customerPhone.trim(),
              emailVerifiedAt: existingAccount.emailVerifiedAt,
              updatedAt: new Date(),
            }).where(eq(customerAccounts.id, existingAccount.id));
            const tokenStillValid = existingAccount.magicTokenHash && existingAccount.magicTokenExpiresAt && new Date(existingAccount.magicTokenExpiresAt).getTime() > Date.now();
            if (!existingAccount.emailVerifiedAt && !tokenStillValid) {
              const token = newMagicToken();
              verificationToken = token.token;
              await tx.update(customerAccounts).set({ magicTokenHash: token.hash, magicTokenExpiresAt: token.expiresAt, magicTokenPurpose: "verify", updatedAt: new Date() }).where(eq(customerAccounts.id, existingAccount.id));
            }
          } else {
            const token = newMagicToken();
            const insertedCustomer = await tx.insert(customerAccounts).values({
              email,
              name: input.customerName.trim(),
              phone: input.customerPhone.trim(),
              emailVerifiedAt: null,
              magicTokenHash: token.hash,
              magicTokenExpiresAt: token.expiresAt,
              magicTokenPurpose: "verify",
            }).returning({ id: customerAccounts.id });
            customerAccountId = mysqlInsertId(insertedCustomer);
            if (!customerAccountId) throw new Error("Customer profile identifier পাওয়া যায়নি; checkout transaction বাতিল করা হয়েছে।");
            verificationToken = token.token;
          }
          const inserted = await tx.insert(orders).values({
            orderNo,
            idempotencyKey: input.idempotencyKey,
            customerName: input.customerName.trim(),
            customerEmail: email,
            customerPhone: input.customerPhone.trim(),
            customerAccountId,
            paymentMethod: input.paymentMethod,
            paymentReference: input.paymentReference.trim() || null,
            totalAmount: total,
            currency: s.currency,
            status: "awaiting_payment",
            paymentAccount: payment.account,
            paymentInstructions: s.paymentInstructions ?? "",
            supportContact: s.supportContact ?? null,
          }).returning({ id: orders.id });
          const orderId = mysqlInsertId(inserted);
          if (!orderId) throw new Error("Order database identifier পাওয়া যায়নি; transaction বাতিল করা হয়েছে।");
          await tx.insert(orderItems).values(lines.map(({ product, quantity, tier }) => ({
            orderId, serviceKey: product.serviceKey, serviceName: product.name, provider: product.provider,
            providerServiceId: product.providerServiceId, supplierCostInr: tier?.priceInr ?? 0,
            supplierCostUsdt: tier?.priceUsdt ?? 0,
            supplierRate: product.providerRate, quantity,
            unitPrice: product.retailPrice,
          })));
          return {
            customerAccountId,
            verificationToken,
            receipt: {
              orderNo,
              status: "awaiting_payment" as const,
              totalAmount: total,
              currency: s.currency,
              paymentMethod: payment.label,
              paymentAccount: payment.account,
              paymentInstructions: s.paymentInstructions ?? "",
              supportContact: s.supportContact ?? "",
              accountNotice: "আপনার অর্ডার সফলভাবে তৈরি হয়েছে। /track পেজে Order Code ও Phone দিয়ে সরাসরি অর্ডার ও ডেলিভারি কোড দেখতে পারবেন।",
            },
          };
        });
        if (created.verificationToken) void sendCustomerMagicLink(created.customerAccountId, created.verificationToken, "verify").catch(() => undefined);
        return created.receipt;
      } catch (error) {
        const [retryReceipt] = await db.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1);
        if (retryReceipt && retryReceipt.customerEmail === email && retryReceipt.customerPhone === input.customerPhone.trim()) return existingReceipt(retryReceipt);
        throw error;
      }
    }),
    track: publicProcedure.input(z.object({
      orderNo: z.string().trim().min(6).max(32),
      email: z.string().trim().max(320).optional(),
      phone: z.string().trim().max(64).optional(),
      contact: z.string().trim().max(320).optional(),
    })).mutation(async ({ input, ctx }) => {
      assertRateLimit("lookup", ctx.req.ip || "unknown", 12);
      const db = await getDb();
      if (!db) throw new Error("Database is not available");

      const rawInputOrder = input.orderNo.trim().toUpperCase();
      const normalizedQueryNo = rawInputOrder.replace(/^#/, "");
      const orderNoWithPrefix = normalizedQueryNo.startsWith("AZ-") ? normalizedQueryNo : `AZ-${normalizedQueryNo}`;

      const [order] = await db.select().from(orders).where(or(
        eq(orders.orderNo, rawInputOrder),
        eq(orders.orderNo, normalizedQueryNo),
        eq(orders.orderNo, orderNoWithPrefix),
      )).limit(1);

      const providedEmail = (input.email || (input.contact && input.contact.includes("@") ? input.contact : "")).trim().toLowerCase();
      const providedPhone = (input.phone || (input.contact && !input.contact.includes("@") ? input.contact : "")).trim();
      const rawContact = input.contact?.trim().toLowerCase() || "";

      if (!providedEmail && !providedPhone && !rawContact) {
        throw new Error("Order tracking-এর জন্য Email অথবা Phone নম্বরের যেকোনো একটি দিন।");
      }

      if (!order) {
        throw new Error("Order পাওয়া যায়নি। সঠিক Order code দিন।");
      }

      const dbEmail = (order.customerEmail || "").trim().toLowerCase();
      const dbPhone = (order.customerPhone || "").trim();

      const normDbPhone = dbPhone.replace(/\D/g, "").slice(-10);
      const normProvidedPhone = providedPhone.replace(/\D/g, "").slice(-10);
      const normRawContact = rawContact.replace(/\D/g, "").slice(-10);

      const emailMatches = Boolean(providedEmail && dbEmail && dbEmail === providedEmail);
      const phoneMatches = Boolean(
        (normProvidedPhone && normDbPhone && normDbPhone === normProvidedPhone) ||
        (dbPhone && providedPhone && (dbPhone === providedPhone || dbPhone.endsWith(providedPhone) || providedPhone.endsWith(dbPhone)))
      );
      const contactMatches = Boolean(
        rawContact && (
          dbEmail === rawContact ||
          (normRawContact && normDbPhone && normDbPhone === normRawContact) ||
          (dbPhone && (dbPhone === rawContact || dbPhone.endsWith(rawContact) || rawContact.endsWith(dbPhone)))
        )
      );

      if (!emailMatches && !phoneMatches && !contactMatches) {
        throw new Error("প্রদত্ত Email বা Phone নম্বরের সাথে Order-এর তথ্যের মিল পাওয়া যায়নি।");
      }

      const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return {
        orderNo: order.orderNo,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        items: lines.map(line => {
          const codes = (order.status === "fulfilled" || line.fulfillmentState === "fulfilled")
            ? extractCodeStrings(line.resultCodes)
            : [];
          return {
            serviceName: line.serviceName,
            quantity: line.quantity,
            fulfillmentState: line.fulfillmentState,
            codes,
          };
        }),
      };
    }),
  }),

  admin: router({
    overview: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database is not available");
      const all = await db.select({ id: orders.id, status: orders.status, totalAmount: orders.totalAmount }).from(orders).orderBy(desc(orders.createdAt)).limit(1000);
      const services = await db.select({ key: activationServices.serviceKey }).from(activationServices);
      const allProviders = await listAllConfiguredProviders();
      return {
        orderCount: all.length,
        awaitingPayment: all.filter(o => o.status === "awaiting_payment").length,
        fulfilledCount: all.filter(o => o.status === "fulfilled").length,
        grossPaid: Number(all.filter(o => ["paid", "fulfilling", "fulfilled", "partially_fulfilled", "fulfillment_unknown", "fulfillment_failed"].includes(o.status)).reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)),
        serviceCount: services.length,
        apiKeyConfigured: allProviders.some(p => p.configured),
        providersConfigured: Object.fromEntries(allProviders.map(p => [p.provider, p.configured])),
      };
    }),
    services: router({
      list: adminProcedure.query(async () => {
        await refreshCatalogIfNeeded();
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        void ensureProductThumbnailsInDb(db);
        const rows = await db.select().from(activationServices).orderBy(activationServices.name);
        return rows.map(row => ({
          ...row,
          imageUrl: row.imageUrl?.trim() ? row.imageUrl : getProductThumbnail(row.serviceKey, row.name),
        }));
      }),
      sync: adminProcedure.input(z.object({ provider: z.string().min(1) })).mutation(async ({ input }) => {
        return syncProviderCatalog(input.provider);
      }),
      syncAll: adminProcedure.mutation(async () => {
        const allProviders = await listAllConfiguredProviders();
        const activeProviders = allProviders.filter(p => p.configured && p.isActive);
        const providers = activeProviders.length ? activeProviders.map(p => p.provider) : ["acczone", "couponshops"];
        const results = await Promise.allSettled(
          providers.map(async (p) => {
            const hasKey = await hasProviderApiKey(p);
            if (!hasKey) return { provider: p, configured: false, synced: 0, active: 0 };
            const res = await syncProviderCatalog(p);
            return { provider: p, configured: true, synced: res.synced, active: res.active };
          })
        );
        const report = results.map((r, idx) => {
          const provider = providers[idx];
          if (r.status === "fulfilled") return r.value;
          return { provider, configured: true, synced: 0, active: 0, error: r.reason instanceof Error ? r.reason.message : "Sync failed" };
        });
        const totalSynced = report.reduce((sum, item) => sum + item.synced, 0);
        return { success: true, totalSynced, report };
      }),
      update: adminProcedure.input(z.object({
        serviceKey: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
        retailPrice: z.number().min(0).max(10_000_000),
        isListed: z.boolean(),
        confirmPriceReview: z.boolean().default(false),
        customDescription: z.string().max(10_000).nullable().optional(),
        imageUrl: z.string().max(2048).nullable().optional(),
      })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const [row] = await db.select().from(activationServices).where(eq(activationServices.serviceKey, input.serviceKey)).limit(1);
        if (!row) throw new Error("Service পাওয়া যায়নি; আগে catalog sync করুন।");
        if (input.isListed && (!row.isActive || row.stock - row.reservedStock < 1 || input.retailPrice <= 0)) throw new Error("বিক্রির জন্য active available stock ও শূন্যের বেশি retail price প্রয়োজন।");
        const store = await settings();
        const cost = { price: row.supplierPrice, currency: row.supplierCurrency, providerRate: row.providerRate };
        const pricingRates = { currency: store.currency as "BDT" | "USD" | "INR", inrToStoreRate: Number(store.inrToStoreRate), usdtToStoreRate: Number(store.usdtToStoreRate), acczoneUnitToStoreRate: Number(store.acczoneUnitToStoreRate) };
        const priceMarkupRatio = markupRatioForManualRetailPrice(input.retailPrice, cost, pricingRates);
        const needsInitialManualReview = input.retailPrice > 0 && row.retailPrice <= 0 && (row.supplierPrice <= 0 || priceMarkupRatio <= 0);
        if (input.isListed && (row.priceReviewRequired === 1 || needsInitialManualReview) && !input.confirmPriceReview) throw new Error("Supplier cost/currency আগে review করুন; তারপর 'দাম যাচাই করেছি' নির্বাচন করুন।");
        const updateValues: Record<string, unknown> = {
          retailPrice: input.retailPrice,
          isListed: input.isListed ? 1 : 0,
          priceMarkupRatio,
          priceReviewRequired: input.confirmPriceReview ? 0 : needsInitialManualReview ? 1 : row.priceReviewRequired,
          updatedAt: new Date(),
        };
        if (input.customDescription !== undefined) {
          updateValues.customDescription = input.customDescription?.trim() ? input.customDescription.trim() : null;
        }
        if (input.imageUrl !== undefined) {
          updateValues.imageUrl = input.imageUrl?.trim() ?? "";
        }
        await db.update(activationServices).set(updateValues).where(eq(activationServices.serviceKey, input.serviceKey));
        return { success: true };
      }),
    }),
    settings: router({
      get: adminProcedure.query(async () => {
        const s = await settings();
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const [credential] = await db.select({ updatedAt: providerCredentials.updatedAt })
          .from(providerCredentials).where(eq(providerCredentials.provider, "acczone")).limit(1);
        return { ...s, apiKeyConfigured: Boolean(credential), apiKeyUpdatedAt: credential?.updatedAt ?? null };
      }),
      save: adminProcedure.input(z.object({
        currency: z.enum(["BDT", "USD", "INR"]),
        paymentInstructions: z.string().max(2000),
        bkashNumber: z.string().trim().max(64),
        nagadNumber: z.string().trim().max(64),
        bankDetails: z.string().trim().max(2000),
        supportContact: z.string().trim().max(160),
        inrToStoreRate: z.number().min(0).max(10_000_000),
        usdtToStoreRate: z.number().min(0).max(10_000_000),
        acczoneUnitToStoreRate: z.number().min(0).max(10_000_000),
        resendFromEmail: z.string().trim().max(320).refine(value => !/[\r\n]/.test(value), "Sender address cannot contain line breaks."),
        publicSiteUrl: z.string().trim().min(8).max(512).refine(value => {
          try {
            const url = new URL(value);
            return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && (url.pathname === "/" || url.pathname === "");
          } catch { return false; }
        }, "Public website URL must be a clean HTTPS origin without path/query/hash."),
      })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        await db.transaction(async tx => {
          const [previous] = await tx.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
          const pricingChanged = Boolean(previous && (previous.currency !== input.currency
            || previous.inrToStoreRate !== input.inrToStoreRate
            || previous.usdtToStoreRate !== input.usdtToStoreRate
            || previous.acczoneUnitToStoreRate !== input.acczoneUnitToStoreRate));
          await tx.insert(storeSettings).values({ id: 1, ...input }).onConflictDoUpdate({
            target: storeSettings.id,
            set: { ...input, updatedAt: new Date() },
          });
          if (pricingChanged) await tx.update(activationServices).set({ priceReviewRequired: 1, updatedAt: new Date() }).where(gt(activationServices.retailPrice, 0));
        });
        return { success: true };
      }),
    }),
    security: router({
      get: adminProcedure.query(async () => {
        const s = await settings();
        return {
          username: s.adminUsername || "admin",
          email: s.adminEmail || process.env.ACCZONE_ADMIN_EMAIL || "admin@acczone.shop",
          hasCustomPassword: Boolean(s.adminPasswordHash && s.adminPasswordSalt),
        };
      }),
      update: adminProcedure.input(z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newUsername: z.string().trim().min(2).max(128).optional(),
        newEmail: z.string().trim().email().max(320).optional(),
        newPassword: z.string().min(6, "New password must be at least 6 characters").max(128).optional(),
      })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const s = await settings();

        let currentValid = false;
        if (s.adminPasswordHash && s.adminPasswordSalt) {
          currentValid = verifyAdminPassword(input.currentPassword.trim(), s.adminPasswordHash, s.adminPasswordSalt);
        } else {
          currentValid = verifyFallbackAdminSecret(input.currentPassword.trim());
        }

        if (!currentValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "বর্তমান Admin পাসওয়ার্ড সঠিক নয়।",
          });
        }

        const updatePayload: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (input.newUsername?.trim()) {
          updatePayload.adminUsername = input.newUsername.trim();
        }
        if (input.newEmail?.trim()) {
          const email = input.newEmail.trim().toLowerCase();
          updatePayload.adminEmail = email;
          setDynamicAdminEmail(email);
        }
        if (input.newPassword?.trim()) {
          const { hash, salt } = hashAdminPassword(input.newPassword.trim());
          updatePayload.adminPasswordHash = hash;
          updatePayload.adminPasswordSalt = salt;
        }

        await db.update(storeSettings).set(updatePayload).where(eq(storeSettings.id, 1));

        return {
          success: true,
          message: "অ্যাডমিন ইউজারনেম, ইমেইল ও পাসওয়ার্ড সফলভাবে আপডেট হয়েছে এবং এনক্রিপ্ট করে সংরক্ষণ করা হয়েছে।",
        };
      }),
    }),
    email: router({
      status: adminProcedure.query(async () => inspectEmailConfigForAdmin()),
      orderStatus: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input }) => customerRecentDeliveryMail(input.orderId)),
      configureGmail: adminProcedure.input(z.object({
        gmailUser: z.string().trim().email("সঠিক Gmail ঠিকানা দিন").max(320),
        appPassword: z.string().trim().max(128).optional(),
        webhookUrl: z.string().trim().max(512).optional(),
        fromName: z.string().trim().max(100).optional(),
      })).mutation(async ({ input }) => {
        try {
          const res = await saveGmailCredentials({
            user: input.gmailUser,
            pass: input.appPassword,
            webhookUrl: input.webhookUrl,
            fromName: input.fromName || "AccZone Shop",
          });
          const successNotice = res.mode === "webhook"
            ? "Google Apps Script Webhook সফলভাবে সংযুক্ত হয়েছে! Render Free হোস্টিংয়ে কোনো পোর্ট ব্লক ছাড়াই আপনার Gmail দিয়ে ইমেইল যাবে।"
            : "Gmail SMTP সফলভাবে সংযুক্ত ও যাচাই হয়েছে! এখন থেকে সব অ্যাকাউন্ট অ্যাক্টিভেশন ও ডেলিভারি মেইল এই Gmail থেকে সরাসরি যাবে।";
          return { success: true, user: res.user, message: successNotice };
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Gmail setup failed";
          throw new TRPCError({ code: "BAD_REQUEST", message: msg });
        }
      }),
      sendTestEmail: adminProcedure.input(z.object({
        targetEmail: z.string().trim().email("সঠিক প্রাপক ইমেইল দিন"),
      })).mutation(async ({ input }) => {
        try {
          const result = await sendGmailEmail({
            to: input.targetEmail.trim(),
            subject: "AccZone Shop - টেস্ট ইমেইল কনফার্মেশন",
            html: `<div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:10px;max-width:500px;margin:auto">
              <h2 style="color:#059669;margin-top:0">🎉 Gmail SMTP সফলভাবে কাজ করছে!</h2>
              <p>আপনার AccZone Shop থেকে এই টেস্ট ইমেইলটি সফলভাবে পাঠানো হয়েছে।</p>
              <p style="color:#64748b;font-size:13px">AccZone Shop Automated Mailer</p>
            </div>`,
            text: "Gmail SMTP সফলভাবে কাজ করছে! AccZone Shop থেকে এই টেস্ট ইমেইল পাঠানো হয়েছে।",
          });
          return { success: true, messageId: result.messageId, message: "টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে! ইনবক্স চেক করুন।" };
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Test email failed";
          throw new TRPCError({ code: "BAD_REQUEST", message: msg });
        }
      }),
      configureKey: adminProcedure.input(z.object({ apiKey: z.string().trim().min(8).max(2048) })).mutation(async ({ input }) => {
        try {
          const domains = await verifyAndSaveProviderApiKey("resend", input.apiKey, listResendDomains);
          const store = await settings();
          return { success: true, verifiedDomains: domains.filter(domain => domain.status === "verified" && domain.sendingEnabled).map(domain => domain.name), senderVerified: Boolean(verifiedSenderDomain(store.resendFromEmail, domains)) };
        } catch {
          throw new Error("Resend API key verify/save হয়নি। Key ও Resend account যাচাই করে আবার চেষ্টা করুন।");
        }
      }),
    }),
    providers: router({
      status: adminProcedure.query(async () => ({
        acczone: await getProviderCredentialStatus("acczone"),
        couponshops: await getProviderCredentialStatus("couponshops"),
        aitoolify: await getProviderCredentialStatus("aitoolify"),
      })),
      list: adminProcedure.query(async () => {
        return listAllConfiguredProviders();
      }),
      testCustom: adminProcedure.input(z.object({
        baseUrl: z.string().trim().min(5, "API URL দিন"),
        apiKey: z.string().trim().min(1, "API Key দিন"),
      })).mutation(async ({ input }) => {
        try {
          const res = await testBotResellerConnection(input.baseUrl, input.apiKey);
          return {
            success: true,
            balance: res.balance,
            currency: res.currency,
            message: `Connection successful! Balance: ${res.balance} ${res.currency}`,
          };
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err.message || "API Connection টেস্ট ব্যর্থ হয়েছে",
          });
        }
      }),
      configureCustom: adminProcedure.input(z.object({
        provider: z.string().trim().min(2).max(32).regex(/^[a-z0-9_-]+$/i, "Provider ID-তে শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা, _ এবং - ব্যবহার করুন"),
        label: z.string().trim().min(1).max(128),
        baseUrl: z.string().trim().min(5).max(512),
        apiKey: z.string().trim().min(1).max(2048),
      })).mutation(async ({ input }) => {
        try {
          const saved = await saveBotResellerProvider(input);
          void syncProviderCatalog(saved.provider).catch(e => console.warn(`Auto-sync after provider add failed:`, e));
          return {
            success: true,
            provider: saved.provider,
            label: saved.label,
            amount: saved.balance,
            currency: saved.currency,
          };
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err.message || "Provider সংরক্ষণ ব্যর্থ হয়েছে",
          });
        }
      }),
      delete: adminProcedure.input(z.object({
        provider: z.string().trim().min(1),
      })).mutation(async ({ input }) => {
        return deleteProviderCredentials(input.provider);
      }),
      configure: adminProcedure.input(z.object({
        provider: z.string().trim().min(1),
        apiKey: z.string().trim().min(1).max(2048),
        baseUrl: z.string().trim().optional(),
        label: z.string().trim().optional(),
      })).mutation(async ({ input }) => {
        try {
          if (input.provider === "acczone") {
            const account = await testAndSaveApiKey(input.apiKey);
            return { success: true, provider: input.provider, amount: account.balance, currency: "provider units", balanceInr: null, rateInrPerUsdt: null, username: account.username };
          }
          if (input.provider === "couponshops") {
            const account = await verifyAndSaveCouponShopsKey(input.apiKey);
            return { success: true, provider: input.provider, amount: account.balanceUsdt, currency: "USDT", balanceInr: account.balanceInr, rateInrPerUsdt: account.rateInrPerUsdt, username: "" };
          }
          if (input.provider === "aitoolify") {
            const saved = await saveBotResellerProvider({
              provider: "aitoolify",
              label: input.label || "Aitoolify Studio Bot",
              baseUrl: input.baseUrl || "https://bot.aitoolifystudio.io/api/reseller/v1",
              apiKey: input.apiKey,
            });
            void syncProviderCatalog("aitoolify").catch(e => console.warn("Auto-sync aitoolify failed:", e));
            return { success: true, provider: "aitoolify", amount: saved.balance, currency: saved.currency, balanceInr: null, rateInrPerUsdt: null, username: "" };
          }
          // Generic bot reseller
          const saved = await saveBotResellerProvider({
            provider: input.provider,
            label: input.label || input.provider,
            baseUrl: input.baseUrl || "",
            apiKey: input.apiKey,
          });
          void syncProviderCatalog(input.provider).catch(e => console.warn(`Auto-sync ${input.provider} failed:`, e));
          return { success: true, provider: input.provider, amount: saved.balance, currency: saved.currency, balanceInr: null, rateInrPerUsdt: null, username: "" };
        } catch (error) {
          console.error(`[Provider Configure Error (${input.provider})]:`, error);
          if (error instanceof AcczoneError || error instanceof CouponShopsError || error instanceof BotResellerError) throw new Error(error.message);
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`${input.provider} API key যাচাই/সংরক্ষণ ব্যর্থ হয়েছে: ${message}`);
        }
      }),
      balance: adminProcedure.input(z.object({ provider: z.string().min(1) })).query(async ({ input }) => {
        try {
          if (input.provider === "acczone") {
            const account = await getBalance();
            return { provider: input.provider, amount: account.balance, currency: "provider units", balanceInr: null, rateInrPerUsdt: null, username: account.username };
          }
          if (input.provider === "couponshops") {
            const account = await getCouponBalance();
            return { provider: input.provider, amount: account.balanceUsdt, currency: "USDT", balanceInr: account.balanceInr, rateInrPerUsdt: account.rateInrPerUsdt, username: "" };
          }
          const details = await getProviderDetails(input.provider);
          if (!details || !details.apiKey) throw new Error(`${input.provider} API key কনফিগার করা নেই।`);
          const res = await getBotResellerBalance(details.baseUrl || (input.provider === "aitoolify" ? "https://bot.aitoolifystudio.io/api/reseller/v1" : ""), details.apiKey);
          return { provider: input.provider, amount: res.balance, currency: res.currency, balanceInr: null, rateInrPerUsdt: null, username: "" };
        } catch (error) {
          if (error instanceof AcczoneError || error instanceof CouponShopsError || error instanceof BotResellerError) throw new Error(error.message);
          throw new Error(`${input.provider} balance পাওয়া যায়নি। API connection যাচাই করুন।`);
        }
      }),
    }),
    customInventory: router({
      createProduct: adminProcedure.input(z.object({
        name: z.string().trim().min(2, "প্রোডাক্টের নাম কমপক্ষে ২ অক্ষরের হতে হবে").max(255),
        description: z.string().trim().max(2000).optional(),
        customDescription: z.string().trim().max(2000).optional(),
        retailPrice: z.number().positive("সঠিক বিক্রয়মূল্য দিন"),
        imageUrl: z.string().trim().max(2048).optional(),
        bulkCredentials: z.string().optional(),
      })).mutation(async ({ input }) => {
        return createCustomProduct(input);
      }),
      addBulk: adminProcedure.input(z.object({
        serviceKey: z.string().trim().min(1),
        bulkCredentials: z.string().min(1, "কমপক্ষে একটি অ্যাকাউন্ট বা কোড দিন"),
        notes: z.string().trim().max(500).optional(),
      })).mutation(async ({ input }) => {
        return addBulkCredentialsToVault(input);
      }),
      listProducts: adminProcedure.query(async () => {
        return listCustomProductsWithStats();
      }),
      listItems: adminProcedure.input(z.object({
        serviceKey: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(5).max(100).default(20),
      })).query(async ({ input }) => {
        return listVaultItems(input);
      }),
      deleteItem: adminProcedure.input(z.object({
        id: z.number().int().positive(),
      })).mutation(async ({ input }) => {
        return deleteVaultItem(input.id);
      }),
      returnToStock: adminProcedure.input(z.object({
        id: z.number().int().positive(),
      })).mutation(async ({ input }) => {
        return returnVaultItemToStock(input.id);
      }),
      updateItem: adminProcedure.input(z.object({
        id: z.number().int().positive(),
        credentialData: z.string().trim().min(1, "অ্যাকাউন্ট বা কোডের তথ্য খালি রাখা যাবে না"),
        notes: z.string().trim().max(500).optional(),
      })).mutation(async ({ input }) => {
        return updateVaultItem(input);
      }),
    }),
    api: router({
      status: adminProcedure.query(async () => ({ configured: await hasApiKey() })),
      configure: adminProcedure.input(z.object({ apiKey: z.string().trim().min(8).max(2048) })).mutation(async ({ input }) => {
        try {
          const account = await testAndSaveApiKey(input.apiKey);
          return { success: true, balance: account.balance, username: account.username };
        } catch (error) {
          console.error("[AccZone Configure Error]:", error);
          if (error instanceof AcczoneError) throw new Error(error.message);
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`AccZone API key যাচাই/সংরক্ষণ ব্যর্থ হয়েছে: ${message}`);
        }
      }),
      balance: adminProcedure.query(async () => {
        try { return await getBalance(); }
        catch (error) {
          if (error instanceof AcczoneError) throw new Error(error.message);
          throw new Error("AccZone balance পাওয়া যায়নি। API key configuration যাচাই করুন।");
        }
      }),
      history: adminProcedure.input(z.object({ page: z.number().int().min(1).max(100_000), limit: z.number().int().min(1).max(100).default(20) })).query(async ({ input }) => {
        try { return await getHistory(input.page, input.limit); }
        catch (error) {
          if (error instanceof AcczoneError) throw new Error(error.message);
          throw new Error("Activation history পাওয়া যায়নি।");
        }
      }),
    }),
    orders: router({
      list: adminProcedure.input(z.object({ status: z.string().optional().default("all") })).query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const query = db.select().from(orders);
        if (input.status !== "all") return query.where(eq(orders.status, input.status as typeof orders.$inferSelect.status)).orderBy(desc(orders.createdAt)).limit(200);
        return query.orderBy(desc(orders.createdAt)).limit(200);
      }),
      items: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        return db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      }),
      confirmPayment: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const changed = await db.update(orders).set({ status: "paid", updatedAt: new Date() })
          .where(and(eq(orders.id, input.orderId), eq(orders.status, "awaiting_payment")));
        if (mysqlAffectedRows(changed) !== 1) throw new Error("এই order payment confirmation-এর জন্য available নয় বা অন্য admin পরিবর্তন করেছেন।");
        return { success: true };
      }),
      cancel: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        return db.transaction(async tx => {
          const changed = await tx.update(orders).set({ status: "cancelled", updatedAt: new Date() })
            .where(and(eq(orders.id, input.orderId), eq(orders.status, "awaiting_payment")));
          if (mysqlAffectedRows(changed) !== 1) throw new Error("শুধু payment-awaiting order cancel করা যাবে বা অন্য admin পরিবর্তন করেছেন।");
          const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
          for (const line of lines) {
            await tx.update(activationServices).set({
              reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
              updatedAt: new Date(),
            }).where(eq(activationServices.serviceKey, line.serviceKey));
          }
          return { success: true };
        });
      }),
      fulfill: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const preflightLines = await db.select({ provider: orderItems.provider }).from(orderItems).where(eq(orderItems.orderId, input.orderId));
        if (!preflightLines.length) throw new Error("Order-এ কোনো item পাওয়া যায়নি।");
        for (const provider of new Set(preflightLines.map(line => line.provider))) {
          if (provider === "custom") continue;
          if (!await hasProviderApiKey(provider)) {
            throw new Error(`${provider} API key verified নয়; fulfillment শুরু করার আগে Admin Connections-এ provider configure করুন।`);
          }
        }
        const prepared = await db.transaction(async tx => {
          const [row] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
          if (!row || !["paid", "fulfillment_failed", "partially_fulfilled"].includes(row.status)) throw new Error("শুধু manually paid-confirmed বা retry-যোগ্য failure order fulfill করা যাবে।");
          const orderLines = await tx.select().from(orderItems).where(eq(orderItems.orderId, row.id));
          if (!orderLines.length) throw new Error("Order-এ কোনো item পাওয়া যায়নি।");
          if (orderLines.some(line => line.fulfillmentState === "unknown" || line.fulfillmentState === "processing")) {
            throw new Error("Uncertain provider result আছে; Activation history মিলিয়ে আগে recovery review করুন।");
          }
          const retryLines = orderLines.filter(line => line.fulfillmentState !== "fulfilled");
          if (!retryLines.length) throw new Error("এই order-এর সব activation ইতিমধ্যে সম্পন্ন।");
          if (row.status === "paid" && retryLines.some(line => line.fulfillmentState !== "pending")) throw new Error("Order item state mismatch; manual review প্রয়োজন।");
          if (row.status === "fulfillment_failed") {
            for (const line of retryLines.filter(item => item.fulfillmentState === "failed")) {
              const reserved = await tx.update(activationServices).set({
                reservedStock: sql`${activationServices.reservedStock} + ${line.quantity}`,
                updatedAt: new Date(),
              }).where(and(
                eq(activationServices.serviceKey, line.serviceKey),
                eq(activationServices.isActive, 1),
                sql`${activationServices.stock} - ${activationServices.reservedStock} >= ${line.quantity}`,
              ));
              if (mysqlAffectedRows(reserved) !== 1) throw new Error(`Service ${line.serviceName}-এর stock এখন retry-র জন্য পর্যাপ্ত নয়; provider sync করুন।`);
            }
          }
          const preparedLines = [];
          for (const line of retryLines) {
            if (line.provider === "acczone" || line.provider === "custom") {
              preparedLines.push(line);
              continue;
            }
            const startNewAttempt = ["fulfillment_failed", "partially_fulfilled"].includes(row.status) && line.fulfillmentState === "failed";
            const prefix = line.provider === "couponshops" ? "CS" : "BOT";
            const clientOrderId = startNewAttempt || !line.providerClientOrderId ? `${prefix}-${randomUUID()}` : line.providerClientOrderId;
            await tx.update(orderItems).set({
              providerClientOrderId: clientOrderId,
              providerOrderId: startNewAttempt ? null : line.providerOrderId,
              providerStatus: "requesting",
              updatedAt: new Date(),
            }).where(eq(orderItems.id, line.id));
            preparedLines.push({ ...line, providerClientOrderId: clientOrderId, providerOrderId: startNewAttempt ? null : line.providerOrderId, providerStatus: "requesting" });
          }
          const changed = await tx.update(orders).set({ status: "fulfilling", updatedAt: new Date() })
            .where(and(eq(orders.id, row.id), eq(orders.status, row.status)));
          if (mysqlAffectedRows(changed) !== 1) throw new Error("অন্য admin এই order ইতিমধ্যে পরিবর্তন করেছেন।");
          return { lines: preparedLines, completedCount: orderLines.filter(line => line.fulfillmentState === "fulfilled").length, customerEmail: row.customerEmail };
        });
        let state: "fulfilled" | "partially_fulfilled" | "fulfillment_failed" | "fulfillment_unknown" = "fulfilled";
        let completedCount = prepared.completedCount;
        for (const line of prepared.lines) {
          if (line.fulfillmentState === "fulfilled") continue;
          await db.update(orderItems).set({ fulfillmentState: "processing", updatedAt: new Date() }).where(eq(orderItems.id, line.id));
          try {
            if (line.provider === "custom") {
              const availableItems = await db.select().from(customProductInventory)
                .where(and(
                  eq(customProductInventory.serviceKey, line.serviceKey),
                  eq(customProductInventory.status, "available")
                ))
                .limit(line.quantity);

              if (availableItems.length < line.quantity) {
                state = "fulfillment_failed";
                await db.update(orderItems).set({
                  fulfillmentState: "failed",
                  providerStatus: "failed",
                  providerMessage: `পর্যাপ্ত স্টক নেই। প্রয়োজন ${line.quantity}টি, কিন্তু স্টকে আছে ${availableItems.length}টি। Vault-এ নতুন অ্যাকাউন্ট/কোড যোগ করুন।`,
                  updatedAt: new Date(),
                }).where(eq(orderItems.id, line.id));
                break;
              }

              const assignedIds = availableItems.map(item => item.id);
              const now = new Date();

              await db.transaction(async tx => {
                await tx.update(customProductInventory).set({
                  status: "sold",
                  orderId: input.orderId,
                  orderItemId: line.id,
                  soldToEmail: prepared.customerEmail || undefined,
                  soldAt: now,
                  updatedAt: now,
                }).where(inArray(customProductInventory.id, assignedIds));

                const codes = availableItems.map(item => ({
                  id: `vault-${item.id}`,
                  serviceKey: line.serviceKey,
                  codeType: "account",
                  codeValue: item.credentialData,
                  usedAt: now.toISOString(),
                }));

                const [remaining] = await tx.select({
                  count: sql<number>`count(*)::int`,
                }).from(customProductInventory)
                  .where(and(
                    eq(customProductInventory.serviceKey, line.serviceKey),
                    eq(customProductInventory.status, "available")
                  ));

                const remainingStock = remaining?.count ?? 0;

                await tx.update(activationServices).set({
                  stock: remainingStock,
                  reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
                  updatedAt: now,
                }).where(eq(activationServices.serviceKey, line.serviceKey));

                await tx.update(orderItems).set({
                  fulfillmentState: "fulfilled",
                  providerStatus: "completed",
                  providerOrderId: `VAULT-${input.orderId}-${line.id}`,
                  resultCodes: JSON.stringify(codes),
                  providerMessage: null,
                  updatedAt: now,
                }).where(eq(orderItems.id, line.id));
              });

              completedCount += 1;
              continue;
            } else if (line.provider === "couponshops") {
              if (!line.providerServiceId || !line.providerClientOrderId) throw new CouponShopsError("CouponShops idempotent order identity is missing; contact the store admin before retrying.");
              const order = await createCouponOrder(line.providerServiceId, line.quantity, line.providerClientOrderId);
              const codes = couponCodes(order, line.serviceKey);
              const duplicateCodes = !allUniqueCodes(codes);
              if (order.status === "cancelled_refunded") {
                await db.transaction(async tx => {
                  await tx.update(orderItems).set({ fulfillmentState: "failed", providerOrderId: order.orderId, providerStatus: order.status,
                    providerMessage: "CouponShops cancelled this order and reports that its provider charge was refunded.", updatedAt: new Date() }).where(eq(orderItems.id, line.id));
                  await tx.update(activationServices).set({ reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`, updatedAt: new Date() })
                    .where(eq(activationServices.serviceKey, line.serviceKey));
                });
                state = completedCount > 0 ? "partially_fulfilled" : "fulfillment_failed";
                break;
              }
              if (order.status !== "completed" || codes.length !== line.quantity || duplicateCodes) {
                state = "fulfillment_unknown";
                await db.update(orderItems).set({
                  fulfillmentState: order.status === "processing" ? "processing" : "unknown",
                  providerOrderId: order.orderId, providerStatus: order.status,
                  resultCodes: codes.length ? JSON.stringify(codes) : null,
                  providerMessage: order.status === "processing"
                    ? "CouponShops accepted the order and is still processing it. Refresh this provider order in Admin."
                    : duplicateCodes ? "CouponShops returned duplicate coupon codes; review the saved provider order before delivery."
                      : "CouponShops completed or is processing the order but returned a different coupon count; refresh the provider order before delivery.",
                  updatedAt: new Date(),
                }).where(eq(orderItems.id, line.id));
                break;
              }
              await db.transaction(async tx => {
                await tx.update(activationServices).set({
                  stock: sql`GREATEST(${activationServices.stock} - ${line.quantity}, 0)`,
                  reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
                  updatedAt: new Date(),
                }).where(eq(activationServices.serviceKey, line.serviceKey));
                await tx.update(orderItems).set({ fulfillmentState: "fulfilled", providerOrderId: order.orderId,
                  providerStatus: order.status, resultCodes: JSON.stringify(codes), providerMessage: null, updatedAt: new Date() }).where(eq(orderItems.id, line.id));
              });
              completedCount += 1;
              continue;
            } else if (line.provider !== "acczone") {
              const providerDetails = await getProviderDetails(line.provider);
              if (!providerDetails || !providerDetails.apiKey) {
                throw new Error(`Provider ${line.provider}-এর API Key পাওয়া যায়নি। Admin Connections-এ key যাচাই করুন।`);
              }
              const baseUrl = providerDetails.baseUrl || "https://bot.aitoolifystudio.io/api/reseller/v1";
              const botOrder = await createBotResellerOrder(baseUrl, providerDetails.apiKey, {
                productId: line.providerServiceId || line.serviceKey,
                quantity: line.quantity,
                customerEmail: prepared.customerEmail || undefined,
                idempotencyKey: line.providerClientOrderId || undefined,
              });

              const deliveredCodes = botResellerCodes(botOrder.delivered || [], botOrder.orderRef, line.serviceKey);
              const duplicateCodes = !allUniqueCodes(deliveredCodes);

              if (botOrder.status === "cancelled" || botOrder.status === "failed") {
                await db.transaction(async tx => {
                  await tx.update(orderItems).set({
                    fulfillmentState: "failed",
                    providerOrderId: botOrder.orderRef,
                    providerStatus: botOrder.status,
                    providerMessage: botOrder.message || botOrder.error || `${line.provider} cancelled/failed this order.`,
                    updatedAt: new Date(),
                  }).where(eq(orderItems.id, line.id));
                  await tx.update(activationServices).set({
                    reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
                    updatedAt: new Date(),
                  }).where(eq(activationServices.serviceKey, line.serviceKey));
                });
                state = completedCount > 0 ? "partially_fulfilled" : "fulfillment_failed";
                break;
              }

              if (botOrder.status !== "completed" || deliveredCodes.length !== line.quantity || duplicateCodes) {
                state = "fulfillment_unknown";
                await db.update(orderItems).set({
                  fulfillmentState: botOrder.status === "processing" ? "processing" : "unknown",
                  providerOrderId: botOrder.orderRef,
                  providerStatus: botOrder.status,
                  resultCodes: deliveredCodes.length ? JSON.stringify(deliveredCodes) : null,
                  providerMessage: botOrder.status === "processing"
                    ? `${line.provider} accepted the order and is processing. Refresh this provider order in Admin.`
                    : duplicateCodes
                      ? `${line.provider} returned duplicate credential items; review before delivery.`
                      : `${line.provider} delivered ${deliveredCodes.length} items (expected ${line.quantity}). Review provider order.`,
                  updatedAt: new Date(),
                }).where(eq(orderItems.id, line.id));
                break;
              }

              await db.transaction(async tx => {
                await tx.update(activationServices).set({
                  stock: sql`GREATEST(${activationServices.stock} - ${line.quantity}, 0)`,
                  reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
                  updatedAt: new Date(),
                }).where(eq(activationServices.serviceKey, line.serviceKey));
                await tx.update(orderItems).set({
                  fulfillmentState: "fulfilled",
                  providerOrderId: botOrder.orderRef,
                  providerStatus: botOrder.status,
                  resultCodes: JSON.stringify(deliveredCodes),
                  providerMessage: null,
                  updatedAt: new Date(),
                }).where(eq(orderItems.id, line.id));
              });
              completedCount += 1;
              continue;
            }
            const results = await buyActivation(line.providerServiceId || line.serviceKey, line.quantity);
            if (results.length !== line.quantity) {
              state = "fulfillment_unknown";
              await db.update(orderItems).set({
                fulfillmentState: "unknown",
                providerStatus: "unknown",
                resultCodes: results.length ? JSON.stringify(results) : null,
                providerMessage: "Provider response count did not match the requested quantity; check provider history before any retry.",
                updatedAt: new Date(),
              }).where(eq(orderItems.id, line.id));
              break;
            }
            await db.transaction(async tx => {
              await tx.update(activationServices).set({
                stock: sql`GREATEST(${activationServices.stock} - ${line.quantity}, 0)`,
                reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
                updatedAt: new Date(),
              }).where(eq(activationServices.serviceKey, line.serviceKey));
              await tx.update(orderItems).set({ fulfillmentState: "fulfilled", resultCodes: JSON.stringify(results), providerMessage: null, updatedAt: new Date() }).where(eq(orderItems.id, line.id));
            });
            completedCount += 1;
          } catch (error) {
            const ambiguous = error instanceof AcczoneError || error instanceof CouponShopsError || error instanceof BotResellerError ? error.ambiguous : true;
            state = ambiguous ? "fulfillment_unknown" : completedCount > 0 ? "partially_fulfilled" : "fulfillment_failed";
            await db.transaction(async tx => {
              await tx.update(orderItems).set({
                fulfillmentState: ambiguous ? "unknown" : "failed",
                providerStatus: ambiguous ? "unknown" : "failed",
                providerMessage: error instanceof AcczoneError || error instanceof CouponShopsError || error instanceof BotResellerError ? error.message : "Provider result is unclear; review provider history before retrying.",
                updatedAt: new Date(),
              }).where(eq(orderItems.id, line.id));
              if (!ambiguous) await tx.update(activationServices).set({
                reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
                updatedAt: new Date(),
              }).where(eq(activationServices.serviceKey, line.serviceKey));
            });
            break;
          }
        }
        await db.update(orders).set({ status: state, updatedAt: new Date() }).where(eq(orders.id, input.orderId));
        if (state === "fulfilled") queueCredentialEmail(input.orderId);
        return { success: state === "fulfilled", status: state };
      }),
      refreshCouponOrder: adminProcedure.input(z.object({ orderId: z.number().int().positive(), itemId: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const [line] = await db.select().from(orderItems).where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, input.orderId))).limit(1);
        const [parent] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
        if (!line || line.provider === "acczone" || !parent) throw new Error("Refresh-যোগ্য provider order item পাওয়া যায়নি।");
        if (!["fulfillment_unknown", "fulfilling"].includes(parent.status) || !["unknown", "processing"].includes(line.fulfillmentState)) {
          throw new Error("শুধু uncertain/processing provider order refresh করা যাবে।");
        }
        if (parent.status === "fulfilling" && Date.now() - new Date(parent.updatedAt).getTime() < 6 * 60_000) {
          throw new Error("Fulfillment request সক্রিয় থাকতে পারে। অন্তত 6 মিনিট অপেক্ষা করে provider order refresh করুন।");
        }

        if (line.provider !== "couponshops") {
          const providerDetails = await getProviderDetails(line.provider);
          if (!providerDetails || !providerDetails.apiKey) {
            throw new Error(`Provider ${line.provider}-এর API Key পাওয়া যায়নি।`);
          }
          const baseUrl = providerDetails.baseUrl || "https://bot.aitoolifystudio.io/api/reseller/v1";
          if (!line.providerOrderId && !line.providerClientOrderId) {
            throw new Error("Saved Bot order identity অনুপস্থিত; manual provider support প্রয়োজন।");
          }
          const remote = line.providerOrderId
            ? await retrieveBotResellerOrder(baseUrl, providerDetails.apiKey, line.providerOrderId)
            : await createBotResellerOrder(baseUrl, providerDetails.apiKey, {
                productId: line.providerServiceId || line.serviceKey,
                quantity: line.quantity,
                customerEmail: parent.customerEmail,
                idempotencyKey: line.providerClientOrderId || undefined,
              });
          const codes = botResellerCodes(remote.delivered || [], remote.orderRef, line.serviceKey);
          const complete = remote.status === "completed" && codes.length === line.quantity && allUniqueCodes(codes);
          const reconciliation = await db.transaction(async tx => {
            const [lockedParent] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
            const [lockedLine] = await tx.select().from(orderItems).where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, input.orderId))).for("update");
            if (!lockedParent || !lockedLine) throw new Error("Order reconciliation row পাওয়া যায়নি।");
            if (lockedLine.fulfillmentState === "fulfilled") return { status: lockedParent.status, providerStatus: lockedLine.providerStatus, refreshed: false };
            if (!["unknown", "processing"].includes(lockedLine.fulfillmentState)) throw new Error("Order item ইতিমধ্যে অন্য admin পরিবর্তন করেছেন।");
            if (remote.status === "cancelled" || remote.status === "failed") {
              await tx.update(orderItems).set({
                fulfillmentState: "failed",
                providerOrderId: remote.orderRef,
                providerStatus: remote.status,
                resultCodes: null,
                providerMessage: remote.message || remote.error || `${lockedLine.provider} cancelled/failed this order.`,
                updatedAt: new Date(),
              }).where(eq(orderItems.id, lockedLine.id));
              await tx.update(activationServices).set({
                reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${lockedLine.quantity}, 0)`,
                updatedAt: new Date(),
              }).where(eq(activationServices.serviceKey, lockedLine.serviceKey));
            } else if (complete) {
              await tx.update(orderItems).set({
                fulfillmentState: "fulfilled",
                providerOrderId: remote.orderRef,
                providerStatus: remote.status,
                resultCodes: JSON.stringify(codes),
                providerMessage: null,
                updatedAt: new Date(),
              }).where(eq(orderItems.id, lockedLine.id));
              await tx.update(activationServices).set({
                stock: sql`GREATEST(${activationServices.stock} - ${lockedLine.quantity}, 0)`,
                reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${lockedLine.quantity}, 0)`,
                updatedAt: new Date(),
              }).where(eq(activationServices.serviceKey, lockedLine.serviceKey));
            } else {
              await tx.update(orderItems).set({
                fulfillmentState: remote.status === "processing" ? "processing" : "unknown",
                providerOrderId: remote.orderRef,
                providerStatus: remote.status,
                resultCodes: codes.length ? JSON.stringify(codes) : null,
                providerMessage: remote.status === "processing"
                  ? `${lockedLine.provider} is still processing this provider order. Refresh later.`
                  : `${lockedLine.provider} returned incomplete/duplicate codes; review before delivery.`,
                updatedAt: new Date(),
              }).where(eq(orderItems.id, lockedLine.id));
            }
            const allLines = await tx.select().from(orderItems).where(eq(orderItems.orderId, lockedParent.id));
            const nextStatus = couponStatusToOrderStatus(allLines);
            await tx.update(orders).set({ status: nextStatus, updatedAt: new Date() }).where(eq(orders.id, lockedParent.id));
            return { status: nextStatus, providerStatus: remote.status, refreshed: true };
          });
          if (reconciliation.status === "fulfilled") queueCredentialEmail(input.orderId);
          return reconciliation;
        }

        if (!line.providerClientOrderId || !line.providerServiceId) throw new Error("Saved idempotent CouponShops identity অনুপস্থিত; manual provider support প্রয়োজন।");
        const remote = line.providerOrderId
          ? await retrieveCouponOrder(line.providerOrderId)
          : await createCouponOrder(line.providerServiceId, line.quantity, line.providerClientOrderId);
        if (remote.clientOrderId !== line.providerClientOrderId || remote.serviceId !== line.providerServiceId || remote.quantity !== line.quantity) {
          throw new CouponShopsError("CouponShops provider order does not match the saved order item; no automatic reconciliation was made.", undefined, true);
        }
        const codes = couponCodes(remote, line.serviceKey);
        const complete = remote.status === "completed" && codes.length === line.quantity && allUniqueCodes(codes);
        const reconciliation = await db.transaction(async tx => {
          const [lockedParent] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
          const [lockedLine] = await tx.select().from(orderItems).where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, input.orderId))).for("update");
          if (!lockedParent || !lockedLine) throw new Error("Order reconciliation row পাওয়া যায়নি।");
          if (lockedLine.fulfillmentState === "fulfilled") return { status: lockedParent.status, providerStatus: lockedLine.providerStatus, refreshed: false };
          if (!["unknown", "processing"].includes(lockedLine.fulfillmentState)) throw new Error("Order item ইতিমধ্যে অন্য admin পরিবর্তন করেছেন।");
          if (remote.status === "cancelled_refunded") {
            await tx.update(orderItems).set({ fulfillmentState: "failed", providerOrderId: remote.orderId, providerStatus: remote.status,
              resultCodes: null, providerMessage: "CouponShops cancelled this order and reports that its provider charge was refunded.", updatedAt: new Date() }).where(eq(orderItems.id, lockedLine.id));
            await tx.update(activationServices).set({ reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${lockedLine.quantity}, 0)`, updatedAt: new Date() })
              .where(eq(activationServices.serviceKey, lockedLine.serviceKey));
          } else if (complete) {
            await tx.update(orderItems).set({ fulfillmentState: "fulfilled", providerOrderId: remote.orderId, providerStatus: remote.status,
              resultCodes: JSON.stringify(codes), providerMessage: null, updatedAt: new Date() }).where(eq(orderItems.id, lockedLine.id));
            await tx.update(activationServices).set({
              stock: sql`GREATEST(${activationServices.stock} - ${lockedLine.quantity}, 0)`,
              reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${lockedLine.quantity}, 0)`, updatedAt: new Date(),
            }).where(eq(activationServices.serviceKey, lockedLine.serviceKey));
          } else {
            await tx.update(orderItems).set({ fulfillmentState: remote.status === "processing" ? "processing" : "unknown",
              providerOrderId: remote.orderId, providerStatus: remote.status, resultCodes: codes.length ? JSON.stringify(codes) : null,
              providerMessage: remote.status === "processing"
                ? "CouponShops is still processing this provider order. Refresh later."
                : "CouponShops reports completion but returned an incomplete/duplicate coupon list; review provider order before delivery.",
              updatedAt: new Date() }).where(eq(orderItems.id, lockedLine.id));
          }
          const allLines = await tx.select().from(orderItems).where(eq(orderItems.orderId, lockedParent.id));
          const nextStatus = couponStatusToOrderStatus(allLines);
          await tx.update(orders).set({ status: nextStatus, updatedAt: new Date() }).where(eq(orders.id, lockedParent.id));
          return { status: nextStatus, providerStatus: remote.status, refreshed: true };
        });
        if (reconciliation.status === "fulfilled") queueCredentialEmail(input.orderId);
        return reconciliation;
      }),
      recoverUnknown: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const recovery = await db.transaction(async tx => {
          const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
          if (!order || !["fulfillment_unknown", "fulfilling"].includes(order.status)) {
            throw new Error("History review action শুধু uncertain/in-progress order-এ ব্যবহার করা যাবে।");
          }
          if (order.status === "fulfilling" && Date.now() - new Date(order.updatedAt).getTime() < 6 * 60_000) {
            throw new Error("Fulfillment request সক্রিয় থাকতে পারে। অন্তত 6 মিনিট অপেক্ষা করে history আবার যাচাই করুন।");
          }
          const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          if (!lines.length) throw new Error("Order items পাওয়া যায়নি; manual review প্রয়োজন।");
          const uncertain = lines.filter(line => line.fulfillmentState === "unknown" || line.fulfillmentState === "processing");
          if (uncertain.some(line => line.provider !== "acczone")) throw new Error("CouponShops order-এর জন্য provider order refresh ব্যবহার করুন; AccZone history unlock action এখানে প্রযোজ্য নয়।");
          const reviewedAt = new Date().toISOString();
          const actor = ctx.user.email || ctx.user.openId;
          const recoveryNote = `AccZone activation history checked by ${actor}; no matching purchase found before retry unlock (${reviewedAt}).`;
          for (const line of uncertain) {
            await tx.update(orderItems).set({
              fulfillmentState: "pending",
              resultCodes: null,
              providerMessage: recoveryNote,
              updatedAt: new Date(),
            }).where(eq(orderItems.id, line.id));
          }
          const hasRemainingFailure = lines.some(line => line.fulfillmentState === "failed");
          const allComplete = lines.every(line => line.fulfillmentState === "fulfilled");
          const nextStatus = allComplete ? "fulfilled" : hasRemainingFailure ? "fulfillment_failed" : "paid";
          await tx.update(orders).set({
            status: nextStatus,
            adminNote: [order.adminNote, recoveryNote].filter(Boolean).join("\n").slice(0, 20_000),
            updatedAt: new Date(),
          }).where(eq(orders.id, order.id));
          return { status: nextStatus, retryAllowed: nextStatus !== "fulfilled" };
        });
        if (recovery.status === "fulfilled") queueCredentialEmail(input.orderId);
        return recovery;
      }),
      attachRecoveredCodes: adminProcedure.input(z.object({
        orderId: z.number().int().positive(),
        itemId: z.number().int().positive(),
        codes: z.array(z.string().trim().min(1).max(8000)).min(1).max(10),
      })).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not available");
        const reconciliation = await db.transaction(async tx => {
          const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
          if (!order || !["fulfillment_unknown", "fulfilling", "partially_fulfilled"].includes(order.status)) {
            throw new Error("Provider history code শুধু uncertain order item-এ attach করা যাবে।");
          }
          if (order.status === "fulfilling" && Date.now() - new Date(order.updatedAt).getTime() < 6 * 60_000) {
            throw new Error("Fulfillment সক্রিয় থাকতে পারে; ছয় মিনিট পরে history reconcile করুন।");
          }
          const [line] = await tx.select().from(orderItems).where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, order.id))).for("update");
          if (!line || line.provider !== "acczone" || !["unknown", "processing"].includes(line.fulfillmentState)) throw new Error("শুধু AccZone activation-history reconciliation line-এর জন্য available।");
          const prior = safelyParseCodes(line.resultCodes).filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && typeof (entry as Record<string, unknown>).codeValue === "string");
          const priorValues = new Set(prior.map(entry => String(entry.codeValue)));
          const newCodes = input.codes.map(value => value.trim()).filter(value => !priorValues.has(value));
          if (!newCodes.length || new Set(input.codes.map(value => value.trim())).size !== input.codes.length) throw new Error("কোনো নতুন unique activation code দেওয়া হয়নি।");
          const combined = [...prior, ...newCodes.map((codeValue, index) => ({
            id: `history-${Date.now()}-${index}`,
            serviceKey: line.serviceKey,
            codeType: "provider-history",
            codeValue,
            usedAt: new Date().toISOString(),
          }))];
          if (combined.length > line.quantity) throw new Error("সঠিক service-এর activation code count order quantity-এর বেশি হতে পারবে না।");
          const complete = combined.length === line.quantity;
          const actor = ctx.user.email || ctx.user.openId;
          await tx.update(orderItems).set({
            fulfillmentState: complete ? "fulfilled" : "unknown",
            resultCodes: JSON.stringify(combined),
            providerMessage: complete ? `Reconciled against AccZone provider history by ${actor}.` : "Partial provider history attached; match the remaining activation code(s) before retrying.",
            updatedAt: new Date(),
          }).where(eq(orderItems.id, line.id));
          if (complete) await tx.update(activationServices).set({
            stock: sql`GREATEST(${activationServices.stock} - ${line.quantity}, 0)`,
            reservedStock: sql`GREATEST(${activationServices.reservedStock} - ${line.quantity}, 0)`,
            updatedAt: new Date(),
          }).where(eq(activationServices.serviceKey, line.serviceKey));
          const allLines = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          const allComplete = allLines.every(item => item.id === line.id ? complete : item.fulfillmentState === "fulfilled");
          const hasUncertain = allLines.some(item => item.id === line.id ? !complete : item.fulfillmentState === "unknown" || item.fulfillmentState === "processing");
          const hasFailed = allLines.some(item => item.fulfillmentState === "failed");
          const nextStatus = allComplete ? "fulfilled" : hasUncertain ? "fulfillment_unknown" : hasFailed ? "fulfillment_failed" : "paid";
          const note = `Provider history codes manually reconciled by ${actor} for item ${line.id} (${new Date().toISOString()}).`;
          await tx.update(orders).set({
            status: nextStatus,
            adminNote: [order.adminNote, note].filter(Boolean).join("\n").slice(0, 20_000),
            updatedAt: new Date(),
          }).where(eq(orders.id, order.id));
          return { status: nextStatus, codesSaved: newCodes.length, itemComplete: complete };
        });
        if (reconciliation.status === "fulfilled") queueCredentialEmail(input.orderId);
        return reconciliation;
      }),
    }),
  }),
});

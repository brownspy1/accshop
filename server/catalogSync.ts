import { createHash } from "node:crypto";
import { and, eq, notInArray } from "drizzle-orm";
import { activationServices, storeSettings } from "../drizzle/schema";
import { AcczoneError, getServices } from "./acczone";
import { CouponShopsError, getCouponServices } from "./couponshops";
import { getBotResellerProducts } from "./botReseller";
import { getDb } from "./db";
import { getProviderDetails, hasProviderApiKey, type ShopProvider } from "./providerCredentials";
import { repriceAfterSupplierSync, type PricingRates } from "./pricing";

const AUTO_SYNC_TTL_MS = 60_000;
const AUTO_SYNC_WAIT_MS = 2_500;
const MAX_SERVICES = 2_000;
export const SUPPLIER_STOCK_MAX_AGE_MS = 15 * 60_000;

type SyncResult = { provider: ShopProvider; synced: number; active: number; stockSyncedAt: Date };
type SyncState = { lastAttemptAt: number; pending?: Promise<SyncResult> };
const state = new Map<ShopProvider, SyncState>([
  ["acczone", { lastAttemptAt: 0 }],
  ["couponshops", { lastAttemptAt: 0 }],
  ["aitoolify", { lastAttemptAt: 0 }],
]);

function getOrInitSyncState(provider: ShopProvider): SyncState {
  let s = state.get(provider);
  if (!s) {
    s = { lastAttemptAt: 0 };
    state.set(provider, s);
  }
  return s;
}

function couponServiceKey(serviceId: string) {
  return `cs_${createHash("sha256").update(serviceId).digest("hex").slice(0, 40)}`;
}

function botServiceKey(provider: string, serviceId: string) {
  const clean = provider.slice(0, 10).replace(/[^a-z0-9]/g, "");
  return `${clean}_${createHash("sha256").update(String(serviceId)).digest("hex").slice(0, 32)}`;
}

async function performSync(provider: ShopProvider): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [savedSettings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  const rates: PricingRates = {
    currency: (savedSettings?.currency ?? "BDT") as PricingRates["currency"],
    inrToStoreRate: Number(savedSettings?.inrToStoreRate ?? 0),
    usdtToStoreRate: Number(savedSettings?.usdtToStoreRate ?? 0),
    acczoneUnitToStoreRate: Number(savedSettings?.acczoneUnitToStoreRate ?? 0),
  };
  const previousRows = await db.select().from(activationServices).where(eq(activationServices.provider, provider));
  const previousByKey = new Map(previousRows.map(row => [row.serviceKey, row]));
  const now = new Date();
  let synced = 0;
  let active = 0;

  if (provider === "acczone") {
    const incoming = (await getServices()).slice(0, MAX_SERVICES);
    if (!incoming.length) throw new AcczoneError("AccZone catalog empty; the stored catalog was left unchanged.");
    const incomingKeys = incoming.map(item => item.key);
    for (const item of incoming) {
      const previous = previousByKey.get(item.key);
      const pricing = previous ? repriceAfterSupplierSync({
        price: previous.supplierPrice, currency: previous.supplierCurrency,
        providerRate: previous.providerRate, retailPrice: previous.retailPrice,
        baseRetailPrice: previous.baseRetailPrice ?? previous.retailPrice,
        priceMarkupRatio: previous.priceMarkupRatio, priceReviewRequired: previous.priceReviewRequired,
      }, {
        price: item.price, currency: "ACC", providerRate: 0,
      }, rates) : { retailPrice: 0, baseRetailPrice: 0, priceMarkupRatio: 0, priceReviewRequired: 0 };
      await db.insert(activationServices).values({
        serviceKey: item.key, provider: "acczone", providerServiceId: item.key,
        name: item.name, description: item.description, supplierPrice: item.price,
        supplierCurrency: "ACC", providerRate: 0, pricingTiers: null,
        stock: item.stock, isActive: item.isActive, lastStockSyncedAt: now,
        retailPrice: pricing.retailPrice, baseRetailPrice: pricing.baseRetailPrice,
        priceMarkupRatio: pricing.priceMarkupRatio,
        priceReviewRequired: pricing.priceReviewRequired,
      }).onConflictDoUpdate({
        target: activationServices.serviceKey,
        set: {
          provider: "acczone", providerServiceId: item.key, name: item.name,
          description: item.description, supplierPrice: item.price, supplierCurrency: "ACC",
          providerRate: 0, pricingTiers: null, stock: item.stock, isActive: item.isActive,
          retailPrice: pricing.retailPrice, baseRetailPrice: pricing.baseRetailPrice,
          priceMarkupRatio: pricing.priceMarkupRatio,
          priceReviewRequired: pricing.priceReviewRequired, lastStockSyncedAt: now, updatedAt: now,
        },
      });
      synced += 1;
      if (item.isActive === 1 && item.stock > 0) active += 1;
    }
    await db.update(activationServices).set({ isActive: 0, stock: 0, lastStockSyncedAt: now, updatedAt: now })
      .where(and(eq(activationServices.provider, "acczone"), notInArray(activationServices.serviceKey, incomingKeys)));
  } else if (provider === "couponshops") {
    const incoming = (await getCouponServices()).slice(0, MAX_SERVICES);
    if (!incoming.length) throw new CouponShopsError("CouponShops catalog empty or pricing data invalid; the stored catalog was left unchanged.");
    const incomingKeys = incoming.map(item => couponServiceKey(item.serviceId));
    for (const item of incoming) {
      const serviceKey = couponServiceKey(item.serviceId);
      const tier0 = item.tiers[0];
      const supplierPrice = (tier0?.priceUsdt && tier0.priceUsdt > 0)
        ? tier0.priceUsdt
        : (item.rateInrPerUsdt > 0 && tier0?.priceInr ? Number((tier0.priceInr / item.rateInrPerUsdt).toFixed(4)) : 0);
      const previous = previousByKey.get(serviceKey);
      const pricing = previous ? repriceAfterSupplierSync({
        price: previous.supplierPrice, currency: previous.supplierCurrency,
        providerRate: previous.providerRate, retailPrice: previous.retailPrice,
        baseRetailPrice: previous.baseRetailPrice ?? previous.retailPrice,
        priceMarkupRatio: previous.priceMarkupRatio, priceReviewRequired: previous.priceReviewRequired,
      }, {
        price: supplierPrice, currency: "USDT", providerRate: item.rateInrPerUsdt,
      }, rates) : { retailPrice: 0, baseRetailPrice: 0, priceMarkupRatio: 0, priceReviewRequired: 0 };
      await db.insert(activationServices).values({
        serviceKey, provider: "couponshops", providerServiceId: item.serviceId,
        name: item.name, description: null, supplierPrice, supplierCurrency: "USDT",
        providerRate: item.rateInrPerUsdt, pricingTiers: JSON.stringify(item.tiers),
        stock: item.stock, isActive: 1, lastStockSyncedAt: now,
        retailPrice: pricing.retailPrice, baseRetailPrice: pricing.baseRetailPrice,
        priceMarkupRatio: pricing.priceMarkupRatio,
        priceReviewRequired: pricing.priceReviewRequired,
      }).onConflictDoUpdate({
        target: activationServices.serviceKey,
        set: {
          provider: "couponshops", providerServiceId: item.serviceId, name: item.name,
          supplierPrice, supplierCurrency: "USDT", providerRate: item.rateInrPerUsdt,
          pricingTiers: JSON.stringify(item.tiers), stock: item.stock, isActive: 1,
          retailPrice: pricing.retailPrice, baseRetailPrice: pricing.baseRetailPrice,
          priceMarkupRatio: pricing.priceMarkupRatio,
          priceReviewRequired: pricing.priceReviewRequired, lastStockSyncedAt: now, updatedAt: now,
        },
      });
      synced += 1;
      if (item.stock > 0) active += 1;
    }
    await db.update(activationServices).set({ isActive: 0, stock: 0, lastStockSyncedAt: now, updatedAt: now })
      .where(and(eq(activationServices.provider, "couponshops"), notInArray(activationServices.serviceKey, incomingKeys)));
  } else {
    // Dynamic Bot Reseller (Aitoolify / Baku Bob / Custom Bot Reseller v1)
    const details = await getProviderDetails(provider);
    if (!details || !details.apiKey) {
      throw new Error(`${provider} API key কনফিগার করা নেই।`);
    }
    const baseUrl = details.baseUrl || (provider === "aitoolify" ? "https://bot.aitoolifystudio.io/api/reseller/v1" : "");
    if (!baseUrl) {
      throw new Error(`${provider} API entry point (Base URL) কনফিগার করা নেই।`);
    }

    const incoming = (await getBotResellerProducts(baseUrl, details.apiKey)).slice(0, MAX_SERVICES);
    if (!incoming.length) {
      throw new Error(`${details.label || provider} ক্যাটালগ খালি অথবা কোনো প্রোডাক্ট পাওয়া যায়নি।`);
    }

    const incomingKeys = incoming.map(item => botServiceKey(provider, item.id));
    for (const item of incoming) {
      const serviceKey = botServiceKey(provider, item.id);
      const supplierPrice = item.priceUsdt;
      const previous = previousByKey.get(serviceKey);
      const pricing = previous ? repriceAfterSupplierSync({
        price: previous.supplierPrice, currency: previous.supplierCurrency,
        providerRate: previous.providerRate, retailPrice: previous.retailPrice,
        baseRetailPrice: previous.baseRetailPrice ?? previous.retailPrice,
        priceMarkupRatio: previous.priceMarkupRatio, priceReviewRequired: previous.priceReviewRequired,
      }, {
        price: supplierPrice, currency: "USDT", providerRate: rates.usdtToStoreRate,
      }, rates) : { retailPrice: 0, baseRetailPrice: 0, priceMarkupRatio: 0, priceReviewRequired: 0 };

      const tiers = [{ minQuantity: 1, maxQuantity: 100, priceUsdt: supplierPrice, priceInr: 0 }];

      await db.insert(activationServices).values({
        serviceKey, provider, providerServiceId: item.id,
        name: item.name, description: item.description, supplierPrice, supplierCurrency: "USDT",
        providerRate: rates.usdtToStoreRate, pricingTiers: JSON.stringify(tiers),
        stock: item.stock, isActive: item.stock > 0 ? 1 : 0, lastStockSyncedAt: now,
        retailPrice: pricing.retailPrice, baseRetailPrice: pricing.baseRetailPrice,
        priceMarkupRatio: pricing.priceMarkupRatio,
        priceReviewRequired: pricing.priceReviewRequired,
      }).onConflictDoUpdate({
        target: activationServices.serviceKey,
        set: {
          provider, providerServiceId: item.id, name: item.name,
          description: item.description || undefined,
          supplierPrice, supplierCurrency: "USDT", providerRate: rates.usdtToStoreRate,
          pricingTiers: JSON.stringify(tiers), stock: item.stock, isActive: item.stock > 0 ? 1 : 0,
          retailPrice: pricing.retailPrice, baseRetailPrice: pricing.baseRetailPrice,
          priceMarkupRatio: pricing.priceMarkupRatio,
          priceReviewRequired: pricing.priceReviewRequired, lastStockSyncedAt: now, updatedAt: now,
        },
      });
      synced += 1;
      if (item.stock > 0) active += 1;
    }
    await db.update(activationServices).set({ isActive: 0, stock: 0, lastStockSyncedAt: now, updatedAt: now })
      .where(and(eq(activationServices.provider, provider), notInArray(activationServices.serviceKey, incomingKeys)));
  }

  return { provider, synced, active, stockSyncedAt: now };
}

export function syncProviderCatalog(provider: ShopProvider): Promise<SyncResult> {
  const current = getOrInitSyncState(provider);
  if (current.pending) return current.pending;
  current.lastAttemptAt = Date.now();
  let tracked: Promise<SyncResult>;
  tracked = performSync(provider).finally(() => {
    current.lastAttemptAt = Date.now();
    if (current.pending === tracked) current.pending = undefined;
  });
  current.pending = tracked;
  return tracked;
}

export async function refreshCatalogIfNeeded(providers: readonly ShopProvider[] = ["acczone", "couponshops"]): Promise<void> {
  const now = Date.now();
  const jobs: Promise<unknown>[] = [];
  for (const provider of [...new Set(providers)]) {
    const current = getOrInitSyncState(provider);
    if (current.pending) {
      jobs.push(current.pending.catch(() => undefined));
      continue;
    }
    if (now - current.lastAttemptAt < AUTO_SYNC_TTL_MS) continue;
    if (!await hasProviderApiKey(provider)) continue;
    jobs.push(syncProviderCatalog(provider).catch(() => {
      console.warn(`[Catalog sync] ${provider} refresh failed; retaining the last successful supplier snapshot.`);
    }));
  }
  if (!jobs.length) return;
  await Promise.race([
    Promise.all(jobs).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, AUTO_SYNC_WAIT_MS)),
  ]);
}

import { getProviderApiKey, verifyAndSaveProviderApiKey } from "./providerCredentials";

const API_BASE = "https://api.couponshops.org/api/v1/";
const REQUEST_GAP_MS = 1_100;
let requestQueue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
let rateLimitUntil = 0;

export class CouponShopsError extends Error {
  constructor(message: string, readonly status?: number, readonly ambiguous = false) {
    super(message);
    this.name = "CouponShopsError";
  }
}

type RequestOptions = { method?: "GET" | "POST"; body?: Record<string, unknown> };
type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = Number.NaN) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeErrorMessage(status: number, code: unknown) {
  if (status === 401 || code === "unauthorized") return "CouponShops API key was rejected. Check the key in Admin Settings.";
  if (status === 402 || code === "insufficient_balance") return "CouponShops wallet balance is insufficient; no sale should be retried until balance is checked.";
  if (status === 404 || code === "unknown_service" || code === "not_found") return "CouponShops could not find this service or provider order.";
  if (status === 409 || code === "out_of_stock") return "CouponShops reports that the requested quantity is out of stock.";
  if (status === 429 || code === "rate_limited") return "CouponShops rate limit reached. Wait for the provider Retry-After period before another request.";
  return `CouponShops API returned HTTP ${status || "error"}.`;
}

async function serialRequest<T>(operation: () => Promise<T>): Promise<T> {
  const run = requestQueue.then(async () => {
    const delay = Math.max(REQUEST_GAP_MS - (Date.now() - lastRequestAt), rateLimitUntil - Date.now());
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
    return operation();
  });
  requestQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function request(path: string, apiKey: string, options: RequestOptions = {}) {
  const method = options.method ?? "GET";
  return serialRequest(async () => {
    let response: Response;
    try {
      response = await fetch(new URL(path.replace(/^\//, ""), API_BASE), {
        method,
        headers: {
          Accept: "application/json",
          "X-API-Key": apiKey,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new CouponShopsError(
        method === "POST"
          ? "CouponShops did not return a response. The stable client_order_id is saved; use Refresh provider order to safely retrieve the same idempotent order."
          : "CouponShops did not return a response. Try again after checking the API connection.",
        undefined,
        method === "POST",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (method === "POST" && response.status >= 500) {
        throw new CouponShopsError("CouponShops returned an unreadable server response; the same client_order_id must be used for safe recovery.", response.status, true);
      }
      throw new CouponShopsError("CouponShops returned an unreadable response.", response.status, method === "POST" && response.status >= 500);
    }

    if (response.status === 429) {
      const retryAfter = Math.max(1, Math.min(3600, Number(response.headers.get("Retry-After")) || 60));
      rateLimitUntil = Math.max(rateLimitUntil, Date.now() + retryAfter * 1_000);
    }
    if (!response.ok) {
      const code = isRecord(payload) ? payload.error : undefined;
      throw new CouponShopsError(safeErrorMessage(response.status, code), response.status, method === "POST" && response.status >= 500);
    }
    if (!isRecord(payload)) throw new CouponShopsError("CouponShops returned an invalid response envelope.", response.status, method === "POST");
    if (payload.ok !== true) {
      const code = payload.error;
      const status = code === "insufficient_balance" ? 402 : code === "unauthorized" ? 401 : code === "out_of_stock" ? 409 : code === "rate_limited" ? 429 : code === "internal_error" ? 500 : 400;
      throw new CouponShopsError(safeErrorMessage(status, code), status, method === "POST" && code === "internal_error");
    }
    return payload;
  });
}

export type CouponPricingTier = {
  minQuantity: number;
  maxQuantity: number;
  priceInr: number;
  priceUsdt: number;
};

export type CouponService = {
  serviceId: string;
  name: string;
  stock: number;
  rateInrPerUsdt: number;
  tiers: CouponPricingTier[];
};

export type CouponBalance = {
  balanceUsdt: number;
  balanceInr: number;
  rateInrPerUsdt: number;
};

export async function getCouponBalanceWithKey(apiKey: string): Promise<CouponBalance> {
  const raw = await request("/balance", apiKey);
  const balanceUsdt = finiteNumber(raw.balance_usdt);
  const balanceInr = finiteNumber(raw.balance_inr);
  const rateInrPerUsdt = finiteNumber(raw.rate_inr_per_usdt);
  if (![balanceUsdt, balanceInr, rateInrPerUsdt].every(Number.isFinite) || balanceUsdt < 0 || balanceInr < 0 || rateInrPerUsdt <= 0) {
    throw new CouponShopsError("CouponShops returned an invalid wallet balance response.");
  }
  return { balanceUsdt, balanceInr, rateInrPerUsdt };
}

export async function verifyAndSaveCouponShopsKey(apiKey: string) {
  return verifyAndSaveProviderApiKey("couponshops", apiKey, getCouponBalanceWithKey);
}

export async function getCouponBalance() {
  return getCouponBalanceWithKey(await getProviderApiKey("couponshops"));
}

export async function getCouponServices(): Promise<CouponService[]> {
  const key = await getProviderApiKey("couponshops");
  const raw = await request("/services", key);
  const rawList = Array.isArray(raw.services)
    ? raw.services
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : null;
  if (!rawList) throw new CouponShopsError("CouponShops returned an invalid services response.");
  const defaultRate = finiteNumber(raw.rate_inr_per_usdt, 0);

  return rawList.slice(0, 2_000).flatMap((entry): CouponService[] => {
    if (!isRecord(entry)) return [];

    const rawId = entry.service_id ?? entry.serviceId ?? entry.id ?? entry.key;
    const serviceId = String(rawId ?? "").trim();
    if (!serviceId || serviceId.length > 128) return [];
    if (!/^[A-Za-z0-9_.\- :@#/+]{1,128}$/.test(serviceId)) return [];

    const rawName = entry.name ?? entry.service_name ?? entry.title;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) return [];

    const stockValue = finiteNumber(entry.stock ?? entry.quantity ?? entry.available, 0);
    const stock = Math.max(0, Math.min(1_000_000, Math.trunc(stockValue)));

    const rate = finiteNumber(entry.rate_inr_per_usdt, defaultRate);
    const effectiveRate = rate > 0 ? rate : defaultRate;

    let tiers: CouponPricingTier[] = [];

    if (Array.isArray(entry.pricing) && entry.pricing.length > 0) {
      tiers = entry.pricing.flatMap((item): CouponPricingTier[] => {
        if (!isRecord(item)) return [];
        let minQuantity = Math.trunc(finiteNumber(item.min_qty ?? item.min_quantity, 1));
        if (minQuantity < 1) minQuantity = 1;
        let maxQuantity = Math.trunc(finiteNumber(item.max_qty ?? item.max_quantity, 1_000_000));
        if (maxQuantity < minQuantity) maxQuantity = Math.max(minQuantity, stock > 0 ? stock : 1_000);

        let priceInr = finiteNumber(item.price_inr ?? item.priceInr ?? item.price, 0);
        let priceUsdt = finiteNumber(item.price_usdt ?? item.priceUsdt, 0);

        if (priceUsdt <= 0 && priceInr > 0 && effectiveRate > 0) {
          priceUsdt = Number((priceInr / effectiveRate).toFixed(4));
        }
        if (priceInr <= 0 && priceUsdt > 0 && effectiveRate > 0) {
          priceInr = Number((priceUsdt * effectiveRate).toFixed(2));
        }

        if (priceInr < 0 || priceUsdt < 0) return [];
        return [{ minQuantity, maxQuantity, priceInr, priceUsdt }];
      }).sort((a, b) => a.minQuantity - b.minQuantity);
    } else {
      let priceInr = finiteNumber(entry.price_inr ?? entry.priceInr ?? entry.price ?? entry.cost, 0);
      let priceUsdt = finiteNumber(entry.price_usdt ?? entry.priceUsdt, 0);
      if (priceUsdt <= 0 && priceInr > 0 && effectiveRate > 0) {
        priceUsdt = Number((priceInr / effectiveRate).toFixed(4));
      }
      if (priceInr <= 0 && priceUsdt > 0 && effectiveRate > 0) {
        priceInr = Number((priceUsdt * effectiveRate).toFixed(2));
      }
      if (priceInr >= 0 && priceUsdt >= 0 && (priceInr > 0 || priceUsdt > 0)) {
        tiers = [{ minQuantity: 1, maxQuantity: Math.max(1, stock > 0 ? stock : 1_000), priceInr, priceUsdt }];
      }
    }

    if (!tiers.length) return [];

    const sanitizedTiers: CouponPricingTier[] = [tiers[0]!];
    for (let index = 1; index < tiers.length; index += 1) {
      const currentTier = tiers[index]!;
      const prevTier = sanitizedTiers[sanitizedTiers.length - 1]!;
      if (currentTier.minQuantity <= prevTier.maxQuantity) {
        if (currentTier.maxQuantity > prevTier.maxQuantity) {
          sanitizedTiers.push({
            ...currentTier,
            minQuantity: prevTier.maxQuantity + 1,
          });
        }
      } else {
        sanitizedTiers.push(currentTier);
      }
    }

    return [{
      serviceId,
      name: name.slice(0, 255),
      stock,
      rateInrPerUsdt: effectiveRate > 0 ? effectiveRate : 0,
      tiers: sanitizedTiers,
    }];
  });
}

export type CouponProviderOrder = {
  orderId: string;
  clientOrderId: string;
  status: "completed" | "processing" | "cancelled_refunded";
  serviceId: string;
  quantity: number;
  amountInr: number;
  amountUsdt: number;
  coupons: string[];
  balanceUsdt: number | null;
};

function parseOrderResponse(raw: unknown): CouponProviderOrder {
  if (!isRecord(raw) || !isRecord(raw.order)) throw new CouponShopsError("CouponShops returned an invalid order response; use the saved client_order_id to review status.", undefined, true);
  const order = raw.order;
  const status = order.status;
  const orderId = typeof order.order_id === "string" ? order.order_id.slice(0, 128) : "";
  const clientOrderId = typeof order.client_order_id === "string" ? order.client_order_id.slice(0, 128) : "";
  const serviceId = typeof order.service_id === "string" ? order.service_id.slice(0, 128) : "";
  const quantity = Math.trunc(finiteNumber(order.quantity, 0));
  if (!orderId || !clientOrderId || !serviceId || quantity < 1 || !["completed", "processing", "cancelled_refunded"].includes(String(status))) {
    throw new CouponShopsError("CouponShops returned an incomplete order identity/status; use the saved client_order_id to review status.", undefined, true);
  }
  const coupons = Array.isArray(order.coupons)
    ? order.coupons.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 8_000).slice(0, 100)
    : [];
  return {
    orderId,
    clientOrderId,
    status: status as CouponProviderOrder["status"],
    serviceId,
    quantity,
    amountInr: Math.max(0, finiteNumber(order.amount_inr, 0)),
    amountUsdt: Math.max(0, finiteNumber(order.amount_usdt, 0)),
    coupons,
    balanceUsdt: Number.isFinite(finiteNumber(raw.balance_usdt)) ? finiteNumber(raw.balance_usdt) : null,
  };
}

export async function createCouponOrder(serviceId: string, quantity: number, clientOrderId: string): Promise<CouponProviderOrder> {
  const key = await getProviderApiKey("couponshops");
  const raw = await request("/orders", key, {
    method: "POST",
    body: { service_id: serviceId, quantity, client_order_id: clientOrderId },
  });
  const order = parseOrderResponse(raw);
  if (order.serviceId !== serviceId || order.quantity !== quantity || order.clientOrderId !== clientOrderId) {
    throw new CouponShopsError("CouponShops response did not match the saved idempotent request; refresh provider order before any retry.", undefined, true);
  }
  return order;
}

export async function retrieveCouponOrder(orderId: string): Promise<CouponProviderOrder> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) throw new CouponShopsError("Stored CouponShops order ID is invalid.");
  const key = await getProviderApiKey("couponshops");
  return parseOrderResponse(await request(`/orders/${encodeURIComponent(orderId)}`, key));
}

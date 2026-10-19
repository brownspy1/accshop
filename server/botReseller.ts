export class BotResellerError extends Error {
  constructor(
    message: string,
    public readonly code: string = "BOT_RESELLER_ERROR",
    public readonly status: number = 500,
    public readonly ambiguous: boolean = false,
  ) {
    super(message);
    this.name = "BotResellerError";
  }
}

export interface NormalizedBotProduct {
  id: string;
  name: string;
  description: string | null;
  priceUsdt: number;
  stock: number;
  isUnlimited: boolean;
  requiresEmail: boolean;
  type: string;
}

export interface BotResellerOrderResult {
  success: boolean;
  orderRef: string;
  orderId: string | number;
  status: "completed" | "processing" | "pending_invite" | "failed" | string;
  amountCharged?: number;
  balanceRemaining?: number;
  delivered: string[];
  error?: string;
  errorCode?: string;
  message?: string;
}

/**
 * Normalizes entry point URL to standard reseller v1 format.
 * Examples:
 *   https://bot.aitoolifystudio.io -> https://bot.aitoolifystudio.io/api/reseller/v1
 *   https://bot.aitoolifystudio.io/docs -> https://bot.aitoolifystudio.io/api/reseller/v1
 *   https://example.com/api/reseller/v1 -> https://example.com/api/reseller/v1
 */
export function normalizeBotResellerUrl(rawUrl: string): string {
  let clean = (rawUrl || "").trim();
  if (!clean) return "";
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }
  clean = clean.replace(/\/+$/, "");
  if (clean.endsWith("/docs")) {
    clean = clean.slice(0, -5).replace(/\/+$/, "");
  }
  if (!clean.includes("/api/reseller/") && !clean.endsWith("/v1")) {
    clean = `${clean}/api/reseller/v1`;
  }
  return clean;
}

function defaultHeaders(apiKey: string): Record<string, string> {
  const cleanKey = (apiKey || "").trim();
  return {
    Authorization: `Bearer ${cleanKey}`,
    "X-API-Key": cleanKey,
    "User-Agent": "AccZone-Shop/1.0",
    Accept: "application/json",
  };
}

/**
 * Tests connection to a Bot Reseller API by pinging /balance.
 */
export async function testBotResellerConnection(
  baseUrl: string,
  apiKey: string,
): Promise<{ success: boolean; balance: number; currency: string; raw: any }> {
  const target = normalizeBotResellerUrl(baseUrl);
  if (!target) throw new BotResellerError("API Entry Point (URL) খালি রাখা যাবে না।", "INVALID_URL", 400);
  if (!apiKey?.trim()) throw new BotResellerError("API Key খালি রাখা যাবে না।", "INVALID_KEY", 400);

  const endpoint = `${target}/balance`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: defaultHeaders(apiKey),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new BotResellerError(`সার্ভার থেকে অবৈধ রেসপন্স এসেছে (HTTP ${res.status}): ${text.slice(0, 200)}`, "INVALID_RESPONSE", res.status);
    }

    if (!res.ok || data.success === false) {
      const code = data.error_code || "API_ERROR";
      const message = data.error || (res.status === 401 ? "API Key সঠিক নয় বা বাতিল করা হয়েছে।" : `HTTP ${res.status} এরর`);
      throw new BotResellerError(message, code, res.status);
    }

    const balance = Number(data.balance ?? 0);
    const currency = String(data.currency || "USDT");
    return {
      success: true,
      balance,
      currency,
      raw: data,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err instanceof BotResellerError) throw err;
    if (err.name === "AbortError") {
      throw new BotResellerError("API রিকোয়েস্ট টাইমআউট হয়েছে (১৫ সেকেন্ড)।", "TIMEOUT", 504);
    }
    throw new BotResellerError(`API সার্ভারের সাথে যোগাযোগ করা যায়নি: ${err.message}`, "NETWORK_ERROR", 502);
  }
}

/**
 * Fetches current wallet balance from Bot Reseller API.
 */
export async function getBotResellerBalance(
  baseUrl: string,
  apiKey: string,
): Promise<{ balance: number; currency: string }> {
  const res = await testBotResellerConnection(baseUrl, apiKey);
  return { balance: res.balance, currency: res.currency };
}

/**
 * Fetches available products from Bot Reseller API.
 */
export async function getBotResellerProducts(
  baseUrl: string,
  apiKey: string,
): Promise<NormalizedBotProduct[]> {
  const target = normalizeBotResellerUrl(baseUrl);
  const endpoint = `${target}/products`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: defaultHeaders(apiKey),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new BotResellerError(`অবৈধ প্রোডাক্ট লিস্ট রেসপন্স: ${text.slice(0, 200)}`, "INVALID_RESPONSE", res.status);
    }

    if (!res.ok || data.success === false) {
      throw new BotResellerError(data.error || "প্রোডাক্ট ক্যাটালগ ফেচ করা যায়নি।", data.error_code || "CATALOG_ERROR", res.status);
    }

    const list: any[] = Array.isArray(data.products)
      ? data.products
      : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data)
      ? data
      : [];

    return list.map((item: any) => {
      const id = String(item.id ?? item.product_id ?? item.key ?? "");
      const name = String(item.name || item.title || `Product #${id}`);
      const description = item.description ? String(item.description).trim() : null;
      const priceUsdt = Number(item.your_cost ?? item.price_usdt ?? item.cost ?? item.price ?? 0);
      const isUnlimited = Boolean(item.is_unlimited || item.stock === null || item.stock === undefined);
      const stock = isUnlimited ? 999 : Number(item.stock ?? item.stock_quantity ?? item.quantity ?? 0);
      const requiresEmail = Boolean(item.requires_email);
      const type = String(item.type || "digital");

      return {
        id,
        name,
        description,
        priceUsdt,
        stock: Math.max(0, stock),
        isUnlimited,
        requiresEmail,
        type,
      };
    }).filter((p) => Boolean(p.id));
  } catch (err: any) {
    clearTimeout(timer);
    if (err instanceof BotResellerError) throw err;
    if (err.name === "AbortError") {
      throw new BotResellerError("প্রোডাক্ট ক্যাটালগ রিকোয়েস্ট টাইমআউট হয়েছে।", "TIMEOUT", 504);
    }
    throw new BotResellerError(`প্রোডাক্ট লোড ব্যর্থ: ${err.message}`, "NETWORK_ERROR", 502);
  }
}

/**
 * Places an order on Bot Reseller API.
 */
export async function createBotResellerOrder(
  baseUrl: string,
  apiKey: string,
  input: {
    productId: string | number;
    quantity: number;
    customerEmail?: string | null;
    idempotencyKey?: string | null;
  },
): Promise<BotResellerOrderResult> {
  const target = normalizeBotResellerUrl(baseUrl);
  const endpoint = `${target}/order`;

  const payload: Record<string, any> = {
    product_id: isNaN(Number(input.productId)) ? input.productId : Number(input.productId),
    quantity: Math.max(1, input.quantity),
  };
  if (input.customerEmail?.trim()) {
    payload.customer_email = input.customerEmail.trim();
  }
  if (input.idempotencyKey?.trim()) {
    payload.idempotency_key = input.idempotencyKey.trim();
  }

  const headers: Record<string, string> = {
    ...defaultHeaders(apiKey),
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey?.trim()) {
    headers["Idempotency-Key"] = input.idempotencyKey.trim();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new BotResellerError(`অর্ডার রেসপন্স অবৈধ (HTTP ${res.status}): ${text.slice(0, 200)}`, "INVALID_RESPONSE", res.status);
    }

    if (!res.ok || data.success === false) {
      const message = data.error || `অর্ডার ব্যর্থ হয়েছে (HTTP ${res.status})`;
      const errorCode = data.error_code || "ORDER_FAILED";
      return {
        success: false,
        orderRef: data.order_ref || "",
        orderId: data.order_id || "",
        status: "failed",
        delivered: [],
        error: message,
        errorCode,
      };
    }

    let delivered: string[] = [];
    if (Array.isArray(data.delivered)) {
      delivered = data.delivered.map((d: any) => typeof d === "string" ? d : JSON.stringify(d));
    } else if (typeof data.delivered === "string" && data.delivered.trim()) {
      delivered = [data.delivered.trim()];
    }

    const orderRef = String(data.order_ref || data.order_id || data.id || "");
    const status = String(data.status || (delivered.length ? "completed" : "processing"));

    return {
      success: true,
      orderRef,
      orderId: data.order_id ?? orderRef,
      status,
      amountCharged: data.amount_charged ? Number(data.amount_charged) : undefined,
      balanceRemaining: data.balance_remaining ? Number(data.balance_remaining) : undefined,
      delivered,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err instanceof BotResellerError) throw err;
    if (err.name === "AbortError") {
      throw new BotResellerError("অর্ডার রিকোয়েস্ট টাইমআউট হয়েছে (৪৫ সেকেন্ড)।", "TIMEOUT", 504);
    }
    throw new BotResellerError(`অর্ডার সাবমিট ব্যর্থ: ${err.message}`, "NETWORK_ERROR", 502);
  }
}

/**
 * Retrieves past order details or delivered credentials using order_ref.
 */
export async function retrieveBotResellerOrder(
  baseUrl: string,
  apiKey: string,
  orderRef: string,
): Promise<BotResellerOrderResult> {
  const target = normalizeBotResellerUrl(baseUrl);
  const endpoint = `${target}/order/${encodeURIComponent(orderRef)}`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: defaultHeaders(apiKey),
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new BotResellerError(`অবৈধ অর্ডার কোয়েরি রেসপন্স: ${text.slice(0, 200)}`, "INVALID_RESPONSE", res.status);
  }

  if (!res.ok || data.success === false) {
    throw new BotResellerError(data.error || "অর্ডার তথ্য পাওয়া যায়নি।", data.error_code || "ORDER_NOT_FOUND", res.status);
  }

  let delivered: string[] = [];
  if (Array.isArray(data.delivered)) {
    delivered = data.delivered.map((d: any) => typeof d === "string" ? d : JSON.stringify(d));
  } else if (typeof data.delivered === "string" && data.delivered.trim()) {
    delivered = [data.delivered.trim()];
  }

  return {
    success: true,
    orderRef: String(data.order_ref || orderRef),
    orderId: data.order_id ?? orderRef,
    status: String(data.status || "completed"),
    amountCharged: data.amount_charged ? Number(data.amount_charged) : undefined,
    delivered,
  };
}

import { getDb } from "./db";
import { getProviderApiKey, hasProviderApiKey, verifyAndSaveProviderApiKey } from "./providerCredentials";

const API_BASE = "https://api.acczone.xyz";
const CALL_GAP_MS = 2_050;
let apiQueue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

export class AcczoneError extends Error {
  constructor(message: string, readonly status?: number, readonly ambiguous = false) {
    super(message);
    this.name = "AcczoneError";
  }
}

async function serialApiCall<T>(operation: () => Promise<T>): Promise<T> {
  const run = apiQueue.then(async () => {
    const delay = CALL_GAP_MS - (Date.now() - lastCallAt);
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    lastCallAt = Date.now();
    return operation();
  });
  apiQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function request(path: string, params: Record<string, string>, keyProtected = false) {
  return serialApiCall(async () => {
    const url = new URL(path, API_BASE);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AcczoneError("AccZone API did not return a response. Check provider history before retrying.", undefined, keyProtected);
    }
    if (!response.ok) {
      const status = response.status;
      const message = status === 429
        ? "AccZone rate limit reached. Wait at least two seconds before another request."
        : `AccZone API returned HTTP ${status}.`;
      throw new AcczoneError(message, status, keyProtected && status >= 500);
    }
    try {
      return await response.json() as unknown;
    } catch {
      throw new AcczoneError("AccZone API returned an unreadable response.", undefined, keyProtected);
    }
  });
}

async function getSavedKey() {
  return getProviderApiKey("acczone");
}

function sanitizeBalance(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AcczoneError("AccZone returned an invalid balance response.");
  }
  const raw = value as Record<string, unknown>;
  const balance = Number(raw.balance);
  if (!Number.isFinite(balance)) throw new AcczoneError("AccZone returned an invalid balance response.");
  return {
    balance,
    username: typeof raw.username === "string" ? raw.username.slice(0, 120) : "",
    firstName: typeof raw.first_name === "string" ? raw.first_name.slice(0, 120) : "",
    createdAt: typeof raw.created_at === "string" ? raw.created_at : "",
    verifiedAt: typeof raw.verified_at === "string" ? raw.verified_at : "",
  };
}

export async function testAndSaveApiKey(apiKey: string) {
  return verifyAndSaveProviderApiKey("acczone", apiKey, async key => sanitizeBalance(await request("/getBalance", { apikey: key }, true)));
}

export async function hasApiKey() {
  return hasProviderApiKey("acczone");
}

export async function getBalance() {
  const key = await getSavedKey();
  return sanitizeBalance(await request("/getBalance", { apikey: key }, true));
}

export type ProviderService = {
  key: string;
  name: string;
  price: number;
  isActive: number;
  description: string;
  stock: number;
};

export async function getServices(): Promise<ProviderService[]> {
  const raw = await request("/getServices", {});
  if (!Array.isArray(raw)) throw new AcczoneError("AccZone returned an invalid services response.");
  return raw.flatMap((entry): ProviderService[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.key !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(row.key) || typeof row.name !== "string") return [];
    const price = Number(row.price);
    if (!Number.isFinite(price) || price < 0) return [];
    return [{
      key: row.key,
      name: row.name.slice(0, 255),
      price,
      isActive: Number(row.is_active) === 1 ? 1 : 0,
      description: typeof row.description === "string" ? row.description.slice(0, 20_000) : "",
      stock: Math.max(0, Math.min(1_000_000, Math.trunc(Number(row.stock) || 0))),
    }];
  });
}

export async function getHistory(page: number, limit: number) {
  const key = await getSavedKey();
  const raw = await request("/getHistory", { apikey: key, page: String(page), limit: String(limit) }, true);
  if (!Array.isArray(raw)) throw new AcczoneError("AccZone returned an invalid history response.");
  return raw.slice(0, limit).map(entry => {
    if (!entry || typeof entry !== "object") return { id: "", serviceKey: "", codeValue: "", usedAt: "" };
    const row = entry as Record<string, unknown>;
    return {
      id: String(row.id ?? "").slice(0, 100),
      serviceKey: String(row.service_key ?? "").slice(0, 128),
      codeValue: String(row.code_value ?? "").slice(0, 4000),
      usedAt: String(row.used_at ?? "").slice(0, 80),
    };
  });
}

export async function buyActivation(serviceKey: string, quantity: number) {
  let key: string;
  try {
    key = await getSavedKey();
  } catch {
    throw new AcczoneError("A verified AccZone API key is required before fulfillment.", 400, false);
  }
  const raw = await request("/buyCpn", { apikey: key, service_key: serviceKey, quantity: String(quantity) }, true);
  if (!Array.isArray(raw)) throw new AcczoneError("AccZone returned an unexpected purchase response.", undefined, true);
  if (raw.length !== quantity) throw new AcczoneError("AccZone purchase count did not match the requested quantity; check provider history.", undefined, true);
  const seenCodes = new Set<string>();
  const seenIds = new Set<string>();
  return raw.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new AcczoneError("AccZone returned an invalid activation record; check provider history.", undefined, true);
    const row = entry as Record<string, unknown>;
    if (typeof row.code_value !== "string" || row.code_value.length < 1 || row.code_value.length > 8000) throw new AcczoneError("AccZone returned an invalid activation code; check provider history.", undefined, true);
    if (row.service_key !== undefined && row.service_key !== serviceKey) throw new AcczoneError("AccZone returned a code for an unexpected service; check provider history.", undefined, true);
    const id = String(row.id ?? "").slice(0, 100);
    if (seenCodes.has(row.code_value) || (id && seenIds.has(id))) throw new AcczoneError("AccZone returned a duplicate activation record; check provider history.", undefined, true);
    seenCodes.add(row.code_value);
    if (id) seenIds.add(id);
    return [{
      id,
      serviceKey,
      codeType: String(row.code_type ?? "code").slice(0, 80),
      codeValue: row.code_value,
      usedAt: String(row.used_at ?? "").slice(0, 80),
    }][0];
  });
}

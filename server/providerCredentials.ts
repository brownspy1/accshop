import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { providerCredentials, activationServices } from "../drizzle/schema";
import { getDb } from "./db";
import { testBotResellerConnection, normalizeBotResellerUrl } from "./botReseller";

export type ShopProvider = "acczone" | "couponshops" | string;
export type CredentialProvider = string;

type EncryptedKey = { ciphertext: string; nonce: string; authTag: string };

let providerCredentialsColumnsMigrated = false;
export async function ensureProviderCredentialsColumns(db: any) {
  if (providerCredentialsColumnsMigrated) return;
  try {
    await db.execute(sql`
      ALTER TABLE provider_credentials 
      ADD COLUMN IF NOT EXISTS "label" varchar(128),
      ADD COLUMN IF NOT EXISTS "baseUrl" varchar(512),
      ADD COLUMN IF NOT EXISTS "providerType" varchar(32) DEFAULT 'bot_reseller',
      ADD COLUMN IF NOT EXISTS "isActive" integer DEFAULT 1;
    `);
    providerCredentialsColumnsMigrated = true;
  } catch (err) {
    console.warn("[DB Migration] provider_credentials columns ensure:", err);
  }
}

function encryptionKey(provider: CredentialProvider) {
  const master = process.env.JWT_SECRET?.trim() || process.env.MANUS_JWT_SECRET?.trim() || "accshop-secure-encryption-key-32chars-fallback";
  const projectId = process.env.MANUS_PROJECT_ID?.trim() || process.env.APP_ID?.trim() || "accshop";

  const knownPurpose: Record<string, string> = {
    acczone: "acczone-shop/provider-key/aes-256-gcm/v1",
    couponshops: "acczone-shop/couponshops/provider-key/aes-256-gcm/v1",
    resend: "acczone-shop/resend-key/aes-256-gcm/v1",
    gmail: "acczone-shop/gmail-key/aes-256-gcm/v1",
  };
  const purpose = knownPurpose[provider] || `acczone-shop/${provider}/provider-key/aes-256-gcm/v1`;

  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(master, "utf8"),
    Buffer.from(projectId, "utf8"),
    Buffer.from(purpose, "utf8"),
    32,
  ));
}

function encrypt(provider: CredentialProvider, apiKey: string): EncryptedKey {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(provider), nonce);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), nonce: nonce.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
}

function decrypt(provider: CredentialProvider, encrypted: EncryptedKey) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(provider), Buffer.from(encrypted.nonce, "hex"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export async function getProviderApiKey(provider: CredentialProvider) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureProviderCredentialsColumns(db);
  const [row] = await db.select().from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);
  if (!row) throw new Error(`${provider} API key is not configured`);
  try {
    return decrypt(provider, row);
  } catch {
    throw new Error(`Stored ${provider} API key could not be decrypted. Re-enter the key in Admin Settings.`);
  }
}

export async function getProviderDetails(provider: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureProviderCredentialsColumns(db);
  const [row] = await db.select().from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);
  if (!row) return null;
  let apiKey = "";
  try {
    apiKey = decrypt(provider, row);
  } catch {
    apiKey = "";
  }
  return {
    provider: row.provider,
    label: row.label || row.provider,
    baseUrl: row.baseUrl || (row.provider === "aitoolify" ? "https://bot.aitoolifystudio.io/api/reseller/v1" : ""),
    providerType: row.providerType || (row.provider === "acczone" ? "acczone" : row.provider === "couponshops" ? "couponshops" : "bot_reseller"),
    isActive: row.isActive ?? 1,
    apiKey,
    updatedAt: row.updatedAt,
  };
}

export async function hasProviderApiKey(provider: CredentialProvider) {
  const db = await getDb();
  if (!db) return false;
  await ensureProviderCredentialsColumns(db);
  const [row] = await db.select({ id: providerCredentials.id }).from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);
  return Boolean(row);
}

export async function getProviderCredentialStatus(provider: CredentialProvider) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureProviderCredentialsColumns(db);
  const [row] = await db.select({
    updatedAt: providerCredentials.updatedAt,
    label: providerCredentials.label,
    baseUrl: providerCredentials.baseUrl,
    providerType: providerCredentials.providerType,
    isActive: providerCredentials.isActive,
  }).from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);

  return {
    configured: Boolean(row),
    updatedAt: row?.updatedAt ?? null,
    label: row?.label ?? null,
    baseUrl: row?.baseUrl ?? null,
    providerType: row?.providerType ?? null,
    isActive: row?.isActive ?? 1,
  };
}

export async function listAllConfiguredProviders() {
  const db = await getDb();
  if (!db) return [];
  await ensureProviderCredentialsColumns(db);
  const rows = await db.select().from(providerCredentials);
  return rows.map((r) => {
    let hasValidKey = false;
    try {
      decrypt(r.provider, r);
      hasValidKey = true;
    } catch {
      hasValidKey = false;
    }
    return {
      provider: r.provider,
      label: r.label || (r.provider === "acczone" ? "AccZone" : r.provider === "couponshops" ? "CouponShops" : r.provider === "aitoolify" ? "Aitoolify Studio Bot" : r.provider),
      baseUrl: r.baseUrl || (r.provider === "aitoolify" ? "https://bot.aitoolifystudio.io/api/reseller/v1" : ""),
      providerType: r.providerType || (r.provider === "acczone" ? "acczone" : r.provider === "couponshops" ? "couponshops" : "bot_reseller"),
      isActive: r.isActive ?? 1,
      configured: hasValidKey,
      updatedAt: r.updatedAt,
    };
  });
}

export async function verifyAndSaveProviderApiKey<T>(
  provider: CredentialProvider,
  apiKey: string,
  verify: (key: string) => Promise<T>,
  options?: { label?: string; baseUrl?: string; providerType?: string },
): Promise<T> {
  const verified = await verify(apiKey);
  const encrypted = encrypt(provider, apiKey);
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureProviderCredentialsColumns(db);

  const values: typeof providerCredentials.$inferInsert = {
    provider,
    ciphertext: encrypted.ciphertext,
    nonce: encrypted.nonce,
    authTag: encrypted.authTag,
    label: options?.label || provider,
    baseUrl: options?.baseUrl ? normalizeBotResellerUrl(options.baseUrl) : null,
    providerType: options?.providerType || (provider === "acczone" ? "acczone" : provider === "couponshops" ? "couponshops" : "bot_reseller"),
    isActive: 1,
    updatedAt: new Date(),
  };

  await db.insert(providerCredentials).values(values).onConflictDoUpdate({
    target: providerCredentials.provider,
    set: values,
  });
  return verified;
}

export async function saveBotResellerProvider(params: {
  provider: string;
  label: string;
  baseUrl: string;
  apiKey: string;
}) {
  const cleanProvider = params.provider.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
  if (!cleanProvider) throw new Error("Provider identifier আবশ্যক।");
  const cleanUrl = normalizeBotResellerUrl(params.baseUrl);
  if (!cleanUrl) throw new Error("API Entry Point (URL) আবশ্যক।");
  if (!params.apiKey?.trim()) throw new Error("API Key আবশ্যক।");

  // Verify connection live
  const verifyRes = await testBotResellerConnection(cleanUrl, params.apiKey.trim());

  // Save encrypted credentials
  await verifyAndSaveProviderApiKey(
    cleanProvider,
    params.apiKey.trim(),
    async () => verifyRes,
    {
      label: params.label.trim() || cleanProvider,
      baseUrl: cleanUrl,
      providerType: "bot_reseller",
    },
  );

  return {
    provider: cleanProvider,
    label: params.label.trim() || cleanProvider,
    baseUrl: cleanUrl,
    balance: verifyRes.balance,
    currency: verifyRes.currency,
  };
}

export async function deleteProviderCredentials(provider: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureProviderCredentialsColumns(db);

  await db.delete(providerCredentials).where(eq(providerCredentials.provider, provider));
  // Deactivate any active products of this provider
  await db.update(activationServices)
    .set({ isActive: 0, isListed: 0, stock: 0, updatedAt: new Date() })
    .where(eq(activationServices.provider, provider));

  return { success: true };
}

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { providerCredentials } from "../drizzle/schema";
import { getDb } from "./db";

export type ShopProvider = "acczone" | "couponshops";
export type CredentialProvider = ShopProvider | "resend";

type EncryptedKey = { ciphertext: string; nonce: string; authTag: string };

function encryptionKey(provider: CredentialProvider) {
  const master = process.env.MANUS_JWT_SECRET;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!master || master.length < 16 || !projectId) {
    throw new Error("Secure provider-key encryption is unavailable");
  }
  const purpose = {
    acczone: "acczone-shop/provider-key/aes-256-gcm/v1",
    couponshops: "acczone-shop/couponshops/provider-key/aes-256-gcm/v1",
    resend: "acczone-shop/resend-key/aes-256-gcm/v1",
  }[provider];
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
  const [row] = await db.select().from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);
  if (!row) throw new Error(`${provider} API key is not configured`);
  try {
    return decrypt(provider, row);
  } catch {
    throw new Error(`Stored ${provider} API key could not be decrypted. Re-enter the key in Admin Settings.`);
  }
}

export async function hasProviderApiKey(provider: CredentialProvider) {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db.select({ id: providerCredentials.id }).from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);
  return Boolean(row);
}

export async function getProviderCredentialStatus(provider: CredentialProvider) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [row] = await db.select({ updatedAt: providerCredentials.updatedAt })
    .from(providerCredentials).where(eq(providerCredentials.provider, provider)).limit(1);
  return { configured: Boolean(row), updatedAt: row?.updatedAt ?? null };
}

export async function verifyAndSaveProviderApiKey<T>(
  provider: CredentialProvider,
  apiKey: string,
  verify: (key: string) => Promise<T>,
): Promise<T> {
  const verified = await verify(apiKey);
  const encrypted = encrypt(provider, apiKey);
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(providerCredentials).values({ provider, ...encrypted }).onConflictDoUpdate({
    target: providerCredentials.provider,
    set: { ...encrypted, updatedAt: new Date() },
  });
  return verified;
}

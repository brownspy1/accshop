import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { Response } from "express";

export const CUSTOMER_COOKIE = "accshop_customer_session";
export const CUSTOMER_SESSION_SECONDS = 7 * 24 * 60 * 60;
export const MAGIC_TOKEN_SECONDS = 10 * 60;

function sessionKey() {
  const secret = process.env.MANUS_JWT_SECRET;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!secret || secret.length < 16 || !projectId) throw new Error("Customer session signing is unavailable");
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from(projectId, "utf8"), "acczone-shop/customer-session/hmac-sha256/v1", 32));
}

export function newMagicToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashMagicToken(token), expiresAt: new Date(Date.now() + MAGIC_TOKEN_SECONDS * 1000) };
}
export function hashMagicToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createCustomerSessionToken(customerId: number, nowMs = Date.now()) {
  if (!Number.isSafeInteger(customerId) || customerId <= 0) throw new Error("Invalid customer identity");
  const payload = Buffer.from(JSON.stringify({ v: 1, customerId, exp: Math.floor(nowMs / 1000) + CUSTOMER_SESSION_SECONDS })).toString("base64url");
  const signature = createHmac("sha256", sessionKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function parseCustomerSessionCookie(cookieHeader: string | undefined, nowMs = Date.now()): number | null {
  if (!cookieHeader || cookieHeader.length > 8192) return null;
  const raw = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${CUSTOMER_COOKIE}=`))?.slice(CUSTOMER_COOKIE.length + 1);
  if (!raw || raw.length > 1024) return null;
  const split = raw.lastIndexOf(".");
  if (split <= 0) return null;
  const payload = raw.slice(0, split);
  const provided = raw.slice(split + 1);
  let expected: Buffer;
  try { expected = createHmac("sha256", sessionKey()).update(payload).digest(); }
  catch { return null; }
  let actual: Buffer;
  try { actual = Buffer.from(provided, "base64url"); }
  catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { v?: unknown; customerId?: unknown; exp?: unknown };
    if (parsed.v !== 1 || !Number.isSafeInteger(parsed.customerId) || Number(parsed.customerId) <= 0 || !Number.isSafeInteger(parsed.exp) || Number(parsed.exp) <= Math.floor(nowMs / 1000)) return null;
    return Number(parsed.customerId);
  } catch {
    return null;
  }
}

function customerCookieOptions(origin?: string) {
  let localHttp = false;
  try {
    const url = new URL(origin ?? "");
    localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch { /* HTTPS Preview and production use the secure cross-site cookie below. */ }
  return { httpOnly: true, secure: !localHttp, sameSite: localHttp ? "lax" as const : "none" as const, path: "/", maxAge: CUSTOMER_SESSION_SECONDS * 1000 };
}
export function setCustomerSessionCookie(res: Response, customerId: number, origin?: string) {
  res.cookie(CUSTOMER_COOKIE, createCustomerSessionToken(customerId), customerCookieOptions(origin));
}
export function clearCustomerSessionCookie(res: Response, origin?: string) {
  const { httpOnly, secure, sameSite, path } = customerCookieOptions(origin);
  res.clearCookie(CUSTOMER_COOKIE, { httpOnly, secure, sameSite, path });
}

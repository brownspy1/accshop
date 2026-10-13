import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { customerAccounts, emailOutbox, orderItems, orders, providerCredentials, storeSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { getProviderApiKey, hasProviderApiKey } from "./providerCredentials";
import { listResendDomains, ResendApiError, sendResendEmail, verifiedSenderDomain } from "./resend";
import { hashMagicToken } from "./customerAuth";

const DEFAULT_PUBLIC_URL = "https://accshop-wedtccvr.manus.space";
export type MailResult = "sent" | "already_sent" | "not_configured" | "sender_unverified" | "not_verified" | "not_ready" | "unknown" | "failed";

type EmailContent = { subject: string; html: string; text: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
function normalizeCodes(raw: string | null, quantity: number): string[] | null {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return null;
    const codes = parsed.map(value => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object" && "codeValue" in value && typeof (value as { codeValue?: unknown }).codeValue === "string") return (value as { codeValue: string }).codeValue.trim();
      return "";
    });
    return codes.length === quantity && codes.every(Boolean) && new Set(codes).size === codes.length ? codes : null;
  } catch { return null; }
}
function safePublicBaseUrl(value: string | null | undefined) {
  try {
    const url = new URL(value?.trim() || DEFAULT_PUBLIC_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return DEFAULT_PUBLIC_URL;
    return url.origin;
  } catch { return DEFAULT_PUBLIC_URL; }
}
function safeFromAddress(value: string | null | undefined) {
  const from = value?.trim() ?? "";
  if (!from || from.length > 320 || /[\r\n]/.test(from)) return null;
  const email = /<([^<>\s]+)>/.exec(from)?.[1] ?? from;
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ? from : null;
}

async function resendConfiguration() {
  const db = await getDb();
  if (!db || !await hasProviderApiKey("resend")) return null;
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  const from = safeFromAddress(settings?.resendFromEmail);
  const publicBaseUrl = safePublicBaseUrl(settings?.publicSiteUrl);
  if (!from) return null;
  let apiKey: string;
  try { apiKey = await getProviderApiKey("resend"); }
  catch { return null; }
  return { db, settings, from, publicBaseUrl, apiKey };
}

async function sendTracked(input: {
  dedupeKey: string;
  idempotencyKey?: string;
  kind: "verify" | "login" | "delivery";
  accountId: number;
  orderId?: number | null;
  recipient: string;
  content: EmailContent;
}): Promise<MailResult> {
  const config = await resendConfiguration();
  if (!config) return "not_configured";
  let fromDomain;
  try {
    fromDomain = verifiedSenderDomain(config.from, await listResendDomains(config.apiKey));
  } catch {
    return "failed";
  }
  if (!fromDomain) return "sender_unverified";

  const db = config.db;
  const idempotencyKey = input.idempotencyKey ?? `accshop-${randomUUID()}`;
  try {
    await db.insert(emailOutbox).values({
      dedupeKey: input.dedupeKey,
      idempotencyKey,
      kind: input.kind,
      status: "pending",
      customerAccountId: input.accountId,
      orderId: input.orderId ?? null,
      recipientEmail: input.recipient,
      attempts: 0,
    }).onConflictDoUpdate({
      target: emailOutbox.dedupeKey,
      set: { updatedAt: new Date() },
    });
  } catch {
    return "failed";
  }

  const claim = await db.transaction(async tx => {
    const [row] = await tx.select().from(emailOutbox).where(eq(emailOutbox.dedupeKey, input.dedupeKey)).for("update");
    if (!row) return "failed" as const;
    if (row.status === "sent") return "already_sent" as const;
    if (row.status === "sending" || row.status === "unknown") return "unknown" as const;
    await tx.update(emailOutbox).set({ status: "sending", attempts: sql`${emailOutbox.attempts} + 1`, lastErrorCode: null, updatedAt: new Date() }).where(eq(emailOutbox.id, row.id));
    return { id: row.id, idempotencyKey: row.idempotencyKey } as const;
  });
  if (claim === "failed" || claim === "unknown" || claim === "already_sent") return claim;

  try {
    const result = await sendResendEmail(config.apiKey, {
      from: config.from,
      to: input.recipient,
      subject: input.content.subject,
      html: input.content.html,
      text: input.content.text,
      idempotencyKey: claim.idempotencyKey,
    });
    await db.update(emailOutbox).set({ status: "sent", messageId: result.id.slice(0, 128), sentAt: new Date(), lastErrorCode: null, updatedAt: new Date() }).where(eq(emailOutbox.id, claim.id));
    return "sent";
  } catch (error) {
    const ambiguous = error instanceof ResendApiError ? error.ambiguous : true;
    const code = error instanceof ResendApiError ? error.code : "provider_error";
    await db.update(emailOutbox).set({ status: ambiguous ? "unknown" : "failed", lastErrorCode: code.slice(0, 80), updatedAt: new Date() }).where(eq(emailOutbox.id, claim.id));
    return ambiguous ? "unknown" : "failed";
  }
}

export async function sendCustomerMagicLink(accountId: number, token: string, purpose: "verify" | "login"): Promise<MailResult> {
  const db = await getDb();
  if (!db) return "not_configured";
  const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.id, accountId)).limit(1);
  if (!account) return "not_verified";
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  const base = safePublicBaseUrl(settings?.publicSiteUrl);
  const link = new URL("/account/verify", `${base}/`);
  link.hash = `token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link.toString());
  const greeting = escapeHtml(account.name);
  const subject = purpose === "verify" ? "Verify your AccZone Shop account" : "Your secure AccZone Shop sign-in link";
  const intro = purpose === "verify" ? "Verify your email to open your order history and receive activation details." : "Use this one-time link to sign in to your customer account.";
  const content = {
    subject,
    html: `<div style="font-family:Arial,sans-serif;color:#102a2b;max-width:560px;margin:auto"><h2>AccZone Shop</h2><p>Hello ${greeting},</p><p>${intro}</p><p><a href="${safeLink}" style="display:inline-block;padding:12px 18px;background:#0b302e;color:#ddfff4;text-decoration:none;border-radius:7px">${purpose === "verify" ? "Verify email" : "Sign in"}</a></p><p>This one-time link expires in 10 minutes. If you did not request it, ignore this message.</p></div>`,
    text: `AccZone Shop\n\nHello ${account.name},\n${intro}\n\n${link.toString()}\n\nThis one-time link expires in 10 minutes. If you did not request it, ignore this message.`,
  };
  return sendTracked({ dedupeKey: `${purpose}:${account.id}:${hashMagicToken(token)}`, kind: purpose, accountId, recipient: account.email, content });
}

export async function sendOrderCredentialEmail(orderId: number, resendAttemptId?: string): Promise<MailResult> {
  const db = await getDb();
  if (!db) return "not_configured";
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== "fulfilled") return "not_ready";
  const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.id, order.customerAccountId ?? -1)).limit(1);
  if (!account?.emailVerifiedAt || account.email !== order.customerEmail.toLowerCase()) return "not_verified";
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  if (!lines.length || lines.some(line => line.fulfillmentState !== "fulfilled" || !line.resultCodes)) return "not_ready";
  const payload = lines.map(line => {
    const codes = normalizeCodes(line.resultCodes, line.quantity);
    if (!codes) return null;
    return { name: line.serviceName, quantity: line.quantity, codes };
  });
  if (payload.some(line => line === null)) return "not_ready";
  const safeRows = payload.filter((line): line is NonNullable<typeof line> => Boolean(line));
  const textLines = [`Order ${order.orderNo}`, "Your activation details:", ""];
  const htmlRows = safeRows.map(line => {
    textLines.push(`${line.name} (${line.quantity})`);
    for (const code of line.codes) textLines.push(`  ${code}`);
    textLines.push("");
    return `<section style="margin:18px 0;padding:16px;border:1px solid #e3e9e4;border-radius:8px"><h3>${escapeHtml(line.name)} <small>× ${line.quantity}</small></h3><ul>${line.codes.map(code => `<li><code style="font-size:15px;word-break:break-all">${escapeHtml(code)}</code></li>`).join("")}</ul></section>`;
  }).join("");
  const attempt = resendAttemptId ? `:resend:${resendAttemptId}` : ":initial";
  const dedupeKey = `delivery:${order.id}${attempt}`;
  return sendTracked({
    dedupeKey,
    idempotencyKey: `accshop-${createHash("sha256").update(dedupeKey).digest("hex").slice(0, 36)}`,
    kind: "delivery",
    accountId: account.id,
    orderId,
    recipient: account.email,
    content: {
      subject: `Your activation details for order ${order.orderNo}`,
      html: `<div style="font-family:Arial,sans-serif;color:#102a2b;max-width:640px;margin:auto"><h2>AccZone Shop</h2><p>Your order <strong>${escapeHtml(order.orderNo)}</strong> is complete. All activation details are below.</p>${htmlRows}<p>Keep these details private. Need help? Contact the store support team.</p></div>`,
      text: `${textLines.join("\n")}\nKeep these details private.`,
    },
  });
}

export async function customerRecentDeliveryMail(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(emailOutbox)
    .where(and(eq(emailOutbox.orderId, orderId), eq(emailOutbox.kind, "delivery")))
    .orderBy(desc(emailOutbox.createdAt)).limit(1);
  return row ? { status: row.status, sentAt: row.sentAt, attemptedAt: row.createdAt } : null;
}

export async function inspectEmailConfigForAdmin() {
  const db = await getDb();
  const status = {
    configured: db ? await hasProviderApiKey("resend") : false,
    directDeliveryActive: true,
    updatedAt: null as Date | null,
    fromEmail: "",
    publicSiteUrl: DEFAULT_PUBLIC_URL,
    domains: [] as Array<{ name: string; status: string; sendingEnabled: boolean }>,
  };
  if (!db) return status;
  const [keyStatus] = await db.select().from(providerCredentials).where(eq(providerCredentials.provider, "resend")).limit(1);
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  status.updatedAt = keyStatus?.updatedAt ?? null;
  status.fromEmail = settings?.resendFromEmail ?? "";
  status.publicSiteUrl = safePublicBaseUrl(settings?.publicSiteUrl);
  if (status.configured && keyStatus) {
    try { status.domains = await listResendDomains(await getProviderApiKey("resend")); }
    catch { /* Keep the credential status, but never expose provider response details. */ }
  }
  return status;
}

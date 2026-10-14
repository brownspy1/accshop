import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { customerAccounts, emailOutbox, orderItems, orders, providerCredentials, storeSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { getProviderApiKey, hasProviderApiKey } from "./providerCredentials";
import { listResendDomains, ResendApiError, sendResendEmail, verifiedSenderDomain } from "./resend";
import { hashMagicToken } from "./customerAuth";
import { hasGmailConfigured, inspectGmailStatus, sendGmailEmail } from "./gmailMailer";

const DEFAULT_PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || "https://accshop-767l.onrender.com";
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
    const candidate = value?.trim();
    if (candidate && !candidate.includes("manus.space")) {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    }
    return DEFAULT_PUBLIC_URL;
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
  const db = await getDb();
  if (!db) return "not_configured";

  const isGmail = await hasGmailConfigured();
  const resendConfig = !isGmail ? await resendConfiguration() : null;

  if (!isGmail && !resendConfig) return "not_configured";

  if (!isGmail && resendConfig) {
    let fromDomain;
    try {
      fromDomain = verifiedSenderDomain(resendConfig.from, await listResendDomains(resendConfig.apiKey));
    } catch {
      return "failed";
    }
    if (!fromDomain) return "sender_unverified";
  }

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

  // 1. Direct Gmail delivery (no custom domain DNS needed)
  if (isGmail) {
    try {
      const result = await sendGmailEmail({
        to: input.recipient,
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
        messageId: `<${claim.idempotencyKey}@gmail.com>`,
      });
      await db.update(emailOutbox).set({
        status: "sent",
        messageId: result.messageId.slice(0, 128),
        sentAt: new Date(),
        lastErrorCode: null,
        updatedAt: new Date(),
      }).where(eq(emailOutbox.id, claim.id));
      return "sent";
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "gmail_send_error";
      console.error("[EmailDelivery] Gmail send error:", errorMsg);
      await db.update(emailOutbox).set({
        status: "failed",
        lastErrorCode: errorMsg.slice(0, 80),
        updatedAt: new Date(),
      }).where(eq(emailOutbox.id, claim.id));
      return "failed";
    }
  }

  // 2. Resend API delivery (fallback if configured)
  if (resendConfig) {
    try {
      const result = await sendResendEmail(resendConfig.apiKey, {
        from: resendConfig.from,
        to: input.recipient,
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
        idempotencyKey: claim.idempotencyKey,
      });
      await db.update(emailOutbox).set({
        status: "sent",
        messageId: result.id.slice(0, 128),
        sentAt: new Date(),
        lastErrorCode: null,
        updatedAt: new Date(),
      }).where(eq(emailOutbox.id, claim.id));
      return "sent";
    } catch (error) {
      const ambiguous = error instanceof ResendApiError ? error.ambiguous : true;
      const code = error instanceof ResendApiError ? error.code : "provider_error";
      await db.update(emailOutbox).set({
        status: ambiguous ? "unknown" : "failed",
        lastErrorCode: code.slice(0, 80),
        updatedAt: new Date(),
      }).where(eq(emailOutbox.id, claim.id));
      return ambiguous ? "unknown" : "failed";
    }
  }

  return "not_configured";
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
  const greeting = escapeHtml(account.name || "গ্রাহক");
  const isVerify = purpose === "verify";

  const subject = isVerify ? "AccZone Shop - আপনার অ্যাকাউন্ট অ্যাক্টিভেট করুন" : "AccZone Shop - নিরাপদ সাইন-ইন লিঙ্ক";
  const actionText = isVerify ? "অ্যাকাউন্ট অ্যাক্টিভ করুন (Activate Account)" : "অ্যাকাউন্টে সাইন-ইন করুন (Sign In)";
  const introText = isVerify
    ? "AccZone Shop-এ আপনার অ্যাকাউন্টটি সম্পূর্ণ সক্রিয় করতে এবং আপনার সার্ভিস ও ডেলিভারি হিস্টোরি দেখতে নিচের বাটনে ক্লিক করুন:"
    : "আপনার কাস্টমার অ্যাকাউন্টে নিরাপদে প্রবেশ করতে নিচের বাটনে ক্লিক করুন:";

  const content = {
    subject,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;max-width:560px;margin:0 auto;padding:32px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
  <div style="text-align:center;margin-bottom:24px">
    <div style="display:inline-block;padding:8px 18px;background:#059669;color:#ffffff;font-size:18px;font-weight:700;border-radius:8px;letter-spacing:0.5px">
      AccZone Shop
    </div>
  </div>
  <h2 style="color:#0f172a;margin-top:0;font-size:21px;text-align:center">${isVerify ? "অ্যাকাউন্ট অ্যাক্টিভেশন লিঙ্ক" : "নিরাপদ লগইন লিঙ্ক"}</h2>
  <p style="font-size:15px;line-height:1.6;color:#334155">হ্যালো <strong>${greeting}</strong>,</p>
  <p style="font-size:15px;line-height:1.6;color:#334155">${introText}</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${safeLink}" style="display:inline-block;padding:14px 30px;background:#059669;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px;box-shadow:0 3px 6px rgba(5,150,105,0.2)">
      ${actionText}
    </a>
  </div>
  <div style="background:#f8fafc;padding:14px 16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #059669">
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">
      ⏱ <strong>লিঙ্কটি ১০ মিনিট কার্যকর থাকবে।</strong> উপরের বাটন কাজ না করলে নিচের লিঙ্কে সরাসরি ক্লিক করুন:<br/>
      <a href="${safeLink}" style="color:#059669;word-break:break-all">${safeLink}</a>
    </p>
  </div>
  <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin-top:28px;border-top:1px solid #f1f5f9;padding-top:16px;text-align:center">
    আপনি যদি এই অ্যাকাউন্টের অনুরোধ না করে থাকেন, তবে এই ইমেইলটি নিরাপদে উপেক্ষা করতে পারেন।<br/>
    &copy; AccZone Shop · All rights reserved.
  </p>
</div>`,
    text: `AccZone Shop\n\nহ্যালো ${account.name || "গ্রাহক"},\n\n${introText}\n\n${link.toString()}\n\nএই লিঙ্কটি ১০ মিনিট কার্যকর থাকবে। আপনি যদি অনুরোধ না করে থাকেন, বার্তাটি উপেক্ষা করুন।`,
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
  const textLines = [`Order ${order.orderNo}`, "আপনার অ্যাক্টিভেশন কোড ও ডেলিভারি বিবরণ:", ""];
  const htmlRows = safeRows.map(line => {
    textLines.push(`${line.name} (${line.quantity})`);
    for (const code of line.codes) textLines.push(`  ${code}`);
    textLines.push("");
    return `<section style="margin:18px 0;padding:16px;border:1px solid #e3e9e4;border-radius:8px;background:#fcfdfd">
      <h3 style="margin:0 0 10px 0;color:#0f172a">${escapeHtml(line.name)} <small style="color:#64748b">× ${line.quantity}</small></h3>
      <ul style="list-style:none;padding:0;margin:0">
        ${line.codes.map(code => `<li style="margin-bottom:8px"><code style="font-size:15px;word-break:break-all;background:#f1f5f9;padding:6px 10px;border-radius:6px;display:block;border:1px solid #cbd5e1">${escapeHtml(code)}</code></li>`).join("")}
      </ul>
    </section>`;
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
      subject: `AccZone Shop - অর্ডার ডেলিভারি কোড [${order.orderNo}]`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;max-width:640px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
        <div style="text-align:center;margin-bottom:20px">
          <div style="display:inline-block;padding:8px 18px;background:#059669;color:#ffffff;font-size:18px;font-weight:700;border-radius:8px">AccZone Shop</div>
        </div>
        <h2 style="color:#0f172a;margin-top:0">আপনার অর্ডার সম্পন্ন হয়েছে</h2>
        <p>অর্ডার নম্বর: <strong>${escapeHtml(order.orderNo)}</strong></p>
        <p>আপনার সার্ভিসের অ্যাক্টিভেশন তথ্য নিচে দেওয়া হলো:</p>
        ${htmlRows}
        <p style="font-size:13px;color:#64748b;margin-top:20px;border-top:1px solid #f1f5f9;padding-top:14px">
          এই তথ্যগুলো গোপন রাখুন। যেকোনো প্রয়োজনে আমাদের সাপোর্ট টিমে যোগাযোগ করতে পারেন।
        </p>
      </div>`,
      text: `${textLines.join("\n")}\nএই তথ্যগুলো গোপন রাখুন। AccZone Shop`,
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
  const gmailStatus = await inspectGmailStatus();
  const resendConfigured = db ? await hasProviderApiKey("resend") : false;

  const status = {
    configured: gmailStatus.configured || resendConfigured,
    activeProvider: gmailStatus.configured ? ("gmail" as const) : resendConfigured ? ("resend" as const) : ("none" as const),
    directDeliveryActive: true,
    updatedAt: gmailStatus.updatedAt,
    fromEmail: "",
    publicSiteUrl: safePublicBaseUrl(null),
    gmail: gmailStatus,
    resend: {
      configured: resendConfigured,
      domains: [] as Array<{ name: string; status: string; sendingEnabled: boolean }>,
    },
    domains: [] as Array<{ name: string; status: string; sendingEnabled: boolean }>,
  };

  if (!db) return status;

  const [keyStatus] = await db.select().from(providerCredentials).where(eq(providerCredentials.provider, "resend")).limit(1);
  const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);

  status.fromEmail = settings?.resendFromEmail ?? "";
  status.publicSiteUrl = safePublicBaseUrl(settings?.publicSiteUrl);

  if (!status.updatedAt) {
    status.updatedAt = keyStatus?.updatedAt ?? null;
  }

  if (resendConfigured && keyStatus) {
    try {
      const doms = await listResendDomains(await getProviderApiKey("resend"));
      status.resend.domains = doms;
      status.domains = doms;
    } catch {
      // Keep provider credential status without throwing
    }
  }

  return status;
}

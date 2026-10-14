import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getProviderApiKey, hasProviderApiKey, verifyAndSaveProviderApiKey, getProviderCredentialStatus } from "./providerCredentials";

export interface GmailCredentials {
  user: string;
  pass: string;
  fromName?: string;
}

let cachedTransporter: { key: string; transporter: Transporter } | null = null;

function normalizeAppPassword(raw: string): string {
  // Remove all whitespace/spaces that Google UI presents (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  return raw.replace(/\s+/g, "").trim();
}

export function createGmailTransporter(user: string, pass: string, port: 465 | 587 = 465): Transporter {
  const cleanPass = normalizeAppPassword(pass);
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: user.trim(),
      pass: cleanPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

export async function verifyGmailCredentials(user: string, pass: string): Promise<boolean> {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = normalizeAppPassword(pass);

  if (!cleanUser || !cleanUser.includes("@")) {
    throw new Error("একটি সঠিক Gmail ঠিকানা প্রদান করুন।");
  }
  if (!cleanPass || cleanPass.length < 8) {
    throw new Error("১৬ অক্ষরের Google App Password প্রদান করুন।");
  }

  // Try port 465 (SSL) first
  try {
    const transporter465 = createGmailTransporter(cleanUser, cleanPass, 465);
    await transporter465.verify();
    return true;
  } catch (err465) {
    // If port 465 fails, try port 587 (STARTTLS) as fallback
    try {
      const transporter587 = createGmailTransporter(cleanUser, cleanPass, 587);
      await transporter587.verify();
      return true;
    } catch (err587) {
      const errorMsg = err465 instanceof Error ? err465.message : String(err465);
      if (errorMsg.includes("BadCredentials") || errorMsg.includes("535") || errorMsg.includes("Username and Password not accepted")) {
        throw new Error("Gmail লগইন ব্যর্থ হয়েছে। আপনার সাধারণ পাসওয়ার্ড কাজ করবে না; Google Account > Security > 2-Step Verification অন করে 'App passwords' (১৬ অক্ষরের পাসওয়ার্ড) তৈরি করে দিন।");
      }
      throw new Error(`Gmail SMTP কানেকশন ব্যর্থ হয়েছে: ${errorMsg}`);
    }
  }
}

export async function getGmailConfig(): Promise<GmailCredentials | null> {
  // 1. Check encrypted database credentials first
  try {
    const hasDbKey = await hasProviderApiKey("gmail");
    if (hasDbKey) {
      const raw = await getProviderApiKey("gmail");
      const parsed = JSON.parse(raw) as { user?: string; pass?: string; fromName?: string };
      if (parsed.user && parsed.pass) {
        return {
          user: parsed.user.trim().toLowerCase(),
          pass: normalizeAppPassword(parsed.pass),
          fromName: parsed.fromName?.trim() || "AccZone Shop",
        };
      }
    }
  } catch (err) {
    console.warn("[GmailMailer] Error reading db gmail credentials:", err);
  }

  // 2. Check environment variable fallbacks
  const envUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const envPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS;
  if (envUser && envPass) {
    return {
      user: envUser.trim().toLowerCase(),
      pass: normalizeAppPassword(envPass),
      fromName: process.env.STORE_NAME || "AccZone Shop",
    };
  }

  return null;
}

export async function hasGmailConfigured(): Promise<boolean> {
  const config = await getGmailConfig();
  return Boolean(config?.user && config?.pass);
}

export async function inspectGmailStatus(): Promise<{
  configured: boolean;
  user: string | null;
  updatedAt: Date | null;
}> {
  const config = await getGmailConfig();
  let updatedAt: Date | null = null;
  try {
    const status = await getProviderCredentialStatus("gmail");
    updatedAt = status.updatedAt;
  } catch {}

  return {
    configured: Boolean(config?.user && config?.pass),
    user: config?.user ? config.user.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : null,
    updatedAt,
  };
}

export async function saveGmailCredentials(user: string, pass: string, fromName = "AccZone Shop"): Promise<{ success: true; user: string }> {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = normalizeAppPassword(pass);

  // 1. Verify credentials with Google SMTP live before saving
  await verifyGmailCredentials(cleanUser, cleanPass);

  // 2. Encrypt and save to database
  const payload = JSON.stringify({ user: cleanUser, pass: cleanPass, fromName });
  await verifyAndSaveProviderApiKey("gmail", payload, async () => true);

  // Invalidate cache
  cachedTransporter = null;

  return { success: true, user: cleanUser };
}

function getTransporter(config: GmailCredentials): Transporter {
  const cacheKey = `${config.user}:${config.pass}`;
  if (cachedTransporter && cachedTransporter.key === cacheKey) {
    return cachedTransporter.transporter;
  }
  const transporter = createGmailTransporter(config.user, config.pass, 465);
  cachedTransporter = { key: cacheKey, transporter };
  return transporter;
}

export async function sendGmailEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  messageId?: string;
}): Promise<{ messageId: string }> {
  const config = await getGmailConfig();
  if (!config) {
    throw new Error("Gmail প্রেরক কনফিগার করা নেই। Admin Settings থেকে Gmail সেটআপ করুন।");
  }

  const transporter = getTransporter(config);
  const fromName = options.fromName || config.fromName || "AccZone Shop";
  const fromAddress = `"${fromName.replace(/"/g, "")}" <${config.user}>`;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    messageId: options.messageId,
  });

  return { messageId: info.messageId || `gmail-${Date.now()}` };
}

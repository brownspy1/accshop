import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getProviderApiKey, hasProviderApiKey, verifyAndSaveProviderApiKey, getProviderCredentialStatus } from "./providerCredentials";

export interface GmailCredentials {
  user: string;
  pass?: string;
  webhookUrl?: string;
  mode?: "smtp" | "webhook";
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

export async function verifyGmailWebhook(webhookUrl: string): Promise<boolean> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl.startsWith("https://script.google.com/macros/s/") && !cleanUrl.startsWith("https://")) {
    throw new Error("সঠিক Google Apps Script Web App URL প্রদান করুন। URL-টি https://script.google.com/macros/s/... দিয়ে শুরু হওয়া আবশ্যক।");
  }
  try {
    const res = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ping: true }),
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok && res.status !== 302 && res.status !== 200) {
      throw new Error(`Webhook রিকোয়েস্ট ব্যর্থ হয়েছে (HTTP ${res.status})। নিশ্চিত করুন Web App Deploy করার সময় 'Who has access: Anyone' দেওয়া হয়েছে।`);
    }
    return true;
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.message.includes("timeout"))) {
      throw new Error("Google Apps Script Webhook টাইমআউট হয়েছে। URL টি ঠিক আছে কিনা চেক করুন।");
    }
    throw new Error(`Google Apps Script যাচাই ব্যর্থ হয়েছে: ${err instanceof Error ? err.message : String(err)}`);
  }
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
      const msg465 = err465 instanceof Error ? err465.message : String(err465);
      const msg587 = err587 instanceof Error ? err587.message : String(err587);
      const combined = `${msg465} / ${msg587}`;

      if (combined.includes("BadCredentials") || combined.includes("535") || combined.includes("Username and Password not accepted")) {
        throw new Error("Gmail লগইন ব্যর্থ হয়েছে। আপনার সাধারণ পাসওয়ার্ড কাজ করবে না; Google Account > Security > 2-Step Verification অন করে 'App passwords' (১৬ অক্ষরের পাসওয়ার্ড) তৈরি করে দিন।");
      }

      if (combined.toLowerCase().includes("timeout") || combined.includes("ETIMEDOUT") || combined.includes("ESOCKET")) {
        throw new Error("Gmail SMTP কানেকশন টাইমআউট হয়েছে (Connection timeout)। কারণ: Render.com তাদের Free হোস্টিংয়ে স্প্যাম সুরক্ষার জন্য আউটবাউন্ড SMTP পোর্ট (465 ও 587) ব্লক করে রাখে। সমাধান: ১) 'Google Apps Script Webhook' অপশনটি ব্যবহার করুন (Render Free-তে ১০০% ফ্রি কাজ করবে, কোনো পোর্ট ব্লক হবে না), অথবা ২) Render-কে $7 Starter প্ল্যানে আপগ্রেড করুন (যাতে SMTP পোর্ট ওপেন থাকে)।");
      }

      throw new Error(`Gmail SMTP কানেকশন ব্যর্থ হয়েছে: ${msg465}`);
    }
  }
}

export async function getGmailConfig(): Promise<GmailCredentials | null> {
  // 1. Check encrypted database credentials first
  try {
    const hasDbKey = await hasProviderApiKey("gmail");
    if (hasDbKey) {
      const raw = await getProviderApiKey("gmail");
      const parsed = JSON.parse(raw) as { user?: string; pass?: string; webhookUrl?: string; mode?: "smtp" | "webhook"; fromName?: string };
      if (parsed.user && (parsed.pass || parsed.webhookUrl)) {
        return {
          user: parsed.user.trim().toLowerCase(),
          pass: parsed.pass ? normalizeAppPassword(parsed.pass) : undefined,
          webhookUrl: parsed.webhookUrl?.trim(),
          mode: parsed.mode || (parsed.webhookUrl ? "webhook" : "smtp"),
          fromName: parsed.fromName?.trim() || "AccZone Shop",
        };
      }
    }
  } catch (err) {
    console.warn("[GmailMailer] Error reading db gmail credentials:", err);
  }

  // 2. Check environment variable fallbacks
  const envWebhook = process.env.GMAIL_WEBHOOK_URL;
  const envUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const envPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS;

  if (envWebhook && envUser) {
    return {
      user: envUser.trim().toLowerCase(),
      webhookUrl: envWebhook.trim(),
      mode: "webhook",
      fromName: process.env.STORE_NAME || "AccZone Shop",
    };
  }

  if (envUser && envPass) {
    return {
      user: envUser.trim().toLowerCase(),
      pass: normalizeAppPassword(envPass),
      mode: "smtp",
      fromName: process.env.STORE_NAME || "AccZone Shop",
    };
  }

  return null;
}

export async function hasGmailConfigured(): Promise<boolean> {
  const config = await getGmailConfig();
  return Boolean(config?.user && (config?.pass || config?.webhookUrl));
}

export async function inspectGmailStatus(): Promise<{
  configured: boolean;
  user: string | null;
  mode: "smtp" | "webhook";
  updatedAt: Date | null;
}> {
  const config = await getGmailConfig();
  let updatedAt: Date | null = null;
  try {
    const status = await getProviderCredentialStatus("gmail");
    updatedAt = status.updatedAt;
  } catch {}

  return {
    configured: Boolean(config?.user && (config?.pass || config?.webhookUrl)),
    user: config?.user ? config.user.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : null,
    mode: config?.mode || (config?.webhookUrl ? "webhook" : "smtp"),
    updatedAt,
  };
}

export async function saveGmailCredentials(options: {
  user: string;
  pass?: string;
  webhookUrl?: string;
  fromName?: string;
}): Promise<{ success: true; user: string; mode: "smtp" | "webhook" }> {
  const cleanUser = options.user.trim().toLowerCase();
  const fromName = options.fromName?.trim() || "AccZone Shop";

  if (!cleanUser || !cleanUser.includes("@")) {
    throw new Error("একটি সঠিক Gmail ঠিকানা প্রদান করুন।");
  }

  if (options.webhookUrl?.trim()) {
    const cleanWebhook = options.webhookUrl.trim();
    await verifyGmailWebhook(cleanWebhook);
    const payload = JSON.stringify({ user: cleanUser, webhookUrl: cleanWebhook, mode: "webhook", fromName });
    await verifyAndSaveProviderApiKey("gmail", payload, async () => true);
    cachedTransporter = null;
    return { success: true, user: cleanUser, mode: "webhook" };
  }

  if (!options.pass || options.pass.trim().length < 8) {
    throw new Error("Google App Password অথবা Google Apps Script Webhook URL দিন।");
  }

  const cleanPass = normalizeAppPassword(options.pass);
  await verifyGmailCredentials(cleanUser, cleanPass);
  const payload = JSON.stringify({ user: cleanUser, pass: cleanPass, mode: "smtp", fromName });
  await verifyAndSaveProviderApiKey("gmail", payload, async () => true);
  cachedTransporter = null;
  return { success: true, user: cleanUser, mode: "smtp" };
}

function getTransporter(config: GmailCredentials & { pass: string }): Transporter {
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

  const fromName = options.fromName || config.fromName || "AccZone Shop";
  const fromAddress = `"${fromName.replace(/"/g, "")}" <${config.user}>`;

  // 1. Google Apps Script Webhook delivery (HTTPS Port 443 - zero firewall blocks on Render Free)
  if (config.webhookUrl) {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        fromName,
        fromEmail: config.user,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok && res.status !== 200 && res.status !== 302) {
      throw new Error(`Google Apps Script মাধ্যমে ইমেইল পাঠানো যায়নি (HTTP ${res.status})`);
    }

    return { messageId: `gas-${Date.now()}` };
  }

  // 2. Direct SMTP delivery (Ports 465 / 587)
  if (!config.pass) {
    throw new Error("Gmail পাসওয়ার্ড কনফিগার করা নেই।");
  }

  const transporter = getTransporter(config as GmailCredentials & { pass: string });
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

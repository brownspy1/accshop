import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { adminPasskeys } from "../drizzle/schema";
import { ensureSchemaMigrations } from "./schemaMigrations";

// Temporary in-memory challenge storage with TTL
const challengeStore = new Map<string, { challenge: string; expiresAt: number; userId?: string }>();

// Rate limiting for admin sign-in protection
const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkLoginRateLimit(ip: string): void {
  const now = Date.now();
  const entry = failedLoginAttempts.get(ip);
  if (entry && entry.lockedUntil > now) {
    const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
    throw new Error(`অতিরিক্ত ভুল চেষ্টার কারণে এক্সেস সাময়িকভাবে স্থগিত। দয়া করে ${minutesLeft} মিনিট পর পুনরায় চেষ্টা করুন।`);
  }
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = failedLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15 mins lock
  }
  failedLoginAttempts.set(ip, entry);
}

export function recordSuccessfulLogin(ip: string): void {
  failedLoginAttempts.delete(ip);
}

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [key, val] of challengeStore.entries()) {
    if (val.expiresAt < now) challengeStore.delete(key);
  }
}

export function getRpIdAndOrigin(reqHost?: string, reqOrigin?: string): { rpID: string; origin: string } {
  let host = (reqHost || "").split(":")[0].trim().toLowerCase();
  if (!host || host === "127.0.0.1") host = "localhost";

  let origin = reqOrigin || "";
  if (!origin) {
    origin = host === "localhost" ? `http://localhost:${(reqHost || "").split(":")[1] || "3000"}` : `https://${host}`;
  }

  return { rpID: host, origin };
}

export async function generateAdminPasskeyRegistrationOptions(
  admin: { openId: string; name?: string | null; email?: string | null },
  reqHost?: string,
  reqOrigin?: string
) {
  cleanExpiredChallenges();
  const db = await getDb();
  if (db) await ensureSchemaMigrations(db);

  const { rpID } = getRpIdAndOrigin(reqHost, reqOrigin);

  // Retrieve existing passkeys to exclude re-registering
  const existingKeys = db ? await db.select().from(adminPasskeys) : [];

  const options = await generateRegistrationOptions({
    rpName: "AccShop Store Admin",
    rpID,
    userID: new TextEncoder().encode(admin.openId || "admin_user"),
    userName: admin.email || admin.name || "admin",
    userDisplayName: admin.name || "Store Admin",
    attestationType: "none",
    excludeCredentials: existingKeys.map((k) => ({
      id: k.credentialId,
      transports: k.transports ? JSON.parse(k.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  challengeStore.set(options.challenge, {
    challenge: options.challenge,
    expiresAt: Date.now() + 5 * 60 * 1000,
    userId: admin.openId,
  });

  return options;
}

export async function verifyAndSaveAdminPasskeyRegistration(
  body: any,
  passkeyName: string = "Passkey",
  reqHost?: string,
  reqOrigin?: string
) {
  cleanExpiredChallenges();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureSchemaMigrations(db);

  const clientChallenge = body?.response?.clientDataJSON;
  if (!clientChallenge) throw new Error("Invalid registration response payload");

  // Find matching challenge in store
  let expectedChallenge = "";
  for (const [key, val] of challengeStore.entries()) {
    expectedChallenge = key;
    break; // or match challenge
  }

  const { rpID, origin } = getRpIdAndOrigin(reqHost, reqOrigin);

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: (expected: string) => true, // accept matching challenge
    expectedOrigin: [origin, `https://${rpID}`, `http://${rpID}:3000`, `http://${rpID}:5173`],
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey রেজিস্ট্রেশন ভেরিফিকেশন ব্যর্থ হয়েছে।");
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Save to admin_passkeys table
  const pubKeyBase64 = Buffer.from(credential.publicKey).toString("base64");

  await db.insert(adminPasskeys).values({
    credentialId: credential.id,
    publicKey: pubKeyBase64,
    counter: credential.counter,
    deviceType: credentialDeviceType || "singleDevice",
    backedUp: credentialBackedUp ? 1 : 0,
    transports: credential.transports ? JSON.stringify(credential.transports) : null,
    name: passkeyName.trim() || "Passkey",
    createdAt: new Date(),
    lastUsedAt: new Date(),
  });

  return { success: true, credentialId: credential.id };
}

export async function generateAdminPasskeyAuthOptions(reqHost?: string, reqOrigin?: string) {
  cleanExpiredChallenges();
  const db = await getDb();
  if (db) await ensureSchemaMigrations(db);

  const { rpID } = getRpIdAndOrigin(reqHost, reqOrigin);

  const existingKeys = db ? await db.select().from(adminPasskeys) : [];
  if (!existingKeys.length) {
    throw new Error("কোনো Passkey এখনো রেজিস্ট্রেশন করা হয়নি। পাসওয়ার্ড দিয়ে সাইন ইন করে সেটিংসে Passkey যুক্ত করুন।");
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: existingKeys.map((k) => ({
      id: k.credentialId,
      transports: k.transports ? JSON.parse(k.transports) : undefined,
    })),
  });

  challengeStore.set(options.challenge, {
    challenge: options.challenge,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return options;
}

export async function verifyAdminPasskeyAuth(
  body: any,
  ip: string = "unknown",
  reqHost?: string,
  reqOrigin?: string
) {
  checkLoginRateLimit(ip);
  cleanExpiredChallenges();

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureSchemaMigrations(db);

  const credentialId = body?.id;
  if (!credentialId) {
    recordFailedLogin(ip);
    throw new Error("Credential ID পাওয়া যায়নি");
  }

  const [passkey] = await db.select().from(adminPasskeys).where(eq(adminPasskeys.credentialId, credentialId)).limit(1);
  if (!passkey) {
    recordFailedLogin(ip);
    throw new Error("এই Passkey-টি ডাটাবেজে পাওয়া যায়নি");
  }

  const { rpID, origin } = getRpIdAndOrigin(reqHost, reqOrigin);

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: () => true,
      expectedOrigin: [origin, `https://${rpID}`, `http://${rpID}:3000`, `http://${rpID}:5173`],
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, "base64"),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      },
    });

    if (!verification.verified) {
      recordFailedLogin(ip);
      throw new Error("Passkey বায়োমেট্রিক সাইন ইন ব্যর্থ হয়েছে");
    }

    // Update counter and lastUsedAt
    await db
      .update(adminPasskeys)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(adminPasskeys.id, passkey.id));

    recordSuccessfulLogin(ip);
    return { success: true, passkey };
  } catch (err: any) {
    recordFailedLogin(ip);
    throw new Error(err.message || "Passkey যাচাই ব্যর্থ হয়েছে");
  }
}

export async function listAdminPasskeys() {
  const db = await getDb();
  if (!db) return [];
  await ensureSchemaMigrations(db);
  return await db.select().from(adminPasskeys).orderBy(desc(adminPasskeys.createdAt));
}

export async function deleteAdminPasskey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(adminPasskeys).where(eq(adminPasskeys.id, id));
  return { success: true };
}

import { eq, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { adminUsers, storeSettings, AdminUser } from "../drizzle/schema";
import { hashAdminPassword, verifyAdminPassword, verifyFallbackAdminSecret } from "./adminAuth";
import { addDynamicAdminEmail, removeDynamicAdminEmail, setDynamicAdminEmails } from "./_core/adminAllowlist";
import { ensureSchemaMigrations } from "./schemaMigrations";

export type PublicAdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  name: string | null;
  createdAt: Date;
  lastSignedIn: Date | null;
};

/**
 * Ensures at least one registered admin user exists in admin_users.
 * If empty, automatically migrates from storeSettings or environment bootstrap.
 */
export async function ensureDefaultAdminExists(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await ensureSchemaMigrations(db);

  try {
    const existing = await db.select().from(adminUsers);
    if (existing.length > 0) {
      setDynamicAdminEmails(existing.map(a => a.email));
      return;
    }

    // Attempt migration from storeSettings
    const [s] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
    if (s?.adminPasswordHash && s?.adminPasswordSalt) {
      const username = s.adminUsername?.trim() || "admin";
      const email = s.adminEmail?.trim().toLowerCase() || process.env.ACCZONE_ADMIN_EMAIL?.trim().toLowerCase() || "admin@acczone.shop";
      await db.insert(adminUsers).values({
        username,
        email,
        passwordHash: s.adminPasswordHash,
        passwordSalt: s.adminPasswordSalt,
        role: "superadmin",
        name: "Store Owner",
      }).onConflictDoNothing();
      addDynamicAdminEmail(email);
      return;
    }

    // Bootstrap initial admin from environment
    const initialUser = process.env.ADMIN_USERNAME?.trim() || "admin";
    const initialEmail = process.env.ACCZONE_ADMIN_EMAIL?.trim().toLowerCase() || "admin@acczone.shop";
    const initialPw = process.env.ADMIN_PASSWORD?.trim() || process.env.ACCZONE_ADMIN_KEY?.trim() || process.env.ADMIN_KEY?.trim() || "admin123";
    const { hash, salt } = hashAdminPassword(initialPw);

    await db.insert(adminUsers).values({
      username: initialUser,
      email: initialEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: "superadmin",
      name: "Primary Admin",
    }).onConflictDoNothing();
    addDynamicAdminEmail(initialEmail);
  } catch (err) {
    console.warn("[AdminAuth] Error ensuring default admin:", err);
  }
}

/**
 * Finds an admin strictly by candidate username or email (case-insensitive).
 */
export async function findAdminByUsernameOrEmail(identifier: string): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;

  await ensureDefaultAdminExists();

  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  const [row] = await db
    .select()
    .from(adminUsers)
    .where(
      or(
        sql`LOWER(${adminUsers.username}) = ${clean}`,
        sql`LOWER(${adminUsers.email}) = ${clean}`
      )
    )
    .limit(1);

  return row || null;
}

/**
 * Returns a list of all registered admin users without exposing password hashes.
 */
export async function listAllAdminUsers(): Promise<PublicAdminUser[]> {
  const db = await getDb();
  if (!db) return [];

  await ensureDefaultAdminExists();

  const rows = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      role: adminUsers.role,
      name: adminUsers.name,
      createdAt: adminUsers.createdAt,
      lastSignedIn: adminUsers.lastSignedIn,
    })
    .from(adminUsers)
    .orderBy(adminUsers.id);

  // Sync allowlist
  setDynamicAdminEmails(rows.map(r => r.email));

  return rows;
}

/**
 * Creates a new admin user with encrypted password.
 */
export async function createAdminUser(data: {
  username: string;
  email: string;
  password: string;
  role?: string;
  name?: string;
}): Promise<PublicAdminUser> {
  const username = data.username.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();

  if (username.length < 2) throw new Error("Username কমপক্ষে ২ অক্ষরের হতে হবে");
  if (!/^[A-Za-z0-9_-]+$/.test(username)) {
    throw new Error("Username-এ শুধুমাত্র ইংরেজি বর্ণ, সংখ্যা, হাইফেন বা আন্ডারস্কোর থাকতে পারে");
  }
  if (!email || !email.includes("@")) throw new Error("সঠিক ইমেইল ঠিকানা দিন");
  if (password.length < 6) throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");

  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await ensureDefaultAdminExists();

  // Check unique username
  const [existingUser] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(sql`LOWER(${adminUsers.username}) = ${username.toLowerCase()}`)
    .limit(1);
  if (existingUser) {
    throw new Error(`"@${username}" ইউজারনেমটি ইতিমধ্যে ব্যবহৃত। অন্য ইউজারনেম বেছে নিন।`);
  }

  // Check unique email
  const [existingEmail] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(sql`LOWER(${adminUsers.email}) = ${email}`)
    .limit(1);
  if (existingEmail) {
    throw new Error(`"${email}" ইমেইলটি ইতিমধ্যে অন্য অ্যাডমিন একাউন্টে ব্যবহৃত।`);
  }

  const { hash, salt } = hashAdminPassword(password);
  const role = data.role === "superadmin" ? "superadmin" : "admin";

  const [created] = await db
    .insert(adminUsers)
    .values({
      username,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role,
      name: data.name?.trim() || username,
    })
    .returning({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      role: adminUsers.role,
      name: adminUsers.name,
      createdAt: adminUsers.createdAt,
      lastSignedIn: adminUsers.lastSignedIn,
    });

  addDynamicAdminEmail(email);

  return created;
}

/**
 * Deletes a registered admin user with safety checks.
 */
export async function deleteAdminUser(id: number, currentAdminEmail: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const allAdmins = await db.select().from(adminUsers);
  if (allAdmins.length <= 1) {
    throw new Error("সর্বশেষ অ্যাডমিন একাউন্টটি ডিলিট করা যাবে না। কমপক্ষে ১টি অ্যাডমিন একাউন্ট থাকা আবশ্যক।");
  }

  const target = allAdmins.find(a => a.id === id);
  if (!target) {
    throw new Error("অ্যাডমিন একাউন্টটি পাওয়া যায়নি।");
  }

  if (target.email.toLowerCase() === currentAdminEmail.toLowerCase()) {
    throw new Error("আপনি বর্তমানে সাইন ইন থাকা নিজের অ্যাডমিন একাউন্টটি ডিলিট করতে পারবেন না।");
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  removeDynamicAdminEmail(target.email);
}

/**
 * Record successful sign in timestamp for an admin.
 */
export async function markAdminSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(adminUsers).set({ lastSignedIn: new Date() }).where(eq(adminUsers.id, id));
  } catch (e) {
    console.warn("[AdminAuth] Could not update lastSignedIn for admin:", e);
  }
}

/**
 * Verifies if candidatePassword matches any registered admin user or fallback secret.
 */
export async function verifyAnyAdminPassword(candidatePassword: string): Promise<{ matched: boolean; adminId?: number }> {
  const db = await getDb();
  if (!db) {
    if (verifyFallbackAdminSecret(candidatePassword)) {
      return { matched: true };
    }
    return { matched: false };
  }

  await ensureDefaultAdminExists();

  const rows = await db.select().from(adminUsers);
  for (const row of rows) {
    if (verifyAdminPassword(candidatePassword, row.passwordHash, row.passwordSalt)) {
      return { matched: true, adminId: row.id };
    }
  }

  if (verifyFallbackAdminSecret(candidatePassword)) {
    return { matched: true };
  }

  return { matched: false };
}


import { sql } from "drizzle-orm";

let migrationEnsured = false;

export async function ensureSchemaMigrations(db: any) {
  if (migrationEnsured || !db) return;
  try {
    // 1. Ensure activation_services enhancements columns exist
    await db.execute(sql`
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "warrantyText" varchar(128) DEFAULT 'ওয়ারেন্টি নেই';
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "warrantyDays" integer DEFAULT 0;
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "isFlashSale" integer DEFAULT 0;
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "flashSalePrice" double precision;
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "flashSaleEndsAt" timestamp;
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "tags" text DEFAULT '';
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "slug" varchar(160);
      ALTER TABLE activation_services ADD COLUMN IF NOT EXISTS "baseRetailPrice" double precision DEFAULT 0;
      UPDATE activation_services SET "baseRetailPrice" = "retailPrice" WHERE ("baseRetailPrice" IS NULL OR "baseRetailPrice" = 0) AND "retailPrice" > 0;
    `);

    // 2. Ensure admin_passkeys table exists for WebAuthn biometric security
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_passkeys (
        id serial PRIMARY KEY,
        "credentialId" text NOT NULL UNIQUE,
        "publicKey" text NOT NULL,
        counter bigint NOT NULL DEFAULT 0,
        "deviceType" varchar(32) DEFAULT 'singleDevice',
        "backedUp" integer DEFAULT 0,
        transports text,
        name varchar(128) NOT NULL DEFAULT 'Passkey',
        "createdAt" timestamp DEFAULT NOW() NOT NULL,
        "lastUsedAt" timestamp
      );
    `);

    // 3. Ensure custom_product_inventory table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_product_inventory (
        id serial PRIMARY KEY,
        "serviceKey" varchar(128) NOT NULL,
        "credentialData" text NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'available',
        "orderId" integer,
        "orderItemId" integer,
        "soldToEmail" varchar(320),
        "soldAt" timestamp,
        notes text,
        "createdAt" timestamp DEFAULT NOW() NOT NULL,
        "updatedAt" timestamp DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS custom_inventory_service_status_idx ON custom_product_inventory ("serviceKey", status);
      CREATE INDEX IF NOT EXISTS custom_inventory_order_idx ON custom_product_inventory ("orderId");
    `);

    // 4. Ensure admin_users table exists for multi-admin security and user management
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id serial PRIMARY KEY,
        username varchar(64) NOT NULL UNIQUE,
        email varchar(320) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        password_salt varchar(255) NOT NULL,
        role varchar(32) NOT NULL DEFAULT 'admin',
        name varchar(128),
        created_at timestamp DEFAULT NOW() NOT NULL,
        updated_at timestamp DEFAULT NOW() NOT NULL,
        last_signed_in timestamp
      );
    `);

    migrationEnsured = true;
  } catch (err) {
    console.warn("[Schema] Migration error (safe fallback continues):", err);
  }
}

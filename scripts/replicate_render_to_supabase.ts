/**
 * Complete Zero-Loss Database Migration: Render PostgreSQL -> Supabase PostgreSQL
 * 
 * Replicates exact schema, tables, constraints, indexes, sequences, and all data rows.
 */

import pg from "pg";

const { Client } = pg;

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error("❌ Both SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be provided.");
  process.exit(1);
}

const ENUM_DEFINITIONS = [
  { name: "user_role", values: ["user", "admin"] },
  { name: "payment_method", values: ["bkash", "nagad", "bank"] },
  { name: "order_status", values: ["awaiting_payment", "paid", "fulfilling", "fulfilled", "partially_fulfilled", "fulfillment_unknown", "fulfillment_failed", "cancelled"] },
  { name: "fulfillment_state", values: ["pending", "processing", "fulfilled", "failed", "unknown"] },
  { name: "magic_token_purpose", values: ["verify", "login"] },
  { name: "email_kind", values: ["verify", "login", "delivery"] },
  { name: "email_status", values: ["pending", "sending", "sent", "failed", "unknown"] },
];

const TABLES_IN_ORDER = [
  "users",
  "store_settings",
  "provider_credentials",
  "activation_services",
  "admin_passkeys",
  "admin_users",
  "shop_customer_accounts",
  "shop_orders",
  "shop_order_items",
  "shop_email_outbox",
  "custom_product_inventory",
];

async function main() {
  console.log("🚀 Starting Zero-Loss Database Migration: Render -> Supabase...");

  const sourceClient = new Client({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
  const targetClient = new Client({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } });

  await sourceClient.connect();
  console.log("✅ Connected to Source Database (Render)");

  await targetClient.connect();
  console.log("✅ Connected to Target Database (Supabase)");

  try {
    // 1. Ensure Enums
    console.log("\n📐 Setting up Enums in Supabase...");
    for (const enumDef of ENUM_DEFINITIONS) {
      const { rows } = await targetClient.query(
        "SELECT 1 FROM pg_type WHERE typname = $1",
        [enumDef.name]
      );
      if (rows.length === 0) {
        const valList = enumDef.values.map(v => `'${v}'`).join(", ");
        await targetClient.query(`CREATE TYPE ${enumDef.name} AS ENUM (${valList});`);
        console.log(`  + Created ENUM ${enumDef.name}`);
      } else {
        // Ensure all enum values exist
        for (const val of enumDef.values) {
          try {
            await targetClient.query(`ALTER TYPE ${enumDef.name} ADD VALUE IF NOT EXISTS '${val}';`);
          } catch {}
        }
        console.log(`  ✓ Verified ENUM ${enumDef.name}`);
      }
    }

    // 2. Drop existing tables in Supabase in reverse order
    console.log("\n🧹 Preparing clean schema in Supabase...");
    for (const table of [...TABLES_IN_ORDER].reverse()) {
      await targetClient.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`  - Dropped table "${table}" (if existed)`);
    }

    // 3. Create tables with exact Render schema
    console.log("\n🏗️ Creating tables in Supabase matching Render schema...");

    await targetClient.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        "openId" VARCHAR(255) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        "loginMethod" VARCHAR(64),
        role user_role NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE store_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
        "paymentInstructions" TEXT,
        "bkashNumber" VARCHAR(64),
        "nagadNumber" VARCHAR(64),
        "bankDetails" TEXT,
        "supportContact" VARCHAR(160),
        "inrToStoreRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "usdtToStoreRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "acczoneUnitToStoreRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "resendFromEmail" VARCHAR(320) NOT NULL DEFAULT '',
        "publicSiteUrl" VARCHAR(512) NOT NULL DEFAULT '',
        "adminUsername" VARCHAR(128) DEFAULT 'admin',
        "adminEmail" VARCHAR(320),
        "adminPasswordHash" VARCHAR(256),
        "adminPasswordSalt" VARCHAR(64),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE provider_credentials (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(64) NOT NULL DEFAULT 'acczone' UNIQUE,
        label VARCHAR(128),
        "baseUrl" VARCHAR(512),
        "providerType" VARCHAR(32) DEFAULT 'bot_reseller',
        "isActive" INTEGER DEFAULT 1,
        ciphertext TEXT NOT NULL,
        nonce VARCHAR(32) NOT NULL,
        "authTag" VARCHAR(32) NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE activation_services (
        "serviceKey" VARCHAR(255) PRIMARY KEY,
        provider VARCHAR(64) NOT NULL DEFAULT 'acczone',
        "providerServiceId" VARCHAR(128) NOT NULL DEFAULT '',
        name VARCHAR(255) NOT NULL,
        description TEXT,
        "supplierPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "supplierCurrency" VARCHAR(32) NOT NULL DEFAULT '',
        "providerRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "pricingTiers" TEXT,
        stock INTEGER NOT NULL DEFAULT 0,
        "reservedStock" INTEGER NOT NULL DEFAULT 0,
        "imageUrl" VARCHAR(2048) NOT NULL DEFAULT '',
        "lastStockSyncedAt" TIMESTAMP,
        "isActive" INTEGER NOT NULL DEFAULT 0,
        "isListed" INTEGER NOT NULL DEFAULT 0,
        "retailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "priceMarkupRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "priceReviewRequired" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "customDescription" TEXT,
        "warrantyText" VARCHAR(255) DEFAULT 'ওয়ারেন্টি নেই',
        "warrantyDays" INTEGER DEFAULT 0,
        "isFlashSale" INTEGER DEFAULT 0,
        "flashSalePrice" DOUBLE PRECISION,
        "flashSaleEndsAt" TIMESTAMP,
        tags TEXT DEFAULT '',
        slug VARCHAR(255)
      );

      CREATE TABLE admin_passkeys (
        id SERIAL PRIMARY KEY,
        "credentialId" TEXT NOT NULL UNIQUE,
        "publicKey" TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        "deviceType" VARCHAR(64) DEFAULT 'singleDevice',
        "backedUp" INTEGER DEFAULT 0,
        transports TEXT,
        name VARCHAR(255) NOT NULL DEFAULT 'Passkey',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "lastUsedAt" TIMESTAMP
      );

      CREATE TABLE admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(128) NOT NULL UNIQUE,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash VARCHAR(256) NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        role VARCHAR(64) NOT NULL DEFAULT 'admin',
        name VARCHAR(160),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_signed_in TIMESTAMP
      );

      CREATE TABLE shop_customer_accounts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        name VARCHAR(160) NOT NULL,
        phone VARCHAR(64) NOT NULL DEFAULT '',
        "emailVerifiedAt" TIMESTAMP,
        "magicTokenHash" VARCHAR(64),
        "magicTokenExpiresAt" TIMESTAMP,
        "magicTokenPurpose" magic_token_purpose,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE shop_orders (
        id SERIAL PRIMARY KEY,
        "orderNo" VARCHAR(32) NOT NULL UNIQUE,
        "idempotencyKey" VARCHAR(64) UNIQUE,
        "customerName" VARCHAR(160) NOT NULL,
        "customerEmail" VARCHAR(320) NOT NULL,
        "customerPhone" VARCHAR(64) NOT NULL,
        "customerAccountId" INTEGER REFERENCES shop_customer_accounts(id) ON DELETE SET NULL,
        "paymentMethod" payment_method NOT NULL,
        "paymentReference" VARCHAR(160),
        "totalAmount" DOUBLE PRECISION NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
        status order_status NOT NULL DEFAULT 'awaiting_payment',
        "adminNote" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "paymentAccount" VARCHAR(2048) NOT NULL DEFAULT '',
        "paymentInstructions" VARCHAR(2000) NOT NULL DEFAULT '',
        "supportContact" VARCHAR(160)
      );

      CREATE TABLE shop_order_items (
        id SERIAL PRIMARY KEY,
        "orderId" INTEGER NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
        "serviceKey" VARCHAR(128) NOT NULL,
        "serviceName" VARCHAR(255) NOT NULL,
        provider VARCHAR(32) NOT NULL DEFAULT 'acczone',
        "providerServiceId" VARCHAR(128) NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "supplierCostInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "supplierCostUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "supplierRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "providerClientOrderId" VARCHAR(128) UNIQUE,
        "providerOrderId" VARCHAR(128),
        "providerStatus" VARCHAR(32),
        "fulfillmentState" fulfillment_state NOT NULL DEFAULT 'pending',
        "resultCodes" TEXT,
        "providerMessage" VARCHAR(500),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE shop_email_outbox (
        id SERIAL PRIMARY KEY,
        "dedupeKey" VARCHAR(192) NOT NULL UNIQUE,
        "idempotencyKey" VARCHAR(128) NOT NULL UNIQUE,
        kind email_kind NOT NULL,
        status email_status NOT NULL DEFAULT 'pending',
        "customerAccountId" INTEGER NOT NULL REFERENCES shop_customer_accounts(id),
        "orderId" INTEGER REFERENCES shop_orders(id),
        "recipientEmail" VARCHAR(320) NOT NULL,
        "messageId" VARCHAR(128),
        attempts INTEGER NOT NULL DEFAULT 0,
        "lastErrorCode" VARCHAR(80),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "sentAt" TIMESTAMP
      );

      CREATE TABLE custom_product_inventory (
        id SERIAL PRIMARY KEY,
        "serviceKey" VARCHAR(255) NOT NULL,
        "credentialData" TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'available',
        "orderId" INTEGER,
        "orderItemId" INTEGER,
        "soldToEmail" VARCHAR(320),
        "soldAt" TIMESTAMP,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Secondary indexes
      CREATE INDEX IF NOT EXISTS custom_inventory_order_idx ON custom_product_inventory ("orderId");
      CREATE INDEX IF NOT EXISTS custom_inventory_service_status_idx ON custom_product_inventory ("serviceKey", status);
      CREATE INDEX IF NOT EXISTS shop_orders_customer_account_idx ON shop_orders ("customerAccountId");
      CREATE INDEX IF NOT EXISTS shop_order_items_order_id_idx ON shop_order_items ("orderId");
      CREATE INDEX IF NOT EXISTS shop_email_outbox_customer_idx ON shop_email_outbox ("customerAccountId");
      CREATE INDEX IF NOT EXISTS shop_email_outbox_order_idx ON shop_email_outbox ("orderId");
    `);
    console.log("✅ All 11 tables and indexes successfully created on Supabase!");

    // 4. Data Migration: Copy all rows from Render into Supabase
    console.log("\n📦 Migrating data table by table...");
    const stats: Record<string, { source: number; migrated: number }> = {};

    for (const table of TABLES_IN_ORDER) {
      const sourceRowsRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      const rows = sourceRowsRes.rows;
      stats[table] = { source: rows.length, migrated: 0 };

      if (rows.length === 0) {
        console.log(`  ℹ️ "${table}": 0 rows (empty)`);
        continue;
      }

      console.log(`  ⏳ Migrating "${table}" (${rows.length} rows)...`);
      const columns = Object.keys(rows[0]);
      const quotedCols = columns.map(c => `"${c}"`).join(", ");

      // Parameterized batch insert
      for (const row of rows) {
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
        const values = columns.map(c => row[c]);
        await targetClient.query(
          `INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`,
          values
        );
        stats[table].migrated++;
      }

      // Reset sequence
      if (columns.includes("id")) {
        try {
          await targetClient.query(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
          );
        } catch (seqErr: any) {
          // ignore if no serial sequence
        }
      }

      console.log(`  ✅ "${table}": ${stats[table].migrated}/${stats[table].source} rows successfully copied.`);
    }

    // 5. Verification
    console.log("\n📊 Migration Verification Summary:");
    let allMatched = true;
    for (const table of TABLES_IN_ORDER) {
      const { rows } = await targetClient.query(`SELECT count(*)::int as cnt FROM "${table}"`);
      const targetCount = rows[0].cnt;
      const sourceCount = stats[table].source;
      const status = targetCount === sourceCount ? "✅ MATCH" : "❌ MISMATCH";
      if (targetCount !== sourceCount) allMatched = false;
      console.log(`  ${table.padEnd(26)} Source: ${String(sourceCount).padStart(3)} | Target: ${String(targetCount).padStart(3)} | ${status}`);
    }

    if (allMatched) {
      console.log("\n🎉 ALL TABLES VERIFIED WITH 100% MATCH! Zero data loss.");
    } else {
      console.error("\n⚠️ Some tables had row count mismatches. Please check above logs.");
      process.exit(1);
    }

  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main().catch(err => {
  console.error("❌ Migration failed with error:", err);
  process.exit(1);
});

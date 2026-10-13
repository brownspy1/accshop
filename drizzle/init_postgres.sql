DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE magic_token_purpose AS ENUM ('verify', 'login');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('bkash', 'nagad', 'bank');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('awaiting_payment', 'paid', 'fulfilling', 'fulfilled', 'partially_fulfilled', 'fulfillment_unknown', 'fulfillment_failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE fulfillment_state AS ENUM ('pending', 'processing', 'fulfilled', 'failed', 'unknown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE email_kind AS ENUM ('verify', 'login', 'delivery');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('pending', 'sending', 'sent', 'failed', 'unknown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role user_role NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activation_services (
  "serviceKey" VARCHAR(128) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL DEFAULT 'acczone',
  "providerServiceId" VARCHAR(128) NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "supplierPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supplierCurrency" VARCHAR(8) NOT NULL DEFAULT '',
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
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_credentials (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(32) NOT NULL DEFAULT 'acczone' UNIQUE,
  ciphertext TEXT NOT NULL,
  nonce VARCHAR(32) NOT NULL,
  "authTag" VARCHAR(32) NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_settings (
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
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO store_settings (id, currency, "updatedAt") VALUES (1, 'BDT', NOW()) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS shop_customer_accounts (
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

CREATE TABLE IF NOT EXISTS shop_orders (
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

CREATE INDEX IF NOT EXISTS shop_orders_customer_account_idx ON shop_orders ("customerAccountId");

CREATE TABLE IF NOT EXISTS shop_order_items (
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

CREATE INDEX IF NOT EXISTS shop_order_items_order_id_idx ON shop_order_items ("orderId");

CREATE TABLE IF NOT EXISTS shop_email_outbox (
  id SERIAL PRIMARY KEY,
  "dedupeKey" VARCHAR(192) NOT NULL UNIQUE,
  "idempotencyKey" VARCHAR(128) NOT NULL UNIQUE,
  kind email_kind NOT NULL,
  status email_status NOT NULL DEFAULT 'pending',
  "customerAccountId" INTEGER NOT NULL REFERENCES shop_customer_accounts(id) ON DELETE CASCADE,
  "orderId" INTEGER REFERENCES shop_orders(id) ON DELETE CASCADE,
  "recipientEmail" VARCHAR(320) NOT NULL,
  "messageId" VARCHAR(128),
  attempts INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" VARCHAR(80),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "sentAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS shop_email_outbox_customer_idx ON shop_email_outbox ("customerAccountId");
CREATE INDEX IF NOT EXISTS shop_email_outbox_order_idx ON shop_email_outbox ("orderId");

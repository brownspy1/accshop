import { doublePrecision, foreignKey, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["user", "admin"]);
export const magicTokenPurposeEnum = pgEnum("magic_token_purpose", ["verify", "login"]);
export const paymentMethodEnum = pgEnum("payment_method", ["bkash", "nagad", "bank"]);
export const orderStatusEnum = pgEnum("order_status", ["awaiting_payment", "paid", "fulfilling", "fulfilled", "partially_fulfilled", "fulfillment_unknown", "fulfillment_failed", "cancelled"]);
export const fulfillmentStateEnum = pgEnum("fulfillment_state", ["pending", "processing", "fulfilled", "failed", "unknown"]);
export const emailKindEnum = pgEnum("email_kind", ["verify", "login", "delivery"]);
export const emailStatusEnum = pgEnum("email_status", ["pending", "sending", "sent", "failed", "unknown"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const activationServices = pgTable("activation_services", {
  serviceKey: varchar("serviceKey", { length: 128 }).primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull().default("acczone"),
  providerServiceId: varchar("providerServiceId", { length: 128 }).notNull().default(""),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  supplierPrice: doublePrecision("supplierPrice").notNull().default(0),
  supplierCurrency: varchar("supplierCurrency", { length: 8 }).notNull().default(""),
  providerRate: doublePrecision("providerRate").notNull().default(0),
  pricingTiers: text("pricingTiers"),
  stock: integer("stock").notNull().default(0),
  reservedStock: integer("reservedStock").notNull().default(0),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull().default(""),
  lastStockSyncedAt: timestamp("lastStockSyncedAt"),
  isActive: integer("isActive").notNull().default(0),
  isListed: integer("isListed").notNull().default(0),
  retailPrice: doublePrecision("retailPrice").notNull().default(0),
  priceMarkupRatio: doublePrecision("priceMarkupRatio").notNull().default(0),
  priceReviewRequired: integer("priceReviewRequired").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const providerCredentials = pgTable("provider_credentials", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull().default("acczone").unique(),
  ciphertext: text("ciphertext").notNull(),
  nonce: varchar("nonce", { length: 32 }).notNull(),
  authTag: varchar("authTag", { length: 32 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
  paymentInstructions: text("paymentInstructions"),
  bkashNumber: varchar("bkashNumber", { length: 64 }),
  nagadNumber: varchar("nagadNumber", { length: 64 }),
  bankDetails: text("bankDetails"),
  supportContact: varchar("supportContact", { length: 160 }),
  inrToStoreRate: doublePrecision("inrToStoreRate").notNull().default(0),
  usdtToStoreRate: doublePrecision("usdtToStoreRate").notNull().default(0),
  acczoneUnitToStoreRate: doublePrecision("acczoneUnitToStoreRate").notNull().default(0),
  resendFromEmail: varchar("resendFromEmail", { length: 320 }).notNull().default(""),
  publicSiteUrl: varchar("publicSiteUrl", { length: 512 }).notNull().default(""),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const customerAccounts = pgTable("shop_customer_accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull().default(""),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  magicTokenHash: varchar("magicTokenHash", { length: 64 }),
  magicTokenExpiresAt: timestamp("magicTokenExpiresAt"),
  magicTokenPurpose: magicTokenPurposeEnum("magicTokenPurpose"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const orders = pgTable("shop_orders", {
  id: serial("id").primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 64 }).unique(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 64 }).notNull(),
  customerAccountId: integer("customerAccountId"),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  paymentReference: varchar("paymentReference", { length: 160 }),
  totalAmount: doublePrecision("totalAmount").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
  status: orderStatusEnum("status").notNull().default("awaiting_payment"),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  paymentAccount: varchar("paymentAccount", { length: 2048 }).notNull().default(""),
  paymentInstructions: varchar("paymentInstructions", { length: 2000 }).notNull().default(""),
  supportContact: varchar("supportContact", { length: 160 }),
}, table => ({
  customerAccountIdx: index("shop_orders_customer_account_idx").on(table.customerAccountId),
  customerAccountFk: foreignKey({ columns: [table.customerAccountId], foreignColumns: [customerAccounts.id], name: "shop_orders_customer_account_fk" }).onDelete("set null"),
}));

export const orderItems = pgTable("shop_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  serviceKey: varchar("serviceKey", { length: 128 }).notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull().default("acczone"),
  providerServiceId: varchar("providerServiceId", { length: 128 }).notNull().default(""),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unitPrice").notNull(),
  supplierCostInr: doublePrecision("supplierCostInr").notNull().default(0),
  supplierCostUsdt: doublePrecision("supplierCostUsdt").notNull().default(0),
  supplierRate: doublePrecision("supplierRate").notNull().default(0),
  providerClientOrderId: varchar("providerClientOrderId", { length: 128 }).unique(),
  providerOrderId: varchar("providerOrderId", { length: 128 }),
  providerStatus: varchar("providerStatus", { length: 32 }),
  fulfillmentState: fulfillmentStateEnum("fulfillmentState").notNull().default("pending"),
  resultCodes: text("resultCodes"),
  providerMessage: varchar("providerMessage", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, table => ({
  orderIdx: index("shop_order_items_order_id_idx").on(table.orderId),
  orderFk: foreignKey({ columns: [table.orderId], foreignColumns: [orders.id], name: "shop_order_items_order_fk" }).onDelete("cascade"),
}));

export const emailOutbox = pgTable("shop_email_outbox", {
  id: serial("id").primaryKey(),
  dedupeKey: varchar("dedupeKey", { length: 192 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
  kind: emailKindEnum("kind").notNull(),
  status: emailStatusEnum("status").notNull().default("pending"),
  customerAccountId: integer("customerAccountId").notNull(),
  orderId: integer("orderId"),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  messageId: varchar("messageId", { length: 128 }),
  attempts: integer("attempts").notNull().default(0),
  lastErrorCode: varchar("lastErrorCode", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
}, table => ({
  customerIdx: index("shop_email_outbox_customer_idx").on(table.customerAccountId),
  orderIdx: index("shop_email_outbox_order_idx").on(table.orderId),
  customerFk: foreignKey({ columns: [table.customerAccountId], foreignColumns: [customerAccounts.id], name: "shop_email_outbox_customer_fk" }).onDelete("cascade"),
  orderFk: foreignKey({ columns: [table.orderId], foreignColumns: [orders.id], name: "shop_email_outbox_order_fk" }).onDelete("cascade"),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ActivationService = typeof activationServices.$inferSelect;
export type ShopOrder = typeof orders.$inferSelect;
export type ShopOrderItem = typeof orderItems.$inferSelect;
export type ShopCustomerAccount = typeof customerAccounts.$inferSelect;
export type ShopEmailOutbox = typeof emailOutbox.$inferSelect;

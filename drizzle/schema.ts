import { double, foreignKey, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const activationServices = mysqlTable("activation_services", {
  serviceKey: varchar("serviceKey", { length: 128 }).primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull().default("acczone"),
  providerServiceId: varchar("providerServiceId", { length: 128 }).notNull().default(""),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  supplierPrice: double("supplierPrice").notNull().default(0),
  supplierCurrency: varchar("supplierCurrency", { length: 8 }).notNull().default(""),
  providerRate: double("providerRate").notNull().default(0),
  pricingTiers: text("pricingTiers"),
  stock: int("stock").notNull().default(0),
  reservedStock: int("reservedStock").notNull().default(0),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull().default(""),
  lastStockSyncedAt: timestamp("lastStockSyncedAt"),
  isActive: int("isActive").notNull().default(0),
  isListed: int("isListed").notNull().default(0),
  retailPrice: double("retailPrice").notNull().default(0),
  priceMarkupRatio: double("priceMarkupRatio").notNull().default(0),
  priceReviewRequired: int("priceReviewRequired").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const providerCredentials = mysqlTable("provider_credentials", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull().default("acczone").unique(),
  ciphertext: text("ciphertext").notNull(),
  nonce: varchar("nonce", { length: 32 }).notNull(),
  authTag: varchar("authTag", { length: 32 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storeSettings = mysqlTable("store_settings", {
  id: int("id").primaryKey(),
  currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
  paymentInstructions: text("paymentInstructions"),
  bkashNumber: varchar("bkashNumber", { length: 64 }),
  nagadNumber: varchar("nagadNumber", { length: 64 }),
  bankDetails: text("bankDetails"),
  supportContact: varchar("supportContact", { length: 160 }),
  inrToStoreRate: double("inrToStoreRate").notNull().default(0),
  usdtToStoreRate: double("usdtToStoreRate").notNull().default(0),
  acczoneUnitToStoreRate: double("acczoneUnitToStoreRate").notNull().default(0),
  resendFromEmail: varchar("resendFromEmail", { length: 320 }).notNull().default(""),
  publicSiteUrl: varchar("publicSiteUrl", { length: 512 }).notNull().default(""),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customerAccounts = mysqlTable("shop_customer_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull().default(""),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  magicTokenHash: varchar("magicTokenHash", { length: 64 }),
  magicTokenExpiresAt: timestamp("magicTokenExpiresAt"),
  magicTokenPurpose: mysqlEnum("magicTokenPurpose", ["verify", "login"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("shop_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 64 }).unique(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 64 }).notNull(),
  customerAccountId: int("customerAccountId"),
  paymentMethod: mysqlEnum("paymentMethod", ["bkash", "nagad", "bank"]).notNull(),
  paymentReference: varchar("paymentReference", { length: 160 }),
  totalAmount: double("totalAmount").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
  status: mysqlEnum("status", ["awaiting_payment", "paid", "fulfilling", "fulfilled", "partially_fulfilled", "fulfillment_unknown", "fulfillment_failed", "cancelled"]).notNull().default("awaiting_payment"),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  paymentAccount: varchar("paymentAccount", { length: 2048 }).notNull().default(""),
  paymentInstructions: varchar("paymentInstructions", { length: 2000 }).notNull().default(""),
  supportContact: varchar("supportContact", { length: 160 }),
}, table => ({
  customerAccountIdx: index("shop_orders_customer_account_idx").on(table.customerAccountId),
  customerAccountFk: foreignKey({ columns: [table.customerAccountId], foreignColumns: [customerAccounts.id], name: "shop_orders_customer_account_fk" }).onDelete("set null"),
}));

export const orderItems = mysqlTable("shop_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  serviceKey: varchar("serviceKey", { length: 128 }).notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull().default("acczone"),
  providerServiceId: varchar("providerServiceId", { length: 128 }).notNull().default(""),
  quantity: int("quantity").notNull(),
  unitPrice: double("unitPrice").notNull(),
  supplierCostInr: double("supplierCostInr").notNull().default(0),
  supplierCostUsdt: double("supplierCostUsdt").notNull().default(0),
  supplierRate: double("supplierRate").notNull().default(0),
  providerClientOrderId: varchar("providerClientOrderId", { length: 128 }).unique(),
  providerOrderId: varchar("providerOrderId", { length: 128 }),
  providerStatus: varchar("providerStatus", { length: 32 }),
  fulfillmentState: mysqlEnum("fulfillmentState", ["pending", "processing", "fulfilled", "failed", "unknown"]).notNull().default("pending"),
  resultCodes: text("resultCodes"),
  providerMessage: varchar("providerMessage", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  orderIdx: index("shop_order_items_order_id_idx").on(table.orderId),
  orderFk: foreignKey({ columns: [table.orderId], foreignColumns: [orders.id], name: "shop_order_items_order_fk" }).onDelete("cascade"),
}));

export const emailOutbox = mysqlTable("shop_email_outbox", {
  id: int("id").autoincrement().primaryKey(),
  dedupeKey: varchar("dedupeKey", { length: 192 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
  kind: mysqlEnum("kind", ["verify", "login", "delivery"]).notNull(),
  status: mysqlEnum("status", ["pending", "sending", "sent", "failed", "unknown"]).notNull().default("pending"),
  customerAccountId: int("customerAccountId").notNull(),
  orderId: int("orderId"),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  messageId: varchar("messageId", { length: 128 }),
  attempts: int("attempts").notNull().default(0),
  lastErrorCode: varchar("lastErrorCode", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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

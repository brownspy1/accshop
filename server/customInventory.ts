import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { activationServices, customProductInventory, orderItems, orders } from "../drizzle/schema";
import { getDb } from "./db";
import { ensureSchemaMigrations } from "./schemaMigrations";

const newCustomKey = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

let customInventoryTableEnsured = false;
export async function ensureCustomInventoryTable(db: any) {
  if (customInventoryTableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_product_inventory (
        id SERIAL PRIMARY KEY,
        "serviceKey" VARCHAR(128) NOT NULL,
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
      CREATE INDEX IF NOT EXISTS custom_inventory_service_status_idx ON custom_product_inventory ("serviceKey", status);
      CREATE INDEX IF NOT EXISTS custom_inventory_order_idx ON custom_product_inventory ("orderId");
    `);
    customInventoryTableEnsured = true;
  } catch (err) {
    console.warn("[DB Migration] custom_product_inventory table ensure:", err);
  }
}

export function parseBulkCredentialLines(rawText: string): string[] {
  if (!rawText) return [];
  return rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export async function createCustomProduct(input: {
  name: string;
  description?: string;
  customDescription?: string;
  retailPrice: number;
  imageUrl?: string;
  bulkCredentials?: string;
  warrantyText?: string;
  warrantyDays?: number;
  isFlashSale?: number;
  flashSalePrice?: number;
  tags?: string;
  slug?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureCustomInventoryTable(db);
  await ensureSchemaMigrations(db);

  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("প্রোডাক্টের নাম প্রদান করুন");
  if (input.retailPrice <= 0) throw new Error("সঠিক বিক্রয়মূল্য (Retail Price > 0) নির্ধারণ করুন");

  const serviceKey = `custom_${newCustomKey()}`;
  const now = new Date();
  const credentials = parseBulkCredentialLines(input.bulkCredentials || "");

  return await db.transaction(async tx => {
    // 1. Insert product into activation_services
    await tx.insert(activationServices).values({
      serviceKey,
      provider: "custom",
      providerServiceId: serviceKey,
      name: cleanName,
      description: input.description?.trim() || cleanName,
      customDescription: input.customDescription?.trim() || input.description?.trim() || cleanName,
      supplierPrice: 0,
      supplierCurrency: "BDT",
      providerRate: 1,
      stock: credentials.length,
      reservedStock: 0,
      imageUrl: input.imageUrl?.trim() || "brand:custom",
      lastStockSyncedAt: now,
      isActive: 1,
      isListed: 1,
      retailPrice: Number(input.retailPrice.toFixed(2)),
      baseRetailPrice: Number(input.retailPrice.toFixed(2)),
      priceMarkupRatio: 0,
      priceReviewRequired: 0,
      warrantyText: input.warrantyText?.trim() || "ওয়ারেন্টি নেই",
      warrantyDays: input.warrantyDays || 0,
      isFlashSale: input.isFlashSale ? 1 : 0,
      flashSalePrice: input.flashSalePrice || null,
      tags: input.tags?.trim() || "",
      slug: input.slug?.trim() || null,
    });

    // 2. Insert initial credentials if provided
    if (credentials.length > 0) {
      await tx.insert(customProductInventory).values(
        credentials.map(credentialData => ({
          serviceKey,
          credentialData,
          status: "available",
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    return {
      success: true,
      serviceKey,
      name: cleanName,
      retailPrice: input.retailPrice,
      initialStock: credentials.length,
    };
  });
}

export async function addBulkCredentialsToVault(input: {
  serviceKey: string;
  bulkCredentials: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureCustomInventoryTable(db);

  const lines = parseBulkCredentialLines(input.bulkCredentials);
  if (!lines.length) throw new Error("কমপক্ষে একটি অ্যাকাউন্ট, লিঙ্ক বা কোড পেস্ট করুন");

  // Verify product exists
  const [product] = await db.select().from(activationServices).where(eq(activationServices.serviceKey, input.serviceKey)).limit(1);
  if (!product) throw new Error("নির্দিষ্ট প্রোডাক্টটি পাওয়া যায়নি");

  const now = new Date();

  return await db.transaction(async tx => {
    // Insert all credentials
    await tx.insert(customProductInventory).values(
      lines.map(credentialData => ({
        serviceKey: input.serviceKey,
        credentialData,
        status: "available",
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      }))
    );

    // Calculate current available stock
    const [stats] = await tx.select({
      available: sql<number>`count(*)::int`,
    }).from(customProductInventory)
      .where(and(
        eq(customProductInventory.serviceKey, input.serviceKey),
        eq(customProductInventory.status, "available")
      ));

    const totalAvailable = stats?.available ?? 0;

    // Update activation_services stock
    await tx.update(activationServices).set({
      stock: totalAvailable,
      lastStockSyncedAt: now,
      updatedAt: now,
    }).where(eq(activationServices.serviceKey, input.serviceKey));

    return {
      success: true,
      added: lines.length,
      totalAvailable,
    };
  });
}

export async function listCustomProductsWithStats() {
  const db = await getDb();
  if (!db) return [];
  await ensureCustomInventoryTable(db);

  const products = await db.select().from(activationServices)
    .where(eq(activationServices.provider, "custom"))
    .orderBy(desc(activationServices.createdAt));

  if (!products.length) return [];

  // Group stats from custom_product_inventory
  const statsRows = await db.select({
    serviceKey: customProductInventory.serviceKey,
    availableCount: sql<number>`count(*) filter (where ${customProductInventory.status} = 'available')::int`,
    soldCount: sql<number>`count(*) filter (where ${customProductInventory.status} = 'sold')::int`,
    totalCount: sql<number>`count(*)::int`,
  }).from(customProductInventory)
    .groupBy(customProductInventory.serviceKey);

  const statsMap = new Map(statsRows.map(s => [s.serviceKey, s]));

  return products.map(product => {
    const stats = statsMap.get(product.serviceKey);
    return {
      serviceKey: product.serviceKey,
      name: product.name,
      customDescription: product.customDescription || product.description,
      retailPrice: product.retailPrice,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      isListed: product.isListed,
      stock: product.stock,
      reservedStock: product.reservedStock,
      availableCount: stats?.availableCount ?? 0,
      soldCount: stats?.soldCount ?? 0,
      totalUploaded: stats?.totalCount ?? 0,
      warrantyText: product.warrantyText || "ওয়ারেন্টি নেই",
      warrantyDays: product.warrantyDays || 0,
      isFlashSale: product.isFlashSale || 0,
      flashSalePrice: product.flashSalePrice,
      tags: product.tags || "",
      slug: product.slug || product.serviceKey,
      createdAt: product.createdAt,
    };
  });
}

export async function updateCustomProduct(input: {
  serviceKey: string;
  name?: string;
  retailPrice?: number;
  customDescription?: string | null;
  imageUrl?: string | null;
  warrantyText?: string | null;
  warrantyDays?: number;
  isFlashSale?: number;
  flashSalePrice?: number | null;
  tags?: string | null;
  slug?: string | null;
  isListed?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureSchemaMigrations(db);

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.retailPrice !== undefined) {
    const p = Number(input.retailPrice.toFixed(2));
    updates.retailPrice = p;
    updates.baseRetailPrice = p;
  }
  if (input.customDescription !== undefined) updates.customDescription = input.customDescription?.trim() || null;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl?.trim() || "";
  if (input.warrantyText !== undefined) updates.warrantyText = input.warrantyText?.trim() || "ওয়ারেন্টি নেই";
  if (input.warrantyDays !== undefined) updates.warrantyDays = input.warrantyDays;
  if (input.isFlashSale !== undefined) updates.isFlashSale = input.isFlashSale ? 1 : 0;
  if (input.flashSalePrice !== undefined) updates.flashSalePrice = input.flashSalePrice;
  if (input.tags !== undefined) updates.tags = input.tags?.trim() || "";
  if (input.slug !== undefined) updates.slug = input.slug?.trim() || null;
  if (input.isListed !== undefined) updates.isListed = input.isListed;

  await db.update(activationServices).set(updates).where(eq(activationServices.serviceKey, input.serviceKey));
  return { success: true };
}

export async function listVaultItems(params: {
  serviceKey?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: 1, limit: 20 };
  await ensureCustomInventoryTable(db);

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(5, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.serviceKey && params.serviceKey !== "all") {
    conditions.push(eq(customProductInventory.serviceKey, params.serviceKey));
  }
  if (params.status && params.status !== "all") {
    conditions.push(eq(customProductInventory.status, params.status));
  }
  if (params.search?.trim()) {
    const query = `%${params.search.trim()}%`;
    conditions.push(or(
      like(customProductInventory.credentialData, query),
      like(customProductInventory.soldToEmail, query),
      like(customProductInventory.notes, query)
    ));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [countResult] = await db.select({
    total: sql<number>`count(*)::int`,
  }).from(customProductInventory).where(whereClause);

  const rows = await db.select({
    id: customProductInventory.id,
    serviceKey: customProductInventory.serviceKey,
    credentialData: customProductInventory.credentialData,
    status: customProductInventory.status,
    orderId: customProductInventory.orderId,
    orderItemId: customProductInventory.orderItemId,
    soldToEmail: customProductInventory.soldToEmail,
    soldAt: customProductInventory.soldAt,
    notes: customProductInventory.notes,
    createdAt: customProductInventory.createdAt,
    orderNo: orders.orderNo,
    serviceName: activationServices.name,
  }).from(customProductInventory)
    .leftJoin(orders, eq(customProductInventory.orderId, orders.id))
    .leftJoin(activationServices, eq(customProductInventory.serviceKey, activationServices.serviceKey))
    .where(whereClause)
    .orderBy(desc(customProductInventory.id))
    .limit(limit)
    .offset(offset);

  return {
    items: rows,
    total: countResult?.total ?? 0,
    page,
    limit,
  };
}

export async function deleteVaultItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureCustomInventoryTable(db);

  const [item] = await db.select().from(customProductInventory).where(eq(customProductInventory.id, id)).limit(1);
  if (!item) throw new Error("আইটেম পাওয়া যায়নি");
  if (item.status === "sold") throw new Error("বিক্রি হয়ে যাওয়া আইটেম ডিলিট করা যাবে না");

  return await db.transaction(async tx => {
    await tx.delete(customProductInventory).where(eq(customProductInventory.id, id));

    // Recalculate stock
    const [stats] = await tx.select({
      available: sql<number>`count(*)::int`,
    }).from(customProductInventory)
      .where(and(
        eq(customProductInventory.serviceKey, item.serviceKey),
        eq(customProductInventory.status, "available")
      ));

    const totalAvailable = stats?.available ?? 0;
    await tx.update(activationServices).set({
      stock: totalAvailable,
      updatedAt: new Date(),
    }).where(eq(activationServices.serviceKey, item.serviceKey));

    return { success: true, remainingStock: totalAvailable };
  });
}

export async function returnVaultItemToStock(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureCustomInventoryTable(db);

  const [item] = await db.select().from(customProductInventory).where(eq(customProductInventory.id, id)).limit(1);
  if (!item) throw new Error("আইটেম পাওয়া যায়নি");

  const now = new Date();
  return await db.transaction(async tx => {
    await tx.update(customProductInventory).set({
      status: "available",
      orderId: null,
      orderItemId: null,
      soldToEmail: null,
      soldAt: null,
      updatedAt: now,
    }).where(eq(customProductInventory.id, id));

    // Recalculate stock
    const [stats] = await tx.select({
      available: sql<number>`count(*)::int`,
    }).from(customProductInventory)
      .where(and(
        eq(customProductInventory.serviceKey, item.serviceKey),
        eq(customProductInventory.status, "available")
      ));

    const totalAvailable = stats?.available ?? 0;
    await tx.update(activationServices).set({
      stock: totalAvailable,
      updatedAt: now,
    }).where(eq(activationServices.serviceKey, item.serviceKey));

    return { success: true, totalAvailable };
  });
}

export async function updateVaultItem(input: { id: number; credentialData: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureCustomInventoryTable(db);

  const cleanData = input.credentialData.trim();
  if (!cleanData) throw new Error("অ্যাকাউন্ট বা কোডের তথ্য খালি রাখা যাবে না");

  await db.update(customProductInventory).set({
    credentialData: cleanData,
    notes: input.notes?.trim() || null,
    updatedAt: new Date(),
  }).where(eq(customProductInventory.id, input.id));

  return { success: true };
}

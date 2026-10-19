import { eq, or, isNull } from "drizzle-orm";
import { activationServices } from "../drizzle/schema";
import type { getDb } from "./db";

export const DEFAULT_PRODUCT_THUMBNAILS: Record<string, string> = {
  geminilive: "/images/products/gemini-pro.jpg",
  cs_24f8a6e1bbb3d0e7695f12bc8237964e13a291b4: "/images/products/gemini-pro.jpg",
  ADOBE_EXPRESS: "/images/products/adobe-express.jpg",
  cs_fa83028def2911a1d43c8daf401640e2d495c640: "/images/products/adobe-express.jpg",
  DUOLINGO: "/images/products/duolingo-super.jpg",
  cs_e659101c6b5f5ef88295ad5db35a327b810b990d: "/images/products/pocket-fm.jpg",
};

export function getProductThumbnail(serviceKey: string, name?: string | null): string {
  if (serviceKey && DEFAULT_PRODUCT_THUMBNAILS[serviceKey]) {
    return DEFAULT_PRODUCT_THUMBNAILS[serviceKey];
  }
  const clean = `${serviceKey || ""} ${name || ""}`.toLowerCase();
  if (clean.includes("gemini")) return "/images/products/gemini-pro.jpg";
  if (clean.includes("adobe") || clean.includes("express")) return "/images/products/adobe-express.jpg";
  if (clean.includes("duolingo")) return "/images/products/duolingo-super.jpg";
  if (clean.includes("pocket") || clean.includes("fm")) return "/images/products/pocket-fm.jpg";
  return "";
}

/**
 * Automatically backfill/persist thumbnail images into the database for any
 * active products whose imageUrl is currently empty.
 */
export async function ensureProductThumbnailsInDb(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<number> {
  try {
    const rows = await db
      .select({
        serviceKey: activationServices.serviceKey,
        name: activationServices.name,
        imageUrl: activationServices.imageUrl,
      })
      .from(activationServices)
      .where(or(isNull(activationServices.imageUrl), eq(activationServices.imageUrl, "")));

    let updatedCount = 0;
    const now = new Date();

    for (const row of rows) {
      const targetImage = getProductThumbnail(row.serviceKey, row.name);
      if (targetImage) {
        await db
          .update(activationServices)
          .set({ imageUrl: targetImage, updatedAt: now })
          .where(eq(activationServices.serviceKey, row.serviceKey));
        updatedCount++;
      }
    }

    return updatedCount;
  } catch (error) {
    console.warn("[Thumbnails] ensureProductThumbnailsInDb skipped or failed:", error);
    return 0;
  }
}

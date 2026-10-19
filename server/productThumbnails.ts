import { eq, or, isNull } from "drizzle-orm";
import { activationServices } from "../drizzle/schema";
import type { getDb } from "./db";

export const DEFAULT_PRODUCT_THUMBNAILS: Record<string, string> = {
  geminilive: "brand:gemini",
  cs_24f8a6e1bbb3d0e7695f12bc8237964e13a291b4: "brand:gemini",
  ADOBE_EXPRESS: "brand:adobe",
  cs_fa83028def2911a1d43c8daf401640e2d495c640: "brand:adobe",
  DUOLINGO: "brand:duolingo",
  cs_e659101c6b5f5ef88295ad5db35a327b810b990d: "brand:pocket",
};

export function getProductThumbnail(serviceKey: string, name?: string | null): string {
  if (serviceKey && DEFAULT_PRODUCT_THUMBNAILS[serviceKey]) {
    return DEFAULT_PRODUCT_THUMBNAILS[serviceKey];
  }
  const clean = `${serviceKey || ""} ${name || ""}`.toLowerCase();
  if (clean.includes("gemini")) return "brand:gemini";
  if (clean.includes("adobe") || clean.includes("express")) return "brand:adobe";
  if (clean.includes("duolingo")) return "brand:duolingo";
  if (clean.includes("pocket") || clean.includes("fm")) return "brand:pocket";
  if (clean.includes("spotify")) return "brand:spotify";
  if (clean.includes("netflix")) return "brand:netflix";
  if (clean.includes("chatgpt") || clean.includes("openai") || clean.includes("gpt")) return "brand:chatgpt";
  if (clean.includes("youtube")) return "brand:youtube";
  if (clean.includes("canva")) return "brand:canva";
  if (clean.includes("telegram")) return "brand:telegram";
  if (clean.includes("apple")) return "brand:apple";
  if (clean.includes("prime")) return "brand:prime";
  if (clean.includes("discord")) return "brand:discord";
  if (clean.includes("nord") || clean.includes("vpn")) return "brand:nordvpn";
  if (clean.includes("office") || clean.includes("microsoft")) return "brand:office";
  return "";
}

/**
 * Automatically backfill/persist thumbnail icons into the database for any
 * active products whose imageUrl is currently empty or still pointing to deleted static images.
 */
export async function ensureProductThumbnailsInDb(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<number> {
  try {
    const rows = await db
      .select({
        serviceKey: activationServices.serviceKey,
        name: activationServices.name,
        imageUrl: activationServices.imageUrl,
      })
      .from(activationServices);

    let updatedCount = 0;
    const now = new Date();

    for (const row of rows) {
      // If imageUrl points to deleted /images/products/, reset to brand icon
      if (row.imageUrl && row.imageUrl.includes("/images/products/")) {
        const targetIcon = getProductThumbnail(row.serviceKey, row.name);
        await db
          .update(activationServices)
          .set({ imageUrl: targetIcon, updatedAt: now })
          .where(eq(activationServices.serviceKey, row.serviceKey));
        updatedCount++;
      } else if (!row.imageUrl) {
        const targetIcon = getProductThumbnail(row.serviceKey, row.name);
        if (targetIcon) {
          await db
            .update(activationServices)
            .set({ imageUrl: targetIcon, updatedAt: now })
            .where(eq(activationServices.serviceKey, row.serviceKey));
          updatedCount++;
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.warn("[Thumbnails] ensureProductThumbnailsInDb skipped or failed:", error);
    return 0;
  }
}

import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";
import { activationServices } from "../drizzle/schema";
import { getDb } from "./db";
import { createContext } from "./_core/context";
import { isAdminEmail } from "./_core/adminAllowlist";
import { MAX_PRODUCT_IMAGE_BYTES, ProductImageError, uploadProductImageObject, type ProductImageMime } from "./productImages";

const allowedTypes = new Set<ProductImageMime>(["image/jpeg", "image/png", "image/webp"]);

function sameOrigin(req: Request): boolean {
  if (req.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.get("origin");
  if (!origin) return false;
  let host: string;
  try { host = new URL(origin).host.toLowerCase(); } catch { return false; }
  const forwarded = req.headers["x-forwarded-host"];
  const allowedHosts = [req.headers.host, forwarded]
    .flatMap(value => Array.isArray(value) ? value : [value])
    .flatMap(value => (value ?? "").split(","))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return allowedHosts.includes(host);
}

async function requireAdminAndProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!sameOrigin(req)) return res.status(403).json({ error: "Same-origin upload is required." });
    const context = await createContext({ req, res } as CreateExpressContextOptions);
    if (!context.user) return res.status(401).json({ error: "Sign in before uploading a product image." });
    if (context.user.role !== "admin" || !isAdminEmail(context.user.email)) {
      return res.status(403).json({ error: "Administrator access is required." });
    }
    const serviceKey = req.params.serviceKey ?? "";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(serviceKey)) return res.status(400).json({ error: "Invalid service." });
    const contentType = (req.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
    if (!allowedTypes.has(contentType as ProductImageMime)) return res.status(415).json({ error: "Choose a JPEG, PNG or WebP image." });
    const contentLength = Number(req.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PRODUCT_IMAGE_BYTES) {
      return res.status(413).json({ error: "Image is larger than 512 KiB after compression." });
    }
    if (req.get("content-encoding") && req.get("content-encoding") !== "identity") {
      return res.status(415).json({ error: "Compressed request bodies are not supported." });
    }
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database is not available." });
    const [product] = await db.select({ serviceKey: activationServices.serviceKey, provider: activationServices.provider })
      .from(activationServices).where(eq(activationServices.serviceKey, serviceKey)).limit(1);
    if (!product || !["acczone", "couponshops"].includes(product.provider)) return res.status(404).json({ error: "Product not found." });
    res.locals.productImageTarget = { serviceKey: product.serviceKey, provider: product.provider };
    res.locals.productImageDb = db;
    next();
  } catch {
    res.status(401).json({ error: "Upload authorization could not be verified." });
  }
}

export function registerProductImageUpload(app: Express) {
  app.post(
    "/api/admin/product-image/:serviceKey",
    requireAdminAndProduct,
    express.raw({ type: Array.from(allowedTypes), limit: MAX_PRODUCT_IMAGE_BYTES, inflate: false }),
    async (req, res) => {
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body)) return res.status(400).json({ error: "Image body is empty or invalid." });
      const target = res.locals.productImageTarget as { serviceKey: string; provider: "acczone" | "couponshops" };
      try {
        const imageUrl = await uploadProductImageObject(target.provider, target.serviceKey, body, (req.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase());
        const db = res.locals.productImageDb as Awaited<ReturnType<typeof getDb>>;
        if (!db) return res.status(503).json({ error: "Database is not available." });
        await db.update(activationServices).set({ imageUrl, updatedAt: new Date() }).where(eq(activationServices.serviceKey, target.serviceKey));
        return res.json({ imageUrl });
      } catch (error) {
        const status = error instanceof ProductImageError ? error.status : 502;
        const message = error instanceof ProductImageError ? error.message : "Image could not be saved. Try again later.";
        return res.status(status).json({ error: message });
      }
    },
  );
  app.use("/api/admin/product-image", (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    const status = error && typeof error === "object" && "status" in error && error.status === 413 ? 413 : 400;
    if (res.headersSent) return next(error);
    return res.status(status).json({ error: status === 413 ? "Image is larger than the 512 KiB limit." : "Image request was rejected." });
  });
}

import { randomUUID } from "node:crypto";
import { ENV } from "./_core/env";

export const MAX_PRODUCT_IMAGE_BYTES = 512 * 1024;
export type ProductImageMime = "image/jpeg" | "image/png" | "image/webp";

export class ProductImageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ProductImageError";
  }
}

const suffix: Record<ProductImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateProductImage(bytes: Buffer, mimeType: string): asserts mimeType is ProductImageMime {
  if (!(mimeType in suffix)) throw new ProductImageError("Choose a JPEG, PNG or WebP image.", 415);
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageError("Image must be between 12 bytes and 512 KiB after browser compression.", 413);
  }
  const mime = mimeType as ProductImageMime;
  const valid = mime === "image/png"
    ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : mime === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new ProductImageError("The image content does not match its declared file type.", 415);
}

export async function uploadProductImageObject(
  provider: "acczone" | "couponshops",
  serviceKey: string,
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  validateProductImage(bytes, mimeType);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(serviceKey)) throw new ProductImageError("Invalid product identity.", 400);
  const apiUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const apiKey = ENV.forgeApiKey;
  if (!apiUrl || !apiKey) throw new ProductImageError("Managed image storage is temporarily unavailable.", 503);

  const ext = suffix[mimeType as ProductImageMime];
  const objectKey = `product-images/${provider}/${serviceKey}/${randomUUID()}.${ext}`;
  const uploadBody = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(uploadBody).set(bytes);
  let signedUrl = "";
  try {
    const response = await fetch(`${apiUrl}/v1/storage/presign/put?path=${encodeURIComponent(objectKey)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !("url" in result) || typeof result.url !== "string") {
      throw new Error("Presign request failed");
    }
    const parsed = new URL(result.url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Invalid upload address");
    signedUrl = parsed.toString();
  } catch {
    throw new ProductImageError("Could not create a secure image upload. Try again later.", 502);
  }

  try {
    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: uploadBody,
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error("Storage upload failed");
  } catch {
    throw new ProductImageError("Image upload did not complete. Try again later.", 502);
  }

  return `/manus-storage/${objectKey}`;
}

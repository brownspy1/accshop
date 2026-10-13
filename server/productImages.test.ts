import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_IMAGE_BYTES, ProductImageError, validateProductImage } from "./productImages";

describe("product image upload validation", () => {
  it("accepts a PNG with matching magic bytes", () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
    expect(() => validateProductImage(png, "image/png")).not.toThrow();
  });

  it("rejects bytes whose content type does not match", () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
    expect(() => validateProductImage(png, "image/webp")).toThrow(ProductImageError);
  });

  it("rejects SVG and other unsupported types", () => {
    expect(() => validateProductImage(Buffer.from("<svg></svg>"), "image/svg+xml")).toThrow(ProductImageError);
  });

  it("rejects oversized bodies", () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES)]);
    expect(() => validateProductImage(png, "image/png")).toThrow(ProductImageError);
  });

  it("stores image locally and returns an uploads URL when cloud storage is unconfigured", async () => {
    const { uploadProductImageObject } = await import("./productImages");
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
    const url = await uploadProductImageObject("acczone", "test_item_key", png, "image/png");
    expect(url).toMatch(/^\/uploads\/product-images\/acczone\/test_item_key\/[a-f0-9-]+\.png$/);
  });
});


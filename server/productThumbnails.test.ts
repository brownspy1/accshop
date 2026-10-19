import { describe, expect, it } from "vitest";
import { DEFAULT_PRODUCT_THUMBNAILS, getProductThumbnail } from "./productThumbnails";

describe("Product Thumbnails Resolver", () => {
  it("resolves exact matches for known service keys", () => {
    expect(getProductThumbnail("geminilive")).toBe("/images/products/gemini-pro.jpg");
    expect(getProductThumbnail("ADOBE_EXPRESS")).toBe("/images/products/adobe-express.jpg");
    expect(getProductThumbnail("DUOLINGO")).toBe("/images/products/duolingo-super.jpg");
    expect(getProductThumbnail("cs_e659101c6b5f5ef88295ad5db35a327b810b990d")).toBe("/images/products/pocket-fm.jpg");
  });

  it("resolves by service name when key is arbitrary", () => {
    expect(getProductThumbnail("random_key", "Google Gemini Pro 18M")).toBe("/images/products/gemini-pro.jpg");
    expect(getProductThumbnail("random_key", "Adobe Express Premium")).toBe("/images/products/adobe-express.jpg");
    expect(getProductThumbnail("random_key", "Duolingo Super VIP")).toBe("/images/products/duolingo-super.jpg");
    expect(getProductThumbnail("random_key", "Pocket FM Audio 3M")).toBe("/images/products/pocket-fm.jpg");
  });

  it("returns empty string when no thumbnail matches", () => {
    expect(getProductThumbnail("unknown_key", "Unknown Service")).toBe("");
  });
});

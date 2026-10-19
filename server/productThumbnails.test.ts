import { describe, expect, it } from "vitest";
import { DEFAULT_PRODUCT_THUMBNAILS, getProductThumbnail } from "./productThumbnails";

describe("Product Thumbnails Resolver", () => {
  it("resolves exact matches for known service keys", () => {
    expect(getProductThumbnail("geminilive")).toBe("brand:gemini");
    expect(getProductThumbnail("ADOBE_EXPRESS")).toBe("brand:adobe");
    expect(getProductThumbnail("DUOLINGO")).toBe("brand:duolingo");
    expect(getProductThumbnail("cs_e659101c6b5f5ef88295ad5db35a327b810b990d")).toBe("brand:pocket");
  });

  it("resolves by service name when key is arbitrary", () => {
    expect(getProductThumbnail("random_key", "Google Gemini Pro 18M")).toBe("brand:gemini");
    expect(getProductThumbnail("random_key", "Adobe Express Premium")).toBe("brand:adobe");
    expect(getProductThumbnail("random_key", "Duolingo Super VIP")).toBe("brand:duolingo");
    expect(getProductThumbnail("random_key", "Pocket FM Audio 3M")).toBe("brand:pocket");
    expect(getProductThumbnail("random_key", "Spotify Premium Family")).toBe("brand:spotify");
    expect(getProductThumbnail("random_key", "Netflix UHD 4K")).toBe("brand:netflix");
  });

  it("returns empty string when no thumbnail matches", () => {
    expect(getProductThumbnail("unknown_key", "Unknown Service")).toBe("");
  });
});

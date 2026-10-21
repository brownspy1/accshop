import { describe, it, expect, beforeEach } from "vitest";
import { checkLoginRateLimit, recordFailedLogin, recordSuccessfulLogin } from "./passkeyAuth";
import { parseProductMeta } from "../client/src/lib/shop";

describe("Login Rate Limiting & Lockout", () => {
  const testIp = "192.168.1.100";

  beforeEach(() => {
    recordSuccessfulLogin(testIp);
  });

  it("permits initial attempts without throwing", () => {
    expect(() => checkLoginRateLimit(testIp)).not.toThrow();
  });

  it("tracks failed attempts and enforces exponential lockout after 5 failures", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(testIp);
    }
    expect(() => checkLoginRateLimit(testIp)).toThrow(/অতিরিক্ত ভুল চেষ্টার কারণে/);
  });

  it("clears failed attempts upon successful login", () => {
    recordFailedLogin(testIp);
    recordFailedLogin(testIp);
    recordSuccessfulLogin(testIp);

    expect(() => checkLoginRateLimit(testIp)).not.toThrow();
  });
});

describe("Dynamic Product Metadata & Description Parser", () => {
  it("prioritizes customDescription provided by admin over hardcoded brand fallbacks", () => {
    const customText = "• ১ মাসের ফুল প্রাইভেট অ্যাক্টিভেশন\n• ইনস্ট্যান্ট মেইল ডেলিভারি\n• কোনো ভিপিএন লাগবে না";
    const meta = parseProductMeta(
      "gemini_1m",
      "Gemini Pro 1 Month",
      "Old supplier description",
      {
        customDescription: customText,
        warrantyText: "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি",
        warrantyDays: 7,
        tags: "হট ডিল, বেস্ট সেলার",
        isFlashSale: true,
        flashSalePrice: 350,
      }
    );

    expect(meta.isFlashSale).toBe(true);
    expect(meta.flashSalePrice).toBe(350);
    expect(meta.warrantyText).toBe("৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি");
    expect(meta.warrantyDays).toBe(7);
    expect(meta.tags).toContain("হট ডিল");
    expect(meta.tags).toContain("বেস্ট সেলার");
    expect(meta.bullets.length).toBeGreaterThanOrEqual(3);
    expect(meta.bullets[0]).toContain("১ মাসের ফুল প্রাইভেট অ্যাক্টিভেশন");
  });

  it("formats flash sale and discount badges properly", () => {
    const meta = parseProductMeta(
      "nordvpn_1y",
      "NordVPN Premium",
      "Fastest VPN on the planet",
      {
        tags: "সিকিউর, প্রাইভেট",
        isFlashSale: true,
        flashSalePrice: 299,
      }
    );

    expect(meta.isFlashSale).toBe(true);
    expect(meta.flashSalePrice).toBe(299);
    expect(meta.tags).toEqual(["সিকিউর", "প্রাইভেট"]);
  });
});

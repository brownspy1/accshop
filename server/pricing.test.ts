import { describe, expect, it } from "vitest";
import { markupRatioForManualRetailPrice, repriceAfterSupplierSync, supplierCostInStoreCurrency, type ExistingRetail } from "./pricing";

const bdt = { currency: "BDT" as const, inrToStoreRate: 1.45, usdtToStoreRate: 120, acczoneUnitToStoreRate: 1 };
const existing = (overrides: Partial<ExistingRetail> = {}): ExistingRetail => ({
  price: 100, currency: "BDT", providerRate: 0,
  retailPrice: 150, baseRetailPrice: 150, priceMarkupRatio: 1.5, priceReviewRequired: 0,
  ...overrides,
});

describe("supplier-based retail pricing", () => {
  it("keeps the saved retail/supplier ratio when the supplier reaches the current retail price", () => {
    const result = repriceAfterSupplierSync(existing(), { price: 160, currency: "BDT", providerRate: 0 }, bdt);
    expect(result).toEqual({ retailPrice: 240, baseRetailPrice: 150, priceMarkupRatio: 1.5, priceReviewRequired: 0 });
  });

  it("does not lower retail price below admin set price when supplier cost falls below original cost", () => {
    const result = repriceAfterSupplierSync(existing(), { price: 80, currency: "BDT", providerRate: 0 }, bdt);
    expect(result.retailPrice).toBe(150);
    expect(result.baseRetailPrice).toBe(150);
    expect(result.priceReviewRequired).toBe(0);
  });

  it("lowers retail price when supplier cost falls from a peak, but never drops below the admin set price", () => {
    // Admin set price: 150 (when supplier was 100, markup ratio 1.5).
    // Supplier price spiked to 160, so retail price was 240.
    const peakRetail = existing({
      price: 160,
      retailPrice: 240,
      baseRetailPrice: 150,
      priceMarkupRatio: 1.5,
    });

    // 1. Supplier cost falls from 160 to 120:
    // 120 * 1.5 = 180 (Price properly decreases from 240 down to 180!)
    const result120 = repriceAfterSupplierSync(peakRetail, { price: 120, currency: "BDT", providerRate: 0 }, bdt);
    expect(result120.retailPrice).toBe(180);
    expect(result120.baseRetailPrice).toBe(150);

    // 2. Supplier cost falls to 100 (original cost):
    // 100 * 1.5 = 150 (Returns to the original set price)
    const result100 = repriceAfterSupplierSync(peakRetail, { price: 100, currency: "BDT", providerRate: 0 }, bdt);
    expect(result100.retailPrice).toBe(150);
    expect(result100.baseRetailPrice).toBe(150);

    // 3. Supplier cost drops further to 60 (below original cost):
    // 60 * 1.5 = 90, but base price floor is 150, so it strictly stays at 150!
    const result60 = repriceAfterSupplierSync(peakRetail, { price: 60, currency: "BDT", providerRate: 0 }, bdt);
    expect(result60.retailPrice).toBe(150);
    expect(result60.baseRetailPrice).toBe(150);
  });

  it("uses an admin-provided USDT conversion to shop currency", () => {
    expect(supplierCostInStoreCurrency({ price: 2, currency: "USDT", providerRate: 0 }, bdt)).toBe(240);
    const result = repriceAfterSupplierSync(existing({ price: 1, currency: "USDT", retailPrice: 150, baseRetailPrice: 150, priceMarkupRatio: 1.5 }), { price: 2, currency: "USDT", providerRate: 0 }, bdt);
    expect(result.retailPrice).toBe(360);
    expect(result.baseRetailPrice).toBe(150);
    expect(result.priceReviewRequired).toBe(0);
  });

  it("uses CouponShops' current USDT-to-INR rate when the shop sells in INR", () => {
    const inr = { ...bdt, currency: "INR" as const };
    expect(supplierCostInStoreCurrency({ price: 2, currency: "USDT", providerRate: 85 }, inr)).toBe(170);
  });

  it("flags changed supplier costs if currencies cannot be safely compared", () => {
    const noFx = { ...bdt, usdtToStoreRate: 0 };
    const result = repriceAfterSupplierSync(existing({ price: 1, currency: "USDT", priceMarkupRatio: 0 }), { price: 2, currency: "USDT", providerRate: 0 }, noFx);
    expect(result).toEqual({ retailPrice: 150, baseRetailPrice: 150, priceMarkupRatio: 0, priceReviewRequired: 1 });
  });

  it("derives the markup ratio from the existing supplier price if a legacy row has none", () => {
    const result = repriceAfterSupplierSync(existing({ priceMarkupRatio: 0 }), { price: 160, currency: "BDT", providerRate: 0 }, bdt);
    expect(result.retailPrice).toBe(240);
    expect(result.baseRetailPrice).toBe(150);
    expect(result.priceMarkupRatio).toBe(1.5);
  });

  it("never sets an automatic retail price below supplier cost", () => {
    const result = repriceAfterSupplierSync(existing({ priceMarkupRatio: 0.5, baseRetailPrice: 50 }), { price: 200, currency: "BDT", providerRate: 0 }, bdt);
    expect(result.retailPrice).toBe(200);
  });

  it("captures the current ratio when an admin sets a retail price", () => {
    expect(markupRatioForManualRetailPrice(150, { price: 100, currency: "BDT", providerRate: 0 }, bdt)).toBe(1.5);
    expect(markupRatioForManualRetailPrice(150, { price: 1, currency: "USDT", providerRate: 0 }, { ...bdt, usdtToStoreRate: 0 })).toBe(0);
  });
});

export type StoreCurrency = "BDT" | "USD" | "INR";
export type PricingRates = {
  currency: StoreCurrency;
  inrToStoreRate: number;
  usdtToStoreRate: number;
  acczoneUnitToStoreRate: number;
};

export type SupplierCost = {
  price: number;
  currency: string;
  providerRate: number;
};

export type ExistingRetail = SupplierCost & {
  retailPrice: number;
  priceMarkupRatio: number;
  priceReviewRequired: number;
};

export type IncomingSupplierCost = SupplierCost;

export function supplierCostInStoreCurrency(cost: SupplierCost, rates: PricingRates): number | null {
  if (!Number.isFinite(cost.price) || cost.price < 0) return null;
  const source = cost.currency.trim().toUpperCase();
  if (source === rates.currency) return cost.price;

  let factor = 0;
  if (source === "USDT" && rates.currency === "INR" && cost.providerRate > 0) {
    // CouponShops returns its own current INR-per-USDT price conversion.
    factor = cost.providerRate;
  } else if (source === "USDT") {
    factor = rates.usdtToStoreRate;
  } else if (source === "INR") {
    factor = rates.inrToStoreRate;
  } else if (source === "ACC") {
    factor = rates.acczoneUnitToStoreRate;
  }

  if (!Number.isFinite(factor) || factor <= 0) return null;
  const converted = cost.price * factor;
  return Number.isFinite(converted) && converted >= 0 ? converted : null;
}

/** Compute new row values before an upstream supplier sync upsert. */
export function repriceAfterSupplierSync(
  previous: ExistingRetail,
  incoming: IncomingSupplierCost,
  rates: PricingRates,
): { retailPrice: number; priceMarkupRatio: number; priceReviewRequired: number } {
  const oldEffectiveCost = supplierCostInStoreCurrency(previous, rates);
  const newEffectiveCost = supplierCostInStoreCurrency(incoming, rates);
  const costChanged = previous.price !== incoming.price
    || previous.currency.trim().toUpperCase() !== incoming.currency.trim().toUpperCase()
    || previous.providerRate !== incoming.providerRate;

  if (previous.retailPrice <= 0) {
    return { retailPrice: previous.retailPrice, priceMarkupRatio: previous.priceMarkupRatio, priceReviewRequired: 0 };
  }

  if (newEffectiveCost === null) {
    return {
      retailPrice: previous.retailPrice,
      priceMarkupRatio: previous.priceMarkupRatio,
      priceReviewRequired: costChanged ? 1 : previous.priceReviewRequired,
    };
  }

  const storedRatio = previous.priceMarkupRatio > 0
    ? previous.priceMarkupRatio
    : oldEffectiveCost !== null && oldEffectiveCost > 0
      ? previous.retailPrice / oldEffectiveCost
      : 0;

  if (newEffectiveCost >= previous.retailPrice) {
    if (storedRatio <= 0 || !Number.isFinite(storedRatio)) {
      return { retailPrice: previous.retailPrice, priceMarkupRatio: 0, priceReviewRequired: 1 };
    }
    // Never carry a below-cost manual ratio into an automatic supplier price increase.
    const safeRatio = Math.max(1, storedRatio);
    const nextPrice = Math.round(Math.max(newEffectiveCost, newEffectiveCost * safeRatio) * 100) / 100;
    return { retailPrice: nextPrice, priceMarkupRatio: storedRatio, priceReviewRequired: 0 };
  }

  return {
    retailPrice: previous.retailPrice,
    priceMarkupRatio: storedRatio,
    priceReviewRequired: 0,
  };
}

export function markupRatioForManualRetailPrice(
  retailPrice: number,
  supplier: SupplierCost,
  rates: PricingRates,
): number {
  if (!Number.isFinite(retailPrice) || retailPrice <= 0) return 0;
  const cost = supplierCostInStoreCurrency(supplier, rates);
  if (cost === null || cost <= 0) return 0;
  return retailPrice / cost;
}

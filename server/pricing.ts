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
  baseRetailPrice?: number | null;
  priceMarkupRatio: number;
  priceReviewRequired: number;
};

export type IncomingSupplierCost = SupplierCost;

export type RepriceResult = {
  retailPrice: number;
  baseRetailPrice: number;
  priceMarkupRatio: number;
  priceReviewRequired: number;
};

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
): RepriceResult {
  const oldEffectiveCost = supplierCostInStoreCurrency(previous, rates);
  const newEffectiveCost = supplierCostInStoreCurrency(incoming, rates);
  const costChanged = previous.price !== incoming.price
    || previous.currency.trim().toUpperCase() !== incoming.currency.trim().toUpperCase()
    || previous.providerRate !== incoming.providerRate;

  if (previous.retailPrice <= 0) {
    return {
      retailPrice: previous.retailPrice,
      baseRetailPrice: previous.baseRetailPrice ?? 0,
      priceMarkupRatio: previous.priceMarkupRatio,
      priceReviewRequired: 0,
    };
  }

  // The base price is the admin's manually set baseline price.
  // The retail price must NEVER go below this base price.
  const basePrice = (previous.baseRetailPrice && previous.baseRetailPrice > 0)
    ? previous.baseRetailPrice
    : previous.retailPrice;

  if (newEffectiveCost === null) {
    return {
      retailPrice: previous.retailPrice,
      baseRetailPrice: basePrice,
      priceMarkupRatio: previous.priceMarkupRatio,
      priceReviewRequired: costChanged ? 1 : previous.priceReviewRequired,
    };
  }

  // Determine the markup ratio that was established when the admin set the price relative to supplier cost:
  let storedRatio = previous.priceMarkupRatio;
  if (storedRatio <= 0 || !Number.isFinite(storedRatio)) {
    if (oldEffectiveCost !== null && oldEffectiveCost > 0) {
      storedRatio = basePrice / oldEffectiveCost;
    } else if (newEffectiveCost > 0) {
      storedRatio = basePrice / newEffectiveCost;
    }
  }

  if (storedRatio <= 0 || !Number.isFinite(storedRatio)) {
    // If supplier cost exceeds current retail price, protect against loss
    if (newEffectiveCost >= previous.retailPrice) {
      return {
        retailPrice: Math.round(newEffectiveCost * 100) / 100,
        baseRetailPrice: basePrice,
        priceMarkupRatio: 0,
        priceReviewRequired: 1,
      };
    }
    return {
      retailPrice: previous.retailPrice,
      baseRetailPrice: basePrice,
      priceMarkupRatio: 0,
      priceReviewRequired: 0,
    };
  }

  // Calculate dynamic price based on the current supplier cost and established markup ratio:
  const calculatedPrice = Math.round(newEffectiveCost * storedRatio * 100) / 100;

  // The retail price increases when supplier cost rises, and decreases when supplier cost falls.
  // CRITICAL REQUIREMENT: The retail price MUST NEVER fall below the admin's set base price (`basePrice`),
  // and MUST NEVER fall below the current supplier cost (`newEffectiveCost`).
  const nextPrice = Math.round(Math.max(basePrice, newEffectiveCost, calculatedPrice) * 100) / 100;

  return {
    retailPrice: nextPrice,
    baseRetailPrice: basePrice,
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

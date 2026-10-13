export function formatMoney(amount: number, currency = "BDT") {
  try {
    return new Intl.NumberFormat("bn-BD", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

export const orderStatusLabels: Record<string, string> = {
  awaiting_payment: "পেমেন্ট অপেক্ষমাণ",
  paid: "পেমেন্ট যাচাই হয়েছে",
  fulfilling: "অ্যাক্টিভেশন চলছে",
  processing: "অ্যাক্টিভেশন যাচাই চলছে",
  fulfilled: "সম্পন্ন",
  unknown: "Provider history review",
  partially_fulfilled: "আংশিক সম্পন্ন · রিভিউ প্রয়োজন",
  fulfillment_unknown: "Provider status যাচাই প্রয়োজন",
  fulfillment_failed: "Fulfillment ব্যর্থ · রিভিউ প্রয়োজন",
  cancelled: "বাতিল",
};

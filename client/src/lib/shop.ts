export function formatBn(amount: number | string): string {
  try {
    return new Intl.NumberFormat("bn-BD").format(Number(amount));
  } catch {
    return String(amount);
  }
}

export function formatMoney(amount: number, _currency = "BDT"): string {
  try {
    return `৳${new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
  } catch {
    return `৳${Math.round(amount)}`;
  }
}

export function formatPerMonth(amount: number, months = 1): string {
  const m = Math.max(1, months);
  const monthly = Math.round(amount / m);
  return `মাসে ≈ ৳${formatBn(monthly)}`;
}

export const orderStatusLabels: Record<string, string> = {
  awaiting_payment: "পেমেন্ট অপেক্ষমাণ",
  paid: "পেমেন্ট যাচাই হয়েছে",
  fulfilling: "অ্যাক্টিভেশন চলছে",
  processing: "অ্যাক্টিভেশন যাচাই চলছে",
  fulfilled: "সম্পন্ন",
  unknown: "রিভিউ চলছে",
  partially_fulfilled: "আংশিক সম্পন্ন",
  fulfillment_unknown: "স্ট্যাটাস যাচাই চলছে",
  fulfillment_failed: "রিভিউ প্রয়োজন",
  cancelled: "বাতিল",
};

export interface StructuredProductMeta {
  brand: "gemini" | "adobe" | "duolingo" | "pocketfm" | "chatgpt" | "spotify" | "netflix" | "other";
  brandName: string;
  planTitle: string;
  durationMonths: number;
  durationText: string;
  accessType: "own" | "ready";
  accessTypeText: string;
  warrantyDays: number;
  warrantyText: string;
  oneLineBenefit: string;
  bullets: string[];
  howItWorks: string[];
  faqs: Array<{ q: string; a: string }>;
  isNew?: boolean;
  isPopular?: boolean;
  isFlashSale?: boolean;
  flashSalePrice?: number | null;
  flashSaleEndsAt?: Date | string | null;
  tags?: string[];
  customDescription?: string | null;
}

export function parseProductMeta(
  serviceKey: string,
  name: string,
  description: string | null = "",
  extra?: {
    warrantyText?: string | null;
    warrantyDays?: number | null;
    isFlashSale?: number | boolean | null;
    flashSalePrice?: number | null;
    flashSaleEndsAt?: Date | string | null;
    tags?: string | null;
    customDescription?: string | null;
  }
): StructuredProductMeta {
  const fullDesc = extra?.customDescription || description || "";
  const lower = `${serviceKey} ${name} ${fullDesc}`.toLowerCase();
  
  // Brand
  let brand: StructuredProductMeta["brand"] = "other";
  let brandName = name;
  if (/gemini/i.test(lower)) {
    brand = "gemini";
    brandName = "Gemini Pro";
  } else if (/adobe|express/i.test(lower)) {
    brand = "adobe";
    brandName = "Adobe Express";
  } else if (/duolingo/i.test(lower)) {
    brand = "duolingo";
    brandName = "Duolingo Super";
  } else if (/pocket/i.test(lower)) {
    brand = "pocketfm";
    brandName = "Pocket FM";
  } else if (/chatgpt|gpt/i.test(lower)) {
    brand = "chatgpt";
    brandName = "ChatGPT Plus";
  } else if (/spotify/i.test(lower)) {
    brand = "spotify";
    brandName = "Spotify Premium";
  } else if (/netflix/i.test(lower)) {
    brand = "netflix";
    brandName = "Netflix";
  }

  // Duration
  let durationMonths = 1;
  let durationText = "১ মাস";
  if (/18\s*m|১৮\s*মাস|18\s*month/i.test(lower)) {
    durationMonths = 18;
    durationText = "১৮ মাস";
  } else if (/12\s*m|১২\s*মাস|12\s*month|1\s*year/i.test(lower)) {
    durationMonths = 12;
    durationText = "১২ মাস";
  } else if (/6\s*m|৬\s*মাস|6\s*month/i.test(lower)) {
    durationMonths = 6;
    durationText = "৬ মাস";
  } else if (/3\s*m|৩\s*মাস|3\s*month/i.test(lower)) {
    durationMonths = 3;
    durationText = "৩ মাস";
  }

  // Access type
  const isReady = /readymade|ready-made|readymade id|রেডিমেড/i.test(lower);
  const accessType: "own" | "ready" = isReady ? "ready" : "own";
  const accessTypeText = isReady ? "রেডিমেড আইডি" : "নিজের অ্যাকাউন্টে";

  // Warranty (Honest warranty from database or fallback)
  let warrantyDays = extra?.warrantyDays ?? 0;
  let warrantyText = extra?.warrantyText?.trim() || "";
  if (!warrantyText) {
    if (/duolingo/i.test(lower)) {
      warrantyDays = 0;
      warrantyText = "ওয়ারেন্টি নেই";
    } else if (/5\s*day|৫\s*দিন|5d/i.test(lower) || /adobe|gemini/i.test(lower)) {
      warrantyDays = 5;
      warrantyText = "৫ দিন ওয়ারেন্টি";
    } else if (/30\s*day|৩০\s*দিন|1\s*month/i.test(lower)) {
      warrantyDays = 30;
      warrantyText = "৩০ দিন ওয়ারেন্টি";
    } else {
      warrantyText = "ওয়ারেন্টি নেই";
    }
  }

  // Flash Sale
  const isFlashSale = Boolean(extra?.isFlashSale && Number(extra?.flashSalePrice || 0) > 0);
  const flashSalePrice = isFlashSale ? Number(extra?.flashSalePrice) : null;
  const flashSaleEndsAt = extra?.flashSaleEndsAt || null;

  // Tags
  const rawTags = (extra?.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const tags = rawTags.length > 0 ? rawTags : [];

  // Badges
  const isNew = /new|নতুন|geminilive/i.test(lower) || serviceKey === "geminilive" || tags.some(t => /new|নতুন/i.test(t));
  const isPopular = (/adobe|gemini/i.test(lower) && !isNew) || tags.some(t => /popular|জনপ্রিয়|trending|best/i.test(t));

  // Dynamic description & bullets extraction
  let oneLineBenefit = "প্রিমিয়াম ফিচার ও হাই-স্পিড আনলিমিটেড অ্যাক্সেস";
  let bullets: string[] = [];
  let howItWorks: string[] = [];
  let faqs: Array<{ q: string; a: string }> = [];

  // If admin provided custom dynamic description, parse it directly!
  if (fullDesc && fullDesc.trim().length > 3) {
    const rawLines = fullDesc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bulletLines = rawLines
      .filter(l => /^[-*•–—]|^\d+\./.test(l))
      .map(l => l.replace(/^[-*•–—\d.]+\s*/, "").trim());

    if (bulletLines.length > 0) {
      bullets = bulletLines;
    } else if (rawLines.length > 1) {
      bullets = rawLines.slice(1);
    }

    // Set first line/sentence as the oneLineBenefit
    const firstLine = rawLines[0].replace(/^[-*•–—\d.]+\s*/, "").trim();
    if (firstLine) {
      oneLineBenefit = firstLine;
    }
  }

  // Fallback to default brand presets if bullets are empty
  if (bullets.length === 0) {
    if (brand === "gemini") {
      oneLineBenefit = "Gemini 1.5 Pro ও Advanced AI মডেলের ফুল অ্যাক্সেস";
      bullets = [
        "Gemini Advanced ও ১.৫ প্রো মডেলের আনলিমিটেড অ্যাক্সেস",
        "লং-কনটেক্সট কোডিং, রাইটিং ও মাল্টিমোডাল ফাইল অ্যানালাইসিস",
        "Google Workspace ইন্টিগ্রেশন ও সরাসরি ক্লাউড সাপোর্ট",
        "মোবাইল ও ওয়েব অ্যাপে ঝামেলাহীন ব্যবহার"
      ];
    } else if (brand === "adobe") {
      oneLineBenefit = isReady ? "রেডিমেড আইডি সহ Adobe Express প্রিমিয়ামের পূর্ণ সুবিধা" : "নিজের ইমেইলে Adobe Express ক্রিয়েটিভ সুইটের অ্যাক্সেস";
      bullets = [
        "হাজার হাজার প্রিমিয়াম টেমপ্লেট ও গ্রাফিক্স ডিজাইন টুলস",
        "Photoshop ও Illustrator ওয়েব এডিটিং ও কুইক অ্যাকশন",
        "ব্যাকগ্রাউন্ড রিমুভার, জেনারেটিভ AI ফিল ও রিসাইজ টুল",
        "ফুল ক্লাউড স্টোরেজ ও হাই-রেজুলেশন এক্সপোর্ট"
      ];
    } else if (brand === "duolingo") {
      oneLineBenefit = "বিজ্ঞাপনহীন সুপার লার্নিং, আনলিমিটেড হার্টস ও প্র্যাকটিস টেস্ট";
      bullets = [
        "আনলিমিটেড হার্টস (ভুল হলেও শেখা থামবে না)",
        "সম্পূর্ণ বিজ্ঞাপনমুক্ত ও নিরবচ্ছিন্ন ইন্টারফেস",
        "পারসোনালাইজড মিস্টেক রিভিউ ও স্পিচ প্র্যাকটিস",
        "প্রোগ্রেস কুইজ ও অফলাইন লেসন ডাউনলোড"
      ];
    } else if (brand === "pocketfm") {
      oneLineBenefit = "সব অডিও সিরিজ ও এক্সক্লুসিভ স্টোরিজের আনলিমিটেড স্ট্রিমিং";
      bullets = [
        "জনপ্রিয় রোমান্স, থ্রিলার ও ফ্যান্টাসি অডিও সিরিজের ফুল অ্যাক্সেস",
        "কোনো কয়েন লিমিট নেই—আনলিমিটেড এপিসোড লিসেনিং",
        "বিজ্ঞাপনমুক্ত হাই-কোয়ালিটি অডিও স্ট্রিমিং",
        "অফলাইন লিসেনিংয়ের জন্য এপিসোড ডাউনলোডের সুবিধা"
      ];
    } else {
      bullets = [
        "অফিসিয়াল প্রিমিয়াম ফিচারের নিরবচ্ছিন্ন অ্যাক্সেস",
        "দ্রুত ডেলিভারি ও নিরাপদ অ্যাক্টিভেশন",
        "যেকোনো ডিভাইসে ব্যবহারের নিশ্চয়তা"
      ];
    }
  }

  // How it works
  if (isReady) {
    howItWorks = [
      "অর্ডার সম্পন্ন হলে স্ক্রিনে ও ইমেইলে রেডিমেড লগইন ক্রেডেনশিয়াল পেয়ে যাবেন",
      "অফিসিয়াল পোর্টালে গিয়ে সরাসরি লগইন করে উপভোগ করুন"
    ];
  } else {
    howItWorks = [
      "অর্ডারের সময় আপনার ব্যক্তিগত ইমেইল বা প্রয়োজনীয় তথ্য দিন",
      "পেমেন্ট যাচাইয়ের পর স্বয়ংক্রিয়ভাবে ইনভাইটেশন বা কোড ইমেইলে চলে যাবে",
      "লিংক ক্লিক করে সাথে সাথে অ্যাক্টিভেট করুন"
    ];
  }

  // Default FAQs
  faqs = [
    { q: "অর্ডার করার পর ডেলিভারি কতক্ষণ লাগবে?", a: "পেমেন্ট নিশ্চিত হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে আপনার ইমেইলে ক্রেডেনশিয়াল/কোড চলে যাবে এবং ট্র্যাকিং পেইজে দৃশ্যমান হবে।" },
    { q: "ওয়ারেন্টি কীভাবে ক্লেইম করব?", a: `${warrantyText !== "ওয়ারেন্টি নেই" ? `এই প্রোডাক্টে ${warrantyText} রয়েছে। কোনো সমস্যা হলে আমাদের সাপোর্ট হোয়াটসঅ্যাপ বা ইমেইলে জানালে দ্রুত সমাধান দেওয়া হবে।` : "এই অফারটি স্পেশাল ডিসকাউন্টেড রেটে প্রদান করা হয়েছে বিধায় এতে ওয়ারেন্টি নেই।"}` }
  ];

  return {
    brand,
    brandName,
    planTitle: name,
    durationMonths,
    durationText,
    accessType,
    accessTypeText,
    warrantyDays,
    warrantyText,
    oneLineBenefit,
    bullets,
    howItWorks,
    faqs,
    isNew,
    isPopular,
    isFlashSale,
    flashSalePrice,
    flashSaleEndsAt,
    tags,
    customDescription: fullDesc,
  };
}


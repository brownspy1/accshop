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
}

export function parseProductMeta(serviceKey: string, name: string, description: string | null = ""): StructuredProductMeta {
  const lower = `${serviceKey} ${name} ${description ?? ""}`.toLowerCase();
  
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

  // Warranty (Honest warranty from design.md)
  let warrantyDays = 0;
  let warrantyText = "ওয়ারেন্টি নেই";
  if (/duolingo/i.test(lower)) {
    warrantyDays = 0;
    warrantyText = "ওয়ারেন্টি নেই";
  } else if (/5\s*day|৫\s*দিন|5d/i.test(lower) || /adobe|gemini/i.test(lower)) {
    warrantyDays = 5;
    warrantyText = "৫ দিন ওয়ারেন্টি";
  } else if (/30\s*day|৩০\s*দিন|1\s*month/i.test(lower)) {
    warrantyDays = 30;
    warrantyText = "৩০ দিন ওয়ারেন্টি";
  }

  // Badges
  const isNew = /new|নতুন|geminilive/i.test(lower) || serviceKey === "geminilive";
  const isPopular = /adobe|gemini/i.test(lower) && !isNew;

  // Clean benefits and bullets
  let oneLineBenefit = "প্রিমিয়াম ফিচার ও হাই-স্পিড আনলিমিটেড অ্যাক্সেস";
  let bullets: string[] = [];
  let howItWorks: string[] = [];
  let faqs: Array<{ q: string; a: string }> = [];

  if (brand === "gemini") {
    oneLineBenefit = "Gemini 1.5 Pro ও Advanced AI মডেলের ফুল অ্যাক্সেস";
    bullets = [
      "Gemini Advanced ও ১.৫ প্রো মডেলের আনলিমিটেড অ্যাক্সেস",
      "লং-কনটেক্সট কোডিং, রাইটিং ও মাল্টিমোডাল ফাইল অ্যানালাইসিস",
      "Google Workspace ইন্টিগ্রেশন ও সরাসরি ক্লাউড সাপোর্ট",
      "মোবাইল ও ওয়েব অ্যাপে ঝামেলাহীন ব্যবহার"
    ];
    howItWorks = [
      "অর্ডারের সময় আপনার জিমেইল ঠিকানা প্রদান করুন",
      "পেমেন্ট নিশ্চিত হওয়ার পর আপনার ইমেইলে ইনভাইটেশন বা কোড পাঠানো হবে",
      "লিংক ক্লিক করে নিজের জিমেইলে সাথে সাথে অ্যাক্টিভেট করুন"
    ];
    faqs = [
      { q: "আমার নিজস্ব জিমেইলে কাজ করবে?", a: "হ্যাঁ, এটি সরাসরি আপনার নিজস্ব জিমেইল অ্যাকাউন্টে অ্যাক্টিভেট হবে।" },
      { q: "ওয়ারেন্টি কীভাবে পাব?", a: "অর্ডারের ৫ দিনের মধ্যে কোনো সমস্যা হলে আমাদের সাপোর্ট পেজে মেসেজ দিলে দ্রুত সমাধান দেওয়া হবে।" }
    ];
  } else if (brand === "adobe") {
    oneLineBenefit = isReady ? "রেডিমেড আইডি সহ Adobe Express প্রিমিয়ামের পূর্ণ সুবিধা" : "নিজের ইমেইলে Adobe Express ক্রিয়েটিভ সুইটের অ্যাক্সেস";
    bullets = [
      "হাজার হাজার প্রিমিয়াম টেমপ্লেট ও গ্রাফিক্স ডিজাইন টুলস",
      "Photoshop ও Illustrator ওয়েব এডিটিং ও কুইক অ্যাকশন",
      "ব্যাকগ্রাউন্ড রিমুভার, জেনারেটিভ AI ফিল ও রিসাইজ টুল",
      "ফুল ক্লাউড স্টোরেজ ও হাই-রেজুলেশন এক্সপোর্ট"
    ];
    howItWorks = isReady ? [
      "অর্ডার সম্পন্ন হলে স্ক্রিনে ও ইমেইলে রেডিমেড লগইন ক্রেডেনশিয়াল পেয়ে যাবেন",
      "express.adobe.com-এ গিয়ে সরাসরি লগইন করুন"
    ] : [
      "অর্ডারের সময় আপনার ব্যক্তিগত Adobe/Gmail দিন",
      "পেমেন্ট যাচাইয়ের পর মেম্বারশিপ ইনভাইটেশন ইমেইল চলে যাবে"
    ];
    faqs = [
      { q: "রেডিমেড আইডি ও নিজস্ব অ্যাকাউন্টের পার্থক্য কী?", a: "রেডিমেড আইডিতে আমরা সরাসরি লগইন ইমেইল ও পাসওয়ার্ড প্রদান করি। আর নিজস্ব অ্যাকাউন্টে আপনার দেওয়া ইমেইলে সাবস্ক্রিপশন যুক্ত করা হয়।" }
    ];
  } else if (brand === "duolingo") {
    oneLineBenefit = "বিজ্ঞাপনহীন সুপার লার্নিং, আনলিমিটেড হার্টস ও প্র্যাকটিস টেস্ট";
    bullets = [
      "আনলিমিটেড হার্টস (ভুল হলেও শেখা থামবে না)",
      "সম্পূর্ণ বিজ্ঞাপনমুক্ত ও নিরবচ্ছিন্ন ইন্টারফেস",
      "পারসোনালাইজড মিস্টেক রিভিউ ও স্পিচ প্র্যাকটিস",
      "প্রোগ্রেস কুইজ ও অফলাইন লেসন ডাউনলোড"
    ];
    howItWorks = [
      "অর্ডার কনফার্ম করার পর আপনার ইমেইলে ইনভাইটেশন পাঠানো হবে",
      "ইনভাইটেশন লিংকে ক্লিক করে আপনার বিদ্যমান Duolingo অ্যাকাউন্টে জয়েন করুন"
    ];
    faqs = [
      { q: "আমার আগের লেভেল ও স্ট্রিক থাকবে?", a: "হ্যাঁ, আপনার বিদ্যমান অ্যাকাউন্টের সমস্ত প্রোগ্রেস ও স্ট্রিক অক্ষুণ্ণ থাকবে।" }
    ];
  } else if (brand === "pocketfm") {
    oneLineBenefit = "সব অডিও সিরিজ ও এক্সক্লুসিভ স্টোরিজের আনলিমিটেড স্ট্রিমিং";
    bullets = [
      "জনপ্রিয় রোমান্স, থ্রিলার ও ফ্যান্টাসি অডিও সিরিজের ফুল অ্যাক্সেস",
      "কোনো কয়েন লিমিট নেই—আনলিমিটেড এপিসোড লিসেনিং",
      "বিজ্ঞাপনমুক্ত হাই-কোয়ালিটি অডিও স্ট্রিমিং",
      "অফলাইন লিসেনিংয়ের জন্য এপিসোড ডাউনলোডের সুবিধা"
    ];
    howItWorks = [
      "অর্ডার সম্পন্ন হলে আপনার ইমেইলে অ্যাক্টিভেশন ক্রেডেনশিয়াল/কোড পাঠানো হবে",
      "Pocket FM অ্যাপে গিয়ে কোড সাবমিট করুন বা লগইন করুন"
    ];
    faqs = [
      { q: "অফলাইনে শোনা যাবে?", a: "হ্যাঁ, প্রিমিয়াম সাবস্ক্রিপশনে এপিসোড ডাউনলোড করে ইন্টারনেট ছাড়াই শুনতে পারবেন।" }
    ];
  } else {
    bullets = [
      "অফিসিয়াল প্রিমিয়াম ফিচারের নিরবচ্ছিন্ন অ্যাক্সেস",
      "দ্রুত ডেলিভারি ও নিরাপদ অ্যাক্টিভেশন",
      "যেকোনো ডিভাইসে ব্যবহারের নিশ্চয়তা"
    ];
    howItWorks = [
      "পেমেন্ট সম্পন্ন করুন এবং ট্রানজেকশন আইডি দিন",
      "পেমেন্ট যাচাইয়ের পর কোড আপনার ইমেইলে পাঠানো হবে"
    ];
  }

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
  };
}


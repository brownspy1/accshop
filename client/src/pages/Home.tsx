import React, { useState, useEffect, useMemo, useRef } from "react";
import StoreHeader from "@/components/StoreHeader";
import LiveOrderTicket from "@/components/LiveOrderTicket";
import VoucherCard, { MergedVoucherProduct, VoucherProductItem } from "@/components/VoucherCard";
import ProductDrawer from "@/components/ProductDrawer";
import CheckoutSheet, { CheckoutLineItem } from "@/components/CheckoutSheet";
import { BrandLogoSquircle, BkashIcon, NagadIcon } from "@/components/BrandLogos";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatBn, parseProductMeta } from "@/lib/shop";
import { useCart } from "@/contexts/CartContext";
import { Link } from "wouter";
import {
  Search,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Clock3,
  HelpCircle,
  MessageCircle,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const categories = [
  "সব",
  "AI ও প্রোডাক্টিভিটি",
  "বিনোদন",
  "শেখা",
  "অন্যান্য",
] as const;

function getCategoryFor(key: string, name: string): typeof categories[number] {
  const value = `${key} ${name}`.toLowerCase();
  if (/gemini|adobe|office|ai|express|chatgpt|claude|gpt/.test(value)) return "AI ও প্রোডাক্টিভিটি";
  if (/music|apple|stream|spotify|youtube|netflix|prime|pocket/.test(value)) return "বিনোদন";
  if (/duolingo|learn|language|coursera|udemy/.test(value)) return "শেখা";
  return "অন্যান্য";
}

function groupProductsIntoMergedVouchers(items: VoucherProductItem[]): MergedVoucherProduct[] {
  const groups: Map<string, VoucherProductItem[]> = new Map();

  for (const item of items) {
    const meta = parseProductMeta(item.serviceKey, item.name, item.description);
    const groupKey = meta.brand !== "other" ? meta.brand : item.serviceKey;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }

  const result: MergedVoucherProduct[] = [];
  for (const [key, variants] of groups.entries()) {
    variants.sort((a, b) => a.retailPrice - b.retailPrice);
    const meta = parseProductMeta(variants[0].serviceKey, variants[0].name, variants[0].description);
    result.push({
      id: key,
      name: meta.brandName,
      brand: meta.brand,
      variants,
      selectedVariantIndex: 0,
    });
  }
  return result;
}

export default function Home() {
  const { data: rawProducts = [], isLoading } = trpc.shop.catalog.list.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: storeInfo } = trpc.shop.catalog.storeInfo.useQuery();
  const { add: addToCart, items: cartLines, itemCount } = useCart();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>("সব");
  const [sortBy, setSortBy] = useState<"popular" | "price_low" | "new">("popular");

  // Drawers and Checkout Sheet states
  const [drawerVariant, setDrawerVariant] = useState<VoucherProductItem | null>(null);
  const [drawerVariantsList, setDrawerVariantsList] = useState<VoucherProductItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [checkoutDirectItem, setCheckoutDirectItem] = useState<CheckoutLineItem | null>(null);
  const [isCheckoutSheetOpen, setIsCheckoutSheetOpen] = useState(false);

  // FAQ accordion open states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Email notify state for empty search
  const [notifyEmail, setNotifyEmail] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Hotkey listener: Pressing "/" focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
        window.scrollTo({ top: 180, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate dynamic minimum price
  const minPrice = useMemo(() => {
    if (!rawProducts.length) return "৳৪০";
    const min = Math.min(...rawProducts.map((p) => p.retailPrice));
    return formatMoney(min);
  }, [rawProducts]);

  // Grouped products
  const mergedProducts = useMemo(() => {
    return groupProductsIntoMergedVouchers(rawProducts);
  }, [rawProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let list = mergedProducts.filter((product) => {
      const matchCategory =
        activeCategory === "সব" ||
        product.variants.some((v) => getCategoryFor(v.serviceKey, v.name) === activeCategory);

      const matchSearch =
        search.trim() === "" ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.variants.some(
          (v) =>
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            (v.description && v.description.toLowerCase().includes(search.toLowerCase()))
        );

      return matchCategory && matchSearch;
    });

    if (sortBy === "price_low") {
      list.sort((a, b) => a.variants[0].retailPrice - b.variants[0].retailPrice);
    } else if (sortBy === "new") {
      list.sort((a, b) => {
        const aNew = a.variants.some((v) => /new|geminilive/i.test(v.serviceKey + v.name));
        const bNew = b.variants.some((v) => /new|geminilive/i.test(v.serviceKey + v.name));
        return (bNew ? 1 : 0) - (aNew ? 1 : 0);
      });
    }

    return list;
  }, [mergedProducts, activeCategory, search, sortBy]);

  // Quick-pick products row
  const quickPicks = useMemo(() => {
    return mergedProducts.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      minPrice: p.variants[0].retailPrice,
      variant: p.variants[0],
      allVariants: p.variants,
    }));
  }, [mergedProducts]);

  // Cart total sum
  const cartTotalAmount = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const p = rawProducts.find((item) => item.serviceKey === line.serviceKey);
      return sum + (p ? p.retailPrice * line.quantity : 0);
    }, 0);
  }, [cartLines, rawProducts]);

  const handleOpenDrawer = (variant: VoucherProductItem, allVariants?: VoucherProductItem[]) => {
    setDrawerVariant(variant);
    setDrawerVariantsList(allVariants || [variant]);
    setIsDrawerOpen(true);
  };

  const handleBuyNow = (variant: VoucherProductItem) => {
    setCheckoutDirectItem({
      serviceKey: variant.serviceKey,
      name: variant.name,
      price: variant.retailPrice,
      quantity: 1,
      imageUrl: variant.imageUrl,
    });
    setIsCheckoutSheetOpen(true);
  };

  const handleAddToCart = (variant: VoucherProductItem) => {
    const limit = variant.maxAllowedQuantity ?? Math.min(variant.stock, 10);
    addToCart(variant.serviceKey, 1, limit);
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail) return;
    toast.success(`${search}-এর আপডেট এলে ${notifyEmail}-এ জানানো হবে!`);
    setNotifyEmail("");
  };

  const faqs = [
    {
      q: "আন্তর্জাতিক কার্ড লাগবে?",
      a: "কোনো আন্তর্জাতিক কার্ডের প্রয়োজন নেই। আপনি সরাসরি আপনার পার্সোনাল bKash বা Nagad অ্যাকাউন্ট থেকে Send Money করে যেকোনো ডিজিটাল সার্ভিস ক্রয় করতে পারবেন।",
    },
    {
      q: "কতক্ষণে কোড পাব?",
      a: "পেমেন্ট পাঠিয়ে TrxID দেওয়ার পর অ্যাডমিন সাধারণত ৫ থেকে ১৫ মিনিটের মধ্যে পেমেন্ট ম্যানুয়ালি যাচাই করেন। যাচাই হওয়ামাত্রই আপনার অর্ডার পেজে ও ইমেইলে কোড চলে যাবে।",
    },
    {
      q: "কোড কাজ না করলে কী হবে?",
      a: "যদি কোড বা লগইনে কোনো সমস্যা দেখা দেয়, সাথে সাথে আমাদের WhatsApp সাপোর্টে অর্ডার নম্বরসহ মেসেজ দিন। আমাদের টিম দ্রুত যাচাই করে রিপ্লেসমেন্ট প্রদান করবে।",
    },
    {
      q: "ওয়ারেন্টি কীভাবে কাজ করে?",
      a: "প্রতিটি ভাউচার কার্ডে সততার সাথে ওয়ারেন্টির মেয়াদ উল্লেখ রয়েছে (যেমন: ৫ দিন ওয়ারেন্টি)। উল্লিখিত পুরো সময়ের মধ্যে যেকোনো সমস্যায় আপনি ফ্রি টেকনিক্যাল সাপোর্ট ও রিপ্লেসমেন্ট পাবেন।",
    },
    {
      q: "নিজের অ্যাকাউন্টে অ্যাক্টিভেট হবে?",
      a: 'হ্যাঁ! যেসব প্রোডাক্টের কার্ডে "নিজের অ্যাকাউন্টে" লেখা রয়েছে, সেগুলো আপনার নিজস্ব জিমেইল বা পার্সোনাল আইডিতেই সরাসরি অ্যাক্টিভেট করে দেওয়া হবে।',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--paper)" }}>
      {/* Navbar */}
      <StoreHeader onSearchFocus={() => searchInputRef.current?.focus()} />

      <main className="flex-1">
        {/* =================================================================
            HERO SECTION (Jade Mist Background + Torn Edge)
           ================================================================= */}
        <section
          className="relative pt-8 sm:pt-14 pb-14 sm:pb-20 px-4 sm:px-8 border-b"
          style={{
            backgroundColor: "var(--jade-mist)",
            borderColor: "var(--line)",
          }}
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline, Search, Quick-picks */}
            <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6 text-left">
              <div className="flex flex-col gap-2.5">
                <h1
                  className="font-display font-extrabold text-3xl sm:text-5xl lg:text-[52px] leading-[1.25] tracking-normal"
                  style={{ color: "var(--bottle)" }}
                >
                  কার্ড লাগবে না।
                  <br />
                  bKash করুন, প্রিমিয়াম চালু করুন।
                </h1>
                <p
                  className="text-base sm:text-lg leading-relaxed max-w-xl font-medium"
                  style={{ color: "var(--text-soft)" }}
                >
                  Gemini, ChatGPT, Spotify, Netflix, সব কিছু {minPrice} থেকে। পেমেন্ট যাচাই হলেই কোড চলে যাবে আপনার ইমেইলে।
                </p>
              </div>

              {/* Primary Search Input with Hotkey "/" */}
              <div className="relative w-full max-w-lg">
                <div className="relative flex items-center">
                  <Search
                    size={20}
                    className="absolute left-4 pointer-events-none text-emerald-800/60"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="কী দরকার? যেমন: Gemini, Spotify"
                    className="w-full pl-12 pr-14 py-3.5 sm:py-4 rounded-2xl bg-white text-base text-slate-900 border font-medium shadow-sm outline-none transition-all focus:border-emerald-700"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <kbd
                    className="hidden sm:inline-flex absolute right-4 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200"
                    title="কীবোর্ডে / চাপুন"
                  >
                    /
                  </kbd>
                </div>
              </div>

              {/* Horizontally scrolling quick-pick tiles */}
              {quickPicks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-emerald-900/80">
                    দ্রুত বেছে নিন:
                  </span>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {quickPicks.map((qp) => (
                      <button
                        key={qp.id}
                        type="button"
                        onClick={() => handleOpenDrawer(qp.variant, qp.allVariants)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border text-xs font-bold shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-2xs"
                        style={{
                          borderColor: "var(--line)",
                          color: "var(--bottle)",
                        }}
                      >
                        <BrandLogoSquircle brand={qp.brand} imageUrl={qp.variant.imageUrl} size={22} />
                        <span>{qp.name}</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatMoney(qp.minPrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact Live Ticket on Mobile */}
              <div className="block lg:hidden w-full">
                <LiveOrderTicket compact />
              </div>

              {/* Payment Proof Badge */}
              <div className="flex items-center gap-3 pt-1 text-xs font-semibold text-emerald-950/80">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 border border-emerald-200/60">
                  <BkashIcon size={16} className="text-[#E2136E]" />
                  <NagadIcon size={16} className="text-[#F6921E]" />
                  <span>পেমেন্ট নিরাপদ</span>
                </div>
                <span className="text-slate-400">•</span>
                <span>কোনো হিডেন চার্জ নেই</span>
              </div>
            </div>

            {/* Right Column (Desktop): The One Memorable Moment - Live Order Ticket */}
            <div className="hidden lg:flex lg:col-span-5 justify-center">
              <LiveOrderTicket />
            </div>
          </div>

          {/* Torn-ticket bottom edge */}
          <div
            className="torn-ticket-edge absolute bottom-0 left-0 right-0 pointer-events-none"
            aria-hidden="true"
          />
        </section>

        {/* =================================================================
            PROOF ROW (Honest Facts Only)
           ================================================================= */}
        <section className="border-b bg-white py-4 px-4 sm:px-8" style={{ borderColor: "var(--line)" }}>
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-around gap-4 text-xs sm:text-sm font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <span>bKash ও Nagad-এ সহজ পেমেন্ট</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-600" />
              <span>পেমেন্ট যাচাইয়ের পরই তাৎক্ষণিক ডেলিভারি</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-700" />
              <span>সরাসরি হোয়াটসঅ্যাপে নির্ভরযোগ্য সাপোর্ট</span>
            </div>
          </div>
        </section>

        {/* =================================================================
            CATALOG SECTION (Voucher Wall)
           ================================================================= */}
        <section id="services" className="py-12 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2
                className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight"
                style={{ color: "var(--bottle)" }}
              >
                কী খুঁজছেন?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                পছন্দের ডিজিটাল সাবস্ক্রিপশন বেছে এখনই সক্রিয় করুন
              </p>
            </div>

            {/* Sort chips */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500">সাজান:</span>
              <button
                type="button"
                onClick={() => setSortBy("popular")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === "popular"
                    ? "bg-emerald-900 text-white border-emerald-900"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                জনপ্রিয়
              </button>
              <button
                type="button"
                onClick={() => setSortBy("price_low")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === "price_low"
                    ? "bg-emerald-900 text-white border-emerald-900"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                সবচেয়ে কম দাম
              </button>
              <button
                type="button"
                onClick={() => setSortBy("new")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === "new"
                    ? "bg-emerald-900 text-white border-emerald-900"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                নতুন
              </button>
            </div>
          </div>

          {/* Sticky Category Tabs Bar */}
          <div className="sticky top-18 z-20 py-2.5 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 bg-[#F5F8F6]/95 backdrop-blur-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`filter-chip ${isActive ? "active" : ""}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-[24px] bg-slate-200/60 animate-pulse border"
                  style={{ borderColor: "var(--line)" }}
                />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((product) => (
                <VoucherCard
                  key={product.id}
                  product={product}
                  onOpenDrawer={(variant) => handleOpenDrawer(variant, product.variants)}
                  onBuyNow={(variant) => handleBuyNow(variant)}
                  onAddToCart={(variant) => handleAddToCart(variant)}
                />
              ))}
            </div>
          ) : (
            /* Empty Search Result with Email Notification (Section 9) */
            <div className="p-8 sm:p-12 text-center rounded-[24px] bg-white border max-w-lg mx-auto shadow-sm" style={{ borderColor: "var(--line)" }}>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 grid place-items-center mx-auto mb-4">
                <HelpCircle size={28} />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900">
                "{search}" এখনো নেই।
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 mb-5">
                এই সার্ভিসটি স্টকে এলে সাথে সাথে জানতে আপনার ইমেইল দিয়ে রাখুন:
              </p>
              <form onSubmit={handleNotifySubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="আপনার ইমেইল ঠিকানা দিন"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm outline-none"
                  style={{ borderColor: "var(--line)" }}
                />
                <button type="submit" className="btn-padma text-xs px-4">
                  জানান
                </button>
              </form>
            </div>
          )}
        </section>

        {/* =================================================================
            HOW IT WORKS (The One Dark Block, Bottle Green #0F3D2E)
           ================================================================= */}
        <section
          className="py-16 sm:py-24 px-4 sm:px-8 text-white relative overflow-hidden"
          style={{ backgroundColor: "var(--bottle)" }}
        >
          <div className="max-w-6xl mx-auto flex flex-col gap-10">
            <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                সহজ কার্যপ্রণালী
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
                তিন ধাপে চালু
              </h2>
              <p className="text-sm text-emerald-100/70">
                কোনো জটিলতা ছাড়া মাত্র কয়েক মিনিটের মধ্যে সার্ভিস পেয়ে যান
              </p>
            </div>

            {/* 3 Step Tickets Connected */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div
                className="relative p-6 sm:p-7 rounded-[22px] border flex flex-col gap-4 backdrop-blur-xs"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-200 grid place-items-center font-display font-extrabold text-lg">
                    ১
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">ধাপ ০১</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-xl text-white">
                    সার্ভিস বাছুন
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                    পছন্দের প্রোডাক্ট বেছে <b>এখনই কিনুন</b> চাপুন এবং ডেলিভারি ইমেইল প্রদান করুন।
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className="relative p-6 sm:p-7 rounded-[22px] border flex flex-col gap-4 backdrop-blur-xs"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-200 grid place-items-center font-display font-extrabold text-lg">
                    ২
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">ধাপ ০২</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-xl text-white">
                    bKash বা Nagad-এ পাঠান
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                    দেখানো নম্বরে সঠিক টাকা Send Money করে получен TrxID চেকআউটে বসান।
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className="relative p-6 sm:p-7 rounded-[22px] border flex flex-col gap-4 backdrop-blur-xs"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-200 grid place-items-center font-display font-extrabold text-lg">
                    ৩
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">ধাপ ০৩</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-xl text-white">
                    কোড পেয়ে যান
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                    পেমেন্ট যাচাই হওয়ামাত্রই স্ক্রিনে ও আপনার ইমেইলে অ্যাক্টিভেশন কোড উন্মোচিত হবে।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            FAQ SECTION (Accordion)
           ================================================================= */}
        <section id="faq" className="py-14 sm:py-20 px-4 sm:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight"
              style={{ color: "var(--bottle)" }}
            >
              সাধারণ প্রশ্নোত্তর
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              আপনার প্রশ্নের দ্রুত উত্তর জেনে নিন
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border bg-white overflow-hidden transition-all shadow-2xs"
                  style={{ borderColor: "var(--line)" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-display font-bold text-base text-slate-900"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "transform rotate-180 text-emerald-700" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-sm leading-relaxed text-slate-600 border-t border-slate-100 mt-1">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* =================================================================
          FOOTER (With Legal Notice & Support Link)
         ================================================================= */}
      <footer
        className="border-t py-12 px-4 sm:px-8"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "var(--line)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand column */}
            <div className="md:col-span-2 flex flex-col gap-3 text-left">
              <span className="font-display font-extrabold text-xl text-slate-900">
                AccZone<span className="text-emerald-700 ml-1">Shop</span>
              </span>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
                বাংলাদেশী ব্যবহারকারীদের জন্য প্রিমিয়াম ডিজিটাল সাবস্ক্রিপশন ও অ্যাক্টিভেশন সেবা। কোনো আন্তর্জাতিক কার্ড ছাড়াই bKash বা Nagad-এ পেমেন্ট করুন।
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              <span className="font-bold text-slate-900 mb-1">প্রয়োজনীয় লিংক</span>
              <a href="#services" className="text-slate-600 hover:text-emerald-800 transition-colors">
                সার্ভিসসমূহ
              </a>
              <Link href="/track" className="text-slate-600 hover:text-emerald-800 transition-colors">
                অর্ডার ট্র্যাক করুন
              </Link>
              <Link href="/account" className="text-slate-600 hover:text-emerald-800 transition-colors">
                আমার অ্যাকাউন্ট
              </Link>
            </div>

            {/* Support */}
            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              <span className="font-bold text-slate-900 mb-1">কাস্টমার সাপোর্ট</span>
              <p className="text-xs text-slate-500">
                যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন:
              </p>
              <a
                href="https://wa.me/8801700000000"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-bold text-emerald-700 hover:underline"
              >
                <MessageCircle size={16} />
                <span>WhatsApp সাপোর্ট</span>
              </a>
            </div>
          </div>

          {/* Legal Disclaimer from design.md */}
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] sm:text-xs text-slate-500">
            <p className="text-center sm:text-left">
              সকল ব্র্যান্ড নাম ও লোগো তাদের স্বত্বাধিকারীদের। AccZone কোনো অফিসিয়াল সহযোগী নয়, শুধুমাত্র সাবস্ক্রিপশন ও অ্যাক্টিভেশন সহায়তা প্রদানকারী।
            </p>
            <span>© {new Date().getFullYear()} AccZone Shop. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* =================================================================
          MOBILE STICKY BAR (When Cart Has Items)
         ================================================================= */}
      {itemCount > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden border-t backdrop-blur-md flex items-center justify-between gap-3 shadow-lg"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "var(--line)",
          }}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pl-2">
            <ShoppingBag size={18} className="text-emerald-700" />
            <span>{formatBn(itemCount)} আইটেম</span>
            <span className="text-slate-300">•</span>
            <strong className="font-display font-extrabold text-sm text-emerald-800">
              {formatMoney(cartTotalAmount)}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => {
              setCheckoutDirectItem(null);
              setIsCheckoutSheetOpen(true);
            }}
            className="btn-padma py-2.5 px-5 text-xs shadow-xs"
          >
            পেমেন্ট করুন
          </button>
        </div>
      )}

      {/* Product Drawer */}
      <ProductDrawer
        product={drawerVariant}
        variants={drawerVariantsList}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onBuyNow={(variant) => handleBuyNow(variant)}
        onAddToCart={(variant) => handleAddToCart(variant)}
      />

      {/* Single-Sheet Checkout */}
      <CheckoutSheet
        isOpen={isCheckoutSheetOpen}
        onClose={() => setIsCheckoutSheetOpen(false)}
        directItem={checkoutDirectItem}
      />
    </div>
  );
}

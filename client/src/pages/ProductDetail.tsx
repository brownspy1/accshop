import React, { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatPerMonth, parseProductMeta, StructuredProductMeta } from "@/lib/shop";
import { BrandLogoSquircle } from "@/components/BrandLogos";
import { useCart } from "@/contexts/CartContext";
import StoreHeader from "@/components/StoreHeader";
import {
  Check,
  ShieldCheck,
  Zap,
  Share2,
  Copy,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  LoaderCircle,
  PackageCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const [, paramsP] = useRoute("/p/:serviceKey");
  const [, paramsProduct] = useRoute("/product/:serviceKey");
  const [, setLocation] = useLocation();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);

  const serviceKey = paramsP?.serviceKey || paramsProduct?.serviceKey || "";

  const { data: product, isLoading, error } = trpc.shop.catalog.getBySlug.useQuery(
    { key: serviceKey },
    { enabled: Boolean(serviceKey) }
  );

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — অর্ডার ও ইনস্ট্যান্ট ডেলিভারি | AccShop`;
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F8F6] flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-slate-600 gap-3">
          <LoaderCircle size={32} className="animate-spin text-emerald-700" />
          <p className="font-semibold text-sm">প্রোডাক্টের তথ্য লোড হচ্ছে…</p>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F5F8F6] flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 grid place-items-center mb-4">
            <PackageCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 mb-2">প্রোডাক্ট পাওয়া যায়নি</h1>
          <p className="text-sm text-slate-600 mb-6">
            আপনি যে লিংকটিতে প্রবেশ করেছেন তা বর্তমানে সক্রিয় নেই বা ডিলিট করা হয়েছে।
          </p>
          <Link href="/" className="btn-padma px-6 py-2.5 inline-flex items-center gap-2">
            <ArrowLeft size={16} /> স্টোরে ফিরে যান
          </Link>
        </main>
      </div>
    );
  }

  const meta: StructuredProductMeta = parseProductMeta(
    product.serviceKey,
    product.name,
    product.description,
    product as any
  );

  const isOutOfStock = product.stock < 1;
  const activePrice = meta.isFlashSale && meta.flashSalePrice ? meta.flashSalePrice : product.retailPrice;

  const handleCopyLink = () => {
    const url = window.location.href;
    void navigator.clipboard.writeText(url);
    toast.success("প্রোডাক্ট লিংক কপি হয়েছে!");
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    add(product.serviceKey, quantity, product.stock);
    toast.success(`${product.name} কার্টে যোগ করা হয়েছে!`);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    add(product.serviceKey, quantity, product.stock);
    setLocation("/checkout");
  };

  return (
    <div className="min-h-screen bg-[#F5F8F6] flex flex-col">
      <StoreHeader />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            হোমপেজ
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Product Showcase Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Visuals & Details (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-6">
              {/* Product Header */}
              <div className="flex items-start gap-4">
                <BrandLogoSquircle
                  brand={meta.brand}
                  imageUrl={product.imageUrl}
                  size={68}
                  className="shrink-0 shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {meta.isFlashSale && meta.flashSalePrice && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse inline-flex items-center gap-1">
                        <Zap size={12} fill="currentColor" /> ফ্ল্যাশ সেল
                      </span>
                    )}
                    {meta.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {meta.durationText}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {meta.accessTypeText}
                    </span>
                  </div>

                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 leading-tight">
                    {product.name}
                  </h1>

                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {meta.oneLineBenefit}
                  </p>
                </div>
              </div>

              {/* Flash Sale Highlight Box */}
              {meta.isFlashSale && meta.flashSalePrice && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-red-600 text-white grid place-items-center shrink-0">
                      <Zap size={20} fill="currentColor" />
                    </span>
                    <div>
                      <b className="text-sm font-bold text-red-950 block">সীমিত সময়ের ফ্ল্যাশ সেল!</b>
                      <small className="text-xs text-red-800">
                        এখনই অর্ডার করুন এবং বিশেষ ডিসকাউন্ট মূল্যে ইনস্ট্যান্ট ডেলিভারি পান।
                      </small>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="text-2xl font-extrabold text-red-600 block">
                      {formatMoney(meta.flashSalePrice)}
                    </strong>
                    <span className="text-xs line-through text-slate-400 font-bold">
                      {formatMoney(product.retailPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Dynamic Description Paragraph if present */}
              {meta.customDescription && (
                <div className="p-5 rounded-2xl bg-[#F8FAF9] border border-slate-200 flex flex-col gap-2">
                  <h3 className="font-display font-bold text-sm text-slate-900">প্রোডাক্ট বিবরণ ও ফিচার</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {meta.customDescription}
                  </p>
                </div>
              )}

              {/* Feature Bullets */}
              <div className="flex flex-col gap-3">
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Zap size={18} className="text-emerald-700" />
                  কী কী সুবিধা পাবেন
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {meta.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center shrink-0 mt-0.5">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* How it works */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <h3 className="font-display font-bold text-sm text-emerald-950 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-700" />
                  কীভাবে চালু হবে
                </h3>
                <ol className="flex flex-col gap-2">
                  {meta.howItWorks.map((stepText, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-emerald-900 leading-relaxed">
                      <span className="font-bold text-emerald-700">{idx + 1}.</span>
                      <span>{stepText}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Warranty & Terms */}
              <div className="flex flex-col gap-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800">ওয়ারেন্টি ও শর্ত</h4>
                <p className="leading-relaxed">
                  {meta.warrantyDays > 0 || meta.warrantyText !== "ওয়ারেন্টি নেই" ? (
                    <>
                      এই প্রোডাক্টে <b>{meta.warrantyText}</b> প্রযোজ্য। মেয়াদের মধ্যে যেকোনো সমস্যায় আমাদের সাপোর্ট হোয়াটসঅ্যাপে যোগাযোগ করলে তাৎক্ষণিক রিপ্লেসমেন্ট সুবিধা পাবেন।
                    </>
                  ) : (
                    <>
                      এই প্রোডাক্টটি স্পেশাল ডিসকাউন্টেড রেটে প্রদান করা হয়েছে বিধায় এতে <b>ওয়ারেন্টি নেই</b>। অ্যাক্টিভেশনের সময় সম্পূর্ণ নিশ্চিত হয়ে প্রদান করা হয়।
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Checkout Box & Stock (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-6">
            <div className="bg-white rounded-[24px] p-6 border border-slate-200/80 shadow-sm flex flex-col gap-5">
              {/* Price display */}
              <div className="flex items-baseline justify-between border-b pb-4">
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">মূল্য</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <strong className="font-display font-extrabold text-3xl sm:text-4xl text-[#0F3D2E]">
                      {formatMoney(activePrice)}
                    </strong>
                    {meta.isFlashSale && meta.flashSalePrice && (
                      <span className="text-sm line-through text-slate-400 font-bold">
                        {formatMoney(product.retailPrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-800/80 font-medium mt-1 block">
                    {formatPerMonth(activePrice, meta.durationMonths)}
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isOutOfStock
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isOutOfStock ? "bg-red-500" : "bg-emerald-500"}`} />
                    {isOutOfStock ? "স্টক শেষ" : `${product.stock}টি স্টকে আছে`}
                  </span>
                </div>
              </div>

              {/* Quantity selector */}
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">পরিমাণ (Quantity)</span>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 font-bold text-sm"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold text-slate-900 bg-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 font-bold text-sm"
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all ${
                    isOutOfStock
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "btn-padma text-white"
                  }`}
                >
                  <ShoppingBag size={17} />
                  {isOutOfStock ? "বর্তমানে স্টক নেই" : "এখনই কিনুন (Buy Now)"}
                  {!isOutOfStock && <ArrowRight size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="w-full py-3 px-5 rounded-xl font-bold text-xs border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  কার্টে যোগ করুন
                </button>
              </div>

              {/* Share and Copy Live Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-800 transition-colors py-2 border-t border-slate-100"
              >
                <Share2 size={14} /> এই প্রোডাক্ট লিংক কপি করুন
              </button>

              {/* Trust Indicators */}
              <div className="bg-[#F8FAF9] rounded-2xl p-4 border border-slate-200/80 flex flex-col gap-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-700 shrink-0" />
                  <span>পেমেন্ট নিশ্চিত হলে সাথে সাথে ডেলিভারি</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-700 shrink-0" />
                  <span>বিকাশ, নগদ বা ব্যাংক ট্রান্সফারে পেমেন্ট</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-700 shrink-0" />
                  <span>{meta.warrantyText}</span>
                </div>
              </div>
            </div>

            {/* Back to Catalog Link */}
            <Link
              href="/"
              className="text-center text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} /> অন্যান্য সব প্রোডাক্ট দেখুন
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

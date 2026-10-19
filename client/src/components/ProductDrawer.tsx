import React, { useEffect } from "react";
import { BrandLogoSquircle } from "./BrandLogos";
import { VoucherProductItem } from "./VoucherCard";
import { formatMoney, formatPerMonth, parseProductMeta, StructuredProductMeta } from "@/lib/shop";
import { X, Check, ShoppingBag, ShieldCheck, Zap, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface ProductDrawerProps {
  product: VoucherProductItem | null;
  variants?: VoucherProductItem[];
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (variant: VoucherProductItem) => void;
  onAddToCart: (variant: VoucherProductItem) => void;
}

export default function ProductDrawer({
  product,
  variants = [],
  isOpen,
  onClose,
  onBuyNow,
  onAddToCart,
}: ProductDrawerProps) {
  const [selectedVariant, setSelectedVariant] = React.useState<VoucherProductItem | null>(product);

  useEffect(() => {
    setSelectedVariant(product);
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !selectedVariant) return null;

  const meta: StructuredProductMeta = parseProductMeta(
    selectedVariant.serviceKey,
    selectedVariant.name,
    selectedVariant.description
  );

  const isOutOfStock = selectedVariant.stock < 1;

  const handleBuy = () => {
    if (isOutOfStock) return;
    onBuyNow(selectedVariant);
    onClose();
  };

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(selectedVariant);
    toast.success(`${selectedVariant.name} কার্টে যোগ করা হয়েছে!`);
  };

  const availableVariants = variants.length > 0 ? variants : [selectedVariant];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* Drawer Container: bottom sheet on mobile, right drawer on desktop */}
      <div
        className="relative w-full max-w-lg h-[92vh] sm:h-full mt-auto sm:mt-0 bg-white rounded-t-[28px] sm:rounded-t-none sm:rounded-l-[28px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "var(--sh-sheet)",
        }}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0" />

        {/* Drawer Header */}
        <div
          className="p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0"
          style={{ backgroundColor: "var(--jade-mist)", borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <BrandLogoSquircle brand={meta.brand} size={52} />
            <div className="min-w-0">
              <h2 className="font-display font-bold text-xl leading-snug text-slate-900 truncate">
                {selectedVariant.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 text-emerald-900 border border-emerald-200">
                  {meta.durationText}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 text-slate-700 border border-slate-200">
                  {meta.accessTypeText}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white grid place-items-center transition-colors shrink-0"
            aria-label="বন্ধ করুন"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Variant Switcher Segmented Control */}
          {availableVariants.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700">ভ্যারিয়েন্ট বাছাই করুন</span>
              <div
                className="flex p-1 rounded-xl gap-1.5 border"
                style={{ backgroundColor: "#F5F8F6", borderColor: "var(--line)" }}
              >
                {availableVariants.map((v) => {
                  const vMeta = parseProductMeta(v.serviceKey, v.name, v.description);
                  const isSelected = v.serviceKey === selectedVariant.serviceKey;
                  return (
                    <button
                      key={v.serviceKey}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? "bg-white shadow-xs border border-emerald-300 text-emerald-900"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>{vMeta.accessTypeText}</span>
                      <span className="text-[11px] font-extrabold text-emerald-700">
                        {formatMoney(v.retailPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 1: কী পাবেন (Parsed bullets) */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-emerald-700" />
              কী কী পাবেন
            </h3>
            <ul className="flex flex-col gap-2.5">
              {meta.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-700 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: কীভাবে চালু হবে */}
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

          {/* Section 3: ওয়ারেন্টি ও শর্ত */}
          <div className="flex flex-col gap-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800">ওয়ারেন্টি ও শর্ত</h4>
            <p className="leading-relaxed">
              {meta.warrantyDays > 0 ? (
                <>
                  এই প্রোডাক্টে <b>{meta.warrantyText}</b> প্রযোজ্য। এই মেয়াদে সাবস্ক্রিপশনে কোনো সমস্যা হলে সরাসরি আমাদের সাপোর্ট হোয়াটসঅ্যাপে জানালে ফ্রি রিপ্লেসমেন্ট প্রদান করা হবে।
                </>
              ) : (
                <>
                  এই অফারটি স্পেশাল ডিসকাউন্টেড রেটে প্রদান করা হয়েছে বিধায় এতে <b>ওয়ারেন্টি নেই</b>। অ্যাক্টিভেশনের সময় নিশ্চিত হয়ে ডেলিভারি সম্পন্ন করা হয়।
                </>
              )}
            </p>
          </div>

          {/* Section 4: এই প্রোডাক্টের প্রশ্নোত্তর */}
          {meta.faqs.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <HelpCircle size={16} className="text-slate-500" />
                সাধারণ প্রশ্নোত্তর
              </h3>
              <div className="flex flex-col gap-2.5">
                {meta.faqs.map((faq, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200/80 bg-white">
                    <h5 className="font-bold text-xs text-slate-800">{faq.q}</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer */}
        <div
          className="p-4 sm:p-5 border-t flex items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
        >
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 font-medium">সর্বমোট মূল্য</span>
            <strong className="font-display font-extrabold text-2xl text-slate-900">
              {formatMoney(selectedVariant.retailPrice)}
            </strong>
            <span className="text-[10px] text-emerald-800 font-semibold">
              {formatPerMonth(selectedVariant.retailPrice, meta.durationMonths)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="cart-icon-btn"
              disabled={isOutOfStock}
              title="কার্টে যোগ করুন"
              aria-label="কার্টে যোগ করুন"
            >
              <ShoppingBag size={18} />
            </button>
            <button
              type="button"
              onClick={handleBuy}
              disabled={isOutOfStock}
              className="btn-padma px-6 shadow-sm"
            >
              {isOutOfStock ? "স্টক শেষ" : "এখনই কিনুন"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

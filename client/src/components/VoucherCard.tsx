import React, { useState } from "react";
import { BrandLogoSquircle } from "./BrandLogos";
import { formatMoney, formatPerMonth, formatBn, parseProductMeta, StructuredProductMeta } from "@/lib/shop";
import { ShoppingBag, ShieldAlert, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export interface VoucherProductItem {
  serviceKey: string;
  name: string;
  description: string | null;
  customDescription?: string | null;
  imageUrl?: string;
  stock: number;
  stockFresh: boolean;
  retailPrice: number;
  priceReviewRequired?: number | boolean;
  quantityTiers?: Array<{ minQuantity: number; maxQuantity: number }>;
  maxAllowedQuantity?: number;
}

export interface MergedVoucherProduct {
  id: string;
  name: string;
  brand: string;
  variants: VoucherProductItem[];
  selectedVariantIndex: number;
}

interface VoucherCardProps {
  product: MergedVoucherProduct;
  onOpenDrawer: (variant: VoucherProductItem) => void;
  onBuyNow: (variant: VoucherProductItem) => void;
  onAddToCart: (variant: VoucherProductItem) => void;
}

export default function VoucherCard({
  product,
  onOpenDrawer,
  onBuyNow,
  onAddToCart,
}: VoucherCardProps) {
  const [variantIndex, setVariantIndex] = useState(0);
  const activeVariant = product.variants[variantIndex] || product.variants[0];

  const meta: StructuredProductMeta = parseProductMeta(
    activeVariant.serviceKey,
    activeVariant.name,
    activeVariant.description
  );

  const isOutOfStock = activeVariant.stock < 1;
  const isLowStock = activeVariant.stock > 0 && activeVariant.stock < 50;
  const isCriticalStock = activeVariant.stock > 0 && activeVariant.stock < 20;

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicked on an interactive button or control, ignore
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    onOpenDrawer(activeVariant);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(activeVariant);
    toast.success(`${activeVariant.name} কার্টে যোগ করা হয়েছে!`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onBuyNow(activeVariant);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`voucher-card cursor-pointer group select-none transition-all ${
        isOutOfStock ? "opacity-75" : ""
      }`}
      aria-label={`${product.name} ভাউচার`}
    >
      {/* Voucher Top Body */}
      <div className="p-5 sm:p-6 flex flex-col gap-3.5 flex-1 bg-white">
        {/* Header: Logo Squircle + Title + Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <BrandLogoSquircle
              brand={meta.brand}
              size={56}
              className={`group-hover:scale-105 transition-transform ${isOutOfStock ? "grayscale" : ""}`}
            />
            <div className="min-w-0 flex flex-col">
              <h3 className="font-display font-bold text-lg sm:text-[19px] leading-tight text-slate-900 truncate">
                {product.name}
              </h3>
              <span className="text-xs text-slate-500 font-medium mt-0.5">
                {meta.durationText} অ্যাক্সেস
              </span>
            </div>
          </div>

          {/* Badges: জনপ্রিয় (Marigold) or নতুন (Jade Mist) */}
          {meta.isPopular && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight shadow-2xs shrink-0"
              style={{ backgroundColor: "var(--marigold)", color: "var(--bottle)" }}
            >
              <Sparkles size={12} />
              জনপ্রিয়
            </span>
          )}
          {meta.isNew && !meta.isPopular && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight shrink-0 border"
              style={{
                backgroundColor: "var(--jade-mist)",
                color: "var(--padma)",
                borderColor: "var(--line)",
              }}
            >
              নতুন
            </span>
          )}
        </div>

        {/* Variant switch control if merged (e.g. নিজের অ্যাকাউন্টে vs রেডিমেড আইডি) */}
        {product.variants.length > 1 && (
          <div
            className="flex p-1 rounded-xl gap-1 mt-1 border"
            style={{ backgroundColor: "#F3F7F5", borderColor: "var(--line)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {product.variants.map((v, idx) => {
              const vMeta = parseProductMeta(v.serviceKey, v.name, v.description);
              const isSelected = idx === variantIndex;
              return (
                <button
                  key={v.serviceKey}
                  type="button"
                  onClick={() => setVariantIndex(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    isSelected
                      ? "bg-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{
                    color: isSelected ? "var(--bottle)" : undefined,
                  }}
                >
                  {vMeta.accessTypeText}
                </button>
              );
            })}
          </div>
        )}

        {/* Chips Row: Duration, Access Type, Honest Warranty */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className="px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ backgroundColor: "#EDF5F0", color: "var(--bottle)" }}
          >
            {meta.durationText}
          </span>
          <span
            className="px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ backgroundColor: "#F1F5F9", color: "#334155" }}
          >
            {meta.accessTypeText}
          </span>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
              meta.warrantyDays > 0
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {meta.warrantyText}
          </span>
        </div>

        {/* One-line clean Bangla benefit */}
        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600 line-clamp-2 mt-0.5">
          {meta.oneLineBenefit}
        </p>

        {/* Stock progress bar: Shown ONLY when stock is low (< 50) */}
        {isLowStock && (
          <div className="pt-1.5 flex flex-col gap-1.5" aria-live="polite">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span
                style={{
                  color: isCriticalStock ? "var(--coral)" : "#B45309",
                }}
              >
                {formatBn(activeVariant.stock)}টি বাকি
              </span>
              <span className="text-[10px] text-slate-400">সীমিত স্টক</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(10, (activeVariant.stock / 50) * 100))}%`,
                  backgroundColor: isCriticalStock ? "var(--coral)" : "var(--marigold)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Perforation Line with Side Circular Notches */}
      <div className="voucher-perforation" aria-hidden="true">
        <div className="voucher-notch-left" />
        <div className="voucher-dashed-line" />
        <div className="voucher-notch-right" />
      </div>

      {/* Price Stub (Jade Mist Background) */}
      <div className="voucher-stub">
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1.5">
            <strong
              className="font-display font-extrabold text-2xl sm:text-[28px] tracking-tight"
              style={{ color: "var(--bottle)" }}
            >
              {formatMoney(activeVariant.retailPrice)}
            </strong>
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-emerald-800/80">
            {formatPerMonth(activeVariant.retailPrice, meta.durationMonths)}
          </span>
        </div>

        {/* Actions: Primary "এখনই কিনুন" + Cart Icon */}
        <div className="flex items-center gap-2">
          {isOutOfStock ? (
            <button
              type="button"
              onClick={handleBuyNow}
              className="btn-secondary-mist text-xs sm:text-sm px-3.5"
              title="স্টক শেষ"
            >
              স্টক এলে জানান
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBuyNow}
                className="btn-padma text-xs sm:text-sm shadow-xs"
              >
                এখনই কিনুন
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="cart-icon-btn"
                aria-label={`${activeVariant.name} কার্টে যোগ করুন`}
                title="কার্টে যোগ করুন"
              >
                <ShoppingBag size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

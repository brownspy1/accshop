import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/shop";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Layers,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

export type Product = {
  serviceKey: string;
  name: string;
  description: string | null;
  customDescription?: string | null;
  originalDescription?: string | null;
  imageUrl?: string;
  stock: number;
  stockFresh: boolean;
  stockSyncedAt?: string | Date | null;
  retailPrice: number;
  priceReviewRequired?: number | boolean;
  quantityTiers?: Array<{ minQuantity: number; maxQuantity: number }>;
  maxAllowedQuantity?: number;
};

interface ProductDetailsModalProps {
  product: Product | null;
  currency: string;
  onClose: () => void;
  category: string;
}

export default function ProductDetailsModal({
  product,
  currency,
  onClose,
  category,
}: ProductDetailsModalProps) {
  const { add } = useCart();
  const [, setLocation] = useLocation();

  const minQty = product?.quantityTiers?.[0]?.minQuantity ?? 1;
  const maxQty = product?.maxAllowedQuantity ?? Math.min(product?.stock ?? 10, 10);
  const [quantity, setQuantity] = useState(minQty);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);

  useEffect(() => {
    if (product) {
      const initialMin = product.quantityTiers?.[0]?.minQuantity ?? 1;
      setQuantity(initialMin);
      setSelectedTierIndex(0);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const isOutOfStock = product.stock < 1;
  const isStale = !product.stockFresh;
  const isReview = Boolean(product.priceReviewRequired);
  const canBuy = !isOutOfStock && !isStale && !isReview;

  const handleAddToCart = () => {
    if (!canBuy) return;
    add(product.serviceKey, quantity, maxQty);
    toast.success(`${product.name} (${quantity}টি) কার্টে যোগ করা হয়েছে!`);
    onClose();
  };

  const handleBuyNow = () => {
    if (!canBuy) return;
    add(product.serviceKey, quantity, maxQty);
    onClose();
    setLocation("/checkout");
  };

  const handleSelectTier = (index: number, tierMin: number) => {
    setSelectedTierIndex(index);
    setQuantity(tierMin);
  };

  const handleQtyChange = (delta: number) => {
    setQuantity(prev => {
      const next = prev + delta;
      if (next < minQty) return minQty;
      if (next > maxQty) return maxQty;
      return next;
    });
  };

  const totalPrice = product.retailPrice * quantity;

  // Extract variations if present from quantity tiers
  const tiers = product.quantityTiers || [];

  return (
    <div className="product-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="product-modal-card" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="product-modal-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={20} />
        </button>

        <div className="product-modal-content">
          {/* Left Column: Visual & Guarantee */}
          <div className="product-modal-visual">
            <div className="product-modal-image-box">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="product-modal-image"
                />
              ) : (
                <div className="product-modal-placeholder">
                  <div className="placeholder-mark">
                    <span>{product.serviceKey.slice(0, 2).toUpperCase()}</span>
                    <Sparkles className="placeholder-spark" size={24} />
                  </div>
                  <span className="placeholder-tag">{category}</span>
                </div>
              )}
            </div>

            <div className="product-modal-trust-box">
              <div className="trust-item">
                <Zap size={16} className="trust-icon zap" />
                <div>
                  <strong>দ্রুত অ্যাক্টিভেশন</strong>
                  <p>পেমেন্ট ভেরিফাই হওয়ার সাথে সাথে কোড পাবেন</p>
                </div>
              </div>
              <div className="trust-item">
                <ShieldCheck size={16} className="trust-icon shield" />
                <div>
                  <strong>১০০% অরিজিনাল ডিজিটাল পণ্য</strong>
                  <p>ভেরিফাইড সাপ্লায়ার সোর্স থেকে সংগ্রহকৃত</p>
                </div>
              </div>
              <div className="trust-item">
                <PackageCheck size={16} className="trust-icon track" />
                <div>
                  <strong>সহজ অর্ডার ট্র্যাকিং</strong>
                  <p>যেকোনো সময় Order ID দিয়ে কোড রিট্রিভ করুন</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Information, Variations & Actions */}
          <div className="product-modal-details">
            <div className="product-modal-header">
              <div className="header-meta">
                <span className="modal-category-chip">{category}</span>
                <span className={`availability-badge ${isOutOfStock ? "out" : ""} ${isStale ? "stale" : ""}`}>
                  <i /> {isOutOfStock ? "স্টক নেই" : isStale ? "Stock stale" : "Live Supplier Stock"}
                </span>
                {product.customDescription && (
                  <span className="reseller-badge">
                    <CheckCircle2 size={12} /> ভেরিফাইড বিবরণ
                  </span>
                )}
              </div>
              <h1 id="modal-title" className="product-modal-title">
                {product.name}
              </h1>
            </div>

            {/* Price Box */}
            <div className="product-modal-price-box">
              <div className="unit-price">
                <small>খুচরা মূল্য</small>
                <strong>{formatMoney(product.retailPrice, currency)}</strong>
                {quantity > 1 && (
                  <span className="multi-total">
                    মোট: <b>{formatMoney(totalPrice, currency)}</b> ({quantity}টি)
                  </span>
                )}
              </div>
              <div className="stock-info">
                <PackageCheck size={14} />
                <span>{product.stock}টি উপলব্ধ</span>
              </div>
            </div>

            {/* Review or Stale Warnings */}
            {isReview && (
              <div className="modal-warning">
                <AlertTriangle size={15} />
                <span>Supplier currency review চলছে; সাময়িকভাবে অর্ডার গ্রহণ বন্ধ আছে।</span>
              </div>
            )}
            {isStale && !isReview && (
              <div className="modal-warning">
                <AlertTriangle size={15} />
                <span>সাপ্লায়ারের স্টক আপডেট যাচাই হচ্ছে; রিফ্রেশ না হওয়া পর্যন্ত অপেক্ষা করুন।</span>
              </div>
            )}

            {/* Description Section */}
            <div className="product-modal-description">
              <h3>সার্ভিস বিবরণ</h3>
              <div className="description-text">
                {product.description ? (
                  product.description.split("\n").map((line, idx) => (
                    line.trim() ? <p key={idx}>{line}</p> : <br key={idx} />
                  ))
                ) : (
                  <p>ডিজিটাল অ্যাক্টিভেশন সার্ভিস। পেমেন্ট সম্পন্ন হওয়ার পর স্বয়ংক্রিয়ভাবে অ্যাক্টিভেশন সম্পন্ন হবে।</p>
                )}
              </div>
            </div>

            {/* Variations / Package Tiers if available */}
            {tiers.length > 0 && (
              <div className="product-modal-variations">
                <div className="variations-header">
                  <Layers size={14} />
                  <span>প্যাকেজ / ভ্যারিয়েশন সিলেক্ট করুন</span>
                </div>
                <div className="variation-options">
                  {tiers.map((tier, idx) => {
                    const isSelected = selectedTierIndex === idx;
                    const label = tier.minQuantity === tier.maxQuantity
                      ? `${tier.minQuantity} Unit Pack`
                      : `${tier.minQuantity} - ${tier.maxQuantity} Units`;
                    return (
                      <button
                        type="button"
                        key={idx}
                        className={`variation-btn ${isSelected ? "active" : ""}`}
                        onClick={() => handleSelectTier(idx, tier.minQuantity)}
                      >
                        <span className="tier-label">{label}</span>
                        <span className="tier-price">{formatMoney(product.retailPrice * tier.minQuantity, currency)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {canBuy && (
              <div className="product-modal-qty-row">
                <span className="qty-label">পরিমাণ (Quantity):</span>
                <div className="qty-counter">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(-1)}
                    disabled={quantity <= minQty}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={quantity >= maxQty}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <small className="qty-range">(সর্বোচ্চ {maxQty}টি পর্যন্ত)</small>
              </div>
            )}

            {/* Action Buttons */}
            <div className="product-modal-actions">
              <button
                type="button"
                className="button button-primary modal-buy-btn"
                disabled={!canBuy}
                onClick={handleBuyNow}
              >
                <Zap size={16} />
                <span>সরাসরি অর্ডার করুন</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="button button-secondary modal-cart-btn"
                disabled={!canBuy}
                onClick={handleAddToCart}
              >
                <ShoppingBag size={16} />
                <span>কার্টে যোগ করুন</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ArrowRight, Search, ShoppingBag, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span>A</span>
      </span>
      <span className="brand-name">
        AccZone<span>Shop</span>
      </span>
    </span>
  );
}

export default function StoreHeader() {
  const { itemCount } = useCart();
  const [location] = useLocation();

  return (
    <header className="store-header">
      <Link href="/" className="brand-link" aria-label="AccZone Shop home">
        <BrandMark />
      </Link>
      <nav className="store-nav" aria-label="Main navigation">
        <a href={location === "/" ? "#services" : "/#services"} className={location === "/" ? "active" : ""}>
          সার্ভিস
        </a>
        <Link href="/track" className={location.startsWith("/track") ? "active" : ""}>
          অর্ডার ট্র্যাক
        </Link>
        <Link href="/account" className={location === "/account" ? "active" : ""}>
          আমার account
        </Link>
      </nav>
      <div className="header-actions">
        <a className="icon-link search-link" href={location === "/" ? "#services" : "/#services"} aria-label="সার্ভিস খুঁজুন" title="সার্ভিস খুঁজুন">
          <Search size={18} />
        </a>
        <Link className={`icon-link account-link ${location === "/account" ? "active" : ""}`} href="/account" aria-label="Customer account" title="Customer account">
          <UserRound size={17} />
        </Link>
        <Link href="/checkout" className={`cart-link ${itemCount > 0 ? "has-items" : ""}`} aria-label={`কার্ট, ${itemCount}টি পণ্য`}>
          <ShoppingBag size={18} />
          <span>কার্ট</span>
          {itemCount > 0 && <b>{itemCount}</b>}
          <ArrowRight className="cart-arrow" size={14} />
        </Link>
      </div>
    </header>
  );
}

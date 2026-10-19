import { Search, ShoppingBag, UserRound, Headphones } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { formatBn } from "@/lib/shop";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${compact ? "scale-90" : ""}`}>
      <span
        className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-white text-lg shadow-sm"
        style={{ backgroundColor: "var(--bottle)", color: "#ffffff" }}
        aria-hidden="true"
      >
        A
      </span>
      <span className="font-display font-extrabold text-lg tracking-tight" style={{ color: "var(--bottle)" }}>
        AccZone<span className="font-semibold text-emerald-700 ml-1">Shop</span>
      </span>
    </span>
  );
}

export default function StoreHeader({ onSearchFocus }: { onSearchFocus?: () => void }) {
  const { itemCount } = useCart();
  const [location] = useLocation();

  const handleSearchClick = (e: React.MouseEvent) => {
    if (onSearchFocus) {
      e.preventDefault();
      onSearchFocus();
    }
  };

  return (
    <header
      className="sticky top-0 z-50 h-18 px-4 sm:px-8 flex items-center justify-between border-b backdrop-blur-md"
      style={{
        backgroundColor: "rgba(245, 248, 246, 0.94)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="inline-flex items-center focus:outline-none" aria-label="AccZone Shop home">
          <BrandMark />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-[15px] font-semibold" style={{ color: "var(--text-soft)" }}>
          <a
            href="/#services"
            className="hover:text-emerald-800 transition-colors py-1"
            style={{ color: location === "/" ? "var(--padma)" : undefined }}
          >
            সার্ভিস
          </a>
          <Link
            href="/track"
            className="hover:text-emerald-800 transition-colors py-1"
            style={{ color: location.startsWith("/track") ? "var(--padma)" : undefined }}
          >
            অর্ডার ট্র্যাক
          </Link>
          <Link
            href="/account"
            className="hover:text-emerald-800 transition-colors py-1"
            style={{ color: location === "/account" ? "var(--padma)" : undefined }}
          >
            আমার অ্যাকাউন্ট
          </Link>
          <a
            href="/#faq"
            className="hover:text-emerald-800 transition-colors py-1"
          >
            সাপোর্ট
          </a>
        </nav>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        <a
          href="/#services"
          onClick={handleSearchClick}
          className="w-10 h-10 rounded-xl grid place-items-center transition-colors hover:bg-emerald-100/60"
          style={{ color: "var(--bottle)" }}
          aria-label="কী খুঁজছেন সার্চ করুন"
          title="কী দরকার? সার্চ করুন"
        >
          <Search size={19} />
        </a>

        <Link
          href="/account"
          className="w-10 h-10 rounded-xl grid place-items-center transition-colors hover:bg-emerald-100/60"
          style={{ color: location === "/account" ? "var(--padma)" : "var(--bottle)" }}
          aria-label="আমার অ্যাকাউন্ট"
          title="আমার অ্যাকাউন্ট"
        >
          <UserRound size={19} />
        </Link>

        <Link
          href="/checkout"
          className="inline-flex items-center gap-2 h-11 px-3.5 sm:px-4 rounded-xl font-bold text-sm transition-transform active:scale-95"
          style={{
            backgroundColor: itemCount > 0 ? "var(--padma)" : "var(--jade-mist)",
            color: itemCount > 0 ? "#ffffff" : "var(--bottle)",
          }}
          aria-label={`কার্ট, ${itemCount}টি আইটেম`}
        >
          <ShoppingBag size={18} />
          <span className="hidden xs:inline">কার্ট</span>
          {itemCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-black"
              style={{
                backgroundColor: itemCount > 0 ? "var(--marigold)" : "var(--padma)",
                color: itemCount > 0 ? "var(--bottle)" : "#ffffff",
              }}
            >
              {formatBn(itemCount)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

import StoreHeader from "@/components/StoreHeader";
import ProductDetailsModal, { Product } from "@/components/ProductDetailsModal";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/shop";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, CreditCard, Info, LockKeyhole, PackageCheck, Search, ShieldCheck, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const categories = ["সব সার্ভিস", "AI & Productivity", "Entertainment", "Learning", "Other"];
function categoryFor(key: string, name: string) {
  const value = `${key} ${name}`.toLowerCase();
  if (/gemini|adobe|office|ai|express/.test(value)) return "AI & Productivity";
  if (/music|apple|stream|spotify|youtube|netflix/.test(value)) return "Entertainment";
  if (/duolingo|learn|language/.test(value)) return "Learning";
  return "Other";
}
function shortLabel(key: string) {
  const clean = key.split(/[_-]/)[0]?.toLowerCase() ?? "AZ";
  return clean.slice(0, 2).toUpperCase();
}

export default function Home() {
  const { data: products = [], isLoading, error } = trpc.shop.catalog.list.useQuery(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: true });
  const { data: store } = trpc.shop.catalog.storeInfo.useQuery();
  const { add, itemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState("সব সার্ভিস");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Auto-open product modal if URL has ?product=... or #product-...
  useEffect(() => {
    if (!products.length) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productKey = urlParams.get("product") || (window.location.hash.startsWith("#product-") ? window.location.hash.replace("#product-", "") : null);
    if (productKey) {
      const found = products.find(p => p.serviceKey === productKey);
      if (found) setSelectedProduct(found);
    }
  }, [products]);

  const shown = useMemo(() => products.filter(item => {
    const category = categoryFor(item.serviceKey, item.name);
    return (activeCategory === "সব সার্ভিস" || category === activeCategory)
      && `${item.name} ${item.serviceKey} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase());
  }), [products, activeCategory, search]);
  const freshStockCount = products.filter(item => item.stockFresh).length;

  return <div className="shop-page">
    <StoreHeader />
    <main>
      <section className="hero container-wide">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> ডিজিটাল অ্যাক্টিভেশন, সহজ ও স্বচ্ছ</div>
          <h1>আপনার পরের<br /><span>digital unlock</span><br />এখানেই।</h1>
          <p>পছন্দের সার্ভিস বেছে নিন। পেমেন্ট যাচাই হলে আমরা নিরাপদে অ্যাক্টিভেশন সম্পন্ন করব—প্রতিটি ধাপের খবর থাকবে আপনার কাছে।</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#services">সার্ভিস দেখুন <ArrowDown size={16} /></a>
            <Link className="button button-secondary" href="/track">অর্ডার ট্র্যাক <ArrowUpRight size={15} /></Link>
          </div>
          <div className="hero-proof"><div className="proof-avatars"><span>A</span><span>Z</span><span>+</span></div><span>সহজ checkout <i>·</i> order status tracking</span></div>
        </div>
        <div className="hero-art" aria-label="Digital activation and secure checkout">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="orb-card"><div className="orb-label"><span className="live-dot" /> ACTIVATION FLOW</div><div className="orb-icon"><Zap size={27} fill="currentColor" /></div><strong>All set.</strong><span>Order, verified.</span><div className="orb-progress"><i /></div><div className="orb-foot"><span>STATUS</span><b><Check size={13} /> READY</b></div></div>
          <div className="float-pill pill-stock"><span className="pill-icon"><PackageCheck size={16} /></span><span><b>{freshStockCount ? "Live supplier stock" : "Supplier stock"}</b><small>{freshStockCount ? `${freshStockCount}টি service fresh` : "Admin setup-এর পর sync হবে"}</small></span><i className="status-dot" /></div>
          <div className="float-pill pill-secure"><span className="pill-icon"><LockKeyhole size={16} /></span><span><b>Secure by design</b><small>Protected checkout</small></span></div>
          <div className="hero-code">AZ / 01—SHOP</div>
        </div>
        <div className="hero-index"><span>01</span><i /> DIGITAL GOODS, MADE SIMPLE</div>
      </section>

      <section className="trust-strip">
        <div className="container-wide trust-inner">
          <div><ShieldCheck size={18} /><span>নিরাপদ অর্ডার</span></div><i />
          <div><Clock3 size={18} /><span>পেমেন্ট যাচাইয়ের পর delivery</span></div><i />
          <div><CreditCard size={18} /><span>{store?.paymentMethods?.map(p => p.label).join(" · ") || "Admin payment setup অপেক্ষমাণ"}</span></div><i />
          <div><PackageCheck size={18} /><span>Order tracking</span></div>
        </div>
      </section>

      <section className="catalog-section container-wide" id="services">
        <div className="section-heading">
          <div><div className="eyebrow">DIGITAL ACTIVATION CATALOG <span className="heading-line" /></div><h2>আপনার জন্য যা খুঁজছেন</h2><p>দুটি verified supplier catalog থেকে সক্রিয় সার্ভিস ও stock দেখুন—retail price shop admin নির্ধারণ করেন। বিস্তারিত দেখতে সার্ভিসে ক্লিক করুন।</p></div>
          <div className="catalog-search"><Search size={16} /><input aria-label="সার্ভিস খুঁজুন" placeholder="সার্ভিস খুঁজুন..." value={search} onChange={event => setSearch(event.target.value)} /><kbd>/</kbd></div>
        </div>
        <div className="category-tabs" role="tablist" aria-label="সার্ভিস category">
          {categories.map(category => <button type="button" role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? "category-tab active" : "category-tab"} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}
        </div>
        {isLoading ? <div className="product-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="product-skeleton" />)}</div>
          : error ? <div className="empty-panel"><span className="empty-icon"><PackageCheck /></span><h3>ক্যাটালগ লোড করা যায়নি</h3><p>কিছুক্ষণ পর আবার চেষ্টা করুন।</p></div>
          : shown.length === 0 ? <div className="empty-panel"><span className="empty-icon"><Sparkles /></span><h3>{products.length ? "এখানে matching service নেই" : "সার্ভিস catalog প্রস্তুত হচ্ছে"}</h3><p>{products.length ? "অন্য category বা search term দিয়ে দেখুন।" : "সার্ভিস catalog প্রস্তুত হলে এখানে দেখা যাবে।"}</p></div>
          : <div className="product-grid">{shown.map((product, index) => <article className="product-card" key={product.serviceKey} style={{ animationDelay: `${index * 35}ms` }} onClick={() => setSelectedProduct(product)} tabIndex={0} role="button" aria-label={`${product.name} বিস্তারিত দেখুন`} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedProduct(product); } }}>
            <div className={`product-mark mark-${index % 5}`}>{product.imageUrl ? <img src={product.imageUrl} alt={`${product.name} product`} loading="lazy" /> : <><span>{shortLabel(product.serviceKey)}</span><i className="mark-spark">✳</i></>}</div>
            <div className="product-topline"><span className="category-label">{categoryFor(product.serviceKey, product.name)}</span><span className={`availability ${product.stock < 1 ? "out" : ""} ${!product.stockFresh ? "stale" : ""}`}><i /> {product.stock < 1 ? "স্টক নেই" : product.stockFresh ? "Supplier stock" : "Stock stale"}</span></div>
            <h3>{product.name}</h3>
            <p className="product-description">{product.description?.slice(0, 145) || "ডিজিটাল activation service — payment verification-এর পর delivery."}{(product.description?.length ?? 0) > 145 ? "…" : ""}</p>
            {Boolean(product.priceReviewRequired) && <p className="price-review-public"><AlertTriangle size={13} /> Supplier currency review চলছে; আপাতত order নেওয়া যাচ্ছে না।</p>}
            {!product.stockFresh && <p className="price-review-public stock-stale-public"><AlertTriangle size={13} /> সর্বশেষ supplier stock যাচাই করা যাচ্ছে না; refresh না হওয়া পর্যন্ত order বন্ধ।</p>}
            <div className="product-meta"><span><PackageCheck size={14} /> {product.stock} available</span><button type="button" className="card-view-details-btn" onClick={e => { e.stopPropagation(); setSelectedProduct(product); }}><Info size={12} /> বিস্তারিত দেখুন</button></div>
            <div className="product-bottom"><div className="product-price"><small>আপনার মূল্য</small><strong>{formatMoney(product.retailPrice, store?.currency ?? "BDT")}</strong></div><button className="add-button" type="button" disabled={Boolean(product.priceReviewRequired) || !product.stockFresh || product.stock < 1} onClick={e => { e.stopPropagation(); add(product.serviceKey, product.quantityTiers?.[0]?.minQuantity ?? 1, product.maxAllowedQuantity); }} aria-label={`${product.name} কার্টে যোগ করুন`}><ShoppingBag size={16} /><span>{product.priceReviewRequired ? "Review চলছে" : !product.stockFresh ? "Stock check" : "কার্টে নিন"}</span><ArrowRight size={14} /></button></div>
          </article>)}</div>}
        {shown.length > 0 && <div className="catalog-foot"><span>{shown.length}টি সার্ভিস দেখানো হচ্ছে</span><span>Supplier stock auto-refresh · store active থাকলে প্রায় প্রতি মিনিটে sync</span></div>}
      </section>

      <section className="how-section">
        <div className="container-wide how-wrap"><div><div className="eyebrow">কীভাবে কাজ করে <span className="heading-line" /></div><h2>একটি পরিষ্কার<br />checkout. তিনটি সহজ ধাপ।</h2><p>কোনো অপ্রত্যাশিত charge নয়—manual payment যাচাই হওয়ার পরেই provider activation শুরু হবে।</p></div>
          <div className="steps"><article><div className="step-num">01</div><div className="step-icon"><ShoppingBag size={19} /></div><h3>পছন্দ করুন</h3><p>Catalog থেকে service বেছে cart-এ যোগ করুন। Checkout-এর আগে মোট দাম দেখুন।</p></article><article><div className="step-num">02</div><div className="step-icon"><CreditCard size={19} /></div><h3>Manual payment</h3><p>Admin-configured bKash, Nagad অথবা bank transfer-এ payment পাঠিয়ে order দিন।</p></article><article><div className="step-num">03</div><div className="step-icon"><PackageCheck size={19} /></div><h3>Track করুন</h3><p>Payment manually verify হলে activation complete হবে—order code দিয়ে status দেখুন।</p></article></div>
        </div>
      </section>
    </main>
    <footer className="store-footer"><div className="container-wide footer-inner"><BrandFoot /><span>Digital services · পরিষ্কার দাম · নিরাপদ অর্ডার</span><Link href="/track">অর্ডার খুঁজুন <ArrowUpRight size={14} /></Link></div></footer>
    {itemCount > 0 && <Link className="mobile-cart-fab" href="/checkout"><ShoppingBag size={17} /> {itemCount}টি পণ্য <ArrowRight size={15} /></Link>}

    {/* Product Details & Variations Modal */}
    <ProductDetailsModal
      product={selectedProduct}
      currency={store?.currency ?? "BDT"}
      onClose={() => setSelectedProduct(null)}
      category={selectedProduct ? categoryFor(selectedProduct.serviceKey, selectedProduct.name) : ""}
    />
  </div>;
}

function BrandFoot() { return <div className="footer-brand"><span>AZ</span> AccZone Shop</div>; }

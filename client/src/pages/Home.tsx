import StoreHeader from "@/components/StoreHeader";
import ProductDetailsModal, { Product } from "@/components/ProductDetailsModal";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/shop";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  LockKeyhole,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const categories = ["সব সার্ভিস", "AI & Productivity", "Entertainment", "Learning", "Other"];

function categoryFor(key: string, name: string) {
  const value = `${key} ${name}`.toLowerCase();
  if (/gemini|adobe|office|ai|express|chatgpt|claude/.test(value)) return "AI & Productivity";
  if (/music|apple|stream|spotify|youtube|netflix|prime/.test(value)) return "Entertainment";
  if (/duolingo|learn|language|coursera|udemy/.test(value)) return "Learning";
  return "Other";
}

function shortLabel(key: string) {
  const clean = key.split(/[_-]/)[0]?.toLowerCase() ?? "AZ";
  return clean.slice(0, 2).toUpperCase();
}

export default function Home() {
  const { data: products = [], isLoading, error } = trpc.shop.catalog.list.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: store } = trpc.shop.catalog.storeInfo.useQuery();
  const { add, itemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState("সব সার্ভিস");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Auto-open product modal if URL has ?product=... or #product-...
  useEffect(() => {
    if (!products.length) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productKey =
      urlParams.get("product") ||
      (window.location.hash.startsWith("#product-") ? window.location.hash.replace("#product-", "") : null);
    if (productKey) {
      const found = products.find(p => p.serviceKey === productKey);
      if (found) setSelectedProduct(found);
    }
  }, [products]);

  const shown = useMemo(() => {
    return products.filter(item => {
      const category = categoryFor(item.serviceKey, item.name);
      const matchesCategory = activeCategory === "সব সার্ভিস" || category === activeCategory;
      const matchesSearch = `${item.name} ${item.serviceKey} ${item.description ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  const freshStockCount = products.filter(item => item.stockFresh).length;

  return (
    <div className="shop-page">
      <StoreHeader />

      <main>
        {/* HERO SECTION */}
        <section className="hero container-wide">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> ডিজিটাল সাবস্ক্রিপশন ও প্রিমিয়াম টুলস
            </div>
            <h1>
              প্রয়োজনীয় সব প্রিমিয়াম সার্ভিস,
              <br />
              <span>bKash ও Nagad-এ সহজে কিনুন।</span>
            </h1>
            <p>
              Gemini, ChatGPT, Spotify, Netflix সহ প্রয়োজনীয় AI টুল ও ডিজিটাল অ্যাকাউন্ট অ্যাক্টিভেশন—কোনো আন্তর্জাতিক কার্ডের
              ঝামেলা ছাড়াই। সহজ ম্যানুয়াল পেমেন্ট এবং প্রতিটি ধাপে রিয়েল-টাইম অর্ডার ট্র্যাকিং।
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#services">
                সার্ভিসসমূহ দেখুন ও কিনুন <ArrowDown size={16} />
              </a>
              <Link className="button button-secondary" href="/track">
                অর্ডার ট্র্যাক করুন <ArrowUpRight size={15} />
              </Link>
            </div>

            <div className="hero-badges">
              <div className="hero-badge-pill">
                <CheckCircle2 size={15} /> <span>bKash ও Nagad পেমেন্ট</span>
              </div>
              <div className="hero-badge-pill">
                <Zap size={15} /> <span>দ্রুত অ্যাক্টিভেশন</span>
              </div>
              <div className="hero-badge-pill">
                <ShieldCheck size={15} /> <span>১০০% নিরাপদ ডেলিভারি</span>
              </div>
            </div>
          </div>

          {/* HERO RIGHT: SIMPLE 3-STEP ORDER GUIDE & LIVE STATUS */}
          <div className="hero-guide-container">
            <div className="hero-guide-card">
              <div className="hero-guide-header">
                <div className="guide-header-title">
                  <Sparkles size={16} />
                  <span>কীভাবে সহজে অর্ডার করবেন?</span>
                </div>
                <span className="guide-status-pill">
                  <span className="live-dot" /> {freshStockCount ? `${freshStockCount}টি সার্ভিস লাইভ স্টকে` : "লাইভ স্টক উপলব্ধ"}
                </span>
              </div>

              <div className="hero-guide-steps">
                <div className="guide-step-item">
                  <div className="guide-step-badge">১</div>
                  <div className="guide-step-body">
                    <strong>সার্ভিস ও প্যাকেজ বেছে নিন</strong>
                    <p>Gemini, ChatGPT, Spotify বা আপনার পছন্দের ডিজিটাল সার্ভিস কার্টে যোগ করুন।</p>
                  </div>
                </div>

                <div className="guide-step-item">
                  <div className="guide-step-badge">২</div>
                  <div className="guide-step-body">
                    <strong>bKash বা Nagad-এ পেমেন্ট করুন</strong>
                    <p>অ্যাডমিনের দেওয়া নাম্বারে সেন্ড মানি করে TrxID দিয়ে অর্ডার কনফার্ম করুন।</p>
                  </div>
                </div>

                <div className="guide-step-item">
                  <div className="guide-step-badge">৩</div>
                  <div className="guide-step-body">
                    <strong>অ্যাক্টিভেশন ও কোড বুঝে নিন</strong>
                    <p>পেমেন্ট নিশ্চিত হলেই সরাসরি আপনার ইমেইল ও ওয়েবসাইটে ডেলিভারি কোড পৌঁছে যাবে।</p>
                  </div>
                </div>
              </div>

              <div className="hero-guide-footer">
                <div className="guide-trust-pill">
                  <ShieldCheck size={14} /> <span>১০০% ফুল ওয়ারেন্টি</span>
                </div>
                <div className="guide-trust-pill">
                  <LockKeyhole size={14} /> <span>কোনো কার্ড লাগবে না</span>
                </div>
                <div className="guide-trust-pill">
                  <Clock3 size={14} /> <span>২৪/৭ লাইভ ট্র্যাকিং</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BANNER */}
        <section className="trust-strip">
          <div className="container-wide trust-inner">
            <div>
              <ShieldCheck size={18} />
              <span>নিরাপদ অর্ডার ও গোপনীয়তা</span>
            </div>
            <i />
            <div>
              <Clock3 size={18} />
              <span>পেমেন্ট যাচাইয়ের পর সরাসরি অ্যাক্টিভেশন</span>
            </div>
            <i />
            <div>
              <CreditCard size={18} />
              <span>{store?.paymentMethods?.map(p => p.label).join(" · ") || "bKash · Nagad · Bank"}</span>
            </div>
            <i />
            <div>
              <PackageCheck size={18} />
              <span>রিয়েল-টাইম অর্ডার ট্র্যাকিং</span>
            </div>
          </div>
        </section>

        {/* CATALOG SECTION */}
        <section className="catalog-section container-wide" id="services">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                DIGITAL ACTIVATION CATALOG <span className="heading-line" />
              </div>
              <h2>আপনার জন্য যা খুঁজছেন</h2>
              <p>সরাসরি সাপ্লায়ার ক্যাটালগ থেকে লাইভ স্টক ও সঠিক মূল্য দেখুন। বিস্তারিত জানতে যেকোনো সার্ভিসে ক্লিক করুন।</p>
            </div>
            <div className="catalog-search">
              <Search size={16} />
              <input
                aria-label="সার্ভিস খুঁজুন"
                placeholder="Gemini, Spotify, ChatGPT বা যেকোনো সার্ভিস খুঁজুন..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
              <kbd>/</kbd>
            </div>
          </div>

          <div className="category-tabs" role="tablist" aria-label="সার্ভিস ক্যাটাগরি">
            {categories.map(category => (
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={activeCategory === category ? "category-tab active" : "category-tab"}
                key={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="product-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="product-skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="empty-panel">
              <span className="empty-icon">
                <PackageCheck />
              </span>
              <h3>ক্যাটালগ লোড করা যায়নি</h3>
              <p>কিছুক্ষণ পর আবার চেষ্টা করুন বা ইন্টারনেট সংযোগ পরীক্ষা করুন।</p>
            </div>
          ) : shown.length === 0 ? (
            <div className="empty-panel">
              <span className="empty-icon">
                <Sparkles />
              </span>
              <h3>{products.length ? "এই ক্যাটাগরিতে কোনো সার্ভিস পাওয়া যায়নি" : "সার্ভিস ক্যাটালগ প্রস্তুত হচ্ছে"}</h3>
              <p>{products.length ? "অন্য কোনো ক্যাটাগরি বেছে নিন অথবা ভিন্ন নামে সার্চ করুন।" : "অ্যাডমিন প্যানেল থেকে সার্ভিস সিঙ্ক সম্পন্ন হলে এখানে দেখা যাবে।"}</p>
            </div>
          ) : (
            <div className="product-grid">
              {shown.map((product, index) => (
                <article
                  className="product-card"
                  key={product.serviceKey}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => setSelectedProduct(product)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${product.name} বিস্তারিত দেখুন`}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedProduct(product);
                    }
                  }}
                >
                  {product.imageUrl ? (
                    <div className="product-card-thumb">
                      <img src={product.imageUrl} alt={`${product.name}`} loading="lazy" />
                    </div>
                  ) : (
                    <div className={`product-mark mark-${index % 5}`}>
                      <span>{shortLabel(product.serviceKey)}</span>
                      <i className="mark-spark">✳</i>
                    </div>
                  )}
                  <div className="product-topline">
                    <span className="category-label">{categoryFor(product.serviceKey, product.name)}</span>
                    <span className={`availability ${product.stock < 1 ? "out" : ""} ${!product.stockFresh ? "stale" : ""}`}>
                      <i /> {product.stock < 1 ? "স্টক নেই" : product.stockFresh ? "স্টকে আছে" : "Stock stale"}
                    </span>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="product-description">
                    {product.description?.slice(0, 145) || "ডিজিটাল activation service — payment verification-এর পর delivery."}
                    {(product.description?.length ?? 0) > 145 ? "…" : ""}
                  </p>

                  {Boolean(product.priceReviewRequired) && (
                    <p className="price-review-public">
                      <AlertTriangle size={13} /> Supplier currency review চলছে; আপাতত order নেওয়া যাচ্ছে না।
                    </p>
                  )}
                  {!product.stockFresh && (
                    <p className="price-review-public stock-stale-public">
                      <AlertTriangle size={13} /> সর্বশেষ supplier stock যাচাই করা যাচ্ছে না; refresh না হওয়া পর্যন্ত order বন্ধ।
                    </p>
                  )}

                  <div className="product-meta">
                    <span>
                      <PackageCheck size={14} /> {product.stock}টি উপলব্ধ
                    </span>
                    <button
                      type="button"
                      className="card-view-details-btn"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                    >
                      <Info size={12} /> বিস্তারিত দেখুন
                    </button>
                  </div>

                  <div className="product-bottom">
                    <div className="product-price">
                      <small>মূল্য</small>
                      <strong>{formatMoney(product.retailPrice, store?.currency ?? "BDT")}</strong>
                    </div>
                    <button
                      className="add-button"
                      type="button"
                      disabled={Boolean(product.priceReviewRequired) || !product.stockFresh || product.stock < 1}
                      onClick={e => {
                        e.stopPropagation();
                        add(product.serviceKey, product.quantityTiers?.[0]?.minQuantity ?? 1, product.maxAllowedQuantity);
                      }}
                      aria-label={`${product.name} কার্টে যোগ করুন`}
                    >
                      <ShoppingBag size={15} />
                      <span>{product.priceReviewRequired ? "Review চলছে" : !product.stockFresh ? "Stock check" : "কার্টে নিন"}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {shown.length > 0 && (
            <div className="catalog-foot">
              <span>{shown.length}টি সার্ভিস প্রদর্শিত হচ্ছে</span>
              <span>সাপ্লায়ার লাইভ স্টক প্রতি মিনিটে অটো-রিফ্রেশ হয়</span>
            </div>
          )}
        </section>

        {/* HOW IT WORKS */}
        <section className="how-section">
          <div className="container-wide how-wrap">
            <div>
              <div className="eyebrow">
                কীভাবে কাজ করে <span className="heading-line" />
              </div>
              <h2>সহজ তিনটি ধাপে আপনার অ্যাক্টিভেশন</h2>
              <p>কোনো লুকানো চার্জ নেই—ম্যানুয়াল পেমেন্ট ভেরিফাই হওয়ার পর স্বয়ংক্রিয়ভাবে অ্যাক্টিভেশন সম্পন্ন হয়ে আপনার কাছে কোড বা লগইন পৌঁছে যাবে।</p>
            </div>
            <div className="steps">
              <article>
                <div className="step-num">01</div>
                <div className="step-icon">
                  <ShoppingBag size={20} />
                </div>
                <h3>সার্ভিস পছন্দ করুন</h3>
                <p>ক্যাটালগ থেকে আপনার পছন্দের টুল বা সাবস্ক্রিপশন বেছে কার্টে যোগ করুন এবং চেকআউটে যান।</p>
              </article>
              <article>
                <div className="step-num">02</div>
                <div className="step-icon">
                  <CreditCard size={20} />
                </div>
                <h3>bKash বা Nagad-এ পেমেন্ট</h3>
                <p>অ্যাডমিনের দেওয়া নম্বরে সেন্ট মানি করে ট্রানজেকশন আইডি (TrxID) দিয়ে অর্ডার কনফার্ম করুন।</p>
              </article>
              <article>
                <div className="step-num">03</div>
                <div className="step-icon">
                  <PackageCheck size={20} />
                </div>
                <h3>কোড ও ডেলিভারি বুঝে নিন</h3>
                <p>পেমেন্ট ভেরিফাই হলে সরাসরি ওয়েবসাইট ও আপনার ইমেইলে অ্যাক্টিভেশন কোড পৌঁছে যাবে।</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="store-footer">
        <div className="container-wide footer-inner">
          <BrandFoot />
          <span>AccZone Shop · নির্ভরযোগ্য ডিজিটাল অ্যাক্টিভেশন ও সাবস্ক্রিপশন হাব</span>
          <Link href="/track">
            অর্ডার খুঁজুন <ArrowUpRight size={14} />
          </Link>
        </div>
      </footer>

      {itemCount > 0 && (
        <Link className="mobile-cart-fab" href="/checkout">
          <ShoppingBag size={17} /> {itemCount}টি পণ্য বাস্কেটে আছে <ArrowRight size={15} />
        </Link>
      )}

      {/* Product Details & Variations Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        currency={store?.currency ?? "BDT"}
        onClose={() => setSelectedProduct(null)}
        category={selectedProduct ? categoryFor(selectedProduct.serviceKey, selectedProduct.name) : ""}
      />
    </div>
  );
}

function BrandFoot() {
  return (
    <div className="footer-brand">
      <span>AZ</span> AccZone Shop
    </div>
  );
}

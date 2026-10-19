import { BrandMark } from "@/components/StoreHeader";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatMoney, orderStatusLabels } from "@/lib/shop";
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, BadgeCheck, Banknote, Boxes, Check, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, Clock3, CreditCard, ExternalLink, Eye, EyeOff, FileText, ImagePlus, KeyRound, LayoutDashboard, LoaderCircle, LogOut, Mail, PackageCheck, RefreshCw, Save, Search, Settings2, ShieldCheck, ShoppingBag, Store, TrendingUp, Wallet, X, Zap } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type AdminTab = "overview" | "services" | "orders" | "connection" | "history" | "settings";
const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "services", label: "Services & prices", icon: Boxes },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "connection", label: "API connection", icon: Activity },
  { id: "history", label: "Activation history", icon: PackageCheck },
  { id: "settings", label: "Store settings", icon: Settings2 },
];
const dateText = (value: Date | string | null | undefined) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = "/"; } });
  const loginWithSecret = trpc.auth.loginWithSecret.useMutation({
    onSuccess: () => {
      toast.success("Admin হিসেবে সফলভাবে sign in হয়েছে");
      void utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Sign in ব্যর্থ হয়েছে");
    },
  });
  const admin = user?.role === "admin";
  if (isLoading) return <div className="admin-loading"><LoaderCircle className="spin" /> Secure admin session যাচাই হচ্ছে…</div>;
  if (!user) return <div className="admin-gate">
    <Link href="/" className="gate-brand"><BrandMark /></Link>
    <div className="gate-card">
      <span className="gate-icon"><KeyRound size={22} /></span>
      <div className="eyebrow">ADMIN ACCESS</div>
      <h1>Secure sign in.</h1>
      <p>এই control panel-এ প্রবেশ করতে Admin credentials / key দিন।</p>
      <form onSubmit={(e) => { e.preventDefault(); if (adminPassword.trim()) loginWithSecret.mutate({ username: adminUsername.trim() || undefined, password: adminPassword.trim() }); }} className="admin-login-form">
        <input
          type="text"
          value={adminUsername}
          onChange={(e) => setAdminUsername(e.target.value)}
          placeholder="Admin username অথবা email (ঐচ্ছিক)"
          className="admin-password-input"
          style={{ marginBottom: "10px" }}
        />
        <div className="password-input-wrap">
          <input
            type={showPassword ? "text" : "password"}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Admin password / key দিন"
            className="admin-password-input"
            autoFocus
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Hide" : "Show"}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="submit" className="button button-primary gate-button" disabled={loginWithSecret.isPending || !adminPassword.trim()}>
          {loginWithSecret.isPending ? <LoaderCircle size={15} className="spin" /> : <ShieldCheck size={15} />} Sign in <ArrowRight size={15} />
        </button>
      </form>
      {Boolean(window.__MANUS_CONFIG__?.oauthPortalUrl) && (
        <>
          <div className="login-divider"><span>অথবা</span></div>
          <button className="button button-secondary gate-button" onClick={() => startLogin()}>Manus দিয়ে sign in <ArrowRight size={15} /></button>
        </>
      )}
      <Link href="/" className="back-link"><ArrowLeft size={14} /> Shop-এ ফিরুন</Link>
      {error && <small className="muted">Session check-এ সমস্যা; আবার চেষ্টা করুন।</small>}
    </div>
    <div className="gate-security"><ShieldCheck size={14} /> Allowlisted admin accounts only</div>
  </div>;
  if (!admin) return <div className="admin-gate"><Link href="/" className="gate-brand"><BrandMark /></Link><div className="gate-card"><span className="gate-icon gate-icon-warning"><ShieldCheck size={22} /></span><div className="eyebrow">RESTRICTED AREA</div><h1>Admin access নেই।</h1><p>এই account-টি store admin allowlist-এ নেই। Shop order details ও API settings server-side protected।</p><button className="button button-secondary gate-button" onClick={() => logout.mutate()} disabled={logout.isPending}>অন্য account-এ sign in করুন <LogOut size={15} /></button><Link href="/" className="back-link"><ArrowLeft size={14} /> Shop-এ ফিরুন</Link></div></div>;

  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link href="/" className="admin-logo"><BrandMark compact /></Link><div className="admin-label">STORE MANAGEMENT</div><nav>{navItems.map(item => <button type="button" key={item.id} className={tab === item.id ? "admin-nav-item active" : "admin-nav-item"} onClick={() => setTab(item.id)}><item.icon size={17} /><span>{item.label}</span>{item.id === "orders" && <OrderBadge />}</button>)}</nav><div className="sidebar-bottom"><div className="admin-identity"><div className="admin-avatar">{user.name?.slice(0, 1) || "A"}</div><div><b>{user.name || "Store admin"}</b><small>{user.email}</small></div></div><button className="logout-button" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut size={15} /> Sign out</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div className="admin-breadcrumb"><Link href="/">Store</Link><ChevronRight size={14} /><b>{navItems.find(item => item.id === tab)?.label}</b></div><div className="admin-top-actions"><Link href="/" className="view-store"><ExternalLink size={15} /> View storefront</Link><span className="secure-tag"><ShieldCheck size={13} /> SECURE SESSION</span></div></header>
      <div className="admin-content">{tab === "overview" && <Overview onSelect={setTab} />}{tab === "services" && <ServicesSection />}{tab === "orders" && <OrdersSection />}{tab === "connection" && <ConnectionSection />}{tab === "history" && <HistorySection />}{tab === "settings" && <SettingsSection />}</div>
    </main>
  </div>;
}

function OrderBadge() {
  const { data } = trpc.shop.admin.overview.useQuery(undefined, { refetchInterval: 60_000 });
  return data?.awaitingPayment ? <i className="nav-count">{data.awaitingPayment}</i> : null;
}

function Overview({ onSelect }: { onSelect: (tab: AdminTab) => void }) {
  const { data, isLoading, refetch } = trpc.shop.admin.overview.useQuery(undefined, { refetchInterval: 60_000 });
  const acczoneBalance = trpc.shop.admin.providers.balance.useQuery({ provider: "acczone" }, { enabled: Boolean(data?.providersConfigured.acczone), retry: false, refetchInterval: 60_000 });
  const couponBalance = trpc.shop.admin.providers.balance.useQuery({ provider: "couponshops" }, { enabled: Boolean(data?.providersConfigured.couponshops), retry: false, refetchInterval: 60_000 });
  const balanceDetails = [
    acczoneBalance.data && `AccZone ${acczoneBalance.data.amount.toFixed(2)} ${acczoneBalance.data.currency}`,
    couponBalance.data && `CouponShops ${couponBalance.data.amount.toFixed(2)} ${couponBalance.data.currency}`,
  ].filter((value): value is string => Boolean(value));
  const recent = trpc.shop.admin.orders.list.useQuery({ status: "all" });
  return <>
    <div className="admin-heading"><div><div className="eyebrow">STORE SNAPSHOT <span className="heading-line" /></div><h1>Overview</h1><p>আপনার shop, orders এবং activation pipeline-এর বর্তমান অবস্থা।</p></div><button className="button button-light" onClick={() => { void refetch(); }}><RefreshCw size={14} /> Refresh</button></div>
    {data?.apiKeyConfigured === false && <button className="setup-banner" onClick={() => onSelect("connection")}><span className="banner-icon"><KeyRound size={17} /></span><span><b>API key যোগ করুন</b><small>AccZone বা CouponShops key connect করে service stock ও balance sync শুরু করুন।</small></span><ArrowRight size={16} /></button>}
    <div className="stats-grid">{[
      { label: "Orders received", value: isLoading ? "—" : data?.orderCount ?? 0, icon: ClipboardList, tone: "mint", foot: "recent 1,000 orders" },
      { label: "Payment review", value: isLoading ? "—" : data?.awaitingPayment ?? 0, icon: Clock3, tone: "amber", foot: "awaiting manual confirmation" },
      { label: "Retail catalog", value: isLoading ? "—" : data?.serviceCount ?? 0, icon: Boxes, tone: "blue", foot: "synced services" },
      { label: "Provider balance", value: isLoading ? "—" : balanceDetails.length ? `${balanceDetails.length} wallet${balanceDetails.length > 1 ? "s" : ""}` : data?.apiKeyConfigured ? "Check" : "Not set", icon: Wallet, tone: "violet", foot: balanceDetails.join(" · ") || "view API connection" },
    ].map(stat => <article className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tone}`}><stat.icon size={18} /></div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.foot}</small></article>)}</div>
    <div className="overview-grid"><section className="admin-panel recent-panel"><div className="panel-top"><div><h2>সাম্প্রতিক order</h2><p>সর্বশেষ customer checkout</p></div><button className="text-link" onClick={() => onSelect("orders")}>সব order <ArrowRight size={14} /></button></div>{recent.isLoading ? <PanelLoading /> : recent.data?.length ? <div className="recent-orders">{recent.data.slice(0, 5).map(order => <button type="button" className="recent-order" key={order.id} onClick={() => onSelect("orders")}><div className="recent-order-id"><b>{order.orderNo}</b><small>{order.customerName}</small></div><span className={`status-chip status-${order.status}`}>{orderStatusLabels[order.status]}</span><strong>{formatMoney(order.totalAmount, order.currency)}</strong></button>)}</div> : <div className="empty-admin"><ShoppingBag size={20} /><b>এখনো order নেই</b><span>Store live হলে checkout order এখানে আসবে।</span></div>}</section>
      <section className="admin-panel quick-panel"><div className="panel-top"><div><h2>Quick setup</h2><p>Shop চালু রাখার প্রয়োজনীয় ধাপ</p></div><SparkleIcon /></div><div className="setup-checklist"><button onClick={() => onSelect("connection")}><span className={`check-round ${data?.apiKeyConfigured ? "complete" : ""}`}>{data?.apiKeyConfigured ? <Check size={13} /> : "1"}</span><span><b>API connection</b><small>Encrypted server-side credential</small></span><ChevronRight size={15} /></button><button onClick={() => onSelect("services")}><span className={`check-round ${data?.serviceCount ? "complete" : ""}`}>{data?.serviceCount ? <Check size={13} /> : "2"}</span><span><b>Catalog & retail price</b><small>Active products প্রকাশ করুন</small></span><ChevronRight size={15} /></button><button onClick={() => onSelect("settings")}><span className="check-round">3</span><span><b>Manual payment</b><small>bKash, Nagad, bank details দিন</small></span><ChevronRight size={15} /></button></div></section></div>
    <div className="admin-footer-note"><ShieldCheck size={14} /> Fulfillment কেবল payment যাচাইয়ের পর admin চালু করতে পারেন।<button onClick={() => onSelect("orders")}>Orders দেখুন <ArrowRight size={13} /></button></div>
  </>;
}
function SparkleIcon() { return <span className="small-feature-icon">✳</span>; }
function PanelLoading() { return <div className="loading-inline"><LoaderCircle className="spin" size={17} /> Data load হচ্ছে…</div>; }

function ServicesSection() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.shop.admin.services.list.useQuery();
  const [search, setSearch] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [providerFilter, setProviderFilter] = useState<"all" | "acczone" | "couponshops">("all");
  const [listedFilter, setListedFilter] = useState<"all" | "listed" | "unlisted">("all");

  const sync = trpc.shop.admin.services.sync.useMutation({
    onSuccess: result => {
      toast.success(`${result.synced}টি ${result.provider} service sync হয়েছে`);
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.admin.overview.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const syncAll = trpc.shop.admin.services.syncAll.useMutation({
    onSuccess: result => {
      const summaryText = result.report
        .map(r => `${r.provider === "acczone" ? "AccZone" : "CouponShops"}: ${r.synced}টি`)
        .join(", ");
      toast.success(`সব API রিফ্রেশ সম্পন্ন! (${summaryText})`);
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.admin.overview.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: err => toast.error(err.message || "সব API সিঙ্ক ব্যর্থ হয়েছে"),
  });

  const syncProvider = (provider: "acczone" | "couponshops") => sync.mutate({ provider });

  const scopedData = data.filter(item => providerFilter === "all" || item.provider === providerFilter);
  const inStockCount = scopedData.filter(item => (item.stock - (item.reservedStock || 0)) > 0).length;

  const shown = data.filter(item => {
    const matchesSearch = `${item.name} ${item.serviceKey}`.toLowerCase().includes(search.toLowerCase());
    const available = item.stock - (item.reservedStock || 0);
    const matchesStock = stockOnly ? available > 0 : true;
    const matchesProvider = providerFilter === "all" || item.provider === providerFilter;
    const matchesListed = listedFilter === "all" || (listedFilter === "listed" ? item.isListed === 1 : item.isListed === 0);
    return matchesSearch && matchesStock && matchesProvider && matchesListed;
  });

  const resetFilters = () => {
    setSearch("");
    setStockOnly(false);
    setProviderFilter("all");
    setListedFilter("all");
  };

  return <>
    <div className="admin-heading">
      <div>
        <div className="eyebrow">PROVIDER CATALOG <span className="heading-line" /></div>
        <h1>Services & prices</h1>
        <p>আপনার সব সাপ্লায়ার API-র ক্যাটালগ সিঙ্ক করুন, স্টক ফিল্টার করুন এবং রিটেইল প্রাইস নির্ধারণ করুন।</p>
      </div>
      <div className="sync-actions">
        <button
          className="button button-primary sync-all-btn"
          onClick={() => syncAll.mutate()}
          disabled={syncAll.isPending || sync.isPending}
          title="সবগুলো কানেক্টেড সাপ্লায়ার API থেকে সব প্রোডাক্ট রিফ্রেশ করুন"
        >
          <RefreshCw className={syncAll.isPending ? "spin" : ""} size={15} />
          {syncAll.isPending ? "সব API সিঙ্ক হচ্ছে…" : "Sync All (সব API রিফ্রেশ)"}
        </button>
        <button
          className="button button-light"
          onClick={() => syncProvider("acczone")}
          disabled={syncAll.isPending || sync.isPending}
        >
          <RefreshCw className={sync.isPending ? "spin" : ""} size={14} /> AccZone
        </button>
        <button
          className="button button-light"
          onClick={() => syncProvider("couponshops")}
          disabled={syncAll.isPending || sync.isPending}
        >
          <RefreshCw className={sync.isPending ? "spin" : ""} size={14} /> CouponShops
        </button>
      </div>
    </div>

    <div className="admin-toolbar services-toolbar">
      <div className="toolbar-search">
        <Search size={15} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="সার্ভিসের নাম বা কোড দিয়ে খুঁজুন..."
        />
      </div>

      <div className="admin-filter-group">
        {/* On/Off Stock Filter Toggle Button */}
        <button
          type="button"
          className={`stock-filter-toggle ${stockOnly ? "active" : ""}`}
          onClick={() => setStockOnly(!stockOnly)}
          title={stockOnly ? "সব প্রোডাক্ট দেখতে ফিল্টার বন্ধ করুন" : "শুধু স্টকে থাকা প্রোডাক্ট দেখতে ফিল্টার চালু করুন"}
          aria-pressed={stockOnly}
        >
          <PackageCheck size={15} />
          <span>শুধু স্টকে থাকা সার্ভিস</span>
          <span className="toggle-indicator">{stockOnly ? "ON" : "OFF"}</span>
        </button>

        {/* Provider Filter Chips */}
        <div className="chip-selector" role="group" aria-label="Provider filter">
          <button
            type="button"
            className={`admin-chip ${providerFilter === "all" ? "active" : ""}`}
            onClick={() => setProviderFilter("all")}
          >
            সব API
          </button>
          <button
            type="button"
            className={`admin-chip ${providerFilter === "acczone" ? "active" : ""}`}
            onClick={() => setProviderFilter("acczone")}
          >
            AccZone
          </button>
          <button
            type="button"
            className={`admin-chip ${providerFilter === "couponshops" ? "active" : ""}`}
            onClick={() => setProviderFilter("couponshops")}
          >
            CouponShops
          </button>
        </div>

        {/* Storefront Listed Filter Chips */}
        <div className="chip-selector" role="group" aria-label="Listed filter">
          <button
            type="button"
            className={`admin-chip ${listedFilter === "all" ? "active" : ""}`}
            onClick={() => setListedFilter("all")}
          >
            সব
          </button>
          <button
            type="button"
            className={`admin-chip ${listedFilter === "listed" ? "active" : ""}`}
            onClick={() => setListedFilter("listed")}
          >
            Listed
          </button>
          <button
            type="button"
            className={`admin-chip ${listedFilter === "unlisted" ? "active" : ""}`}
            onClick={() => setListedFilter("unlisted")}
          >
            Unlisted
          </button>
        </div>
      </div>

      <div className="toolbar-stats">
        <b>{shown.length}</b>টি সার্ভিস দেখানো হচ্ছে <small>(স্টকে আছে: {inStockCount}টি / {providerFilter === "all" ? "মোট" : providerFilter === "couponshops" ? "CouponShops মোট" : "AccZone মোট"}: {scopedData.length}টি)</small>
        {stockOnly && (scopedData.length - inStockCount) > 0 && (
          <span className="stock-hidden-hint" style={{ marginLeft: "6px", color: "#b47818", fontSize: "11px", fontWeight: 500 }}>
            ({scopedData.length - inStockCount}টি আউট-অফ-স্টক লুকানো — দেখতে ফিল্টার OFF করুন)
          </span>
        )}
      </div>
    </div>

    <div className="admin-panel table-panel">
      <div className="table-head service-table-head">
        <span>Service</span>
        <span>Supplier cost / slabs</span>
        <span>Stock</span>
        <span>Retail price</span>
        <span>Storefront</span>
        <span></span>
      </div>
      {isLoading ? (
        <PanelLoading />
      ) : !data.length ? (
        <div className="empty-admin">
          <Boxes size={22} />
          <b>Catalog এখনো sync হয়নি</b>
          <span>প্রথমে API connection থেকে key দিন, তারপর "Sync All (সব API রিফ্রেশ)" বাটনে ক্লিক করুন।</span>
        </div>
      ) : !shown.length ? (
        <div className="empty-admin">
          <PackageCheck size={22} />
          <b>কোনো সার্ভিস পাওয়া যায়নি</b>
          <span>{stockOnly ? "স্টকে থাকা কোনো সার্ভিস পাওয়া যায়নি বা সার্চের সাথে মেলেনি।" : "অন্য ফিল্টার বা সার্চ টার্ম ব্যবহার করুন।"}</span>
          <button
            type="button"
            className="button button-light"
            style={{ marginTop: "10px" }}
            onClick={resetFilters}
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      ) : (
        shown.map(item => <ServiceRow key={item.serviceKey} item={item} />)
      )}
    </div>
    <p className="table-footnote">
      Supplier cost কেবল admin-এ দেখা যায়। CouponShops catalog-এর unit slab INR-এ; supplier wallet charge USDT-এ। Storefront retail price আলাদাভাবে admin নির্ধারণ করেন।
    </p>
  </>;
}
async function compressProductImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("JPEG, PNG বা WebP image বেছে নিন।");
  if (file.size > 12 * 1024 * 1024) throw new Error("Original image 12 MB-এর মধ্যে রাখুন।");
  const bitmap = await createImageBitmap(file);
  try {
    for (const scale of [1, 0.82, 0.68, 0.54, 0.42]) {
      const ratio = Math.min(scale, 1400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image resize করা যায়নি।");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image compress করা যায়নি।")), "image/webp", 0.82));
      if (["image/webp", "image/jpeg", "image/png"].includes(blob.type) && blob.size <= 500 * 1024) return blob;
    }
    throw new Error("Compress করার পরও image 500 KiB-এর বেশি; ছোট image বেছে নিন।");
  } finally { bitmap.close(); }
}

type ServiceRowInput = { serviceKey: string; provider: string; providerServiceId: string; name: string; description: string | null; customDescription?: string | null; supplierPrice: number; supplierCurrency: string; providerRate: number; pricingTiers: string | null; stock: number; reservedStock: number; isActive: number; isListed: number; retailPrice: number; imageUrl: string | null; lastStockSyncedAt: Date | null; priceReviewRequired: number; priceMarkupRatio: number };
function ServiceRow({ item }: { item: ServiceRowInput }) {
  const utils = trpc.useUtils();
  const [price, setPrice] = useState(String(item.retailPrice || ""));
  const [listed, setListed] = useState(Boolean(item.isListed));
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [customDesc, setCustomDesc] = useState(item.customDescription || "");
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const needsPriceReview = item.priceReviewRequired === 1 || (Number(price) > 0 && item.retailPrice <= 0 && (item.supplierPrice <= 0 || item.priceMarkupRatio === 0));
  const save = trpc.shop.admin.services.update.useMutation({ onSuccess: () => { toast.success(reviewConfirmed ? "দাম save এবং review complete হয়েছে" : "Service update হয়েছে"); void utils.shop.admin.services.list.invalidate(); void utils.shop.catalog.list.invalidate(); }, onError: error => toast.error(error.message) });
  useEffect(() => { setPrice(String(item.retailPrice || "")); setListed(Boolean(item.isListed)); setReviewConfirmed(false); setCustomDesc(item.customDescription || ""); }, [item.retailPrice, item.isListed, item.priceReviewRequired, item.customDescription]);
  const available = Math.max(0, item.stock - item.reservedStock);
  let tiers: Array<{ minQuantity: number; maxQuantity: number; priceInr: number; priceUsdt: number }> = [];
  try { const parsed: unknown = item.pricingTiers ? JSON.parse(item.pricingTiers) : []; if (Array.isArray(parsed)) tiers = parsed as typeof tiers; } catch { tiers = []; }
  const supplierLabel = item.provider === "couponshops" ? `₹${tiers[0]?.priceInr ?? "—"} / ${tiers[0]?.priceUsdt ?? "—"} USDT` : `${item.supplierPrice} provider units`;
  const upload = async (file: File) => {
    try {
      setUploading(true);
      const blob = await compressProductImage(file);
      const response = await fetch(`/api/admin/product-image/${encodeURIComponent(item.serviceKey)}`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Product image save হয়নি।");
      toast.success("Product image secure storage-এ save হয়েছে");
      void utils.shop.admin.services.list.invalidate(); void utils.shop.catalog.list.invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image upload ব্যর্থ হয়েছে"); }
    finally { setUploading(false); }
  };
  return <div className="service-row">
    <div className="service-cell">
      {item.imageUrl ? <img className="service-photo" src={item.imageUrl} alt="" loading="lazy" /> : <span className="mini-product-mark">{item.provider === "couponshops" ? "CS" : "AZ"}</span>}
      <div><b>{item.name}</b><small>{item.provider} · {item.providerServiceId || item.serviceKey}</small>
        <div className="image-upload-control"><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const selected = event.target.files?.[0]; if (selected) void upload(selected); event.currentTarget.value = ""; }} /><button type="button" className="text-link" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle size={12} className="spin" /> : <ImagePlus size={12} />}{item.imageUrl ? "Change image" : "Add image"}</button></div>
        {needsPriceReview && <small className="price-review-flag"><AlertTriangle size={12} /> দাম যাচাই দরকার · FX rate বা retail price দিন</small>}
        <div className="custom-desc-trigger">
          <button type="button" className="text-link" onClick={() => setEditDescOpen(!editDescOpen)}>
            <FileText size={12} />
            {item.customDescription ? "Edit custom description" : "Customize description"}
          </button>
          {item.customDescription && <span className="custom-desc-badge">Reseller version</span>}
        </div>
        {editDescOpen && <div className="custom-desc-box">
          <label className="field" style={{ margin: 0 }}>
            <b>Storefront Description (Reseller Version)</b>
            <textarea rows={3} value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="সার্ভিসের নিজস্ব বিবরণ, সুবিধা বা শর্তাবলী লিখুন..." />
          </label>
          <div className="desc-actions">
            <button type="button" className="button button-sm button-primary" onClick={() => { save.mutate({ serviceKey: item.serviceKey, retailPrice: Number(price || 0), isListed: listed, confirmPriceReview: reviewConfirmed, customDescription: customDesc.trim() || null }); setEditDescOpen(false); }} disabled={save.isPending}>Save description</button>
            {item.customDescription && <button type="button" className="button button-sm button-light" onClick={() => { setCustomDesc(""); save.mutate({ serviceKey: item.serviceKey, retailPrice: Number(price || 0), isListed: listed, confirmPriceReview: reviewConfirmed, customDescription: null }); setEditDescOpen(false); }} disabled={save.isPending}>Reset to supplier</button>}
            <button type="button" className="button button-sm button-light" onClick={() => setEditDescOpen(false)}>Close</button>
          </div>
          {item.description && <details className="supplier-desc-reference"><summary>Original Supplier Description (Reference)</summary><p>{item.description}</p></details>}
        </div>}
        {!editDescOpen && item.customDescription && <details><summary>Custom description (active)</summary><p>{item.customDescription}</p></details>}
        {!editDescOpen && !item.customDescription && item.description && <details><summary>Supplier description</summary><p>{item.description.slice(0, 500)}</p></details>}
        {tiers.length > 0 && <details><summary>{tiers.length} supplier quantity slab{tiers.length > 1 ? "s" : ""}</summary><p>{tiers.map(tier => `${tier.minQuantity}–${tier.maxQuantity}: ₹${tier.priceInr} / ${tier.priceUsdt} USDT`).join(" · ")} · 1 USDT = ₹{item.providerRate}</p></details>}
      </div>
    </div>
    <strong className="provider-price">{supplierLabel}</strong>
    <span className={`stock-cell ${available < 1 ? "out" : ""}`}>{available.toLocaleString()}<small> available · {item.reservedStock} reserved</small>{item.lastStockSyncedAt && <small>{dateText(item.lastStockSyncedAt)}</small>}</span>
    <label className="retail-input"><input type="number" min="0" max="10000000" step="0.01" value={price} onChange={event => setPrice(event.target.value)} aria-label={`${item.name} retail price`} placeholder="0.00" /><small>{item.priceMarkupRatio > 0 ? `Retail · ×${item.priceMarkupRatio.toFixed(2)} markup` : "Retail price"}</small></label>
    <button type="button" className={`toggle-switch ${listed ? "on" : ""}`} onClick={() => setListed(!listed)} aria-pressed={listed} disabled={!item.isActive || available < 1 || Number(price) <= 0} aria-label="Storefront visibility"><i /></button>
    {needsPriceReview && <label className="price-review-confirm"><input type="checkbox" checked={reviewConfirmed} onChange={event => setReviewConfirmed(event.target.checked)} /><span>Supplier cost, currency ও retail price যাচাই করেছি</span></label>}
    <button className="icon-save" title={needsPriceReview ? "Save price and mark reviewed" : "Save service"} onClick={() => save.mutate({ serviceKey: item.serviceKey, retailPrice: Number(price || 0), isListed: listed, confirmPriceReview: reviewConfirmed, customDescription: customDesc.trim() || null })} disabled={save.isPending || (needsPriceReview && listed && !reviewConfirmed)}><Save size={15} /></button>
  </div>;
}

function OrdersSection() {
  const [status, setStatus] = useState("all");
  const { data = [], isLoading, refetch } = trpc.shop.admin.orders.list.useQuery({ status }, { refetchInterval: 45_000 });
  const statuses = ["all", "awaiting_payment", "paid", "fulfilling", "fulfilled", "partially_fulfilled", "fulfillment_unknown", "fulfillment_failed", "cancelled"];
  return <><div className="admin-heading"><div><div className="eyebrow">CUSTOMER CHECKOUTS</div><h1>Orders</h1><p>Payment manually যাচাই করুন। তারপর আলাদা action-এ provider balance ব্যবহার করে activation চালান।</p></div><button className="button button-light" onClick={() => void refetch()}><RefreshCw size={14} /> Refresh</button></div>
    <div className="filter-pills">{statuses.map(value => <button className={status === value ? "filter-pill active" : "filter-pill"} key={value} onClick={() => setStatus(value)}>{value === "all" ? "সব order" : orderStatusLabels[value] ?? value}</button>)}</div>
    <div className="admin-panel table-panel"><div className="table-head orders-table-head"><span>Order / Customer</span><span>Method / Ref</span><span>Items</span><span>Total</span><span>Status</span><span>Actions</span></div>{isLoading ? <PanelLoading /> : !data.length ? <div className="empty-admin"><ClipboardList size={23} /><b>এই filter-এ order নেই</b><span>নতুন customer order এখানে দেখা যাবে।</span></div> : data.map(order => <AdminOrderRow key={order.id} order={order} />)}</div>
  </>;
}
function AdminOrderRow({ order }: { order: { id: number; orderNo: string; customerName: string; customerEmail: string; customerPhone: string; paymentMethod: "bkash" | "nagad" | "bank"; paymentReference: string | null; totalAmount: number; currency: string; status: string; createdAt: Date; updatedAt: Date } }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();
  const items = trpc.shop.admin.orders.items.useQuery({ orderId: order.id }, { enabled: expanded });
  const emailDelivery = trpc.shop.admin.email.orderStatus.useQuery({ orderId: order.id }, { enabled: expanded, refetchInterval: expanded ? 20_000 : false });
  const refresh = () => { void utils.shop.admin.orders.list.invalidate(); void utils.shop.admin.overview.invalidate(); void utils.shop.admin.orders.items.invalidate({ orderId: order.id }); void utils.shop.admin.services.list.invalidate(); void utils.shop.catalog.list.invalidate(); };
  const paid = trpc.shop.admin.orders.confirmPayment.useMutation({ onSuccess: () => { toast.success("Payment confirmed"); refresh(); }, onError: e => toast.error(e.message) });
  const fulfill = trpc.shop.admin.orders.fulfill.useMutation({ onSuccess: result => { toast.success(result.status === "fulfilled" ? "Activation purchase complete" : `Provider status: ${result.status}`); refresh(); }, onError: e => { toast.error(e.message); refresh(); } });
  const refreshCoupon = trpc.shop.admin.orders.refreshCouponOrder.useMutation({ onSuccess: result => { toast.success(`CouponShops provider status: ${result.providerStatus} · order ${result.status}`); refresh(); }, onError: e => toast.error(e.message) });
  const recover = trpc.shop.admin.orders.recoverUnknown.useMutation({ onSuccess: result => { toast.success(`History review recorded · order ${result.status}`); refresh(); }, onError: e => toast.error(e.message) });
  const cancel = trpc.shop.admin.orders.cancel.useMutation({ onSuccess: refresh, onError: e => toast.error(e.message) });
  const handleFulfill = () => {
    if (!( ["paid", "fulfillment_failed", "partially_fulfilled"].includes(order.status))) return;
    if (!window.confirm(`Order ${order.orderNo}: supplier API-তে activation fulfillment শুরু/retry হবে। CouponShops order USDT wallet-এ charge করতে পারে; AccZone configured provider balance ব্যবহার করে। Payment যাচাই ও retry eligibility নিশ্চিত করেছেন?`)) return;
    fulfill.mutate({ orderId: order.id });
  };
  const handleRefreshCoupon = (itemId: number) => {
    if (!window.confirm("CouponShops order refresh: saved provider order GET হবে; original response না এলে একই stable client_order_id-তে idempotent replay হবে। API docs অনুযায়ী একই ID duplicate charge করে না। চালাবেন?")) return;
    refreshCoupon.mutate({ orderId: order.id, itemId });
  };
  const handleRecover = () => {
    if (!window.confirm(`Order ${order.orderNo}: আগে Activation history-তে service ও সময় মিলিয়ে নিশ্চিত করুন যে কোনো activation কেনা হয়নি। এই action uncertain line retry-যোগ্য করবে; পরে Fulfill চাপলে নতুন করে balance খরচ হতে পারে। History-তে match নেই—এটি কি আপনি যাচাই করেছেন?`)) return;
    recover.mutate({ orderId: order.id });
  };
  const canReviewStalled = order.status !== "fulfilling" || Date.now() - new Date(order.updatedAt).getTime() >= 6 * 60_000;
  const hasAcczoneUnknown = items.data?.some(item => item.provider === "acczone" && ["unknown", "processing"].includes(item.fulfillmentState));
  return <div className="order-row-wrap">
    <div className="order-row orders-table-head">
      <div className="order-customer"><button className="order-open" onClick={() => setExpanded(!expanded)} aria-label="Order detail">{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button><div><b>{order.orderNo}</b><small>{order.customerName} · {order.customerPhone}</small><small className="order-email">{order.customerEmail}</small></div></div>
      <div className="method-cell"><span>{order.paymentMethod === "bank" ? "Bank" : order.paymentMethod}</span><small>{order.paymentReference || "No txn reference"}</small></div><span className="order-date">{dateText(order.createdAt)}</span><strong>{formatMoney(order.totalAmount, order.currency)}</strong><span className={`status-chip status-${order.status}`}>{orderStatusLabels[order.status] ?? order.status}</span>
      <div className="order-action-cell">{order.status === "awaiting_payment" && <><button className="mini-action success" onClick={() => { if (window.confirm("আপনি কি এই manual payment যাচাই করেছেন? Confirm করলে পরের ধাপে আলাদা করে fulfillment চালাতে পারবেন।")) paid.mutate({ orderId: order.id }); }} disabled={paid.isPending}>Payment verify</button><button className="icon-action danger" title="Cancel order" onClick={() => { if (window.confirm("Order বাতিল করবেন?")) cancel.mutate({ orderId: order.id }); }}><X size={14} /></button></>}{["paid", "fulfillment_failed", "partially_fulfilled"].includes(order.status) && <button className="mini-action fulfill" onClick={handleFulfill} disabled={fulfill.isPending}>{fulfill.isPending ? <LoaderCircle size={13} className="spin" /> : <ZapIcon />} {order.status === "paid" ? "Fulfill" : "Retry"}</button>}{["fulfillment_unknown", "fulfilling"].includes(order.status) && hasAcczoneUnknown && <button className="mini-action fulfill" onClick={handleRecover} disabled={recover.isPending}>{recover.isPending ? <LoaderCircle size={13} className="spin" /> : <AlertTriangle size={13} />} Review AccZone history</button>}</div>
    </div>
    {expanded && <div className="order-detail">{items.isLoading ? <PanelLoading /> : <><div className="order-detail-heading"><b>Order items</b><span>Created {dateText(order.createdAt)}</span></div>{order.status === "fulfilled" && <div className="admin-email-status"><Mail size={14} /><span>Activation email · {emailDelivery.isLoading ? "checking…" : emailDelivery.data?.status ?? "not initiated"}{emailDelivery.data?.sentAt ? ` · sent ${dateText(emailDelivery.data.sentAt)}` : ""}</span></div>}{items.data?.map(item => <div className="order-line" key={item.id}>
      <div><b>{item.serviceName}</b><small>{item.provider} · {item.providerServiceId || item.serviceKey} · Qty {item.quantity} · {orderStatusLabels[item.fulfillmentState] ?? item.fulfillmentState}</small>{item.providerOrderId && <small>Provider order {item.providerOrderId} · {item.providerStatus}</small>}</div>
      <strong>{formatMoney(item.unitPrice * item.quantity, order.currency)}</strong>{item.providerMessage && <p className="warning-line"><AlertTriangle size={14} /> {item.providerMessage}</p>}
      {item.provider === "couponshops" && ["unknown", "processing"].includes(item.fulfillmentState) && <button className="mini-action fulfill" type="button" onClick={() => handleRefreshCoupon(item.id)} disabled={refreshCoupon.isPending}>{refreshCoupon.isPending ? <LoaderCircle size={13} className="spin" /> : <RefreshCw size={13} />} Refresh CouponShops order</button>}
      <StoredCodes value={item.resultCodes} />
    </div>)}</>}
      {(["fulfillment_unknown", "fulfillment_failed", "partially_fulfilled", "fulfilling"].includes(order.status)) && <div className="notice warning"><AlertTriangle size={15} /><span>AccZone unknown line হলে Activation history মিলিয়ে reconcile করুন; CouponShops line হলে উপরের Refresh action ব্যবহার করুন। Partial delivery-এর ক্ষেত্রে customer-এর সাথে follow-up করুন.</span></div>}
      {canReviewStalled && items.data?.filter(item => item.provider === "acczone" && ["unknown", "processing"].includes(item.fulfillmentState)).map(item => <HistoryCodeAttach key={`recover-${item.id}`} orderId={order.id} itemId={item.id} serviceKey={item.serviceKey} />)}
      {canReviewStalled && hasAcczoneUnknown && ["fulfillment_unknown", "fulfilling"].includes(order.status) && <button className="mini-action fulfill recovery-action" onClick={handleRecover} disabled={recover.isPending}>{recover.isPending ? <LoaderCircle size={13} className="spin" /> : <CheckCircle2 size={13} />} আমি যাচাই করেছি—AccZone history-তে purchase নেই; retry unlock</button>}
    </div>}
  </div>;
}
function HistoryCodeAttach({ orderId, itemId, serviceKey }: { orderId: number; itemId: number; serviceKey: string }) {
  const [value, setValue] = useState("");
  const utils = trpc.useUtils();
  const attach = trpc.shop.admin.orders.attachRecoveredCodes.useMutation({ onSuccess: result => { setValue(""); toast.success(`${result.codesSaved}টি provider-history code যুক্ত হয়েছে · ${result.status}`); void utils.shop.admin.orders.list.invalidate(); void utils.shop.admin.orders.items.invalidate({ orderId }); void utils.shop.catalog.list.invalidate(); void utils.shop.admin.services.list.invalidate(); }, onError: error => toast.error(error.message) });
  const submit = () => {
    const codes = value.split(/\r?\n/).map(code => code.trim()).filter(Boolean);
    if (!codes.length) return;
    if (!window.confirm(`Service ${serviceKey}-এর জন্য AccZone history থেকে মেলানো code-গুলো order-এ যুক্ত হবে। সঠিক customer/order/service নিশ্চিত করেছেন?`)) return;
    attach.mutate({ orderId, itemId, codes });
  };
  return <div className="history-reconcile-form"><label className="field">Verified AccZone history code(s) · one per line<textarea rows={2} value={value} onChange={event => setValue(event.target.value)} placeholder="এই order/service-এর সাথে history-তে মেলা code এখানে paste করুন" /></label><button className="button button-secondary" type="button" onClick={submit} disabled={attach.isPending || !value.trim()}>{attach.isPending ? <LoaderCircle size={14} className="spin" /> : <CheckCircle2 size={14} />} History code attach</button></div>;
}
function StoredCodes({ value }: { value: string | null }) {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return <div className="admin-code-list">{parsed.map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const code = entry as Record<string, unknown>;
      if (typeof code.codeValue !== "string") return null;
      return <div className="admin-code" key={`${String(code.id ?? index)}-${index}`}><span>{typeof code.codeType === "string" ? code.codeType : "Activation"}</span><code>{code.codeValue}</code></div>;
    })}</div>;
  } catch {
    return <p className="warning-line"><AlertTriangle size={14} /> Stored activation data needs manual review.</p>;
  }
}
function ZapIcon() { return <span className="tiny-zap">↗</span>; }

function ProviderKeyCard({ provider, status }: { provider: "acczone" | "couponshops"; status?: { configured: boolean; updatedAt: Date | null } }) {
  const utils = trpc.useUtils();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [balance, setBalance] = useState<{ amount: number; currency: string; balanceInr: number | null; rateInrPerUsdt: number | null; username: string } | null>(null);
  const title = provider === "acczone" ? "AccZone" : "CouponShops";
  const configure = trpc.shop.admin.providers.configure.useMutation({ onSuccess: data => { setApiKey(""); setBalance(data); toast.success(`${title} API key verified ও encrypted storage-এ save হয়েছে`); void utils.shop.admin.providers.status.invalidate(); void utils.shop.admin.overview.invalidate(); }, onError: err => toast.error(err.message) });
  const balanceQuery = trpc.shop.admin.providers.balance.useQuery({ provider }, { enabled: false, retry: false });
  const check = async () => {
    const refreshed = await balanceQuery.refetch();
    if (refreshed.data) setBalance(refreshed.data);
    if (refreshed.error) toast.error(refreshed.error.message);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (apiKey.trim()) configure.mutate({ provider, apiKey }); };
  return <section className="admin-panel connection-card">
    <div className="panel-top"><div><h2>{title} API key</h2><p>{provider === "acczone" ? "Balance, catalog ও activation purchase" : "Coupon catalog, INR/USDT wallet ও idempotent order"}</p></div><div className="connection-key-icon"><KeyRound size={19} /></div></div>
    <div className="key-callout"><ShieldCheck size={16} /><span>AES-256-GCM, project-scoped encryption. Key শুধু server-এ ব্যবহৃত হয়; save হওয়ার পর আর read-back নেই।</span></div>
    <form onSubmit={submit}><label className="field">{title} API key <span className="optional">শুধু verify করতে একবার লিখুন</span><span className="secret-input-wrap"><input type={showKey ? "text" : "password"} autoComplete="new-password" spellCheck={false} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={status?.configured ? "Credential configured; replace করতে নতুন key লিখুন" : `${title} account থেকে API key লিখুন`} minLength={8} maxLength={2048} required /><button type="button" className="reveal-key" onClick={() => setShowKey(!showKey)} aria-label={showKey ? "Hide key" : "Show key"}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
      <p className="form-help">Submit করলে server {provider === "acczone" ? "/getBalance" : "/balance"}-এ key validate করে encrypted database-এ রাখবে। Browser/API response/log/source-এ key লেখা হবে না।</p>
      <button className="button button-primary" type="submit" disabled={configure.isPending || !apiKey.trim()}>{configure.isPending ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />}{configure.isPending ? "Verify & save হচ্ছে…" : status?.configured ? "Verify & replace key" : "Verify & save key"}</button>
    </form>
    {status?.configured && <div className="configured-note"><CheckCircle2 size={16} /> Credential configured · value hidden{status.updatedAt ? ` · updated ${dateText(status.updatedAt)}` : ""}</div>}
    <div className="connection-health"><div className="panel-top"><div><h3>Account health</h3><p>Provider-এর current balance</p></div><span className="health-pulse"><i /></span></div>{balance ? <><div className="balance-value"><small>{balance.currency} balance</small><strong>{balance.amount.toFixed(2)}</strong></div>{balance.balanceInr !== null && <div className="health-row"><span>Wallet INR</span><b>₹{balance.balanceInr.toFixed(2)} · 1 USDT = ₹{balance.rateInrPerUsdt}</b></div>}{balance.username && <div className="health-row"><span>Account</span><b>{balance.username}</b></div>}</> : <div className="balance-empty"><Wallet size={22} /><b>Balance summary নেই</b><span>{status?.configured ? "Provider account এখন check করুন।" : "API key add করলে এখানে balance দেখাবে।"}</span></div>}<button className="button button-light full-button" disabled={!status?.configured || balanceQuery.isFetching} onClick={() => void check()}>{balanceQuery.isFetching ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />} Check balance</button></div>
  </section>;
}

function ConnectionSection() {
  const { data: status, isLoading } = trpc.shop.admin.providers.status.useQuery();
  const connected = Boolean(status?.acczone.configured || status?.couponshops.configured);
  return <><div className="admin-heading"><div><div className="eyebrow">SERVER-SIDE PROVIDERS</div><h1>API connections</h1><p>AccZone ও CouponShops-এর আলাদা key যোগ করুন। যেকোনো একটি catalog sync করতে তার নিজস্ব verified key লাগবে।</p></div><span className={`status-chip ${connected ? "status-fulfilled" : "status-awaiting_payment"}`}><i /> {isLoading ? "Checking…" : connected ? "CONNECTED" : "NOT CONNECTED"}</span></div>
    <div className="connection-grid"><ProviderKeyCard provider="acczone" status={status?.acczone} /><ProviderKeyCard provider="couponshops" status={status?.couponshops} /></div>
    <div className="security-footnote"><ShieldCheck size={15} /><span>AccZone key শুধু server-এর required `apikey` request-এ; CouponShops key কেবল server-side `X-API-Key` header-এ যায়। দুই key encrypted-at-rest, আলাদা purpose-derived key দিয়ে; plaintext browser bundle/response/log/Git-এ নয়।</span></div>
  </>;
}

function HistorySection() {
  const [page, setPage] = useState(1);
  const history = trpc.shop.admin.api.history.useQuery({ page, limit: 20 }, { retry: false });
  return <><div className="admin-heading"><div><div className="eyebrow">PROVIDER ACTIVITY</div><h1>Activation history</h1><p>AccZone API থেকে paginated activation record—codes কেবল admin panel-এ দেখা যায়।</p></div><button className="button button-light" onClick={() => void history.refetch()} disabled={history.isFetching}><RefreshCw className={history.isFetching ? "spin" : ""} size={14} /> Refresh</button></div><div className="admin-panel history-panel">{history.isLoading ? <PanelLoading /> : history.error ? <div className="empty-admin"><AlertTriangle size={22} /><b>History load হয়নি</b><span>{history.error.message}</span><button className="button button-light" onClick={() => void history.refetch()}>Try again</button></div> : !history.data?.length ? <div className="empty-admin"><PackageCheck size={22} /><b>এই page-এ record নেই</b></div> : <><div className="table-head history-head"><span>ID</span><span>Service key</span><span>Activation code</span><span>Used at</span></div>{history.data.map((row, i) => <div className="history-row" key={`${row.id}-${i}`}><code>{row.id || "—"}</code><b>{row.serviceKey || "—"}</b><code className="history-code">{row.codeValue || "—"}</code><span>{row.usedAt || "—"}</span></div>)}</>}
      <div className="pagination-row"><button className="button button-light" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1 || history.isFetching}><ArrowLeft size={14} /> Previous</button><span>Page {page}</span><button className="button button-light" onClick={() => setPage(page + 1)} disabled={(history.data?.length ?? 0) < 20 || history.isFetching}>Next <ArrowRight size={14} /></button></div></div></>;
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.ping) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "pong" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.html || data.text,
      body: data.text || "",
      name: data.fromName || "AccZone Shop"
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

function SettingsSection() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.shop.admin.settings.get.useQuery();
  const emailConfig = trpc.shop.admin.email.status.useQuery();
  const [resendKey, setResendKey] = useState("");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPass, setGmailAppPass] = useState("");
  const [gmailWebhookUrl, setGmailWebhookUrl] = useState("");
  const [gmailMode, setGmailMode] = useState<"webhook" | "smtp">("webhook");
  const [gmailFromName, setGmailFromName] = useState("AccZone Shop");
  const [testEmailTarget, setTestEmailTarget] = useState("");
  const [showGmailHelp, setShowGmailHelp] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [form, setForm] = useState({ currency: "BDT" as "BDT" | "USD" | "INR", paymentInstructions: "", bkashNumber: "", nagadNumber: "", bankDetails: "", supportContact: "", inrToStoreRate: 0, usdtToStoreRate: 0, acczoneUnitToStoreRate: 0, resendFromEmail: "", publicSiteUrl: "https://accshop-767l.onrender.com" });
  useEffect(() => { if (data) setForm({ currency: data.currency as "BDT" | "USD" | "INR", paymentInstructions: data.paymentInstructions ?? "", bkashNumber: data.bkashNumber ?? "", nagadNumber: data.nagadNumber ?? "", bankDetails: data.bankDetails ?? "", supportContact: data.supportContact ?? "", inrToStoreRate: Number(data.inrToStoreRate ?? 0), usdtToStoreRate: Number(data.usdtToStoreRate ?? 0), acczoneUnitToStoreRate: Number(data.acczoneUnitToStoreRate ?? 0), resendFromEmail: data.resendFromEmail ?? "", publicSiteUrl: data.publicSiteUrl || "https://accshop-767l.onrender.com" }); }, [data]);
  const save = trpc.shop.admin.settings.save.useMutation({ onSuccess: () => { toast.success("Store settings save হয়েছে"); void utils.shop.admin.settings.get.invalidate(); void utils.shop.catalog.storeInfo.invalidate(); void utils.shop.catalog.list.invalidate(); void utils.shop.admin.services.list.invalidate(); }, onError: e => toast.error(e.message) });
  const configureEmail = trpc.shop.admin.email.configureKey.useMutation({ onSuccess: result => { setResendKey(""); toast.success(result.senderVerified ? "Resend API key verified; sender verified" : `Resend key saved. Verified domains: ${result.verifiedDomains.join(", ") || "none"}`); void utils.shop.admin.email.status.invalidate(); }, onError: error => toast.error(error.message) });
  const configureGmail = trpc.shop.admin.email.configureGmail.useMutation({
    onSuccess: result => {
      setGmailAppPass("");
      toast.success(result.message);
      void utils.shop.admin.email.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const sendTestEmail = trpc.shop.admin.email.sendTestEmail.useMutation({
    onSuccess: result => toast.success(result.message),
    onError: error => toast.error(error.message),
  });

  const emailDomain = form.resendFromEmail.trim().split("@").pop()?.toLowerCase();
  const senderVerified = Boolean(emailDomain && emailConfig.data?.domains.some(domain => (domain.name.toLowerCase() === emailDomain || emailDomain.endsWith(`.${domain.name.toLowerCase()}`)) && domain.status === "verified" && domain.sendingEnabled));
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(form); };
  return <><div className="admin-heading"><div><div className="eyebrow">STORE CONFIGURATION</div><h1>Store settings</h1><p>Retail price currency, customer payment instructions এবং support contact সেট করুন।</p></div></div>
    {isLoading ? <PanelLoading /> : <form className="settings-form" onSubmit={submit}>
      <section className="admin-panel settings-panel"><div className="panel-top"><div><h2>Price & supplier conversion</h2><p>Store currency-এর সঙ্গে supplier cost মেলালে product-এর saved markup ratio অনুযায়ী retail price auto-adjust হবে।</p></div><CircleDollarSign size={19} /></div><label className="field short-field">Store currency<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value as typeof form.currency })}><option value="BDT">BDT — Bangladeshi Taka</option><option value="USD">USD — US Dollar</option><option value="INR">INR — Indian Rupee</option></select></label><p className="form-help">১ source currency = store currency-তে কত। Zero মানে rate অজানা: auto-reprice বন্ধ, product price review প্রয়োজন। INR store-এ CouponShops-এর verified provider INR/USDT rate ব্যবহার হয়।</p><div className="settings-grid conversion-grid"><label className="field">১ INR = {form.currency}<input type="number" min="0" step="0.0001" value={form.inrToStoreRate} onChange={event => setForm({ ...form, inrToStoreRate: Number(event.target.value) })} /></label><label className="field">১ USDT = {form.currency}<input type="number" min="0" step="0.0001" value={form.usdtToStoreRate} onChange={event => setForm({ ...form, usdtToStoreRate: Number(event.target.value) })} /></label><label className="field">১ AccZone unit = {form.currency}<input type="number" min="0" step="0.0001" value={form.acczoneUnitToStoreRate} onChange={event => setForm({ ...form, acczoneUnitToStoreRate: Number(event.target.value) })} /></label></div><div className="notice"><AlertTriangle size={15} /><span>Supplier cost ≥ retail price এবং FX জানা থাকলে saved retail/cost ratio বজায় রেখে দাম বাড়বে; cost কমলে দাম auto কমবে না। Supplier/retail currency তুলনা করা না গেলে listing checkout-এর জন্য hold হবে—এখানে rate বসান বা product-এর retail price review করে save করুন।</span></div></section>
      <section className="admin-panel settings-panel"><div className="panel-top"><div><h2>Manual payment</h2><p>Customer checkout ও payment confirmation-এর জন্য account details।</p></div><Banknote size={19} /></div><div className="settings-grid"><label className="field">bKash account<input maxLength={64} value={form.bkashNumber} onChange={e => setForm({ ...form, bkashNumber: e.target.value })} placeholder="Merchant/personal number দিন" /></label><label className="field">Nagad account<input maxLength={64} value={form.nagadNumber} onChange={e => setForm({ ...form, nagadNumber: e.target.value })} placeholder="Account number দিন" /></label><label className="field full-field">Bank transfer details<textarea rows={3} maxLength={2000} value={form.bankDetails} onChange={e => setForm({ ...form, bankDetails: e.target.value })} placeholder="Bank, account name, account number, branch লিখুন" /></label><label className="field full-field">Customer payment instruction<textarea rows={3} maxLength={2000} value={form.paymentInstructions} onChange={e => setForm({ ...form, paymentInstructions: e.target.value })} placeholder="যেমন: Send Money/transfer করে order code-সহ transaction ID দিন." /></label><label className="field full-field">Customer support contact<input maxLength={160} value={form.supportContact} onChange={e => setForm({ ...form, supportContact: e.target.value })} placeholder="Email, phone বা support handle" /></label></div><div className="notice warning"><ShieldCheck size={15} /><span>কোনো ভুয়া payment number prefill করা নেই। Account field ফাঁকা থাকলে customer ঐ পদ্ধতিতে order দিতে পারবে না।</span></div></section>

      {/* Gmail Direct Mailer Configuration */}
      <section className="admin-panel settings-panel">
        <div className="panel-top">
          <div>
            <h2>Gmail Direct Mailer (ডোমেইন ছাড়া সরাসরি জিমেইল থেকে ইমেইল পাঠান)</h2>
            <p>আপনার ব্যক্তিগত বা বিজনেস Gmail অ্যাকাউন্ট দিয়ে সরাসরি কাস্টমারদের কাছে অ্যাকাউন্ট অ্যাক্টিভেশন লিঙ্ক ও ডেলিভারি কোড পাঠান। কোনো ডোমেইন DNS ভেরিফিকেশনের প্রয়োজন নেই!</p>
          </div>
          <Mail size={19} />
        </div>

        <div className="email-provider-state" style={{ marginBottom: "16px" }}>
          <span className={`status-chip ${emailConfig.data?.gmail?.configured ? "status-fulfilled" : "status-awaiting_payment"}`}>
            <i />{emailConfig.isLoading ? "Checking…" : emailConfig.data?.gmail?.configured ? "GMAIL ACTIVE & CONNECTED" : "GMAIL NOT CONFIGURED"}
          </span>
          {emailConfig.data?.gmail?.configured && emailConfig.data.gmail.user && (
            <span style={{ fontSize: "13px", color: "#08785f", fontWeight: 600 }}>
              সংযুক্ত Gmail: {emailConfig.data.gmail.user} {emailConfig.data.gmail.mode === "webhook" ? "(via Apps Script Webhook)" : "(via Direct SMTP)"}
            </span>
          )}
        </div>

        {/* Method selector tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`button ${gmailMode === "webhook" ? "button-primary" : "button-light"}`}
            style={{ fontSize: "13px", padding: "8px 14px" }}
            onClick={() => setGmailMode("webhook")}
          >
            ⚡ পদ্ধতি ১: Google Apps Script Webhook (Render Free-এর জন্য সুপারিশকৃত - ১০০% ফ্রি)
          </button>
          <button
            type="button"
            className={`button ${gmailMode === "smtp" ? "button-primary" : "button-light"}`}
            style={{ fontSize: "13px", padding: "8px 14px" }}
            onClick={() => setGmailMode("smtp")}
          >
            🔑 পদ্ধতি ২: Google App Password (SMTP - Paid Render বা নিজস্ব VPS)
          </button>
        </div>

        {gmailMode === "webhook" ? (
          <div>
            <div className="notice" style={{ marginBottom: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
              <Zap size={16} />
              <span>
                <strong>Render Free ব্যবহারকারীদের জন্য:</strong> Render.com তাদের ফ্রি প্ল্যানে আউটবাউন্ড SMTP পোর্ট (465 ও 587) ব্লক করে রাখে। এই Google Apps Script Webhook পদ্ধতিটি স্ট্যান্ডার্ড HTTPS পোর্ট (443) দিয়ে সরাসরি আপনার Gmail থেকে কাস্টমারকে ইমেইল পাঠায়—কোনো পোর্ট ব্লকের ঝামেলা নেই!
              </span>
            </div>

            <div className="settings-grid">
              <label className="field">
                আপনার Gmail ঠিকানা
                <input
                  type="email"
                  value={gmailUser}
                  onChange={e => setGmailUser(e.target.value)}
                  placeholder="yourshop@gmail.com"
                />
              </label>

              <label className="field">
                Google Apps Script Web App URL
                <input
                  type="url"
                  value={gmailWebhookUrl}
                  onChange={e => setGmailWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </label>

              <label className="field full-field">
                প্রেরক প্রদর্শিত নাম (Store / Sender Display Name)
                <input
                  type="text"
                  value={gmailFromName}
                  onChange={e => setGmailFromName(e.target.value)}
                  placeholder="AccZone Shop"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="button button-primary"
                onClick={() => configureGmail.mutate({ gmailUser, webhookUrl: gmailWebhookUrl, fromName: gmailFromName })}
                disabled={!gmailUser.trim() || !gmailWebhookUrl.trim() || configureGmail.isPending}
              >
                {configureGmail.isPending ? <LoaderCircle className="spin" size={14} /> : <ShieldCheck size={14} />}
                Webhook টেস্ট ও সংরক্ষণ করুন
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => setShowWebhookGuide(!showWebhookGuide)}
              >
                📖 ১ মিনিটের সেটআপ গাইড ও কোড দেখুন
              </button>
            </div>

            {showWebhookGuide && (
              <div className="notice" style={{ marginTop: "14px", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#1e293b", padding: "16px", borderRadius: "10px", fontSize: "13px", lineHeight: "1.7" }}>
                <strong>Google Apps Script Webhook সেটআপ করার ৫টি সহজ ধাপ:</strong>
                <ol style={{ margin: "8px 0 12px 18px", padding: 0 }}>
                  <li>আপনার ব্রাউজারে <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "underline", fontWeight: 600 }}>script.google.com</a>-এ যান এবং <strong>'New project'</strong>-এ ক্লিক করুন।</li>
                  <li>এডিটরে থাকা কোড মুছে নিচের কোডটুকু পেস্ট করুন:</li>
                </ol>

                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <pre style={{ background: "#0f172a", color: "#f8fafc", padding: "14px", borderRadius: "8px", overflowX: "auto", fontSize: "12px", margin: 0, fontFamily: "monospace" }}>
                    {APPS_SCRIPT_CODE}
                  </pre>
                  <button
                    type="button"
                    className="button button-light button-sm"
                    style={{ position: "absolute", top: "8px", right: "8px", fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => {
                      navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                  >
                    {copiedCode ? "✓ কপি হয়েছে!" : "কোড কপি করুন"}
                  </button>
                </div>

                <ol start={3} style={{ margin: "0 0 0 18px", padding: 0 }}>
                  <li>উপরের ডানপাশে <strong>Deploy</strong> বাটনে ক্লিক করে <strong>'New deployment'</strong> নির্বাচন করুন।</li>
                  <li>বামপাশের গিয়ার আইকনে ক্লিক করে <strong>'Web app'</strong> সিলেক্ট করুন। <strong>'Execute as'</strong>-এ 'Me' এবং <strong>'Who has access'</strong>-এ অবশ্যই <strong>'Anyone'</strong> দিন। এরপর <strong>Deploy</strong> চাপুন।</li>
                  <li>দেওয়া <strong>Web app URL</strong> (যা <code>/exec</code> দিয়ে শেষ হয়) কপি করে ওপরের বক্সে পেস্ট করে <strong>"Webhook টেস্ট ও সংরক্ষণ করুন"</strong> দিন!</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="notice warning" style={{ marginBottom: "14px" }}>
              <AlertTriangle size={16} />
              <span>
                <strong>সতর্কতা:</strong> Render.com তাদের Free হোস্টিংয়ে সরাসরি SMTP পোর্ট (465/587) ব্লক করে রাখে। আপনার Render যদি Free প্ল্যানে থাকে, তবে <code>Connection timeout</code> এরর আসবে। Free প্ল্যানের জন্য পদ্ধতি ১ (Google Apps Script Webhook) ব্যবহার করুন অথবা Render-কে $7 Starter প্ল্যানে আপগ্রেড করুন।
              </span>
            </div>

            <div className="settings-grid">
              <label className="field">
                আপনার Gmail ঠিকানা
                <input
                  type="email"
                  value={gmailUser}
                  onChange={e => setGmailUser(e.target.value)}
                  placeholder="yourshop@gmail.com"
                />
              </label>
              <label className="field">
                Google App Password (১৬ অক্ষরের পাসওয়ার্ড)
                <input
                  type="password"
                  value={gmailAppPass}
                  onChange={e => setGmailAppPass(e.target.value)}
                  placeholder="abcd efgh ijkl mnop"
                />
              </label>
              <label className="field full-field">
                প্রেরক প্রদর্শিত নাম (Store / Sender Display Name)
                <input
                  type="text"
                  value={gmailFromName}
                  onChange={e => setGmailFromName(e.target.value)}
                  placeholder="AccZone Shop"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="button button-primary"
                onClick={() => configureGmail.mutate({ gmailUser, appPassword: gmailAppPass, fromName: gmailFromName })}
                disabled={!gmailUser.trim() || !gmailAppPass.trim() || configureGmail.isPending}
              >
                {configureGmail.isPending ? <LoaderCircle className="spin" size={14} /> : <ShieldCheck size={14} />}
                Gmail টেস্ট ও সংরক্ষণ করুন
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => setShowGmailHelp(!showGmailHelp)}
              >
                💡 কীভাবে Google App Password পাবেন?
              </button>
            </div>

            {showGmailHelp && (
              <div className="notice" style={{ marginTop: "14px", background: "#f0f7f4", border: "1px solid #cce8dc", color: "#164e3f", padding: "16px", borderRadius: "10px", fontSize: "13px", lineHeight: "1.7" }}>
                <strong>Google App Password পাওয়ার সহজ ৫টি ধাপ:</strong>
                <ol style={{ margin: "8px 0 0 18px", padding: 0 }}>
                  <li>আপনার ব্রাউজারে <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: "#08785f", textDecoration: "underline", fontWeight: 600 }}>myaccount.google.com/security</a>-তে যান।</li>
                  <li><strong>'2-Step Verification'</strong> অপশনটি চালু আছে কিনা নিশ্চিত করুন (না থাকলে চালু করুন)।</li>
                  <li>সার্চ বারে <strong>'App passwords'</strong> লিখে সার্চ করুন (অথবা 2-Step Verification-এর নিচে 'App passwords'-এ ক্লিক করুন)।</li>
                  <li>App name হিসেবে <code>AccShop</code> লিখে <strong>'Create'</strong> চাপুন।</li>
                  <li>একটি ১৬ অক্ষরের পাসওয়ার্ড (যেমন: <code>abcd efgh ijkl mnop</code>) পাবেন। সেটি কপি করে উপরের বক্সে পেস্ট করে <strong>"Gmail টেস্ট ও সংরক্ষণ করুন"</strong> বাটনে ক্লিক করুন।</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {emailConfig.data?.gmail?.configured && (
          <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--line, #e8eeeb)" }}>
            <label className="field" style={{ maxWidth: "440px" }}>
              টেস্ট ইমেইল পাঠান (Send Test Mail)
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={e => setTestEmailTarget(e.target.value)}
                  placeholder="test@example.com"
                />
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => sendTestEmail.mutate({ targetEmail: testEmailTarget })}
                  disabled={!testEmailTarget.trim() || sendTestEmail.isPending}
                >
                  {sendTestEmail.isPending ? <LoaderCircle className="spin" size={14} /> : <Mail size={14} />}
                  পাঠান
                </button>
              </div>
            </label>
          </div>
        )}
      </section>

      {/* Resend Optional Domain Email */}
      <section className="admin-panel settings-panel"><div className="panel-top"><div><h2>Domain transactional email (Optional / Resend)</h2><p>কাস্টম ডোমেইনের নিজস্ব DNS/DKIM ভেরিফিকেশন থাকলে Resend API ব্যবহার করতে পারেন।</p></div><Mail size={19} /></div><div className="settings-grid"><label className="field full-field">Public storefront URL<input type="url" required value={form.publicSiteUrl} onChange={event => setForm({ ...form, publicSiteUrl: event.target.value })} placeholder="https://your-shop.example" /><small>Magic-link ও activation destination; HTTPS URL দিন।</small></label><label className="field full-field">Verified Resend sender email<input type="email" maxLength={320} value={form.resendFromEmail} onChange={event => setForm({ ...form, resendFromEmail: event.target.value })} placeholder="orders@your-verified-domain.com" /><small>Resend-এ verify করা sender domain থেকে হতে হবে।</small></label></div><div className="email-provider-state"><span className={`status-chip ${emailConfig.data?.resend?.configured ? "status-fulfilled" : "status-awaiting_payment"}`}><i />{emailConfig.isLoading ? "Checking…" : emailConfig.data?.resend?.configured ? "RESEND KEY CONFIGURED" : "RESEND KEY NOT SET"}</span><span className={`status-chip ${senderVerified ? "status-fulfilled" : "status-fulfillment_unknown"}`}><i />{senderVerified ? "SENDER VERIFIED" : "SENDER NEEDS VERIFICATION"}</span><p>{emailConfig.data?.domains.length ? `Verified domains: ${emailConfig.data.domains.filter(domain => domain.status === "verified" && domain.sendingEnabled).map(domain => domain.name).join(", ") || "none"}` : "Resend account-এ domain verify ও sending enable করুন."}</p><a className="text-link" href="https://resend.com/domains" target="_blank" rel="noreferrer">Resend domain settings <ExternalLink size={12} /></a></div><label className="field email-key-field">Resend API key <span className="optional">key শুধু secure server request-এ যাবে, পরে দেখানো হবে না</span><input type="password" autoComplete="new-password" value={resendKey} onChange={event => setResendKey(event.target.value)} minLength={8} maxLength={2048} placeholder={emailConfig.data?.resend?.configured ? "Replace করতে নতুন Resend key লিখুন" : "re_…"} /></label><button type="button" className="button button-secondary" onClick={() => configureEmail.mutate({ apiKey: resendKey })} disabled={!resendKey.trim() || configureEmail.isPending}>{configureEmail.isPending ? <LoaderCircle className="spin" size={14} /> : <ShieldCheck size={14} />}{emailConfig.data?.resend?.configured ? "Verify & replace Resend key" : "Verify & save Resend key"}</button></section>
      <div className="settings-save-row"><span>{data?.updatedAt ? `Last updated ${dateText(data.updatedAt)}` : "Manual payment setup unfinished"}</span><button className="button button-primary" type="submit" disabled={save.isPending}>{save.isPending ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />} Save settings</button></div>
    </form>}
    <AdminSecuritySection />
  </>;
}

function AdminSecuritySection() {
  const utils = trpc.useUtils();
  const { data: sec, isLoading } = trpc.shop.admin.security.get.useQuery();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (sec) {
      setNewUsername(sec.username || "admin");
      setNewEmail(sec.email || "");
    }
  }, [sec]);

  const updateSecurity = trpc.shop.admin.security.update.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      void utils.shop.admin.security.get.invalidate();
      void utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("বর্তমান পাসওয়ার্ড দেওয়া আবশ্যক।");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    updateSecurity.mutate({
      currentPassword,
      newUsername: newUsername.trim() || undefined,
      newEmail: newEmail.trim() || undefined,
      newPassword: newPassword.trim() || undefined,
    });
  };

  return (
    <section className="admin-panel settings-panel" style={{ marginTop: "24px" }}>
      <div className="panel-top">
        <div>
          <h2>Admin Account & Security (অ্যাডমিন নিরাপত্তা ও ক্রেডেনশিয়ালস)</h2>
          <p>আপনার অ্যাডমিন Username, Email এবং Password পরিবর্তন করুন। সকল ডেটা Scrypt ক্রিপ্টোগ্রাফিক সল্ট সহ এনক্রিপ্ট হয়ে ডাটাবেজে সংরক্ষিত থাকে।</p>
        </div>
        <ShieldCheck size={20} />
      </div>

      <div className="security-status-bar" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "0.75rem 1rem", background: "var(--surface, #f8fbf9)", borderRadius: "8px", border: "1px solid var(--line, #e2eae5)", marginBottom: "1rem" }}>
        <div><small style={{ color: "#6b7c75" }}>বর্তমান ইউজারনেম:</small> <b>{sec?.username || "admin"}</b></div>
        <div><small style={{ color: "#6b7c75" }}>অ্যাডমিন ইমেইল:</small> <b>{sec?.email || "admin@acczone.shop"}</b></div>
        <div><small style={{ color: "#6b7c75" }}>পাসওয়ার্ড সিকিউরিটি:</small> <span style={{ color: sec?.hasCustomPassword ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{sec?.hasCustomPassword ? "✓ Scrypt Encrypted (Custom)" : "Default / Env Secret"}</span></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-grid">
          <label className="field">
            Admin Username
            <input
              type="text"
              required
              minLength={2}
              maxLength={128}
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="admin"
            />
          </label>

          <label className="field">
            Admin Email
            <input
              type="email"
              required
              maxLength={320}
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
            />
          </label>

          <label className="field">
            নতুন Password <span className="optional">(পরিবর্তন না করতে চাইলে ফাঁকা রাখুন)</span>
            <span className="secret-input-wrap">
              <input
                type={showNewPw ? "text" : "password"}
                minLength={6}
                maxLength={128}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
              />
              <button type="button" className="reveal-key" onClick={() => setShowNewPw(!showNewPw)}>
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <label className="field">
            Confirm নতুন Password
            <input
              type={showNewPw ? "text" : "password"}
              maxLength={128}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="নতুন পাসওয়ার্ড পুনরায় লিখুন"
            />
          </label>

          <label className="field full-field" style={{ borderTop: "1px solid var(--line, #e2eae5)", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <b>বর্তমান Password (নিশ্চিতকরণের জন্য আবশ্যক)</b>
            <span className="secret-input-wrap">
              <input
                type={showCurrentPw ? "text" : "password"}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="পরিবর্তন সেভ করতে বর্তমান অ্যাডমিন পাসওয়ার্ড দিন"
              />
              <button type="button" className="reveal-key" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
        </div>

        <div className="notice" style={{ marginTop: "1rem" }}>
          <ShieldCheck size={16} />
          <span>পাসওয়ার্ড পরিবর্তনের সাথে সাথে নতুন পাসওয়ার্ড দিয়ে লগইন ভ্যালিডেট হবে। নতুন ইমেইল স্বয়ংক্রিয়ভাবে অ্যাডমিন অ্যাক্সেস প্রিভিলেজ পাবে।</span>
        </div>

        <button
          className="button button-primary"
          type="submit"
          disabled={updateSecurity.isPending || !currentPassword.trim()}
          style={{ marginTop: "1rem" }}
        >
          {updateSecurity.isPending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
          {updateSecurity.isPending ? "সেভ হচ্ছে…" : "Update Admin Credentials"}
        </button>
      </form>
    </section>
  );
}

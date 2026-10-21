import { BrandMark } from "@/components/StoreHeader";
import { BrandLogoSquircle, BRAND_ICON_PRESETS, BrandIconPickerModal } from "@/components/BrandLogos";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatMoney, orderStatusLabels } from "@/lib/shop";
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, BadgeCheck, Banknote, Bot, Boxes, Check, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, Clock3, Copy, CreditCard, Database, ExternalLink, Eye, EyeOff, FileText, Fingerprint, Globe, ImagePlus, KeyRound, LayoutDashboard, Link2, LoaderCircle, LogOut, Mail, PackageCheck, Plus, RefreshCw, RotateCcw, Save, Search, Settings2, Share2, Shield, ShieldCheck, ShoppingBag, Sparkles, Store, Tag, Trash2, TrendingUp, UserCheck, UserPlus, Users, Wallet, X, Zap } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

type AdminTab = "overview" | "services" | "vault" | "orders" | "connection" | "history" | "settings";
const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "services", label: "Services & prices", icon: Boxes },
  { id: "vault", label: "Stock Vault (নিজস্ব স্টক)", icon: Database },
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
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const utils = trpc.useUtils();
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
  const hasPasskeysQuery = trpc.auth.hasPasskeys.useQuery(undefined, { retry: false });
  const passkeyAuthOptions = trpc.auth.passkeyAuthOptions.useMutation();
  const passkeyVerifyAuth = trpc.auth.passkeyVerifyAuth.useMutation({
    onSuccess: () => {
      toast.success("Passkey / বায়োমেট্রিক দিয়ে সফলভাবে Admin সাইন ইন হয়েছে!");
      void utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Passkey ভেরিফিকেশন ব্যর্থ হয়েছে");
    },
  });

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyLoading(true);
      const options = await passkeyAuthOptions.mutateAsync();
      const authResp = await startAuthentication(options as any);
      await passkeyVerifyAuth.mutateAsync({ response: authResp });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Passkey সাইন ইন বাতিল করা হয়েছে");
      } else {
        toast.error(err?.message || "Passkey সাইন ইন ব্যর্থ হয়েছে");
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

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
      <form onSubmit={(e) => {
        e.preventDefault();
        const trimmedUser = adminUsername.trim();
        const trimmedPw = adminPassword.trim();
        if (!trimmedUser) {
          toast.error("Admin username অথবা email দেওয়া আবশ্যক।");
          return;
        }
        if (!trimmedPw) {
          toast.error("Admin password দেওয়া আবশ্যক।");
          return;
        }
        loginWithSecret.mutate({ username: trimmedUser, password: trimmedPw });
      }} className="admin-login-form">
        <input
          type="text"
          value={adminUsername}
          onChange={(e) => setAdminUsername(e.target.value)}
          placeholder="Admin username অথবা email *"
          className="admin-password-input"
          style={{ marginBottom: "10px" }}
          required
        />
        <div className="password-input-wrap">
          <input
            type={showPassword ? "text" : "password"}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Admin password দিন *"
            className="admin-password-input"
            required
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

      {/* Biometric / Passkey Login Option */}
      <div className="login-divider"><span>অথবা বায়োমেট্রিক</span></div>
      <button
        type="button"
        className="button button-secondary gate-button"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          borderColor: "#0b765c",
          background: "#f0fdf4",
          color: "#065f46",
          fontWeight: 600,
        }}
        onClick={handlePasskeyLogin}
        disabled={passkeyLoading || passkeyAuthOptions.isPending || passkeyVerifyAuth.isPending}
      >
        {passkeyLoading || passkeyAuthOptions.isPending || passkeyVerifyAuth.isPending ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <Fingerprint size={18} style={{ color: "#0b765c" }} />
        )}
        Passkey / Touch ID দিয়ে সাইন ইন
      </button>

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
      <div className="admin-content">{tab === "overview" && <Overview onSelect={setTab} />}{tab === "services" && <ServicesSection />}{tab === "vault" && <VaultSection />}{tab === "orders" && <OrdersSection />}{tab === "connection" && <ConnectionSection />}{tab === "history" && <HistorySection />}{tab === "settings" && <SettingsSection />}</div>
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
  const [providerFilter, setProviderFilter] = useState<string>("all");
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

  const syncProvider = (provider: string) => sync.mutate({ provider });

  const distinctProviders = Array.from(new Set(data.map(item => item.provider))).filter(Boolean);
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
        <button
          className="button button-light"
          onClick={() => syncProvider("aitoolify")}
          disabled={syncAll.isPending || sync.isPending}
        >
          <RefreshCw className={sync.isPending ? "spin" : ""} size={14} /> Aitoolify Bot
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
          {distinctProviders
            .filter(p => p !== "acczone" && p !== "couponshops")
            .map(p => (
              <button
                key={p}
                type="button"
                className={`admin-chip ${providerFilter === p ? "active" : ""}`}
                onClick={() => setProviderFilter(p)}
              >
                {p === "aitoolify" ? "Aitoolify Bot" : p}
              </button>
            ))}
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

type ServiceRowInput = {
  serviceKey: string;
  provider: string;
  providerServiceId: string;
  name: string;
  description: string | null;
  customDescription?: string | null;
  supplierPrice: number;
  supplierCurrency: string;
  providerRate: number;
  pricingTiers: string | null;
  stock: number;
  reservedStock: number;
  isActive: number;
  isListed: number;
  retailPrice: number;
  imageUrl: string | null;
  lastStockSyncedAt: Date | null;
  priceReviewRequired: number;
  priceMarkupRatio: number;
  warrantyText?: string | null;
  warrantyDays?: number | null;
  isFlashSale?: number | null;
  flashSalePrice?: number | null;
  flashSaleEndsAt?: Date | string | null;
  tags?: string | null;
  slug?: string | null;
};

function ServiceRow({ item }: { item: ServiceRowInput }) {
  const utils = trpc.useUtils();
  const [price, setPrice] = useState(String(item.retailPrice || ""));
  const [listed, setListed] = useState(Boolean(item.isListed));
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [customDesc, setCustomDesc] = useState(item.customDescription || "");
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [editIconOpen, setEditIconOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Warranty, Flash Sale, Tags
  const [warrantyText, setWarrantyText] = useState(item.warrantyText || "");
  const [warrantyDays, setWarrantyDays] = useState(item.warrantyDays != null ? String(item.warrantyDays) : "");
  const [isFlashSale, setIsFlashSale] = useState(Boolean(item.isFlashSale));
  const [flashSalePrice, setFlashSalePrice] = useState(item.flashSalePrice != null ? String(item.flashSalePrice) : "");
  const [tags, setTags] = useState(item.tags || "");
  const [optionsOpen, setOptionsOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const needsPriceReview = item.priceReviewRequired === 1 || (Number(price) > 0 && item.retailPrice <= 0 && (item.supplierPrice <= 0 || item.priceMarkupRatio === 0));

  const save = trpc.shop.admin.services.update.useMutation({
    onSuccess: () => {
      toast.success(reviewConfirmed ? "দাম save এবং review complete হয়েছে" : "Service update হয়েছে");
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setPrice(String(item.retailPrice || ""));
    setListed(Boolean(item.isListed));
    setReviewConfirmed(false);
    setCustomDesc(item.customDescription || "");
    setImageUrl(item.imageUrl || "");
    setWarrantyText(item.warrantyText || "");
    setWarrantyDays(item.warrantyDays != null ? String(item.warrantyDays) : "");
    setIsFlashSale(Boolean(item.isFlashSale));
    setFlashSalePrice(item.flashSalePrice != null ? String(item.flashSalePrice) : "");
    setTags(item.tags || "");
  }, [item.retailPrice, item.isListed, item.priceReviewRequired, item.customDescription, item.imageUrl, item.warrantyText, item.warrantyDays, item.isFlashSale, item.flashSalePrice, item.tags]);

  const available = Math.max(0, item.stock - item.reservedStock);
  let tiers: Array<{ minQuantity: number; maxQuantity: number; priceInr: number; priceUsdt: number }> = [];
  try { const parsed: unknown = item.pricingTiers ? JSON.parse(item.pricingTiers) : []; if (Array.isArray(parsed)) tiers = parsed as typeof tiers; } catch { tiers = []; }
  const supplierLabel = item.provider === "couponshops" ? `₹${tiers[0]?.priceInr ?? "—"} / ${tiers[0]?.priceUsdt ?? "—"} USDT` : `${item.supplierPrice} provider units`;

  const upload = async (file: File) => {
    try {
      setUploading(true);
      const blob = await compressProductImage(file);
      const response = await fetch(`/api/admin/product-image/${encodeURIComponent(item.serviceKey)}`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const payload = await response.json().catch(() => ({})) as { error?: string; imageUrl?: string };
      if (!response.ok) throw new Error(payload.error || "Product image save হয়নি।");
      if (payload.imageUrl) setImageUrl(payload.imageUrl);
      toast.success("Product image secure storage-এ save হয়েছে");
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image upload ব্যর্থ হয়েছে"); }
    finally { setUploading(false); }
  };

  const handleSaveAll = () => {
    save.mutate({
      serviceKey: item.serviceKey,
      retailPrice: Number(price || 0),
      isListed: listed,
      confirmPriceReview: reviewConfirmed,
      customDescription: customDesc.trim() || null,
      imageUrl: imageUrl.trim() || null,
      warrantyText: warrantyText.trim() || null,
      warrantyDays: warrantyDays ? parseInt(warrantyDays, 10) : undefined,
      isFlashSale: isFlashSale,
      flashSalePrice: flashSalePrice ? parseFloat(flashSalePrice) : null,
      tags: tags.trim() || null,
    });
  };

  const productSlug = item.slug || item.serviceKey;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${productSlug}` : `/p/${productSlug}`;

  const copyProductLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl);
      toast.success(`প্রোডাক্ট লিংক কপি হয়েছে: /p/${productSlug}`);
    }
  };

  return <div className="service-row">
    <div className="service-cell">
      <BrandLogoSquircle brand={item.name} imageUrl={imageUrl} size={42} className="shrink-0" />
      <div>
        <div className="flex items-center gap-2">
          <b>{item.name}</b>
          {isFlashSale && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Zap size={10} className="fill-amber-500 text-amber-500" /> ফ্ল্যাশ সেল
            </span>
          )}
          {warrantyText && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={10} /> {warrantyText}
            </span>
          )}
        </div>
        <small>{item.provider} · {item.providerServiceId || item.serviceKey}</small>

        {/* Quick action triggers */}
        <div className="flex items-center flex-wrap gap-2.5 mt-1">
          {/* Brand Icon Trigger */}
          <button
            type="button"
            className="text-link flex items-center gap-1 text-[11px]"
            onClick={() => setPickerModalOpen(true)}
          >
            <Sparkles size={11} />
            {imageUrl ? "Change icon" : "Brand icon library"}
          </button>

          {/* Copy Shareable Product Link */}
          <button
            type="button"
            className="text-link flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800"
            onClick={copyProductLink}
            title="সরাসরি প্রোডাক্ট লিঙ্ক কপি করুন"
          >
            <Copy size={11} />
            লিংক কপি (/p/{productSlug})
          </button>
          <a
            href={`/p/${productSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-600 inline-flex items-center"
            title="Storefront-এ দেখুন"
          >
            <ExternalLink size={11} />
          </a>

          {/* Flash Sale, Warranty & Tags Drawer Trigger */}
          <button
            type="button"
            className="text-link flex items-center gap-1 text-[11px] text-indigo-700 hover:text-indigo-800"
            onClick={() => setOptionsOpen(!optionsOpen)}
          >
            <Tag size={11} />
            {optionsOpen ? "Hide extra settings" : "⚡ ফ্ল্যাশ সেল, ওয়ারেন্টি ও ট্যাগ"}
          </button>
        </div>

        {/* Brand Icon Picker Modal */}
        <BrandIconPickerModal
          isOpen={pickerModalOpen}
          onClose={() => setPickerModalOpen(false)}
          currentValue={imageUrl}
          onSelect={(iconId: string) => {
            setImageUrl(iconId);
            setPickerModalOpen(false);
            save.mutate({
              serviceKey: item.serviceKey,
              retailPrice: Number(price || 0),
              isListed: listed,
              confirmPriceReview: reviewConfirmed,
              customDescription: customDesc.trim() || null,
              imageUrl: iconId,
              warrantyText: warrantyText.trim() || null,
              warrantyDays: warrantyDays ? parseInt(warrantyDays, 10) : undefined,
              isFlashSale: isFlashSale,
              flashSalePrice: flashSalePrice ? parseFloat(flashSalePrice) : null,
              tags: tags.trim() || null,
            });
            toast.success("ব্র্যান্ড আইকন সংরক্ষিত হয়েছে!");
          }}
        />

        {/* Extra Options Panel (Flash Sale, Warranty, Tags) */}
        {optionsOpen && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl my-2 flex flex-col gap-2.5 max-w-lg">
            <div className="flex items-center justify-between pb-1 border-b border-indigo-200">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Tag size={13} /> ফ্ল্যাশ সেল, প্রোডাক্ট ওয়ারেন্টি ও ট্যাগ ম্যানেজমেন্ট
              </span>
              <button type="button" className="text-xs text-indigo-500 hover:text-indigo-800" onClick={() => setOptionsOpen(false)}>
                <X size={14} />
              </button>
            </div>

            {/* Flash Sale Settings */}
            <div className="bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={isFlashSale}
                  onChange={(e) => setIsFlashSale(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="flex items-center gap-1">
                  <Zap size={13} className="text-amber-500 fill-amber-500" />
                  ফ্ল্যাশ সেল (Flash Sale) সক্রিয় করুন
                </span>
              </label>

              {isFlashSale && (
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 shrink-0">
                    ফ্ল্যাশ সেল ডিসকাউন্ট মূল্য (BDT):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={flashSalePrice}
                    onChange={(e) => setFlashSalePrice(e.target.value)}
                    placeholder="যেমন: ৩৫০"
                    className="flex-1 px-2.5 py-1 text-xs border rounded-lg bg-white outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Warranty Settings */}
            <div className="bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                ওয়ারেন্টি ও রিপ্লেসমেন্ট পলিসি
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={warrantyText}
                    onChange={(e) => setWarrantyText(e.target.value)}
                    placeholder="যেমন: ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি"
                    className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    placeholder="দিন (যেমন: 7)"
                    className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Product Tags */}
            <div className="bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Tag size={13} className="text-indigo-600" />
                প্রোডাক্ট সার্চ ট্যাগ ও ব্যাজ (কমা দিয়ে লিখুন)
              </span>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="যেমন: হট ডিল, ইনস্ট্যান্ট, অটো ডেলিভারি, ভেরিফাইড"
                className="w-full px-2.5 py-1 text-xs border rounded-lg bg-white outline-none focus:border-indigo-600"
              />
              {tags && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.split(",").map((t, idx) => t.trim() ? (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      #{t.trim()}
                    </span>
                  ) : null)}
                </div>
              )}
            </div>

            {/* Save Extra Options Button */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="button button-sm button-light"
                onClick={() => setOptionsOpen(false)}
              >
                বাতিল
              </button>
              <button
                type="button"
                className="button button-sm button-primary"
                onClick={() => {
                  handleSaveAll();
                  setOptionsOpen(false);
                }}
                disabled={save.isPending}
              >
                {save.isPending ? <LoaderCircle size={12} className="spin" /> : <Save size={12} />}
                সেটিংস সেভ করুন
              </button>
            </div>
          </div>
        )}

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
            <button type="button" className="button button-sm button-primary" onClick={() => { handleSaveAll(); setEditDescOpen(false); }} disabled={save.isPending}>Save description</button>
            {item.customDescription && <button type="button" className="button button-sm button-light" onClick={() => { setCustomDesc(""); save.mutate({ serviceKey: item.serviceKey, retailPrice: Number(price || 0), isListed: listed, confirmPriceReview: reviewConfirmed, customDescription: null, imageUrl: imageUrl.trim() || null, warrantyText: warrantyText.trim() || null, isFlashSale, flashSalePrice: flashSalePrice ? parseFloat(flashSalePrice) : null, tags: tags.trim() || null }); setEditDescOpen(false); }} disabled={save.isPending}>Reset to supplier</button>}
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
    <button className="icon-save" title={needsPriceReview ? "Save price and mark reviewed" : "Save service"} onClick={handleSaveAll} disabled={save.isPending || (needsPriceReview && listed && !reviewConfirmed)}><Save size={15} /></button>
  </div>;
}

function VaultSection() {
  const utils = trpc.useUtils();
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "available" | "reserved" | "sold">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});

  // Modals state
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [addBulkOpen, setAddBulkOpen] = useState(false);
  const [bulkServiceKey, setBulkServiceKey] = useState("");

  // Queries
  const productsQuery = trpc.shop.admin.customInventory.listProducts.useQuery();
  const itemsQuery = trpc.shop.admin.customInventory.listItems.useQuery({
    serviceKey: selectedProduct === "all" ? undefined : selectedProduct,
    status: selectedStatus,
    search: search.trim() || undefined,
    page,
    limit: 50,
  });

  // Mutations
  const deleteItem = trpc.shop.admin.customInventory.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("আইটেম ডিলিট করা হয়েছে");
      void utils.shop.admin.customInventory.listItems.invalidate();
      void utils.shop.admin.customInventory.listProducts.invalidate();
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const returnToStock = trpc.shop.admin.customInventory.returnToStock.useMutation({
    onSuccess: () => {
      toast.success("আইটেম পুনরায় সচল স্টকে যুক্ত করা হয়েছে!");
      void utils.shop.admin.customInventory.listItems.invalidate();
      void utils.shop.admin.customInventory.listProducts.invalidate();
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const refreshAll = () => {
    void utils.shop.admin.customInventory.listProducts.invalidate();
    void utils.shop.admin.customInventory.listItems.invalidate();
  };

  const products = productsQuery.data || [];
  const totalProducts = products.length;
  const totalAvailable = products.reduce((acc, p) => acc + (p.availableCount || 0), 0);
  const totalSold = products.reduce((acc, p) => acc + (p.soldCount || 0), 0);
  const totalUploaded = products.reduce((acc, p) => acc + (p.totalUploaded || 0), 0);

  const toggleReveal = (id: number) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCredential = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Credential কপি হয়েছে!");
  };

  const openBulkModalFor = (key: string) => {
    setBulkServiceKey(key);
    setAddBulkOpen(true);
  };

  return (
    <>
      <div className="admin-heading">
        <div>
          <div className="eyebrow">DIGITAL INVENTORY & VAULT <span className="heading-line" /></div>
          <h1>Stock Vault (নিজস্ব স্টক)</h1>
          <p>আপনার নিজস্ব অ্যাকাউন্ট (user:pass), ইনভাইট/রিডিম লিঙ্ক বা অ্যাক্টিভেশন কোড বাল্ক আপলোড করুন। কাস্টমার অর্ডার করার সাথে সাথে স্বয়ংক্রিয়ভাবে ইমেইলে চলে যাবে এবং ভল্ট থেকে সোল্ড লিস্টে সরবে।</p>
        </div>
        <div className="sync-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => setCreateProductOpen(true)}
          >
            <Plus size={15} /> নতুন নিজস্ব প্রোডাক্ট
          </button>
          <button
            type="button"
            className="button button-light"
            onClick={() => {
              if (products.length > 0) {
                setBulkServiceKey(selectedProduct !== "all" ? selectedProduct : products[0].serviceKey);
              }
              setAddBulkOpen(true);
            }}
            disabled={products.length === 0}
          >
            <Database size={15} /> বাল্ক স্টক যোগ করুন
          </button>
          <button
            type="button"
            className="button button-light"
            onClick={refreshAll}
            title="রিফ্রেশ"
          >
            <RefreshCw size={14} className={productsQuery.isFetching || itemsQuery.isFetching ? "spin" : ""} /> রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon mint"><Boxes size={18} /></div>
          <span>মোট নিজস্ব প্রোডাক্ট</span>
          <strong>{productsQuery.isLoading ? "—" : totalProducts}</strong>
          <small>কাস্টম সার্ভিস ক্যাটালগ</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue"><PackageCheck size={18} /></div>
          <span>বর্তমানে স্টকে আছে (Available)</span>
          <strong>{productsQuery.isLoading ? "—" : totalAvailable}</strong>
          <small>বিক্রির জন্য প্রস্তুত ক্রেডেনশিয়াল</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet"><CheckCircle2 size={18} /></div>
          <span>বিক্রি হয়েছে (Delivered Sold)</span>
          <strong>{productsQuery.isLoading ? "—" : totalSold}</strong>
          <small>অর্ডারে স্বয়ংক্রিয়ভাবে ডেলিভার্ড</small>
        </article>
        <article className="stat-card">
          <div className="stat-icon amber"><KeyRound size={18} /></div>
          <span>সর্বমোট আপলোডকৃত</span>
          <strong>{productsQuery.isLoading ? "—" : totalUploaded}</strong>
          <small>আজীবন ভল্ট অ্যাকাউন্ট হিস্ট্রি</small>
        </article>
      </div>

      {/* Custom Products List Card */}
      <div className="admin-panel" style={{ padding: "18px 20px", marginBottom: "22px" }}>
        <div className="panel-top" style={{ marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>নিজস্ব প্রোডাক্ট ও স্টক সামারি ({products.length}টি)</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-soft, #52615b)" }}>
              প্রতিটি নিজস্ব প্রোডাক্টের লাইভ স্টক সরাসরি ভল্টের সচল অ্যাকাউন্ট সংখ্যার সমান থাকে।
            </p>
          </div>
          <button
            type="button"
            className="button button-sm button-light"
            onClick={() => setCreateProductOpen(true)}
          >
            <Plus size={13} /> নতুন প্রোডাক্ট
          </button>
        </div>

        {productsQuery.isLoading ? (
          <PanelLoading />
        ) : products.length === 0 ? (
          <div className="empty-admin" style={{ padding: "28px 16px" }}>
            <KeyRound size={26} />
            <b>এখনো কোনো নিজস্ব প্রোডাক্ট তৈরি করা হয়নি</b>
            <span>আপনার অ্যাকাউন্ট বা রিডিম লিঙ্ক বিক্রির জন্য প্রথমে "নতুন নিজস্ব প্রোডাক্ট" তৈরি করুন।</span>
            <button
              type="button"
              className="button button-primary"
              style={{ marginTop: "12px" }}
              onClick={() => setCreateProductOpen(true)}
            >
              <Plus size={14} /> প্রথম প্রোডাক্ট তৈরি করুন
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {products.map((prod) => (
              <div
                key={prod.serviceKey}
                style={{
                  border: selectedProduct === prod.serviceKey ? "2px solid #0b765c" : "1px solid var(--line, #e2ece6)",
                  borderRadius: "14px",
                  padding: "14px",
                  background: selectedProduct === prod.serviceKey ? "#f3faf6" : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <BrandLogoSquircle
                    brand={prod.serviceKey.replace("custom_", "")}
                    imageUrl={prod.imageUrl || undefined}
                    size={42}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <b style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={prod.name}>
                        {prod.name}
                      </b>
                      <span className={`status-chip ${prod.isListed ? "status-fulfilled" : "status-cancelled"}`} style={{ fontSize: "10px", padding: "2px 7px" }}>
                        {prod.isListed ? "Live Store" : "Unlisted"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--padma, #0b765c)" }}>
                        ৳{prod.retailPrice}
                      </span>
                      <small style={{ color: "var(--text-soft, #718096)", fontSize: "11px" }}>বিক্রয়মূল্য</small>
                    </div>
                    {prod.customDescription && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {prod.customDescription}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #edf2f7", paddingTop: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
                    <span style={{ color: "#0b765c", fontWeight: 700 }}>
                      ● {prod.availableCount} স্টকে
                    </span>
                    <span style={{ color: "#6b21a8", fontWeight: 600 }}>
                      ✔ {prod.soldCount} বিক্রি
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className="button button-sm button-light"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                      onClick={() => {
                        const url = `${window.location.origin}/p/${prod.slug || prod.serviceKey}`;
                        void navigator.clipboard.writeText(url);
                        toast.success(`প্রোডাক্ট লিংক কপি হয়েছে: /p/${prod.slug || prod.serviceKey}`);
                      }}
                      title="সরাসরি প্রোডাক্ট লিঙ্ক কপি করুন"
                    >
                      <Copy size={12} /> লিংক কপি
                    </button>
                    <button
                      type="button"
                      className="button button-sm button-light"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                      onClick={() => openBulkModalFor(prod.serviceKey)}
                      title="এই প্রোডাক্টে নতুন অ্যাকাউন্ট যোগ করুন"
                    >
                      <Plus size={12} /> স্টক যোগ
                    </button>
                    <button
                      type="button"
                      className={`button button-sm ${selectedProduct === prod.serviceKey ? "button-primary" : "button-light"}`}
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                      onClick={() => {
                        setSelectedProduct(selectedProduct === prod.serviceKey ? "all" : prod.serviceKey);
                        setPage(1);
                      }}
                    >
                      {selectedProduct === prod.serviceKey ? "ফিল্টার সরান" : "আইটেম ভিউ"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Vault Explorer Toolbar */}
      <div className="admin-toolbar" style={{ flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        <div className="toolbar-search" style={{ minWidth: "240px", flex: 1 }}>
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ক্রেডেনশিয়াল টেক্সট, কাস্টমার ইমেইল বা অর্ডার নম্বর দিয়ে খুঁজুন..."
          />
        </div>

        <div className="admin-filter-group">
          {/* Product Filter dropdown */}
          <select
            value={selectedProduct}
            onChange={(e) => {
              setSelectedProduct(e.target.value);
              setPage(1);
            }}
            className="admin-password-input"
            style={{ padding: "6px 12px", width: "auto", fontSize: "12px", height: "36px" }}
          >
            <option value="all">সব প্রোডাক্ট ({products.length}টি)</option>
            {products.map((p) => (
              <option key={p.serviceKey} value={p.serviceKey}>
                {p.name} ({p.availableCount} স্টকে)
              </option>
            ))}
          </select>

          {/* Status Filter Chips */}
          <div className="chip-selector" role="group">
            <button
              type="button"
              className={`admin-chip ${selectedStatus === "all" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("all"); setPage(1); }}
            >
              সব আইটেম
            </button>
            <button
              type="button"
              className={`admin-chip ${selectedStatus === "available" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("available"); setPage(1); }}
            >
              Available (স্টকে আছে)
            </button>
            <button
              type="button"
              className={`admin-chip ${selectedStatus === "sold" ? "active" : ""}`}
              onClick={() => { setSelectedStatus("sold"); setPage(1); }}
            >
              Sold (বিক্রি হয়েছে)
            </button>
          </div>
        </div>
      </div>

      {/* Items Table Panel */}
      <div className="admin-panel table-panel">
        <div
          className="table-head"
          style={{
            gridTemplateColumns: "1.4fr 2fr 1fr 1.6fr 0.8fr",
            minWidth: "750px",
            display: "grid",
            padding: "10px 16px",
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--text-soft, #52615b)",
            borderBottom: "1px solid var(--line, #e2ece6)",
          }}
        >
          <span>Product</span>
          <span>Credential / Account / Link</span>
          <span>Status</span>
          <span>Details / History</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {itemsQuery.isLoading ? (
          <PanelLoading />
        ) : !itemsQuery.data?.items.length ? (
          <div className="empty-admin" style={{ padding: "36px 16px" }}>
            <Database size={24} />
            <b>কোনো আইটেম পাওয়া যায়নি</b>
            <span>
              {selectedStatus === "sold"
                ? "এখনো কোনো অ্যাকাউন্ট বিক্রি হয়নি।"
                : "স্টকে অ্যাকাউন্ট যোগ করতে উপরে '+ বাল্ক স্টক যোগ করুন' বাটনে ক্লিক করুন।"}
            </span>
          </div>
        ) : (
          itemsQuery.data.items.map((item) => {
            const isRevealed = Boolean(revealedIds[item.id]);
            return (
              <div
                key={item.id}
                style={{
                  gridTemplateColumns: "1.4fr 2fr 1fr 1.6fr 0.8fr",
                  minWidth: "750px",
                  display: "grid",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f4f2",
                  fontSize: "13px",
                  gap: "10px",
                }}
              >
                {/* Product Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <BrandLogoSquircle
                    brand={item.serviceKey.replace("custom_", "")}
                    size={28}
                  />
                  <div>
                    <b style={{ fontSize: "13px", display: "block" }}>{item.serviceName || item.serviceKey}</b>
                    <small style={{ color: "#718096", fontSize: "10px" }}>ID #{item.id}</small>
                  </div>
                </div>

                {/* Credential Data (Masked / Unmasked) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="vault-secret-box" title={isRevealed ? item.credentialData : "গোপনীয় ক্রেডেনশিয়াল"}>
                    <span className="vault-secret-text">
                      {isRevealed
                        ? item.credentialData
                        : "••••••••••••••••••••••••"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="vault-eye-btn"
                    onClick={() => toggleReveal(item.id)}
                    title={isRevealed ? "ক্রেডেনশিয়াল লুকান" : "ক্রেডেনশিয়াল দেখুন"}
                  >
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    className="vault-copy-btn"
                    onClick={() => copyCredential(item.credentialData)}
                    title="ক্লিপবোর্ডে কপি করুন"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* Status Badge */}
                <div>
                  {item.status === "available" && (
                    <span className="status-chip status-fulfilled" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={12} /> Available
                    </span>
                  )}
                  {item.status === "sold" && (
                    <span className="status-chip" style={{ background: "#ede9fe", color: "#6b21a8", border: "1px solid #ddd6fe", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <BadgeCheck size={12} /> Sold
                    </span>
                  )}
                  {item.status === "reserved" && (
                    <span className="status-chip status-awaiting_payment" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock3 size={12} /> Reserved
                    </span>
                  )}
                </div>

                {/* Details / History */}
                <div style={{ fontSize: "11px", color: "#4a5568", lineHeight: 1.4 }}>
                  {item.status === "sold" ? (
                    <>
                      <div>
                        <b>ক্রেতা:</b> {item.soldToEmail || "—"}
                      </div>
                      <div style={{ color: "#718096" }}>
                        অর্ডার: #{item.orderId ?? "—"} • {dateText(item.soldAt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>যোগ করা হয়েছে: {dateText(item.createdAt)}</div>
                      {item.notes && <div style={{ color: "#718096" }}>নোট: {item.notes}</div>}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                  {item.status === "available" && (
                    <button
                      type="button"
                      className="button button-sm button-light"
                      style={{ color: "#dc2626", borderColor: "#fecaca" }}
                      onClick={() => {
                        if (confirm("আপনি কি নিশ্চিত এই আইটেমটি স্টক থেকে মুছে ফেলতে চান?")) {
                          deleteItem.mutate({ id: item.id });
                        }
                      }}
                      disabled={deleteItem.isPending}
                      title="স্টক থেকে মুছুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {item.status === "sold" && (
                    <button
                      type="button"
                      className="button button-sm button-light"
                      style={{ color: "#0b765c", borderColor: "#a7f3d0", fontSize: "11px" }}
                      onClick={() => {
                        if (confirm("আইটেমটি পুনরায় সচল স্টকে ফেরত দিতে চান? এটি কাস্টমারদের জন্য আবার ক্রয়ের জন্য উন্মুক্ত হবে।")) {
                          returnToStock.mutate({ id: item.id });
                        }
                      }}
                      disabled={returnToStock.isPending}
                      title="পুনরায় স্টকে ফেরত দিন"
                    >
                      <RotateCcw size={13} /> স্টকে ফেরান
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {itemsQuery.data && itemsQuery.data.total > itemsQuery.data.limit && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", padding: "0 4px" }}>
          <small style={{ color: "#718096" }}>
            মোট {itemsQuery.data.total}টি আইটেমের মধ্যে {((page - 1) * itemsQuery.data.limit) + 1} - {Math.min(page * itemsQuery.data.limit, itemsQuery.data.total)} দেখানো হচ্ছে
          </small>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="button button-sm button-light"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              পূর্ববর্তী
            </button>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", fontSize: "12px", fontWeight: 700 }}>
              পৃষ্ঠা {page}
            </span>
            <button
              type="button"
              className="button button-sm button-light"
              disabled={page * itemsQuery.data.limit >= itemsQuery.data.total}
              onClick={() => setPage(p => p + 1)}
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Product */}
      {createProductOpen && (
        <CreateCustomProductModal
          onClose={() => setCreateProductOpen(false)}
          onSuccess={() => {
            setCreateProductOpen(false);
            refreshAll();
          }}
        />
      )}

      {/* Modal: Add Bulk Stock */}
      {addBulkOpen && (
        <AddBulkStockModal
          products={products}
          initialServiceKey={bulkServiceKey}
          onClose={() => setAddBulkOpen(false)}
          onSuccess={() => {
            setAddBulkOpen(false);
            refreshAll();
          }}
        />
      )}
    </>
  );
}

function CreateCustomProductModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("brand:key");
  const [credentials, setCredentials] = useState("");
  const [warrantyText, setWarrantyText] = useState("৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি");
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [flashSalePrice, setFlashSalePrice] = useState("");
  const [tags, setTags] = useState("");
  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  const create = trpc.shop.admin.customInventory.createProduct.useMutation({
    onSuccess: (res) => {
      toast.success(`প্রোডাক্ট "${res.name}" তৈরি হয়েছে! (${res.initialStock}টি স্টক যোগ হয়েছে)`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message || "প্রোডাক্ট তৈরিতে সমস্যা হয়েছে"),
  });

  const parsedLines = credentials
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const retail = parseFloat(price);
    if (!name.trim()) return toast.error("প্রোডাক্টের নাম দিন");
    if (isNaN(retail) || retail <= 0) return toast.error("সঠিক বিক্রয়মূল্য (BDT) দিন");

    create.mutate({
      name: name.trim(),
      retailPrice: retail,
      customDescription: description.trim() || undefined,
      imageUrl: selectedBrand.startsWith("brand:") ? selectedBrand : undefined,
      bulkCredentials: credentials.trim() || undefined,
      warrantyText: warrantyText.trim() || undefined,
      isFlashSale: isFlashSale ? 1 : 0,
      flashSalePrice: flashSalePrice ? parseFloat(flashSalePrice) : undefined,
      tags: tags.trim() || undefined,
    });
  };

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="product-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#e6f4ef", color: "#0b765c", padding: "8px", borderRadius: "10px" }}>
            <Plus size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>নতুন নিজস্ব ডিজিটাল প্রোডাক্ট</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
              আপনার নিজস্ব অ্যাকাউন্ট, রিডিম লিঙ্ক বা লাইসেন্স কোড বিক্রির জন্য প্রোডাক্ট তৈরি করুন
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              প্রোডাক্টের নাম *
            </label>
            <input
              type="text"
              className="admin-password-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: NordVPN Premium 1 Year Private"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                বিক্রয় মূল্য (BDT) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="admin-password-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="450"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                ব্র্যান্ড লোগো / আইকন
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  className="admin-password-input"
                  style={{ flex: 1 }}
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                  {BRAND_ICON_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.category})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button button-sm button-light"
                  style={{ padding: "0 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  onClick={() => setPickerModalOpen(true)}
                  title="ব্র্যান্ড আইকন লাইব্রেরি"
                >
                  <Sparkles size={12} />
                  ব্রাউজ
                </button>
              </div>
            </div>
          </div>

          <BrandIconPickerModal
            isOpen={pickerModalOpen}
            onClose={() => setPickerModalOpen(false)}
            currentValue={selectedBrand}
            onSelect={(iconId: string) => {
              setSelectedBrand(iconId);
              setPickerModalOpen(false);
              toast.success("ব্র্যান্ড আইকন নির্বাচিত হয়েছে!");
            }}
          />

          {/* Flash Sale, Warranty & Tags Fields */}
          <div style={{ background: "#f8fafd", border: "1px solid #e0e7ff", borderRadius: "10px", padding: "12px", display: "grid", gap: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#3730a3", display: "flex", alignItems: "center", gap: "6px" }}>
              <Zap size={14} className="text-amber-500 fill-amber-500" />
              ফ্ল্যাশ সেল, ওয়ারেন্টি ও প্রোডাক্ট ট্যাগ
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                  ওয়ারেন্টি পলিসি টেক্সট
                </label>
                <input
                  type="text"
                  className="admin-password-input"
                  value={warrantyText}
                  onChange={(e) => setWarrantyText(e.target.value)}
                  placeholder="যেমন: ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি"
                  style={{ fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                  সার্চ ও ফিল্টার ট্যাগ (কমা দিয়ে লিখুন)
                </label>
                <input
                  type="text"
                  className="admin-password-input"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="যেমন: হট ডিল, বেস্ট সেলার, ইনস্ট্যান্ট"
                  style={{ fontSize: "12px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "4px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isFlashSale}
                  onChange={(e) => setIsFlashSale(e.target.checked)}
                />
                ⚡ ফ্ল্যাশ সেলে রাখুন
              </label>
              {isFlashSale && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>ফ্ল্যাশ সেল মূল্য (BDT):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="admin-password-input"
                    value={flashSalePrice}
                    onChange={(e) => setFlashSalePrice(e.target.value)}
                    placeholder="যেমন: ৩৫০"
                    style={{ maxWidth: "120px", fontSize: "12px", padding: "4px 8px" }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              বিবরণ / নির্দেশনা (ঐচ্ছিক)
            </label>
            <input
              type="text"
              className="admin-password-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: ১ মাসের সম্পূর্ণ নিজস্ব অ্যাকাউন্ট। ক্রয়ের সাথে সাথে ইমেইলে যাবে।"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700 }}>
                প্রাথমিক স্টক / অ্যাকাউন্ট তালিকা (ঐচ্ছিক)
              </label>
              <small style={{ color: "#0b765c", fontWeight: 700 }}>
                {parsedLines.length} টি আইটেম সনাক্ত হয়েছে
              </small>
            </div>
            <textarea
              className="admin-password-input"
              rows={5}
              style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", lineHeight: 1.4 }}
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder={`প্রতি লাইনে ১টি করে অ্যাকাউন্ট বা কোড দিন:
user1@mail.com:pass123
user2@mail.com:pass456
https://redeem.example.com/xyz`}
            />
            <small style={{ color: "#718096", fontSize: "11px", display: "block", marginTop: "4px" }}>
              * পরে যেকোনো সময় "বাল্ক স্টক যোগ" অপশন দিয়ে আরও অ্যাকাউন্ট যুক্ত করতে পারবেন।
            </small>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="button button-light" onClick={onClose}>
              বাতিল
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={create.isPending || !name.trim() || !price}
            >
              {create.isPending ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}
              প্রোডাক্ট তৈরি করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddBulkStockModal({
  products,
  initialServiceKey,
  onClose,
  onSuccess,
}: {
  products: { serviceKey: string; name: string; availableCount: number }[];
  initialServiceKey: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serviceKey, setServiceKey] = useState(initialServiceKey || (products[0]?.serviceKey ?? ""));
  const [credentials, setCredentials] = useState("");
  const [notes, setNotes] = useState("");

  const addBulk = trpc.shop.admin.customInventory.addBulk.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.added}টি নতুন অ্যাকাউন্ট স্টকে যুক্ত হয়েছে! মোট এভেইলেবল: ${res.totalAvailable}টি`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message || "স্টক যোগ করতে ব্যর্থ হয়েছে"),
  });

  const parsedLines = credentials
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceKey) return toast.error("একটি প্রোডাক্ট নির্বাচন করুন");
    if (!parsedLines.length) return toast.error("অন্তত ১টি অ্যাকাউন্ট বা কোড পেস্ট করুন");

    addBulk.mutate({
      serviceKey,
      bulkCredentials: credentials,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="product-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#e6f4ef", color: "#0b765c", padding: "8px", borderRadius: "10px" }}>
            <Database size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>বাল্ক স্টক যোগ করুন</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
              আপনার স্টকে একাধিক অ্যাকাউন্ট, ইউজার-পাস বা লিঙ্ক পেস্ট করে এক ক্লিকে স্টক বাড়ান
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              প্রোডাক্ট নির্বাচন করুন *
            </label>
            <select
              className="admin-password-input"
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              required
            >
              {products.map((p) => (
                <option key={p.serviceKey} value={p.serviceKey}>
                  {p.name} (বর্তমানে স্টকে: {p.availableCount}টি)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700 }}>
                অ্যাকাউন্ট / কোড / লিঙ্ক তালিকা * (প্রতি লাইনে ১টি)
              </label>
              <span style={{ fontSize: "12px", fontWeight: 700, color: parsedLines.length > 0 ? "#0b765c" : "#718096" }}>
                💡 সনাক্তকৃত: {parsedLines.length} টি
              </span>
            </div>
            <textarea
              className="admin-password-input"
              rows={8}
              style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", lineHeight: 1.4 }}
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder={`user1@domain.com:password123
user2@domain.com:password456
https://redeem.invite.link/token-abc-789
PRODUCT-KEY-XXXX-YYYY-ZZZZ`}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
              ব্যাচ নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              className="admin-password-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: Batch 2 - Oct 2026, Source Vendor A"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="button button-light" onClick={onClose}>
              বাতিল
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={addBulk.isPending || parsedLines.length === 0}
            >
              {addBulk.isPending ? <LoaderCircle size={15} className="spin" /> : <CheckCircle2 size={15} />}
              {parsedLines.length > 0 ? `${parsedLines.length}টি অ্যাকাউন্ট স্টকে যোগ করুন` : "স্টকে যোগ করুন"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

function ProviderKeyCard({
  provider,
  title,
  description,
  defaultBaseUrl,
  status,
}: {
  provider: string;
  title: string;
  description: string;
  defaultBaseUrl?: string;
  status?: { configured: boolean; updatedAt: Date | null };
}) {
  const utils = trpc.useUtils();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl || "");
  const [showKey, setShowKey] = useState(false);
  const [balance, setBalance] = useState<{ amount: number; currency: string; balanceInr: number | null; rateInrPerUsdt: number | null; username: string } | null>(null);

  const configure = trpc.shop.admin.providers.configure.useMutation({
    onSuccess: (data) => {
      setApiKey("");
      setBalance(data);
      toast.success(`${title} API key verified ও encrypted storage-এ save হয়েছে`);
      void utils.shop.admin.providers.status.invalidate();
      void utils.shop.admin.providers.list.invalidate();
      void utils.shop.admin.overview.invalidate();
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const balanceQuery = trpc.shop.admin.providers.balance.useQuery({ provider }, { enabled: false, retry: false });

  const check = async () => {
    const refreshed = await balanceQuery.refetch();
    if (refreshed.data) setBalance(refreshed.data);
    if (refreshed.error) toast.error(refreshed.error.message);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (apiKey.trim()) {
      configure.mutate({
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        label: title,
      });
    }
  };

  return (
    <section className="admin-panel connection-card">
      <div className="panel-top">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="connection-key-icon">
          <KeyRound size={19} />
        </div>
      </div>
      <div className="key-callout">
        <ShieldCheck size={16} />
        <span>AES-256-GCM, project-scoped encryption. Key শুধু server-এ ব্যবহৃত হয়; save হওয়ার পর আর read-back নেই।</span>
      </div>
      <form onSubmit={submit}>
        {defaultBaseUrl !== undefined && (
          <label className="field" style={{ marginBottom: "10px" }}>
            API Entry Point (Base URL)
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://bot.aitoolifystudio.io/api/reseller/v1"
            />
          </label>
        )}
        <label className="field">
          {title} API key <span className="optional">শুধু verify করতে একবার লিখুন</span>
          <span className="secret-input-wrap">
            <input
              type={showKey ? "text" : "password"}
              autoComplete="new-password"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status?.configured ? "Credential configured; replace করতে নতুন key লিখুন" : `${title} account থেকে API key লিখুন`}
              minLength={4}
              maxLength={2048}
              required
            />
            <button
              type="button"
              className="reveal-key"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <p className="form-help">
          Submit করলে server লাইভ balance যাচাই করে encrypted database-এ রাখবে এবং স্বয়ংক্রিয়ভাবে ক্যাটালগ সিঙ্ক করবে।
        </p>
        <button
          className="button button-primary"
          type="submit"
          disabled={configure.isPending || !apiKey.trim()}
        >
          {configure.isPending ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />}
          {configure.isPending ? "Verify & save হচ্ছে…" : status?.configured ? "Verify & replace key" : "Verify & save key"}
        </button>
      </form>
      {status?.configured && (
        <div className="configured-note">
          <CheckCircle2 size={16} /> Credential configured · value hidden
          {status.updatedAt ? ` · updated ${dateText(status.updatedAt)}` : ""}
        </div>
      )}
      <div className="connection-health">
        <div className="panel-top">
          <div>
            <h3>Account health</h3>
            <p>Provider-এর current balance</p>
          </div>
          <span className="health-pulse">
            <i />
          </span>
        </div>
        {balance ? (
          <>
            <div className="balance-value">
              <small>{balance.currency} balance</small>
              <strong>{balance.amount.toFixed(2)}</strong>
            </div>
            {balance.balanceInr !== null && (
              <div className="health-row">
                <span>Wallet INR</span>
                <b>₹{balance.balanceInr.toFixed(2)} · 1 USDT = ₹{balance.rateInrPerUsdt}</b>
              </div>
            )}
            {balance.username && (
              <div className="health-row">
                <span>Account</span>
                <b>{balance.username}</b>
              </div>
            )}
          </>
        ) : (
          <div className="balance-empty">
            <Wallet size={22} />
            <b>Balance summary নেই</b>
            <span>{status?.configured ? "Provider account এখন check করুন।" : "API key add করলে এখানে balance দেখাবে।"}</span>
          </div>
        )}
        <button
          className="button button-light full-button"
          disabled={!status?.configured || balanceQuery.isFetching}
          onClick={() => void check()}
        >
          {balanceQuery.isFetching ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />} Check balance
        </button>
      </div>
    </section>
  );
}

function CustomBotProviderManager() {
  const utils = trpc.useUtils();
  const providersQuery = trpc.shop.admin.providers.list.useQuery();
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; balance: number; currency: string; message: string } | null>(null);
  const [customBalances, setCustomBalances] = useState<Record<string, { amount: number; currency: string }>>({});
  const [checkingBalance, setCheckingBalance] = useState<string | null>(null);

  const testConnection = trpc.shop.admin.providers.testCustom.useMutation({
    onSuccess: (res) => {
      setTestResult(res);
      toast.success(res.message);
    },
    onError: (err) => {
      setTestResult(null);
      toast.error(err.message || "Connection test ব্যর্থ হয়েছে");
    },
  });

  const saveProvider = trpc.shop.admin.providers.configureCustom.useMutation({
    onSuccess: (res) => {
      toast.success(`Provider "${res.label}" সফলভাবে যুক্ত হয়েছে এবং ক্যাটালগ সিঙ্ক শুরু হয়েছে!`);
      setLabel("");
      setBaseUrl("");
      setApiKey("");
      setTestResult(null);
      void utils.shop.admin.providers.list.invalidate();
      void utils.shop.admin.providers.status.invalidate();
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
      void utils.shop.admin.overview.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Provider সংরক্ষণ ব্যর্থ হয়েছে");
    },
  });

  const deleteProvider = trpc.shop.admin.providers.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider ডিলিট হয়েছে");
      void utils.shop.admin.providers.list.invalidate();
      void utils.shop.admin.providers.status.invalidate();
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncSingle = trpc.shop.admin.services.sync.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.provider}: ${res.synced} টি সার্ভিস সফলভাবে সিঙ্ক হয়েছে`);
      void utils.shop.admin.services.list.invalidate();
      void utils.shop.catalog.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim() || !apiKey.trim()) {
      toast.error("API Entry Point (URL) এবং API Key দিন");
      return;
    }
    testConnection.mutate({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
  };

  const handleSave = () => {
    if (!label.trim()) {
      toast.error("Provider-এর একটি নাম দিন (যেমন: Baku Bob API)");
      return;
    }
    if (!baseUrl.trim() || !apiKey.trim()) {
      toast.error("API Entry Point এবং API Key উভয়ই প্রয়োজন");
      return;
    }
    const slug = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || `bot_${Date.now().toString(36)}`;

    saveProvider.mutate({
      provider: slug,
      label: label.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
  };

  const checkSingleBalance = async (provider: string) => {
    setCheckingBalance(provider);
    try {
      const res = await utils.client.shop.admin.providers.balance.query({ provider });
      setCustomBalances((prev) => ({ ...prev, [provider]: { amount: res.amount, currency: res.currency } }));
      toast.success(`${provider} ব্যালেন্স: ${res.amount.toFixed(2)} ${res.currency}`);
    } catch (err: any) {
      toast.error(err.message || "Balance চেক করা যায়নি");
    } finally {
      setCheckingBalance(null);
    }
  };

  const customProviders = (providersQuery.data || []).filter(
    (p) => p.provider !== "acczone" && p.provider !== "couponshops" && p.provider !== "aitoolify"
  );

  return (
    <div style={{ marginTop: "24px" }}>
      <section className="admin-panel" style={{ padding: "20px" }}>
        <div className="panel-top">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Bot size={20} style={{ color: "var(--brand, #0d342f)" }} />
              <h2 style={{ margin: 0 }}>Add Custom Bot / Reseller API (Baku Bob & Other Reseller v1)</h2>
            </div>
            <p>
              যেকোনো Baku Bob বা Telegram Bot Reseller v1 API সরাসরি যুক্ত করুন। URL ও Key দিয়ে লাইভ টেস্ট করুন, কাজ করলে সাথে সাথে সেইভ করে প্রোডাক্ট সিঙ্ক করুন।
            </p>
          </div>
        </div>

        <form onSubmit={handleTest} style={{ marginTop: "16px" }}>
          <div className="settings-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            <label className="field">
              Provider Name / Label
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="যেমন: Baku Bob Bot বা Reseller Shop"
                maxLength={100}
              />
            </label>

            <label className="field">
              API Entry Point (Base URL)
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="যেমন: https://bot.aitoolifystudio.io/docs বা https://api.mybot.com"
                maxLength={255}
              />
            </label>

            <label className="field full-field">
              API Key (Secret Token)
              <span className="secret-input-wrap">
                <input
                  type={showKey ? "text" : "password"}
                  autoComplete="new-password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="বট থেকে পাওয়া গোপন API Key পেস্ট করুন"
                  maxLength={1024}
                />
                <button
                  type="button"
                  className="reveal-key"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
          </div>

          {testResult && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                <span style={{ fontWeight: 600, color: "#065f46" }}>
                  API সংযোগ সফল! ব্যালেন্স: {testResult.balance.toFixed(2)} {testResult.currency}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#047857" }}>
                স্বয়ংক্রিয়ভাবে এন্ডপয়েন্ট ও অথেন্টিকেশন ভেরিফাইড
              </span>
            </div>
          )}

          <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="submit"
              className="button button-light"
              disabled={testConnection.isPending || !baseUrl.trim() || !apiKey.trim()}
            >
              {testConnection.isPending ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}
              {testConnection.isPending ? "কানেকশন টেস্ট হচ্ছে…" : "Test Connection (লাইভ টেস্ট)"}
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={handleSave}
              disabled={saveProvider.isPending || !label.trim() || !baseUrl.trim() || !apiKey.trim()}
            >
              {saveProvider.isPending ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />}
              {saveProvider.isPending ? "সেভ ও সিঙ্ক হচ্ছে…" : "Save & Connect Provider"}
            </button>
          </div>
        </form>
      </section>

      {customProviders.length > 0 && (
        <section style={{ marginTop: "20px" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
              Connected Custom Bot APIs ({customProviders.length})
            </h3>
          </div>
          <div className="connection-grid">
            {customProviders.map((p) => {
              const liveBal = customBalances[p.provider];
              return (
                <div key={p.provider} className="admin-panel connection-card">
                  <div className="panel-top">
                    <div>
                      <h2>{p.label}</h2>
                      <p style={{ fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" }}>
                        {p.baseUrl}
                      </p>
                    </div>
                    <span className="status-chip status-fulfilled">
                      <i /> ACTIVE
                    </span>
                  </div>

                  <div className="key-callout">
                    <ShieldCheck size={16} />
                    <span>Slug: <code>{p.provider}</code> · Encrypted AES-256-GCM Storage</span>
                  </div>

                  <div className="connection-health" style={{ marginTop: "12px" }}>
                    <div className="panel-top">
                      <div>
                        <h3>Wallet Balance</h3>
                        <p>লাইভ ওয়ালেট ব্যালেন্স</p>
                      </div>
                      <span className="health-pulse"><i /></span>
                    </div>

                    {liveBal ? (
                      <div className="balance-value">
                        <small>{liveBal.currency} balance</small>
                        <strong>{liveBal.amount.toFixed(2)}</strong>
                      </div>
                    ) : (
                      <div className="balance-empty">
                        <Wallet size={20} />
                        <b>Balance চেক করুন</b>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        className="button button-light"
                        style={{ flex: 1 }}
                        disabled={checkingBalance === p.provider}
                        onClick={() => void checkSingleBalance(p.provider)}
                      >
                        {checkingBalance === p.provider ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Check Balance
                      </button>

                      <button
                        className="button button-light"
                        style={{ flex: 1 }}
                        disabled={syncSingle.isPending}
                        onClick={() => syncSingle.mutate({ provider: p.provider })}
                        title="এই বটের সব প্রোডাক্ট ক্যাটালগে সিঙ্ক করুন"
                      >
                        <RefreshCw className={syncSingle.isPending ? "spin" : ""} size={14} />
                        Sync Catalog
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="button button-light"
                      style={{ color: "#ef4444", fontSize: "11px", padding: "6px 10px" }}
                      onClick={() => {
                        if (confirm(`আপনি কি নিশ্চিত যে "${p.label}" সংযোগ বিচ্ছিন্ন এবং মুছে ফেলতে চান?`)) {
                          deleteProvider.mutate({ provider: p.provider });
                        }
                      }}
                      disabled={deleteProvider.isPending}
                    >
                      <Trash2 size={13} style={{ marginRight: "4px" }} />
                      Disconnect & Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function ConnectionSection() {
  const { data: status, isLoading } = trpc.shop.admin.providers.status.useQuery();
  const providersQuery = trpc.shop.admin.providers.list.useQuery();
  const anyConnected = Boolean(
    status?.acczone.configured ||
    status?.couponshops.configured ||
    status?.aitoolify.configured ||
    (providersQuery.data && providersQuery.data.some(p => p.configured))
  );

  return (
    <>
      <div className="admin-heading">
        <div>
          <div className="eyebrow">SERVER-SIDE PROVIDERS & BOTS</div>
          <h1>API connections & Bot Resellers</h1>
          <p>
            AccZone, CouponShops, Aitoolify Studio Bot এবং যেকোনো Baku Bob / Bot Reseller v1 API সরাসরি কানেক্ট করুন।
          </p>
        </div>
        <span className={`status-chip ${anyConnected ? "status-fulfilled" : "status-awaiting_payment"}`}>
          <i /> {isLoading ? "Checking…" : anyConnected ? "CONNECTED" : "NOT CONNECTED"}
        </span>
      </div>

      <div className="connection-grid">
        <ProviderKeyCard
          provider="acczone"
          title="AccZone API key"
          description="Balance, catalog ও activation purchase"
          status={status?.acczone}
        />
        <ProviderKeyCard
          provider="couponshops"
          title="CouponShops API key"
          description="Coupon catalog, INR/USDT wallet ও idempotent order"
          status={status?.couponshops}
        />
        <ProviderKeyCard
          provider="aitoolify"
          title="Aitoolify Studio Bot"
          description="Official Bot Reseller API (GET /balance, GET /products, POST /order)"
          defaultBaseUrl="https://bot.aitoolifystudio.io/api/reseller/v1"
          status={status?.aitoolify}
        />
      </div>

      <CustomBotProviderManager />

      <div className="security-footnote" style={{ marginTop: "24px" }}>
        <ShieldCheck size={15} />
        <span>
          সব API key এবং credentials সার্ভারে AES-256-GCM অ্যালগরিদমে এনক্রিপ্ট হয়ে সংরক্ষিত থাকে। কোনো সিক্রেট কি ব্রাউজার বান্ডল, রেসপন্স বা লগ-এ প্রকাশিত হয় না।
        </span>
      </div>
    </>
  );
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
            <p>আপনার ব্যক্তিগত বা বিজনেস Gmail দিয়ে গ্রাহকের কাছে অর্ডার কনফার্মেশন ও ডেলিভারি লিঙ্ক পাঠান।</p>
          </div>
          <Mail size={19} />
        </div>

        <div className="email-provider-state" style={{ marginBottom: "14px" }}>
          <span className={`status-chip ${emailConfig.data?.gmail?.configured ? "status-fulfilled" : "status-awaiting_payment"}`}>
            <i />{emailConfig.isLoading ? "Checking…" : emailConfig.data?.gmail?.configured ? "GMAIL ACTIVE & CONNECTED" : "GMAIL NOT CONFIGURED"}
          </span>
          {emailConfig.data?.gmail?.configured && emailConfig.data.gmail.user && (
            <span style={{ fontSize: "12px", color: "var(--mint-deep, #08785f)", fontWeight: 650 }}>
              সংযুক্ত Gmail: {emailConfig.data.gmail.user} {emailConfig.data.gmail.mode === "webhook" ? "(via Apps Script Webhook)" : "(via Direct SMTP)"}
            </span>
          )}
        </div>

        <div className="filter-pills" style={{ marginBottom: "14px" }}>
          <button
            type="button"
            className={`filter-pill ${gmailMode === "webhook" ? "active" : ""}`}
            onClick={() => setGmailMode("webhook")}
          >
            ⚡ পদ্ধতি ১: Google Apps Script Webhook (Render Free-এর জন্য সুপারিশকৃত)
          </button>
          <button
            type="button"
            className={`filter-pill ${gmailMode === "smtp" ? "active" : ""}`}
            onClick={() => setGmailMode("smtp")}
          >
            🔑 পদ্ধতি ২: Google App Password (SMTP)
          </button>
        </div>

        {gmailMode === "webhook" ? (
          <div>
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
                প্রেরক প্রদর্শিত নাম (Store / Sender Name)
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
                Webhook সংরক্ষণ ও টেস্ট করুন
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => {
                  navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
              >
                {copiedCode ? <Check size={14} /> : <FileText size={14} />}
                {copiedCode ? "কোড কপি হয়েছে!" : "Apps Script কোড কপি করুন"}
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => setShowWebhookGuide(!showWebhookGuide)}
              >
                {showWebhookGuide ? "সহায়তা লুকান" : "১ মিনিটের সেটআপ গাইড"}
              </button>
            </div>

            {showWebhookGuide && (
              <div className="notice" style={{ marginTop: "14px", background: "#f8faf9", border: "1px solid #dce8e1", color: "#223d34", padding: "14px", borderRadius: "8px", fontSize: "12px", lineHeight: "1.7" }}>
                <strong>Google Apps Script Webhook সেটআপ করার সহজ ৩টি ধাপ:</strong>
                <ol style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li><a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: "#08785f", textDecoration: "underline", fontWeight: 600 }}>script.google.com</a>-এ যান, <strong>'New project'</strong> খুলুন এবং ওপরের <strong>'Apps Script কোড কপি করুন'</strong> বাটনে ক্লিক করে পাওয়া কোডটুকু পেস্ট করুন।</li>
                  <li>উপরে <strong>Deploy &gt; New deployment</strong> চাপুন। গিয়ার আইকন থেকে <strong>Web app</strong> সিলেক্ট করে Execute as: <strong>Me</strong> এবং Who has access: <strong>Anyone</strong> দিয়ে Deploy করুন।</li>
                  <li>দেওয়া <strong>Web app URL</strong> (যা <code>/exec</code> দিয়ে শেষ হয়) কপি করে ওপরের বক্সে পেস্ট করে <strong>"Webhook সংরক্ষণ ও টেস্ট করুন"</strong> দিন!</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          <div>
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
                Google App Password (১৬ অক্ষর)
                <input
                  type="password"
                  value={gmailAppPass}
                  onChange={e => setGmailAppPass(e.target.value)}
                  placeholder="abcd efgh ijkl mnop"
                />
              </label>

              <label className="field full-field">
                প্রেরক প্রদর্শিত নাম (Store / Sender Name)
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
                Gmail সংরক্ষণ ও টেস্ট করুন
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => setShowGmailHelp(!showGmailHelp)}
              >
                {showGmailHelp ? "সহায়তা লুকান" : "কীভাবে App Password পাবেন?"}
              </button>
            </div>

            {showGmailHelp && (
              <div className="notice" style={{ marginTop: "14px", background: "#f8faf9", border: "1px solid #dce8e1", color: "#223d34", padding: "14px", borderRadius: "8px", fontSize: "12px", lineHeight: "1.7" }}>
                <strong>Google App Password পাওয়ার সহজ ৩টি ধাপ:</strong>
                <ol style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li><a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: "#08785f", textDecoration: "underline", fontWeight: 600 }}>Google Security</a>-তে গিয়ে 2-Step Verification চালু করুন।</li>
                  <li>Security পেজে <strong>'App passwords'</strong> সার্চ করুন এবং অ্যাপ নাম <code>AccShop</code> দিয়ে Create চাপুন।</li>
                  <li>পাওয়া ১৬ অক্ষরের কোডটি কপি করে ওপরের বক্সে পেস্ট করে সেভ করুন।</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {emailConfig.data?.gmail?.configured && (
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--line, #e8eeeb)" }}>
            <label className="field" style={{ maxWidth: "420px" }}>
              টেস্ট ইমেইল পাঠান (Send Test Mail)
              <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
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

  // Passkey hooks & state
  const passkeysQuery = trpc.auth.passkeyList.useQuery();
  const passkeyRegOptions = trpc.auth.passkeyRegisterOptions.useMutation();
  const passkeyVerifyReg = trpc.auth.passkeyVerifyRegister.useMutation({
    onSuccess: () => {
      toast.success("নতুন Passkey সফলভাবে সংরক্ষিত হয়েছে!");
      void passkeysQuery.refetch();
      void utils.auth.hasPasskeys.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Passkey রেজিস্ট্রেশন ব্যর্থ হয়েছে");
    },
  });
  const passkeyDelete = trpc.auth.passkeyDelete.useMutation({
    onSuccess: () => {
      toast.success("Passkey মুছে ফেলা হয়েছে");
      void passkeysQuery.refetch();
      void utils.auth.hasPasskeys.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Passkey ডিলিট ব্যর্থ হয়েছে");
    },
  });
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  // Registered Admin Accounts state & mutations
  const { data: currentUser } = trpc.auth.me.useQuery();
  const adminUsersQuery = trpc.auth.adminUsers.list.useQuery();
  const createAdmin = trpc.auth.adminUsers.create.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setNewAdminModalOpen(false);
      setAddUsername("");
      setAddEmail("");
      setAddPassword("");
      setAddConfirmPassword("");
      void adminUsersQuery.refetch();
    },
    onError: (err) => toast.error(err.message || "নতুন অ্যাডমিন তৈরি ব্যর্থ হয়েছে"),
  });
  const deleteAdmin = trpc.auth.adminUsers.delete.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      void adminUsersQuery.refetch();
    },
    onError: (err) => toast.error(err.message || "অ্যাডমিন ডিলিট ব্যর্থ হয়েছে"),
  });

  const [newAdminModalOpen, setNewAdminModalOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addConfirmPassword, setAddConfirmPassword] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "superadmin">("admin");

  const handleRegisterPasskey = async () => {
    try {
      setRegisteringPasskey(true);
      const defaultName = typeof navigator !== "undefined"
        ? (navigator.userAgent.includes("Mac") ? "MacBook Touch ID" : navigator.userAgent.includes("iPhone") ? "iPhone Face ID" : navigator.userAgent.includes("Windows") ? "Windows Hello" : "Admin Security Key")
        : "Admin Security Key";
      const keyName = window.prompt("নতুন Passkey / ডিভাইসের একটি নাম দিন (যেমন: MacBook Touch ID, YubiKey):", defaultName) || defaultName;
      const options = await passkeyRegOptions.mutateAsync();
      const regResp = await startRegistration(options as any);
      await passkeyVerifyReg.mutateAsync({ response: regResp, name: keyName });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Passkey রেজিস্ট্রেশন বাতিল করা হয়েছে।");
      } else {
        toast.error(err?.message || "Passkey রেজিস্ট্রেশন ব্যর্থ হয়েছে।");
      }
    } finally {
      setRegisteringPasskey(false);
    }
  };

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
    <>
      {/* Account Credentials */}
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

      {/* Passkey / WebAuthn Biometric Security Section */}
      <section className="admin-panel settings-panel" style={{ marginTop: "20px" }}>
        <div className="panel-top">
          <div>
            <h2 className="flex items-center gap-2">
              <Fingerprint size={20} className="text-emerald-700" />
              Passkey & বায়োমেট্রিক সিকিউরিটি (WebAuthn / FIDO2)
            </h2>
            <p>
              পাসওয়ার্ড ছাড়াই আপনার ডিভাইসের টাচ আইডি (Touch ID), ফেস আইডি (Face ID), উইন্ডোজ হ্যালো অথবা ফিজিক্যাল সিকিউরিটি কি (YubiKey) দিয়ে দ্রুত এবং সর্বোচ্চ নিরাপত্তায় ১-ক্লিকে অ্যাডমিনে লগইন করুন।
            </p>
          </div>
          <button
            type="button"
            className="button button-primary"
            onClick={handleRegisterPasskey}
            disabled={registeringPasskey || passkeyRegOptions.isPending || passkeyVerifyReg.isPending}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {registeringPasskey ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}
            নতুন Passkey যুক্ত করুন
          </button>
        </div>

        {passkeysQuery.isLoading ? (
          <PanelLoading />
        ) : !passkeysQuery.data || passkeysQuery.data.length === 0 ? (
          <div className="empty-admin" style={{ padding: "24px 16px", background: "#f8fbf9", borderRadius: "10px", border: "1px dashed #cde2d7" }}>
            <Fingerprint size={32} style={{ color: "#0b765c", opacity: 0.8 }} />
            <b style={{ marginTop: "8px" }}>কোনো Passkey যুক্ত করা নেই</b>
            <span style={{ fontSize: "12px", color: "#64748b", maxWidth: "420px", textAlign: "center" }}>
              আপনার ফিঙ্গারপ্রিন্ট বা ফেস দিয়ে সুপার-ফাস্ট পাসওয়ার্ডহীন সাইন ইন সক্রিয় করতে উপরের "নতুন Passkey যুক্ত করুন" বাটনে ক্লিক করুন।
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
              নিবন্ধিত Passkey ডিভাইস তালিকা ({passkeysQuery.data.length}টি সক্রিয়):
            </div>
            {passkeysQuery.data.map((key) => (
              <div
                key={key.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "#ffffff",
                  border: "1px solid #e2ece6",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e8f6f0", color: "#0b765c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <b style={{ fontSize: "13px", color: "#1e293b" }}>{key.name || "Admin Passkey"}</b>
                      <span className="status-chip status-fulfilled" style={{ fontSize: "10px", padding: "1px 6px" }}>
                        Active FIDO2
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      <span>যুক্ত হয়েছে: {dateText(key.createdAt)}</span>
                      {key.lastUsedAt && <span>সর্বশেষ ব্যবহার: {dateText(key.lastUsedAt)}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-sm button-light"
                  style={{ color: "#dc2626", borderColor: "#fecaca" }}
                  onClick={() => {
                    if (window.confirm(`আপনি কি "${key.name || "এই Passkey"}" মুছে ফেলতে চান?`)) {
                      passkeyDelete.mutate({ id: key.id });
                    }
                  }}
                  disabled={passkeyDelete.isPending}
                  title="এই Passkey মুছে ফেলুন"
                >
                  <Trash2 size={13} /> ডিলিট
                </button>
              </div>
            ))}
          </div>
        )}
      {/* Registered Admin Accounts Management Section */}
      <section className="admin-panel settings-panel" style={{ marginTop: "20px" }}>
        <div className="panel-top">
          <div>
            <h2 className="flex items-center gap-2">
              <Users size={20} className="text-emerald-700" />
              রেজিস্টার্ড অ্যাডমিন ইউজার তালিকা (Registered Admin Accounts)
            </h2>
            <p>
              এই স্টোরের সক্রিয় অ্যাডমিন অ্যাকাউন্টসমূহ। শুধুমাত্র এখানে তালিকাভুক্ত ইউজারনেম এবং সংশ্লিষ্ট পাসওয়ার্ড দিলে অ্যাডমিন প্যানেলে লগইন করা যাবে।
            </p>
          </div>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setNewAdminModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <UserPlus size={15} />
            নতুন Admin যোগ করুন
          </button>
        </div>

        {adminUsersQuery.isLoading ? (
          <PanelLoading />
        ) : !adminUsersQuery.data || adminUsersQuery.data.length === 0 ? (
          <div className="empty-admin" style={{ padding: "20px", background: "#f8fbf9", borderRadius: "10px", border: "1px dashed #cde2d7" }}>
            <Users size={28} style={{ color: "#0b765c" }} />
            <span style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>কোনো রেজিস্টার্ড অ্যাডমিন পাওয়া যায়নি।</span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
              সর্বমোট রেজিস্টার্ড অ্যাডমিন ({adminUsersQuery.data.length} জন):
            </div>
            {adminUsersQuery.data.map((u) => {
              const isCurrentUser = currentUser?.email?.toLowerCase() === u.email.toLowerCase();
              return (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: isCurrentUser ? "#f0fdf4" : "#ffffff",
                    border: isCurrentUser ? "1.5px solid #0b765c" : "1px solid #e2ece6",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: isCurrentUser ? "#0b765c" : "#e2e8f0",
                      color: isCurrentUser ? "#ffffff" : "#334155",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}>
                      {u.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <b style={{ fontSize: "14px", color: "#0f172a" }}>@{u.username}</b>
                        {isCurrentUser && (
                          <span className="status-chip status-fulfilled" style={{ fontSize: "10px", padding: "1px 6px" }}>
                            বর্তমান সেশন (You)
                          </span>
                        )}
                        <span className={`status-chip ${u.role === "superadmin" ? "status-paid" : "status-unlisted"}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {u.role === "superadmin" ? "Super Admin" : "Admin"}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        <span>ইমেইল: <b>{u.email}</b></span>
                        <span>যুক্ত হয়েছে: {dateText(u.createdAt)}</span>
                        {u.lastSignedIn && <span>সর্বশেষ সাইন ইন: {dateText(u.lastSignedIn)}</span>}
                      </div>
                    </div>
                  </div>

                  {!isCurrentUser && (
                    <button
                      type="button"
                      className="button button-sm button-light"
                      style={{ color: "#dc2626", borderColor: "#fecaca" }}
                      onClick={() => {
                        if (window.confirm(`আপনি কি নিশ্চিত যে "@${u.username}" (${u.email}) অ্যাডমিন অ্যাকাউন্টটি মুছে ফেলতে চান?`)) {
                          deleteAdmin.mutate({ id: u.id });
                        }
                      }}
                      disabled={deleteAdmin.isPending}
                      title="অ্যাডমিন ডিলিট করুন"
                    >
                      <Trash2 size={13} /> ডিলিট
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal: Add New Admin */}
      {newAdminModalOpen && (
        <div className="product-modal-backdrop" onClick={() => setNewAdminModalOpen(false)}>
          <div className="vault-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <button type="button" className="product-modal-close" onClick={() => setNewAdminModalOpen(false)}>
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#e6f4ef", color: "#0b765c", padding: "8px", borderRadius: "10px" }}>
                <UserPlus size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>নতুন অ্যাডমিন একাউন্ট তৈরি</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  নতুন অ্যাডমিনের ইউজারনেম, ইমেইল ও পাসওয়ার্ড দিন।
                </p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (addPassword !== addConfirmPassword) {
                toast.error("পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।");
                return;
              }
              createAdmin.mutate({
                username: addUsername.trim(),
                email: addEmail.trim(),
                password: addPassword.trim(),
                role: addRole,
              });
            }} style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  অ্যাডমিন Username * (লগইনে ব্যবহৃত হবে)
                </label>
                <input
                  type="text"
                  required
                  pattern="[A-Za-z0-9_-]+"
                  minLength={2}
                  maxLength={64}
                  className="admin-password-input"
                  value={addUsername}
                  onChange={e => setAddUsername(e.target.value)}
                  placeholder="যেমন: manager, admin_fahim"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  অ্যাডমিন ইমেইল *
                </label>
                <input
                  type="email"
                  required
                  maxLength={320}
                  className="admin-password-input"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="manager@example.com"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    maxLength={128}
                    className="admin-password-input"
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    কনফার্ম পাসওয়ার্ড *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    maxLength={128}
                    className="admin-password-input"
                    value={addConfirmPassword}
                    onChange={e => setAddConfirmPassword(e.target.value)}
                    placeholder="পুনরায় পাসওয়ার্ড"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  অ্যাডমিন রোল (Role)
                </label>
                <select
                  className="admin-password-input"
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as any)}
                >
                  <option value="admin">Standard Admin (ম্যানেজমেন্ট ও অর্ডারস)</option>
                  <option value="superadmin">Super Admin (সম্পূর্ণ সিস্টেম কন্ট্রোল)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="button button-light" onClick={() => setNewAdminModalOpen(false)}>
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={createAdmin.isPending || !addUsername.trim() || !addPassword.trim()}
                >
                  {createAdmin.isPending ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />}
                  অ্যাডমিন তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </section>
    </>
  );
}

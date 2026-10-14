import StoreHeader from "@/components/StoreHeader";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/shop";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Copy, CreditCard, LockKeyhole, LoaderCircle, Minus, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

function nextAllowedQuantity(product: { maxAllowedQuantity: number; quantityTiers: Array<{ minQuantity: number; maxQuantity: number }> }, current: number, direction: -1 | 1) {
  for (let next = current + direction; next >= 1 && next <= product.maxAllowedQuantity; next += direction) {
    if (!product.quantityTiers.length || product.quantityTiers.some(tier => next >= tier.minQuantity && next <= tier.maxQuantity)) return next;
  }
  return current;
}

export default function Checkout() {
  const { items, setQuantity, adjustMany, remove, clear } = useCart();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const catalogQuery = trpc.shop.catalog.list.useQuery(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: true });
  const catalog = catalogQuery.data ?? [];
  const { data: store } = trpc.shop.catalog.storeInfo.useQuery();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "bank">("bkash");
  const [idempotencyKey, setIdempotencyKey] = useState(() => window.crypto.randomUUID());
  const activePaymentMethod = store?.paymentMethods?.some(method => method.id === paymentMethod)
    ? paymentMethod : store?.paymentMethods?.[0]?.id ?? paymentMethod;
  const [paymentReference, setPaymentReference] = useState("");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<null | { orderNo: string; totalAmount: number; currency: string; paymentMethod: string; paymentAccount: string; paymentInstructions: string; supportContact: string }>(null);
  const [formError, setFormError] = useState("");
  const [stockRefreshRequired, setStockRefreshRequired] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState(false);
  const products = useMemo(() => items.flatMap(line => {
    const product = catalog.find(p => p.serviceKey === line.serviceKey);
    return product ? [{ product, quantity: line.quantity }] : [];
  }), [items, catalog]);
  const total = products.reduce((sum, line) => sum + line.product.retailPrice * line.quantity, 0);
  const unavailableLines = items.filter(line => !catalog.some(product => product.serviceKey === line.serviceKey));
  const reviewLines = products.filter(line => line.product.priceReviewRequired);
  const staleLines = products.filter(line => !line.product.stockFresh);
  const createOrder = trpc.shop.checkout.create.useMutation({
    onSuccess: result => { clear(); setIdempotencyKey(window.crypto.randomUUID()); setFormError(""); setPlacedOrder(result); window.scrollTo({ top: 0, behavior: "smooth" }); },
    onError: error => { setFormError(error.message || "Order তৈরি করা যায়নি। আবার চেষ্টা করুন."); if (/stock|available|catalog|price review|supplier/i.test(error.message)) { setStockRefreshRequired(true); void utils.shop.catalog.list.invalidate(); } },
  });

  const refreshCartFromSupplier = async () => {
    setRefreshingStock(true);
    try {
      const result = await catalogQuery.refetch();
      const latest = result.data ?? [];
      const changes: Array<{ serviceKey: string; quantity: number; maxQuantity: number }> = [];
      for (const line of items) {
        const product = latest.find(entry => entry.serviceKey === line.serviceKey);
        if (!product || !product.stockFresh || product.maxAllowedQuantity < 1 || product.priceReviewRequired) continue;
        const limit = Math.min(product.maxAllowedQuantity, product.stock, 100);
        let quantity = Math.min(line.quantity, limit);
        if (product.quantityTiers.length && !product.quantityTiers.some(tier => quantity >= tier.minQuantity && quantity <= tier.maxQuantity)) {
          const valid = product.quantityTiers.map(tier => Math.min(quantity, tier.maxQuantity)).filter(value => value >= 1 && product.quantityTiers.some(tier => value >= tier.minQuantity && value <= tier.maxQuantity));
          quantity = valid.length ? Math.max(...valid) : product.quantityTiers.find(tier => tier.minQuantity <= limit)?.minQuantity ?? 0;
        }
        if (quantity > 0) changes.push({ serviceKey: line.serviceKey, quantity, maxQuantity: limit });
      }
      adjustMany(changes);
      const stillStale = items.some(line => latest.some(product => product.serviceKey === line.serviceKey && !product.stockFresh));
      setStockRefreshRequired(stillStale);
      setFormError(stillStale ? "সর্বশেষ supplier stock এখনো পাওয়া যায়নি। কিছুক্ষণ পরে আবার refresh করুন।" : "Supplier catalog refresh হয়েছে। Basket ও current quantity review করে আবার order দিন।");
    } catch {
      setFormError("Supplier stock refresh করা যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।");
    } finally { setRefreshingStock(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault(); setFormError("");
    if (!products.length) { setFormError("কার্টের কোনো item আর available নেই। catalog-এ ফিরে যান।"); return; }
    if (unavailableLines.length) { setFormError("কার্টের কিছু service supplier catalog-এ আর available নেই। সেগুলো remove করুন বা catalog refresh করুন।"); setStockRefreshRequired(true); return; }
    if (reviewLines.length) { setFormError("Supplier currency/price review শেষ না হওয়া পর্যন্ত flagged service order করা যাবে না। Admin price/FX ঠিক করবেন।"); return; }
    if (staleLines.length) { setFormError("সর্বশেষ supplier stock যাচাই না হওয়া পর্যন্ত order দেওয়া যাবে না। আগে stock refresh করুন।"); setStockRefreshRequired(true); return; }
    const configuredMethods = store?.paymentMethods ?? [];
    const selectedMethod = configuredMethods.some(method => method.id === activePaymentMethod) ? activePaymentMethod : configuredMethods[0]?.id;
    if (!selectedMethod) { setFormError("এই payment method এখনও configure করা হয়নি। Admin-এর সাথে যোগাযোগ করুন।"); return; }
    createOrder.mutate({ idempotencyKey, customerName: name, customerEmail: email, customerPhone: phone, paymentMethod: selectedMethod, paymentReference, items: products.map(({ product, quantity }) => ({ serviceKey: product.serviceKey, quantity })) });
  };

  return <div className="shop-page">
    <StoreHeader />
    <main className="checkout-page container-wide">
      <div className="breadcrumb"><Link href="/">Shop</Link><span>/</span><strong>Checkout</strong></div>
      {placedOrder ? <section className="order-success">
        <div className="success-mark"><CheckCircle2 size={30} /></div><span className="eyebrow">ORDER RECEIVED</span><h1>অর্ডার জমা হয়েছে।</h1>
        <p>পেমেন্ট manually যাচাই হওয়ার পরেই activation শুরু হবে। আপনার verified customer account-এ order history থাকবে; সব activation complete হলে সব credential একই email-এ একসাথে যাবে।</p>
        <div className="success-order-number"><span>আপনার order code</span><b>{placedOrder.orderNo}</b></div>
        <div className="payment-instructions"><div className="payment-instruction-heading"><CreditCard size={17} /><strong>{placedOrder.paymentMethod} payment instruction</strong></div><div className="account-number">{placedOrder.paymentAccount}</div>{placedOrder.paymentInstructions && <p>{placedOrder.paymentInstructions}</p>}<p>Payment পাঠিয়ে থাকলে admin আপনার reference যাচাই করবেন। Order status page-এ update দেখুন।</p></div>
        <div className="success-total"><span>Order total</span><strong>{formatMoney(placedOrder.totalAmount, placedOrder.currency)}</strong></div>
        {placedOrder.supportContact && <p className="contact-note">সহায়তা: {placedOrder.supportContact}</p>}
        <div className="success-actions"><button className="button button-primary" onClick={() => navigate(`/track/${placedOrder.orderNo}`)}>Order status দেখুন <ArrowRight size={15} /></button><Link className="button button-secondary" href="/account">Customer account <ArrowRight size={15} /></Link><button className="button button-light" onClick={() => { setPlacedOrder(null); navigate("/"); }}>Shop-এ ফিরুন</button></div>
      </section> : <>
        <div className="checkout-heading"><div><div className="eyebrow">SECURE CHECKOUT <span className="heading-line" /></div><h1>আপনার অর্ডার</h1><p>দাম ও payment method admin নির্ধারণ করেন। Payment manually verify হলেই activation হবে।</p></div><div className="checkout-step"><span className="step-active">01</span> Your details <i /> <span>02</span> Payment</div></div>
        {!items.length ? <div className="empty-panel checkout-empty"><span className="empty-icon"><CreditCard /></span><h3>কার্ট এখনো খালি</h3><p>প্রথমে catalog থেকে পছন্দের service বেছে নিন।</p><Link className="button button-primary" href="/#services">Catalog-এ যান <ArrowRight size={15} /></Link></div> : <form onSubmit={submit} className="checkout-layout">
          <div className="checkout-main">
            <section className="form-panel"><div className="panel-heading"><span className="panel-number">01</span><div><h2>যোগাযোগের তথ্য</h2><p>Checkout আপনার email দিয়ে customer profile তৈরি/আপডেট করবে।</p></div></div><div className="form-grid"><label className="field full-field">আপনার নাম<input required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="নাম লিখুন" /></label><label className="field">Email address<input required type="email" maxLength={320} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label className="field">Phone number<input required type="tel" minLength={7} maxLength={64} autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></label><p className="account-checkout-note"><ShieldCheck size={14} /> Password পাঠানো হবে না। Sign-in link verify করলে account history ও completed codes দেখতে পারবেন; credential একসাথে email হবে।</p></div></section>
            <section className="form-panel"><div className="panel-heading"><span className="panel-number">02</span><div><h2>Manual payment</h2><p>নিচে shop admin-এর দেওয়া account-এ payment দিন।</p></div></div>
              {store?.paymentMethods?.length ? <div className="payment-options">{store.paymentMethods.map(method => {
                const isSelected = activePaymentMethod === method.id;
                const isCopied = copiedAccount === method.account;
                return (
                  <label className={`payment-option ${isSelected ? "selected" : ""}`} key={method.id}>
                    <input type="radio" name="payment" value={method.id} checked={isSelected} onChange={() => setPaymentMethod(method.id)} />
                    <span className="payment-option-icon">{method.id === "bank" ? <Building2 size={18} /> : <CreditCard size={18} />}</span>
                    <span className="payment-option-details">
                      <b>{method.label}</b>
                      <span className="account-row">
                        <small>{method.account}</small>
                        <button
                          type="button"
                          className={`account-copy-btn ${isCopied ? "copied" : ""}`}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(method.account).then(() => {
                              setCopiedAccount(method.account);
                              setTimeout(() => setCopiedAccount(null), 2000);
                            }).catch(() => {});
                          }}
                          title="নম্বর কপি করুন"
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span>{isCopied ? "কপি হয়েছে" : "কপি"}</span>
                        </button>
                      </span>
                    </span>
                    <i className="radio-indicator" />
                  </label>
                );
              })}</div> : <div className="notice warning"><CreditCard size={16} /><span>Admin এখনো payment account configure করেননি; order submit করতে পারবেন না।</span></div>}
              <label className="field">Transaction ID / reference <span className="optional">ঐচ্ছিক</span><input maxLength={160} value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Payment করে থাকলে reference লিখুন" /></label>
              {store?.paymentInstructions && <div className="payment-helper">{store.paymentInstructions}</div>}
              <div className="notice"><ShieldCheck size={16} /><span>এই ধাপে কোনো টাকা কাটা হবে না। Admin payment verify করার পর activation provider-এ purchase request যাবে।</span></div>
            </section>
          </div>
          <aside className="order-summary"><div className="summary-title"><h2>আপনার basket</h2><span>{items.reduce((sum, item) => sum + item.quantity, 0)}টি item</span></div>
            {products.map(({ product, quantity }) => (
              <div className="summary-product" key={product.serviceKey}>
                {product.imageUrl ? <img className="checkout-product-image" src={product.imageUrl} alt="" loading="lazy" /> : <div className="mini-product-mark">{product.serviceKey.slice(0, 2)}</div>}
                <div className="summary-product-info">
                  <b>{product.name}</b>
                  <span>{formatMoney(product.retailPrice, store?.currency ?? "BDT")}</span>
                  {Boolean(product.quantityTiers && product.quantityTiers.length > 0) ? (
                    <small className="quantity-slab-hint">Supplier quantity slab applies</small>
                  ) : null}
                  {Boolean(product.priceReviewRequired) ? (
                    <small className="price-review-flag"><AlertTriangle size={12} /> দামের review প্রয়োজন</small>
                  ) : null}
                  <div className="quantity-control">
                    <button type="button" aria-label="কমিয়ে দিন" disabled={nextAllowedQuantity(product, quantity, -1) === quantity} onClick={() => setQuantity(product.serviceKey, nextAllowedQuantity(product, quantity, -1), product.maxAllowedQuantity)}><Minus size={12} /></button>
                    <span>{quantity}</span>
                    <button type="button" aria-label="বাড়িয়ে দিন" disabled={nextAllowedQuantity(product, quantity, 1) === quantity} onClick={() => setQuantity(product.serviceKey, nextAllowedQuantity(product, quantity, 1), product.maxAllowedQuantity)}><Plus size={12} /></button>
                    <button type="button" className="remove-item" aria-label="সরান" onClick={() => remove(product.serviceKey)}><Trash2 size={12} /></button>
                  </div>
                </div>
                <strong>{formatMoney(product.retailPrice * quantity, store?.currency ?? "BDT")}</strong>
              </div>
            ))}
            {unavailableLines.map(line => <div className="unavailable-cart-line" key={line.serviceKey}><AlertTriangle size={14} /><span>{line.serviceKey} · supplier catalog-এ available নেই</span><button type="button" className="text-link" onClick={() => remove(line.serviceKey)}>Remove</button></div>)}
            <div className="summary-line"><span>Subtotal</span><span>{formatMoney(total, store?.currency ?? "BDT")}</span></div><div className="summary-total"><span>মোট</span><strong>{formatMoney(total, store?.currency ?? "BDT")}</strong></div>
            {formError && <div className="form-error">{formError}{stockRefreshRequired && <button type="button" className="button button-light refresh-cart" onClick={() => void refreshCartFromSupplier()} disabled={refreshingStock || catalogQuery.isFetching}>{refreshingStock || catalogQuery.isFetching ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />} Supplier stock refresh করে basket update</button>}</div>}
            <button type="submit" className="button button-primary summary-submit" disabled={createOrder.isPending || !store?.paymentMethods?.length || unavailableLines.length > 0 || reviewLines.length > 0 || staleLines.length > 0}>{createOrder.isPending ? "Order জমা হচ্ছে..." : "Order নিশ্চিত করুন"}<ArrowRight size={15} /></button>
            <p className="summary-foot"><LockKeyhole size={13} /> Customer information protected · manual payment only</p>
            <Link className="back-link" href="/#services"><ArrowLeft size={14} /> Catalog-এ ফিরুন</Link>
          </aside>
        </form>}
      </>}
    </main>
    <footer className="store-footer"><div className="container-wide footer-inner"><span>AccZone Shop</span><span>অর্ডার দেওয়ার আগে তথ্য যাচাই করুন</span><Link href="/track">অর্ডার ট্র্যাক <ArrowRight size={14} /></Link></div></footer>
  </div>;
}

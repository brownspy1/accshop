import StoreHeader from "@/components/StoreHeader";
import { trpc } from "@/lib/trpc";
import { formatMoney, orderStatusLabels } from "@/lib/shop";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, LoaderCircle, PackageCheck, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

const displayStatus: Record<string, string> = {
  awaiting_payment: "Payment যাচাই বাকি", paid: "Payment নিশ্চিত", fulfilling: "Activation চলছে", fulfilled: "Delivery সম্পন্ন", partially_fulfilled: "আংশিক delivery · support প্রয়োজন", fulfillment_unknown: "Activation result যাচাই হচ্ছে", fulfillment_failed: "Delivery review প্রয়োজন", cancelled: "Order বাতিল",
};

export default function TrackOrder() {
  const [, routeParams] = useRoute("/track/:orderNo");
  const [form, setForm] = useState({ orderNo: routeParams?.orderNo ?? "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { if (routeParams?.orderNo) setForm(current => ({ ...current, orderNo: routeParams.orderNo! })); }, [routeParams?.orderNo]);
  const result = trpc.shop.checkout.track.useMutation();
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(true); result.mutate(form); };
  const reset = () => { setSubmitted(false); result.reset(); };

  return <div className="shop-page"><StoreHeader /><main className="track-page container-wide">
    <div className="breadcrumb"><Link href="/">Shop</Link><span>/</span><strong>Order tracking</strong></div>
    <section className="track-shell">
      <div className="track-intro"><span className="track-icon"><PackageCheck size={24} /></span><div className="eyebrow">ORDER STATUS</div><h1>আপনার অর্ডার কোথায়?</h1><p>Order code, checkout-এ দেওয়া email ও phone দিন। তথ্যগুলো মিললে order status দেখতে পারবেন। Activation code দেখতে email verify করে Account page-এ sign in করুন।</p>
        <div className="privacy-note"><ShieldCheck size={15} /> Order code একা দিয়ে কেউ order দেখতে পারবে না; activation code-এর জন্য verified account লাগবে।</div></div>
      <form className="track-form" onSubmit={submit}><label className="field">Order code<input required minLength={8} maxLength={32} value={form.orderNo} onChange={e => { setForm({ ...form, orderNo: e.target.value.toUpperCase() }); reset(); }} placeholder="AZ-XXXXXXXXXXXXX" /></label><label className="field">Checkout email<input type="email" required maxLength={320} value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); reset(); }} placeholder="you@example.com" /></label><label className="field">Checkout phone<input type="tel" required minLength={7} maxLength={64} value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); reset(); }} placeholder="01XXXXXXXXX" /></label><button className="button button-primary track-submit" type="submit" disabled={result.isPending}>{result.isPending ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />} Order খুঁজুন <ArrowRight size={15} /></button>
        {result.isError && submitted && <p className="form-error">{result.error.message}</p>}
      </form>
    </section>

    {result.data && submitted && <section className="track-result"><div className="result-heading"><div><span className="eyebrow">{result.data.orderNo}</span><h2>{orderStatusLabels[result.data.status] ?? result.data.status}</h2></div><span className={`status-chip status-${result.data.status}`}>{displayStatus[result.data.status] ?? result.data.status}</span></div>
      <div className="timeline">{["awaiting_payment", "paid", "fulfilled"].map((status, index) => {const active = status === "awaiting_payment" ? true : status === "paid" ? ["paid", "fulfilling", "fulfilled", "partially_fulfilled"].includes(result.data.status) : result.data.status === "fulfilled"; return <div className={`timeline-item ${active ? "done" : ""}`} key={status}><span className="timeline-icon">{active ? <CheckCircle2 size={16} /> : <Circle size={15} />}</span><div><b>{["Order received", "Payment verified", "Activation delivered"][index]}</b><small>{["আপনার order তৈরি হয়েছে", "Admin manual payment যাচাই করেন", "Activation code delivery সম্পন্ন"][index]}</small></div>{index < 2 && <i />}</div>;})}</div>
      <div className="track-items">{result.data.items.map((item, index) => <article className="track-item" key={`${item.serviceName}-${index}`}><div className="mini-product-mark">AZ</div><div className="track-item-main"><b>{item.serviceName}</b><small>Quantity {item.quantity} · {displayStatus[item.fulfillmentState] ?? item.fulfillmentState}</small></div></article>)}</div>
      <div className="track-total"><span>Order total</span><b>{formatMoney(result.data.totalAmount, result.data.currency)}</b></div>
      {result.data.status === "awaiting_payment" && <div className="notice"><Circle size={14} /><span>Payment verify হলে status update হবে। কিছুক্ষণ পর আবার দেখুন।</span></div>}
      {result.data.status === "fulfillment_unknown" && <div className="notice warning"><ShieldCheck size={14} /><span>Provider response review হচ্ছে। Duplicate purchase এড়াতে admin history যাচাই না করা পর্যন্ত পুনরায় attempt বন্ধ রাখা হয়েছে।</span></div>}
    </section>}
    <Link className="back-link track-back" href="/"><ArrowLeft size={14} /> Shop-এ ফিরুন</Link>
  </main><footer className="store-footer"><div className="container-wide footer-inner"><span>AccZone Shop</span><span>Private order status</span><Link href="/">Catalog <ArrowRight size={14} /></Link></div></footer></div>;
}

import StoreHeader from "@/components/StoreHeader";
import { trpc } from "@/lib/trpc";
import { formatMoney, orderStatusLabels } from "@/lib/shop";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Copy, KeyRound, LoaderCircle, PackageCheck, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

const displayStatus: Record<string, string> = {
  awaiting_payment: "Payment যাচাই বাকি",
  paid: "Payment নিশ্চিত",
  fulfilling: "Activation চলছে",
  fulfilled: "Delivery সম্পন্ন",
  partially_fulfilled: "আংশিক delivery · support প্রয়োজন",
  fulfillment_unknown: "Activation result যাচাই হচ্ছে",
  fulfillment_failed: "Delivery review প্রয়োজন",
  cancelled: "Order বাতিল",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button type="button" className={`code-copy-btn ${copied ? "copied" : ""}`} onClick={copy} aria-label="Copy activation code">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function getCodeDisplay(raw: unknown): { text: string; label?: string } {
  if (typeof raw === "string") {
    return { text: raw.trim() };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const text = typeof obj.codeValue === "string" ? obj.codeValue.trim()
      : typeof obj.code === "string" ? obj.code.trim()
      : typeof obj.value === "string" ? obj.value.trim()
      : typeof obj.secret === "string" ? obj.secret.trim()
      : JSON.stringify(obj);
    const label = typeof obj.codeType === "string" ? obj.codeType.trim() : undefined;
    return { text, label };
  }
  return { text: String(raw ?? "").trim() };
}

export default function TrackOrder() {
  const [, routeParams] = useRoute("/track/:orderNo");
  const [form, setForm] = useState({ orderNo: routeParams?.orderNo ?? "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (routeParams?.orderNo) {
      setForm(current => ({ ...current, orderNo: routeParams.orderNo! }));
    }
  }, [routeParams?.orderNo]);

  const result = trpc.shop.checkout.track.useMutation();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const orderNo = form.orderNo.trim().toUpperCase();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!email && !phone) {
      setValidationError("Order tracking-এর জন্য Email অথবা Phone নম্বরের যেকোনো একটি দিন।");
      return;
    }
    setValidationError("");
    setSubmitted(true);
    result.mutate({ orderNo, email, phone });
  };

  const reset = () => {
    setValidationError("");
    setSubmitted(false);
    result.reset();
  };

  return (
    <div className="shop-page">
      <StoreHeader />
      <main className="track-page container-wide">
        <div className="breadcrumb">
          <Link href="/">Shop</Link>
          <span>/</span>
          <strong>Order tracking</strong>
        </div>
        <section className="track-shell">
          <div className="track-intro">
            <span className="track-icon">
              <PackageCheck size={24} />
            </span>
            <div className="eyebrow">ORDER STATUS</div>
            <h1>আপনার অর্ডার কোথায়?</h1>
            <p>
              Order code এবং checkout-এ দেওয়া email অথবা phone নম্বর দিন (যেকোনো একটি দিলেই হবে)। তথ্য মিললে order status ও ডেলিভারি সম্পন্ন হলে activation code অন-স্ক্রিন দেখতে ও copy করতে পারবেন।
            </p>
            <div className="privacy-note">
              <ShieldCheck size={15} /> Order code এবং Email বা Phone নম্বরের মিল থাকলে সুরক্ষিত ডেলিভারি কোড অন-স্ক্রিন প্রদর্শিত হবে।
            </div>
          </div>
          <form className="track-form" onSubmit={submit}>
            <label className="field">
              Order code
              <input
                required
                minLength={6}
                maxLength={32}
                value={form.orderNo}
                onChange={e => {
                  setForm({ ...form, orderNo: e.target.value.toUpperCase() });
                  reset();
                }}
                placeholder="AZ-XXXXXXXXXXXXX"
              />
            </label>
            <span className="track-helper-badge">Email অথবা Phone — যেকোনো একটি দিলেই চলবে:</span>
            <label className="field">
              Checkout email <span className="track-optional-tag">(ঐচ্ছিক যদি phone দেন)</span>
              <input
                type="email"
                maxLength={320}
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  reset();
                }}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              Checkout phone <span className="track-optional-tag">(ঐচ্ছিক যদি email দেন)</span>
              <input
                type="tel"
                maxLength={64}
                value={form.phone}
                onChange={e => {
                  setForm({ ...form, phone: e.target.value });
                  reset();
                }}
                placeholder="01XXXXXXXXX"
              />
            </label>
            <button className="button button-primary track-submit" type="submit" disabled={result.isPending}>
              {result.isPending ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />} Order খুঁজুন <ArrowRight size={15} />
            </button>
            {validationError && <p className="form-error">{validationError}</p>}
            {result.isError && submitted && <p className="form-error">{result.error.message}</p>}
          </form>
        </section>

        {result.data && submitted && (
          <section className="track-result">
            <div className="result-heading">
              <div>
                <span className="eyebrow">{result.data.orderNo}</span>
                <h2>{orderStatusLabels[result.data.status] ?? result.data.status}</h2>
              </div>
              <span className={`status-chip status-${result.data.status}`}>
                {displayStatus[result.data.status] ?? result.data.status}
              </span>
            </div>
            <div className="timeline">
              {["awaiting_payment", "paid", "fulfilled"].map((status, index) => {
                const active = status === "awaiting_payment"
                  ? true
                  : status === "paid"
                  ? ["paid", "fulfilling", "fulfilled", "partially_fulfilled"].includes(result.data.status)
                  : result.data.status === "fulfilled";
                return (
                  <div className={`timeline-item ${active ? "done" : ""}`} key={status}>
                    <span className="timeline-icon">
                      {active ? <CheckCircle2 size={16} /> : <Circle size={15} />}
                    </span>
                    <div>
                      <b>{["Order received", "Payment verified", "Activation delivered"][index]}</b>
                      <small>
                        {["আপনার order তৈরি হয়েছে", "Admin manual payment যাচাই করেন", "Activation code delivery সম্পন্ন"][index]}
                      </small>
                    </div>
                    {index < 2 && <i />}
                  </div>
                );
              })}
            </div>
            <div className="track-items">
              {result.data.items.map((item, index) => (
                <article className="track-item" key={`${item.serviceName}-${index}`}>
                  <div className="mini-product-mark">AZ</div>
                  <div className="track-item-main">
                    <b>{item.serviceName}</b>
                    <small>
                      Quantity {item.quantity} · {displayStatus[item.fulfillmentState] ?? item.fulfillmentState}
                    </small>
                    {item.codes && item.codes.length > 0 && (
                      <div className="track-delivered-codes">
                        <div className="track-codes-header">
                          <KeyRound size={13} /> Activation Code{item.codes.length > 1 ? "s" : ""}:
                        </div>
                        {item.codes.map((rawCode: unknown, cIdx: number) => {
                          const { text, label } = getCodeDisplay(rawCode);
                          if (!text) return null;
                          return (
                            <div key={cIdx} className="track-code-item">
                              <div className="track-code-content">
                                {label && <span className="track-code-badge">{label}</span>}
                                <code>{text}</code>
                              </div>
                              <CopyButton text={text} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="track-total">
              <span>Order total</span>
              <b>{formatMoney(result.data.totalAmount, result.data.currency)}</b>
            </div>
            {result.data.status === "awaiting_payment" && (
              <div className="notice">
                <Circle size={14} />
                <span>Payment verify হলে status update হবে। কিছুক্ষণ পর আবার দেখুন।</span>
              </div>
            )}
            {result.data.status === "fulfillment_unknown" && (
              <div className="notice warning">
                <ShieldCheck size={14} />
                <span>
                  Provider response review হচ্ছে। Duplicate purchase এড়াতে admin history যাচাই না করা পর্যন্ত পুনরায় attempt বন্ধ রাখা হয়েছে।
                </span>
              </div>
            )}
          </section>
        )}
        <Link className="back-link track-back" href="/">
          <ArrowLeft size={14} /> Shop-এ ফিরুন
        </Link>
      </main>
      <footer className="store-footer">
        <div className="container-wide footer-inner">
          <span>AccZone Shop</span>
          <span>Private order status</span>
          <Link href="/">
            Catalog <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}

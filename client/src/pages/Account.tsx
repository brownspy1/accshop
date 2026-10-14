import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/shop";
import StoreHeader from "@/components/StoreHeader";
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, KeyRound, LoaderCircle, LogOut, Mail, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  awaiting_payment: "পেমেন্ট অপেক্ষমাণ", paid: "পেমেন্ট যাচাই হয়েছে", fulfilling: "অ্যাক্টিভেশন চলছে",
  fulfilled: "সম্পন্ন", partially_fulfilled: "আংশিক সম্পন্ন", fulfillment_unknown: "যাচাই প্রয়োজন",
  fulfillment_failed: "সমস্যা হয়েছে", cancelled: "বাতিল",
};
const deliveryLabels: Record<string, string> = {
  pending: "ইমেইল অপেক্ষমাণ", sending: "ইমেইল পাঠানো হচ্ছে", sent: "ইমেইল পাঠানো হয়েছে",
  failed: "ইমেইল পাঠানো যায়নি", unknown: "ইমেইল delivery যাচাই হচ্ছে",
};

export function VerifyAccount() {
  const verify = trpc.customer.verifyLink.useMutation();
  const [message, setMessage] = useState("আপনার নিরাপদ link যাচাই করা হচ্ছে…");
  const didVerify = useRef(false);
  useEffect(() => {
    if (didVerify.current) return;
    didVerify.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) { setMessage("এই account link-এ token নেই। নতুন link চাইতে Account page-এ যান।"); return; }
    verify.mutate({ token }, {
      onSuccess: () => {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        setMessage("Email verify হয়েছে। আপনার account খোলা হচ্ছে…");
        window.setTimeout(() => window.location.replace("/account"), 700);
      },
      onError: error => setMessage(error.message || "এই link expire হয়েছে বা আগে ব্যবহার হয়েছে। নতুন link চান।"),
    });
  }, []);
  return <div className="shop-page"><StoreHeader /><main className="account-page container-wide"><section className="account-panel account-verify"><div className="account-mark"><ShieldCheck size={25} /></div><span className="eyebrow">SECURE CUSTOMER ACCOUNT</span><h1>Email verification</h1><p>{verify.isPending && <LoaderCircle className="spin" size={15} />} {message}</p><Link className="button button-secondary" href="/account">Account page <ArrowRight size={15} /></Link></section></main></div>;
}

export default function Account() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [phoneOrOrder, setPhoneOrOrder] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [directUrl, setDirectUrl] = useState<string | null>(null);

  const account = trpc.customer.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: true });

  const loginDirect = trpc.customer.loginDirect.useMutation({
    onSuccess: () => {
      toast.success("অ্যাকাউন্টে সফলভাবে প্রবেশ করা হয়েছে!");
      setErrorMessage("");
      setSuccessMessage("অ্যাকাউন্টে সফলভাবে প্রবেশ করা হয়েছে!");
      setDirectUrl(null);
      void utils.customer.me.invalidate();
    },
    onError: err => {
      toast.error(err.message);
      setErrorMessage(err.message);
      setSuccessMessage("");
    },
  });

  const request = trpc.customer.requestLink.useMutation({
    onSuccess: result => {
      setErrorMessage("");
      if (result.verified) {
        toast.success("অ্যাকাউন্টে সরাসরি প্রবেশ করা হয়েছে!");
        setSuccessMessage("অ্যাকাউন্টে সরাসরি প্রবেশ করা হয়েছে!");
        setDirectUrl(null);
        void utils.customer.me.invalidate();
      } else if (result.directUrl) {
        setDirectUrl(result.directUrl);
        setSuccessMessage(result.message);
      } else {
        setSuccessMessage(result.message);
      }
    },
    onError: error => {
      setErrorMessage(error.message);
      setSuccessMessage("");
    },
  });

  const logout = trpc.customer.logout.useMutation({
    onSuccess: () => {
      void utils.customer.me.invalidate();
      setSuccessMessage("আপনি নিরাপদে sign out করেছেন।");
      setErrorMessage("");
      setDirectUrl(null);
    },
  });

  const sendAgain = trpc.customer.resendCredentials.useMutation({
    onSuccess: result => {
      const label = result.status === "sent" ? "সব activation code ইমেইলে পাঠানো হয়েছে।" : result.status === "already_sent" ? "Email আগেই পাঠানো হয়েছে।" : "Email delivery এখনো সম্পন্ন হয়নি; পরে আবার চেষ্টা করুন।";
      toast.success(label);
      void utils.customer.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setDirectUrl(null);
    if (phoneOrOrder.trim()) {
      loginDirect.mutate({ email: email.trim(), phoneOrOrder: phoneOrOrder.trim() });
    } else {
      request.mutate({ email: email.trim() });
    }
  };

  return (
    <div className="shop-page">
      <StoreHeader />
      <main className="account-page container-wide">
        <div className="breadcrumb"><Link href="/">Shop</Link><span>/</span><strong>Customer account</strong></div>
        {account.isLoading ? (
          <section className="account-panel account-loading">
            <LoaderCircle className="spin" size={22} />
            <span>আপনার account যাচাই হচ্ছে…</span>
          </section>
        ) : account.data ? (
          <>
            <section className="account-welcome">
              <div>
                <div className="eyebrow">VERIFIED CUSTOMER ACCOUNT</div>
                <h1>আপনার অর্ডার ও activation</h1>
                <p>{account.data.customer.name || account.data.customer.email} · {account.data.customer.email}</p>
              </div>
              <button className="button button-light" onClick={() => logout.mutate()} disabled={logout.isPending}>
                {logout.isPending ? <LoaderCircle className="spin" size={15} /> : <LogOut size={15} />} Sign out
              </button>
            </section>
            {!account.data.orders.length ? (
              <section className="account-panel account-empty">
                <PackageCheck size={23} />
                <h2>এখনো কোনো অর্ডার নেই</h2>
                <p>আপনার verified email দিয়ে করা order এখানে দেখা যাবে।</p>
                <Link className="button button-primary" href="/#services">সার্ভিস দেখুন <ArrowRight size={15} /></Link>
              </section>
            ) : (
              <div className="account-order-list">
                {account.data.orders.map(order => (
                  <article className="account-order" key={order.id}>
                    <header className="account-order-head">
                      <div>
                        <span>অর্ডার</span>
                        <strong>{order.orderNo}</strong>
                        <small>{new Date(order.createdAt).toLocaleString("bn-BD")}</small>
                      </div>
                      <div className="account-order-badges">
                        <span className={`status-chip status-${order.status}`}><i />{statusLabels[order.status] ?? order.status}</span>
                        <b>{formatMoney(order.totalAmount, order.currency)}</b>
                      </div>
                    </header>
                    <div className="account-order-lines">
                      {order.items.map((item, index) => (
                        <section className="account-order-line" key={`${order.id}-${index}`}>
                          <div className="account-order-product">
                            <b>{item.serviceName}</b>
                            <span>{item.quantity}টি · {item.fulfillmentState === "fulfilled" ? "Activation ready" : statusLabels[order.status] ?? order.status}</span>
                          </div>
                          {item.codes.length ? (
                            <div className="customer-codes">
                              {item.codes.map((rawCode, codeIndex) => {
                                const code = typeof rawCode === "string" ? rawCode : typeof rawCode === "object" && rawCode !== null ? String((rawCode as Record<string, unknown>).codeValue || (rawCode as Record<string, unknown>).code || JSON.stringify(rawCode)) : String(rawCode ?? "");
                                return (
                                  <div className="customer-code" key={`${codeIndex}-${code.slice(0, 10)}`}>
                                    <code>{code}</code>
                                    <button
                                      type="button"
                                      title="Copy code"
                                      aria-label="Copy code"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(code).then(() => toast.success("Code copy হয়েছে")).catch(() => toast.error("Code copy করা যায়নি"));
                                      }}
                                    >
                                      <Copy size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="credential-wait">সম্পূর্ণ activation-এর পর এখানে code দেখা যাবে।</span>
                          )}
                        </section>
                      ))}
                    </div>
                    <footer className="account-order-foot">
                      <span className="delivery-state">
                        <Mail size={14} /> {order.deliveryEmail ? deliveryLabels[order.deliveryEmail.status] ?? order.deliveryEmail.status : order.status === "fulfilled" ? "ডেলিভারি প্রস্তুত" : "সব activation complete হলে কোড রেডি হবে"}
                      </span>
                      {order.status === "fulfilled" && (
                        <Link className="button button-light" href={`/track/${order.orderNo}`}>
                          অন-স্ক্রিন কোড দেখুন <ArrowRight size={14} />
                        </Link>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <section className="account-panel account-login">
            <div className="account-mark"><KeyRound size={23} /></div>
            <div className="eyebrow">DOMAINFO-FREE INSTANT ACCESS</div>
            <h1>আপনার অ্যাকাউন্ট ও অর্ডার খুলুন</h1>
            <p>ডোমেইন বা ইমেইল ভেরিফিকেশন ছাড়াও Checkout-এ ব্যবহৃত Phone নম্বর দিয়ে সরাসরি প্রবেশ করতে পারবেন।</p>

            <div className="account-track-shortcut">
              <PackageCheck size={16} />
              <div>
                শুধু নির্দিষ্ট কোনো অর্ডারের ডেলিভারি কোড দেখতে চান?{" "}
                <Link href="/track">সরাসরি Order Tracking করুন &rarr;</Link>
              </div>
            </div>

            <form onSubmit={submit}>
              <label className="field">
                Checkout Email
                <input
                  type="email"
                  required
                  maxLength={320}
                  autoComplete="email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    setErrorMessage("");
                    setSuccessMessage("");
                    setDirectUrl(null);
                  }}
                  placeholder="you@example.com"
                />
              </label>

              <label className="field">
                Phone নম্বর অথবা Order কোড <span className="track-optional-tag">(সরাসরি প্রবেশের জন্য)</span>
                <input
                  type="text"
                  maxLength={64}
                  value={phoneOrOrder}
                  onChange={event => {
                    setPhoneOrOrder(event.target.value);
                    setErrorMessage("");
                    setSuccessMessage("");
                    setDirectUrl(null);
                  }}
                  placeholder="01XXXXXXXXX অথবা AZ-XXXXXXXXXXXXX"
                />
              </label>

              <button
                className="button button-primary full-button"
                type="submit"
                disabled={request.isPending || loginDirect.isPending}
              >
                {request.isPending || loginDirect.isPending ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <KeyRound size={15} />
                )}{" "}
                অ্যাকাউন্টে প্রবেশ করুন <ArrowRight size={15} />
              </button>
            </form>

            {directUrl && (
              <div className="account-direct-access">
                <b>ডোমেইন ছাড়া সরাসরি ভেরিফিকেশন লিঙ্ক প্রস্তুত</b>
                <p>{successMessage}</p>
                <Link className="button button-primary" href={directUrl}>
                  এখনই অ্যাকাউন্টে প্রবেশ করুন <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {errorMessage && (
              <div className="notice warning">
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && !directUrl && (
              <div className="notice account-message">
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="account-privacy">
              <ShieldCheck size={15} /> Checkout-এ দেওয়া Phone নম্বর বা Order Code মিললেই কোনো ইমেইল লিঙ্ক ছাড়াই তাৎক্ষণিক অ্যাকাউন্ট খুলে যাবে।
            </div>
            <Link className="back-link" href="/">Shop-এ ফিরুন</Link>
          </section>
        )}
      </main>
      <footer className="store-footer">
        <div className="container-wide footer-inner">
          <span>AccZone Shop</span>
          <span>আপনার verified email-এর সঙ্গে যুক্ত order-ই শুধু এখানে দেখা যাবে</span>
          <Link href="/track">Order tracking <ArrowRight size={14} /></Link>
        </div>
      </footer>
    </div>
  );
}

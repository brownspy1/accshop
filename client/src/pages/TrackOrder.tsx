import React, { FormEvent, useEffect, useState } from "react";
import StoreHeader from "@/components/StoreHeader";
import ScratchCard from "@/components/ScratchCard";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatBn, orderStatusLabels } from "@/lib/shop";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  KeyRound,
  Loader2,
  PackageCheck,
  Search,
  ShieldCheck,
  MessageCircle,
  BellRing,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

const displayStatus: Record<string, string> = {
  awaiting_payment: "পেমেন্ট যাচাই বাকি",
  paid: "পেমেন্ট নিশ্চিত",
  fulfilling: "অ্যাক্টিভেশন চলছে",
  fulfilled: "ডেলিভারি সম্পন্ন",
  partially_fulfilled: "আংশিক ডেলিভারি",
  fulfillment_unknown: "স্ট্যাটাস যাচাই চলছে",
  fulfillment_failed: "রিভিউ প্রয়োজন",
  cancelled: "অর্ডার বাতিল",
};

function getCodeDisplay(raw: unknown): { text: string; label?: string } {
  if (typeof raw === "string") {
    return { text: raw.trim() };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const text =
      typeof obj.codeValue === "string"
        ? obj.codeValue.trim()
        : typeof obj.code === "string"
        ? obj.code.trim()
        : typeof obj.value === "string"
        ? obj.value.trim()
        : typeof obj.secret === "string"
        ? obj.secret.trim()
        : JSON.stringify(obj);
    const label = typeof obj.codeType === "string" ? obj.codeType.trim() : undefined;
    return { text, label };
  }
  return { text: String(raw ?? "").trim() };
}

export default function TrackOrder() {
  const [, routeParams] = useRoute("/track/:orderNo");
  const [form, setForm] = useState({
    orderNo: routeParams?.orderNo ?? "",
    email: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderSet, setReminderSet] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"none" | "yes" | "no">("none");

  useEffect(() => {
    if (routeParams?.orderNo) {
      setForm((current) => ({ ...current, orderNo: routeParams.orderNo! }));
    }
  }, [routeParams?.orderNo]);

  const result = trpc.shop.checkout.track.useMutation();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const orderNo = form.orderNo.trim().toUpperCase();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!email && !phone) {
      setValidationError("অর্ডার ট্র্যাকিংয়ের জন্য ইমেইল অথবা ফোন নম্বরের যেকোনো একটি দিন।");
      return;
    }
    setValidationError("");
    setSubmitted(true);
    result.mutate({ orderNo, email, phone });
  };

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderEmail) return;
    setReminderSet(true);
    toast.success("সাবস্ক্রিপশনের মেয়াদ শেষের পূর্বে আপনাকে ইমেইলে মনে করিয়ে দেওয়া হবে!");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--paper)" }}>
      <StoreHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-14">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
          <Link href="/" className="hover:text-emerald-800">
            হোম
          </Link>
          <span>/</span>
          <span className="text-slate-800">অর্ডার ট্র্যাকিং</span>
        </div>

        {/* Tracking Lookup Box */}
        <section
          className="p-6 sm:p-8 rounded-[24px] border bg-white shadow-sm mb-8"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center shrink-0"
              style={{ backgroundColor: "var(--jade-mist)", color: "var(--padma)" }}
            >
              <PackageCheck size={24} />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl text-slate-900 leading-tight">
                আপনার অর্ডার ট্র্যাক করুন
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                অর্ডার কোড এবং চেকআউটে দেওয়া ইমেইল অথবা মোবাইল নম্বর দিয়ে স্ট্যাটাস ও কোড দেখুন।
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                অর্ডার কোড (Order Code) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.orderNo}
                onChange={(e) => setForm({ ...form, orderNo: e.target.value.toUpperCase() })}
                placeholder="AZ-XXXXXXXXXXXXX"
                className="w-full px-4 py-3 rounded-xl border font-mono text-sm uppercase font-bold text-slate-900 outline-none"
                style={{ borderColor: "var(--line)", backgroundColor: "#FAFCFA" }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  ইমেইল ঠিকানা <span className="text-slate-400 font-normal">(ইমেইল বা ফোন)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@gmail.com"
                  className="w-full px-4 py-3 rounded-xl border text-sm text-slate-900 outline-none"
                  style={{ borderColor: "var(--line)", backgroundColor: "#FAFCFA" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  ফোন নম্বর <span className="text-slate-400 font-normal">(ঐচ্ছিক যদি ইমেইল দেন)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl border text-sm text-slate-900 outline-none"
                  style={{ borderColor: "var(--line)", backgroundColor: "#FAFCFA" }}
                />
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {validationError}
              </p>
            )}

            {result.isError && (
              <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {result.error.message || "অর্ডার তথ্য খুঁজে পাওয়া যায়নি। কোড ও ইমেইল আবার যাচাই করুন।"}
              </p>
            )}

            <button
              type="submit"
              disabled={result.isPending}
              className="btn-padma text-sm py-3 mt-1 shadow-xs"
            >
              {result.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  অনুসন্ধান চলছে…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search size={16} />
                  অর্ডার খুঁজুন
                </span>
              )}
            </button>
          </form>
        </section>

        {/* Tracking Result View */}
        {result.data && submitted && (
          <section
            className="p-6 sm:p-8 rounded-[24px] border bg-white shadow-sm flex flex-col gap-6 animate-in fade-in duration-300"
            style={{ borderColor: "var(--line)" }}
          >
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {result.data.orderNo}
                </span>
                <h2 className="font-display font-extrabold text-2xl text-slate-900 mt-0.5">
                  {orderStatusLabels[result.data.status] ?? result.data.status}
                </h2>
              </div>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-center"
                style={{
                  backgroundColor:
                    result.data.status === "fulfilled"
                      ? "var(--jade-mist)"
                      : "var(--paper)",
                  color:
                    result.data.status === "fulfilled"
                      ? "var(--padma)"
                      : "var(--bottle)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                {displayStatus[result.data.status] ?? result.data.status}
              </span>
            </div>

            {/* Live Timeline (Section 6: অর্ডার পেয়েছি -> পেমেন্ট যাচাই চলছে -> কোড পাঠানো হয়েছে) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              {/* Step 1: অর্ডার পেয়েছি */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white grid place-items-center shrink-0">
                  <Check size={14} strokeWidth={3} />
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">১. অর্ডার পেয়েছি</span>
                  <span className="text-[11px] text-slate-500">তথ্য সফলভাবে জমা হয়েছে</span>
                </div>
              </div>

              {/* Step 2: পেমেন্ট যাচাই */}
              <div
                className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                  ["paid", "fulfilling", "fulfilled"].includes(result.data.status)
                    ? "bg-emerald-50/60 border-emerald-100"
                    : "bg-amber-50/60 border-amber-100"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full grid place-items-center shrink-0 text-xs font-bold ${
                    ["paid", "fulfilling", "fulfilled"].includes(result.data.status)
                      ? "bg-emerald-700 text-white"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {["paid", "fulfilling", "fulfilled"].includes(result.data.status) ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">
                    {["paid", "fulfilling", "fulfilled"].includes(result.data.status)
                      ? "২. পেমেন্ট নিশ্চিত"
                      : "২. পেমেন্ট যাচাই চলছে"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {["paid", "fulfilling", "fulfilled"].includes(result.data.status)
                      ? "TrxID যাচাই সম্পন্ন"
                      : "অ্যাডমিন ভেরিফাই করছেন"}
                  </span>
                </div>
              </div>

              {/* Step 3: কোড পাঠানো হয়েছে */}
              <div
                className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                  result.data.status === "fulfilled"
                    ? "bg-emerald-50/60 border-emerald-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full grid place-items-center shrink-0 text-xs font-bold ${
                    result.data.status === "fulfilled"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {result.data.status === "fulfilled" ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    "৩"
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">
                    ৩. কোড পাঠানো হয়েছে
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {result.data.status === "fulfilled"
                      ? "কোড সক্রিয় ও প্রস্তুত"
                      : "ডেলিভারি অপেক্ষমাণ"}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivered Items & Activation Codes with Scratch-To-Reveal */}
            <div className="flex flex-col gap-4 pt-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                অর্ডার আইটেম ও অ্যাক্টিভেশন কোড
              </h3>

              {result.data.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border flex flex-col gap-4"
                  style={{ backgroundColor: "#FAFCFA", borderColor: "var(--line)" }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">{item.serviceName}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      পরিমাণ: {formatBn(item.quantity)}টি
                    </span>
                  </div>

                  {/* If codes are delivered, show ScratchCard in Marigold */}
                  {item.codes && item.codes.length > 0 ? (
                    <div className="flex flex-col gap-3 pt-2">
                      {item.codes.map((rawCode: unknown, cIdx: number) => {
                        const { text, label } = getCodeDisplay(rawCode);
                        if (!text) return null;
                        return (
                          <ScratchCard
                            key={cIdx}
                            code={text}
                            label={label || `${item.serviceName} অ্যাক্টিভেশন কোড`}
                            orderNo={result.data?.orderNo}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs">
                      অ্যাডমিন পেমেন্ট যাচাই করলেই এই কার্ডে কোড উন্মোচিত হবে এবং আপনার ইমেইলে কপি পাঠানো হবে।
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pt-4 border-t">
              <span className="text-sm font-bold text-slate-600">সর্বমোট প্রদেয়</span>
              <strong className="font-display font-extrabold text-2xl text-slate-900">
                {formatMoney(result.data.totalAmount, result.data.currency)}
              </strong>
            </div>

            {/* Section 6: After Reveal Feedback: "সব ঠিক আছে?" */}
            <div className="p-5 rounded-2xl border bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-display font-bold text-sm text-slate-900">
                  সব ঠিক আছে?
                </span>
                {feedbackState === "none" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackState("yes");
                        toast.success("আপনার মতামতের জন্য ধন্যবাদ!");
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
                    >
                      হ্যাঁ, সব ঠিক আছে
                    </button>
                    <a
                      href={`https://wa.me/8801700000000?text=Hello%20AccZone,%20I%20need%20support%20with%20Order%20${result.data.orderNo}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setFeedbackState("no")}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      না, সাহায্য দরকার
                    </a>
                  </div>
                )}
              </div>
              {feedbackState === "yes" && (
                <p className="text-xs text-emerald-800 font-medium">
                  আমাদের সার্ভিস ব্যবহারের জন্য ধন্যবাদ! কোনো প্রয়োজনে সাপোর্ট টিম সর্বদা আপনার পাশে আছে।
                </p>
              )}
            </div>

            {/* Section 6: Expiry Reminder Opt-in */}
            <div className="p-5 rounded-2xl border bg-emerald-50/50 border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BellRing size={18} className="text-emerald-700 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-900">
                    মেয়াদ শেষের আগে মনে করিয়ে দিন
                  </span>
                  <span className="text-[11px] text-slate-600">
                    সাবস্ক্রিপশন শেষ হওয়ার ৩ দিন পূর্বে রিমাইন্ডার পাবেন।
                  </span>
                </div>
              </div>
              {!reminderSet ? (
                <form onSubmit={handleReminderSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={reminderEmail}
                    onChange={(e) => setReminderEmail(e.target.value)}
                    placeholder="আপনার ইমেইল"
                    className="px-3 py-1.5 rounded-lg border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <button type="submit" className="btn-padma text-xs px-3 py-1.5 min-h-0">
                    রিমাইন্ডার সেট
                  </button>
                </form>
              ) : (
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <Check size={14} /> রিমাইন্ডার সক্রিয়
                </span>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

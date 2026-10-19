import React, { FormEvent, useMemo, useState } from "react";
import StoreHeader from "@/components/StoreHeader";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatBn } from "@/lib/shop";
import { BkashIcon, NagadIcon } from "@/components/BrandLogos";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ShieldCheck,
  Minus,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Checkout() {
  const { items, setQuantity, remove, clear } = useCart();
  const [, navigate] = useLocation();
  const catalogQuery = trpc.shop.catalog.list.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const catalog = catalogQuery.data ?? [];
  const { data: store } = trpc.shop.catalog.storeInfo.useQuery();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "bank">("bkash");
  const [paymentReference, setPaymentReference] = useState("");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [formError, setFormError] = useState("");
  const [idempotencyKey] = useState(() => window.crypto.randomUUID());

  const products = useMemo(() => {
    return items.flatMap((line) => {
      const product = catalog.find((p) => p.serviceKey === line.serviceKey);
      return product ? [{ product, quantity: line.quantity }] : [];
    });
  }, [items, catalog]);

  const total = products.reduce(
    (sum, line) => sum + line.product.retailPrice * line.quantity,
    0
  );

  const createOrder = trpc.shop.checkout.create.useMutation({
    onSuccess: (result) => {
      clear();
      toast.success("অর্ডার সফলভাবে জমা হয়েছে!");
      navigate(`/track/${result.orderNo}`);
    },
    onError: (error) => {
      setFormError(
        error.message ||
          "অর্ডার জমা করা সম্ভব হয়নি। ট্রানজেকশন আইডি যাচাই করে আবার চেষ্টা করুন।"
      );
    },
  });

  const configuredMethods = store?.paymentMethods ?? [];
  const activeMethodConfig =
    configuredMethods.find((m) => m.id === paymentMethod) ||
    configuredMethods[0] || {
      id: "bkash",
      label: "bKash Personal",
      account: "01700000000",
      instruction: "Send Money করুন",
    };

  const handleCopy = (text: string, isAccount = true) => {
    navigator.clipboard.writeText(text);
    if (isAccount) {
      setCopiedAccount(text);
      setTimeout(() => setCopiedAccount(null), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
    toast.success("কপি করা হয়েছে!");
  };

  const validateStep1 = () => {
    setFormError("");
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFormError("সঠিক ইমেইল ঠিকানা দিন (যেমন: name@gmail.com)");
      return false;
    }
    const ph = phone.trim();
    if (ph && ph.length < 7) {
      setFormError("সঠিক মোবাইল/WhatsApp নম্বর দিন");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setFormError("");
    const cleanTrx = paymentReference.trim();
    if (!cleanTrx || cleanTrx.length < 6) {
      setFormError("TrxID মিলছে না। কনফার্মেশন মেসেজ থেকে কপি করে আবার বসান।");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const submitOrder = () => {
    if (!validateStep1() || !validateStep2()) return;
    const finalName = name.trim() || email.split("@")[0] || "AccZone Customer";
    const finalPhone = phone.trim() || "01700000000";

    createOrder.mutate({
      idempotencyKey,
      customerName: finalName,
      customerEmail: email.trim(),
      customerPhone: finalPhone,
      paymentMethod,
      paymentReference: paymentReference.trim().toUpperCase(),
      items: products.map(({ product, quantity }) => ({
        serviceKey: product.serviceKey,
        quantity,
      })),
    });
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
          <span className="text-slate-800">চেকআউট</span>
        </div>

        {!items.length ? (
          <div
            className="p-10 text-center rounded-[24px] border bg-white max-w-md mx-auto shadow-sm flex flex-col items-center gap-4"
            style={{ borderColor: "var(--line)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl grid place-items-center"
              style={{ backgroundColor: "var(--jade-mist)", color: "var(--padma)" }}
            >
              <CreditCard size={28} />
            </div>
            <h2 className="font-display font-extrabold text-xl text-slate-900">
              কার্ট এখনো খালি
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              প্রথমে ক্যাটালগ থেকে আপনার পছন্দের সার্ভিসটি বেছে নিন।
            </p>
            <Link href="/#services" className="btn-padma text-xs px-6 py-2.5">
              ক্যাটালগ দেখুন
            </Link>
          </div>
        ) : (
          <div
            className="rounded-[28px] border bg-white overflow-hidden shadow-sm"
            style={{ borderColor: "var(--line)", boxShadow: "var(--sh-rest)" }}
          >
            {/* 3 Step Top Bar */}
            <div
              className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
            >
              <div>
                <h1 className="font-display font-extrabold text-2xl text-slate-900 leading-tight">
                  অর্ডার সম্পন্ন করুন
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  ৩টি সহজ ধাপে পেমেন্ট সম্পন্ন করুন এবং অ্যাক্টিভেশন নিশ্চিত করুন
                </p>
              </div>

              {/* Step Badges */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                    step === 1
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span>১</span>
                  <span>তথ্য</span>
                </span>
                <span className="w-3 h-0.5 bg-slate-200" />
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                    step === 2
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span>২</span>
                  <span>পেমেন্ট</span>
                </span>
                <span className="w-3 h-0.5 bg-slate-200" />
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                    step === 3
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span>৩</span>
                  <span>নিশ্চিত</span>
                </span>
              </div>
            </div>

            {/* Error notice */}
            {formError && (
              <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Main Step Content */}
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              {/* STEP 1: তথ্য */}
              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      আপনার ইমেইল ঠিকানা <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white text-sm text-slate-900 outline-none"
                      style={{ borderColor: "var(--line)" }}
                    />
                    <span className="text-[11px] text-slate-500">
                      পেমেন্ট যাচাইয়ের পর এই ইমেইলে অ্যাক্টিভেশন ক্রেডেনশিয়াল ও কোড পাঠানো হবে।
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      WhatsApp / মোবাইল নম্বর (ঐচ্ছিক)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white text-sm text-slate-900 outline-none"
                      style={{ borderColor: "var(--line)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      আপনার নাম (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="আপনার নাম লিখুন"
                      className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white text-sm text-slate-900 outline-none"
                      style={{ borderColor: "var(--line)" }}
                    />
                  </div>

                  {/* Items list with quantity control */}
                  <div className="p-4 rounded-2xl border flex flex-col gap-3 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-800">আপনার কার্ট আইটেম</span>
                    {products.map(({ product, quantity }) => (
                      <div
                        key={product.serviceKey}
                        className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
                      >
                        <div className="flex flex-col min-w-0">
                          <b className="text-xs text-slate-900">{product.name}</b>
                          <span className="text-[11px] text-slate-500">
                            {formatMoney(product.retailPrice)} প্রতি পিস
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border rounded-lg bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setQuantity(product.serviceKey, Math.max(1, quantity - 1), 10)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-2.5 text-xs font-bold">{formatBn(quantity)}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(product.serviceKey, quantity + 1, 10)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <b className="text-xs font-bold text-slate-900 w-16 text-right">
                            {formatMoney(product.retailPrice * quantity)}
                          </b>
                          <button
                            type="button"
                            onClick={() => remove(product.serviceKey)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between items-baseline pt-2">
                      <span className="text-sm font-bold text-slate-800">মোট প্রদেয়</span>
                      <strong className="font-display font-extrabold text-xl text-emerald-800">
                        {formatMoney(total)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: পেমেন্ট */}
              {step === 2 && (
                <div className="flex flex-col gap-6">
                  {/* Tabs */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bkash")}
                      className={`flex-1 p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all ${
                        paymentMethod === "bkash"
                          ? "border-pink-500 bg-pink-50/50 text-pink-700 shadow-xs ring-2 ring-pink-500/20"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <BkashIcon size={20} className="text-[#E2136E]" />
                      <span>bKash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("nagad")}
                      className={`flex-1 p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all ${
                        paymentMethod === "nagad"
                          ? "border-orange-500 bg-orange-50/50 text-orange-700 shadow-xs ring-2 ring-orange-500/20"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <NagadIcon size={20} className="text-[#F6921E]" />
                      <span>Nagad</span>
                    </button>
                  </div>

                  {/* Payment Details Box with Brand Color Header */}
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{
                      borderColor: paymentMethod === "bkash" ? "#E2136E33" : "#F6921E33",
                    }}
                  >
                    <div
                      className="px-4 py-2.5 text-white text-xs font-bold flex items-center justify-between"
                      style={{
                        backgroundColor:
                          paymentMethod === "bkash" ? "var(--bkash)" : "var(--nagad)",
                      }}
                    >
                      <span>
                        {paymentMethod === "bkash"
                          ? "bKash Send Money নির্দেশনা"
                          : "Nagad Send Money নির্দেশনা"}
                      </span>
                      <span className="text-[11px] opacity-90">ম্যানুয়াল পেমেন্ট</span>
                    </div>

                    <div className="p-5 bg-white flex flex-col gap-4">
                      {/* Receiving Number */}
                      <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] text-slate-500 font-medium">প্রাপক নম্বর</span>
                          <b className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                            {activeMethodConfig.account}
                          </b>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeMethodConfig.account, true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-700"
                        >
                          {copiedAccount === activeMethodConfig.account ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                          <span>
                            {copiedAccount === activeMethodConfig.account
                              ? "কপি হয়েছে"
                              : "নম্বর কপি"}
                          </span>
                        </button>
                      </div>

                      {/* Exact Amount */}
                      <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] text-slate-500 font-medium">পাঠাতে হবে (সঠিক পরিমাণ)</span>
                          <b className="font-display text-lg font-extrabold text-emerald-800">
                            {formatMoney(total)}
                          </b>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(Math.round(total)), false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-700"
                        >
                          {copiedAmount ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                          <span>{copiedAmount ? "কপি হয়েছে" : "টাকা কপি"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TrxID Input Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      ট্রানজেকশন আইডি (TrxID) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentReference}
                      onChange={(e) =>
                        setPaymentReference(e.target.value.toUpperCase().replace(/\s+/g, ""))
                      }
                      placeholder="যেমন: BL9X8M7Q2"
                      className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white text-base font-mono font-bold text-slate-900 tracking-wider outline-none uppercase"
                      style={{ borderColor: "var(--line)" }}
                    />
                    <span className="text-[11px] text-slate-500">
                      টাকা পাঠানোর পর প্রাপ্ত মেসেজ থেকে TrxID কপি করে এখানে বসান।
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3: নিশ্চিত */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div
                    className="p-5 rounded-2xl border flex flex-col gap-3.5"
                    style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
                  >
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-xs font-bold text-slate-700">ডেলিভারি ইমেইল</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{email}</span>
                    </div>
                    {phone && (
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-xs font-bold text-slate-700">WhatsApp / ফোন</span>
                        <span className="text-xs font-mono font-bold text-slate-900">{phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-xs font-bold text-slate-700">পেমেন্ট মেথড</span>
                      <span className="text-xs font-bold text-slate-900 uppercase">
                        {paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-xs font-bold text-slate-700">TrxID</span>
                      <span className="text-xs font-mono font-bold text-emerald-800 tracking-wider">
                        {paymentReference}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-sm font-bold text-slate-800">মোট প্রদেয়</span>
                      <strong className="font-display font-extrabold text-2xl text-slate-900">
                        {formatMoney(total)}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                    <span>
                      অর্ডার কনফার্ম করার পর অ্যাডমিন পেমেন্ট যাচাই করে অবিলম্বে কোড উন্মোচন করবেন।
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div
              className="p-6 border-t flex items-center justify-between gap-3"
              style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                  className="btn-secondary-mist text-xs sm:text-sm px-5"
                  disabled={createOrder.isPending}
                >
                  <ArrowLeft size={16} />
                  <span>পেছনে</span>
                </button>
              ) : (
                <Link href="/#services" className="btn-secondary-mist text-xs sm:text-sm px-5">
                  <ArrowLeft size={16} />
                  <span>ক্যাটালগে ফিরুন</span>
                </Link>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-padma text-xs sm:text-sm px-8 shadow-xs"
                >
                  পরবর্তী ধাপ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={createOrder.isPending}
                  className="btn-padma text-xs sm:text-sm px-8 shadow-xs"
                >
                  {createOrder.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      কনফার্ম হচ্ছে…
                    </span>
                  ) : (
                    "অর্ডার কনফার্ম করুন"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

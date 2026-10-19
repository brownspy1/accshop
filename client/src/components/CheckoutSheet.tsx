import React, { useState, useId } from "react";
import { formatMoney, formatBn } from "@/lib/shop";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import {
  X,
  Check,
  Copy,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BkashIcon, NagadIcon } from "./BrandLogos";

export interface CheckoutLineItem {
  serviceKey: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  directItem?: CheckoutLineItem | null;
}

export default function CheckoutSheet({
  isOpen,
  onClose,
  directItem,
}: CheckoutSheetProps) {
  const [, setLocation] = useLocation();
  const { items: cartLines, clear: clearCart } = useCart();
  const catalogQuery = trpc.shop.catalog.list.useQuery();
  const storeInfoQuery = trpc.shop.catalog.storeInfo.useQuery();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [trxId, setTrxId] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [formError, setFormError] = useState("");
  const [idempotencyKey] = useState(() => window.crypto.randomUUID());

  // Determine line items
  const catalog = catalogQuery.data ?? [];
  const checkoutItems: CheckoutLineItem[] = React.useMemo(() => {
    if (directItem) return [directItem];
    return cartLines.flatMap((line) => {
      const found = catalog.find((p) => p.serviceKey === line.serviceKey);
      if (!found) return [];
      return [
        {
          serviceKey: found.serviceKey,
          name: found.name,
          price: found.retailPrice,
          quantity: line.quantity,
          imageUrl: found.imageUrl,
        },
      ];
    });
  }, [directItem, cartLines, catalog]);

  const totalAmount = checkoutItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Store payment methods
  const paymentMethods = storeInfoQuery.data?.paymentMethods ?? [];
  const activeMethodConfig =
    paymentMethods.find((m) => m.id === paymentMethod) ||
    paymentMethods.find((m) => m.id === "bkash") || {
      id: "bkash",
      label: "bKash Personal",
      account: "01700000000",
      instruction: "Send Money করুন",
    };

  const createOrder = trpc.shop.checkout.create.useMutation({
    onSuccess: (data) => {
      if (!directItem) clearCart();
      toast.success("অর্ডার সফলভাবে জমা হয়েছে!");
      onClose();
      setLocation(`/track/${data.orderNo}`);
    },
    onError: (err) => {
      setFormError(
        err.message ||
          "অর্ডার জমা করা সম্ভব হয়নি। ট্রানজেকশন আইডি যাচাই করে আবার চেষ্টা করুন।"
      );
    },
  });

  if (!isOpen) return null;

  const handleCopy = (text: string, isAccount = true) => {
    navigator.clipboard.writeText(text);
    if (isAccount) {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
    toast.success("কপি করা হয়েছে!");
  };

  const validateStep1 = () => {
    setFormError("");
    const email = customerEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("সঠিক ইমেইল ঠিকানা প্রদান করুন (যেমন: example@gmail.com)");
      return false;
    }
    const phone = customerPhone.trim();
    if (phone && phone.length < 7) {
      setFormError("সঠিক মোবাইল/WhatsApp নম্বর দিন");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setFormError("");
    const cleanTrx = trxId.trim();
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

  const handleConfirmOrder = () => {
    if (!validateStep1() || !validateStep2()) return;
    const finalName =
      customerName.trim() ||
      customerEmail.split("@")[0] ||
      "AccZone Customer";
    const finalPhone = customerPhone.trim() || "01700000000";

    createOrder.mutate({
      idempotencyKey,
      customerName: finalName,
      customerEmail: customerEmail.trim(),
      customerPhone: finalPhone,
      paymentMethod,
      paymentReference: trxId.trim().toUpperCase(),
      items: checkoutItems.map((item) => ({
        serviceKey: item.serviceKey,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center sm:items-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh] overflow-hidden mt-auto sm:mt-0 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "var(--sh-sheet)" }}
      >
        {/* Header with Step Indicator */}
        <div
          className="p-5 sm:p-6 border-b shrink-0 flex items-center justify-between"
          style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
        >
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 leading-tight">
              সহজ চেকআউট
            </h2>
            <div className="flex items-center gap-3 text-xs font-semibold mt-2">
              <span
                className={`flex items-center gap-1.5 ${
                  step === 1 ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center text-xs font-bold ${
                    step >= 1 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  ১
                </span>
                তথ্য
              </span>
              <span className="w-3 h-0.5 bg-slate-200" />
              <span
                className={`flex items-center gap-1.5 ${
                  step === 2 ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center text-xs font-bold ${
                    step >= 2 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  ২
                </span>
                পেমেন্ট
              </span>
              <span className="w-3 h-0.5 bg-slate-200" />
              <span
                className={`flex items-center gap-1.5 ${
                  step === 3 ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center text-xs font-bold ${
                    step === 3 ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  ৩
                </span>
                নিশ্চিত
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 grid place-items-center transition-colors"
            aria-label="বন্ধ করুন"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: তথ্য (Email & Phone) */}
          {step === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-800">
                  আপনার ইমেইল ঠিকানা <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 focus:bg-white text-sm text-slate-900 outline-none transition-all"
                  style={{ borderColor: "var(--line)" }}
                />
                <span className="text-[11px] text-slate-500">
                  পেমেন্ট যাচাইয়ের পর অ্যাক্টিভেশন কোড বা ইনভাইটেশন এই ইমেইলে পাঠানো হবে।
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-800">
                  WhatsApp / মোবাইল নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 focus:bg-white text-sm text-slate-900 outline-none transition-all"
                  style={{ borderColor: "var(--line)" }}
                />
                <span className="text-[11px] text-slate-500">
                  জরুরি সাপোর্ট বা অর্ডার স্ট্যাটাস আপডেটের জন্য ব্যবহৃত হবে।
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-800">
                  আপনার নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="যেমন: তানভীর আহমেদ"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 focus:bg-white text-sm text-slate-900 outline-none transition-all"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Items summary */}
              <div
                className="p-3.5 rounded-2xl border flex flex-col gap-2 mt-2"
                style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
              >
                <span className="text-xs font-bold text-slate-700">নির্বাচিত আইটেম</span>
                {checkoutItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-800">
                    <span>
                      {item.name} × {formatBn(item.quantity)}
                    </span>
                    <b className="font-extrabold">{formatMoney(item.price * item.quantity)}</b>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>মোট প্রদেয়</span>
                  <span className="font-display font-extrabold text-lg text-emerald-800">
                    {formatMoney(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: পেমেন্ট (bKash / Nagad) */}
          {step === 2 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Payment Method Selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bkash")}
                  className={`flex-1 p-3 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all ${
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
                  className={`flex-1 p-3 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all ${
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
                    backgroundColor: paymentMethod === "bkash" ? "var(--bkash)" : "var(--nagad)",
                  }}
                >
                  <span>{paymentMethod === "bkash" ? "bKash Send Money" : "Nagad Send Money"}</span>
                  <span className="text-[11px] opacity-90">ম্যানুয়াল পেমেন্ট</span>
                </div>

                <div className="p-4 bg-white flex flex-col gap-3.5">
                  {/* Account Number with 1-tap Copy */}
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
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
                      {copiedAccount ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedAccount ? "কপি হয়েছে" : "কপি করুন"}</span>
                    </button>
                  </div>

                  {/* Exact Amount with 1-tap Copy */}
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-slate-500 font-medium">পাঠাতে হবে (সঠিক পরিমাণ)</span>
                      <b className="font-display text-lg font-extrabold text-emerald-800">
                        {formatMoney(totalAmount)}
                      </b>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(Math.round(totalAmount)), false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-700"
                    >
                      {copiedAmount ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedAmount ? "কপি হয়েছে" : "টাকা কপি"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TrxID Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  ট্রানজেকশন আইডি (TrxID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="যেমন: BL9X8M7Q2"
                  className="w-full px-3.5 py-3 rounded-xl border bg-slate-50 focus:bg-white text-base font-mono font-bold text-slate-900 tracking-wider outline-none uppercase transition-all"
                  style={{ borderColor: "var(--line)" }}
                />
                <span className="text-[11px] text-slate-500">
                  টাকা পাঠানোর পর প্রাপ্ত মেসেজ থেকে TrxID কপি করে এখানে বসান।
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: নিশ্চিত (Summary & Submit) */}
          {step === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div
                className="p-4 rounded-2xl border flex flex-col gap-3"
                style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
              >
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-xs font-bold text-slate-700">ডেলিভারি ইমেইল</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{customerEmail}</span>
                </div>
                {customerPhone && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-xs font-bold text-slate-700">WhatsApp / ফোন</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-xs font-bold text-slate-700">পেমেন্ট মেথড</span>
                  <span className="text-xs font-bold text-slate-900 uppercase">{paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-xs font-bold text-slate-700">TrxID</span>
                  <span className="text-xs font-mono font-bold text-emerald-800 tracking-wider">
                    {trxId}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-bold text-slate-800">মোট টাকা</span>
                  <strong className="font-display font-extrabold text-2xl text-slate-900">
                    {formatMoney(totalAmount)}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                <span>অর্ডার কনফার্ম করার পরেই অ্যাডমিন পেমেন্ট যাচাই করে কোড পাঠাবেন।</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div
          className="p-4 sm:p-5 border-t flex items-center justify-between gap-3 shrink-0"
          style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="btn-secondary-mist text-xs sm:text-sm px-4"
              disabled={createOrder.isPending}
            >
              <ArrowLeft size={16} />
              <span>পেছনে</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-mist text-xs sm:text-sm px-4"
            >
              বাতিল
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-padma flex-1 sm:flex-initial px-7 text-xs sm:text-sm shadow-xs"
            >
              পরবর্তী ধাপ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={createOrder.isPending}
              className="btn-padma flex-1 sm:flex-initial px-7 text-xs sm:text-sm shadow-xs"
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
    </div>
  );
}

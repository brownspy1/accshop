import React, { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

export default function LiveOrderTicket({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Sequential tick animations
    const t1 = setTimeout(() => setStep(1), 350);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className={`relative flex justify-center items-center select-none ${compact ? "w-full max-w-sm my-3" : "w-72 sm:w-80"}`}>
      {/* Decorative rotated background tickets */}
      {!compact && (
        <>
          <div
            className="absolute inset-0 bg-white/70 border rounded-2xl transform -rotate-6 scale-95 shadow-sm pointer-events-none"
            style={{ borderColor: "var(--line)" }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-white/85 border rounded-2xl transform rotate-3 scale-98 shadow-sm pointer-events-none"
            style={{ borderColor: "var(--line)" }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Main active printed ticket */}
      <div
        className={`relative w-full bg-white border rounded-2xl shadow-md overflow-hidden ${
          !compact ? "ticket-print-anim" : ""
        }`}
        style={{
          borderColor: "var(--line)",
          boxShadow: "var(--sh-rest)",
        }}
      >
        {/* Ticket Header & slot imitation */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{
            backgroundColor: "var(--jade-mist)",
            borderColor: "var(--line)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block animate-pulse"
              style={{ backgroundColor: "var(--padma)" }}
            />
            <span className="font-display font-bold text-xs tracking-tight" style={{ color: "var(--bottle)" }}>
              লাইভ অর্ডার ডেলিভারি
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-white/70 px-2 py-0.5 rounded-full">
            রিয়েল-টাইম
          </span>
        </div>

        {/* 3 Steps Sequence */}
        <div className="p-4 flex flex-direction-column flex-col gap-3">
          {/* Step 1: Order received */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full grid place-items-center transition-all duration-300 ${
                step >= 1
                  ? "bg-emerald-600 text-white scale-100"
                  : "bg-slate-100 text-slate-400 scale-90"
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                ১. অর্ডার পেয়েছি
              </span>
              <span className="text-[11px] text-emerald-800/80">Gemini Pro • bKash পেমেন্ট</span>
            </div>
          </div>

          {/* Step 2: Payment verified */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full grid place-items-center transition-all duration-300 ${
                step >= 2
                  ? "bg-emerald-600 text-white scale-100"
                  : "bg-slate-100 text-slate-400 scale-90"
              }`}
            >
              {step >= 2 ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                ২. পেমেন্ট যাচাই সম্পন্ন
              </span>
              <span className="text-[11px] text-emerald-800/80">TrxID মিলেছে • প্রস্তুত হচ্ছে</span>
            </div>
          </div>

          {/* Step 3: Code sent */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full grid place-items-center transition-all duration-300 ${
                step >= 3
                  ? "bg-emerald-600 text-white scale-100"
                  : "bg-amber-100 text-amber-700 animate-spin"
              }`}
            >
              {step >= 3 ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <Loader2 size={12} strokeWidth={2.5} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                ৩. {step >= 3 ? "কোড পাঠানো হয়েছে" : "কোড পাঠানো হচ্ছে…"}
              </span>
              <span className="text-[11px] text-emerald-800/80">ইমেইলে ও স্ক্রিনে তাত্ক্ষণিক দৃশ্যমান</span>
            </div>
          </div>
        </div>

        {/* Perforated ticket stub edge */}
        <div className="relative flex items-center h-5 bg-white overflow-hidden border-t border-dashed" style={{ borderColor: "var(--line)" }}>
          <div
            className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border"
            style={{ backgroundColor: "var(--jade-mist)", borderColor: "var(--line)" }}
          />
          <div
            className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border"
            style={{ backgroundColor: "var(--jade-mist)", borderColor: "var(--line)" }}
          />
        </div>

        {/* Ticket bottom note */}
        <div
          className="px-4 py-2 text-center text-[11px] font-medium"
          style={{ backgroundColor: "var(--jade-mist)", color: "var(--bottle)" }}
        >
          গড় ডেলিভারি সময়: <b>৫-১৫ মিনিট</b>
        </div>
      </div>
    </div>
  );
}

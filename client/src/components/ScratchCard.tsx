import React, { useRef, useState, useEffect } from "react";
import { Check, Copy, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ScratchCardProps {
  code: string;
  label?: string;
  orderNo?: string;
}

export default function ScratchCard({ code, label = "অ্যাক্টিভেশন কোড", orderNo }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDrawing = useRef(false);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsRevealed(true);
    }
  }, []);

  // Initialize canvas with Marigold gold layer
  useEffect(() => {
    if (isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Draw Marigold (#FFC93C) card background
    ctx.fillStyle = "#FFC93C";
    ctx.fillRect(0, 0, width, height);

    // Decorative pattern
    ctx.fillStyle = "#EBB426";
    for (let x = 10; x < width; x += 24) {
      for (let y = 10; y < height; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Text instructions
    ctx.fillStyle = "#0F3D2E";
    ctx.font = "bold 14px 'Hind Siliguri', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ আঙুল দিয়ে ঘষুন", width / 2, height / 2);
  }, [isRevealed]);

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    // Check revealed pixels periodically
    checkRevealedPercentage(ctx, canvas.width, canvas.height);
  };

  const checkRevealedPercentage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let transparentPixels = 0;
      const totalPixels = data.length / 4;

      for (let i = 3; i < data.length; i += 16) {
        if (data[i] === 0) transparentPixels++;
      }

      const ratio = transparentPixels / (totalPixels / 4);
      if (ratio > 0.35) {
        setIsRevealed(true);
      }
    } catch {
      // ignore security restrictions if any
    }
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    scratch(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    scratch(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("কোড কপি করা হয়েছে!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
      {label && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{label}</span>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {isRevealed ? "প্রকাশিত" : "ঘষে উন্মোচন করুন"}
          </span>
        </div>
      )}

      {/* Scratch Container */}
      <div
        className="relative min-h-[96px] rounded-2xl border flex items-center justify-center p-4 overflow-hidden select-none"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "var(--line)",
          boxShadow: "var(--sh-rest)",
        }}
      >
        {/* Underlying code content */}
        <div className="flex flex-col items-center justify-center gap-1.5 w-full text-center z-0">
          <code className="font-mono font-black text-lg sm:text-xl text-slate-900 tracking-wider break-all select-all">
            {code}
          </code>
          {isRevealed && (
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <Check size={12} strokeWidth={3} /> অ্যাক্টিভেশন কোড প্রস্তুত
            </span>
          )}
        </div>

        {/* Scratch Canvas Overlay */}
        {!isRevealed && (
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="scratch-canvas"
            aria-label="কোড দেখতে আঙুল বা মাউস দিয়ে ঘষুন"
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2.5">
        {!isRevealed && (
          <button
            type="button"
            onClick={() => setIsRevealed(true)}
            className="btn-secondary-mist flex-1 text-xs font-bold"
          >
            <Eye size={15} />
            <span>কোড দেখান</span>
          </button>
        )}

        <button
          type="button"
          onClick={copyCode}
          className="btn-padma flex-1 text-xs font-bold shadow-xs"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? "কপি হয়েছে!" : "কোড কপি করুন"}</span>
        </button>
      </div>
    </div>
  );
}

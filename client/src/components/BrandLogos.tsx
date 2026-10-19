import React from "react";

interface BrandIconProps {
  className?: string;
  size?: number;
}

export function GeminiIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AdobeIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M15.1 2H24V22H15.1L12 15.6L8.9 22H0V2H8.9L12 8.4L15.1 2ZM12 11.2L9.8 6.7H4.3V18.1H7L12 7.8L17 18.1H19.7V6.7H14.2L12 11.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DuolingoIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 14C7.67 14 7 13.33 7 12.5C7 11.67 7.67 11 8.5 11C9.33 11 10 11.67 10 12.5C10 13.33 9.33 14 8.5 14ZM15.5 14C14.67 14 14 13.33 14 12.5C14 11.67 14.67 11 15.5 11C16.33 11 17 11.67 17 12.5C17 13.33 16.33 14 15.5 14ZM12 17C10.62 17 9.5 15.88 9.5 14.5H14.5C14.5 15.88 13.38 17 12 17Z" />
    </svg>
  );
}

export function PocketFmIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      <path d="M12 10v4" />
      <path d="M9 11v2" />
      <path d="M15 11v2" />
    </svg>
  );
}

export function BkashIcon({ className = "", size = 22 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.64 2L6.8 10.37L10.32 14.12L18.16 5.75L14.64 2ZM5.84 11.39L2 15.49L7.49 19.34L11.33 15.24L5.84 11.39ZM19.16 6.81L12.33 14.1L15.85 17.85L22.68 10.56L19.16 6.81ZM8.45 20.41L12.29 22L16.81 18.89L12.97 17.3L8.45 20.41Z" />
    </svg>
  );
}

export function NagadIcon({ className = "", size = 22 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.8 17.2L10.2 13.6V17.2H8.2V6.8H10.2V10.4L13.8 6.8H16.4L12.5 10.7L16.4 17.2H13.8Z" />
    </svg>
  );
}

export function BrandLogoSquircle({
  brand,
  className = "",
  size = 56,
}: {
  brand: string;
  className?: string;
  size?: number;
}) {
  const b = brand.toLowerCase();
  let bg = "#EAF5EF";
  let fg = "#0B7A4B";

  if (b.includes("gemini")) {
    bg = "#E9EEFA";
    fg = "#1A73E8";
  } else if (b.includes("adobe")) {
    bg = "#FDE8E8";
    fg = "#EB1000";
  } else if (b.includes("duolingo")) {
    bg = "#E6F8DA";
    fg = "#58CC02";
  } else if (b.includes("pocket")) {
    bg = "#FEECE2";
    fg = "#E65100";
  } else if (b.includes("chatgpt") || b.includes("gpt")) {
    bg = "#E4F4EA";
    fg = "#10A37F";
  } else if (b.includes("spotify")) {
    bg = "#E5F7E8";
    fg = "#1DB954";
  } else if (b.includes("netflix")) {
    bg = "#FDE8E8";
    fg = "#E50914";
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        borderRadius: "18px",
      }}
      className={`inline-grid place-items-center flex-shrink-0 transition-transform ${className}`}
      aria-hidden="true"
    >
      {b.includes("gemini") && <GeminiIcon size={Math.round(size * 0.52)} />}
      {b.includes("adobe") && <AdobeIcon size={Math.round(size * 0.5)} />}
      {b.includes("duolingo") && <DuolingoIcon size={Math.round(size * 0.52)} />}
      {b.includes("pocket") && <PocketFmIcon size={Math.round(size * 0.5)} />}
      {!b.includes("gemini") && !b.includes("adobe") && !b.includes("duolingo") && !b.includes("pocket") && (
        <span className="font-extrabold text-base tracking-tight uppercase">
          {brand.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

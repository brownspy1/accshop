import React, { useState, useMemo } from "react";
import { Search, X, Check, Sparkles } from "lucide-react";

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

export function ChatGptIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9 6.07 6.07 0 0 0-4.27 2.17 5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.2 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.08zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.59a4.5 4.5 0 0 1-4.49 4.49zM3.6 16.9a4.47 4.47 0 0 1-.53-3.02l.14.09 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 18.55a4.5 4.5 0 0 1-6.14-1.66zm-1.12-9.53a4.46 4.46 0 0 1 2.34-1.97v5.44a.79.79 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0L4.1 13.24a4.5 4.5 0 0 1-1.62-5.87zm16.65 4.28l-5.84-3.37V5.95a.08.08 0 0 1 .03-.06l4.85-2.8a4.5 4.5 0 0 1 6.67 4.67l-.14-.08-4.78-2.76a.77.77 0 0 0-.79 0zm2.01-3.02V3.05a4.5 4.5 0 0 1 1.62 5.87 4.47 4.47 0 0 1-2.34 1.97V5.42a.79.79 0 0 0-.39-.68l-5.81-3.35 2.02-1.17a.08.08 0 0 1 .07 0l4.83 2.79zM10.74 13.5l-2.6-1.5 2.6-1.5 2.61 1.5-2.61 1.5z" />
    </svg>
  );
}

export function SpotifyIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.42c-.18.3-.56.39-.86.21-2.35-1.44-5.3-1.76-8.79-.96-.34.08-.67-.13-.75-.47-.08-.34.13-.67.47-.75 3.81-.87 7.08-.51 9.71 1.11.3.18.39.56.22.86zm1.22-2.72c-.22.37-.71.48-1.07.25-2.69-1.65-6.79-2.13-9.97-1.16-.41.13-.85-.11-.98-.52-.13-.41.11-.85.52-.98 3.63-1.1 8.15-.57 11.24 1.33.37.23.48.71.26 1.08zm.11-2.84C14.69 8.95 9.38 8.78 6.3 9.71c-.49.15-1.02-.13-1.17-.62-.15-.5.13-1.02.62-1.17 3.53-1.07 9.4-.87 13.12 1.34.45.26.59.84.33 1.29-.26.44-.84.59-1.28.31z" />
    </svg>
  );
}

export function NetflixIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M5.4 0v24c1.2-.27 2.4-.5 3.63-.7V0H5.4zm9.57 0v19.47c1.23.15 2.44.35 3.63.59V0h-3.63zM9.03 0l5.94 19.47V0h3.63L12.66 24H9.03V4.53L9.03 0z" />
    </svg>
  );
}

export function YouTubeIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14c.5-1.88.5-5.81.5-5.81s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
    </svg>
  );
}

export function CanvaIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2zm1.2 14.8a4.8 4.8 0 1 1 3.4-8.2l-1.4 1.4a2.8 2.8 0 1 0 0 4l1.4 1.4a4.77 4.77 0 0 1-3.4 1.4z" />
    </svg>
  );
}

export function TelegramIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
    </svg>
  );
}

export function PrimeVideoIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M2.5 14.5c4.5 3 11.5 4 17 0 .5-.3 1.2.2.8.7-4.8 4.2-12.8 4.2-18.6 0-.5-.4-.1-1 .8-.7zM19.7 13.9c-.3-.4-1.8-.2-2.5-.1-.2 0-.3-.2-.1-.4 1.1-1 3.2-.8 3.5-.4.3.4-.2 2.5-1.3 3.4-.2.1-.4 0-.3-.2.3-.6.9-1.9.7-2.3z" />
    </svg>
  );
}

export function AppleIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.6-.74 1.01-1.77.9-2.8-.88.04-1.95.59-2.58 1.33-.56.65-.99 1.7-1.02 2.73.99.08 2-.52 2.7-1.26z" />
    </svg>
  );
}

export function DiscordIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.37-.44.86-.6 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.12c.13-.1.25-.2.37-.3a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08.01c.12.1.24.2.37.3a.08.08 0 0 1-.01.12 12.3 12.3 0 0 1-1.87.9.08.08 0 0 0-.04.1c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .04-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.98 0c-1.19 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.21 0 2.17 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z" />
    </svg>
  );
}

export function NordVpnIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M12 2L2 19.5h20L12 2zm0 4.8l6.1 10.7H5.9L12 6.8zM12 10.5l-3 5.2h6l-3-5.2z" />
    </svg>
  );
}

export function OfficeIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <path d="M11.4 3H3v8.4h8.4V3zm9.6 0h-8.4v8.4H21V3zM11.4 12.6H3V21h8.4v-8.4zm9.6 0h-8.4V21H21v-8.4z" />
    </svg>
  );
}

export function KeyIcon({ className = "", size = 28 }: BrandIconProps) {
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
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
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

export interface BrandIconPreset {
  id: string;
  label: string;
  brand: string;
  category?: string;
}

export const BRAND_ICON_PRESETS: BrandIconPreset[] = [
  // AI & Dev
  { id: "brand:gemini", label: "Google Gemini", brand: "gemini", category: "AI & Dev" },
  { id: "brand:chatgpt", label: "ChatGPT / OpenAI", brand: "chatgpt", category: "AI & Dev" },
  { id: "brand:claude", label: "Claude AI", brand: "claude", category: "AI & Dev" },
  { id: "brand:midjourney", label: "Midjourney AI", brand: "midjourney", category: "AI & Dev" },
  { id: "brand:cursor", label: "Cursor AI IDE", brand: "cursor", category: "AI & Dev" },
  { id: "brand:copilot", label: "GitHub Copilot", brand: "copilot", category: "AI & Dev" },
  { id: "brand:perplexity", label: "Perplexity Pro", brand: "perplexity", category: "AI & Dev" },

  // Streaming & Video
  { id: "brand:netflix", label: "Netflix UHD", brand: "netflix", category: "Streaming" },
  { id: "brand:youtube", label: "YouTube Premium", brand: "youtube", category: "Streaming" },
  { id: "brand:prime", label: "Amazon Prime Video", brand: "prime", category: "Streaming" },
  { id: "brand:disney", label: "Disney+ Hotstar", brand: "disney", category: "Streaming" },
  { id: "brand:crunchyroll", label: "Crunchyroll Anime", brand: "crunchyroll", category: "Streaming" },
  { id: "brand:hoichoi", label: "Hoichoi TV", brand: "hoichoi", category: "Streaming" },
  { id: "brand:chorki", label: "Chorki", brand: "chorki", category: "Streaming" },

  // Audio & Music
  { id: "brand:spotify", label: "Spotify Premium", brand: "spotify", category: "Audio" },
  { id: "brand:pocket", label: "Pocket FM VIP", brand: "pocket", category: "Audio" },
  { id: "brand:apple", label: "Apple Music / One", brand: "apple", category: "Audio" },
  { id: "brand:tidal", label: "Tidal HiFi", brand: "tidal", category: "Audio" },

  // Design & Creative
  { id: "brand:adobe", label: "Adobe Express / CC", brand: "adobe", category: "Design" },
  { id: "brand:canva", label: "Canva Pro", brand: "canva", category: "Design" },
  { id: "brand:figma", label: "Figma Professional", brand: "figma", category: "Design" },
  { id: "brand:freepik", label: "Freepik Premium", brand: "freepik", category: "Design" },
  { id: "brand:envato", label: "Envato Elements", brand: "envato", category: "Design" },

  // Security & VPN
  { id: "brand:nordvpn", label: "NordVPN", brand: "nordvpn", category: "VPN & Security" },
  { id: "brand:surfshark", label: "Surfshark VPN", brand: "surfshark", category: "VPN & Security" },
  { id: "brand:expressvpn", label: "ExpressVPN", brand: "expressvpn", category: "VPN & Security" },
  { id: "brand:proton", label: "Proton Unlimited", brand: "proton", category: "VPN & Security" },

  // Productivity & Office
  { id: "brand:office", label: "Microsoft 365", brand: "office", category: "Productivity" },
  { id: "brand:windows", label: "Windows 11 Pro", brand: "windows", category: "Productivity" },
  { id: "brand:googleone", label: "Google One 2TB", brand: "googleone", category: "Productivity" },
  { id: "brand:notion", label: "Notion Plus & AI", brand: "notion", category: "Productivity" },
  { id: "brand:telegram", label: "Telegram Premium", brand: "telegram", category: "Productivity" },
  { id: "brand:discord", label: "Discord Nitro", brand: "discord", category: "Productivity" },
  { id: "brand:grammarly", label: "Grammarly Premium", brand: "grammarly", category: "Productivity" },
  { id: "brand:tradingview", label: "TradingView Pro", brand: "tradingview", category: "Productivity" },

  // Learning & Education
  { id: "brand:duolingo", label: "Duolingo Super", brand: "duolingo", category: "Learning" },
  { id: "brand:coursera", label: "Coursera Plus", brand: "coursera", category: "Learning" },
  { id: "brand:udemy", label: "Udemy Business", brand: "udemy", category: "Learning" },

  // Gaming
  { id: "brand:steam", label: "Steam Wallet", brand: "steam", category: "Gaming" },
  { id: "brand:playstation", label: "PlayStation Plus", brand: "playstation", category: "Gaming" },
  { id: "brand:xbox", label: "Xbox Game Pass", brand: "xbox", category: "Gaming" },
  { id: "brand:roblox", label: "Roblox Robux", brand: "roblox", category: "Gaming" },

  // General & Badges
  { id: "brand:star", label: "Featured Star", brand: "star", category: "General" },
  { id: "brand:diamond", label: "VIP Diamond", brand: "diamond", category: "General" },
  { id: "brand:shield", label: "Verified Shield", brand: "shield", category: "General" },
  { id: "brand:key", label: "Activation Key (Default)", brand: "key", category: "General" },
];

export function BrandLogoSquircle({
  brand = "",
  imageUrl,
  className = "",
  size = 56,
}: {
  brand?: string;
  imageUrl?: string | null;
  className?: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);

  // If imageUrl is a direct web/upload URL and hasn't errored
  const isDirectUrl = Boolean(
    imageUrl &&
    !imgError &&
    (imageUrl.startsWith("http://") ||
     imageUrl.startsWith("https://") ||
     imageUrl.startsWith("/api/") ||
     imageUrl.startsWith("/") ||
     imageUrl.startsWith("data:") ||
     imageUrl.startsWith("blob:"))
  );

  if (isDirectUrl && imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: `${Math.round(size * 0.32)}px`,
        }}
        className={`inline-grid place-items-center flex-shrink-0 overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs transition-transform ${className}`}
        aria-hidden="true"
      >
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Resolve icon brand key
  let b = "";
  if (imageUrl?.startsWith("brand:")) {
    b = imageUrl.replace(/^brand:/, "").trim().toLowerCase();
  } else {
    b = `${imageUrl || ""} ${brand || ""}`.trim().toLowerCase();
  }

  let bg = "#FEF7E6";
  let fg = "#D97706";

  if (b.includes("gemini")) {
    bg = "#E9EEFA";
    fg = "#1A73E8";
  } else if (b.includes("adobe") || b.includes("express")) {
    bg = "#FDE8E8";
    fg = "#EB1000";
  } else if (b.includes("duolingo")) {
    bg = "#E6F8DA";
    fg = "#58CC02";
  } else if (b.includes("pocket") || b.includes("fm")) {
    bg = "#FEECE2";
    fg = "#E65100";
  } else if (b.includes("chatgpt") || b.includes("openai") || b.includes("gpt")) {
    bg = "#E4F4EA";
    fg = "#10A37F";
  } else if (b.includes("spotify")) {
    bg = "#E5F7E8";
    fg = "#1DB954";
  } else if (b.includes("netflix")) {
    bg = "#FDE8E8";
    fg = "#E50914";
  } else if (b.includes("youtube")) {
    bg = "#FEEBEB";
    fg = "#FF0000";
  } else if (b.includes("canva")) {
    bg = "#E3F7F8";
    fg = "#00C4CC";
  } else if (b.includes("telegram")) {
    bg = "#E7F3FB";
    fg = "#24A1DE";
  } else if (b.includes("prime") || b.includes("amazon")) {
    bg = "#E6F2F8";
    fg = "#00A8E1";
  } else if (b.includes("apple")) {
    bg = "#F1F3F5";
    fg = "#1F2937";
  } else if (b.includes("discord")) {
    bg = "#ECEEFE";
    fg = "#5865F2";
  } else if (b.includes("nord") || b.includes("vpn")) {
    bg = "#EAF1FA";
    fg = "#4687FF";
  } else if (b.includes("office") || b.includes("microsoft")) {
    bg = "#EAF2FC";
    fg = "#0078D4";
  } else if (b.includes("claude") || b.includes("anthropic")) {
    bg = "#F5EFE6";
    fg = "#CC785C";
  } else if (b.includes("midjourney")) {
    bg = "#111827";
    fg = "#F3F4F6";
  } else if (b.includes("cursor")) {
    bg = "#0B0F19";
    fg = "#38BDF8";
  } else if (b.includes("copilot") || b.includes("github")) {
    bg = "#24292E";
    fg = "#FFFFFF";
  } else if (b.includes("perplexity")) {
    bg = "#E0F2FE";
    fg = "#0284C7";
  } else if (b.includes("disney")) {
    bg = "#0C1E40";
    fg = "#1E90FF";
  } else if (b.includes("crunchyroll")) {
    bg = "#FFF5EA";
    fg = "#F47521";
  } else if (b.includes("hoichoi")) {
    bg = "#FFECEE";
    fg = "#E50914";
  } else if (b.includes("chorki")) {
    bg = "#FFF3E0";
    fg = "#FB8C00";
  } else if (b.includes("tidal")) {
    bg = "#000000";
    fg = "#00FFFF";
  } else if (b.includes("figma")) {
    bg = "#F8F2FF";
    fg = "#A259FF";
  } else if (b.includes("freepik")) {
    bg = "#EBF3FF";
    fg = "#1273EB";
  } else if (b.includes("envato")) {
    bg = "#EEF9EB";
    fg = "#82B541";
  } else if (b.includes("surfshark")) {
    bg = "#E2F8F6";
    fg = "#1EA896";
  } else if (b.includes("expressvpn")) {
    bg = "#FCE8E8";
    fg = "#DA3634";
  } else if (b.includes("proton")) {
    bg = "#EEF0FF";
    fg = "#6D4AFF";
  } else if (b.includes("windows")) {
    bg = "#E8F4FC";
    fg = "#00ADEF";
  } else if (b.includes("googleone")) {
    bg = "#EEF5FE";
    fg = "#4285F4";
  } else if (b.includes("notion")) {
    bg = "#F7F6F3";
    fg = "#000000";
  } else if (b.includes("grammarly")) {
    bg = "#E9F9F0";
    fg = "#15C39A";
  } else if (b.includes("tradingview")) {
    bg = "#131722";
    fg = "#2962FF";
  } else if (b.includes("coursera")) {
    bg = "#E8F1FC";
    fg = "#0056D2";
  } else if (b.includes("udemy")) {
    bg = "#F7ECFF";
    fg = "#A435F0";
  } else if (b.includes("steam")) {
    bg = "#171A21";
    fg = "#66C0F4";
  } else if (b.includes("playstation")) {
    bg = "#003791";
    fg = "#FFFFFF";
  } else if (b.includes("xbox")) {
    bg = "#0E7A0D";
    fg = "#FFFFFF";
  } else if (b.includes("roblox")) {
    bg = "#111827";
    fg = "#FFFFFF";
  } else if (b.includes("star")) {
    bg = "#FEF9C3";
    fg = "#CA8A04";
  } else if (b.includes("diamond")) {
    bg = "#E0F2FE";
    fg = "#0284C7";
  } else if (b.includes("shield")) {
    bg = "#DCFCE7";
    fg = "#16A34A";
  }

  const iconSize = Math.round(size * 0.52);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        borderRadius: `${Math.round(size * 0.32)}px`,
      }}
      className={`inline-grid place-items-center flex-shrink-0 transition-transform ${className}`}
      aria-hidden="true"
    >
      {b.includes("gemini") && <GeminiIcon size={iconSize} />}
      {(b.includes("adobe") || b.includes("express")) && <AdobeIcon size={Math.round(size * 0.5)} />}
      {b.includes("duolingo") && <DuolingoIcon size={iconSize} />}
      {(b.includes("pocket") || b.includes("fm")) && <PocketFmIcon size={Math.round(size * 0.5)} />}
      {(b.includes("chatgpt") || b.includes("openai") || b.includes("gpt")) && <ChatGptIcon size={iconSize} />}
      {b.includes("spotify") && <SpotifyIcon size={iconSize} />}
      {b.includes("netflix") && <NetflixIcon size={iconSize} />}
      {b.includes("youtube") && <YouTubeIcon size={iconSize} />}
      {b.includes("canva") && <CanvaIcon size={iconSize} />}
      {b.includes("telegram") && <TelegramIcon size={iconSize} />}
      {(b.includes("prime") || b.includes("amazon")) && <PrimeVideoIcon size={iconSize} />}
      {b.includes("apple") && <AppleIcon size={iconSize} />}
      {b.includes("discord") && <DiscordIcon size={iconSize} />}
      {(b.includes("nord") || b.includes("vpn")) && <NordVpnIcon size={iconSize} />}
      {(b.includes("office") || b.includes("microsoft")) && <OfficeIcon size={iconSize} />}
      {b.includes("key") && <KeyIcon size={Math.round(size * 0.5)} />}
      {!b.includes("gemini") &&
        !b.includes("adobe") &&
        !b.includes("express") &&
        !b.includes("duolingo") &&
        !b.includes("pocket") &&
        !b.includes("fm") &&
        !b.includes("chatgpt") &&
        !b.includes("openai") &&
        !b.includes("gpt") &&
        !b.includes("spotify") &&
        !b.includes("netflix") &&
        !b.includes("youtube") &&
        !b.includes("canva") &&
        !b.includes("telegram") &&
        !b.includes("prime") &&
        !b.includes("amazon") &&
        !b.includes("apple") &&
        !b.includes("discord") &&
        !b.includes("nord") &&
        !b.includes("vpn") &&
        !b.includes("office") &&
        !b.includes("microsoft") &&
        !b.includes("key") && (
          <span className="font-extrabold text-base tracking-tight uppercase">
            {(brand || "AZ").slice(0, 2)}
          </span>
        )}
    </div>
  );
}

export function BrandIconPickerModal({
  isOpen,
  onClose,
  currentValue,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onSelect: (iconValue: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customUrl, setCustomUrl] = useState(currentValue.startsWith("brand:") ? "" : currentValue);
  const [chosenId, setChosenId] = useState(currentValue);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(BRAND_ICON_PRESETS.map((p) => p.category || "Other")));
    return ["all", ...cats];
  }, []);

  const filteredPresets = useMemo(() => {
    return BRAND_ICON_PRESETS.filter((p) => {
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (customUrl.trim()) {
      onSelect(customUrl.trim());
    } else {
      onSelect(chosenId || "brand:key");
    }
    onClose();
  };

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div
        className="vault-modal-card"
        style={{ maxWidth: "680px", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="product-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <div style={{ background: "#e6f4ef", color: "#0b765c", padding: "8px", borderRadius: "10px" }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>ব্র্যান্ড আইকন লাইব্রেরি</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
              আপনার প্রোডাক্ট বা সার্ভিসের জন্য অফিসিয়াল ব্র্যান্ড লোগো বা কাস্টম আইকন নির্বাচন করুন
            </p>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
          <div className="toolbar-search" style={{ width: "100%" }}>
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ব্র্যান্ডের নাম খুঁজুন (যেমন: Gemini, Netflix, Canva, NordVPN...)"
              autoFocus
            />
          </div>

          <div className="chip-selector" style={{ overflowX: "auto", paddingBottom: "2px" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`admin-chip ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "all" ? "সব ক্যাটাগরি" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Icons Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "8px",
            maxHeight: "340px",
            overflowY: "auto",
            padding: "4px",
            marginBottom: "14px",
            border: "1px solid var(--line, #e2ece6)",
            borderRadius: "12px",
            background: "#fbfdfc",
          }}
        >
          {filteredPresets.map((preset) => {
            const isSelected = !customUrl.trim() && chosenId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setChosenId(preset.id);
                  setCustomUrl("");
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 6px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid #0b765c" : "1px solid #e2ece6",
                  background: isSelected ? "#e6f7ef" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "center",
                }}
              >
                <BrandLogoSquircle brand={preset.brand} imageUrl={preset.id} size={36} />
                <span style={{ fontSize: "11px", fontWeight: 650, color: isSelected ? "#0b765c" : "#334155", lineHeight: 1.2 }}>
                  {preset.label}
                </span>
                {isSelected && (
                  <span style={{ fontSize: "10px", color: "#0b765c", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                    <Check size={11} /> সিলেক্টেড
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Direct URL Input */}
        <div style={{ background: "#f8faf9", padding: "12px", borderRadius: "10px", border: "1px solid #e2ece6", marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            অথবা কাস্টম ইমেজ / SVG URL লিংক দিন:
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="admin-password-input"
              style={{ fontSize: "12px", padding: "8px 12px" }}
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                if (e.target.value.trim()) setChosenId(e.target.value.trim());
              }}
              placeholder="https://example.com/logo.png"
            />
            {customUrl && (
              <button
                type="button"
                className="button button-sm button-light"
                onClick={() => setCustomUrl("")}
              >
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>প্রিভিউ:</span>
            <BrandLogoSquircle
              imageUrl={customUrl.trim() || chosenId}
              size={32}
            />
            <span style={{ fontSize: "11px", fontWeight: 700 }}>
              {customUrl.trim() ? "কাস্টম ইমেজ" : BRAND_ICON_PRESETS.find((p) => p.id === chosenId)?.label || chosenId}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="button button-light" onClick={onClose}>
              বাতিল
            </button>
            <button type="button" className="button button-primary" onClick={handleApply}>
              <Check size={14} /> আইকন সিলেক্ট করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Check, Sparkles, Loader2, Globe } from "lucide-react";

interface BrandIconProps {
  className?: string;
  size?: number;
}

export function GeminiIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24Z" fill="currentColor" />
    </svg>
  );
}

export function AdobeIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.1 2H24V22H15.1L12 15.6L8.9 22H0V2H8.9L12 8.4L15.1 2ZM12 11.2L9.8 6.7H4.3V18.1H7L12 7.8L17 18.1H19.7V6.7H14.2L12 11.2Z" fill="currentColor" />
    </svg>
  );
}

export function DuolingoIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 14C7.67 14 7 13.33 7 12.5C7 11.67 7.67 11 8.5 11C9.33 11 10 11.67 10 12.5C10 13.33 9.33 14 8.5 14ZM15.5 14C14.67 14 14 13.33 14 12.5C14 11.67 14.67 11 15.5 11C16.33 11 17 11.67 17 12.5C17 13.33 16.33 14 15.5 14ZM12 17C10.62 17 9.5 15.88 9.5 14.5H14.5C14.5 15.88 13.38 17 12 17Z" />
    </svg>
  );
}

export function PocketFmIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9 6.07 6.07 0 0 0-4.27 2.17 5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.2 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.08zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.59a4.5 4.5 0 0 1-4.49 4.49zM3.6 16.9a4.47 4.47 0 0 1-.53-3.02l.14.09 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 18.55a4.5 4.5 0 0 1-6.14-1.66zm-1.12-9.53a4.46 4.46 0 0 1 2.34-1.97v5.44a.79.79 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0L4.1 13.24a4.5 4.5 0 0 1-1.62-5.87zm16.65 4.28l-5.84-3.37V5.95a.08.08 0 0 1 .03-.06l4.85-2.8a4.5 4.5 0 0 1 6.67 4.67l-.14-.08-4.78-2.76a.77.77 0 0 0-.79 0zm2.01-3.02V3.05a4.5 4.5 0 0 1 1.62 5.87 4.47 4.47 0 0 1-2.34 1.97V5.42a.79.79 0 0 0-.39-.68l-5.81-3.35 2.02-1.17a.08.08 0 0 1 .07 0l4.83 2.79zM10.74 13.5l-2.6-1.5 2.6-1.5 2.61 1.5-2.61 1.5z" />
    </svg>
  );
}

export function SpotifyIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function NetflixIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5.398 0v24L10.113 0H5.398zm8.489 0v9.172l4.715 13.313c2.346-.059 4.856-.398 4.856-.398L13.887 0h-4.715v24h4.715V0z" />
    </svg>
  );
}

export function YouTubeIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function CanvaIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 16.5c-1.5 1-3.5 1-5 0-2-1.5-2.5-4-1.5-6s3-2.5 5-1.5c1.5.7 2 2.3 1.5 3.8l-1.3-.5c.3-1-.1-2-1-2.5-1.3-.7-3-.3-3.7 1-.7 1.3-.3 3 .9 3.7 1 .6 2.3.6 3.3 0l1.8 2z" />
    </svg>
  );
}

export function TelegramIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.88 7.82l-2.07 9.77c-.16.7-.57.87-1.15.54l-3.17-2.34-1.53 1.47c-.17.17-.31.31-.64.31l.23-3.23 5.88-5.31c.26-.23-.06-.35-.4-.13L7.92 13.5 4.8 12.53c-.68-.21-.69-.68.14-1.01l12.2-4.7c.56-.21 1.06.13.74 1z" />
    </svg>
  );
}

export function PrimeVideoIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M2.5 13.5c4.5 3 11 3.5 16.5.5-1-.5-2.5-.5-3.5-.5 5 0 6.5 1.5 6.5 1.5-2 3.5-7.5 5.5-13 4-2.5-.5-5-2.5-6.5-5.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 6h2v6h-2V8zm-4 2h2v4H7v-4zm8 0h2v4h-2v-4z" />
    </svg>
  );
}

export function AppleIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.6-.74 1.01-1.77.9-2.8-.88.04-1.95.59-2.58 1.33-.56.65-.99 1.7-1.02 2.73.99.08 2-.52 2.7-1.26z" />
    </svg>
  );
}

export function DiscordIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.37-.44.86-.6 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.12c.13-.1.25-.2.37-.3a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08.01c.12.1.24.2.37.3a.08.08 0 0 1-.01.12 12.3 12.3 0 0 1-1.87.9.08.08 0 0 0-.04.1c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .04-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.98 0c-1.19 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.21 0 2.17 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z" />
    </svg>
  );
}

export function NordVpnIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 2L2 19.5h20L12 2zm0 4.8l6.1 10.7H5.9L12 6.8zM12 10.5l-3 5.2h6l-3-5.2z" />
    </svg>
  );
}

export function OfficeIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M11.4 3H3v8.4h8.4V3zm9.6 0h-8.4v8.4H21V3zM11.4 12.6H3V21h8.4v-8.4zm9.6 0h-8.4V21H21v-8.4z" />
    </svg>
  );
}

export function KeyIcon({ className = "", size = 28 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

export function BkashIcon({ className = "", size = 22 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M14.64 2L6.8 10.37L10.32 14.12L18.16 5.75L14.64 2ZM5.84 11.39L2 15.49L7.49 19.34L11.33 15.24L5.84 11.39ZM19.16 6.81L12.33 14.1L15.85 17.85L22.68 10.56L19.16 6.81ZM8.45 20.41L12.29 22L16.81 18.89L12.97 17.3L8.45 20.41Z" />
    </svg>
  );
}

export function NagadIcon({ className = "", size = 22 }: BrandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.8 17.2L10.2 13.6V17.2H8.2V6.8H10.2V10.4L13.8 6.8H16.4L12.5 10.7L16.4 17.2H13.8Z" />
    </svg>
  );
}

export interface BrandIconPreset {
  id: string;
  label: string;
  brand: string;
  category?: string;
  iconUrl: string;
  collection?: string;
}

/**
 * Curated list of popular SaaS & digital subscription brands
 * with direct official SVG URLs from Simple Icons & Iconify.
 */
export const BRAND_ICON_PRESETS: BrandIconPreset[] = [
  // AI & Developer Tools
  { id: "https://cdn.simpleicons.org/googlegemini", label: "Google Gemini", brand: "gemini", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/googlegemini", collection: "Simple Icons" },
  { id: "https://api.iconify.design/selfhst/chatgpt.svg", label: "ChatGPT / OpenAI", brand: "chatgpt", category: "AI & Dev", iconUrl: "https://api.iconify.design/selfhst/chatgpt.svg", collection: "Selfhst Logos" },
  { id: "https://cdn.simpleicons.org/anthropic", label: "Claude AI", brand: "claude", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/anthropic", collection: "Simple Icons" },
  { id: "https://api.iconify.design/logos/midjourney.svg", label: "Midjourney AI", brand: "midjourney", category: "AI & Dev", iconUrl: "https://api.iconify.design/logos/midjourney.svg", collection: "Logos" },
  { id: "https://cdn.simpleicons.org/cursor", label: "Cursor AI IDE", brand: "cursor", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/cursor", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/githubcopilot", label: "GitHub Copilot", brand: "copilot", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/githubcopilot", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/perplexity", label: "Perplexity Pro", brand: "perplexity", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/perplexity", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/replit", label: "Replit Agent", brand: "replit", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/replit", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/huggingface", label: "Hugging Face", brand: "huggingface", category: "AI & Dev", iconUrl: "https://cdn.simpleicons.org/huggingface", collection: "Simple Icons" },

  // Video Streaming
  { id: "https://cdn.simpleicons.org/netflix", label: "Netflix UHD", brand: "netflix", category: "Streaming", iconUrl: "https://cdn.simpleicons.org/netflix", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/youtube", label: "YouTube Premium", brand: "youtube", category: "Streaming", iconUrl: "https://cdn.simpleicons.org/youtube", collection: "Simple Icons" },
  { id: "https://api.iconify.design/logos/amazon-prime.svg", label: "Amazon Prime Video", brand: "prime", category: "Streaming", iconUrl: "https://api.iconify.design/logos/amazon-prime.svg", collection: "Logos" },
  { id: "https://api.iconify.design/selfhst/disney-plus.svg", label: "Disney+ Hotstar", brand: "disney", category: "Streaming", iconUrl: "https://api.iconify.design/selfhst/disney-plus.svg", collection: "Selfhst Logos" },
  { id: "https://cdn.simpleicons.org/crunchyroll", label: "Crunchyroll Anime", brand: "crunchyroll", category: "Streaming", iconUrl: "https://cdn.simpleicons.org/crunchyroll", collection: "Simple Icons" },
  { id: "https://api.iconify.design/arcticons/hoichoi.svg", label: "Hoichoi TV", brand: "hoichoi", category: "Streaming", iconUrl: "https://api.iconify.design/arcticons/hoichoi.svg", collection: "Arcticons" },
  { id: "https://api.iconify.design/arcticons/chorki.svg", label: "Chorki", brand: "chorki", category: "Streaming", iconUrl: "https://api.iconify.design/arcticons/chorki.svg", collection: "Arcticons" },
  { id: "https://cdn.simpleicons.org/appletv", label: "Apple TV+", brand: "appletv", category: "Streaming", iconUrl: "https://cdn.simpleicons.org/appletv", collection: "Simple Icons" },
  { id: "https://api.iconify.design/cib/hulu.svg", label: "Hulu", brand: "hulu", category: "Streaming", iconUrl: "https://api.iconify.design/cib/hulu.svg", collection: "CoreUI" },
  { id: "https://cdn.simpleicons.org/paramountplus", label: "Paramount+", brand: "paramountplus", category: "Streaming", iconUrl: "https://cdn.simpleicons.org/paramountplus", collection: "Simple Icons" },

  // Audio & Music
  { id: "https://cdn.simpleicons.org/spotify", label: "Spotify Premium", brand: "spotify", category: "Audio", iconUrl: "https://cdn.simpleicons.org/spotify", collection: "Simple Icons" },
  { id: "https://api.iconify.design/lucide/headphones.svg", label: "Pocket FM VIP", brand: "pocket", category: "Audio", iconUrl: "https://api.iconify.design/lucide/headphones.svg", collection: "Lucide" },
  { id: "https://cdn.simpleicons.org/applemusic", label: "Apple Music", brand: "applemusic", category: "Audio", iconUrl: "https://cdn.simpleicons.org/applemusic", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/tidal", label: "Tidal HiFi", brand: "tidal", category: "Audio", iconUrl: "https://cdn.simpleicons.org/tidal", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/soundcloud", label: "SoundCloud Go+", brand: "soundcloud", category: "Audio", iconUrl: "https://cdn.simpleicons.org/soundcloud", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/deezer", label: "Deezer Premium", brand: "deezer", category: "Audio", iconUrl: "https://cdn.simpleicons.org/deezer", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/audible", label: "Audible Premium", brand: "audible", category: "Audio", iconUrl: "https://cdn.simpleicons.org/audible", collection: "Simple Icons" },

  // Design & Creative
  { id: "https://api.iconify.design/devicon/canva.svg", label: "Canva Pro", brand: "canva", category: "Design", iconUrl: "https://api.iconify.design/devicon/canva.svg", collection: "Devicon Color" },
  { id: "https://api.iconify.design/logos/adobe.svg", label: "Adobe Express / CC", brand: "adobe", category: "Design", iconUrl: "https://api.iconify.design/logos/adobe.svg", collection: "Logos" },
  { id: "https://api.iconify.design/devicon/photoshop.svg", label: "Adobe Photoshop", brand: "photoshop", category: "Design", iconUrl: "https://api.iconify.design/devicon/photoshop.svg", collection: "Devicon Color" },
  { id: "https://api.iconify.design/devicon/illustrator.svg", label: "Adobe Illustrator", brand: "illustrator", category: "Design", iconUrl: "https://api.iconify.design/devicon/illustrator.svg", collection: "Devicon Color" },
  { id: "https://api.iconify.design/devicon/premierepro.svg", label: "Adobe Premiere Pro", brand: "premiere", category: "Design", iconUrl: "https://api.iconify.design/devicon/premierepro.svg", collection: "Devicon Color" },
  { id: "https://cdn.simpleicons.org/figma", label: "Figma Professional", brand: "figma", category: "Design", iconUrl: "https://cdn.simpleicons.org/figma", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/freepik", label: "Freepik Premium", brand: "freepik", category: "Design", iconUrl: "https://cdn.simpleicons.org/freepik", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/envato", label: "Envato Elements", brand: "envato", category: "Design", iconUrl: "https://cdn.simpleicons.org/envato", collection: "Simple Icons" },
  { id: "https://api.iconify.design/selfhst/capcut.svg", label: "CapCut Pro", brand: "capcut", category: "Design", iconUrl: "https://api.iconify.design/selfhst/capcut.svg", collection: "Selfhst Logos" },

  // VPN & Security
  { id: "https://cdn.simpleicons.org/nordvpn", label: "NordVPN", brand: "nordvpn", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/nordvpn", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/surfshark", label: "Surfshark VPN", brand: "surfshark", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/surfshark", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/expressvpn", label: "ExpressVPN", brand: "expressvpn", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/expressvpn", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/protonvpn", label: "Proton VPN", brand: "proton", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/protonvpn", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/1password", label: "1Password", brand: "1password", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/1password", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/bitwarden", label: "Bitwarden Premium", brand: "bitwarden", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/bitwarden", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/cloudflare", label: "Cloudflare Warp+", brand: "cloudflare", category: "VPN & Security", iconUrl: "https://cdn.simpleicons.org/cloudflare", collection: "Simple Icons" },

  // Productivity & Office
  { id: "https://api.iconify.design/logos/microsoft.svg", label: "Microsoft 365", brand: "office", category: "Productivity", iconUrl: "https://api.iconify.design/logos/microsoft.svg", collection: "Logos" },
  { id: "https://cdn.simpleicons.org/windows", label: "Windows 11 Pro", brand: "windows", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/windows", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/google", label: "Google One / Workspace", brand: "googleone", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/google", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/notion", label: "Notion Plus & AI", brand: "notion", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/notion", collection: "Simple Icons" },
  { id: "https://api.iconify.design/logos/slack-icon.svg", label: "Slack Pro", brand: "slack", category: "Productivity", iconUrl: "https://api.iconify.design/logos/slack-icon.svg", collection: "Logos" },
  { id: "https://cdn.simpleicons.org/zoom", label: "Zoom Pro", brand: "zoom", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/zoom", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/telegram", label: "Telegram Premium", brand: "telegram", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/telegram", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/discord", label: "Discord Nitro", brand: "discord", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/discord", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/grammarly", label: "Grammarly Premium", brand: "grammarly", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/grammarly", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/tradingview", label: "TradingView Pro", brand: "tradingview", category: "Productivity", iconUrl: "https://cdn.simpleicons.org/tradingview", collection: "Simple Icons" },

  // Learning & Education
  { id: "https://cdn.simpleicons.org/duolingo", label: "Duolingo Super", brand: "duolingo", category: "Learning", iconUrl: "https://cdn.simpleicons.org/duolingo", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/coursera", label: "Coursera Plus", brand: "coursera", category: "Learning", iconUrl: "https://cdn.simpleicons.org/coursera", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/udemy", label: "Udemy Business", brand: "udemy", category: "Learning", iconUrl: "https://cdn.simpleicons.org/udemy", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/skillshare", label: "Skillshare Premium", brand: "skillshare", category: "Learning", iconUrl: "https://cdn.simpleicons.org/skillshare", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/codecademy", label: "Codecademy Pro", brand: "codecademy", category: "Learning", iconUrl: "https://cdn.simpleicons.org/codecademy", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/edx", label: "edX Verified", brand: "edx", category: "Learning", iconUrl: "https://cdn.simpleicons.org/edx", collection: "Simple Icons" },

  // Gaming
  { id: "https://cdn.simpleicons.org/steam", label: "Steam Wallet", brand: "steam", category: "Gaming", iconUrl: "https://cdn.simpleicons.org/steam", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/playstation", label: "PlayStation Plus", brand: "playstation", category: "Gaming", iconUrl: "https://cdn.simpleicons.org/playstation", collection: "Simple Icons" },
  { id: "https://api.iconify.design/ri/xbox-fill.svg", label: "Xbox Game Pass", brand: "xbox", category: "Gaming", iconUrl: "https://api.iconify.design/ri/xbox-fill.svg", collection: "Remix Icon" },
  { id: "https://api.iconify.design/cib/nintendo.svg", label: "Nintendo Switch Online", brand: "nintendo", category: "Gaming", iconUrl: "https://api.iconify.design/cib/nintendo.svg", collection: "CoreUI" },
  { id: "https://cdn.simpleicons.org/roblox", label: "Roblox Robux", brand: "roblox", category: "Gaming", iconUrl: "https://cdn.simpleicons.org/roblox", collection: "Simple Icons" },
  { id: "https://cdn.simpleicons.org/twitch", label: "Twitch Turbo", brand: "twitch", category: "Gaming", iconUrl: "https://cdn.simpleicons.org/twitch", collection: "Simple Icons" },
];

/**
 * Backward compatibility map for legacy brand: identifiers
 */
const LEGACY_BRAND_MAP: Record<string, string> = {
  "brand:gemini": "https://cdn.simpleicons.org/googlegemini",
  "brand:chatgpt": "https://api.iconify.design/selfhst/chatgpt.svg",
  "brand:claude": "https://cdn.simpleicons.org/anthropic",
  "brand:midjourney": "https://api.iconify.design/logos/midjourney.svg",
  "brand:cursor": "https://cdn.simpleicons.org/cursor",
  "brand:copilot": "https://cdn.simpleicons.org/githubcopilot",
  "brand:perplexity": "https://cdn.simpleicons.org/perplexity",
  "brand:netflix": "https://cdn.simpleicons.org/netflix",
  "brand:youtube": "https://cdn.simpleicons.org/youtube",
  "brand:prime": "https://api.iconify.design/logos/amazon-prime.svg",
  "brand:disney": "https://api.iconify.design/selfhst/disney-plus.svg",
  "brand:crunchyroll": "https://cdn.simpleicons.org/crunchyroll",
  "brand:hoichoi": "https://api.iconify.design/arcticons/hoichoi.svg",
  "brand:chorki": "https://api.iconify.design/arcticons/chorki.svg",
  "brand:spotify": "https://cdn.simpleicons.org/spotify",
  "brand:pocket": "https://api.iconify.design/lucide/headphones.svg",
  "brand:apple": "https://cdn.simpleicons.org/apple",
  "brand:tidal": "https://cdn.simpleicons.org/tidal",
  "brand:adobe": "https://api.iconify.design/logos/adobe.svg",
  "brand:canva": "https://api.iconify.design/devicon/canva.svg",
  "brand:figma": "https://cdn.simpleicons.org/figma",
  "brand:freepik": "https://cdn.simpleicons.org/freepik",
  "brand:envato": "https://cdn.simpleicons.org/envato",
  "brand:nordvpn": "https://cdn.simpleicons.org/nordvpn",
  "brand:surfshark": "https://cdn.simpleicons.org/surfshark",
  "brand:expressvpn": "https://cdn.simpleicons.org/expressvpn",
  "brand:proton": "https://cdn.simpleicons.org/protonvpn",
  "brand:office": "https://api.iconify.design/logos/microsoft.svg",
  "brand:windows": "https://cdn.simpleicons.org/windows",
  "brand:googleone": "https://cdn.simpleicons.org/google",
  "brand:notion": "https://cdn.simpleicons.org/notion",
  "brand:telegram": "https://cdn.simpleicons.org/telegram",
  "brand:discord": "https://cdn.simpleicons.org/discord",
  "brand:grammarly": "https://cdn.simpleicons.org/grammarly",
  "brand:tradingview": "https://cdn.simpleicons.org/tradingview",
  "brand:duolingo": "https://cdn.simpleicons.org/duolingo",
  "brand:coursera": "https://cdn.simpleicons.org/coursera",
  "brand:udemy": "https://cdn.simpleicons.org/udemy",
  "brand:steam": "https://cdn.simpleicons.org/steam",
  "brand:playstation": "https://cdn.simpleicons.org/playstation",
  "brand:xbox": "https://api.iconify.design/ri/xbox-fill.svg",
  "brand:roblox": "https://cdn.simpleicons.org/roblox",
};

/**
 * Resolves any image URL, legacy key, Simple Icons slug or Iconify ID into a usable HTTPS image URL
 */
export function resolveBrandIconUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("si:")) {
    return `https://cdn.simpleicons.org/${trimmed.slice(3)}`;
  }

  if (trimmed.startsWith("iconify:")) {
    const parts = trimmed.slice(8).split(":");
    if (parts.length >= 2) {
      return `https://api.iconify.design/${parts[0]}/${parts[1]}.svg`;
    }
  }

  if (LEGACY_BRAND_MAP[trimmed]) {
    return LEGACY_BRAND_MAP[trimmed];
  }

  return null;
}

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

  // Reset error if URL changes
  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const resolvedUrl = resolveBrandIconUrl(imageUrl);

  if (resolvedUrl && !imgError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: `${Math.round(size * 0.28)}px`,
        }}
        className={`inline-grid place-items-center flex-shrink-0 overflow-hidden bg-white/95 border border-slate-200/90 shadow-2xs transition-transform ${className}`}
        aria-hidden="true"
      >
        <img
          src={resolvedUrl}
          alt={brand || ""}
          className="w-full h-full object-contain p-1.5"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback styling with brand initials
  const b = `${imageUrl || ""} ${brand || ""}`.trim().toLowerCase();
  let bg = "#F1F5F9";
  let fg = "#475569";

  if (b.includes("gemini") || b.includes("google")) {
    bg = "#E8F0FE";
    fg = "#1A73E8";
  } else if (b.includes("adobe") || b.includes("netflix") || b.includes("youtube")) {
    bg = "#FEE2E2";
    fg = "#DC2626";
  } else if (b.includes("spotify") || b.includes("duolingo")) {
    bg = "#DCFCE7";
    fg = "#16A34A";
  } else if (b.includes("canva") || b.includes("telegram")) {
    bg = "#E0F2FE";
    fg = "#0284C7";
  } else if (b.includes("nord") || b.includes("vpn") || b.includes("discord")) {
    bg = "#EEF2FF";
    fg = "#4F46E5";
  }

  const iconSize = Math.round(size * 0.52);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        borderRadius: `${Math.round(size * 0.28)}px`,
      }}
      className={`inline-grid place-items-center flex-shrink-0 transition-transform ${className}`}
      aria-hidden="true"
    >
      {b.includes("gemini") ? (
        <GeminiIcon size={iconSize} />
      ) : b.includes("spotify") ? (
        <SpotifyIcon size={iconSize} />
      ) : b.includes("netflix") ? (
        <NetflixIcon size={iconSize} />
      ) : b.includes("youtube") ? (
        <YouTubeIcon size={iconSize} />
      ) : b.includes("canva") ? (
        <CanvaIcon size={iconSize} />
      ) : b.includes("telegram") ? (
        <TelegramIcon size={iconSize} />
      ) : b.includes("discord") ? (
        <DiscordIcon size={iconSize} />
      ) : b.includes("key") ? (
        <KeyIcon size={iconSize} />
      ) : (
        <span className="font-extrabold text-xs tracking-tight uppercase">
          {(brand || "AZ").slice(0, 2)}
        </span>
      )}
    </div>
  );
}

/**
 * Clean human-readable brand name formatter from icon keys
 */
function formatBrandLabel(iconKey: string): string {
  const namePart = iconKey.includes(":") ? iconKey.split(":")[1] : iconKey;
  return namePart
    .replace(/-icon$/i, "")
    .replace(/-fill$/i, "")
    .replace(/-line$/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Interactive Brand Icon Picker Modal
 * Integrates live search across existing icon libraries (Iconify + Simple Icons)
 */
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customUrl, setCustomUrl] = useState(
    currentValue && !currentValue.startsWith("brand:") ? currentValue : ""
  );
  const [chosenUrl, setChosenUrl] = useState(currentValue || "");
  const [chosenLabel, setChosenLabel] = useState("");

  const [onlineIcons, setOnlineIcons] = useState<Array<{ id: string; label: string; iconUrl: string; collection: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Query Iconify Search API whenever user searches
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setOnlineIcons([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const fetchIcons = async () => {
      try {
        const url = `https://api.iconify.design/search?query=${encodeURIComponent(debouncedSearch)}&limit=36`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();

        if (active && Array.isArray(data.icons)) {
          const mapped = data.icons.map((item: string) => {
            const [prefix, name] = item.includes(":") ? item.split(":") : ["logos", item];
            const iconUrl = `https://api.iconify.design/${prefix}/${name}.svg`;
            const collectionName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
            return {
              id: iconUrl,
              label: formatBrandLabel(item),
              iconUrl,
              collection: collectionName,
            };
          });

          // Also inject a Simple Icons CDN fallback entry if slug query matches
          const slugClean = debouncedSearch.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (slugClean) {
            const simpleIconUrl = `https://cdn.simpleicons.org/${slugClean}`;
            mapped.unshift({
              id: simpleIconUrl,
              label: debouncedSearch.charAt(0).toUpperCase() + debouncedSearch.slice(1),
              iconUrl: simpleIconUrl,
              collection: "Simple Icons CDN",
            });
          }

          setOnlineIcons(mapped);
        }
      } catch (err) {
        console.warn("[BrandIconPicker] Iconify search error:", err);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    fetchIcons();

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(BRAND_ICON_PRESETS.map((p) => p.category || "General")));
    return ["all", ...cats];
  }, []);

  // Filter curated presets
  const filteredPresets = useMemo(() => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return BRAND_ICON_PRESETS.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return BRAND_ICON_PRESETS.filter((p) => {
      return selectedCategory === "all" || p.category === selectedCategory;
    });
  }, [debouncedSearch, selectedCategory]);

  if (!isOpen) return null;

  const handleApply = () => {
    const valueToSave = customUrl.trim() || chosenUrl || "https://cdn.simpleicons.org/googlegemini";
    onSelect(valueToSave);
    onClose();
  };

  const currentPreviewUrl = resolveBrandIconUrl(customUrl.trim() || chosenUrl);

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div
        className="vault-modal-card"
        style={{ maxWidth: "720px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="product-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ background: "#e6f4ef", color: "#0b765c", padding: "8px", borderRadius: "10px" }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              অফিসিয়াল ব্র্যান্ড আইকন লাইব্রেরি
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
              হাজারো ব্র্যান্ড (Netflix, Canva, NordVPN, Adobe, ChatGPT...) সরাসরি লাইভ সার্চ করে যুক্ত করুন
            </p>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
          <div className="toolbar-search" style={{ width: "100%", position: "relative" }}>
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ব্র্যান্ডের নাম লিখুন (যেমন: Netflix, Canva, NordVPN, Adobe, ChatGPT, Spotify, Gemini...)"
              autoFocus
              style={{ fontSize: "13px" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips (shown when not searching) */}
          {!debouncedSearch && (
            <div className="chip-selector" style={{ overflowX: "auto", paddingBottom: "2px" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`admin-chip ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ fontSize: "11px", whiteSpace: "nowrap" }}
                >
                  {cat === "all" ? "সব ক্যাটাগরি" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Search status header */}
          {debouncedSearch && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
              <span>
                "{debouncedSearch}" এর জন্য লাইব্রেরি ফলাফল:
              </span>
              {isSearching && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#0b765c" }}>
                  <Loader2 size={13} className="animate-spin" /> অনলাইন আইকন লাইব্রেরি খুঁজছে...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Brand Icons Results Grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "8px",
            minHeight: "260px",
            maxHeight: "360px",
            overflowY: "auto",
            padding: "6px",
            marginBottom: "12px",
            border: "1px solid var(--line, #e2ece6)",
            borderRadius: "12px",
            background: "#fbfdfc",
          }}
        >
          {/* Display online search results if searched */}
          {debouncedSearch ? (
            onlineIcons.length > 0 ? (
              onlineIcons.map((icon, idx) => {
                const isSelected = chosenUrl === icon.iconUrl;
                return (
                  <button
                    key={`${icon.id}-${idx}`}
                    type="button"
                    onClick={() => {
                      setChosenUrl(icon.iconUrl);
                      setChosenLabel(icon.label);
                      setCustomUrl("");
                    }}
                    onDoubleClick={handleApply}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "10px 6px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #0b765c" : "1px solid #e2ece6",
                      background: isSelected ? "#e6f7ef" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                    title={`${icon.label} (${icon.collection})`}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        display: "grid",
                        placeItems: "center",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        padding: "4px",
                      }}
                    >
                      <img
                        src={icon.iconUrl}
                        alt={icon.label}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 650, color: isSelected ? "#0b765c" : "#1e293b", lineHeight: 1.2 }}>
                      {icon.label}
                    </span>
                    <span style={{ fontSize: "9px", color: "#64748b", background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>
                      {icon.collection}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: "10px", color: "#0b765c", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                        <Check size={11} /> সিলেক্টেড
                      </span>
                    )}
                  </button>
                );
              })
            ) : isSearching ? (
              <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", padding: "40px 0" }}>
                <Loader2 size={24} className="animate-spin text-emerald-600 mb-2" />
                <span style={{ fontSize: "13px", color: "#64748b" }}>আইকন লাইব্রেরি থেকে ফলাফল খোঁজা হচ্ছে...</span>
              </div>
            ) : (
              <div style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center", padding: "30px 0", textAlign: "center" }}>
                <Globe size={32} className="text-slate-300 mb-2" />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  "{debouncedSearch}" দিয়ে কোনো আইকন পাওয়া যায়নি
                </span>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>
                  অন্য নাম দিয়ে সার্চ করুন অথবা নিচে সরাসরি কাস্টম ইমেজ / SVG লিংক পেস্ট করুন
                </p>
              </div>
            )
          ) : (
            /* Curated Presets when not searching */
            filteredPresets.map((preset) => {
              const isSelected = chosenUrl === preset.iconUrl || chosenUrl === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setChosenUrl(preset.iconUrl);
                    setChosenLabel(preset.label);
                    setCustomUrl("");
                  }}
                  onDoubleClick={handleApply}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px 6px",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #0b765c" : "1px solid #e2ece6",
                    background: isSelected ? "#e6f7ef" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "center",
                  }}
                  title={preset.label}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      display: "grid",
                      placeItems: "center",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      padding: "4px",
                    }}
                  >
                    <img
                      src={preset.iconUrl}
                      alt={preset.label}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      loading="lazy"
                    />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 650, color: isSelected ? "#0b765c" : "#1e293b", lineHeight: 1.2 }}>
                    {preset.label}
                  </span>
                  <span style={{ fontSize: "9px", color: "#64748b", background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>
                    {preset.collection || preset.category}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: "10px", color: "#0b765c", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                      <Check size={11} /> সিলেক্টেড
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Custom Direct URL Input */}
        <div style={{ background: "#f8faf9", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2ece6", marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            অথবা যেকোনো কাস্টম ইমেজ / SVG URL লিংক দিন:
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="admin-password-input"
              style={{ fontSize: "12px", padding: "8px 12px", flex: 1 }}
              value={customUrl}
              onChange={(e) => {
                const val = e.target.value;
                setCustomUrl(val);
                if (val.trim()) {
                  setChosenUrl(val.trim());
                  setChosenLabel("কাস্টম ইমেজ");
                }
              }}
              placeholder="https://example.com/logo.svg বা https://example.com/image.png"
            />
            {customUrl && (
              <button
                type="button"
                className="button button-sm button-light"
                onClick={() => {
                  setCustomUrl("");
                  setChosenUrl("");
                  setChosenLabel("");
                }}
              >
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #e2ece6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>সিলেক্টেড আইকন প্রিভিউ:</span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                display: "grid",
                placeItems: "center",
                padding: "3px",
              }}
            >
              {currentPreviewUrl ? (
                <img
                  src={currentPreviewUrl}
                  alt="Preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Sparkles size={16} className="text-slate-400" />
              )}
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
              {chosenLabel || (chosenUrl ? "নির্বাচিত আইকন" : "কোনো আইকন সিলেক্ট করা হয়নি")}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="button button-light" onClick={onClose}>
              বাতিল
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleApply}
              disabled={!chosenUrl && !customUrl.trim()}
            >
              <Check size={14} /> আইকন সিলেক্ট করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

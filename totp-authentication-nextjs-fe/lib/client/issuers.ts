"use client";

/** Known issuers -> (emoji icon, brand color). Falls back to first-letter avatar. */
export const ISSUER_META: Record<string, { icon: string; color: string }> = {
  github: { icon: "🐙", color: "#24292f" },
  google: { icon: "🇬", color: "#4285F4" },
  microsoft: { icon: "🟦", color: "#0078D4" },
  microsoft365: { icon: "🟦", color: "#0078D4" },
  amazon: { icon: "🅰️", color: "#FF9900" },
  aws: { icon: "☁️", color: "#FF9900" },
  facebook: { icon: "🅵", color: "#1877F2" },
  apple: { icon: "", color: "#555555" },
  slack: { icon: "🟣", color: "#4A154B" },
  discord: { icon: "🟣", color: "#5865F2" },
  dropbox: { icon: "📦", color: "#0061FF" },
  twitter: { icon: "🕊️", color: "#1DA1F2" },
  x: { icon: "✖️", color: "#000000" },
  netflix: { icon: "🎬", color: "#E50914" },
  spotify: { icon: "🎧", color: "#1DB954" },
  binance: { icon: "💰", color: "#F0B90B" },
  coinbase: { icon: "🪙", color: "#0052FF" },
  stripe: { icon: "💳", color: "#635BFF" },
  cloudflare: { icon: "☁️", color: "#F38020" },
  protonmail: { icon: "✉️", color: "#6D4AFF" },
  duckduckgo: { icon: "🦆", color: "#DE5833" },
  paypal: { icon: "💙", color: "#003087" },
  bitwarden: { icon: "🔐", color: "#175DDC" },
  steam: { icon: "🎮", color: "#1B2838" },
  epicgames: { icon: "🎮", color: "#131313" },
  twitch: { icon: "🟣", color: "#9146FF" },
  zoom: { icon: "🎥", color: "#2D8CFF" },
  linkedin: { icon: "🔗", color: "#0A66C2" },
  reddit: { icon: "👽", color: "#FF4500" },
  instagram: { icon: "📸", color: "#E4405F" },
  telegram: { icon: "✈️", color: "#26A5E4" },
  whatsapp: { icon: "💬", color: "#25D366" },
};

export function issuerMeta(issuer: string): { icon: string; color: string } {
  const key = issuer.trim().toLowerCase().replace(/\s+/g, "");
  const match = ISSUER_META[key];
  if (match) return match;
  return { icon: "", color: "#64748b" };
}

export function initialOf(issuer: string): string {
  return (issuer.trim()[0] ?? "?").toUpperCase();
}

/** Deterministic tailwind-friendly hash color for unknown issuers. */
export function fallbackColor(issuer: string): string {
  let hash = 0;
  for (let i = 0; i < issuer.length; i++) {
    hash = (hash * 31 + issuer.charCodeAt(i)) | 0;
  }
  const palette = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f59e0b",
    "#10b981",
    "#0ea5e9",
    "#84cc16",
    "#06b6d4",
    "#a855f7",
  ];
  return palette[Math.abs(hash) % palette.length];
}
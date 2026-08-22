"use client";

import { generateSync, createGuardrails } from "otplib";

const STEP_MS = 30_000;

// otplib v13 enforces >=16-byte secrets; legacy accounts created under v12
// have 10-byte ones. Relax the floor so offline generation still works.
const GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 8 });

/** Parse a raw otpauth:// URI into its parts (label, issuer, secret, ...). */
export interface OtpAuthUri {
  label: string;
  issuer: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
}

export function parseOtpauthUri(uri: string): OtpAuthUri | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== "otpauth:" || u.host !== "totp") return null;

    const params = u.searchParams;
    const secret = params.get("secret") ?? "";
    const digits = Number(params.get("digits") ?? 6);
    const period = Number(params.get("period") ?? 30);
    const algorithm = params.get("algorithm") ?? "SHA1";
    const issuerParam = params.get("issuer") ?? "";

    // Label is everything after the "otpauth://totp/" prefix.
    const rawLabel = uri.split("otpauth://totp/")[1]?.split("?")[0] ?? "";
    const label = safeDecode(rawLabel);

    // If issuer isn't in the query, it's the first segment of the label ("Issuer:account").
    let issuer = safeDecode(issuerParam);
    let finalLabel = label;
    if (!issuer && label.includes(":")) {
      const idx = label.indexOf(":");
      issuer = label.slice(0, idx);
      finalLabel = label.slice(idx + 1);
    }

    if (!secret) return null;
    return { label: finalLabel, issuer, secret, digits, period, algorithm };
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Client-side code generation. Requires the plaintext secret. */
export function generateCode(secret: string): string {
  return generateSync({ secret, guardrails: GUARDRAILS });
}

/** Seconds remaining until the current window rolls over (1..30). */
export function codeExpiresIn(now = Date.now()): number {
  const windowStart = Math.floor(now / STEP_MS) * STEP_MS;
  return Math.ceil((windowStart + STEP_MS - now) / 1000);
}
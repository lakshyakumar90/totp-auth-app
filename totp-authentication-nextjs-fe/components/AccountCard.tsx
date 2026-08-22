"use client";

import { useEffect, useMemo, useState } from "react";
import CountdownRing from "./CountdownRing";
import { generateCode } from "@/lib/client/totp";
import { http } from "@/lib/client/api";
import type { AccountSummary, CodeResponse } from "@/lib/client/types";
import { issuerMeta, initialOf, fallbackColor } from "@/lib/client/issuers";

interface Props {
  account: AccountSummary;
  secret: string | null; // plaintext secret from the local vault (null -> server fallback)
}

const PERIOD_S = 30;

export default function AccountCard({ account, secret }: Props) {
  // Single source of truth: one clock tick per second. Everything else is
  // derived from it, so the code ALWAYS rolls over with the timer.
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const counter = Math.floor(now / (PERIOD_S * 1000));
  const remaining = PERIOD_S - (Math.floor(now / 1000) % PERIOD_S);

  // Local offline generation — recomputed whenever the time-step rolls over.
  const localCode = useMemo(() => {
    if (!secret) return null;
    try {
      return generateCode(secret);
    } catch {
      return null;
    }
  }, [secret, counter]);

  // Server fallback: used when there's no cached secret, OR when local
  // generation unexpectedly failed. Refetches once per window.
  const [serverCode, setServerCode] = useState<string | null>(null);
  const needsServer = !secret || localCode === null;
  useEffect(() => {
    if (!needsServer) return;
    let cancelled = false;
    http
      .get<CodeResponse>(`/api/accounts/${account.id}/code`)
      .then((res) => {
        if (!cancelled) setServerCode(res.code);
      })
      .catch(() => {
        if (!cancelled) setServerCode("—");
      });
    return () => {
      cancelled = true;
    };
  }, [needsServer, account.id, counter]);

  const code = secret ? (localCode ?? serverCode) : serverCode;

  async function copy() {
    if (!code || code === "—" || code.includes("·")) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  const meta = issuerMeta(account.issuer);
  const color = meta.color || fallbackColor(account.issuer);

  return (
    <div className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-5 hover:border-[#2a2a2e] transition fade-in">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          {meta.icon ? (
            <span className="text-xl leading-none">{meta.icon}</span>
          ) : (
            initialOf(account.issuer)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{account.issuer}</p>
          <p className="text-sm text-[#a1a1aa] truncate">{account.label}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={copy}
          className="group flex items-center gap-2 font-mono text-3xl tracking-[0.25em] text-white cursor-pointer select-all"
          title="Copy code"
        >
          <span className="tabular-nums">{code ?? "·····"}</span>
          <span className="text-xs text-[#6b6b70] group-hover:text-zinc-300 transition">
            {copied ? "✓ copied" : "⧉"}
          </span>
        </button>
        <CountdownRing seconds={remaining} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[#6b6b70]">
        <span>30s window</span>
        {!secret && (
          <span className="text-amber-400/80">
            {serverCode === "—" ? "offline · no cached secret" : "server fallback"}
          </span>
        )}
      </div>
    </div>
  );
}
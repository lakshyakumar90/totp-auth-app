"use client";

import { useState } from "react";
import Link from "next/link";
import { http } from "@/lib/client/api";
import { encryptSecret } from "@/lib/client/vault";
import { parseOtpauthUri } from "@/lib/client/totp";
import type { CreatedAccount } from "@/lib/client/types";

const STEPS = [
  "Open the mobile authenticator app",
  "Tap “Scan QR” and point it at the code above",
  "The app imports your unique secret and shows “Connected”",
  "Enter the 6-digit code from your phone below to verify the pairing",
];

type VerifyState = "idle" | "verifying" | "verified";

export default function TestPage() {
  const [deviceName, setDeviceName] = useState("My phone");
  const [account, setAccount] = useState<CreatedAccount | null>(null);
  const [codesSaved, setCodesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verification step state
  const [codeInput, setCodeInput] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Unique secret minted for THIS user + device, every time.
      const created = await http.post<CreatedAccount>("/api/accounts", {
        issuer: "Mobile Link",
        label: deviceName.trim() || "My phone",
      });
      const parsed = parseOtpauthUri(created.otpauthUri);
      if (parsed?.secret) {
        await encryptSecret(created.id, parsed.secret);
      }
      setAccount(created);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!account || codeInput.length !== 6) return;
    setVerifyError(null);
    setVerifyState("verifying");
    try {
      const res = await http.post<{ valid: boolean; reason?: string }>(
        "/api/verify",
        { accountId: account.id, code: codeInput },
      );
      if (res.valid) {
        setVerifyState("verified");
      } else {
        setVerifyState("idle");
        setCodeInput("");
        setVerifyError(
          res.reason === "replay"
            ? "That code was already used. Wait for the next one."
            : "Invalid or expired code. Check your phone and try again.",
        );
      }
    } catch (err) {
      setVerifyState("idle");
      setVerifyError((err as Error).message);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/85 backdrop-blur border-b border-[#2a2a2e]">
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-[#8b5cf6] inline-block transition group-hover:rotate-90">
              ◆
            </span>
            <span className="text-sm font-semibold tracking-wide text-[#f5f5f7]">
              VaultKey
            </span>
            <span className="ml-3 hidden sm:inline font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b70]">
              device pairing
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs uppercase tracking-[0.12em] text-[#a1a1aa] hover:text-[#8b5cf6] transition"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 py-12">
        <span className="eyebrow">pairing wizard</span>
        <h1 className="text-3xl font-medium tracking-tight text-[#f5f5f7] mt-5 mb-2">
          Test with your mobile app
        </h1>
        <p className="text-sm leading-6 text-[#a1a1aa] mb-10">
          Generate a pairing QR unique to your account, scan it with the mobile
          authenticator, then verify a code from your phone.
        </p>

        {!account ? (
          <form
            onSubmit={generate}
            className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6 space-y-4"
          >
            <label className="block">
              <span className="text-sm text-zinc-300">Device name</span>
              <input
                type="text"
                required
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Pixel 8"
                className="mt-1 w-full rounded-lg bg-[#0a0a0b] border border-[#2a2a2e] px-3 py-2.5 text-sm outline-none focus:border-[#8b5cf6] transition"
              />
            </label>

            {error && (
              <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-60 px-3 py-2.5 text-sm font-medium text-white transition"
            >
              {loading ? "Generating…" : "Generate pairing QR"}
            </button>
          </form>
        ) : (
          <div className="space-y-6 fade-in">
            {/* QR */}
            <div className="rounded-xl border border-[#2a2a2e] bg-[#141416] overflow-hidden">
              <div className="chrome-dots flex items-center gap-1.5 px-4 py-3 border-b border-[#2a2a2e]">
                <span />
                <span />
                <span />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b70]">
                  pairing.qr · unique to your account
                </span>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="bg-white rounded-xl p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={account.qrCode}
                    alt="Pairing QR code"
                    className="w-56 h-56"
                  />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6b70] text-center">
                  {account.issuer} · {account.label} — codes appear on your
                  dashboard once pairing is verified.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-xl border border-[#2a2a2e] bg-[#141416] p-6">
              <span className="eyebrow">procedure</span>
              <h2 className="font-semibold text-[#f5f5f7] mt-4 mb-4">
                Connect your phone
              </h2>
              <ol className="space-y-3">
                {STEPS.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-300">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Backup codes — shown once */}
            {!codesSaved ? (
              <div className="bg-[#141416] border border-amber-500/30 rounded-xl p-6">
                <span className="eyebrow" style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)" }}>
                  recovery
                </span>
                <h2 className="font-semibold text-amber-300 mt-4 mb-1">
                  Backup codes — save these now
                </h2>
                <p className="text-sm text-[#a1a1aa] mb-4">
                  Single-use codes if you lose your phone. They will never be
                  shown again.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {account.backupCodes.map((code) => (
                    <code
                      key={code}
                      className="font-mono text-xs bg-[#0a0a0b] border border-[#2a2a2e] rounded-lg px-3 py-2 text-zinc-300 text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={() => setCodesSaved(true)}
                  className="mt-5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition"
                >
                  I&apos;ve saved these
                </button>
              </div>
            ) : verifyState === "verified" ? (
              /* Success */
              <div className="bg-[#141416] border border-emerald-500/30 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-3">✅</div>
                <h2 className="text-lg font-semibold text-emerald-300">
                  Pairing verified!
                </h2>
                <p className="text-sm text-[#a1a1aa] mt-2">
                  The code from your phone matched this account. Your
                  authenticator is working end-to-end.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block mt-5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] px-5 py-2.5 text-sm font-medium text-white transition"
                >
                  Go to dashboard
                </Link>
              </div>
            ) : (
              /* Verify step */
              <form
                onSubmit={verify}
                className="bg-[#141416] border border-[#2a2a2e] rounded-xl p-6 space-y-4"
              >
                <div className="text-center">
                  <span className="eyebrow">challenge</span>
                  <h2 className="font-semibold text-[#f5f5f7] mt-4">
                    I&apos;ve linked it — now verify
                  </h2>
                  <p className="text-sm text-[#a1a1aa] mt-1">
                    Enter the 6-digit code you see on your phone right now.
                  </p>
                </div>

                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={codeInput}
                  onChange={(e) =>
                    setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  className="w-full text-center font-mono text-3xl tracking-[0.4em] rounded-lg bg-[#0a0a0b] border border-[#2a2a2e] px-3 py-3 outline-none focus:border-[#8b5cf6] transition"
                />

                {verifyError && (
                  <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {verifyError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifyState === "verifying" || codeInput.length !== 6}
                  className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2.5 text-sm font-medium text-white transition"
                >
                  {verifyState === "verifying" ? "Verifying…" : "Verify code"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
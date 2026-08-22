"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { http } from "@/lib/client/api";
import { encryptSecret, decryptSecret } from "@/lib/client/vault";
import { parseOtpauthUri, generateCode, codeExpiresIn } from "@/lib/client/totp";
import type { CreatedAccount, DemoStart, DemoFinish } from "@/lib/client/types";

type Step = "signin" | "setup" | "verify";

const REASONS: Record<string, string> = {
  invalid_code: "That code was invalid.",
  replay: "That code was already used.",
  invalid_or_used: "That code was invalid or already used.",
};

export default function DemoPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<CreatedAccount | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Live locally-generated code for the account created in this demo session.
  const [liveCode, setLiveCode] = useState("");
  const [expiresIn, setExpiresIn] = useState(30);
  const lastWindow = useRef(-1);
  const accountIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (step !== "setup" || !account) return;
    const tick = async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 30_000);
      setExpiresIn(codeExpiresIn(now));
      if (windowStart !== lastWindow.current) {
        lastWindow.current = windowStart;
        const secret = await decryptSecret(account.id);
        if (secret) setLiveCode(generateCode(secret));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, account]);

  async function onAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await http.post("/api/auth/signup", { email, password });
      }
      // Establish a real session so /api/accounts (auth-required) works.
      await http.post("/api/auth/login", { email, password });
      // Each demo user gets their OWN unique secret (never shared).
      const created = await http.post<CreatedAccount>("/api/accounts", {
        issuer: "Demo",
        label: email,
      });
      const parsed = parseOtpauthUri(created.otpauthUri);
      if (parsed?.secret) {
        await encryptSecret(created.id, parsed.secret);
      }
      accountIdRef.current = created.id;
      setAccount(created);
      setStep("setup");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function ensureLoginToken(): Promise<string> {
    if (loginToken) return loginToken;
    const start = await http.post<DemoStart>("/api/demo/login", {
      email,
      password,
    });
    setLoginToken(start.loginToken);
    return start.loginToken;
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setVerifyLoading(true);
    try {
      const token = await ensureLoginToken();
      const accountId = accountIdRef.current;
      if (!accountId) throw new Error("No account in this session");
      const res = await http.post<DemoFinish>("/api/demo/login/verify", {
        loginToken: token,
        accountId,
        code,
      });
      if (res.success) {
        router.push("/demo/success");
      } else {
        setVerifyError(REASONS[res.reason ?? ""] ?? "Verification failed.");
      }
    } catch (err) {
      setVerifyError((err as Error).message);
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md fade-in">
        <div className="mb-6 text-center">
          <span className="inline-block text-[11px] uppercase tracking-widest bg-slate-800 text-[#a1a1aa] rounded-full px-3 py-1 mb-4">
            Demo harness
          </span>
          <h1 className="text-2xl font-semibold text-white">
            Authenticator end-to-end test
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-2">
            Proves the 2FA loop works for <strong>your own</strong> unique
            secret — sign up, scan your QR, verify your code.
          </p>
        </div>

        {step === "signin" && (
          <div className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6 shadow-xl">
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-slate-800 text-zinc-300 hover:bg-slate-700"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-slate-800 text-zinc-300 hover:bg-slate-700"
                }`}
              >
                Log in
              </button>
            </div>

            <form onSubmit={onAuthSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm text-zinc-300">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#0a0a0b] border border-[#2a2a2e] px-3 py-2.5 text-sm outline-none focus:border-[#8b5cf6] transition"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-300">Password</span>
                <input
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#0a0a0b] border border-[#2a2a2e] px-3 py-2.5 text-sm outline-none focus:border-[#8b5cf6] transition"
                  placeholder="••••••••"
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
                {loading
                  ? "Creating your account…"
                  : mode === "signup"
                    ? "Create account + generate QR"
                    : "Log in + generate QR"}
              </button>
            </form>
          </div>
        )}

        {step === "setup" && account && (
          <div className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6 shadow-xl fade-in space-y-5">
            <div className="text-center">
              <p className="text-sm text-[#a1a1aa]">Step 1 — Your unique QR</p>
              <h2 className="font-semibold text-white mt-1">
                Scan this into your authenticator
              </h2>
              <p className="text-xs text-[#6b6b70] mt-1">
                This secret belongs only to{" "}
                <span className="text-zinc-300">{email}</span>.
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={account.qrCode}
                alt="Demo setup QR"
                className="w-52 h-52"
              />
            </div>

            <div className="bg-[#0a0a0b] border border-[#2a2a2e] rounded-xl p-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-[#6b6b70] mb-2">
                Your current code (generated on-device)
              </p>
              <p className="font-mono text-3xl tracking-[0.25em] text-white">
                {liveCode || "······"}
              </p>
              <p className="text-xs text-[#6b6b70] mt-2">
                New code in {expiresIn}s — this is what your authenticator
                should show.
              </p>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="w-full rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] px-3 py-2.5 text-sm font-medium text-white transition"
            >
              I&apos;ve linked it — continue
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6 shadow-xl fade-in space-y-5">
            <div className="text-center">
              <p className="text-sm text-[#a1a1aa]">Step 2 — Verify your code</p>
              <h2 className="font-semibold text-white mt-1">
                Enter your 6-digit code
              </h2>
              <p className="text-xs text-[#6b6b70] mt-1">
                From the authenticator you linked with the QR above.
              </p>
            </div>

            <form onSubmit={onVerify} className="space-y-4">
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
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
                disabled={verifyLoading || code.length !== 6}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2.5 text-sm font-medium text-white transition"
              >
                {verifyLoading ? "Verifying…" : "Verify code"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-[#6b6b70] mt-6">
          This is a test harness, not a product screen.{" "}
          <Link href="/login" className="text-[#a1a1aa] hover:underline">
            Back to the real app
          </Link>
        </p>
      </div>
    </main>
  );
}
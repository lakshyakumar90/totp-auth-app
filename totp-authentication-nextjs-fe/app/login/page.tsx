"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { http } from "@/lib/client/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await http.post("/api/auth/login", { email, password });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm fade-in">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Your one-time codes, generated on-device
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6 space-y-4 shadow-xl"
        >
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-[#a1a1aa] mt-6">
          New here?{" "}
          <Link href="/signup" className="text-[#8b5cf6] hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-[#6b6b70] mt-3">
          Just testing the loop?{" "}
          <Link href="/demo" className="text-[#a1a1aa] hover:underline">
            Open the demo harness
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
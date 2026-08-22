"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DemoSuccessPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center fade-in">
        <div className="bg-[#141416] border border-emerald-500/30 rounded-2xl p-10 shadow-xl">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-semibold text-white">
            You are successfully logged in
          </h1>
          <p className="text-emerald-400 mt-2">
            The authenticator is working fine.
          </p>
          <p className="text-xs text-[#6b6b70] mt-6">
            This page only exists to confirm the 2FA loop works end-to-end.
            Returning to the demo harness in {countdown}s…
          </p>
        </div>
        <Link
          href="/demo"
          className="inline-block mt-5 text-sm text-[#a1a1aa] hover:text-white transition"
        >
          ← Run the demo again
        </Link>
      </div>
    </main>
  );
}
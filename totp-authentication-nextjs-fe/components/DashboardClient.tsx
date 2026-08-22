"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountCard from "./AccountCard";
import { useOnline } from "./useOnline";
import { decryptSecret } from "@/lib/client/vault";
import type { AccountSummary } from "@/lib/client/types";

interface Props {
  initialAccounts: AccountSummary[];
}

export default function DashboardClient({ initialAccounts }: Props) {
  const [accounts] = useState<AccountSummary[]>(initialAccounts);
  const [secrets, setSecrets] = useState<Record<string, string | null>>({});
  const online = useOnline();

  useEffect(() => {
    let active = true;
    (async () => {
      const map: Record<string, string | null> = {};
      for (const acc of initialAccounts) {
        map[acc.id] = await decryptSecret(acc.id);
      }
      if (active) setSecrets(map);
    })();
    return () => {
      active = false;
    };
  }, [initialAccounts]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/85 backdrop-blur border-b border-[#2a2a2e]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-[#8b5cf6] inline-block transition group-hover:rotate-90">
              ◆
            </span>
            <span className="text-sm font-semibold tracking-wide text-[#f5f5f7]">
              VaultKey
            </span>
            <span className="ml-3 hidden sm:inline font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b70]">
              authenticator
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] rounded-full px-3 py-1 border ${
                online
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : "text-amber-400 border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  online ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {online ? "online" : "offline · codes still work"}
            </span>
            <Link
              href="/test"
              className="text-xs uppercase tracking-[0.12em] text-[#a1a1aa] hover:text-[#8b5cf6] transition"
            >
              Test with mobile
            </Link>
            <Link
              href="/settings"
              className="text-xs uppercase tracking-[0.12em] text-[#a1a1aa] hover:text-[#8b5cf6] transition"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="eyebrow">your vault</span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-medium tracking-tight text-[#f5f5f7]">
              Accounts{" "}
              <span className="font-mono text-base text-[#6b6b70]">
                ({accounts.length})
              </span>
            </h2>
          </div>
          <Link
            href="/test"
            className="inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition"
          >
            <span className="text-[10px]">◆</span> Connect device
          </Link>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#2a2a2e] rounded-2xl">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-zinc-300">No 2FA accounts yet.</p>
            <p className="text-sm text-[#6b6b70] mt-1">
              Connect your first device to start generating codes.
            </p>
            <Link
              href="/test"
              className="inline-block mt-5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] px-5 py-2.5 text-sm font-medium text-white transition"
            >
              Connect a device
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                secret={secrets[acc.id] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
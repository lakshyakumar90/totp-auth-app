"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { http } from "@/lib/client/api";
import { encryptSecret, deleteSecret } from "@/lib/client/vault";
import { parseOtpauthUri } from "@/lib/client/totp";
import type { AccountSummary, CreatedAccount } from "@/lib/client/types";

export default function SettingsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [newCodesFor, setNewCodesFor] = useState<string | null>(null);

  async function load() {
    try {
      const data = await http.get<AccountSummary[]>("/api/accounts");
      setAccounts(data);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteAccount(id: string) {
    if (!confirm("Delete this 2FA account? This cannot be undone.")) return;
    try {
      await http.del(`/api/accounts/${id}`);
      await deleteSecret(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** The backend has no "regenerate backup codes" endpoint, so recreate the
   * account (DELETE + POST) which issues a fresh secret + backup codes. */
  async function regenerate(acc: AccountSummary) {
    if (
      !confirm(
        `Regenerating backup codes for "${acc.issuer}" recreates the account with a new secret. You will need to re-scan the new QR. Continue?`,
      )
    ) {
      return;
    }
    try {
      await http.del(`/api/accounts/${acc.id}`);
      await deleteSecret(acc.id);
      const created = await http.post<CreatedAccount>("/api/accounts", {
        issuer: acc.issuer,
        label: acc.label,
      });
      const parsed = parseOtpauthUri(created.otpauthUri);
      if (parsed?.secret) {
        await encryptSecret(created.id, parsed.secret);
      }
      setAccounts((prev) => [
        ...prev.filter((a) => a.id !== acc.id),
        { id: created.id, issuer: created.issuer, label: created.label },
      ]);
      setNewCodes(created.backupCodes);
      setNewCodesFor(created.label);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    try {
      await http.post("/api/auth/logout", {});
    } catch {
      // even if the backend call fails, clear the local session
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="text-sm text-[#a1a1aa] hover:text-white transition"
        >
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-white mt-4 mb-6">
          Settings
        </h1>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {newCodes && (
          <div className="bg-[#141416] border border-emerald-500/30 rounded-2xl p-6 mb-6 fade-in">
            <h2 className="font-semibold text-emerald-300 mb-1">
              New backup codes for {newCodesFor}
            </h2>
            <p className="text-sm text-[#a1a1aa] mb-4">
              Save these now — they will not be shown again.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {newCodes.map((code) => (
                <code
                  key={code}
                  className="font-mono text-xs bg-[#0a0a0b] border border-[#2a2a2e] rounded-lg px-3 py-2 text-zinc-300 text-center"
                >
                  {code}
                </code>
              ))}
            </div>
            <button
              onClick={() => setNewCodes(null)}
              className="mt-5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition"
            >
              I&apos;ve saved these
            </button>
          </div>
        )}

        <section className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-4">Accounts</h2>
          {loading ? (
            <p className="text-sm text-[#6b6b70]">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-[#6b6b70]">No accounts yet.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between gap-3 bg-[#0a0a0b] border border-[#2a2a2e] rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {acc.issuer}
                    </p>
                    <p className="text-xs text-[#6b6b70] truncate">
                      {acc.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => regenerate(acc)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-zinc-300 rounded-lg px-3 py-1.5 transition"
                    >
                      Regenerate backup codes
                    </button>
                    <button
                      onClick={() => deleteAccount(acc.id)}
                      className="text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg px-3 py-1.5 transition"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-[#141416] border border-[#2a2a2e] rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-2">Session</h2>
          <p className="text-sm text-[#6b6b70] mb-4">
            Sign out of this device. Your 2FA secrets remain encrypted on this
            device.
          </p>
          <button
            onClick={logout}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium text-white transition"
          >
            Log out
          </button>
        </section>
      </div>
    </main>
  );
}
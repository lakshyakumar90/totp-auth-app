import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { api, setSessionExpiredHandler } from '@/lib/api';
import { clearTokens, getTokens, readAccounts, readSettings, setTokens, writeAccounts, writeSettings } from '@/lib/vault';
import { generateCode, parseOtpAuthUri } from '@/lib/totp';
import type { Account } from '@/lib/types';

type SelfCheckResult = {
  checked: number;
  driftSteps: number | null;
};

type AuthContextValue = {
  token: string | null;
  accounts: Account[];
  locked: boolean;
  hydrated: boolean;
  busy: boolean;
  error: string | null;
  login: (email: string, password: string, signup?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setLocked: (value: boolean) => Promise<void>;
  sync: () => Promise<void>;
  addAccount: (account: Pick<Account, 'issuer' | 'label'>) => Promise<{ backupCodes: string[]; qrCode: string; account: Account }>;
  /** Import a scanned otpauth:// URI. Links the secret to the matching server
   * account when exactly one candidate exists; otherwise stores device-local. */
  pairAccount: (parsed: ReturnType<typeof parseOtpAuthUri>) => Promise<{ account: Account; linked: boolean }>;
  removeAccount: (id: string) => Promise<void>;
  /** Verify our locally-generated code against the server to detect clock drift. */
  selfCheck: () => Promise<SelfCheckResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function newLocalId() {
  return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [locked, setLockedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [tokens, cached, settings] = await Promise.all([getTokens(), readAccounts(), readSettings()]);
      setTokenState(tokens?.accessToken ?? null);
      setAccounts(cached);
      setLockedState(settings.locked);
      setHydrated(true);
      if (tokens?.accessToken) {
        try { await syncAccounts(setAccounts); } catch {}
      }
    })();
  }, []);

  // When the session is definitively revoked/expired (refresh rejected with
  // 401/403), route to login and clear protected state. Network blips never
  // trigger this — only the api layer's definitive rejection does.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setTokenState(null);
      setAccounts([]);
      writeAccounts([]);
      router.replace('/auth/login');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = async (email: string, password: string, signup = false) => {
    setBusy(true); setError(null);
    try {
      if (signup) {
        await api.signup(email, password);
      }
      const nextTokens = await api.login(email, password);
      await setTokens(nextTokens);
      setTokenState(nextTokens.accessToken);
      await syncAccounts(setAccounts);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect to VaultKey');
      throw e;
    } finally { setBusy(false); }
  };

  const logout = async () => {
    try { if (token) await api.logout(); } catch {}
    // Wipe tokens AND the cached vault so a different user on this device
    // never sees the previous user's accounts or secrets.
    await clearTokens();
    await writeAccounts([]);
    setTokenState(null);
    setAccounts([]);
    router.replace('/');
  };

  const unlock = async () => {
    if (typeof LocalAuthentication.authenticateAsync !== 'function') return true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock VaultKey', fallbackLabel: 'Use device passcode' });
    return result.success;
  };

  const setLocked = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) throw new Error('Set up Face ID or fingerprint in your device settings first.');
    }
    setLockedState(value);
    await writeSettings({ locked: value, theme: 'dark' });
  };

  const sync = async () => {
    setBusy(true); setError(null);
    try { await syncAccounts(setAccounts); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sync unavailable'); throw e; }
    finally { setBusy(false); }
  };

  const addAccount = async (account: Pick<Account, 'issuer' | 'label'>) => {
    setBusy(true); setError(null);
    try {
      const created = await api.create(account);
      const parsed = parseOtpAuthUri(created.otpauthUri);
      const nextAccount: Account = { id: created.id, issuer: created.issuer, label: created.label, secret: parsed.secret, algorithm: parsed.algorithm, digits: parsed.digits, period: parsed.period };
      setAccounts(prev => {
        const next = [...prev, nextAccount];
        writeAccounts(next);
        return next;
      });
      return { backupCodes: created.backupCodes, qrCode: created.qrCode, account: nextAccount };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account');
      throw e;
    } finally { setBusy(false); }
  };

  const pairAccount = async (parsed: ReturnType<typeof parseOtpAuthUri>) => {
    setBusy(true); setError(null);
    try {
      const listed = await api.list();
      const cached = await readAccounts();

      // Idempotent: if this exact secret is already on the device (linked or
      // device-local), don't create anything — just report it.
      const already = cached.find(a => a.secret === parsed.secret);
      if (already) {
        return { account: already, linked: !already.localOnly };
      }

      // Link to a matching server account that has no local secret yet.
      // When several match (e.g. the web wizard was run twice), converge on
      // the FIRST one instead of spawning a duplicate device-local copy.
      const candidates = listed.filter(
        a =>
          !cached.some(c => c.id === a.id && !!c.secret) &&
          a.issuer === parsed.issuer &&
          a.label === parsed.label,
      );

      let nextAccount: Account;
      let linked = false;
      if (candidates.length >= 1) {
        const target = candidates[0];
        nextAccount = { ...target, secret: parsed.secret, algorithm: parsed.algorithm, digits: parsed.digits, period: parsed.period };
        linked = true;
      } else {
        nextAccount = {
          id: newLocalId(),
          issuer: parsed.issuer,
          label: parsed.label,
          secret: parsed.secret,
          algorithm: parsed.algorithm,
          digits: parsed.digits,
          period: parsed.period,
          localOnly: true,
        };
      }

      setAccounts(prev => {
        // Drop any older duplicates holding the same secret (rescans),
        // then upsert the canonical account.
        const kept = prev.filter(a => a.secret !== parsed.secret && a.id !== nextAccount.id);
        const next = [...kept, nextAccount];
        writeAccounts(next);
        return next;
      });
      return { account: nextAccount, linked };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import this QR code');
      throw e;
    } finally { setBusy(false); }
  };

  const removeAccount = async (id: string) => {
    // Device-local accounts aren't on the server; tolerate 403/404 and always
    // remove locally so deletion never gets stuck.
    try { await api.remove(id); }
    catch (e) {
      const status = (e as Error & { status?: number }).status;
      if (status !== 403 && status !== 404) throw e;
    }
    setAccounts(prev => {
      const next = prev.filter(account => account.id !== id);
      writeAccounts(next);
      return next;
    });
  };

  const selfCheck = async (): Promise<SelfCheckResult> => {
    const withSecret = accounts.filter(a => a.secret && !a.localOnly).slice(0, 3);
    let driftSteps: number | null = null;
    let checked = 0;
    for (const account of withSecret) {
      try {
        const res = await api.verify(account.id, generateCode(account));
        checked++;
        if (res.valid && res.delta != null && res.delta !== 0) {
          driftSteps = res.delta;
          break;
        }
      } catch {}
    }
    return { checked, driftSteps };
  };

  const value = useMemo(() => ({ token, accounts, locked, hydrated, busy, error, login, logout, unlock, setLocked, sync, addAccount, pairAccount, removeAccount, selfCheck }), [token, accounts, locked, hydrated, busy, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Merge the server list with locally-cached secrets WITHOUT dropping
 * device-only accounts (e.g. QR imports that had no server counterpart).
 * Also collapses duplicates holding the SAME secret (rescans, pre-fix
 * pairing runs) so the home screen never shows the same code twice.
 */
async function syncAccounts(setAccounts: (accounts: Account[]) => void) {
  const [listed, cached] = await Promise.all([api.list(), readAccounts()]);
  const byId = new Map(cached.map(a => [a.id, a]));

  const merged: Account[] = listed.map(server => {
    const local = byId.get(server.id);
    return local
      ? { ...server, secret: local.secret, algorithm: local.algorithm, digits: local.digits, period: local.period, localOnly: local.localOnly }
      : server;
  });

  // Preserve local-only accounts the server doesn't know about.
  const serverIds = new Set(listed.map(a => a.id));
  for (const local of cached) {
    if (!serverIds.has(local.id)) merged.push(local);
  }

  // Dedupe: keep the first account per unique secret (linked server accounts
  // come first, so device-local twins of a linked account get dropped).
  const seenSecrets = new Set<string>();
  const deduped = merged.filter(a => {
    if (!a.secret) return true; // unpaired accounts can't collide by secret
    if (seenSecrets.has(a.secret)) return false;
    seenSecrets.add(a.secret);
    return true;
  });

  setAccounts(deduped);
  await writeAccounts(deduped);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
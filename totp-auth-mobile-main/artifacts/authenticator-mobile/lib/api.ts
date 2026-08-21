import type { Account, PublicAccount } from './types';
import { clearTokens, getTokens, setTokens } from './vault';

const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
type TokenPair = { accessToken: string; refreshToken: string; accessTokenExpiresIn: string };
type ApiError = { message?: string };
let refreshPromise: Promise<boolean> | null = null;

/** Called when the session is definitively revoked/expired so the app can
 * route back to login and clear protected state. */
type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler;
}

async function rawRequest<T>(path: string, options: RequestInit, accessToken?: string) {
  let response: Response;
  try {
    response = await fetch(base + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    // Network-level failure (offline, server down) — NOT an auth problem.
    const error = new Error('You appear to be offline. Reconnect and try again.');
    (error as Error & { status?: number; network?: boolean }).network = true;
    throw error;
  }
  if (!response.ok) {
    let message = 'Request failed';
    try { message = ((await response.json()) as ApiError).message || message; } catch {}
    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

/**
 * Returns:
 *  - 'ok'      -> tokens refreshed, retry the original request
 *  - 'invalid' -> refresh token definitively rejected (expired/revoked)
 *  - 'network' -> couldn't reach the server; keep tokens, retry later
 */
async function refreshAccessToken(): Promise<'ok' | 'invalid' | 'network'> {
  if (refreshPromise) {
    return (await refreshPromise) ? 'ok' : 'invalid';
  }
  refreshPromise = (async () => {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) return false;
    try {
      const next = await rawRequest<TokenPair>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      await setTokens(next);
      return true;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      // Only a definitive rejection ends the session. A network blip must
      // never sign the user out.
      if (status === 401 || status === 403) {
        await clearTokens();
        return false;
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  try {
    return (await refreshPromise) ? 'ok' : 'invalid';
  } catch {
    return 'network';
  }
}

function sessionEnded() {
  sessionExpiredHandler?.();
}

async function authenticatedRequest<T>(path: string, options: RequestInit = {}) {
  const tokens = await getTokens();
  if (!tokens?.accessToken) throw new Error('Your session has expired. Please sign in again.');
  try {
    return await rawRequest<T>(path, options, tokens.accessToken);
  } catch (error) {
    const err = error as Error & { status?: number; network?: boolean };
    if (err.network) throw error;
    if (err.status !== 401) throw error;

    const refreshed = await refreshAccessToken();
    if (refreshed === 'network') {
      throw new Error('You appear to be offline. Reconnect and try again.');
    }
    if (refreshed === 'invalid') {
      sessionEnded();
      throw new Error('Your session has expired. Please sign in again.');
    }
    const next = await getTokens();
    if (!next?.accessToken) {
      sessionEnded();
      throw new Error('Your session has expired. Please sign in again.');
    }
    return rawRequest<T>(path, options, next.accessToken);
  }
}

export const api = {
  signup: (email: string, password: string) => rawRequest<{ id: string; email: string }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => rawRequest<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => authenticatedRequest<void>('/auth/logout', { method: 'POST' }),
  list: () => authenticatedRequest<PublicAccount[]>('/accounts'),
  create: (account: Pick<Account, 'issuer' | 'label'>) => authenticatedRequest<{ id: string; issuer: string; label: string; otpauthUri: string; qrCode: string; backupCodes: string[] }>('/accounts', { method: 'POST', body: JSON.stringify(account) }),
  remove: (id: string) => authenticatedRequest<{ success: true }>('/accounts/' + encodeURIComponent(id), { method: 'DELETE' }),
  /** Server-side code generation — fallback when no secret is cached locally. */
  serverCode: (id: string) => authenticatedRequest<{ code: string; expiresInSeconds: number }>('/accounts/' + encodeURIComponent(id) + '/code'),
  /** Verify a code against the server. Returns delta (in steps) on success,
   * which we use to detect device clock drift. */
  verify: (accountId: string, code: string) => authenticatedRequest<{ valid: boolean; delta?: number; reason?: string }>('/verify', { method: 'POST', body: JSON.stringify({ accountId, code }) }),
};
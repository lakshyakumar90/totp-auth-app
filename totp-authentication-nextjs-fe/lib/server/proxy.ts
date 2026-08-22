import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_COOKIE = process.env.AUTH_COOKIE_NAME ?? "at_token";
export const REFRESH_COOKIE = "rt_token";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000/api";
const ACCESS_MAX_AGE = 15 * 60; // 15m
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7d

export interface BackendResponse {
  status: number;
  body: unknown;
}

/**
 * Forward a request to the NestJS backend, automatically attaching the
 * httpOnly access-token cookie and transparently refreshing it on 401.
 */
export async function proxyBackend(
  path: string,
  init: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response = await fetch(`${BACKEND_URL}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  // On 401, attempt a single refresh-and-retry using the refresh cookie.
  if (response.status === 401 && refreshToken) {
    const refreshed = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (refreshed.ok) {
      const tokens = (await refreshed.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      response = await fetch(`${BACKEND_URL}${path}`, {
        method: init.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: "no-store",
      });

      const out = new NextResponse(await response.text(), {
        status: response.status,
      });
      setAuthCookies(out, tokens.accessToken, tokens.refreshToken);
      return out;
    }
  }

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return NextResponse.json(body ?? null, { status: response.status });
}

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** True when an httpOnly access-token cookie is present. */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(ACCESS_COOKIE)?.value);
}
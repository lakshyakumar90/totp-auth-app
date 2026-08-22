import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/proxy";
import type { AuthTokens } from "@/lib/client/types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000/api";

export async function POST(req: Request) {
  const body = await req.json();
  const backend = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await backend.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!backend.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? "Login failed";
    return NextResponse.json({ message }, { status: backend.status });
  }

  const tokens = data as AuthTokens;
  const res = NextResponse.json({ email: (body as { email: string }).email });
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  return res;
}
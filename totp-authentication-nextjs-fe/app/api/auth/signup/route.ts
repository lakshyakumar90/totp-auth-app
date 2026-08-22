import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000/api";

export async function POST(req: Request) {
  const body = await req.json();
  const backend = await fetch(`${BACKEND_URL}/auth/signup`, {
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
      (data as { message?: string } | null)?.message ?? "Signup failed";
    return NextResponse.json({ message }, { status: backend.status });
  }

  return NextResponse.json(data);
}
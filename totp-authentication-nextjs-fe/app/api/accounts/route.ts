import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "@/lib/server/proxy";

export async function GET() {
  return proxyBackend("/accounts");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyBackend("/accounts", { method: "POST", body });
}
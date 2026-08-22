import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "@/lib/server/proxy";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyBackend("/demo/login", { method: "POST", body });
}
import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "@/lib/server/proxy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackend(`/accounts/${id}/code`);
}
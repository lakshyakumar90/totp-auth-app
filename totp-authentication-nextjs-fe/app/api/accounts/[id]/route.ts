import { NextRequest, NextResponse } from "next/server";
import { proxyBackend } from "@/lib/server/proxy";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackend(`/accounts/${id}`, { method: "DELETE" });
}
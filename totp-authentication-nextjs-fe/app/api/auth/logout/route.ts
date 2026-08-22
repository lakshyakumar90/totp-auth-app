import { NextResponse } from "next/server";
import { proxyBackend, clearAuthCookies } from "@/lib/server/proxy";

export async function POST() {
  const proxied = await proxyBackend("/auth/logout", { method: "POST" });
  // Clear the httpOnly cookies regardless of backend outcome.
  const res =
    proxied.status === 200
      ? NextResponse.json({ success: true })
      : NextResponse.json(
          { message: "Logout failed" },
          { status: proxied.status },
        );
  clearAuthCookies(res);
  return res;
}
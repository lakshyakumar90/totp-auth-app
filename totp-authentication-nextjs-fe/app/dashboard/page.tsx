import { redirect } from "next/navigation";
import { proxyBackend, hasSession } from "@/lib/server/proxy";
import DashboardClient from "@/components/DashboardClient";
import type { AccountSummary } from "@/lib/client/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await hasSession())) {
    redirect("/login");
  }

  const proxied = await proxyBackend("/accounts");
  if (proxied.status === 401 || proxied.status === 403) {
    redirect("/login");
  }
  const accounts = (await proxied.json()) as AccountSummary[];

  return <DashboardClient initialAccounts={accounts} />;
}
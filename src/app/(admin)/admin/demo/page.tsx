import { redirect } from "next/navigation";
import { DemoAdmin } from "@/components/admin/DemoAdmin";
import { demoSummary } from "@/lib/db/demo";
import { rawSql } from "@/lib/db";
import { adminCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo data" };

export default async function Page() {
  const me = await adminCaller("settings.edit"); // Super Admin only, checked on the server
  if (!me) redirect("/admin/not-allowed");
  const summary = await demoSummary(async (text, params) => [...(await rawSql().unsafe(text, (params ?? []) as never[]))] as Record<string, unknown>[]);
  return <DemoAdmin summary={summary} />;
}

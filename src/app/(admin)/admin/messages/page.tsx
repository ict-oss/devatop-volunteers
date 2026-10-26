import { redirect } from "next/navigation";
import { MessagesAdmin } from "@/components/admin/MessagesAdmin";
import { MessagesProto } from "./MessagesProto";
import { authEnabled, emailEnabled } from "@/lib/env";
import { activeDepartments } from "@/lib/services/public";
import { emailLogRows, getMessagingSettings, listTemplates } from "@/lib/services/messaging";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!authEnabled()) return <MessagesProto />;
  const me = await adminCaller("email.bulk"); // rule 1
  if (!me) redirect("/admin/not-allowed");
  const d = await asCaller(me.caller, async (tx) => ({ templates: await listTemplates(tx), settings: await getMessagingSettings(tx), log: await emailLogRows(tx), departments: await activeDepartments(tx) }));
  return <MessagesAdmin templates={d.templates} settings={d.settings} log={d.log} departments={d.departments.map((x) => ({ id: x.id, name: x.name }))} emailOn={emailEnabled()} />;
}

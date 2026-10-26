import { redirect } from "next/navigation";
import { AdminsAdmin } from "@/components/admin/AdminsAdmin";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";
import { activeDepartments, allProgrammes } from "@/lib/services/public";
import { adminsRaw, nameAdmins } from "@/lib/services/users";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admins" };

export default async function Page() {
  const me = await adminCaller("admins.manage"); // rule 1: Super Admin only, checked on the server
  if (!me) redirect("/admin/not-allowed");
  const d = await asCaller(me.caller, async (tx) => ({ raw: await adminsRaw(tx), programmes: await allProgrammes(tx), departments: await activeDepartments(tx) }));
  const admins = await nameAdmins(trusted(), d.raw); // emails, on the trusted connection, after the admin's own queries have finished
  return <AdminsAdmin admins={admins} meId={me.caller.sub} programmes={d.programmes} departments={d.departments.map((x) => ({ id: x.id, name: x.name }))} />;
}

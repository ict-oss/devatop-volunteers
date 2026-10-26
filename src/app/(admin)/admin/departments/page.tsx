import { redirect } from "next/navigation";
import { adminCaller, asCaller } from "@/lib/server/caller";

export const dynamic = "force-dynamic";
import { DepartmentsAdmin } from "@/components/admin/DepartmentsAdmin";
import { listDepartments } from "@/lib/services/departments";

export const metadata = { title: "Departments" };

export default async function Page() {
  const me = await adminCaller("departments.assign"); // viewing; changing needs departments.manage (checked again in every action)
  if (!me) redirect("/admin/not-allowed");
  return <DepartmentsAdmin departments={await asCaller(me.caller, (tx) => listDepartments(tx))} />;
}

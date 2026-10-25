import { sql } from "drizzle-orm";
import { z } from "zod";
import { AppError, guard, rowsOf, type Db } from "./db";

/**
 * Departments are rows, never code (rule 10). A Super Admin can add, rename, archive, restore and merge them at any time,
 * so Devatop's structure can grow or shrink with no developer. History (members, hours, certificates, guides) is never lost.
 */
export type DepartmentRow = { id: string; name: string; description: string; status: "active" | "archived"; mergedIntoId: string | null; sortOrder: number; members: number };

export async function listDepartments(db: Db): Promise<DepartmentRow[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`
    select d.id, d.name, coalesce(d.description, '') as description, d.status, d.merged_into_id, d.sort_order,
           (select count(*) from department_memberships m where m.department_id = d.id and m.status = 'active')::int as members
    from departments d order by (d.status = 'archived'), d.sort_order, d.name`))
    .map((r) => ({ id: String(r.id), name: String(r.name), description: String(r.description), status: r.status as DepartmentRow["status"], mergedIntoId: (r.merged_into_id as string | null) ?? null, sortOrder: Number(r.sort_order), members: Number(r.members) }));
}

export const departmentSchema = z.object({ name: z.string().trim().min(2, "Give it a name.").max(80), description: z.string().trim().max(200).default("") });
export type DepartmentInput = z.infer<typeof departmentSchema>;

export async function addDepartment(db: Db, input: DepartmentInput): Promise<{ id: string }> {
  return guard(async () => {
    const r = rowsOf<{ id: string }>(await db.execute(sql`
      insert into departments (name, description, sort_order) values (${input.name}, ${input.description || null}, (select coalesce(max(sort_order), 0) + 1 from departments)) returning id`));
    return { id: r[0].id };
  });
}
export async function editDepartment(db: Db, id: string, input: DepartmentInput): Promise<void> {
  const r = await guard(async () => rowsOf(await db.execute(sql`update departments set name = ${input.name}, description = ${input.description || null} where id = ${id}::uuid returning id`)));
  if (r.length === 0) throw new AppError("forbidden", "You are not allowed to change departments.");
}
/** Archive: hidden from the application form and new calls; history stays. Refused while it still has active members. */
export async function archiveDepartment(db: Db, id: string): Promise<void> {
  const r = await guard(async () => rowsOf(await db.execute(sql`update departments set status = 'archived' where id = ${id}::uuid and status = 'active' returning id`)));
  if (r.length === 0) throw new AppError("not_found", "That department is already archived, or you may not change it.");
}
export async function restoreDepartment(db: Db, id: string): Promise<void> {
  const r = await guard(async () => rowsOf(await db.execute(sql`update departments set status = 'active', merged_into_id = null where id = ${id}::uuid and status = 'archived' returning id`)));
  if (r.length === 0) throw new AppError("not_found", "That department is already active, or you may not change it.");
}
/** Moves members, calls, guides and application interests across, then archives the old one. Returns how many members moved. */
export async function mergeDepartments(db: Db, from: string, into: string): Promise<number> {
  return guard(async () => Number(rowsOf<{ n: number }>(await db.execute(sql`select public.merge_departments(${from}::uuid, ${into}::uuid) as n`))[0].n));
}
/** Only for a department that never had members, calls, guides, applications or certificates. */
export async function deleteUnusedDepartment(db: Db, id: string): Promise<void> {
  const r = await guard(async () => rowsOf(await db.execute(sql`delete from departments where id = ${id}::uuid returning id`)));
  if (r.length === 0) throw new AppError("not_found", "We could not find that department, or you may not delete it.");
}

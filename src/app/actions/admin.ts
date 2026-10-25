"use server";
import { z } from "zod";
import { recordAttendanceHours, qrSecret, setPresent } from "@/lib/services/attendance";
import { issueCertificate } from "@/lib/services/certificates";
import { addDepartment, archiveDepartment, deleteUnusedDepartment, departmentSchema, editDepartment, mergeDepartments, restoreDepartment } from "@/lib/services/departments";
import { approvedTotal, decideHours, editPendingHours, hourEmailTarget } from "@/lib/services/hours";
import { createOpportunity, opportunitySchema, setOpportunityPublished, updateOpportunity } from "@/lib/services/opportunities";
import { sendTemplateEmail } from "@/lib/email/notify";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";
import { fail, ok, run, type Result } from "@/lib/server/action";
import { publicEnv } from "@/lib/env";
import type { Action } from "@/lib/permissions";

/** Every admin action: checked on the server for its exact permission (rule 1), then run AS the admin so scope and the database rules apply. */
async function asAdmin<T>(action: Action, fn: (c: NonNullable<Awaited<ReturnType<typeof adminCaller>>>) => Promise<Result<T>>): Promise<Result<T>> {
  return run(async () => {
    const me = await adminCaller(action);
    if (!me) return fail("forbidden", "You are not allowed to do that.");
    return fn(me);
  });
}
const uuid = z.uuid();
const fieldErrors = (e: z.ZodError) => fail("invalid", e.issues[0]?.message ?? "Check the form.", Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? "form"), i.message])));

/* ---------------------------------------------------------------- opportunities */
export const createOpportunityAction = async (raw: unknown) => asAdmin("opportunities.edit", async (me) => {
  const p = opportunitySchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  return ok(await asCaller(me.caller, (tx) => createOpportunity(tx, p.data)));
});
export const updateOpportunityAction = async (id: string, raw: unknown) => asAdmin("opportunities.edit", async (me) => {
  const p = opportunitySchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  await asCaller(me.caller, (tx) => updateOpportunity(tx, uuid.parse(id), p.data));
  return ok();
});
export const setPublishedAction = async (id: string, published: boolean) => asAdmin("opportunities.edit", async (me) => {
  await asCaller(me.caller, (tx) => setOpportunityPublished(tx, uuid.parse(id), !!published));
  return ok();
});

/* ---------------------------------------------------------------- hours */
const decision = z.object({ ids: z.array(uuid).min(1).max(100), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(300).optional() });
export const decideHoursAction = async (raw: unknown) => asAdmin("hours.approve", async (me) => {
  const input = decision.parse(raw);
  const r = await asCaller(me.caller, (tx) => decideHours(tx, input.ids, input.decision, input.note));
  if (input.decision === "approved") {
    const site = publicEnv().NEXT_PUBLIC_SITE_URL;
    for (const id of r.done) {
      const who = await hourEmailTarget(trusted(), id);
      if (!who) continue;
      await sendTemplateEmail(trusted(), { template: "thanks", to: who.email, toName: who.first, userId: who.userId, siteUrl: site,
        vars: { first_name: who.first, hours: who.hours, opportunity_title: who.activity, total_hours: await approvedTotal(trusted(), who.userId), record_link: `${site}/hours` } });
    }
  }
  return ok({ done: r.done, refused: r.refused });
});
export const editHoursAction = async (id: string, hours: number) => asAdmin("hours.approve", async (me) => {
  await asCaller(me.caller, (tx) => editPendingHours(tx, uuid.parse(id), Number(hours)));
  return ok();
});

/* ---------------------------------------------------------------- attendance */
export const qrSecretAction = async (oppId: string) => asAdmin("attendance.take", async (me) => {
  const secret = await asCaller(me.caller, (tx) => qrSecret(tx, uuid.parse(oppId)));
  return secret ? ok({ secret }) : fail("not_found", "You may not take attendance for this call.");
});
export const setPresentAction = async (oppId: string, userId: string, present: boolean) => asAdmin("attendance.take", async (me) => {
  await asCaller(me.caller, (tx) => setPresent(tx, uuid.parse(oppId), uuid.parse(userId), !!present, me.caller.sub));
  return ok();
});
export const saveAttendanceAction = async (oppId: string, hoursEach: number) => asAdmin("attendance.take", async (me) => ok({ added: await asCaller(me.caller, (tx) => recordAttendanceHours(tx, uuid.parse(oppId), Number(hoursEach))) }));

/* ---------------------------------------------------------------- certificates */
export const issueCertificateAction = async (userId: string, roleTitle?: string) => asAdmin("certificates.issue", async (me) =>
  ok(await asCaller(me.caller, (tx) => issueCertificate(tx, uuid.parse(userId), roleTitle))));

/* ---------------------------------------------------------------- departments (Super Admin) */
export const addDepartmentAction = async (raw: unknown) => asAdmin("departments.manage", async (me) => {
  const p = departmentSchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  return ok(await asCaller(me.caller, (tx) => addDepartment(tx, p.data)));
});
export const editDepartmentAction = async (id: string, raw: unknown) => asAdmin("departments.manage", async (me) => {
  const p = departmentSchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  await asCaller(me.caller, (tx) => editDepartment(tx, uuid.parse(id), p.data)); return ok();
});
export const archiveDepartmentAction = async (id: string) => asAdmin("departments.manage", async (me) => { await asCaller(me.caller, (tx) => archiveDepartment(tx, uuid.parse(id))); return ok(); });
export const restoreDepartmentAction = async (id: string) => asAdmin("departments.manage", async (me) => { await asCaller(me.caller, (tx) => restoreDepartment(tx, uuid.parse(id))); return ok(); });
export const mergeDepartmentsAction = async (from: string, into: string) => asAdmin("departments.manage", async (me) => ok({ moved: await asCaller(me.caller, (tx) => mergeDepartments(tx, uuid.parse(from), uuid.parse(into))) }));
export const deleteDepartmentAction = async (id: string) => asAdmin("departments.manage", async (me) => { await asCaller(me.caller, (tx) => deleteUnusedDepartment(tx, uuid.parse(id))); return ok(); });

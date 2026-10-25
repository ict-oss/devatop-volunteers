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
import { logExport, personalExport } from "@/lib/services/reports";
import { audienceFor, audienceSchema, bulkSchema, deliverBulk, MAX_BULK, recordMessage, resetTemplate, saveMessagingSettings, saveTemplate, settingsSchema, templateSchema } from "@/lib/services/messaging";
import type { TemplateId } from "@/lib/emails";
import { removeSiteImage, saveSchema as siteSaveSchema, saveSiteImage } from "@/lib/services/siteImages";
import { fileSize, removeFiles, uploadTokens } from "@/lib/server/storage";
import { slotKind } from "@/lib/siteImages";

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

/* ---------------------------------------------------------------- messages */
const TEMPLATE_IDS = ["received", "guardian", "needs_info", "approved", "not_approved", "reminder", "thanks"] as const;

export const saveSettingsAction = async (raw: unknown) => asAdmin("settings.edit", async (me) => {
  const p = settingsSchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  await asCaller(me.caller, (tx) => saveMessagingSettings(tx, p.data)); return ok();
});
export const saveTemplateAction = async (id: string, raw: unknown) => asAdmin("settings.edit", async (me) => {
  const tid = z.enum(TEMPLATE_IDS).parse(id) as TemplateId;
  const p = templateSchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  await asCaller(me.caller, (tx) => saveTemplate(tx, tid, p.data)); return ok();
});
export const resetTemplateAction = async (id: string) => asAdmin("settings.edit", async (me) => {
  await asCaller(me.caller, (tx) => resetTemplate(tx, z.enum(TEMPLATE_IDS).parse(id) as TemplateId)); return ok();
});
export const audienceCountAction = async (raw: unknown) => asAdmin("email.bulk", async (me) => {
  const a = audienceSchema.parse(raw);
  return ok({ count: (await asCaller(me.caller, (tx) => audienceFor(tx, a))).length, max: MAX_BULK });
});
export const sendBulkAction = async (raw: unknown) => asAdmin("email.bulk", async (me) => {
  const p = bulkSchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  const recipients = await asCaller(me.caller, (tx) => audienceFor(tx, p.data.audience));
  if (recipients.length === 0) return fail("no_recipients", "Nobody matches these filters.");
  if (recipients.length > MAX_BULK) return fail("too_many", `That is ${recipients.length} people. Send to at most ${MAX_BULK} at a time: narrow it by state or department.`);
  const result = await deliverBulk(trusted(), recipients, p.data.subject, p.data.body);
  await asCaller(me.caller, (tx) => recordMessage(tx, me.caller.sub, p.data, result.sent));
  return ok(result);
});

/* ---------------------------------------------------------------- reports and exports */

/** Contact-detail export: Super Admin only, and always written to the audit log (counts only). */
export const exportPersonalAction = async (format: "csv" | "xlsx") => asAdmin("export.personal", async (me) => {
  const rows = await asCaller(me.caller, (tx) => personalExport(tx));
  await logExport(trusted(), me.caller.sub, "export.personal", { volunteers: rows.length, format: format === "xlsx" ? "xlsx" : "csv" });
  return ok({ rows });
});
export const logReportExportAction = async (format: "csv" | "xlsx" | "pdf", groupBy: string) => asAdmin("reports.export", async (me) => {
  await logExport(trusted(), me.caller.sub, "export.report", { format, groupBy: String(groupBy).slice(0, 20) });
  return ok();
});

/* ---------------------------------------------------------------- site images and clips (Admin > Site images, Super Admin only) */
const slotInput = z.object({ slotId: z.string().max(60), ext: z.enum(["mp4", "webm"]).optional() });
/** Step 1: the browser asks where to put the file. Names are made here, so it cannot choose its own. */
export const prepareSiteImageAction = async (raw: unknown) => asAdmin("settings.edit", async () => {
  const { slotId, ext } = slotInput.parse(raw);
  const kind = slotKind(slotId);
  if (!kind) return fail("invalid", "That picture place does not exist.");
  const stamp = Date.now();
  if (kind === "video" && !ext) return fail("invalid", "Use an MP4 or WebM clip.");
  const paths = kind === "photo" ? [`photos/${slotId}-${stamp}.webp`] : [`videos/${slotId}-${stamp}.${ext}`, `videos/${slotId}-${stamp}.jpg`];
  return ok(await uploadTokens(paths));
});
/** Step 2: the file is uploaded; record it. The size is measured here and the person who confirmed consent is recorded. */
export const saveSiteImageAction = async (raw: unknown) => asAdmin("settings.edit", async (me) => {
  const p = siteSaveSchema.safeParse(raw); if (!p.success) return fieldErrors(p.error);
  const sizes = await Promise.all([p.data.path, p.data.posterPath].filter((x): x is string => !!x).map(fileSize));
  if (sizes.some((s) => s === null)) return fail("invalid", "The upload did not finish. Please try again.");
  const total = (sizes as number[]).reduce((a, b) => a + b, 0);
  let replaced: string[];
  try { replaced = await asCaller(me.caller, (tx) => saveSiteImage(tx, me.caller.sub, p.data, total)); }
  catch (e) { await removeFiles([p.data.path, p.data.posterPath].filter((x): x is string => !!x)); throw e; }
  await removeFiles(replaced);
  return ok();
});
/** Back to the original picture or clip. */
export const resetSiteImageAction = async (raw: unknown) => asAdmin("settings.edit", async (me) => {
  const { slotId } = slotInput.parse(raw);
  await removeFiles(await asCaller(me.caller, (tx) => removeSiteImage(tx, slotId)));
  return ok();
});

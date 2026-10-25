"use server";
import { z } from "zod";
import { checkIn, checkOut, myAttendance, type MyAttendance } from "@/lib/services/attendance";
import { logRemoteHours, remoteHoursSchema } from "@/lib/services/hours";
import { cancelSignup, signUp } from "@/lib/services/opportunities";
import { deleteMyAccountData, exportMyData, markGuideRead, profileSchema, updateMyProfile } from "@/lib/services/profile";
import { supabaseService } from "@/lib/auth/supabase-service";
import { dismissReport, postMessage, removeMessage, reportMessage, reportedMessages, roomMessages, type ChatMsg } from "@/lib/services/chat";
import { asCaller, getCaller } from "@/lib/server/caller";
import { fail, ok, run, signedOut, type Result } from "@/lib/server/action";

const id = z.uuid();
const secret = z.string().regex(/^[0-9a-f]{32}$/, "That QR code is not valid.");

export async function signUpAction(oppId: string): Promise<Result<{ status: "confirmed" | "waitlisted" }>> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    const status = await asCaller(me, (tx) => signUp(tx, me.sub, id.parse(oppId)));
    return ok({ status });
  });
}
export async function cancelSignupAction(oppId: string): Promise<Result> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    await asCaller(me, (tx) => cancelSignup(tx, me.sub, id.parse(oppId)));
    return ok();
  });
}
export async function logHoursAction(raw: unknown): Promise<Result> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    const input = remoteHoursSchema.safeParse(raw);
    if (!input.success) return fail("invalid", input.error.issues[0]?.message ?? "Check the hours you entered.");
    await asCaller(me, (tx) => logRemoteHours(tx, me.sub, input.data));
    return ok();
  });
}

/** The volunteer's check-in screen: where they stand for this call. */
export async function attendanceAction(oppId: string): Promise<Result<MyAttendance>> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    return ok(await asCaller(me, (tx) => myAttendance(tx, me.sub, id.parse(oppId))));
  });
}
export async function checkInAction(oppId: string, qrSecret: string): Promise<Result<MyAttendance>> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    const o = id.parse(oppId), s = secret.parse(qrSecret);
    return ok(await asCaller(me, async (tx) => { await checkIn(tx, o, s); return myAttendance(tx, me.sub, o); }));
  });
}
export async function checkOutAction(oppId: string, qrSecret: string): Promise<Result<MyAttendance & { hours: number }>> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    const o = id.parse(oppId), s = secret.parse(qrSecret);
    return ok(await asCaller(me, async (tx) => { const hours = await checkOut(tx, o, s); return { ...(await myAttendance(tx, me.sub, o)), hours }; }));
  });
}

/* ---------------------------------------------------------------- profile, data, guides */

export async function updateProfileAction(raw: unknown): Promise<Result> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    const p = profileSchema.safeParse(raw);
    if (!p.success) return fail("invalid", p.error.issues[0]?.message ?? "Check your details.", Object.fromEntries(p.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])));
    await asCaller(me, (tx) => updateMyProfile(tx, me.sub, p.data));
    return ok();
  });
}
export async function downloadMyDataAction(): Promise<Result<{ json: string }>> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    return ok({ json: JSON.stringify(await asCaller(me, (tx) => exportMyData(tx, me.sub)), null, 2) });
  });
}
export async function markGuideReadAction(guideId: string): Promise<Result> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    await asCaller(me, (tx) => markGuideRead(tx, me.sub, id.parse(guideId)));
    return ok();
  });
}
/** Withdraw consent and delete everything: the database function first, then the sign-in itself (the one job that needs the service role). */
export async function deleteAccountAction(): Promise<Result> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    await asCaller(me, (tx) => deleteMyAccountData(tx));
    const { error } = await supabaseService().auth.admin.deleteUser(me.sub);
    if (error) return fail("partial", "Your data is deleted, but we could not remove your sign-in. Please contact Devatop so we can finish it.");
    return ok();
  });
}

/* ---------------------------------------------------------------- chat (volunteers and admins; the database decides each room's access) */

const room = z.string().min(1).max(80);
export async function chatLoadAction(r: string): Promise<Result<ChatMsg[]>> {
  return run(async () => { const me = await getCaller(); if (!me) return signedOut(); return ok(await asCaller(me, (tx) => roomMessages(tx, me.sub, room.parse(r)))); });
}
export async function chatReportedAction(): Promise<Result<ChatMsg[]>> {
  return run(async () => { const me = await getCaller(); if (!me) return signedOut(); return ok(await asCaller(me, (tx) => reportedMessages(tx, me.sub))); });
}
export async function chatSendAction(r: string, body: string): Promise<Result> {
  return run(async () => { const me = await getCaller(); if (!me) return signedOut(); await asCaller(me, (tx) => postMessage(tx, me.sub, room.parse(r), String(body))); return ok(); });
}
export async function chatModerateAction(kind: "report" | "dismiss" | "remove", messageId: string): Promise<Result> {
  return run(async () => {
    const me = await getCaller(); if (!me) return signedOut();
    const mid = id.parse(messageId);
    await asCaller(me, (tx) => (kind === "report" ? reportMessage(tx, mid) : kind === "dismiss" ? dismissReport(tx, mid) : removeMessage(tx, mid)));
    return ok();
  });
}

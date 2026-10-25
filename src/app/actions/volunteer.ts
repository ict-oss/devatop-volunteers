"use server";
import { z } from "zod";
import { checkIn, checkOut, myAttendance, type MyAttendance } from "@/lib/services/attendance";
import { logRemoteHours, remoteHoursSchema } from "@/lib/services/hours";
import { cancelSignup, signUp } from "@/lib/services/opportunities";
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

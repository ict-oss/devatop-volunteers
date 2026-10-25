"use server";
import { applicationSchema, guardianSchema } from "@/lib/validation/application";
import { createGuardianRequest, guardianDecide, guardianState, replyToMoreInfo, saveApplicantDetails, submitApplication, type GuardianState } from "@/lib/services/applications";
import { sendTemplateEmail } from "@/lib/email/notify";
import { asCaller, asVisitor, getCaller, trusted } from "@/lib/server/caller";
import { fail, ok, run, signedOut, type Result } from "@/lib/server/action";
import { publicEnv } from "@/lib/env";

/** Submit the application. The email address comes from the verified session, never from the form. */
export async function submitApplicationAction(raw: unknown): Promise<Result> {
  return run(async () => {
    const me = await getCaller();
    if (!me?.email) return signedOut();
    const input = applicationSchema.parse(raw);
    await asCaller(me, (tx) => submitApplication(tx, me.sub, me.email!, input));
    await sendTemplateEmail(trusted(), { template: "received", to: me.email, toName: input.first, userId: me.sub, vars: { first_name: input.first }, siteUrl: publicEnv().NEXT_PUBLIC_SITE_URL });
    return ok();
  });
}

/** Under-18: save their details, then email the parent or guardian a one-time link. */
export async function requestGuardianAction(raw: { application: unknown; guardian: unknown }): Promise<Result<{ emailed: boolean }>> {
  return run(async () => {
    const me = await getCaller();
    if (!me?.email) return signedOut();
    const input = applicationSchema.parse(raw.application);
    const g = guardianSchema.parse(raw.guardian);
    const { token } = await asCaller(me, async (tx) => { await saveApplicantDetails(tx, me.sub, me.email!, input); return createGuardianRequest(tx, me.sub, g); });
    const site = publicEnv().NEXT_PUBLIC_SITE_URL;
    const status = await sendTemplateEmail(trusted(), { template: "guardian", to: g.email, toName: g.name, userId: me.sub, vars: { applicant_first_name: input.first, consent_link: `${site}/guardian-consent/${token}` }, siteUrl: site });
    if (status !== "sent") return fail("email_failed", "We could not send the email to your guardian. Check the address and try again.");
    return ok({ emailed: true });
  });
}

export async function guardianStatusAction(): Promise<Result<GuardianState>> {
  return run(async () => {
    const me = await getCaller();
    if (!me) return signedOut();
    return ok(await asCaller(me, (tx) => guardianState(tx, me.sub)));
  });
}

/** The guardian (not signed in) answers from the emailed link. */
export async function decideGuardianAction(token: string, decision: "given" | "refused"): Promise<Result> {
  return run(async () => {
    if (typeof token !== "string" || token.length < 20 || token.length > 200 || (decision !== "given" && decision !== "refused")) return fail("invalid", "This link is not valid.");
    await asVisitor((tx) => guardianDecide(tx, token, decision));
    return ok();
  });
}

/** The applicant answers "needs more information": the application goes back to the review queue. */
export async function replyNeedsInfoAction(text: string): Promise<Result> {
  return run(async () => {
    const me = await getCaller();
    if (!me) return signedOut();
    await asCaller(me, (tx) => replyToMoreInfo(tx, me.sub, String(text)));
    return ok();
  });
}

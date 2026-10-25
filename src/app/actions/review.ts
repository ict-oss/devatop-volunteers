"use server";
import { z } from "zod";
import { applicantEmailTarget, decideApplication } from "@/lib/services/review";
import { sendTemplateEmail } from "@/lib/email/notify";
import { adminCaller, asCaller, trusted } from "@/lib/server/caller";
import { fail, ok, run, type Result } from "@/lib/server/action";
import { publicEnv } from "@/lib/env";

const schema = z.object({ ids: z.array(z.uuid()).min(1).max(50), decision: z.enum(["approved", "rejected", "needs_info"]), note: z.string().trim().max(500).optional() });
const REAPPLY_DAYS = 90;

/** Approve, reject or ask for more information. The database enforces the age, guardian and scope rules; this sends the matching email. */
export async function decideApplicationsAction(raw: unknown): Promise<Result<{ done: number; refused: { id: string; message: string }[] }>> {
  return run(async () => {
    const input = schema.parse(raw);
    const me = await adminCaller("applications.decide");
    if (!me) return fail("forbidden", "You are not allowed to do that.");
    const site = publicEnv().NEXT_PUBLIC_SITE_URL;
    const refused: { id: string; message: string }[] = [];
    let done = 0;
    for (const id of input.ids) {
      const r = await asCaller(me.caller, (tx) => decideApplication(tx, id, input.decision, input.note));
      if (!r.ok) { refused.push({ id, message: r.message }); continue; }
      done++;
      const who = await applicantEmailTarget(trusted(), id);
      if (!who) continue;
      const reapply = new Date(Date.now() + REAPPLY_DAYS * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const common = { to: who.email, toName: who.first, userId: who.userId, siteUrl: site };
      if (input.decision === "approved") await sendTemplateEmail(trusted(), { ...common, template: "approved", vars: { first_name: who.first } });
      else if (input.decision === "needs_info") await sendTemplateEmail(trusted(), { ...common, template: "needs_info", vars: { first_name: who.first, admin_note: input.note ?? "" } });
      else await sendTemplateEmail(trusted(), { ...common, template: "not_approved", vars: { first_name: who.first, reason: input.note ? `: ${input.note}` : "", reapply_date: reapply } });
    }
    return ok({ done, refused });
  });
}

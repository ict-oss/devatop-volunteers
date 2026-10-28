import { and, desc, eq, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import * as s from "../db/schema";
import { CONSENTS, CONSENT_KIND, REQUIRED_CONSENTS } from "../consent-texts";
import type { ApplicationInput } from "../validation/application";
import { AppError, guard, rowsOf, type Db } from "./db";

/**
 * Step 3: the application, on the real database. Every function runs inside `asUser()` so row-level security
 * and the database rules (age, guardian, consents) apply exactly as for any other request.
 */

/**
 * Saves the person's details (profile, contact, date of birth). Used by submit and by the guardian request, because the
 * guardian's page needs the applicant's first name before the application itself can be submitted.
 */
export async function saveApplicantDetails(db: Db, userId: string, email: string, input: ApplicationInput): Promise<void> {
  return guard(async () => {
    // a date of birth, once given, is never silently changed (a minor must not become an adult after the guardian check)
    const [priv] = await db.select().from(s.volunteerPrivate).where(eq(s.volunteerPrivate.userId, userId));
    if (priv && priv.dateOfBirth !== input.dob) throw new AppError("dob_locked", "");

    await db.insert(s.volunteerProfiles).values({
      userId, firstName: input.first, lastName: input.last, state: input.state, lga: input.lga,
      skills: input.skills, languages: input.languages, availability: input.availability, heardFrom: input.heard || null,
    }).onConflictDoUpdate({ target: s.volunteerProfiles.userId, set: {
      firstName: input.first, lastName: input.last, state: input.state, lga: input.lga,
      skills: input.skills, languages: input.languages, availability: input.availability, heardFrom: input.heard || null,
    } });
    await db.insert(s.volunteerContacts).values({ userId, email, phone: input.phone })
      .onConflictDoUpdate({ target: s.volunteerContacts.userId, set: { email, phone: input.phone } });
    await db.insert(s.volunteerPrivate).values({ userId, dateOfBirth: input.dob, occupation: input.occupation || null, nyscStateCode: input.nysc || null })
      .onConflictDoUpdate({ target: s.volunteerPrivate.userId, set: { occupation: input.occupation || null, nyscStateCode: input.nysc || null } });
  });
}

export async function submitApplication(db: Db, userId: string, email: string, input: ApplicationInput): Promise<{ applicationId: string }> {
  const agreed = new Set(input.consents);
  if (!REQUIRED_CONSENTS.every((k) => agreed.has(k))) throw new AppError("required_consents_missing", "Please tick the three required agreements.");
  await saveApplicantDetails(db, userId, email, input);

  return guard(async () => {
    // rule 8: each ticked consent is stored with the exact wording and its version (append-only; skip one already on record)
    for (const c of CONSENTS.filter((c) => agreed.has(c.key))) {
      const kind = CONSENT_KIND[c.key];
      const [last] = await db.select().from(s.consents).where(and(eq(s.consents.userId, userId), eq(s.consents.kind, kind))).orderBy(desc(s.consents.createdAt)).limit(1);
      if (last && last.action === "given" && last.textVersion === c.version) continue;
      await db.insert(s.consents).values({ userId, kind, action: "given", textVersion: c.version, textSnapshot: c.text });
    }

    // the database refuses here if: under the minimum age, under 18 without a verified guardian, or consents missing
    const [app] = await db.insert(s.applications).values({ userId }).returning({ id: s.applications.id });
    if (input.departmentIds.length) await db.insert(s.applicationDepartments).values(input.departmentIds.map((departmentId) => ({ applicationId: app.id, departmentId })));
    return { applicationId: app.id };
  });
}

/** Where the signed-in applicant's application stands (their own row only). */
export async function myApplication(db: Db, userId: string) {
  const [app] = await db.select().from(s.applications).where(eq(s.applications.userId, userId)).orderBy(desc(s.applications.submittedAt)).limit(1);
  const [profile] = await db.select().from(s.volunteerProfiles).where(eq(s.volunteerProfiles.userId, userId));
  return { application: app ?? null, profile: profile ?? null };
}

/** After "needs more information": the applicant answers and the application goes back to the review queue (the only stage change an applicant may make). */
export async function replyToMoreInfo(db: Db, userId: string, reply: string): Promise<void> {
  const text = reply.trim();
  if (text.length < 3) throw new AppError("invalid", "Write your answer first.");
  const r = await guard(async () => rowsOf(await db.execute(sql`
    update applications set answers = answers || jsonb_build_object('reply', ${text.slice(0, 1000)}::text), stage = 'submitted'
    where user_id = ${userId}::uuid and stage = 'needs_info' returning id`)));
  if (r.length === 0) throw new AppError("not_found", "There is nothing waiting for your answer.");
}

/* ---------------------------------------------------------------- guardian (an email link; the guardian is not logged in) */
const sha256 = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");
export const MAX_GUARDIAN_REQUESTS_PER_DAY = 5;

/** Creates the request and returns the secret token to put in the emailed link. Only a hash is stored. */
export async function createGuardianRequest(db: Db, userId: string, g: { name: string; email: string }): Promise<{ token: string }> {
  const recent = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from guardian_requests where user_id = ${userId} and created_at > now() - interval '24 hours'`))[0]?.n ?? 0;
  if (recent >= MAX_GUARDIAN_REQUESTS_PER_DAY) throw new AppError("too_many_requests", "You have sent several requests today. Please wait, or check that your guardian's email is right.");
  const token = randomBytes(32).toString("base64url");
  await guard(() => db.insert(s.guardianRequests).values({ userId, guardianName: g.name, guardianContact: g.email, tokenHash: sha256(token) }));
  return { token };
}

export type GuardianState = { requested: boolean; decision: "pending" | "given" | "refused" | null; expired: boolean; verified: boolean };
/** For the applicant's own page: has the guardian answered yet? */
export async function guardianState(db: Db, userId: string): Promise<GuardianState> {
  const [r] = await db.select().from(s.guardianRequests).where(eq(s.guardianRequests.userId, userId)).orderBy(desc(s.guardianRequests.createdAt)).limit(1);
  const verified = rowsOf<{ v: boolean }>(await db.execute(sql`select public.has_verified_guardian(${userId}::uuid) as v`))[0]?.v ?? false;
  if (!r) return { requested: false, decision: null, expired: false, verified };
  return { requested: true, decision: r.decision, expired: r.decision === "pending" && r.expiresAt.getTime() < Date.now(), verified };
}

/** The guardian's page (anonymous): the minimum needed to show it. Null if the link is unknown. */
export async function guardianLinkInfo(db: Db, token: string) {
  const r = rowsOf<{ applicant_first_name: string; guardian_name: string; decision: "pending" | "given" | "refused"; expired: boolean }>(
    await db.execute(sql`select * from public.guardian_request_info(${token})`))[0];
  return r ? { applicantFirstName: r.applicant_first_name, guardianName: r.guardian_name, decision: r.decision, expired: r.expired } : null;
}

export async function guardianDecide(db: Db, token: string, decision: "given" | "refused"): Promise<void> {
  try { await db.execute(sql`select public.record_guardian_decision(${token}, ${decision}::guardian_decision)`); }
  catch (e) {
    const m = ((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message) || "";
    if (/unknown_link/.test(m)) throw new AppError("unknown_link", "This link is not valid.");
    if (/already_decided/.test(m)) throw new AppError("already_decided", "This request has already been answered.");
    if (/link_expired/.test(m)) throw new AppError("link_expired", "This link has expired. Ask the applicant to send a new one.");
    throw e;
  }
}

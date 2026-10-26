import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "../db/schema";

/** Any Drizzle database or transaction on our schema (postgres-js in production, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** `execute()` returns an array with postgres-js and `{ rows }` with PGlite. */
export const rowsOf = <T = Record<string, unknown>>(r: unknown): T[] => (Array.isArray(r) ? r : (r as { rows: T[] }).rows) as T[];

/** The services throw this: a stable `code` the pages can react to and a plain-language `message` that is safe to show (rule 5: no personal data). */
export class AppError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "AppError"; }
}

const FRIENDLY: Record<string, string> = {
  below_minimum_age: "Sorry, you are below the minimum age to volunteer.",
  under_18_needs_guardian_consent: "A parent or guardian must confirm before you can submit.",
  required_consents_missing: "Please tick the three required agreements.",
  already_applied: "You have already applied. Check your dashboard for the status.",
  dob_locked: "Your date of birth is already on record and can only be corrected by Devatop. Please contact us.",
  application_closed: "This application can no longer be edited.",
  signup_closed: "Sign-ups for this call have closed.",
  only_active_volunteers: "Only approved volunteers can do this.",
  forbidden: "You are not allowed to do that.",
  invalid_qr: "That QR code is not valid. Ask the coordinator to show it again.",
  outside_event_window: "Check-in is only open around the time of the event.",
  not_checked_in: "You have not checked in yet.",
  already_checked_out: "You have already checked out.",
  hours_approval_needs_admin: "Only an admin can approve hours.",
  not_found: "We could not find that.",
  own_hours: "You cannot decide your own hours.",
  department_has_active_members: "This department still has active members. Merge it into another department, or move them first.",
  department_has_history: "This department has history (members, calls or guides), so it cannot be deleted. Archive or merge it instead.",
  duplicate_name: "A department with that name already exists.",
  no_approved_hours: "This volunteer has no approved hours yet.",
  at_least_two_super_admins: "Devatop must always have at least two Super Admins, so this change is not allowed. Add another Super Admin first.",
  role_needs_scope: "This role needs a state, programme or department. Pick one.",
  not_signed_up: "That person has no account yet. Ask them to create one at /signup with that email address, then add them here.",
  own_admin_role: "You cannot change or remove your own admin role. Ask another Super Admin.",
  bad_status: "That status cannot be set here.",
  too_big: "That file is too big. Pick a smaller one.",
  certificate_needs_approved_hours: "Certificates can only be issued for approved hours.",
};
export const friendly = (code: string) => FRIENDLY[code] ?? "Something went wrong. Please try again.";

/** Drizzle wraps Postgres errors ("Failed query: ...") and keeps the real message in `cause`. */
export const dbMessage = (e: unknown): string => {
  const x = e as { cause?: { message?: string }; message?: string };
  return x?.cause?.message ?? x?.message ?? "";
};

const RULES: [RegExp, string][] = [
  [/below_minimum_age/, "below_minimum_age"],
  [/under_18_needs_guardian_consent/, "under_18_needs_guardian_consent"],
  [/required_consents_missing/, "required_consents_missing"],
  [/app_one_open_per_user/, "already_applied"],
  [/date of birth can only be corrected/, "dob_locked"],
  [/application can no longer be edited/, "application_closed"],
  [/signup_closed/, "signup_closed"],
  [/invalid_qr/, "invalid_qr"], [/outside_event_window/, "outside_event_window"], [/not_checked_in/, "not_checked_in"], [/already_checked_out/, "already_checked_out"],
  [/you cannot decide your own hours/, "own_hours"],
  [/certificate_needs_approved_hours/, "certificate_needs_approved_hours"],
  [/department_has_active_members/, "department_has_active_members"], [/department_has_history/, "department_has_history"],
  [/departments_name_key|duplicate key value violates unique constraint "departments/, "duplicate_name"],
  [/only_active_volunteers/, "only_active_volunteers"],
  [/at_least_two_super_admins/, "at_least_two_super_admins"],
  [/state_lead_needs_state|programme_manager_needs_programme|department_lead_needs_department/, "role_needs_scope"],
  [/permission denied|not allowed|42501|only a reviewer|only an admin|only a moderator|row-level security/i, "forbidden"],
];
/** Turn a database rule violation into an AppError; anything unexpected is re-thrown untouched (and never shown to the person). */
export function asAppError(e: unknown): unknown {
  if (e instanceof AppError) return e;
  const m = dbMessage(e);
  for (const [re, code] of RULES) if (re.test(m)) return new AppError(code, friendly(code));
  return e;
}
export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) { throw asAppError(e); }
}

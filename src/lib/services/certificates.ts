import { sql } from "drizzle-orm";
import { AppError, guard, rowsOf, type Db } from "./db";

/**
 * Certificates are built from APPROVED hours only. The database refuses anything else (rule 7), refuses edits after issue,
 * and only lets an admin issue one for a volunteer inside their scope. Revoking is the only later change.
 */
export type CertificateView = {
  id: string; code: string; holderName: string; roleTitle: string | null; hours: number; periodStart: string; periodEnd: string; issuedAt: string; revoked: boolean;
};
type Row = Record<string, unknown>;
const view = (r: Row): CertificateView => ({
  id: String(r.id), code: String(r.code), holderName: String(r.holder_name), roleTitle: (r.role_title as string | null) ?? null, hours: Number(r.hours),
  periodStart: String(r.period_start).slice(0, 10), periodEnd: String(r.period_end).slice(0, 10), issuedAt: new Date(r.issued_at as string).toISOString(), revoked: !!r.revoked_at,
});
const COLS = sql`id, code, holder_name, role_title, hours, period_start::text, period_end::text, issued_at, revoked_at`;

export async function myCertificates(db: Db, userId: string): Promise<CertificateView[]> {
  return rowsOf<Row>(await db.execute(sql`select ${COLS} from certificates where user_id = ${userId}::uuid and revoked_at is null order by issued_at desc`)).map(view);
}
/** By code: visible to the owner and to admins who may issue (row-level security); anyone else gets nothing. */
export async function certificateByCode(db: Db, code: string): Promise<CertificateView | null> {
  const r = rowsOf<Row>(await db.execute(sql`select ${COLS} from certificates where code = ${code.trim().toUpperCase()} and revoked_at is null`))[0];
  return r ? view(r) : null;
}

/** The public check: only that it is genuine, with name, hours and dates. Nothing else about the person. */
export type PublicCertificate = { holderName: string; hours: number; periodStart: string; periodEnd: string };
export async function verifyCertificate(db: Db, code: string): Promise<PublicCertificate | null> {
  if (!/^[A-Z0-9-]{6,24}$/i.test(code.trim())) return null;
  const r = rowsOf<Row>(await db.execute(sql`select holder_name, hours, period_start::text, period_end::text from public.verify_certificate(${code})`))[0];
  return r ? { holderName: String(r.holder_name), hours: Number(r.hours), periodStart: String(r.period_start).slice(0, 10), periodEnd: String(r.period_end).slice(0, 10) } : null;
}

/** Volunteers in the admin's scope who have approved hours, with whether their current total already has a certificate. */
export type Candidate = { userId: string; name: string; approvedHours: number; periodStart: string; periodEnd: string; certified: boolean };
export async function certificateCandidates(db: Db): Promise<Candidate[]> {
  return rowsOf<Row>(await db.execute(sql`
    select h.user_id, vp.first_name || ' ' || vp.last_name as name, sum(h.hours) as hours, min(h.worked_on)::text as p1, max(h.worked_on)::text as p2,
           exists (select 1 from certificates c where c.user_id = h.user_id and c.revoked_at is null and abs(c.hours - sum(h.hours)) < 0.05) as certified
    from hour_logs h join volunteer_profiles vp on vp.user_id = h.user_id
    where h.status = 'approved' and h.user_id is not null and public.has_perm('certificates.issue') and public.in_scope(h.user_id)
    group by h.user_id, vp.first_name, vp.last_name order by vp.first_name, vp.last_name`))
    .map((r) => ({ userId: String(r.user_id), name: String(r.name), approvedHours: Number(r.hours), periodStart: String(r.p1), periodEnd: String(r.p2), certified: !!r.certified }));
}

/** Issue a certificate for ALL of a volunteer's approved hours so far. Idempotent: if one already covers exactly these hours, it is returned. */
export async function issueCertificate(db: Db, userId: string, roleTitle?: string): Promise<{ code: string; created: boolean }> {
  return guard(async () => {
    if (!rowsOf<{ ok: boolean }>(await db.execute(sql`select public.has_perm('certificates.issue') as ok`))[0]?.ok) throw new AppError("forbidden", "You are not allowed to issue certificates.");
    const c = rowsOf<Row>(await db.execute(sql`
      select sum(h.hours) as hours, min(h.worked_on)::text as p1, max(h.worked_on)::text as p2 from hour_logs h
      where h.user_id = ${userId}::uuid and h.status = 'approved'`))[0];
    if (!c || c.hours === null) throw new AppError("no_approved_hours", "This volunteer has no approved hours yet.");
    const hours = Number(c.hours);
    const dup = rowsOf<{ code: string }>(await db.execute(sql`select code from certificates where user_id = ${userId}::uuid and revoked_at is null and abs(hours - ${hours}) < 0.05 limit 1`))[0];
    if (dup) return { code: dup.code, created: false };
    const name = rowsOf<{ n: string }>(await db.execute(sql`select first_name || ' ' || last_name as n from volunteer_profiles where user_id = ${userId}::uuid`))[0]?.n;
    if (!name) throw new AppError("not_found", "We could not find that volunteer, or they are outside your area.");
    const r = rowsOf<{ code: string }>(await db.execute(sql`
      insert into certificates (user_id, holder_name, role_title, hours, period_start, period_end)
      values (${userId}::uuid, ${name}, ${roleTitle?.trim().slice(0, 80) || null}, ${hours}, ${String(c.p1)}::date, ${String(c.p2)}::date) returning code`));
    return { code: r[0].code, created: true };
  });
}

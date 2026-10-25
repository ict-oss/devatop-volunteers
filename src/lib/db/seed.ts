import { SEED_DEPARTMENTS, SEED_GUIDES, SEED_PROGRAMMES, SEED_SETTINGS, SEED_TEMPLATES, SEED_TRAININGS } from "./seed-data";

/** Bump when the starting data changes shape. Stored in app_settings so a database is only ever seeded once. */
export const SEED_VERSION = 1;

export type Statement = { text: string; params: unknown[] };

/**
 * The SQL that fills a brand-new database. Runs once: if `seed_version` exists the database has already been seeded,
 * and re-running does nothing, so a Super Admin's edits (renamed departments, a pasted WhatsApp link) are never undone.
 * Pure: it only builds statements, so the tests and `npm run db:seed` run exactly the same SQL.
 */
export function seedStatements(): Statement[] {
  const s: Statement[] = [];
  SEED_PROGRAMMES.forEach((name) => s.push({ text: "insert into programmes (name) values ($1) on conflict (name) do nothing", params: [name] }));
  SEED_DEPARTMENTS.forEach((d, i) => s.push({ text: "insert into departments (name, description, sort_order) values ($1, $2, $3) on conflict (name) do nothing", params: [d.name, d.description, i + 1] }));
  SEED_TRAININGS.forEach((t) => s.push({ text: "insert into trainings (name, required, renew_after_days) values ($1, $2, $3) on conflict (name) do nothing", params: [t.name, t.required, t.renewAfterDays] }));
  SEED_TEMPLATES.forEach((t) => s.push({ text: "insert into email_templates (id, subject, body) values ($1, $2, $3) on conflict (id) do nothing", params: [t.id, t.subject, t.body] }));
  Object.entries(SEED_SETTINGS).forEach(([k, v]) => s.push({ text: "insert into app_settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing", params: [k, JSON.stringify(v)] }));
  SEED_GUIDES.forEach((g, i) => s.push({
    text: "insert into guides (title, body, audience, sort_order, published, must_read) select $1, $2, $3::guide_audience, $4, $5, $6 where not exists (select 1 from guides where title = $1)",
    params: [g.title, g.body.join("\n\n"), g.audience, i + 1, g.published, !!g.mustRead],
  }));
  return s;
}

type Run = (text: string, params?: unknown[]) => Promise<{ rows?: unknown[] } | unknown[]>;
const count = (r: Awaited<ReturnType<Run>>) => (Array.isArray(r) ? r : r.rows ?? []).length;

/** Seeds once. Returns true if it seeded, false if the database was already seeded. */
export async function seedOnce(run: Run): Promise<boolean> {
  if (count(await run("select 1 from app_settings where key = 'seed_version'")) > 0) return false;
  for (const st of seedStatements()) await run(st.text, st.params);
  await run("insert into app_settings (key, value) values ('seed_version', $1::jsonb)", [JSON.stringify(SEED_VERSION)]);
  return true;
}

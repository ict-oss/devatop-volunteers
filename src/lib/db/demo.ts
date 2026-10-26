/**
 * TEMPORARY demo volunteers, so a new site shows numbers and a full Admin section while Devatop is previewing it.
 * Every demo person has an email ending in DEMO_DOMAIN, so `removeDemo` finds exactly them and nothing else.
 * They count in the public home numbers like real volunteers: remove them before telling anyone the figures are real.
 * Run with `npm run db:demo` and `npm run db:demo:remove`.
 */
export const DEMO_DOMAIN = "demo.devatop.invalid";
type Run = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const PEOPLE: { first: string; last: string; state: string; lga: string; skills: string[]; hours: number[]; depts: string[] }[] = [
  { first: "Amaka", last: "Obi", state: "Lagos", lga: "Yaba", skills: ["Design", "Social media"], hours: [4, 6, 3, 5], depts: ["Communications and Media"] },
  { first: "Tunde", last: "Ajayi", state: "Lagos", lga: "Ikeja", skills: ["Event support"], hours: [5, 5, 4], depts: ["Events and Logistics"] },
  { first: "Hadiza", last: "Bello", state: "Kano", lga: "Fagge", skills: ["Translation", "Counselling"], hours: [6, 5, 5], depts: ["Talkam"] },
  { first: "Chidi", last: "Eze", state: "Enugu", lga: "Enugu North", skills: ["Photography", "Video"], hours: [8, 4], depts: ["Communications and Media"] },
  { first: "Ngozi", last: "Udeh", state: "Anambra", lga: "Awka South", skills: ["Teaching"], hours: [4, 4, 3], depts: ["AI4Rights"] },
  { first: "Ibrahim", last: "Sani", state: "FCT Abuja", lga: "Gwagwalada", skills: ["Data", "Research"], hours: [5, 6, 4], depts: ["Policy and Research", "ICT"] },
  { first: "Funke", last: "Balogun", state: "Lagos", lga: "Eti-Osa", skills: ["Design"], hours: [3, 3], depts: ["Communications and Media"] },
  { first: "Emeka", last: "Nwosu", state: "Rivers", lga: "Port Harcourt", skills: ["Public speaking"], hours: [6, 6, 5], depts: ["Programmes and Field Outreach"] },
  { first: "Zainab", last: "Yusuf", state: "Kaduna", lga: "Kaduna South", skills: ["Teaching", "Writing"], hours: [4, 5], depts: ["AI4Rights"] },
  { first: "Seun", last: "Adeleke", state: "Oyo", lga: "Ibadan North", skills: ["Web / tech"], hours: [5, 3, 4], depts: ["ICT"] },
];

export async function demoCount(run: Run): Promise<number> {
  return Number((await run(`select count(*)::int as n from auth.users where email like $1`, [`%@${DEMO_DOMAIN}`]))[0]?.n ?? 0);
}

/** Adds the 10 demo volunteers (active, with approved hours and departments). Does nothing if they are already there. */
export async function seedDemo(run: Run): Promise<{ added: number; withHours: boolean }> {
  if ((await demoCount(run)) > 0) return { added: 0, withHours: false };
  const admin = (await run(`select user_id from admin_roles order by created_at limit 1`))[0]?.user_id as string | undefined; // approved hours need a real deciding admin
  let added = 0;
  for (const [i, p] of PEOPLE.entries()) {
    const email = `demo.${p.first.toLowerCase()}.${i + 1}@${DEMO_DOMAIN}`;
    const id = (await run(
      `insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
       values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}') returning id`, [email]))[0].id as string;
    await run(`insert into volunteer_profiles (user_id, first_name, last_name, state, lga, skills, languages, availability, status) values ($1,$2,$3,$4,$5,$6,'{English}','Weekends','active')`, [id, p.first, p.last, p.state, p.lga, p.skills]);
    await run(`insert into volunteer_contacts (user_id, email, phone) values ($1,$2,'0800 000 0000')`, [id, email]);
    for (const d of p.depts) await run(`insert into department_memberships (user_id, department_id, status, joined_at) select $1, id, 'active', now() from departments where name = $2`, [id, d]);
    if (admin) for (const [j, h] of p.hours.entries())
      await run(`insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,$2, current_date - $3::int, $4, 'coordinator', 'approved', $5, now())`, [id, "Demo activity", 3 + j * 9 + i, h, admin]);
    added++;
  }
  return { added, withHours: !!admin };
}

/** Removes every demo volunteer and their hours. Real volunteers are never touched (the match is on the demo email domain only). */
export async function removeDemo(run: Run): Promise<number> {
  const ids = (await run(`select id from auth.users where email like $1`, [`%@${DEMO_DOMAIN}`])).map((r) => r.id as string);
  if (!ids.length) return 0;
  await run(`delete from hour_logs where user_id = any($1::uuid[])`, [ids]);
  await run(`delete from auth.users where id = any($1::uuid[])`, [ids]); // cascades the profile, contacts and department memberships
  return ids.length;
}

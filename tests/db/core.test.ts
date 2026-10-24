import crypto from "node:crypto";
import fs from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { ALL_ACTIONS, MATRIX } from "../../src/lib/permissions";
import { ROLE_ENUM, permissionsSql } from "../../tools/gen-permissions-sql";
import { A2, freshDb, U, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => { h = await freshDb(); }, 60000);
const fails = (p: Promise<unknown>, re: RegExp) => expect(p).rejects.toThrow(re);
const sha = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

describe("permissions matrix: one source of truth", () => {
  it("the database matrix equals src/lib/permissions.ts for every role", async () => {
    const rows = await h.svc<{ role: string; action: string }>("select role::text, action from role_permissions");
    for (const [role, actions] of Object.entries(MATRIX)) {
      const inDb = rows.filter((r) => r.role === ROLE_ENUM[role as keyof typeof ROLE_ENUM]).map((r) => r.action).sort();
      expect(inDb, role).toEqual([...actions].sort());
    }
    expect(new Set(rows.map((r) => r.action))).toEqual(new Set(ALL_ACTIONS));
  });
  it("the committed seed migration is exactly what the generator produces (run `npm run db:permissions` if this fails)", () => {
    expect(fs.readFileSync("src/lib/db/migrations/0002_permissions_seed.sql", "utf8")).toBe(permissionsSql());
  });
});

describe("visitors and volunteers see only what they should", () => {
  it("anonymous visitors read the public board and nothing personal", async () => {
    const prog = await h.programme("AI4Rights");
    await h.opportunity(prog, { title: "Published" });
    await h.svc("insert into opportunities (title, programme_id, mode, state, starts_at, signup_deadline, slots, published) values ('Draft', $1, 'physical','Lagos', now()+interval '2 days', now()+interval '1 day', 3, false)", [prog]);
    const titles = (await h.q<{ title: string }>("anon", "select title from opportunities")).map((r) => r.title);
    expect(titles).toContain("Published"); expect(titles).not.toContain("Draft");
    await h.user("someone");
    await fails(h.q("anon", "select * from volunteer_profiles"), /permission denied/);
    await fails(h.q("anon", "select * from volunteer_contacts"), /permission denied/);
    await fails(h.q("anon", "select * from applications"), /permission denied/);
  });

  it("a volunteer reads only their own profile, contacts and date of birth, and cannot touch anyone else's", async () => {
    const a = await h.user("amaka"), b = await h.user("bola");
    for (const t of ["volunteer_profiles", "volunteer_contacts", "volunteer_private"]) {
      const rows = await h.q<{ user_id: string }>(U(a), `select user_id from ${t}`);
      expect(rows.map((r) => r.user_id), t).toEqual([a]);
    }
    const upd = await h.q(U(a), "update volunteer_contacts set phone='1' where user_id=$1 returning user_id", [b]);
    expect(upd).toHaveLength(0);
  });

  it("a volunteer cannot change their own status (only active <-> inactive), and cannot become an admin", async () => {
    const v = await h.activeVolunteer("sade");
    await fails(h.q(U(v), "update volunteer_profiles set status='alumni' where user_id=$1", [v]), /only be changed by an admin/);
    await h.q(U(v), "update volunteer_profiles set status='inactive' where user_id=$1", [v]);
    await h.q(U(v), "update volunteer_profiles set status='active' where user_id=$1", [v]);
    await h.svc("update volunteer_profiles set status='suspended' where user_id=$1", [v]);
    await fails(h.q(U(v), "update volunteer_profiles set status='active' where user_id=$1", [v]), /only be changed by an admin/);
    await fails(h.q(U(v), "insert into admin_roles (user_id, role) values ($1,'super_admin')", [v]), /row-level security/);
    await fails(h.q(U(v), "update users set role='admin' where id=$1", [v]), /role cannot be changed/);
  });

  it("an admin who has not completed two-factor is treated as a nobody", async () => {
    const s = await h.admin("super-no2fa", "super_admin");
    const v = await h.user("hidden-from-aal1");
    expect(await h.q(U(s), "select user_id from volunteer_profiles where user_id=$1", [v])).toHaveLength(0);
    expect((await h.q<{ ok: boolean }>(U(s), "select is_admin() as ok"))[0].ok).toBe(false);
    expect((await h.q<{ ok: boolean }>(A2(s), "select is_admin() as ok"))[0].ok).toBe(true);
  });
});

describe("scope: each admin sees only their own state, department or programme (applied inside the query)", () => {
  let lagos: string, kano: string, prog: string, dept: string;
  let stateLead: string, deptLead: string, progMgr: string, viewer: string, coord: string, sup: string;
  beforeAll(async () => {
    lagos = await h.user("scope-lagos", { state: "Lagos", dob: "1990-05-05" });
    kano = await h.user("scope-kano", { state: "Kano", dob: "1990-05-05" });
    prog = await h.programme("Talkam"); dept = await h.department("ICT-scope");
    await h.svc("insert into volunteer_programmes values ($1,$2)", [kano, prog]);
    await h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [lagos, dept]);
    stateLead = await h.admin("sl", "state_lead", { state: "Lagos" });
    deptLead = await h.admin("dl", "department_lead", { department: dept });
    progMgr = await h.admin("pm", "programme_manager", { programme: prog });
    viewer = await h.admin("vw", "viewer"); coord = await h.admin("co", "volunteer_coordinator"); sup = await h.admin("su", "super_admin");
  });
  const seen = async (who: ReturnType<typeof A2>, table: string, ids: string[]) =>
    (await h.q<{ user_id: string }>(who, `select user_id from ${table} where user_id = any($1::uuid[])`, [ids])).map((r) => r.user_id).sort();

  it("State Lead sees their state's volunteers and their phone numbers, but not other states, and not dates of birth", async () => {
    expect(await seen(A2(stateLead), "volunteer_profiles", [lagos, kano])).toEqual([lagos]);
    expect(await seen(A2(stateLead), "volunteer_contacts", [lagos, kano])).toEqual([lagos]);
    expect(await seen(A2(stateLead), "volunteer_private", [lagos, kano])).toEqual([]);
  });
  it("Department Lead sees only members of their own department", async () => {
    expect(await seen(A2(deptLead), "volunteer_profiles", [lagos, kano])).toEqual([lagos]);
  });
  it("Programme Manager sees only volunteers in their own programme", async () => {
    expect(await seen(A2(progMgr), "volunteer_profiles", [lagos, kano])).toEqual([kano]);
    expect(await seen(A2(progMgr), "volunteer_private", [lagos, kano])).toEqual([kano]);
  });
  it("Viewer sees names but never phone, email or date of birth", async () => {
    expect((await seen(A2(viewer), "volunteer_profiles", [lagos, kano]))).toHaveLength(2);
    expect(await seen(A2(viewer), "volunteer_contacts", [lagos, kano])).toEqual([]);
    expect(await seen(A2(viewer), "volunteer_private", [lagos, kano])).toEqual([]);
  });
  it("Coordinator and Super Admin see everyone, including dates of birth", async () => {
    expect(await seen(A2(coord), "volunteer_private", [lagos, kano])).toHaveLength(2);
    expect(await seen(A2(sup), "volunteer_contacts", [lagos, kano])).toHaveLength(2);
  });
});

describe("applications: age, guardian consent and the stage rules", () => {
  it("applying needs the three required consents, each stored with its wording", async () => {
    const v = await h.user("noconsent");
    await fails(h.q(U(v), "insert into applications (user_id) values ($1)", [v]), /required_consents_missing/);
    await h.q(U(v), "insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'code_of_conduct','given','conduct-v1','I have read and agree to the Code of Conduct.')", [v]);
    await h.q(U(v), "insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'safeguarding','given','safeguarding-v1','I agree to the Safeguarding Agreement.')", [v]);
    await h.q(U(v), "insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'privacy','given','privacy-v1','I consent to the Privacy Notice.')", [v]);
    await h.q(U(v), "insert into applications (user_id) values ($1)", [v]);
    const c = await h.q<{ text_version: string; text_snapshot: string }>(U(v), "select text_version, text_snapshot from consents where kind='privacy'");
    expect(c[0]).toMatchObject({ text_version: "privacy-v1" });
  });

  it("below the minimum age cannot apply; an under-18 cannot submit until a guardian has confirmed", async () => {
    const tooYoung = await h.user("age14", { dob: new Date(Date.now() - 14 * 365.25 * 864e5).toISOString().slice(0, 10) });
    await h.consentAll(tooYoung);
    await fails(h.q(U(tooYoung), "insert into applications (user_id) values ($1)", [tooYoung]), /below_minimum_age/);
    const minor = await h.user("age17", { dob: new Date(Date.now() - 17 * 365.25 * 864e5).toISOString().slice(0, 10) });
    await h.consentAll(minor);
    await fails(h.q(U(minor), "insert into applications (user_id) values ($1)", [minor]), /under_18_needs_guardian_consent/);
    await h.svc("insert into guardian_consents (user_id, guardian_name, guardian_contact, verified, verified_at) values ($1,'Mrs A','a@x.com',true,now())", [minor]);
    await h.q(U(minor), "insert into applications (user_id) values ($1)", [minor]);
  });

  it("an applicant cannot approve, reject or even re-stage their own application, or touch reviewer fields", async () => {
    const v = await h.user("selfapprove"); await h.consentAll(v);
    const app = (await h.q<{ id: string }>(U(v), "insert into applications (user_id, stage) values ($1,'approved') returning id", [v]))[0].id; // stage is forced to submitted
    expect((await h.svc<{ stage: string }>("select stage from applications where id=$1", [app]))[0].stage).toBe("submitted");
    await fails(h.q(U(v), "update applications set stage='approved' where id=$1", [app]), /only a reviewer can change the stage|cannot approve your own application/);
    await h.q(U(v), "update applications set reviewer_note='sneaky', answers='{\"x\":1}' where id=$1", [app]);
    expect((await h.svc<{ reviewer_note: string | null }>("select reviewer_note from applications where id=$1", [app]))[0].reviewer_note).toBeNull();
  });

  it("an admin approving an adult activates the volunteer and the decision is audited with the admin's id", async () => {
    const v = await h.user("adult-approve", { dob: "1995-03-03" }); await h.consentAll(v);
    const app = (await h.q<{ id: string }>(U(v), "insert into applications (user_id) values ($1) returning id", [v]))[0].id;
    const coord = await h.admin("approver", "volunteer_coordinator");
    await h.q(A2(coord), "update applications set stage='approved' where id=$1", [app]);
    expect((await h.svc<{ status: string }>("select status::text from volunteer_profiles where user_id=$1", [v]))[0].status).toBe("active");
    const log = await h.svc<{ actor_id: string; action: string; detail: { from: string; to: string } }>("select actor_id, action, detail from audit_logs where record_id=$1 and action like 'application.%'", [app]);
    expect(log[0]).toMatchObject({ actor_id: coord, action: "application.approved", detail: { from: "submitted", to: "approved" } });
    expect((await h.svc<{ reviewed_by: string }>("select reviewed_by from applications where id=$1", [app]))[0].reviewed_by).toBe(coord);
  });

  it("RULE 6: an under-18 can NOT be approved without a verified guardian consent: not by an admin, not even by the service role", async () => {
    const minorDob = new Date(Date.now() - 17 * 365.25 * 864e5).toISOString().slice(0, 10);
    const v = await h.user("minor-rule6", { dob: minorDob }); await h.consentAll(v);
    // inserted by the service role to simulate an application that slipped in without a guardian
    const app = (await h.svc<{ id: string }>("insert into applications (user_id) values ($1) returning id", [v]).catch(() => null));
    expect(app).toBeNull(); // the insert guard already refuses it
    await h.svc("insert into guardian_consents (user_id, guardian_name, guardian_contact, verified, verified_at) values ($1,'G','g@x.com',false,null)", [v]); // not verified
    await h.svc("alter table applications disable trigger applications_insert_guard_t");
    const id = (await h.svc<{ id: string }>("insert into applications (user_id) values ($1) returning id", [v]))[0].id;
    await h.svc("alter table applications enable trigger applications_insert_guard_t");
    const coord = await h.admin("minor-approver", "volunteer_coordinator");
    await fails(h.q(A2(coord), "update applications set stage='approved' where id=$1", [id]), /under_18_needs_guardian_consent/);
    await fails(h.svc("update applications set stage='approved' where id=$1", [id]), /under_18_needs_guardian_consent/);
    await h.svc("update guardian_consents set verified=true, verified_at=now() where user_id=$1", [v]);
    await h.q(A2(coord), "update applications set stage='approved' where id=$1", [id]);
  });

  it("only roles allowed to approve under-18s can do so, and only inside their scope", async () => {
    const dob = new Date(Date.now() - 17 * 365.25 * 864e5).toISOString().slice(0, 10);
    const v = await h.user("minor-scope", { state: "Lagos", dob }); await h.consentAll(v);
    await h.svc("insert into guardian_consents (user_id, guardian_name, guardian_contact, verified, verified_at) values ($1,'G','g@x.com',true,now())", [v]);
    const id = (await h.svc<{ id: string }>("insert into applications (user_id) values ($1) returning id", [v]))[0].id;
    const stateLead = await h.admin("minor-sl", "state_lead", { state: "Lagos" });
    const otherLead = await h.admin("minor-other", "state_lead", { state: "Kano" });
    expect(await h.q(A2(otherLead), "update applications set stage='under_review' where id=$1 returning id", [id])).toHaveLength(0); // out of scope: row invisible
    await fails(h.q(A2(stateLead), "update applications set stage='approved' where id=$1", [id]), /cannot approve an under-18/);
    // the same State Lead CAN approve an adult in their state, even though they cannot see dates of birth
    const adult = await h.user("adult-scope", { state: "Lagos", dob: "1994-02-02" }); await h.consentAll(adult);
    const aid = (await h.svc<{ id: string }>("insert into applications (user_id) values ($1) returning id", [adult]))[0].id;
    await h.q(A2(stateLead), "update applications set stage='approved' where id=$1", [aid]);
    expect((await h.svc<{ stage: string }>("select stage::text from applications where id=$1", [aid]))[0].stage).toBe("approved");
  });

  it("an applicant can send an application back to the queue after 'needs more info'", async () => {
    const v = await h.user("needsinfo", { dob: "1990-01-01" }); await h.consentAll(v);
    const id = (await h.q<{ id: string }>(U(v), "insert into applications (user_id) values ($1) returning id", [v]))[0].id;
    const coord = await h.admin("ni-coord", "volunteer_coordinator");
    await h.q(A2(coord), "update applications set stage='needs_info', needs_info_note='Send your call-up letter' where id=$1", [id]);
    await h.q(U(v), "update applications set stage='submitted', answers='{\"letter\":true}' where id=$1", [id]);
    expect((await h.svc<{ stage: string }>("select stage::text from applications where id=$1", [id]))[0].stage).toBe("submitted");
  });
});

describe("guardian link: the guardian is not logged in", () => {
  it("a valid link records a verified consent; wrong, reused, expired and refused links do not", async () => {
    const dob = new Date(Date.now() - 16.5 * 365.25 * 864e5).toISOString().slice(0, 10);
    const v = await h.user("gwards", { first: "Tobi", dob });
    await h.q(U(v), "insert into guardian_requests (user_id, guardian_name, guardian_contact, token_hash) values ($1,'Mrs Adeyemi','g@x.com',$2)", [v, sha("tok-good")]);
    // the guardian page can show only the minimum
    const info = await h.q<{ applicant_first_name: string; guardian_name: string; decision: string }>("anon", "select * from guardian_request_info($1)", ["tok-good"]);
    expect(info[0]).toMatchObject({ applicant_first_name: "Tobi", guardian_name: "Mrs Adeyemi", decision: "pending" });
    await fails(h.q("anon", "select * from guardian_requests"), /permission denied/);
    await fails(h.q("anon", "select record_guardian_decision($1,'given')", ["tok-wrong"]), /unknown_link/);
    expect(await h.svc("select 1 from guardian_consents where user_id=$1", [v])).toHaveLength(0);
    await h.q("anon", "select record_guardian_decision($1,'given')", ["tok-good"]);
    expect((await h.svc<{ verified: boolean }>("select verified from guardian_consents where user_id=$1", [v]))[0].verified).toBe(true);
    await fails(h.q("anon", "select record_guardian_decision($1,'given')", ["tok-good"]), /already_decided/);
    // expired
    await h.q(U(v), "insert into guardian_requests (user_id, guardian_name, guardian_contact, token_hash) values ($1,'G','g@x.com',$2)", [v, sha("tok-old")]);
    await h.svc("update guardian_requests set expires_at = now() - interval '1 day' where token_hash=$1", [sha("tok-old")]);
    await fails(h.q("anon", "select record_guardian_decision($1,'given')", ["tok-old"]), /link_expired/);
    // refused
    const v2 = await h.user("gwards2", { dob });
    await h.q(U(v2), "insert into guardian_requests (user_id, guardian_name, guardian_contact, token_hash) values ($1,'G','g@x.com',$2)", [v2, sha("tok-no")]);
    await h.q("anon", "select record_guardian_decision($1,'refused')", ["tok-no"]);
    expect(await h.svc("select 1 from guardian_consents where user_id=$1", [v2])).toHaveLength(0);
    // a volunteer cannot forge a verified guardian consent for themselves
    await fails(h.q(U(v2), "insert into guardian_consents (user_id, guardian_name, guardian_contact, verified, verified_at) values ($1,'x','x',true,now())", [v2]), /permission denied/);
  });
});

describe("consent: append-only proof, withdrawal, and the Roll", () => {
  it("consent records can never be edited or deleted, and a withdrawal is a new row", async () => {
    const v = await h.activeVolunteer("consenter");
    const id = (await h.svc<{ id: string }>("select id from consents where user_id=$1 and kind='privacy'", [v]))[0].id;
    await fails(h.q(U(v), "update consents set action='withdrawn' where id=$1", [id]), /permission denied|append-only/);
    await fails(h.svc("update consents set text_snapshot='changed' where id=$1", [id]), /append-only/);
    await fails(h.svc("delete from consents where id=$1", [id]), /append-only/);
    expect((await h.q<{ c: boolean }>(U(v), "select has_consent($1,'privacy') as c", [v]))[0].c).toBe(true);
    await h.q(U(v), "insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'privacy','withdrawn','privacy-v1','I withdraw')", [v]);
    expect((await h.q<{ c: boolean }>(U(v), "select has_consent($1,'privacy') as c", [v]))[0].c).toBe(false);
  });

  it("the public Roll lists only opted-in active volunteers, and withdrawing consent removes them immediately", async () => {
    const v = await h.activeVolunteer("roller", { }); await h.svc("update volunteer_profiles set first_name='Amaka', last_name='Obi' where user_id=$1", [v]);
    await h.svc("update volunteer_profiles set roll_opt_in=false where user_id=$1", [v]);
    expect((await h.q<{ display_name: string }>("anon", "select display_name from public_roll")).map((r) => r.display_name)).not.toContain("Amaka O.");
    await h.q(U(v), "update volunteer_profiles set roll_opt_in=true where user_id=$1", [v]);
    expect((await h.q<{ display_name: string }>("anon", "select display_name from public_roll")).map((r) => r.display_name)).toContain("Amaka O.");
    await h.q(U(v), "insert into consents (user_id, kind, action, text_version, text_snapshot) values ($1,'privacy','withdrawn','privacy-v1','withdraw')", [v]);
    expect((await h.q<{ display_name: string }>("anon", "select display_name from public_roll")).map((r) => r.display_name)).not.toContain("Amaka O.");
    await fails(h.q("anon", "select first_name, last_name from public_roll"), /column|does not exist/); // only the display name is exposed
  });
});

describe("delete my account", () => {
  it("removes the person, keeps hours as anonymous totals, revokes certificates and keeps an anonymous consent trail", async () => {
    const v = await h.activeVolunteer("leaver", { dob: "1990-01-01" });
    const admin = await h.admin("leaver-admin", "super_admin");
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'Walk',current_date,6,'coordinator','approved',$2,now())", [v, admin]);
    await h.svc("insert into certificates (user_id, code, holder_name, hours, period_start, period_end) values ($1,'DVT-LEAV-0000','Leaver Tester',6,current_date - 1,current_date)", [v]);
    await h.q(U(v), "select delete_my_account()");
    expect(await h.svc("select 1 from volunteer_profiles where user_id=$1", [v])).toHaveLength(0);
    expect(await h.svc("select 1 from volunteer_contacts where user_id=$1", [v])).toHaveLength(0);
    expect(await h.svc("select 1 from volunteer_private where user_id=$1", [v])).toHaveLength(0);
    expect((await h.svc<{ hours: string; user_id: string | null }>("select hours, user_id from hour_logs where activity='Walk'"))[0]).toMatchObject({ hours: "6.0", user_id: null });
    expect((await h.q("anon", "select * from verify_certificate('DVT-LEAV-0000')"))).toHaveLength(0);
    const trail = await h.svc<{ action: string }>("select action::text from consents where user_id is null and text_version='withdrawal-v1'");
    expect(trail.length).toBeGreaterThanOrEqual(3);
  });
});

void [crypto];

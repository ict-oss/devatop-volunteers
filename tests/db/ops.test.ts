import { beforeAll, describe, expect, it } from "vitest";
import { A2, freshDb, U, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => { h = await freshDb(); }, 60000);
const fails = (p: Promise<unknown>, re: RegExp) => expect(p).rejects.toThrow(re);
const one = async <T,>(p: Promise<T[]>) => (await p)[0];

describe("sign-ups: capacity, deadline, waitlist, cancel frees the slot", () => {
  it("fills slots, waitlists the overflow, and promotes the first waitlisted person when someone cancels", async () => {
    const prog = await h.programme("P-signups");
    const opp = await h.opportunity(prog, { slots: 2 });
    const [v1, v2, v3] = [await h.activeVolunteer("s1"), await h.activeVolunteer("s2"), await h.activeVolunteer("s3")];
    for (const v of [v1, v2, v3]) await h.q(U(v), "insert into signups (user_id, opportunity_id) values ($1,$2)", [v, opp]);
    const st = async (v: string) => (await one(h.svc<{ status: string }>("select status::text from signups where user_id=$1 and opportunity_id=$2", [v, opp]))).status;
    expect([await st(v1), await st(v2), await st(v3)]).toEqual(["confirmed", "confirmed", "waitlisted"]);
    await h.q(U(v1), "update signups set status='cancelled' where user_id=$1 and opportunity_id=$2", [v1, opp]);
    expect([await st(v1), await st(v3)]).toEqual(["cancelled", "confirmed"]); // slot freed immediately, waitlist promoted
  });

  it("closes after the deadline, and only active volunteers can sign up, only themselves, and not for unpublished events", async () => {
    const prog = await h.programme("P-closed");
    const closed = await h.opportunity(prog, { startsInHours: 5, deadlineInHours: -1 });
    const v = await h.activeVolunteer("late"); const applicant = await h.user("notactive"); const other = await h.activeVolunteer("someoneelse");
    await fails(h.q(U(v), "insert into signups (user_id, opportunity_id) values ($1,$2)", [v, closed]), /signup_closed/);
    const open = await h.opportunity(prog);
    await fails(h.q(U(applicant), "insert into signups (user_id, opportunity_id) values ($1,$2)", [applicant, open]), /only_active_volunteers/);
    await fails(h.q(U(v), "insert into signups (user_id, opportunity_id) values ($1,$2)", [other, open]), /sign yourself up|row-level security/);
    await h.svc("update opportunities set published=false where id=$1", [open]);
    await fails(h.q(U(v), "insert into signups (user_id, opportunity_id) values ($1,$2)", [v, open]), /opportunity not found/);
  });
});

describe("QR check-in and check-out", () => {
  it("the QR secret is hidden from volunteers; a coordinator in scope can read it", async () => {
    const prog = await h.programme("P-qr");
    const opp = await h.opportunity(prog, { startsInHours: 1, state: "Lagos" });
    const v = await h.activeVolunteer("qr-vol");
    expect(await h.q(U(v), "select * from opportunity_secrets")).toHaveLength(0);
    await fails(h.q("anon", "select * from opportunity_secrets"), /permission denied/);
    const lagosLead = await h.admin("qr-lagos", "state_lead", { state: "Lagos" }); const kanoLead = await h.admin("qr-kano", "state_lead", { state: "Kano" });
    expect(await h.q(A2(lagosLead), "select qr_secret from opportunity_secrets where opportunity_id=$1", [opp])).toHaveLength(1);
    expect(await h.q(A2(kanoLead), "select qr_secret from opportunity_secrets where opportunity_id=$1", [opp])).toHaveLength(0);
  });

  it("check-in needs the right secret and the event window; check-out records PENDING hours automatically", async () => {
    const prog = await h.programme("P-qr2");
    const opp = await h.opportunity(prog, { startsInHours: 1 });
    const secret = (await one(h.svc<{ qr_secret: string }>("select qr_secret from opportunity_secrets where opportunity_id=$1", [opp]))).qr_secret;
    const v = await h.activeVolunteer("scanner"); const applicant = await h.user("scanner-inactive");
    await fails(h.q(U(v), "select check_in($1,'wrong')", [opp]), /invalid_qr/);
    await fails(h.q(U(applicant), "select check_in($1,$2)", [opp, secret]), /only_active_volunteers/);
    const far = await h.opportunity(prog, { startsInHours: 72 });
    const farSecret = (await one(h.svc<{ qr_secret: string }>("select qr_secret from opportunity_secrets where opportunity_id=$1", [far]))).qr_secret;
    await fails(h.q(U(v), "select check_in($1,$2)", [far, farSecret]), /outside_event_window/);

    await fails(h.q(U(v), "select check_out($1,$2)", [opp, secret]), /not_checked_in/);
    await h.q(U(v), "select check_in($1,$2)", [opp, secret]);
    expect(await h.q(U(v), "select 1 from signups where user_id=$1 and opportunity_id=$2", [v, opp])).toHaveLength(1); // walk-ins are signed up at the door
    await h.svc("update attendance set checked_in_at = now() - interval '3 hours 10 minutes' where user_id=$1", [v]);
    const hours = (await one(h.q<{ check_out: string }>(U(v), "select check_out($1,$2)", [opp, secret]))).check_out;
    expect(Number(hours)).toBe(3); // 3h10m rounds to the nearest half hour
    const log = await one(h.q<{ status: string; method: string; hours: string }>(U(v), "select status::text, method::text, hours from hour_logs where user_id=$1", [v]));
    expect(log).toMatchObject({ status: "pending", method: "qr", hours: "3.0" });
    await fails(h.q(U(v), "select check_out($1,$2)", [opp, secret]), /already_checked_out/);
  });
});

describe("RULE 7: only an admin approves hours, and only approved hours count", () => {
  it("volunteers log remote hours as pending, can't approve or insert approved hours, and can't approve their own", async () => {
    const v = await h.activeVolunteer("hours-vol"); const w = await h.activeVolunteer("hours-peer");
    await h.q(U(v), "insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'Wrote posts',current_date,3,'remote_log')", [v]);
    const id = (await one(h.svc<{ id: string }>("select id from hour_logs where user_id=$1", [v]))).id;
    // a volunteer cannot self-insert as approved: the status is forced back to pending
    await h.q(U(v), "insert into hour_logs (user_id, activity, worked_on, hours, method, status) values ($1,'Cheat',current_date,10,'remote_log','approved')", [v]);
    expect((await one(h.svc<{ status: string }>("select status::text from hour_logs where activity='Cheat'"))).status).toBe("pending");
    await fails(h.q(U(v), "update hour_logs set status='approved' where id=$1", [id]), /only an admin can approve/);
    await fails(h.q(U(v), "insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'For a friend',current_date,3,'remote_log')", [w]), /row-level security|only log their own/);
    await fails(h.q(U(v), "insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'x',current_date,25,'remote_log')", [v]), /hours_range/);
    await fails(h.q(U(v), "insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'x',current_date,3,'qr')", [v]), /remote hours/);
  });

  it("an in-scope admin approves (decided_by and time are stamped, and audited); out-of-scope admins can't; admins can't decide their own hours", async () => {
    const v = await h.activeVolunteer("hours-scope", { state: "Lagos" });
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'Walk',current_date,4,'coordinator')", [v]);
    const id = (await one(h.svc<{ id: string }>("select id from hour_logs where user_id=$1", [v]))).id;
    const kano = await h.admin("hours-kano", "state_lead", { state: "Kano" });
    expect(await h.q(A2(kano), "update hour_logs set status='approved' where id=$1 returning id", [id])).toHaveLength(0);
    const viewer = await h.admin("hours-viewer", "viewer");
    expect(await h.q(A2(viewer), "update hour_logs set status='approved' where id=$1 returning id", [id])).toHaveLength(0);
    const lagos = await h.admin("hours-lagos", "state_lead", { state: "Lagos" });
    await h.q(A2(lagos), "update hour_logs set status='approved' where id=$1", [id]);
    expect(await one(h.svc<{ decided_by: string; status: string }>("select decided_by, status::text from hour_logs where id=$1", [id]))).toMatchObject({ decided_by: lagos, status: "approved" });
    expect(await one(h.svc<{ actor_id: string }>("select actor_id from audit_logs where record_id=$1 and action='hours.approved'", [id]))).toMatchObject({ actor_id: lagos });
    // once decided, the volunteer can no longer edit them
    expect(await h.q(U(v), "update hour_logs set hours=24 where id=$1 returning id", [id])).toHaveLength(0);
    // an admin cannot decide hours they logged themselves
    const selfAdmin = await h.admin("hours-self", "volunteer_coordinator");
    await h.svc("insert into volunteer_profiles (user_id, first_name, last_name, state, lga, status) values ($1,'Self','Admin','Lagos','x','active')", [selfAdmin]);
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'Own',current_date,2,'remote_log')", [selfAdmin]);
    const own = (await one(h.svc<{ id: string }>("select id from hour_logs where activity='Own'"))).id;
    await fails(h.q(A2(selfAdmin), "update hour_logs set status='approved' where id=$1", [own]), /cannot decide your own hours/);
  });

  it("even the service role cannot create an approved log without a real deciding admin", async () => {
    const v = await h.activeVolunteer("hours-svc");
    await fails(h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_at) values ($1,'x',current_date,2,'coordinator','approved',now())", [v]), /hours_approval_needs_admin/);
    const rando = await h.activeVolunteer("not-an-admin");
    await fails(h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'x',current_date,2,'coordinator','approved',$2,now())", [v, rando]), /hours_approval_needs_admin/);
  });

  it("public totals count approved hours only", async () => {
    const before = Number((await one(h.q<{ hours: string }>("anon", "select hours from public_stats"))).hours);
    const v = await h.activeVolunteer("hours-stats"); const adm = await h.admin("hours-stats-admin", "super_admin");
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'pending one',current_date,8,'coordinator')", [v]);
    expect(Number((await one(h.q<{ hours: string }>("anon", "select hours from public_stats"))).hours)).toBe(before);
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'approved one',current_date,5,'coordinator','approved',$2,now())", [v, adm]);
    expect(Number((await one(h.q<{ hours: string }>("anon", "select hours from public_stats"))).hours)).toBe(before + 5);
  });
});

describe("certificates: only for approved hours, publicly verifiable, never editable", () => {
  it("cannot be issued for unapproved hours; issues for the approved total; verifies publicly with minimal data; can be revoked; fields are immutable", async () => {
    const v = await h.activeVolunteer("cert-vol", { first: "Amaka", last: "Obi" });
    const coord = await h.admin("cert-coord", "volunteer_coordinator");
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method) values ($1,'Pending only',current_date,6,'coordinator')", [v]);
    const issue = (hours: number) => h.q(A2(coord), "insert into certificates (user_id, holder_name, hours, period_start, period_end) values ($1,'Amaka Obi',$2,current_date - 30,current_date) returning code", [v, hours]);
    await fails(issue(6), /certificate_needs_approved_hours/);
    await h.svc("update hour_logs set status='approved', decided_by=$2, decided_at=now() where user_id=$1", [v, coord]);
    await fails(issue(10), /certificate_needs_approved_hours/); // more than approved
    const code = (await one(issue(6))).code as string;
    expect(code).toMatch(/^DVT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const pub = await h.q<Record<string, unknown>>("anon", "select * from verify_certificate($1)", [code.toLowerCase()]);
    expect(Object.keys(pub[0]).sort()).toEqual(["holder_name", "hours", "period_end", "period_start"]); // no id, no contact, nothing else
    expect(pub[0]).toMatchObject({ holder_name: "Amaka Obi", hours: "6.0" });
    expect(await h.q("anon", "select * from verify_certificate('DVT-NOPE-NOPE')")).toHaveLength(0);
    await fails(h.q(A2(coord), "update certificates set hours=60 where code=$1", [code]), /immutable/);
    await h.q(A2(coord), "update certificates set revoked_at=now() where code=$1", [code]);
    expect(await h.q("anon", "select * from verify_certificate($1)", [code])).toHaveLength(0);
    expect(await h.q(U(v), "select 1 from certificates where code=$1", [code])).toHaveLength(0); // revoked: hidden from the owner too
  });

  it("a State Lead cannot issue certificates (matrix), and a volunteer cannot issue their own", async () => {
    const v = await h.activeVolunteer("cert-deny", { state: "Lagos" });
    const sl = await h.admin("cert-sl", "state_lead", { state: "Lagos" });
    // give them 1 approved hour so the approved-hours rule passes and ONLY row-level security can refuse
    await h.svc("insert into hour_logs (user_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,'x',current_date,1,'coordinator','approved',$2,now())", [v, sl]);
    await fails(h.q(A2(sl), "insert into certificates (user_id, holder_name, hours, period_start, period_end) values ($1,'x',1,current_date,current_date)", [v]), /row-level security/);
    await fails(h.q(U(v), "insert into certificates (user_id, holder_name, hours, period_start, period_end) values ($1,'x',1,current_date,current_date)", [v]), /row-level security/);
  });
});

describe("opportunities are created only inside an admin's scope", () => {
  it("a Lagos State Lead can create a Lagos opportunity but not a Kano one; a volunteer cannot create any", async () => {
    const prog = await h.programme("P-opps"); const lead = await h.admin("opp-sl", "state_lead", { state: "Lagos" });
    const ins = (state: string, who: ReturnType<typeof A2> | ReturnType<typeof U>) => h.q(who, "insert into opportunities (title, programme_id, mode, state, starts_at, signup_deadline, slots) values ('X',$1,'physical',$2, now()+interval '3 days', now()+interval '2 days', 5)", [prog, state]);
    await ins("Lagos", A2(lead));
    await fails(ins("Kano", A2(lead)), /row-level security/);
    const v = await h.activeVolunteer("opp-vol");
    await fails(ins("Lagos", U(v)), /row-level security/);
    await fails(h.svc("insert into opportunities (title, programme_id, mode, state, starts_at, signup_deadline, slots) values ('Bad',$1,'physical','Lagos', now()+interval '1 day', now()+interval '2 days', 5)", [prog]), /opp_deadline_before_start/);
    await fails(h.svc("insert into opportunities (title, programme_id, mode, starts_at, signup_deadline, slots) values ('NoState',$1,'physical', now()+interval '3 day', now()+interval '2 days', 5)", [prog]), /opp_physical_has_state/);
  });
});

describe("admin roles: Devatop can never be locked out", () => {
  it("never fewer than two Super Admins once two exist; only a Super Admin manages admins", async () => {
    const h = await freshDb(); // a clean database, so the Super Admin count is exactly what this test creates
    const s1 = await h.admin("lock-1", "super_admin");
    await fails(h.svc("delete from admin_roles where user_id=$1", [s1]), /at_least_two_super_admins/); // the only one cannot be removed
    const s2 = await h.admin("lock-2", "super_admin");
    const s3 = await h.admin("lock-3", "super_admin");
    await h.svc("delete from admin_roles where user_id=$1", [s3]); // 3 -> 2 is fine
    await fails(h.svc("delete from admin_roles where user_id=$1", [s2]), /at_least_two_super_admins/);
    await fails(h.svc("update admin_roles set role='viewer' where user_id=$1", [s2]), /at_least_two_super_admins/);
    const coord = await h.admin("lock-coord", "volunteer_coordinator"); const target = await h.user("lock-target");
    await fails(h.q(A2(coord), "insert into admin_roles (user_id, role) values ($1,'viewer')", [target]), /row-level security/);
    await h.q(A2(s1), "insert into admin_roles (user_id, role) values ($1,'viewer')", [target]);
    await fails(h.svc("insert into admin_roles (user_id, role) values ($1,'state_lead')", [await h.user("lead-nostate")]), /state_lead_needs_state/);
  });
});

describe("audit log: complete, private and append-only (rules 4 and 5)", () => {
  it("is append-only for everyone, readable only by roles with audit.see, and holds ids, never personal data", async () => {
    const v = await h.activeVolunteer("audit-vol", { first: "Zainab", last: "Yusuf" });
    const sup = await h.admin("audit-sup", "super_admin"); const coord = await h.admin("audit-coord", "volunteer_coordinator");
    await h.q(A2(sup), "update volunteer_profiles set status='suspended' where user_id=$1", [v]);
    await fails(h.svc("update audit_logs set action='x'"), /append-only/);
    await fails(h.svc("delete from audit_logs"), /append-only/);
    await fails(h.q(A2(sup), "insert into audit_logs (action, table_name) values ('forged','x')"), /permission denied/);
    expect((await h.q(A2(sup), "select 1 from audit_logs")).length).toBeGreaterThan(0);
    expect(await h.q(A2(coord), "select 1 from audit_logs")).toHaveLength(0); // Coordinator: no audit.see in the matrix
    expect(await h.q(U(v), "select 1 from audit_logs")).toHaveLength(0);
    const everything = JSON.stringify(await h.svc("select * from audit_logs"));
    expect(everything).not.toMatch(/Zainab|Yusuf|@example\.com|@devatop\.org|0803/); // no names, emails or phone numbers
    expect(await one(h.svc<{ actor_id: string }>("select actor_id from audit_logs where action='volunteer.status' and detail->>'to'='suspended' and record_id=$1", [v]))).toMatchObject({ actor_id: sup });
  });
});

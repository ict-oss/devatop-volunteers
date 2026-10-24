import { beforeAll, describe, expect, it } from "vitest";
import { A2, freshDb, U, type Harness } from "./harness";

let h: Harness;
beforeAll(async () => { h = await freshDb(); }, 60000);
const fails = (p: Promise<unknown>, re: RegExp) => expect(p).rejects.toThrow(re);
const one = async <T,>(p: Promise<T[]>) => (await p)[0];
const bodies = async (who: Parameters<Harness["q"]>[0], room: string) => (await h.q<{ body: string }>(who, "select body from chat_messages where room=$1 order by created_at", [room])).map((r) => r.body);

describe("departments are data: archive or merge, never lose history", () => {
  it("a department with history can never be hard-deleted; one with no history can", async () => {
    const used = await h.department("Has history"); const empty = await h.department("Never used");
    const v = await h.activeVolunteer("dept-member");
    await h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [v, used]);
    await fails(h.svc("delete from departments where id=$1", [used]), /department_has_history/);
    await h.svc("delete from departments where id=$1", [empty]);
  });

  it("archiving needs members moved first; merging moves members, opportunities and guides, and keeps hours and certificates intact", async () => {
    const from = await h.department("Old Comms"); const into = await h.department("New Comms");
    const prog = await h.programme("P-merge"); const sup = await h.admin("merge-sup", "super_admin");
    const [m1, m2] = [await h.activeVolunteer("merge-1"), await h.activeVolunteer("merge-2")];
    for (const m of [m1, m2]) await h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [m, from]);
    await h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [m2, into]); // already in the target
    const opp = await h.opportunity(prog, { department: from });
    await h.svc("insert into guides (title, body, audience, department_id) values ('G','b','department',$1)", [from]);
    await h.svc("insert into hour_logs (user_id, opportunity_id, activity, worked_on, hours, method, status, decided_by, decided_at) values ($1,$2,'Job',current_date,5,'coordinator','approved',$3,now())", [m1, opp, sup]);
    await h.svc("insert into certificates (user_id, code, holder_name, hours, period_start, period_end, department_id) values ($1,'DVT-MRGE-0001','M One',5,current_date-1,current_date,$2)", [m1, from]);
    await fails(h.svc("update departments set status='archived' where id=$1", [from]), /department_has_active_members/);
    const moved = (await one(h.q<{ merge_departments: number }>(A2(sup), "select merge_departments($1,$2)", [from, into]))).merge_departments;
    expect(moved).toBe(2);
    expect((await one(h.svc<{ status: string; merged_into_id: string }>("select status::text, merged_into_id from departments where id=$1", [from])))).toMatchObject({ status: "archived", merged_into_id: into });
    expect((await h.svc("select 1 from department_memberships where department_id=$1 and status='active'", [into]))).toHaveLength(2);
    expect((await h.svc("select 1 from opportunities where department_id=$1", [into]))).toHaveLength(1);
    expect((await h.svc("select 1 from guides where department_id=$1", [into]))).toHaveLength(1);
    expect(Number((await one(h.svc<{ s: string }>("select sum(hours) s from hour_logs where user_id=$1 and status='approved'", [m1]))).s)).toBe(5);
    expect((await h.q("anon", "select 1 from verify_certificate('DVT-MRGE-0001')"))).toHaveLength(1);
    expect((await one(h.svc<{ department_id: string }>("select department_id from certificates where code='DVT-MRGE-0001'"))).department_id).toBe(from); // issued certificates keep their wording
    expect((await h.q("anon", "select name from departments")).map((r) => (r as { name: string }).name)).not.toContain("Old Comms"); // archived: gone from the application form
    const coord = await h.admin("merge-coord", "volunteer_coordinator");
    await fails(h.q(A2(coord), "select merge_departments($1,$2)", [into, from]), /not allowed/);
  });
});

describe("guides show only to their audience, and only the right admins can write them", () => {
  it("public, volunteer, department and admin guides each reach only their audience; drafts reach no one", async () => {
    const d = await h.department("Guides dept"); const other = await h.department("Other dept");
    const member = await h.activeVolunteer("guide-member"); const outsider = await h.activeVolunteer("guide-outsider"); const applicant = await h.user("guide-applicant");
    await h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [member, d]);
    await h.svc(`insert into guides (title, body, audience, department_id, published) values
      ('About',        'b','public',null,true), ('Volunteers only','b','volunteers',null,true), ('Dept guide','b','department',$1,true),
      ('Other dept',   'b','department',$2,true), ('Admin handbook','b','admins',null,true), ('Draft','b','public',null,false)`, [d, other]);
    const titles = async (who: Parameters<Harness["q"]>[0]) => (await h.q<{ title: string }>(who, "select title from guides order by title")).map((r) => r.title);
    expect(await titles("anon")).toEqual(["About"]);
    expect(await titles(U(applicant))).toEqual(["About"]);
    expect(await titles(U(outsider))).toEqual(["About", "Volunteers only"]);
    expect(await titles(U(member))).toEqual(["About", "Dept guide", "Volunteers only"]);
    const coord = await h.admin("guide-coord", "volunteer_coordinator");
    expect(await titles(A2(coord))).toEqual(expect.arrayContaining(["Admin handbook", "Volunteers only"]));
  });

  it("matrix: Super writes everything; Coordinator volunteer guides only; Department Lead only their own department's guides", async () => {
    const d = await h.department("Lead dept"); const other = await h.department("Not mine");
    const sup = await h.admin("gw-sup", "super_admin"); const coord = await h.admin("gw-coord", "volunteer_coordinator"); const lead = await h.admin("gw-lead", "department_lead", { department: d });
    const ins = (who: ReturnType<typeof A2>, audience: string, dept: string | null) => h.q(who, "insert into guides (title, body, audience, department_id) values ('t','b',$1,$2)", [audience, dept]);
    await ins(A2(sup), "admins", null); await ins(A2(sup), "public", null);
    await ins(A2(coord), "volunteers", null);
    await fails(ins(A2(coord), "admins", null), /row-level security/);
    await fails(ins(A2(coord), "public", null), /row-level security/); // About page + admin handbook are Super Admin only
    await ins(A2(lead), "department", d);
    await fails(ins(A2(lead), "department", other), /row-level security/);
    await fails(ins(A2(lead), "volunteers", null), /row-level security/);
    const v = await h.activeVolunteer("gw-vol");
    await fails(ins(U(v) as ReturnType<typeof A2>, "volunteers", null), /row-level security/);
  });
});

describe("chat rooms: the right people in the right rooms", () => {
  let dept: string, otherDept: string, member: string, outsider: string, applicant: string, sup: string, coord: string, deptLead: string, otherLead: string, viewer: string, stateLead: string;
  beforeAll(async () => {
    dept = await h.department("Chat dept"); otherDept = await h.department("Chat other");
    member = await h.activeVolunteer("chat-member", { dob: "1999-01-01" }); outsider = await h.activeVolunteer("chat-outsider"); applicant = await h.user("chat-applicant");
    await h.svc("update volunteer_profiles set first_name='Amaka', last_name='Obi' where user_id=$1", [member]);
    await h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [member, dept]);
    sup = await h.admin("chat-sup", "super_admin"); coord = await h.admin("chat-coord", "volunteer_coordinator");
    deptLead = await h.admin("chat-dl", "department_lead", { department: dept }); otherLead = await h.admin("chat-ol", "department_lead", { department: otherDept });
    viewer = await h.admin("chat-viewer", "viewer"); stateLead = await h.admin("chat-sl", "state_lead", { state: "Lagos" });
  });
  const say = (who: Parameters<Harness["q"]>[0], room: string, body: string) => h.q(who, "insert into chat_messages (room, body) values ($1,$2)", [room, body]);

  it("volunteers use the general room and their own department's room; applicants and outsiders do not", async () => {
    await say(U(member), "general", "Hello everyone");
    await say(U(member), `dept:${dept}`, "Dept hello");
    expect(await bodies(U(outsider), "general")).toContain("Hello everyone");
    expect(await bodies(U(outsider), `dept:${dept}`)).toEqual([]);
    await fails(say(U(outsider), `dept:${dept}`, "let me in"), /row-level security/);
    expect(await bodies(U(applicant), "general")).toEqual([]);
    await fails(say(U(applicant), "general", "hi"), /row-level security/);
    await fails(say("anon", "general", "hi"), /permission denied/);
  });

  it("the Department heads room is for staff only: never volunteers, never viewers", async () => {
    await say(A2(deptLead), "heads", "Leads: November priorities?");
    await say(A2(sup), "heads", "Send by Friday");
    expect(await bodies(A2(otherLead), "heads")).toHaveLength(2);
    expect(await bodies(A2(stateLead), "heads")).toHaveLength(2);
    expect(await bodies(U(member), "heads")).toEqual([]);
    expect(await bodies(A2(viewer), "heads")).toEqual([]);
    await fails(say(U(member), "heads", "I am staff"), /row-level security/);
  });

  it("department rooms: a Department Lead enters only their own; Super, Programme and Coordinator enter all; Viewer can read none", async () => {
    expect((await bodies(A2(deptLead), `dept:${dept}`)).length).toBeGreaterThan(0);
    expect(await bodies(A2(otherLead), `dept:${dept}`)).toEqual([]);
    expect((await bodies(A2(coord), `dept:${dept}`)).length).toBeGreaterThan(0);
    expect(await bodies(A2(viewer), `dept:${dept}`)).toEqual([]);
    await fails(say(A2(otherLead), `dept:${dept}`, "intruder"), /row-level security/);
  });

  it("Support is private: only that volunteer and the support staff see the thread", async () => {
    await say(U(member), `support:${member}`, "My hours are missing, call me on 08031234567"); // contact details are allowed in the private room
    await say(A2(coord), `support:${member}`, "We are checking it");
    expect(await bodies(U(member), `support:${member}`)).toHaveLength(2);
    expect(await bodies(A2(sup), `support:${member}`)).toHaveLength(2);
    expect(await bodies(U(outsider), `support:${member}`)).toEqual([]);
    expect(await bodies(A2(deptLead), `support:${member}`)).toEqual([]);
    expect(await bodies(A2(stateLead), `support:${member}`)).toEqual([]);
    await fails(say(U(outsider), `support:${member}`, "snoop"), /row-level security/);
  });

  it("safeguarding: volunteers cannot post phone numbers or emails in group rooms; names are shown as 'Amaka O.'; staff appear as the Devatop Team; viewers cannot post", async () => {
    await fails(say(U(member), "general", "ring me 0803 123 4567"), /no_contact_details_in_group_rooms/);
    await fails(say(U(member), "general", "mail me amaka@example.com"), /no_contact_details_in_group_rooms/);
    const row = await one(h.q<{ author_name: string; author_staff: boolean }>(U(member), "select author_name, author_staff from chat_messages where body='Hello everyone'"));
    expect(row).toMatchObject({ author_name: "Amaka O.", author_staff: false });
    await say(A2(sup), "general", "Welcome!");
    expect(await one(h.svc<{ author_name: string; author_staff: boolean }>("select author_name, author_staff from chat_messages where body='Welcome!'"))).toMatchObject({ author_name: "Devatop Team", author_staff: true });
    await fails(say(A2(viewer), "general", "I can read only"), /row-level security/);
    // a forged author id is overwritten with the real caller
    await h.q(U(member), "insert into chat_messages (room, body, author_id) values ('general','forged',$1)", [outsider]);
    expect((await one(h.svc<{ author_id: string }>("select author_id from chat_messages where body='forged'"))).author_id).toBe(member);
  });

  it("messages cannot be edited; readers can report; only moderators can remove, and the text is blanked and the removal audited", async () => {
    await say(U(member), "general", "A questionable message");
    const id = (await one(h.svc<{ id: string }>("select id from chat_messages where body='A questionable message'"))).id;
    await fails(h.q(U(member), "update chat_messages set body='edited' where id=$1", [id]), /cannot be edited/);
    await h.q(U(outsider), "update chat_messages set reported=true where id=$1", [id]);
    expect((await one(h.svc<{ reported: boolean }>("select reported from chat_messages where id=$1", [id]))).reported).toBe(true);
    await fails(h.q(U(outsider), "update chat_messages set deleted_at=now() where id=$1", [id]), /only a moderator/);
    await fails(h.q(A2(deptLead), "update chat_messages set deleted_at=now() where id=$1", [id]), /only a moderator/); // general room: not their department
    await h.q(A2(coord), "update chat_messages set deleted_at=now() where id=$1", [id]);
    expect(await one(h.svc<{ body: string; deleted_at: string | null }>("select body, deleted_at from chat_messages where id=$1", [id]))).toMatchObject({ body: "[removed by a moderator]" });
    expect(await one(h.svc<{ actor_id: string }>("select actor_id from audit_logs where action='chat.removed' and record_id=$1", [id]))).toMatchObject({ actor_id: coord });
    // a Department Lead can moderate their own department's room
    await say(U(member), `dept:${dept}`, "off-topic spam");
    const sid = (await one(h.svc<{ id: string }>("select id from chat_messages where body='off-topic spam'"))).id;
    await h.q(A2(deptLead), "update chat_messages set deleted_at=now() where id=$1", [sid]);
  });
});

describe("settings: what each audience may read", () => {
  it("the minimum age is public; the WhatsApp group link is for active volunteers only; the rest is for Super Admin", async () => {
    await h.svc("insert into app_settings (key, value) values ('min_age','16'), ('whatsapp_group','\"https://chat.whatsapp.com/abc\"'), ('secret_thing','\"x\"')");
    const active = await h.activeVolunteer("set-active"); const applicant = await h.user("set-applicant"); const sup = await h.admin("set-sup", "super_admin"); const coord = await h.admin("set-coord", "volunteer_coordinator");
    const keys = async (who: Parameters<Harness["q"]>[0]) => (await h.q<{ key: string }>(who, "select key from app_settings order by key")).map((r) => r.key);
    expect(await keys("anon")).toEqual(["min_age"]);
    expect(await keys(U(applicant))).toEqual(["min_age"]);
    expect(await keys(U(active))).toEqual(["min_age", "whatsapp_group"]);
    expect(await keys(A2(sup))).toEqual(["min_age", "secret_thing", "whatsapp_group"]);
    expect(await keys(A2(coord))).toEqual(["min_age"]);
    expect(await h.q(A2(coord), "update app_settings set value='\"1\"' where key='min_age' returning key")).toHaveLength(0); // not Super Admin: no row is writable
    expect((await one(h.svc<{ value: string }>("select value #>> '{}' as value from app_settings where key='min_age'"))).value).toBe("16");
  });

  it("the minimum age setting is honoured by the application rule", async () => {
    await h.svc("update app_settings set value='18' where key='min_age'");
    const dob = new Date(Date.now() - 17 * 365.25 * 864e5).toISOString().slice(0, 10);
    const v = await h.user("minage-17", { dob }); await h.consentAll(v);
    await fails(h.q(U(v), "insert into applications (user_id) values ($1)", [v]), /below_minimum_age/);
    await h.svc("update app_settings set value='16' where key='min_age'");
  });
});

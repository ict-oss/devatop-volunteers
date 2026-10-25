import { beforeAll, describe, expect, it } from "vitest";
import { dismissReport, myRooms, postMessage, removeMessage, reportMessage, reportedMessages, roomMessages } from "../../src/lib/services/chat";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let coord: string, lead: string, viewer: string, v1: string, v2: string, outsider: string, comms: string, ict: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
const me = (sub: string) => ({ sub, aal: "aal1" as const });
beforeAll(async () => {
  t = await freshServices(); comms = await t.h.department("Comms"); ict = await t.h.department("ICT");
  coord = await t.h.admin("coord", "volunteer_coordinator"); lead = await t.h.admin("lead", "department_lead", { department: ict }); viewer = await t.h.admin("viewer", "viewer");
  v1 = await t.h.activeVolunteer("c1", { first: "Amaka", last: "Obi" }); v2 = await t.h.activeVolunteer("c2", { first: "Tunde", last: "Ajayi" }); outsider = await t.h.user("c3");
  await t.h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active'), ($3,$2,'active')", [v1, comms, v2]);
}, 60000);

describe("which rooms each person sees (the database decides)", () => {
  it("a volunteer: everyone, their own department, their own support thread; no staff room or other departments", async () => {
    const r = await t.as(me(v1), (tx) => myRooms(tx, v1));
    expect(r.map((x) => x.name)).toEqual(["All volunteers", "Comms", "Support"]);
    expect(r.every((x) => x.canPost && !x.canModerate)).toBe(true);
  });
  it("an applicant who is not approved sees nothing", async () => { expect(await t.as(me(outsider), (tx) => myRooms(tx, outsider))).toEqual([{ id: `support:${outsider}`, name: "Support", blurb: expect.any(String), group: "Help", canPost: true, canModerate: false }]); });
  it("a coordinator sees all departments, the staff room and moderates; a department lead sees only their own; a viewer reads but cannot post", async () => {
    const c = await t.as(a2(coord), (tx) => myRooms(tx, coord));
    expect(c.map((x) => x.name)).toEqual(expect.arrayContaining(["All volunteers", "Comms", "ICT", "Department heads"]));
    expect(c.find((x) => x.name === "Comms")).toMatchObject({ canPost: true, canModerate: true });
    expect(c.map((x) => x.name)).not.toContain("Support"); // staff answer other people's threads; they have none of their own
    const l = await t.as(a2(lead), (tx) => myRooms(tx, lead));
    expect(l.map((x) => x.name)).toEqual(expect.arrayContaining(["All volunteers", "ICT", "Department heads"]));
    expect(l.map((x) => x.name)).not.toContain("Comms");
    const v = await t.as(a2(viewer), (tx) => myRooms(tx, viewer));
    expect(v.find((x) => x.name === "All volunteers")).toMatchObject({ canPost: false });
    expect(v.map((x) => x.name)).not.toContain("Department heads");
  });
});

describe("talking", () => {
  it("a volunteer posts under a short name; staff post as 'Devatop Team'", async () => {
    await t.as(me(v1), (tx) => postMessage(tx, v1, "general", "Anyone going to the Enugu summit?"));
    await t.as(a2(coord), (tx) => postMessage(tx, coord, "general", "Yes, details on Friday."));
    const m = await t.as(me(v2), (tx) => roomMessages(tx, v2, "general"));
    expect(m.map((x) => [x.who, x.staff, x.mine])).toEqual([["Amaka O.", false, false], ["Devatop Team", true, false]]);
  });
  it("no phone numbers or emails in group rooms (but allowed in private Support)", async () => {
    expect((await rejects(t.as(me(v1), (tx) => postMessage(tx, v1, "general", "call me on 08031234567")))).code).toBe("contact_details");
    expect((await rejects(t.as(me(v1), (tx) => postMessage(tx, v1, "general", "mail me a@b.com")))).code).toBe("contact_details");
    await t.as(me(v1), (tx) => postMessage(tx, v1, `support:${v1}`, "My number is 08031234567 if you need to call"));
  });
  it("cannot read or post in rooms you do not belong to", async () => {
    expect(await t.as(me(v2), (tx) => roomMessages(tx, v2, "heads"))).toEqual([]);
    expect(await t.as(me(v2), (tx) => roomMessages(tx, v2, `support:${v1}`))).toEqual([]);
    expect((await rejects(t.as(me(v2), (tx) => postMessage(tx, v2, "heads", "hello")))).code).toBe("forbidden");
    expect((await rejects(t.as(a2(viewer), (tx) => postMessage(tx, viewer, "general", "viewer post")))).code).toBe("forbidden");
    expect((await rejects(t.as(me(outsider), (tx) => postMessage(tx, outsider, "general", "hi")))).code).toBe("forbidden");
  });
  it("the support thread is private to the volunteer and the moderators, who also see it listed", async () => {
    expect((await t.as(me(v1), (tx) => roomMessages(tx, v1, `support:${v1}`))).length).toBe(1);
    expect((await t.as(a2(coord), (tx) => roomMessages(tx, coord, `support:${v1}`))).length).toBe(1);
    expect((await t.as(a2(coord), (tx) => myRooms(tx, coord))).map((r) => r.name)).toContain("Support · Amaka O.");
    expect((await t.as(a2(lead), (tx) => roomMessages(tx, lead, `support:${v1}`)))).toEqual([]);
  });
});

describe("reporting and moderation", () => {
  it("a volunteer reports a message; a moderator removes it (text blanked, audited) or dismisses the report", async () => {
    await t.as(me(v2), (tx) => postMessage(tx, v2, "general", "something rude"));
    const rude = (await t.as(me(v1), (tx) => roomMessages(tx, v1, "general"))).find((m) => m.text === "something rude")!;
    await t.as(me(v1), (tx) => reportMessage(tx, rude.id));
    expect((await t.as(a2(coord), (tx) => reportedMessages(tx, coord))).map((m) => m.id)).toEqual([rude.id]);
    expect(await t.as(me(v1), (tx) => reportedMessages(tx, v1))).toEqual([]); // volunteers do not see the report queue
    expect((await rejects(t.as(me(v1), (tx) => removeMessage(tx, rude.id)))).code).toBe("forbidden");
    await t.as(a2(coord), (tx) => removeMessage(tx, rude.id));
    const after = (await t.as(me(v1), (tx) => roomMessages(tx, v1, "general"))).find((m) => m.id === rude.id)!;
    expect(after).toMatchObject({ deleted: true, text: "" });
    expect((await t.h.svc<{ n: number }>("select count(*)::int n from audit_logs where action='chat.removed'"))[0].n).toBe(1);
  });
  it("a moderator can dismiss a report, a volunteer cannot", async () => {
    await t.as(me(v2), (tx) => postMessage(tx, v2, "general", "borderline joke"));
    const m = (await t.as(me(v1), (tx) => roomMessages(tx, v1, "general"))).find((x) => x.text === "borderline joke")!;
    await t.as(me(v1), (tx) => reportMessage(tx, m.id));
    await t.as(me(v1), (tx) => dismissReport(tx, m.id)).catch(() => null);
    expect((await t.as(a2(coord), (tx) => reportedMessages(tx, coord))).length).toBe(1);
    await t.as(a2(coord), (tx) => dismissReport(tx, m.id));
    expect(await t.as(a2(coord), (tx) => reportedMessages(tx, coord))).toEqual([]);
  });
});

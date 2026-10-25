import { beforeAll, describe, expect, it } from "vitest";
import { addDepartment, archiveDepartment, deleteUnusedDepartment, editDepartment, listDepartments, mergeDepartments, restoreDepartment, departmentSchema } from "../../src/lib/services/departments";
import { activeDepartments } from "../../src/lib/services/public";
import { freshServices, rejects } from "./setup";

let t: Awaited<ReturnType<typeof freshServices>>;
let sup: string, coord: string, vol: string;
const a2 = (sub: string) => ({ sub, aal: "aal2" as const });
beforeAll(async () => {
  t = await freshServices(); sup = await t.h.admin("super", "super_admin"); await t.h.admin("super2", "super_admin"); coord = await t.h.admin("coord", "volunteer_coordinator");
  vol = await t.h.activeVolunteer("dv1");
}, 60000);
const input = (name: string, description = "") => departmentSchema.parse({ name, description });

describe("departments can grow, shrink and be renamed without a developer", () => {
  it("a Super Admin adds departments; they appear on the application form straight away", async () => {
    const { id } = await t.as(a2(sup), (tx) => addDepartment(tx, input("Legal Support", "Reviews agreements")));
    expect((await t.as("anon", (tx) => activeDepartments(tx))).map((d) => d.name)).toContain("Legal Support");
    expect((await t.as(a2(sup), (tx) => listDepartments(tx))).find((d) => d.id === id)).toMatchObject({ status: "active", members: 0, description: "Reviews agreements" });
  });

  it("renaming changes it everywhere (it is the same row)", async () => {
    const { id } = await t.as(a2(sup), (tx) => addDepartment(tx, input("Old name")));
    await t.as(a2(sup), (tx) => editDepartment(tx, id, input("New name", "Updated")));
    expect((await t.as("anon", (tx) => activeDepartments(tx))).map((d) => d.name)).toContain("New name");
    expect((await t.as("anon", (tx) => activeDepartments(tx))).map((d) => d.name)).not.toContain("Old name");
  });

  it("a duplicate name is refused with a plain message", async () => {
    await t.as(a2(sup), (tx) => addDepartment(tx, input("Unique one")));
    expect((await rejects(t.as(a2(sup), (tx) => addDepartment(tx, input("Unique one"))))).code).toBe("duplicate_name");
  });

  it("only a Super Admin with two-factor can change departments (matrix: departments.manage)", async () => {
    expect((await rejects(t.as(a2(coord), (tx) => addDepartment(tx, input("Not allowed"))))).code).toBe("forbidden");
    expect((await rejects(t.as({ sub: sup, aal: "aal1" }, (tx) => addDepartment(tx, input("No 2fa"))))).code).toBe("forbidden");
    expect((await rejects(t.as({ sub: vol, aal: "aal1" }, (tx) => addDepartment(tx, input("Volunteer"))))).code).toBe("forbidden");
  });

  it("archive hides it from the form; it is refused while members are active; restore brings it back", async () => {
    const { id } = await t.as(a2(sup), (tx) => addDepartment(tx, input("Seasonal team")));
    await t.h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [vol, id]);
    expect((await rejects(t.as(a2(sup), (tx) => archiveDepartment(tx, id)))).code).toBe("department_has_active_members");
    expect((await t.as(a2(sup), (tx) => listDepartments(tx))).find((d) => d.id === id)!.members).toBe(1);
    await t.h.svc("update department_memberships set status='left' where department_id=$1", [id]);
    await t.as(a2(sup), (tx) => archiveDepartment(tx, id));
    expect((await t.as("anon", (tx) => activeDepartments(tx))).map((d) => d.name)).not.toContain("Seasonal team");
    expect((await t.as(a2(sup), (tx) => listDepartments(tx))).find((d) => d.id === id)!.status).toBe("archived");
    await t.as(a2(sup), (tx) => restoreDepartment(tx, id));
    expect((await t.as("anon", (tx) => activeDepartments(tx))).map((d) => d.name)).toContain("Seasonal team");
  });

  it("merge moves members and calls to the target and archives the old one, keeping history", async () => {
    const from = (await t.as(a2(sup), (tx) => addDepartment(tx, input("Merge from")))).id;
    const into = (await t.as(a2(sup), (tx) => addDepartment(tx, input("Merge into")))).id;
    await t.h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'active')", [vol, from]);
    expect(await t.as(a2(sup), (tx) => mergeDepartments(tx, from, into))).toBe(1);
    const list = await t.as(a2(sup), (tx) => listDepartments(tx));
    expect(list.find((d) => d.id === into)!.members).toBe(1);
    expect(list.find((d) => d.id === from)).toMatchObject({ status: "archived", mergedIntoId: into, members: 0 });
    expect((await rejects(t.as(a2(coord), (tx) => mergeDepartments(tx, into, from)))).code).toBe("forbidden");
  });

  it("delete is only for a department that never had anything", async () => {
    const unused = (await t.as(a2(sup), (tx) => addDepartment(tx, input("Never used")))).id;
    await t.as(a2(sup), (tx) => deleteUnusedDepartment(tx, unused));
    const used = (await t.as(a2(sup), (tx) => addDepartment(tx, input("Has history")))).id;
    await t.h.svc("insert into department_memberships (user_id, department_id, status) values ($1,$2,'left')", [vol, used]);
    expect((await rejects(t.as(a2(sup), (tx) => deleteUnusedDepartment(tx, used)))).code).toBe("department_has_history");
  });
});

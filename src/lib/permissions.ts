// The ONLY place access rules live (CLAUDE.md rule 1). Mirrors the matrix in section 17.
// In production every admin page and server action calls can() on the server, and the
// scope below is applied inside the database query, not after loading.
export type Role = "super" | "programme" | "coordinator" | "state" | "department" | "viewer";
export type Action =
  | "overview" | "volunteers.list" | "volunteers.contact" | "volunteers.dob" | "applications.decide" | "applications.approveMinor"
  | "volunteers.suspend" | "volunteers.delete" | "opportunities.edit" | "attendance.take" | "hours.approve" | "certificates.issue"
  | "email.bulk" | "reports.see" | "reports.export" | "export.personal" | "trainings.manage" | "admins.manage" | "settings.edit"
  | "audit.see" | "departments.manage" | "departments.assign" | "guides.write" | "handbook.edit";

export type Admin = { name: string; role: Role; scope?: string }; // scope = state or programme or department

export const ROLE_LABEL: Record<Role, string> = {
  super: "Super Admin", programme: "Programme Manager", coordinator: "Volunteer Coordinator",
  state: "State or Chapter Lead", department: "Department Lead", viewer: "Viewer",
};

/** Role names as stored in the database enum admin_role_kind. */
export const ROLE_DB: Record<Role, string> = {
  super: "super_admin", programme: "programme_manager", coordinator: "volunteer_coordinator",
  state: "state_lead", department: "department_lead", viewer: "viewer",
};
export const ROLE_FROM_DB = Object.fromEntries(Object.entries(ROLE_DB).map(([k, v]) => [v, k])) as Record<string, Role>;

export const ALL_ACTIONS: Action[] = ["overview", "volunteers.list", "volunteers.contact", "volunteers.dob", "applications.decide", "applications.approveMinor", "volunteers.suspend", "volunteers.delete", "opportunities.edit", "attendance.take", "hours.approve", "certificates.issue", "email.bulk", "reports.see", "reports.export", "export.personal", "trainings.manage", "admins.manage", "settings.edit", "audit.see", "departments.manage", "departments.assign", "guides.write", "handbook.edit"];

export const MATRIX: Record<Role, Action[]> = {
  super: ALL_ACTIONS,
  programme: ["overview", "volunteers.list", "volunteers.contact", "volunteers.dob", "applications.decide", "volunteers.suspend", "opportunities.edit", "attendance.take", "hours.approve", "certificates.issue", "email.bulk", "reports.see", "reports.export", "trainings.manage", "audit.see", "departments.manage", "guides.write"],
  coordinator: ["overview", "volunteers.list", "volunteers.contact", "volunteers.dob", "applications.decide", "applications.approveMinor", "opportunities.edit", "attendance.take", "hours.approve", "certificates.issue", "email.bulk", "reports.see", "reports.export", "trainings.manage", "departments.assign", "guides.write"],
  state: ["overview", "volunteers.list", "volunteers.contact", "applications.decide", "opportunities.edit", "attendance.take", "hours.approve", "email.bulk", "reports.see", "reports.export", "departments.assign"],
  department: ["overview", "volunteers.list", "volunteers.contact", "applications.decide", "opportunities.edit", "attendance.take", "hours.approve", "email.bulk", "reports.see", "reports.export", "departments.assign", "guides.write"],
  viewer: ["overview", "volunteers.list", "reports.see"],
};

export function can(admin: Admin, action: Action): boolean {
  return MATRIX[admin.role]?.includes(action) ?? false; // deny by default
}

/** True if the record is inside this admin's scope. State/department leads only see their own. */
export function inScope(admin: Admin, rec: { state?: string; departments?: string[] }): boolean {
  if (admin.role === "state") return rec.state === admin.scope;
  if (admin.role === "department") return !!rec.departments?.includes(admin.scope ?? "");
  return true; // super/programme/coordinator/viewer: see all in this prototype (programme scope applied server-side later)
}

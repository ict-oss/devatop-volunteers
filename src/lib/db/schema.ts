/**
 * Devatop Volunteers: database schema (Drizzle ORM, PostgreSQL on Supabase).
 *
 * Read docs/developer/database.md first. Three ideas run through this file:
 *
 *  1. IDENTITY lives in Supabase's `auth.users`. `public.users` is the app-side row with the same id.
 *  2. PERSONAL DATA IS SPLIT BY WHO MAY SEE IT. Row-level security works on rows, not columns, so the
 *     permissions matrix (phone/email vs date of birth vs names) becomes separate tables:
 *       volunteer_profiles  names, state, skills        -> anyone who may list volunteers
 *       volunteer_contacts  phone, email, address       -> roles with `volunteers.contact`
 *       volunteer_private   date of birth, NYSC code    -> roles with `volunteers.dob`
 *  3. RULES LIVE IN THE DATABASE, not only in code (CLAUDE.md rules 6, 7, 8): see migrations/0001_rules_and_rls.sql.
 *
 * Nothing here deletes history: departments are archived or merged, hours and consents are kept
 * (anonymised) when an account is deleted.
 */
import { sql } from "drizzle-orm";
import {
  bigserial, boolean, check, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

const at = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => at("created_at").notNull().defaultNow();

/* ------------------------------------------------------------------ enums */
export const userRole = pgEnum("user_role", ["volunteer", "admin"]);
export const adminRoleKind = pgEnum("admin_role_kind", ["super_admin", "programme_manager", "volunteer_coordinator", "state_lead", "department_lead", "viewer"]);
export const volunteerStatus = pgEnum("volunteer_status", ["applicant", "active", "inactive", "suspended", "alumni"]);
export const applicationStage = pgEnum("application_stage", ["submitted", "under_review", "interview", "needs_info", "approved", "rejected"]);
export const consentKind = pgEnum("consent_kind", ["code_of_conduct", "safeguarding", "privacy", "data_use", "photo_media", "email_updates"]);
export const consentAction = pgEnum("consent_action", ["given", "withdrawn"]);
export const guardianDecision = pgEnum("guardian_decision", ["pending", "given", "refused"]);
export const oppMode = pgEnum("opportunity_mode", ["physical", "remote"]);
export const signupStatus = pgEnum("signup_status", ["confirmed", "waitlisted", "cancelled"]);
export const attendanceMethod = pgEnum("attendance_method", ["qr", "coordinator"]);
export const hourStatus = pgEnum("hour_status", ["pending", "approved", "rejected"]);
export const hourMethod = pgEnum("hour_method", ["qr", "coordinator", "remote_log"]);
export const membershipRole = pgEnum("membership_role", ["member", "team_lead"]);
export const membershipStatus = pgEnum("membership_status", ["requested", "active", "left"]);
export const deptStatus = pgEnum("department_status", ["active", "archived"]);
export const guideAudience = pgEnum("guide_audience", ["public", "volunteers", "department", "admins"]);
export const messageKind = pgEnum("message_kind", ["announcement", "bulk_email"]);

/* ------------------------------------------------------------------ people */
/** App-side user. `id` = auth.users.id (foreign key added in the migration, because Drizzle does not manage the auth schema). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull().default("volunteer"),
  createdAt: createdAt(),
});

export const volunteerProfiles = pgTable("volunteer_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  state: text("state").notNull(),
  lga: text("lga").notNull(),
  skills: text("skills").array().notNull().default(sql`'{}'`),
  languages: text("languages").array().notNull().default(sql`'{}'`),
  availability: text("availability"),
  heardFrom: text("heard_from"),
  photoPath: text("photo_path"),
  status: volunteerStatus("status").notNull().default("applicant"),
  /** The Roll shows names only for people who opted in AND have not withdrawn consent. */
  rollOptIn: boolean("roll_opt_in").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("vp_state_idx").on(t.state), index("vp_status_idx").on(t.status)]);

/** Phone, email, address: only roles with `volunteers.contact` (and the owner) can read. */
export const volunteerContacts = pgTable("volunteer_contacts", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
});

/** Date of birth and NYSC code: only roles with `volunteers.dob` (and the owner) can read. */
export const volunteerPrivate = pgTable("volunteer_private", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth").notNull(),
  occupation: text("occupation"),
  nyscStateCode: text("nysc_state_code"),
});

export const programmes = pgTable("programmes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
});
export const volunteerPrograms = pgTable("volunteer_programmes", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").notNull().references(() => programmes.id),
}, (t) => [primaryKey({ columns: [t.userId, t.programmeId] })]);

/** Departments are DATA, never hard-coded names (rule 10). Archive or merge; never hard-delete one with history. */
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  leadUserId: uuid("lead_user_id").references(() => users.id, { onDelete: "set null" }),
  status: deptStatus("status").notNull().default("active"),
  mergedIntoId: uuid("merged_into_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [check("dept_not_merged_into_self", sql`${t.mergedIntoId} is null or ${t.mergedIntoId} <> ${t.id}`)]);

export const departmentMemberships = pgTable("department_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  role: membershipRole("role").notNull().default("member"),
  status: membershipStatus("status").notNull().default("requested"),
  requestedAt: at("requested_at").notNull().defaultNow(),
  joinedAt: at("joined_at"),
  leftAt: at("left_at"),
}, (t) => [uniqueIndex("dm_user_dept_uq").on(t.userId, t.departmentId), index("dm_dept_idx").on(t.departmentId)]);

/** One admin role per admin. `state` / `programme_id` / `department_id` say what the role covers. */
export const adminRoles = pgTable("admin_roles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: adminRoleKind("role").notNull(),
  state: text("state"),
  programmeId: uuid("programme_id").references(() => programmes.id),
  departmentId: uuid("department_id").references(() => departments.id),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [
  check("state_lead_needs_state", sql`${t.role} <> 'state_lead' or ${t.state} is not null`),
  check("programme_manager_needs_programme", sql`${t.role} <> 'programme_manager' or ${t.programmeId} is not null`),
  check("department_lead_needs_department", sql`${t.role} <> 'department_lead' or ${t.departmentId} is not null`),
]);

/** One source of truth for the permissions matrix. Seeded from src/lib/permissions.ts (see tools/gen-permissions-sql.ts + a parity test). */
export const rolePermissions = pgTable("role_permissions", {
  role: adminRoleKind("role").notNull(),
  action: text("action").notNull(),
}, (t) => [primaryKey({ columns: [t.role, t.action] })]);

/* ------------------------------------------------------------------ applications & consent */
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stage: applicationStage("stage").notNull().default("submitted"),
  /** Admin-defined custom fields live here. */
  answers: jsonb("answers").notNull().default(sql`'{}'::jsonb`),
  submittedAt: at("submitted_at").notNull().defaultNow(),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: at("reviewed_at"),
  /** Shown to the applicant when stage = needs_info; internal notes live in vetting notes (Phase 2). */
  needsInfoNote: text("needs_info_note"),
  reviewerNote: text("reviewer_note"),
}, (t) => [
  index("app_stage_idx").on(t.stage, t.submittedAt),
  // one live application per person
  uniqueIndex("app_one_open_per_user").on(t.userId).where(sql`${t.stage} not in ('rejected')`),
]);

export const applicationDepartments = pgTable("application_departments", {
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  confirmed: boolean("confirmed").notNull().default(false),
}, (t) => [primaryKey({ columns: [t.applicationId, t.departmentId] })]);

/** Append-only proof of consent (rule 8). A withdrawal is a new row, never an edit. */
export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // kept anonymised if the account is deleted
  kind: consentKind("kind").notNull(),
  action: consentAction("action").notNull(),
  textVersion: text("text_version").notNull(),
  textSnapshot: text("text_snapshot").notNull(), // exact wording agreed to
  createdAt: at("created_at").notNull().default(sql`clock_timestamp()`), // clock_timestamp so two consents in one transaction still order correctly
}, (t) => [index("consents_user_idx").on(t.userId, t.kind, t.createdAt)]);

/** A request sent to a parent or guardian. Only a hash of the token is stored; the guardian is not logged in. */
export const guardianRequests = pgTable("guardian_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guardianName: text("guardian_name").notNull(),
  guardianContact: text("guardian_contact").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  decision: guardianDecision("decision").notNull().default("pending"),
  decidedAt: at("decided_at"),
  expiresAt: at("expires_at").notNull().default(sql`now() + interval '7 days'`),
  createdAt: createdAt(),
});

/** The verified record that lets an under-18 be approved (rule 6, enforced by a trigger on applications). */
export const guardianConsents = pgTable("guardian_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").references(() => guardianRequests.id),
  guardianName: text("guardian_name").notNull(),
  guardianContact: text("guardian_contact").notNull(),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: at("verified_at"),
  textVersion: text("text_version").notNull().default("guardian-v1"),
  createdAt: createdAt(),
}, (t) => [check("verified_has_timestamp", sql`not ${t.verified} or ${t.verifiedAt} is not null`)]);

/* ------------------------------------------------------------------ opportunities, attendance, hours */
export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  programmeId: uuid("programme_id").notNull().references(() => programmes.id),
  departmentId: uuid("department_id").references(() => departments.id),
  mode: oppMode("mode").notNull().default("physical"),
  state: text("state"),
  place: text("place"),
  startsAt: at("starts_at").notNull(),
  endsAt: at("ends_at"),
  signupDeadline: at("signup_deadline").notNull(),
  slots: integer("slots").notNull(),
  skills: text("skills").array().notNull().default(sql`'{}'`),
  commitment: text("commitment"),
  published: boolean("published").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [
  check("opp_slots_positive", sql`${t.slots} >= 1`),
  check("opp_deadline_before_start", sql`${t.signupDeadline} <= ${t.startsAt}`),
  check("opp_physical_has_state", sql`${t.mode} = 'remote' or ${t.state} is not null`),
  index("opp_starts_idx").on(t.startsAt),
]);

/** The QR secret is separate so volunteers (and anyone without `attendance.take`) can never read it. */
export const opportunitySecrets = pgTable("opportunity_secrets", {
  opportunityId: uuid("opportunity_id").primaryKey().references(() => opportunities.id, { onDelete: "cascade" }),
  qrSecret: text("qr_secret").notNull().default(sql`replace(gen_random_uuid()::text, '-', '')`),
});

export const signups = pgTable("signups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  status: signupStatus("status").notNull().default("confirmed"),
  createdAt: createdAt(),
  cancelledAt: at("cancelled_at"),
}, (t) => [uniqueIndex("signup_user_opp_uq").on(t.userId, t.opportunityId), index("signup_opp_idx").on(t.opportunityId, t.status)]);

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkedInAt: at("checked_in_at"),
  checkedOutAt: at("checked_out_at"),
  method: attendanceMethod("method").notNull(),
  markedBy: uuid("marked_by").references(() => users.id, { onDelete: "set null" }),
}, (t) => [uniqueIndex("att_opp_user_uq").on(t.opportunityId, t.userId), check("att_out_after_in", sql`${t.checkedOutAt} is null or ${t.checkedInAt} is null or ${t.checkedOutAt} >= ${t.checkedInAt}`)]);

/** Rule 7: only approved hours count. Rule: only an admin can approve (trigger). user_id is nulled if the account is deleted, so totals stay accurate. */
export const hourLogs = pgTable("hour_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, { onDelete: "set null" }),
  programmeId: uuid("programme_id").references(() => programmes.id),
  activity: text("activity").notNull(),
  workedOn: date("worked_on").notNull(),
  hours: numeric("hours", { precision: 4, scale: 1 }).notNull(),
  method: hourMethod("method").notNull(),
  status: hourStatus("status").notNull().default("pending"),
  submittedAt: at("submitted_at").notNull().defaultNow(),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: at("decided_at"),
  decisionNote: text("decision_note"),
}, (t) => [
  check("hours_range", sql`${t.hours} > 0 and ${t.hours} <= 24`),
  check("decided_has_admin", sql`${t.status} = 'pending' or (${t.decidedAt} is not null)`),
  index("hl_user_idx").on(t.userId, t.status), index("hl_status_idx").on(t.status),
]);

/* ------------------------------------------------------------------ training, certificates, tags */
export const trainings = pgTable("trainings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  required: boolean("required").notNull().default(false),
  programmeId: uuid("programme_id").references(() => programmes.id),
  renewAfterDays: integer("renew_after_days"),
});
export const trainingCompletions = pgTable("training_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trainingId: uuid("training_id").notNull().references(() => trainings.id),
  completedAt: at("completed_at").notNull().defaultNow(),
  expiresAt: at("expires_at"),
}, (t) => [uniqueIndex("tc_user_training_uq").on(t.userId, t.trainingId)]);

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  code: text("code").notNull().unique(), // public verification code, e.g. DVT-7K2M-9QXA
  holderName: text("holder_name").notNull(), // snapshot printed on the certificate
  roleTitle: text("role_title"),
  departmentId: uuid("department_id").references(() => departments.id),
  hours: numeric("hours", { precision: 6, scale: 1 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  issuedBy: uuid("issued_by").references(() => users.id, { onDelete: "set null" }),
  issuedAt: at("issued_at").notNull().defaultNow(),
  revokedAt: at("revoked_at"),
}, (t) => [check("cert_period_order", sql`${t.periodEnd} >= ${t.periodStart}`), check("cert_hours_positive", sql`${t.hours} > 0`)]);

export const tags = pgTable("tags", { id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull().unique() });
export const volunteerTags = pgTable("volunteer_tags", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.tagId] })]);

/* ------------------------------------------------------------------ messages, chat, guides */
/** Announcements and bulk sends. Holds the filter used (ids and names of groups), never recipients' personal data. */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: messageKind("kind").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audience: jsonb("audience").notNull().default(sql`'{}'::jsonb`),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentBy: uuid("sent_by").references(() => users.id, { onDelete: "set null" }),
  sentAt: at("sent_at").notNull().defaultNow(),
});
/** Delivery log for the seven automated emails: template + status only. No body, no address (rule 5). */
export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  template: text("template").notNull(),
  status: text("status").notNull().default("queued"),
  sentAt: at("sent_at").notNull().defaultNow(),
});
export const emailTemplates = pgTable("email_templates", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: at("updated_at").notNull().defaultNow(),
});
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/** A replacement for one picture or clip slot (ids come from src/lib/images.ts). The file itself is in the public Storage bucket `site-images`. */
export const siteImages = pgTable("site_images", {
  slotId: text("slot_id").primaryKey(),
  kind: text("kind").notNull(), // 'photo' | 'video'
  path: text("path").notNull(), // file in the bucket
  posterPath: text("poster_path"), // video only: still frame shown before it plays
  bytes: integer("bytes").notNull(),
  consentBy: uuid("consent_by").notNull().references(() => users.id, { onDelete: "restrict" }), // the admin who confirmed everyone shown has agreed
  consentAt: at("consent_at").notNull().defaultNow(),
  consentVersion: text("consent_version").notNull().default("site-image-v1"),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/** Room ids: 'general' | 'heads' | 'dept:<uuid>' | 'support:<volunteer uuid>'. Access is decided by chat_can_read/chat_can_post. */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  room: text("room").notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull().default("Volunteer"), // "Amaka O." for volunteers, set by trigger: peers never read profiles
  authorStaff: boolean("author_staff").notNull().default(false),
  body: text("body").notNull(),
  reported: boolean("reported").notNull().default(false),
  deletedAt: at("deleted_at"),
  createdAt: createdAt(),
}, (t) => [index("chat_room_idx").on(t.room, t.createdAt), check("chat_body_len", sql`char_length(${t.body}) between 1 and 1000`)]);

export const guides = pgTable("guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: guideAudience("audience").notNull().default("volunteers"),
  departmentId: uuid("department_id").references(() => departments.id),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  mustRead: boolean("must_read").notNull().default(false),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: at("updated_at").notNull().defaultNow(),
}, (t) => [check("dept_guide_has_dept", sql`${t.audience} <> 'department' or ${t.departmentId} is not null`)]);
export const guideReads = pgTable("guide_reads", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guideId: uuid("guide_id").notNull().references(() => guides.id, { onDelete: "cascade" }),
  readAt: at("read_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.guideId] })]);
export const checklistProgress = pgTable("checklist_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemKey: text("item_key").notNull(),
  doneAt: at("done_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.itemKey] })]);

/** Append-only. Written by database triggers so no code path can forget (rule 4). Holds ids, never personal data (rule 5). */
export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: at("at").notNull().defaultNow(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id"),
  detail: jsonb("detail").notNull().default(sql`'{}'::jsonb`),
}, (t) => [index("audit_at_idx").on(t.at), index("audit_actor_idx").on(t.actorId)]);

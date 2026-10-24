CREATE TYPE "public"."admin_role_kind" AS ENUM('super_admin', 'programme_manager', 'volunteer_coordinator', 'state_lead', 'department_lead', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."application_stage" AS ENUM('submitted', 'under_review', 'interview', 'needs_info', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attendance_method" AS ENUM('qr', 'coordinator');--> statement-breakpoint
CREATE TYPE "public"."consent_action" AS ENUM('given', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('code_of_conduct', 'safeguarding', 'privacy', 'data_use', 'photo_media', 'email_updates');--> statement-breakpoint
CREATE TYPE "public"."department_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."guardian_decision" AS ENUM('pending', 'given', 'refused');--> statement-breakpoint
CREATE TYPE "public"."guide_audience" AS ENUM('public', 'volunteers', 'department', 'admins');--> statement-breakpoint
CREATE TYPE "public"."hour_method" AS ENUM('qr', 'coordinator', 'remote_log');--> statement-breakpoint
CREATE TYPE "public"."hour_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('member', 'team_lead');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('requested', 'active', 'left');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('announcement', 'bulk_email');--> statement-breakpoint
CREATE TYPE "public"."opportunity_mode" AS ENUM('physical', 'remote');--> statement-breakpoint
CREATE TYPE "public"."signup_status" AS ENUM('confirmed', 'waitlisted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('volunteer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."volunteer_status" AS ENUM('applicant', 'active', 'inactive', 'suspended', 'alumni');--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "admin_role_kind" NOT NULL,
	"state" text,
	"programme_id" uuid,
	"department_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_lead_needs_state" CHECK ("admin_roles"."role" <> 'state_lead' or "admin_roles"."state" is not null),
	CONSTRAINT "programme_manager_needs_programme" CHECK ("admin_roles"."role" <> 'programme_manager' or "admin_roles"."programme_id" is not null),
	CONSTRAINT "department_lead_needs_department" CHECK ("admin_roles"."role" <> 'department_lead' or "admin_roles"."department_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_departments" (
	"application_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "application_departments_application_id_department_id_pk" PRIMARY KEY("application_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stage" "application_stage" DEFAULT 'submitted' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"needs_info_note" text,
	"reviewer_note" text
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_out_at" timestamp with time zone,
	"method" "attendance_method" NOT NULL,
	"marked_by" uuid,
	CONSTRAINT "att_out_after_in" CHECK ("attendance"."checked_out_at" is null or "attendance"."checked_in_at" is null or "attendance"."checked_out_at" >= "attendance"."checked_in_at")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"code" text NOT NULL,
	"holder_name" text NOT NULL,
	"role_title" text,
	"department_id" uuid,
	"hours" numeric(6, 1) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "certificates_code_unique" UNIQUE("code"),
	CONSTRAINT "cert_period_order" CHECK ("certificates"."period_end" >= "certificates"."period_start"),
	CONSTRAINT "cert_hours_positive" CHECK ("certificates"."hours" > 0)
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room" text NOT NULL,
	"author_id" uuid,
	"author_name" text DEFAULT 'Volunteer' NOT NULL,
	"author_staff" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"reported" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_body_len" CHECK (char_length("chat_messages"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "checklist_progress" (
	"user_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checklist_progress_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" "consent_kind" NOT NULL,
	"action" "consent_action" NOT NULL,
	"text_version" text NOT NULL,
	"text_snapshot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"lead_user_id" uuid,
	"status" "department_status" DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "dept_not_merged_into_self" CHECK ("departments"."merged_into_id" is null or "departments"."merged_into_id" <> "departments"."id")
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"template" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid,
	"guardian_name" text NOT NULL,
	"guardian_contact" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"text_version" text DEFAULT 'guardian-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verified_has_timestamp" CHECK (not "guardian_consents"."verified" or "guardian_consents"."verified_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "guardian_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"guardian_name" text NOT NULL,
	"guardian_contact" text NOT NULL,
	"token_hash" text NOT NULL,
	"decision" "guardian_decision" DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_requests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "guide_reads" (
	"user_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_reads_user_id_guide_id_pk" PRIMARY KEY("user_id","guide_id")
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" "guide_audience" DEFAULT 'volunteers' NOT NULL,
	"department_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"must_read" boolean DEFAULT false NOT NULL,
	"author_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dept_guide_has_dept" CHECK ("guides"."audience" <> 'department' or "guides"."department_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "hour_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"opportunity_id" uuid,
	"programme_id" uuid,
	"activity" text NOT NULL,
	"worked_on" date NOT NULL,
	"hours" numeric(4, 1) NOT NULL,
	"method" "hour_method" NOT NULL,
	"status" "hour_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	CONSTRAINT "hours_range" CHECK ("hour_logs"."hours" > 0 and "hour_logs"."hours" <= 24),
	CONSTRAINT "decided_has_admin" CHECK ("hour_logs"."status" = 'pending' or ("hour_logs"."decided_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "message_kind" NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"audience" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_by" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"programme_id" uuid NOT NULL,
	"department_id" uuid,
	"mode" "opportunity_mode" DEFAULT 'physical' NOT NULL,
	"state" text,
	"place" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"signup_deadline" timestamp with time zone NOT NULL,
	"slots" integer NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"commitment" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opp_slots_positive" CHECK ("opportunities"."slots" >= 1),
	CONSTRAINT "opp_deadline_before_start" CHECK ("opportunities"."signup_deadline" <= "opportunities"."starts_at"),
	CONSTRAINT "opp_physical_has_state" CHECK ("opportunities"."mode" = 'remote' or "opportunities"."state" is not null)
);
--> statement-breakpoint
CREATE TABLE "opportunity_secrets" (
	"opportunity_id" uuid PRIMARY KEY NOT NULL,
	"qr_secret" text DEFAULT replace(gen_random_uuid()::text, '-', '') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "programmes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" "admin_role_kind" NOT NULL,
	"action" text NOT NULL,
	CONSTRAINT "role_permissions_role_action_pk" PRIMARY KEY("role","action")
);
--> statement-breakpoint
CREATE TABLE "signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"status" "signup_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "training_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"training_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"programme_id" uuid,
	"renew_after_days" integer,
	CONSTRAINT "trainings_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'volunteer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_contacts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "volunteer_private" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"date_of_birth" date NOT NULL,
	"occupation" text,
	"nysc_state_code" text
);
--> statement-breakpoint
CREATE TABLE "volunteer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"state" text NOT NULL,
	"lga" text NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"availability" text,
	"heard_from" text,
	"photo_path" text,
	"status" "volunteer_status" DEFAULT 'applicant' NOT NULL,
	"roll_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_programmes" (
	"user_id" uuid NOT NULL,
	"programme_id" uuid NOT NULL,
	CONSTRAINT "volunteer_programmes_user_id_programme_id_pk" PRIMARY KEY("user_id","programme_id")
);
--> statement-breakpoint
CREATE TABLE "volunteer_tags" (
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "volunteer_tags_user_id_tag_id_pk" PRIMARY KEY("user_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_departments" ADD CONSTRAINT "application_departments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_departments" ADD CONSTRAINT "application_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_progress" ADD CONSTRAINT "checklist_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_lead_user_id_users_id_fk" FOREIGN KEY ("lead_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_request_id_guardian_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."guardian_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_requests" ADD CONSTRAINT "guardian_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_reads" ADD CONSTRAINT "guide_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_reads" ADD CONSTRAINT "guide_reads_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_logs" ADD CONSTRAINT "hour_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_logs" ADD CONSTRAINT "hour_logs_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_logs" ADD CONSTRAINT "hour_logs_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_logs" ADD CONSTRAINT "hour_logs_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_secrets" ADD CONSTRAINT "opportunity_secrets_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signups" ADD CONSTRAINT "signups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signups" ADD CONSTRAINT "signups_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_contacts" ADD CONSTRAINT "volunteer_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_private" ADD CONSTRAINT "volunteer_private_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_programmes" ADD CONSTRAINT "volunteer_programmes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_programmes" ADD CONSTRAINT "volunteer_programmes_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_tags" ADD CONSTRAINT "volunteer_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_tags" ADD CONSTRAINT "volunteer_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_stage_idx" ON "applications" USING btree ("stage","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_one_open_per_user" ON "applications" USING btree ("user_id") WHERE "applications"."stage" not in ('rejected');--> statement-breakpoint
CREATE UNIQUE INDEX "att_opp_user_uq" ON "attendance" USING btree ("opportunity_id","user_id");--> statement-breakpoint
CREATE INDEX "audit_at_idx" ON "audit_logs" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "chat_room_idx" ON "chat_messages" USING btree ("room","created_at");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_user_dept_uq" ON "department_memberships" USING btree ("user_id","department_id");--> statement-breakpoint
CREATE INDEX "dm_dept_idx" ON "department_memberships" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "hl_user_idx" ON "hour_logs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "hl_status_idx" ON "hour_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opp_starts_idx" ON "opportunities" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signup_user_opp_uq" ON "signups" USING btree ("user_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "signup_opp_idx" ON "signups" USING btree ("opportunity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tc_user_training_uq" ON "training_completions" USING btree ("user_id","training_id");--> statement-breakpoint
CREATE INDEX "vp_state_idx" ON "volunteer_profiles" USING btree ("state");--> statement-breakpoint
CREATE INDEX "vp_status_idx" ON "volunteer_profiles" USING btree ("status");
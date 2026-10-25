CREATE TABLE "site_images" (
	"slot_id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"poster_path" text,
	"bytes" integer NOT NULL,
	"consent_by" uuid NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_version" text DEFAULT 'site-image-v1' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_images" ADD CONSTRAINT "site_images_consent_by_users_id_fk" FOREIGN KEY ("consent_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
CREATE TABLE "submission_export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"format" text NOT NULL,
	"status" text NOT NULL,
	"row_count" integer,
	"bytes" bigint,
	"artifact_key" text,
	"token_hash" text,
	"token_expires_at" timestamp with time zone,
	"error_code" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submission_export_jobs_format_check" CHECK ("submission_export_jobs"."format" in ('csv', 'json')),
	CONSTRAINT "submission_export_jobs_status_check" CHECK ("submission_export_jobs"."status" in ('queued', 'running', 'done', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "submission_export_jobs" ADD CONSTRAINT "submission_export_jobs_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_export_jobs" ADD CONSTRAINT "submission_export_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submission_export_jobs_form_status_idx" ON "submission_export_jobs" USING btree ("form_id","status");--> statement-breakpoint
CREATE INDEX "submission_export_jobs_created_idx" ON "submission_export_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "form_submissions_export_cursor_idx" ON "form_submissions" USING btree ("form_id","created_at" desc,"id" desc);
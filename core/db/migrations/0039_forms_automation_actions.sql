CREATE TABLE "form_action_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"submission_id" uuid,
	"action_id" uuid,
	"action_type" text NOT NULL,
	"action_label" text NOT NULL,
	"status" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"trigger" text DEFAULT 'submission' NOT NULL,
	"error_code" text,
	"error_message" text,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"action_condition" jsonb NOT NULL,
	"action_config" jsonb NOT NULL,
	"submission_payload" jsonb NOT NULL,
	"retry_of_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"continue_on_error" boolean DEFAULT true NOT NULL,
	"condition" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_action_runs" ADD CONSTRAINT "form_action_runs_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_action_runs" ADD CONSTRAINT "form_action_runs_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_action_runs" ADD CONSTRAINT "form_action_runs_action_id_form_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."form_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_action_runs" ADD CONSTRAINT "form_action_runs_retry_of_id_form_action_runs_id_fk" FOREIGN KEY ("retry_of_id") REFERENCES "public"."form_action_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_actions" ADD CONSTRAINT "form_actions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_action_runs_form_idx" ON "form_action_runs" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_action_runs_submission_idx" ON "form_action_runs" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "form_action_runs_action_idx" ON "form_action_runs" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "form_action_runs_status_idx" ON "form_action_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "form_action_runs_created_idx" ON "form_action_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "form_actions_form_idx" ON "form_actions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_actions_order_idx" ON "form_actions" USING btree ("form_id","order_index");
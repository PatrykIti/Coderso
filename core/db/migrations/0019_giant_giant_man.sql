CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"name" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"settings" jsonb NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_fields_form_idx" ON "form_fields" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_fields_order_idx" ON "form_fields" USING btree ("form_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "form_fields_name_idx" ON "form_fields" USING btree ("form_id","name");--> statement-breakpoint
CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_submissions_created_idx" ON "form_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "form_submissions_status_idx" ON "form_submissions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "forms_slug_idx" ON "forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "forms_status_idx" ON "forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "forms_updated_idx" ON "forms" USING btree ("updated_at");
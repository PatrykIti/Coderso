CREATE TABLE "widget_template_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"blocks" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "widget_template_revisions" ADD CONSTRAINT "widget_template_revisions_template_id_widget_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."widget_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_template_revisions" ADD CONSTRAINT "widget_template_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "widget_template_revisions_template_id_idx" ON "widget_template_revisions" USING btree ("template_id");
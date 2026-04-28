ALTER TABLE "content_term_assignments"
DROP CONSTRAINT "content_term_assignments_pk";
--> statement-breakpoint
ALTER TABLE "content_term_assignments"
ADD CONSTRAINT "content_term_assignments_entry_id_term_id_pk"
PRIMARY KEY("entry_id","term_id");
--> statement-breakpoint
ALTER TABLE "widget_templates"
ADD COLUMN "settings" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "widget_template_revisions"
ADD COLUMN "settings" jsonb NOT NULL DEFAULT '{}'::jsonb;

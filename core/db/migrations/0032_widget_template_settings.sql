ALTER TABLE "widget_templates"
ADD COLUMN "settings" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "widget_template_revisions"
ADD COLUMN "settings" jsonb NOT NULL DEFAULT '{}'::jsonb;

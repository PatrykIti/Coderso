CREATE TABLE "widget_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"blocks" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "widget_templates_name_idx" ON "widget_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "widget_templates_status_idx" ON "widget_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "widget_templates_category_idx" ON "widget_templates" USING btree ("category");
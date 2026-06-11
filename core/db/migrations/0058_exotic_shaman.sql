CREATE TABLE "page_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "page_templates_slug_idx" ON "page_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "page_templates_status_idx" ON "page_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "page_templates_name_idx" ON "page_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "page_templates_updated_at_idx" ON "page_templates" USING btree ("updated_at");
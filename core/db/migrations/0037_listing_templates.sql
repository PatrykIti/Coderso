CREATE TABLE "listing_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"layout" text DEFAULT 'grid' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "listing_templates_slug_idx" ON "listing_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listing_templates_layout_idx" ON "listing_templates" USING btree ("layout");--> statement-breakpoint
CREATE INDEX "listing_templates_updated_at_idx" ON "listing_templates" USING btree ("updated_at");

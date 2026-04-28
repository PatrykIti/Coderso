CREATE TABLE "listing_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "listing_queries_name_idx" ON "listing_queries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "listing_queries_updated_at_idx" ON "listing_queries" USING btree ("updated_at");
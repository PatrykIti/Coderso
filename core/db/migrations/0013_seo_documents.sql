CREATE TABLE "seo_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"slug" text,
	"title" text,
	"description" text,
	"canonical_url" text,
	"robots" text,
	"score" integer,
	"status" text DEFAULT 'warning' NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_audit_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_documents_target_idx" ON "seo_documents" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "seo_documents_score_idx" ON "seo_documents" USING btree ("score");--> statement-breakpoint
CREATE INDEX "seo_documents_updated_at_idx" ON "seo_documents" USING btree ("updated_at");
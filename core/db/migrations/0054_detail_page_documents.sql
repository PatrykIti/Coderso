CREATE TABLE "detail_page_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content_type_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_document" jsonb NOT NULL,
	"published_document" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "detail_page_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detail_page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" text DEFAULT 'publish' NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "detail_page_documents" ADD CONSTRAINT "detail_page_documents_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detail_page_revisions" ADD CONSTRAINT "detail_page_revisions_detail_page_id_detail_page_documents_id_fk" FOREIGN KEY ("detail_page_id") REFERENCES "public"."detail_page_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detail_page_revisions" ADD CONSTRAINT "detail_page_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "detail_page_documents_content_type_id_idx" ON "detail_page_documents" USING btree ("content_type_id");--> statement-breakpoint
CREATE INDEX "detail_page_documents_status_idx" ON "detail_page_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "detail_page_documents_updated_at_idx" ON "detail_page_documents" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "detail_page_revisions_detail_page_id_idx" ON "detail_page_revisions" USING btree ("detail_page_id");--> statement-breakpoint
CREATE INDEX "detail_page_revisions_detail_page_kind_idx" ON "detail_page_revisions" USING btree ("detail_page_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "detail_page_revisions_detail_page_version_idx" ON "detail_page_revisions" USING btree ("detail_page_id","version");
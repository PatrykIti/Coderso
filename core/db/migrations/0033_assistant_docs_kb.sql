CREATE TABLE "assistant_doc_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"heading_path" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"heading" text NOT NULL,
	"line_start" integer NOT NULL,
	"line_end" integer NOT NULL,
	"content" text NOT NULL,
	"normalized_text" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_doc_ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"triggered_by_user_id" uuid,
	"source_root" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"files_scanned" integer DEFAULT 0 NOT NULL,
	"docs_upserted" integer DEFAULT 0 NOT NULL,
	"chunks_upserted" integer DEFAULT 0 NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"errors_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"audience" text NOT NULL,
	"product_area" text NOT NULL,
	"language" text DEFAULT 'pl' NOT NULL,
	"keywords_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checksum" text NOT NULL,
	"source_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_doc_chunks" ADD CONSTRAINT "assistant_doc_chunks_doc_id_assistant_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."assistant_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_doc_ingest_runs" ADD CONSTRAINT "assistant_doc_ingest_runs_triggered_by_user_id_users_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_doc_chunks_doc_id_idx" ON "assistant_doc_chunks" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "assistant_doc_chunks_heading_idx" ON "assistant_doc_chunks" USING btree ("heading");--> statement-breakpoint
CREATE INDEX "assistant_doc_chunks_line_idx" ON "assistant_doc_chunks" USING btree ("line_start","line_end");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_doc_chunks_doc_chunk_idx" ON "assistant_doc_chunks" USING btree ("doc_id","chunk_index");--> statement-breakpoint
CREATE INDEX "assistant_doc_ingest_runs_started_at_idx" ON "assistant_doc_ingest_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "assistant_doc_ingest_runs_status_idx" ON "assistant_doc_ingest_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assistant_doc_ingest_runs_actor_idx" ON "assistant_doc_ingest_runs" USING btree ("triggered_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_docs_source_path_idx" ON "assistant_docs" USING btree ("source_path");--> statement-breakpoint
CREATE INDEX "assistant_docs_slug_idx" ON "assistant_docs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "assistant_docs_product_area_idx" ON "assistant_docs" USING btree ("product_area");--> statement-breakpoint
CREATE INDEX "assistant_docs_language_idx" ON "assistant_docs" USING btree ("language");
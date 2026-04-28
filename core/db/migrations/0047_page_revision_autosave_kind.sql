ALTER TABLE "custom_screens" ALTER COLUMN "schema_version" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD COLUMN "kind" text DEFAULT 'publish' NOT NULL;--> statement-breakpoint
CREATE INDEX "page_revisions_page_kind_idx" ON "page_revisions" USING btree ("page_id","kind");
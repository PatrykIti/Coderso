ALTER TABLE "content_entries" ADD COLUMN "tags" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "content_entries" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
CREATE INDEX "content_entries_scheduled_at_idx" ON "content_entries" USING btree ("scheduled_at");

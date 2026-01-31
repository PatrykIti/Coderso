ALTER TABLE "content_entries" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_entries_author_idx" ON "content_entries" USING btree ("author_id");
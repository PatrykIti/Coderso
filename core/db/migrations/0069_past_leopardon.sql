ALTER TABLE "content_entries" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_entries" ADD COLUMN "access_password" text;
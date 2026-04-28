ALTER TABLE "content_types" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "content_types" ALTER COLUMN "status" SET DEFAULT 'draft';

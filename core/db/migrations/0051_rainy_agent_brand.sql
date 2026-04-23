ALTER TABLE "menus" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
UPDATE "menus" SET "published_at" = COALESCE("published_at", "created_at") WHERE "status" = 'published';--> statement-breakpoint
ALTER TABLE "menus" ALTER COLUMN "status" SET DEFAULT 'draft';

DROP INDEX "plugins_name_unique";--> statement-breakpoint
ALTER TABLE "plugins" ALTER COLUMN "enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "plugins" ALTER COLUMN "error_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_name_unique" UNIQUE("name");
CREATE TABLE "popups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"trigger" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"targeting" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"frequency" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"author_name" text NOT NULL,
	"author_email" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "popups_slug_idx" ON "popups" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "popups_status_idx" ON "popups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "popups_updated_idx" ON "popups" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "reviews_entity_idx" ON "reviews" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_created_idx" ON "reviews" USING btree ("created_at");
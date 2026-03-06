ALTER TABLE "custom_screens" ADD COLUMN "show_in_sidebar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_screens" ADD COLUMN "sidebar_label" text;--> statement-breakpoint
CREATE INDEX "custom_screens_sidebar_idx" ON "custom_screens" USING btree ("show_in_sidebar");
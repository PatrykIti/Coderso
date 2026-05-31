ALTER TABLE "custom_screens" ADD COLUMN "collection_role" text;--> statement-breakpoint
ALTER TABLE "custom_screens" ADD COLUMN "composition_key" text;--> statement-breakpoint
CREATE INDEX "custom_screens_collection_role_idx" ON "custom_screens" USING btree ("content_type_id","collection_role");--> statement-breakpoint
CREATE INDEX "custom_screens_composition_key_idx" ON "custom_screens" USING btree ("composition_key");
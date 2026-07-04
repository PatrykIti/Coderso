CREATE TABLE "custom_screen_entry_presentation_overrides" (
	"screen_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"block_id" text NOT NULL,
	"prop_path" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_screen_entry_presentation_overrides" ADD CONSTRAINT "custom_screen_entry_presentation_overrides_screen_id_custom_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."custom_screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_screen_entry_presentation_overrides" ADD CONSTRAINT "custom_screen_entry_presentation_overrides_entry_id_content_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_screen_entry_presentation_overrides" ADD CONSTRAINT "custom_screen_entry_presentation_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csepo_scope_idx" ON "custom_screen_entry_presentation_overrides" USING btree ("screen_id","entry_id");--> statement-breakpoint
CREATE INDEX "csepo_entry_idx" ON "custom_screen_entry_presentation_overrides" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "csepo_updated_by_idx" ON "custom_screen_entry_presentation_overrides" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "csepo_updated_at_idx" ON "custom_screen_entry_presentation_overrides" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "csepo_target_unique_idx" ON "custom_screen_entry_presentation_overrides" USING btree ("screen_id","entry_id","block_id","prop_path");
CREATE TABLE "custom_screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content_type_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bindings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_screens" ADD CONSTRAINT "custom_screens_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "custom_screens_name_idx" ON "custom_screens" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "custom_screens_content_type_id_idx" ON "custom_screens" USING btree ("content_type_id");
--> statement-breakpoint
CREATE INDEX "custom_screens_status_idx" ON "custom_screens" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "custom_screens_updated_at_idx" ON "custom_screens" USING btree ("updated_at");

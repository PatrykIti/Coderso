CREATE TABLE "admin_theme_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_theme_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tokens" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_theme_profiles" ADD CONSTRAINT "admin_theme_profiles_template_id_admin_theme_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."admin_theme_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_theme_profiles_name_idx" ON "admin_theme_profiles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "admin_theme_profiles_active_idx" ON "admin_theme_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "admin_theme_profiles_template_idx" ON "admin_theme_profiles" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_theme_templates_name_idx" ON "admin_theme_templates" USING btree ("name");

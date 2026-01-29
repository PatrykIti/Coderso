CREATE TABLE "theme_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "theme_name" text NOT NULL,
  "tokens" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "theme_profiles_name_idx" ON "theme_profiles" ("name");
--> statement-breakpoint
CREATE INDEX "theme_profiles_active_idx" ON "theme_profiles" ("is_active");
--> statement-breakpoint

CREATE TABLE "theme_routes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "theme_profiles"("id") ON DELETE cascade,
  "path" text NOT NULL,
  "page_id" uuid REFERENCES "pages"("id") ON DELETE set null,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "theme_routes_profile_path_idx" ON "theme_routes" ("profile_id", "path");
--> statement-breakpoint
CREATE INDEX "theme_routes_profile_idx" ON "theme_routes" ("profile_id");

CREATE TABLE "plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"api_version" text NOT NULL,
	"core_version" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'installed' NOT NULL,
	"permissions" jsonb NOT NULL,
	"entry" jsonb NOT NULL,
	"integrity" jsonb NOT NULL,
	"signature" text,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"error_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "plugins_name_unique" ON "plugins" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "plugins_status_idx" ON "plugins" USING btree ("status");
--> statement-breakpoint
CREATE TABLE "plugin_settings" (
	"plugin_name" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_settings_plugin_name_key_pk" PRIMARY KEY("plugin_name","key")
);
--> statement-breakpoint
ALTER TABLE "plugin_settings" ADD CONSTRAINT "plugin_settings_plugin_name_plugins_name_fk" FOREIGN KEY ("plugin_name") REFERENCES "public"."plugins"("name") ON DELETE cascade ON UPDATE no action;

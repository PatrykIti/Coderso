CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid NOT NULL,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "user_settings_user_id_key_pk" PRIMARY KEY ("user_id","key")
);

CREATE INDEX IF NOT EXISTS "user_settings_user_id_idx" ON "user_settings" ("user_id");

ALTER TABLE "users" ADD COLUMN "email_hash" text;
ALTER TABLE "users" ADD COLUMN "email_encrypted" jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_hash_idx" ON "users" ("email_hash") WHERE "email_hash" IS NOT NULL;

CREATE TABLE "backup_users_staging" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"kind" text NOT NULL,
	"role_id" text,
	"role_name" text,
	"role_description" text,
	"role_permissions" jsonb,
	"user_id" text,
	"user_email" text,
	"user_email_hash" text,
	"user_email_encrypted" jsonb,
	"user_password_hash" text,
	"user_name" text,
	"user_status" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"last_login_at" timestamp,
	CONSTRAINT "backup_users_staging_kind_check" CHECK ("backup_users_staging"."kind" in ('role', 'user', 'user_role'))
);--> statement-breakpoint
CREATE INDEX "backup_users_staging_run_idx" ON "backup_users_staging" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "backup_users_staging_role_name_key" ON "backup_users_staging" USING btree ("run_id","role_name") WHERE kind = 'role';--> statement-breakpoint
CREATE UNIQUE INDEX "backup_users_staging_user_email_key" ON "backup_users_staging" USING btree ("run_id","user_email") WHERE kind = 'user';--> statement-breakpoint
CREATE UNIQUE INDEX "backup_users_staging_user_role_key" ON "backup_users_staging" USING btree ("run_id","user_id","role_id") WHERE kind = 'user_role';

ALTER TABLE "backup_schedules" ADD COLUMN "next_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "backup_schedules" ADD COLUMN "last_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "artifact_key" text;--> statement-breakpoint
CREATE INDEX "backup_schedules_next_run_at_idx" ON "backup_schedules" USING btree ("next_run_at");
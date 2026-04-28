CREATE TABLE "backup_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"storage_driver" text DEFAULT 'local' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"kind" text DEFAULT 'manual' NOT NULL,
	"storage_driver" text DEFAULT 'local' NOT NULL,
	"artifact_path" text,
	"size_bytes" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "backup_schedules_frequency_idx" ON "backup_schedules" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "backups_status_idx" ON "backups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backups_created_at_idx" ON "backups" USING btree ("created_at");
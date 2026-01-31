CREATE TABLE "integration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"last_checked_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "integration_requests_status_idx" ON "integration_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integrations_status_idx" ON "integrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integrations_health_idx" ON "integrations" USING btree ("health_status");
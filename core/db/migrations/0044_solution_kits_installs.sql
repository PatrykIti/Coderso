CREATE TABLE "solution_kit_install_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"resource_type" text NOT NULL,
	"resource_key" text NOT NULL,
	"operation" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"rollback_action" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_kit_install_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kit_id" text NOT NULL,
	"mode" text DEFAULT 'apply' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"actor_id" uuid,
	"rollback_of_run_id" uuid,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "solution_kit_install_items" ADD CONSTRAINT "solution_kit_install_items_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_install_runs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_install_runs_rollback_of_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("rollback_of_run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solution_kit_install_items_run_idx" ON "solution_kit_install_items" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "solution_kit_install_items_resource_idx" ON "solution_kit_install_items" USING btree ("resource_type","resource_key");--> statement-breakpoint
CREATE INDEX "solution_kit_install_items_status_idx" ON "solution_kit_install_items" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "solution_kit_install_items_run_position_idx" ON "solution_kit_install_items" USING btree ("run_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "solution_kit_install_items_run_resource_idx" ON "solution_kit_install_items" USING btree ("run_id","resource_type","resource_key");--> statement-breakpoint
CREATE INDEX "solution_kit_install_runs_kit_idx" ON "solution_kit_install_runs" USING btree ("kit_id");--> statement-breakpoint
CREATE INDEX "solution_kit_install_runs_status_idx" ON "solution_kit_install_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "solution_kit_install_runs_created_at_idx" ON "solution_kit_install_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "solution_kit_install_runs_rollback_idx" ON "solution_kit_install_runs" USING btree ("rollback_of_run_id");
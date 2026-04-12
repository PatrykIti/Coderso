CREATE TABLE "assistant_action_undo_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"action_id" text NOT NULL,
	"action_type" text NOT NULL,
	"operation" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"resource_key" text NOT NULL,
	"resource_label" text,
	"created_by_assistant" boolean DEFAULT false NOT NULL,
	"undo_strategy" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"dependency_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"public_impact" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"after_fingerprint" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_action_undo_items" ADD CONSTRAINT "assistant_action_undo_items_execution_id_assistant_action_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."assistant_action_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_action_undo_items_execution_idx" ON "assistant_action_undo_items" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "assistant_action_undo_items_resource_idx" ON "assistant_action_undo_items" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "assistant_action_undo_items_status_idx" ON "assistant_action_undo_items" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_action_undo_items_execution_action_resource_idx" ON "assistant_action_undo_items" USING btree ("execution_id","action_id","resource_type","resource_key");
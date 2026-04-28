CREATE TABLE "assistant_action_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"actor_id" uuid,
	"plan_id" text NOT NULL,
	"plan_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_action_executions" ADD CONSTRAINT "assistant_action_executions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_action_executions_key_idx" ON "assistant_action_executions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "assistant_action_executions_actor_idx" ON "assistant_action_executions" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "assistant_action_executions_plan_idx" ON "assistant_action_executions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "assistant_action_executions_created_idx" ON "assistant_action_executions" USING btree ("created_at");
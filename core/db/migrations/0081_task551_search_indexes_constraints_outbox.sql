CREATE TABLE "cache_invalidation_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"tags" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claim_token" text,
	"claim_until" timestamp,
	"processed_at" timestamp,
	"last_error_code" text,
	CONSTRAINT "cache_invalidation_outbox_attempts_chk" CHECK ("cache_invalidation_outbox"."attempts" >= 0),
	CONSTRAINT "cache_invalidation_outbox_tags_chk" CHECK (jsonb_typeof("cache_invalidation_outbox"."tags") = 'array' AND jsonb_array_length("cache_invalidation_outbox"."tags") BETWEEN 1 AND 32),
	CONSTRAINT "cache_invalidation_outbox_event_key_bytes_chk" CHECK (octet_length("cache_invalidation_outbox"."event_key") BETWEEN 1 AND 128),
	CONSTRAINT "cache_invalidation_outbox_state_chk" CHECK (("cache_invalidation_outbox"."processed_at" IS NULL AND "cache_invalidation_outbox"."claim_token" IS NULL AND "cache_invalidation_outbox"."claim_until" IS NULL) OR ("cache_invalidation_outbox"."processed_at" IS NULL AND "cache_invalidation_outbox"."claim_token" IS NOT NULL AND "cache_invalidation_outbox"."claim_until" IS NOT NULL) OR ("cache_invalidation_outbox"."processed_at" IS NOT NULL AND "cache_invalidation_outbox"."claim_token" IS NULL AND "cache_invalidation_outbox"."claim_until" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "solution_kit_legacy_rollback_progress" (
	"rollback_run_id" uuid NOT NULL,
	"source_run_id" uuid NOT NULL,
	"source_evidence_id" uuid NOT NULL,
	"contract" text NOT NULL,
	"source_status" text NOT NULL,
	"source_position" integer NOT NULL,
	"rollback_position" integer NOT NULL,
	"state" text NOT NULL,
	"source_evidence_digest" text NOT NULL,
	"source_after_digest" text NOT NULL,
	"rollback_target_digest" text,
	"mutation_invalidation_event_key" text,
	"compensation_invalidation_event_key" text,
	"progress_digest" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solution_kit_legacy_rollback_progress_rollback_run_id_source_position_pk" PRIMARY KEY("rollback_run_id","source_position"),
	CONSTRAINT "solution_kit_legacy_progress_state_chk" CHECK ("solution_kit_legacy_rollback_progress"."contract" = 'coderso.legacy-template-rollback-progress@v1'
        AND "solution_kit_legacy_rollback_progress"."source_status" = 'success'
        AND "solution_kit_legacy_rollback_progress"."source_position" BETWEEN 0 AND 511
        AND "solution_kit_legacy_rollback_progress"."rollback_position" BETWEEN 0 AND 511
        AND "solution_kit_legacy_rollback_progress"."source_evidence_digest" ~ '^[0-9a-f]{64}$'
        AND "solution_kit_legacy_rollback_progress"."source_after_digest" ~ '^[0-9a-f]{64}$'
        AND "solution_kit_legacy_rollback_progress"."progress_digest" ~ '^[0-9a-f]{64}$'
        AND ("solution_kit_legacy_rollback_progress"."rollback_target_digest" IS NULL OR "solution_kit_legacy_rollback_progress"."rollback_target_digest" ~ '^[0-9a-f]{64}$')
        AND ("solution_kit_legacy_rollback_progress"."mutation_invalidation_event_key" IS NULL OR octet_length("solution_kit_legacy_rollback_progress"."mutation_invalidation_event_key") BETWEEN 1 AND 128)
        AND ("solution_kit_legacy_rollback_progress"."compensation_invalidation_event_key" IS NULL OR octet_length("solution_kit_legacy_rollback_progress"."compensation_invalidation_event_key") BETWEEN 1 AND 128)
        AND "solution_kit_legacy_rollback_progress"."state" IN ('rollback_committed', 'source_restored', 'failed_no_mutation')
        AND ("solution_kit_legacy_rollback_progress"."state" <> 'failed_no_mutation' OR "solution_kit_legacy_rollback_progress"."rollback_target_digest" IS NULL AND "solution_kit_legacy_rollback_progress"."mutation_invalidation_event_key" IS NULL AND "solution_kit_legacy_rollback_progress"."compensation_invalidation_event_key" IS NULL)
        AND ("solution_kit_legacy_rollback_progress"."state" <> 'rollback_committed' OR "solution_kit_legacy_rollback_progress"."rollback_target_digest" IS NOT NULL AND "solution_kit_legacy_rollback_progress"."mutation_invalidation_event_key" IS NOT NULL AND "solution_kit_legacy_rollback_progress"."compensation_invalidation_event_key" IS NULL)
        AND ("solution_kit_legacy_rollback_progress"."state" <> 'source_restored' OR "solution_kit_legacy_rollback_progress"."rollback_target_digest" IS NOT NULL AND "solution_kit_legacy_rollback_progress"."mutation_invalidation_event_key" IS NOT NULL AND "solution_kit_legacy_rollback_progress"."compensation_invalidation_event_key" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "solution_kit_legacy_template_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL,
	"source_position" integer NOT NULL,
	"template_key" text NOT NULL,
	"template_id" uuid,
	"plan_digest" text NOT NULL,
	"operation" text NOT NULL,
	"status" text NOT NULL,
	"before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"rollback_action" jsonb,
	"safe_error_code" text,
	"evidence_digest" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solution_kit_legacy_template_evidence_identity_key" UNIQUE("id","source_run_id","source_position","evidence_digest","status"),
	CONSTRAINT "solution_kit_legacy_template_evidence_state_chk" CHECK ("solution_kit_legacy_template_evidence"."source_position" BETWEEN 0 AND 511
        AND octet_length("solution_kit_legacy_template_evidence"."template_key") BETWEEN 1 AND 128
        AND "solution_kit_legacy_template_evidence"."plan_digest" ~ '^[0-9a-f]{64}$'
        AND "solution_kit_legacy_template_evidence"."evidence_digest" ~ '^[0-9a-f]{64}$'
        AND ("solution_kit_legacy_template_evidence"."safe_error_code" IS NULL OR "solution_kit_legacy_template_evidence"."safe_error_code" ~ '^[ -~]{1,96}$')
        AND "solution_kit_legacy_template_evidence"."operation" IN ('create', 'update', 'noop')
        AND "solution_kit_legacy_template_evidence"."status" IN ('success', 'failed', 'skipped')
        AND ("solution_kit_legacy_template_evidence"."before_snapshot" IS NULL OR jsonb_typeof("solution_kit_legacy_template_evidence"."before_snapshot") = 'object')
        AND ("solution_kit_legacy_template_evidence"."after_snapshot" IS NULL OR jsonb_typeof("solution_kit_legacy_template_evidence"."after_snapshot") = 'object')
        AND ("solution_kit_legacy_template_evidence"."status" = 'success' AND "solution_kit_legacy_template_evidence"."template_id" IS NOT NULL AND "solution_kit_legacy_template_evidence"."safe_error_code" IS NULL
           OR "solution_kit_legacy_template_evidence"."status" <> 'success' AND "solution_kit_legacy_template_evidence"."after_snapshot" IS NULL AND "solution_kit_legacy_template_evidence"."rollback_action" IS NULL)
        AND ("solution_kit_legacy_template_evidence"."status" <> 'failed' OR "solution_kit_legacy_template_evidence"."safe_error_code" IS NOT NULL)
        AND ("solution_kit_legacy_template_evidence"."status" <> 'skipped' OR "solution_kit_legacy_template_evidence"."safe_error_code" IS NULL)
        AND ("solution_kit_legacy_template_evidence"."operation" <> 'create' OR "solution_kit_legacy_template_evidence"."before_snapshot" IS NULL AND "solution_kit_legacy_template_evidence"."after_snapshot" IS NOT NULL AND "solution_kit_legacy_template_evidence"."rollback_action" IS NOT NULL)
        AND ("solution_kit_legacy_template_evidence"."operation" <> 'update' OR "solution_kit_legacy_template_evidence"."before_snapshot" IS NOT NULL AND "solution_kit_legacy_template_evidence"."after_snapshot" IS NOT NULL AND "solution_kit_legacy_template_evidence"."rollback_action" IS NOT NULL)
        AND ("solution_kit_legacy_template_evidence"."operation" <> 'noop' OR "solution_kit_legacy_template_evidence"."before_snapshot" IS NOT NULL AND "solution_kit_legacy_template_evidence"."after_snapshot" IS NOT NULL AND "solution_kit_legacy_template_evidence"."before_snapshot" = "solution_kit_legacy_template_evidence"."after_snapshot" AND "solution_kit_legacy_template_evidence"."rollback_action" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "solution_kit_starter_apply_owners" (
	"source_run_id" uuid NOT NULL,
	"package_key" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"contract" text NOT NULL,
	"definition_digest" text NOT NULL,
	"phase" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"envelope_digest" text NOT NULL,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solution_kit_starter_apply_owners_source_run_id_pk" PRIMARY KEY("source_run_id"),
	CONSTRAINT "solution_kit_starter_apply_owners_state_chk" CHECK ("solution_kit_starter_apply_owners"."contract" = 'coderso.starter-content-rollback@v1'
        AND octet_length("solution_kit_starter_apply_owners"."package_key") BETWEEN 1 AND 128
        AND "solution_kit_starter_apply_owners"."definition_digest" ~ '^[0-9a-f]{64}$'
        AND "solution_kit_starter_apply_owners"."envelope_digest" ~ '^[0-9a-f]{64}$'
        AND jsonb_typeof("solution_kit_starter_apply_owners"."envelope") = 'object'
        AND "solution_kit_starter_apply_owners"."envelope" ->> 'contract' = "solution_kit_starter_apply_owners"."contract"
        AND "solution_kit_starter_apply_owners"."envelope" ->> 'definitionDigest' = "solution_kit_starter_apply_owners"."definition_digest"
        AND "solution_kit_starter_apply_owners"."envelope" ->> 'phase' = "solution_kit_starter_apply_owners"."phase"
        AND "solution_kit_starter_apply_owners"."phase" IN ('before_captured', 'core_applying', 'core_applied', 'templates_applying', 'templates_applied', 'shell_write_prepared', 'shell_write_applied', 'complete')
        AND (("solution_kit_starter_apply_owners"."released_at" IS NULL AND "solution_kit_starter_apply_owners"."envelope" -> 'active' = 'true'::jsonb)
          OR ("solution_kit_starter_apply_owners"."released_at" IS NOT NULL AND "solution_kit_starter_apply_owners"."phase" = 'complete' AND "solution_kit_starter_apply_owners"."envelope" -> 'active' = 'false'::jsonb)))
);
--> statement-breakpoint
CREATE TABLE "task551_migration_operations" (
	"operation_id" uuid PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"generation" integer NOT NULL,
	"direction" text NOT NULL,
	"state" text NOT NULL,
	"receipt" jsonb NOT NULL,
	"previous_state_sha256" text,
	"state_sha256" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task551_migration_operations_task_chk" CHECK ("task551_migration_operations"."task_id" = 'TASK-551'),
	CONSTRAINT "task551_migration_operations_generation_chk" CHECK ("task551_migration_operations"."generation" BETWEEN 0 AND 2147483647),
	CONSTRAINT "task551_migration_operations_direction_chk" CHECK ("task551_migration_operations"."direction" IN ('forward', 'reverse')),
	CONSTRAINT "task551_migration_operations_state_chk" CHECK ("task551_migration_operations"."state" IN ('resolved', 'preflight_passed', 'drain_requested', 'drain_confirmed', 'transaction_apply_pending', 'transaction_applied', 'revision_integrity_building', 'revision_integrity_ready', 'resume_authorized', 'resume_completed', 'operator_resume_authorized', 'read_performance_building', 'forward_ready', 'reverse_drain_requested', 'reverse_drain_confirmed', 'reverse_indexes_building', 'reverse_transaction_pending', 'reverse_complete')),
	CONSTRAINT "task551_migration_operations_state_sha256_chk" CHECK ("task551_migration_operations"."state_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "task551_migration_operations_receipt_version_chk" CHECK ("task551_migration_operations"."receipt" ->> 'version' = '2'),
	CONSTRAINT "task551_migration_operations_receipt_operation_chk" CHECK ("task551_migration_operations"."receipt" ->> 'operationId' = "task551_migration_operations"."operation_id"::text),
	CONSTRAINT "task551_migration_operations_receipt_size_chk" CHECK (octet_length("task551_migration_operations"."receipt"::text) BETWEEN 1 AND 65536)
);
--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" DROP CONSTRAINT "solution_kit_install_runs_rollback_of_run_id_solution_kit_install_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "assistant_doc_chunks" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(heading, '')), 'A') || setweight(to_tsvector('simple', coalesce(content, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "assistant_docs" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(keywords_json::text, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "content_entries" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "content_entries" ADD COLUMN "search_trigram_text" text GENERATED ALWAYS AS (lower(regexp_replace(btrim(coalesce(coalesce(title, '') || ' ' || coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, ''), '')), '[[:space:]]+', ' ', 'g'))) STORED;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(name, '')), 'A')) STORED;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "search_trigram_text" text GENERATED ALWAYS AS (lower(regexp_replace(btrim(coalesce(coalesce(name, ''), '')), '[[:space:]]+', ' ', 'g'))) STORED;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(alt, '')), 'A') || setweight(to_tsvector('simple', coalesce(caption, '') || ' ' || coalesce(key, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "search_trigram_text" text GENERATED ALWAYS AS (lower(regexp_replace(btrim(coalesce(coalesce(title, '') || ' ' || coalesce(alt, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(key, ''), '')), '[[:space:]]+', ' ', 'g'))) STORED;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD COLUMN "legacy_template_plan_version" integer;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD COLUMN "legacy_template_plan_count" integer;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD COLUMN "legacy_template_plan_digest" text;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD COLUMN "rollback_proof_version" integer;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD COLUMN "rollback_proof_kind" text;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD COLUMN "rollback_proof_digest" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "search_trigram_text" text GENERATED ALWAYS AS (lower(regexp_replace(btrim(coalesce(coalesce(title, '') || ' ' || coalesce(slug, ''), '')), '[[:space:]]+', ' ', 'g'))) STORED;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_trigram_text" text GENERATED ALWAYS AS (lower(regexp_replace(btrim(coalesce(coalesce(title, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', ''), '')), '[[:space:]]+', ' ', 'g'))) STORED;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_runs_id_package_actor_key" UNIQUE("id","kit_id","actor_id");--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_runs_id_rollback_relation_key" UNIQUE("id","rollback_of_run_id");--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_runs_id_legacy_template_plan_key" UNIQUE("id","legacy_template_plan_digest");--> statement-breakpoint
ALTER TABLE "solution_kit_legacy_rollback_progress" ADD CONSTRAINT "solution_kit_legacy_rollback_progress_rollback_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("rollback_run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_legacy_rollback_progress" ADD CONSTRAINT "solution_kit_legacy_rollback_progress_source_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_legacy_rollback_progress" ADD CONSTRAINT "solution_kit_legacy_progress_rollback_relation_fk" FOREIGN KEY ("rollback_run_id","source_run_id") REFERENCES "public"."solution_kit_install_runs"("id","rollback_of_run_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_legacy_rollback_progress" ADD CONSTRAINT "solution_kit_legacy_progress_source_evidence_fk" FOREIGN KEY ("source_evidence_id","source_run_id","source_position","source_evidence_digest","source_status") REFERENCES "public"."solution_kit_legacy_template_evidence"("id","source_run_id","source_position","evidence_digest","status") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_legacy_template_evidence" ADD CONSTRAINT "solution_kit_legacy_template_evidence_source_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_legacy_template_evidence" ADD CONSTRAINT "solution_kit_legacy_template_evidence_plan_fk" FOREIGN KEY ("source_run_id","plan_digest") REFERENCES "public"."solution_kit_install_runs"("id","legacy_template_plan_digest") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_starter_apply_owners" ADD CONSTRAINT "solution_kit_starter_apply_owners_source_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_starter_apply_owners" ADD CONSTRAINT "solution_kit_starter_apply_owners_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_starter_apply_owners" ADD CONSTRAINT "solution_kit_starter_apply_owners_source_identity_fk" FOREIGN KEY ("source_run_id","package_key","actor_id") REFERENCES "public"."solution_kit_install_runs"("id","kit_id","actor_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_install_runs_rollback_of_run_id_solution_kit_install_runs_id_fk" FOREIGN KEY ("rollback_of_run_id") REFERENCES "public"."solution_kit_install_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_valid_window_chk" CHECK ("bookings"."ends_at" > "bookings"."starts_at");--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_runs_rollback_relation_chk" CHECK (("solution_kit_install_runs"."mode" = 'rollback') = ("solution_kit_install_runs"."rollback_of_run_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_runs_legacy_template_plan_chk" CHECK (("solution_kit_install_runs"."legacy_template_plan_version" IS NULL AND "solution_kit_install_runs"."legacy_template_plan_count" IS NULL AND "solution_kit_install_runs"."legacy_template_plan_digest" IS NULL)
        OR ("solution_kit_install_runs"."mode" = 'apply'
          AND "solution_kit_install_runs"."legacy_template_plan_version" = 1
          AND "solution_kit_install_runs"."legacy_template_plan_count" BETWEEN 0 AND 100
          AND "solution_kit_install_runs"."legacy_template_plan_digest" ~ '^[0-9a-f]{64}$'));--> statement-breakpoint
ALTER TABLE "solution_kit_install_runs" ADD CONSTRAINT "solution_kit_runs_rollback_proof_state_chk" CHECK (("solution_kit_install_runs"."rollback_proof_version" IS NULL AND "solution_kit_install_runs"."rollback_proof_kind" IS NULL AND "solution_kit_install_runs"."rollback_proof_digest" IS NULL)
        OR ("solution_kit_install_runs"."rollback_proof_version" = 1
          AND "solution_kit_install_runs"."mode" = 'rollback'
          AND "solution_kit_install_runs"."finished_at" IS NOT NULL
          AND "solution_kit_install_runs"."rollback_proof_digest" ~ '^[0-9a-f]{64}$'
          AND (("solution_kit_install_runs"."status" = 'success' AND "solution_kit_install_runs"."rollback_proof_kind" = 'complete')
            OR ("solution_kit_install_runs"."status" = 'failed' AND "solution_kit_install_runs"."rollback_proof_kind" = 'zero_net'))));--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE bookings ADD CONSTRAINT bookings_active_resource_window_excl EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'));

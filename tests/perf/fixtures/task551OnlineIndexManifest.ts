/**
 * TASK-551-05-L01 closed online-index manifest (test-only fixture).
 *
 * The exact ordered set of every new snapshot-owned index of migration
 * `0081_task551_search_indexes_constraints_outbox`, in the order the rollout
 * orchestrator (`scripts/task-551-online-indexes.ts`) must build and reverse
 * them. Bytes here are the executable truth: `createSql` is the verbatim
 * top-level `CREATE [UNIQUE] INDEX CONCURRENTLY` statement of
 * `core/db/migrations/0081_task551_online_indexes.sql`, and `dropSql` is its
 * matching guarded reverse statement. The transactional migration contains
 * none of these statements, and the four composite foreign-key targets in that
 * migration are unique CONSTRAINTS, not indexes, so they are asserted — never
 * rebuilt — by this manifest.
 *
 * Group 1 (`revision-integrity`) is immutable: the two new revision unique
 * indexes, which gate external resume. Group 2 (`read-performance`) is the
 * remaining snapshot-owned set in generated order. The already-committed
 * `content_revisions_entry_version_idx` is a preserved catalog member asserted
 * byte-identical by the parity suite; it is deliberately NOT a manifest member.
 */

export type Task551OnlineIndexGroup = "revision-integrity" | "read-performance";

export type Task551OnlineIndexMember = Readonly<{
  name: string;
  table: string;
  group: Task551OnlineIndexGroup;
  unique: boolean;
  /** Zero-based position in the closed build/reverse order. */
  order: number;
  createSql: string;
  dropSql: string;
}>;

export const TASK551_ONLINE_INDEX_MEMBERS: readonly Task551OnlineIndexMember[] = [
  {
    name: "page_revisions_page_version_idx",
    table: "page_revisions",
    group: "revision-integrity",
    unique: true,
    order: 0,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "page_revisions_page_version_idx" ON "page_revisions" USING btree ("page_id","version")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "page_revisions_page_version_idx"',
  },
  {
    name: "widget_template_revisions_template_version_idx",
    table: "widget_template_revisions",
    group: "revision-integrity",
    unique: true,
    order: 1,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "widget_template_revisions_template_version_idx" ON "widget_template_revisions" USING btree ("template_id","version")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "widget_template_revisions_template_version_idx"',
  },
  {
    name: "cache_invalidation_outbox_event_key_idx",
    table: "cache_invalidation_outbox",
    group: "read-performance",
    unique: true,
    order: 2,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "cache_invalidation_outbox_event_key_idx" ON "cache_invalidation_outbox" USING btree ("event_key")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "cache_invalidation_outbox_event_key_idx"',
  },
  {
    name: "cache_invalidation_outbox_pending_idx",
    table: "cache_invalidation_outbox",
    group: "read-performance",
    unique: false,
    order: 3,
    createSql:
      'CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_pending_idx" ON "cache_invalidation_outbox" USING btree ("available_at","id") WHERE processed_at IS NULL AND claim_token IS NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "cache_invalidation_outbox_pending_idx"',
  },
  {
    name: "cache_invalidation_outbox_expired_claim_idx",
    table: "cache_invalidation_outbox",
    group: "read-performance",
    unique: false,
    order: 4,
    createSql:
      'CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_expired_claim_idx" ON "cache_invalidation_outbox" USING btree ("claim_until","id") WHERE processed_at IS NULL AND claim_token IS NOT NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "cache_invalidation_outbox_expired_claim_idx"',
  },
  {
    name: "cache_invalidation_outbox_processed_idx",
    table: "cache_invalidation_outbox",
    group: "read-performance",
    unique: false,
    order: 5,
    createSql:
      'CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_processed_idx" ON "cache_invalidation_outbox" USING btree ("processed_at","id") WHERE processed_at IS NOT NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "cache_invalidation_outbox_processed_idx"',
  },
  {
    name: "cache_outbox_unprocessed_age_idx",
    table: "cache_invalidation_outbox",
    group: "read-performance",
    unique: false,
    order: 6,
    createSql:
      'CREATE INDEX CONCURRENTLY "cache_outbox_unprocessed_age_idx" ON "cache_invalidation_outbox" USING btree ("created_at","id") WHERE processed_at IS NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "cache_outbox_unprocessed_age_idx"',
  },
  {
    name: "solution_kit_legacy_rollback_progress_rollback_position_idx",
    table: "solution_kit_legacy_rollback_progress",
    group: "read-performance",
    unique: true,
    order: 7,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_legacy_rollback_progress_rollback_position_idx" ON "solution_kit_legacy_rollback_progress" USING btree ("rollback_run_id","rollback_position")',
    dropSql:
      'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_legacy_rollback_progress_rollback_position_idx"',
  },
  {
    name: "solution_kit_legacy_rollback_progress_source_idx",
    table: "solution_kit_legacy_rollback_progress",
    group: "read-performance",
    unique: false,
    order: 8,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_legacy_rollback_progress_source_idx" ON "solution_kit_legacy_rollback_progress" USING btree ("source_run_id","source_position")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_legacy_rollback_progress_source_idx"',
  },
  {
    name: "solution_kit_legacy_rollback_progress_source_evidence_idx",
    table: "solution_kit_legacy_rollback_progress",
    group: "read-performance",
    unique: false,
    order: 9,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_legacy_rollback_progress_source_evidence_idx" ON "solution_kit_legacy_rollback_progress" USING btree ("source_evidence_id")',
    dropSql:
      'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_legacy_rollback_progress_source_evidence_idx"',
  },
  {
    name: "solution_kit_legacy_template_evidence_source_position_key",
    table: "solution_kit_legacy_template_evidence",
    group: "read-performance",
    unique: true,
    order: 10,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_legacy_template_evidence_source_position_key" ON "solution_kit_legacy_template_evidence" USING btree ("source_run_id","source_position")',
    dropSql:
      'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_legacy_template_evidence_source_position_key"',
  },
  {
    name: "solution_kit_legacy_template_evidence_source_key",
    table: "solution_kit_legacy_template_evidence",
    group: "read-performance",
    unique: true,
    order: 11,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_legacy_template_evidence_source_key" ON "solution_kit_legacy_template_evidence" USING btree ("source_run_id","template_key")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_legacy_template_evidence_source_key"',
  },
  {
    name: "solution_kit_starter_apply_owners_active_idx",
    table: "solution_kit_starter_apply_owners",
    group: "read-performance",
    unique: true,
    order: 12,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_starter_apply_owners_active_idx" ON "solution_kit_starter_apply_owners" USING btree ("package_key","actor_id") WHERE released_at IS NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_starter_apply_owners_active_idx"',
  },
  {
    name: "analytics_pageviews_session_created_idx",
    table: "analytics_pageviews",
    group: "read-performance",
    unique: false,
    order: 13,
    createSql:
      'CREATE INDEX CONCURRENTLY "analytics_pageviews_session_created_idx" ON "analytics_pageviews" USING btree ("session_id","created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "analytics_pageviews_session_created_idx"',
  },
  {
    name: "analytics_pageviews_retention_idx",
    table: "analytics_pageviews",
    group: "read-performance",
    unique: false,
    order: 14,
    createSql:
      'CREATE INDEX CONCURRENTLY "analytics_pageviews_retention_idx" ON "analytics_pageviews" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "analytics_pageviews_retention_idx"',
  },
  {
    name: "analytics_sessions_retention_idx",
    table: "analytics_sessions",
    group: "read-performance",
    unique: false,
    order: 15,
    createSql:
      'CREATE INDEX CONCURRENTLY "analytics_sessions_retention_idx" ON "analytics_sessions" USING btree ("last_seen_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "analytics_sessions_retention_idx"',
  },
  {
    name: "assistant_action_executions_retention_idx",
    table: "assistant_action_executions",
    group: "read-performance",
    unique: false,
    order: 16,
    createSql:
      'CREATE INDEX CONCURRENTLY "assistant_action_executions_retention_idx" ON "assistant_action_executions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "assistant_action_executions_retention_idx"',
  },
  {
    name: "assistant_action_undo_execution_created_idx",
    table: "assistant_action_undo_items",
    group: "read-performance",
    unique: false,
    order: 17,
    createSql:
      'CREATE INDEX CONCURRENTLY "assistant_action_undo_execution_created_idx" ON "assistant_action_undo_items" USING btree ("execution_id","created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "assistant_action_undo_execution_created_idx"',
  },
  {
    name: "assistant_doc_chunks_search_vector_idx",
    table: "assistant_doc_chunks",
    group: "read-performance",
    unique: false,
    order: 18,
    createSql:
      'CREATE INDEX CONCURRENTLY "assistant_doc_chunks_search_vector_idx" ON "assistant_doc_chunks" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "assistant_doc_chunks_search_vector_idx"',
  },
  {
    name: "assistant_ingest_retention_idx",
    table: "assistant_doc_ingest_runs",
    group: "read-performance",
    unique: false,
    order: 19,
    createSql:
      'CREATE INDEX CONCURRENTLY "assistant_ingest_retention_idx" ON "assistant_doc_ingest_runs" USING btree ("started_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "assistant_ingest_retention_idx"',
  },
  {
    name: "assistant_ingest_source_success_idx",
    table: "assistant_doc_ingest_runs",
    group: "read-performance",
    unique: false,
    order: 20,
    createSql:
      'CREATE INDEX CONCURRENTLY "assistant_ingest_source_success_idx" ON "assistant_doc_ingest_runs" USING btree ("source_root","started_at" desc,"id" desc) WHERE status = \'success\'',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "assistant_ingest_source_success_idx"',
  },
  {
    name: "assistant_docs_search_vector_idx",
    table: "assistant_docs",
    group: "read-performance",
    unique: false,
    order: 21,
    createSql:
      'CREATE INDEX CONCURRENTLY "assistant_docs_search_vector_idx" ON "assistant_docs" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "assistant_docs_search_vector_idx"',
  },
  {
    name: "booking_blackouts_starts_id_idx",
    table: "booking_blackouts",
    group: "read-performance",
    unique: false,
    order: 22,
    createSql:
      'CREATE INDEX CONCURRENTLY "booking_blackouts_starts_id_idx" ON "booking_blackouts" USING btree ("starts_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "booking_blackouts_starts_id_idx"',
  },
  {
    name: "booking_blackouts_resource_starts_id_idx",
    table: "booking_blackouts",
    group: "read-performance",
    unique: false,
    order: 23,
    createSql:
      'CREATE INDEX CONCURRENTLY "booking_blackouts_resource_starts_id_idx" ON "booking_blackouts" USING btree ("resource_id","starts_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "booking_blackouts_resource_starts_id_idx"',
  },
  {
    name: "booking_resources_name_id_idx",
    table: "booking_resources",
    group: "read-performance",
    unique: false,
    order: 24,
    createSql:
      'CREATE INDEX CONCURRENTLY "booking_resources_name_id_idx" ON "booking_resources" USING btree ("name","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "booking_resources_name_id_idx"',
  },
  {
    name: "booking_schedules_resource_order_idx",
    table: "booking_schedules",
    group: "read-performance",
    unique: false,
    order: 25,
    createSql:
      'CREATE INDEX CONCURRENTLY "booking_schedules_resource_order_idx" ON "booking_schedules" USING btree ("resource_id","day_of_week","start_minute","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "booking_schedules_resource_order_idx"',
  },
  {
    name: "booking_services_name_id_idx",
    table: "booking_services",
    group: "read-performance",
    unique: false,
    order: 26,
    createSql:
      'CREATE INDEX CONCURRENTLY "booking_services_name_id_idx" ON "booking_services" USING btree ("name","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "booking_services_name_id_idx"',
  },
  {
    name: "bookings_list_starts_id_idx",
    table: "bookings",
    group: "read-performance",
    unique: false,
    order: 27,
    createSql:
      'CREATE INDEX CONCURRENTLY "bookings_list_starts_id_idx" ON "bookings" USING btree ("starts_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "bookings_list_starts_id_idx"',
  },
  {
    name: "bookings_resource_list_starts_id_idx",
    table: "bookings",
    group: "read-performance",
    unique: false,
    order: 28,
    createSql:
      'CREATE INDEX CONCURRENTLY "bookings_resource_list_starts_id_idx" ON "bookings" USING btree ("resource_id","starts_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "bookings_resource_list_starts_id_idx"',
  },
  {
    name: "bookings_service_list_starts_id_idx",
    table: "bookings",
    group: "read-performance",
    unique: false,
    order: 29,
    createSql:
      'CREATE INDEX CONCURRENTLY "bookings_service_list_starts_id_idx" ON "bookings" USING btree ("service_id","starts_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "bookings_service_list_starts_id_idx"',
  },
  {
    name: "bookings_status_list_starts_id_idx",
    table: "bookings",
    group: "read-performance",
    unique: false,
    order: 30,
    createSql:
      'CREATE INDEX CONCURRENTLY "bookings_status_list_starts_id_idx" ON "bookings" USING btree ("status","starts_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "bookings_status_list_starts_id_idx"',
  },
  {
    name: "content_entries_search_vector_idx",
    table: "content_entries",
    group: "read-performance",
    unique: false,
    order: 31,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_entries_search_vector_idx" ON "content_entries" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_entries_search_vector_idx"',
  },
  {
    name: "content_entries_search_trigram_idx",
    table: "content_entries",
    group: "read-performance",
    unique: false,
    order: 32,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_entries_search_trigram_idx" ON "content_entries" USING gin ("search_trigram_text" gin_trgm_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_entries_search_trigram_idx"',
  },
  {
    name: "content_entries_list_updated_id_idx",
    table: "content_entries",
    group: "read-performance",
    unique: false,
    order: 33,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_entries_list_updated_id_idx" ON "content_entries" USING btree ("updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_entries_list_updated_id_idx"',
  },
  {
    name: "content_entries_type_list_updated_id_idx",
    table: "content_entries",
    group: "read-performance",
    unique: false,
    order: 34,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_entries_type_list_updated_id_idx" ON "content_entries" USING btree ("type_id","updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_entries_type_list_updated_id_idx"',
  },
  {
    name: "content_entries_author_list_updated_id_idx",
    table: "content_entries",
    group: "read-performance",
    unique: false,
    order: 35,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_entries_author_list_updated_id_idx" ON "content_entries" USING btree ("author_id","updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_entries_author_list_updated_id_idx"',
  },
  {
    name: "content_entries_type_author_list_updated_id_idx",
    table: "content_entries",
    group: "read-performance",
    unique: false,
    order: 36,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_entries_type_author_list_updated_id_idx" ON "content_entries" USING btree ("type_id","author_id","updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_entries_type_author_list_updated_id_idx"',
  },
  {
    name: "content_revisions_retention_idx",
    table: "content_revisions",
    group: "read-performance",
    unique: false,
    order: 37,
    createSql:
      'CREATE INDEX CONCURRENTLY "content_revisions_retention_idx" ON "content_revisions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "content_revisions_retention_idx"',
  },
  {
    name: "form_action_runs_submission_created_idx",
    table: "form_action_runs",
    group: "read-performance",
    unique: false,
    order: 38,
    createSql:
      'CREATE INDEX CONCURRENTLY "form_action_runs_submission_created_idx" ON "form_action_runs" USING btree ("submission_id","created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "form_action_runs_submission_created_idx"',
  },
  {
    name: "form_action_runs_retention_idx",
    table: "form_action_runs",
    group: "read-performance",
    unique: false,
    order: 39,
    createSql:
      'CREATE INDEX CONCURRENTLY "form_action_runs_retention_idx" ON "form_action_runs" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "form_action_runs_retention_idx"',
  },
  {
    name: "form_submissions_form_list_idx",
    table: "form_submissions",
    group: "read-performance",
    unique: false,
    order: 40,
    createSql:
      'CREATE INDEX CONCURRENTLY "form_submissions_form_list_idx" ON "form_submissions" USING btree ("form_id","created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "form_submissions_form_list_idx"',
  },
  {
    name: "form_submissions_retention_idx",
    table: "form_submissions",
    group: "read-performance",
    unique: false,
    order: 41,
    createSql:
      'CREATE INDEX CONCURRENTLY "form_submissions_retention_idx" ON "form_submissions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "form_submissions_retention_idx"',
  },
  {
    name: "forms_list_updated_id_idx",
    table: "forms",
    group: "read-performance",
    unique: false,
    order: 42,
    createSql:
      'CREATE INDEX CONCURRENTLY "forms_list_updated_id_idx" ON "forms" USING btree ("updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "forms_list_updated_id_idx"',
  },
  {
    name: "password_resets_retention_idx",
    table: "password_resets",
    group: "read-performance",
    unique: false,
    order: 43,
    createSql:
      'CREATE INDEX CONCURRENTLY "password_resets_retention_idx" ON "password_resets" USING btree ("expires_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "password_resets_retention_idx"',
  },
  {
    name: "sessions_user_id_idx",
    table: "sessions",
    group: "read-performance",
    unique: false,
    order: 44,
    createSql:
      'CREATE INDEX CONCURRENTLY "sessions_user_id_idx" ON "sessions" USING btree ("user_id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "sessions_user_id_idx"',
  },
  {
    name: "sessions_expired_retention_idx",
    table: "sessions",
    group: "read-performance",
    unique: false,
    order: 45,
    createSql:
      'CREATE INDEX CONCURRENTLY "sessions_expired_retention_idx" ON "sessions" USING btree ("expires_at","id") WHERE revoked_at IS NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "sessions_expired_retention_idx"',
  },
  {
    name: "sessions_revoked_retention_idx",
    table: "sessions",
    group: "read-performance",
    unique: false,
    order: 46,
    createSql:
      'CREATE INDEX CONCURRENTLY "sessions_revoked_retention_idx" ON "sessions" USING btree ("revoked_at","id") WHERE revoked_at IS NOT NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "sessions_revoked_retention_idx"',
  },
  {
    name: "user_roles_role_user_idx",
    table: "user_roles",
    group: "read-performance",
    unique: false,
    order: 47,
    createSql:
      'CREATE INDEX CONCURRENTLY "user_roles_role_user_idx" ON "user_roles" USING btree ("role_id","user_id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "user_roles_role_user_idx"',
  },
  {
    name: "users_search_vector_idx",
    table: "users",
    group: "read-performance",
    unique: false,
    order: 48,
    createSql:
      'CREATE INDEX CONCURRENTLY "users_search_vector_idx" ON "users" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "users_search_vector_idx"',
  },
  {
    name: "users_search_trigram_idx",
    table: "users",
    group: "read-performance",
    unique: false,
    order: 49,
    createSql:
      'CREATE INDEX CONCURRENTLY "users_search_trigram_idx" ON "users" USING gin ("search_trigram_text" gin_trgm_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "users_search_trigram_idx"',
  },
  {
    name: "users_list_created_id_idx",
    table: "users",
    group: "read-performance",
    unique: false,
    order: 50,
    createSql:
      'CREATE INDEX CONCURRENTLY "users_list_created_id_idx" ON "users" USING btree ("created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "users_list_created_id_idx"',
  },
  {
    name: "integration_requests_retention_idx",
    table: "integration_requests",
    group: "read-performance",
    unique: false,
    order: 51,
    createSql:
      'CREATE INDEX CONCURRENTLY "integration_requests_retention_idx" ON "integration_requests" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "integration_requests_retention_idx"',
  },
  {
    name: "webhook_deliveries_webhook_list_idx",
    table: "webhook_deliveries",
    group: "read-performance",
    unique: false,
    order: 52,
    createSql:
      'CREATE INDEX CONCURRENTLY "webhook_deliveries_webhook_list_idx" ON "webhook_deliveries" USING btree ("webhook_id","created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "webhook_deliveries_webhook_list_idx"',
  },
  {
    name: "webhook_deliveries_retry_idx",
    table: "webhook_deliveries",
    group: "read-performance",
    unique: false,
    order: 53,
    createSql:
      'CREATE INDEX CONCURRENTLY "webhook_deliveries_retry_idx" ON "webhook_deliveries" USING btree ("status","created_at","id") WHERE status IN (\'pending\', \'failed\')',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "webhook_deliveries_retry_idx"',
  },
  {
    name: "webhook_deliveries_terminal_retention_idx",
    table: "webhook_deliveries",
    group: "read-performance",
    unique: false,
    order: 54,
    createSql:
      'CREATE INDEX CONCURRENTLY "webhook_deliveries_terminal_retention_idx" ON "webhook_deliveries" USING btree ("created_at","id") WHERE status IN (\'success\', \'failed\')',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "webhook_deliveries_terminal_retention_idx"',
  },
  {
    name: "webhooks_events_gin_idx",
    table: "webhooks",
    group: "read-performance",
    unique: false,
    order: 55,
    createSql:
      'CREATE INDEX CONCURRENTLY "webhooks_events_gin_idx" ON "webhooks" USING gin ("events" jsonb_path_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "webhooks_events_gin_idx"',
  },
  {
    name: "webhooks_list_created_id_idx",
    table: "webhooks",
    group: "read-performance",
    unique: false,
    order: 56,
    createSql:
      'CREATE INDEX CONCURRENTLY "webhooks_list_created_id_idx" ON "webhooks" USING btree ("created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "webhooks_list_created_id_idx"',
  },
  {
    name: "media_search_vector_idx",
    table: "media",
    group: "read-performance",
    unique: false,
    order: 57,
    createSql:
      'CREATE INDEX CONCURRENTLY "media_search_vector_idx" ON "media" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "media_search_vector_idx"',
  },
  {
    name: "media_search_trigram_idx",
    table: "media",
    group: "read-performance",
    unique: false,
    order: 58,
    createSql:
      'CREATE INDEX CONCURRENTLY "media_search_trigram_idx" ON "media" USING gin ("search_trigram_text" gin_trgm_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "media_search_trigram_idx"',
  },
  {
    name: "media_tags_gin_idx",
    table: "media",
    group: "read-performance",
    unique: false,
    order: 59,
    createSql:
      'CREATE INDEX CONCURRENTLY "media_tags_gin_idx" ON "media" USING gin ("tags" jsonb_path_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "media_tags_gin_idx"',
  },
  {
    name: "media_list_created_id_idx",
    table: "media",
    group: "read-performance",
    unique: false,
    order: 60,
    createSql:
      'CREATE INDEX CONCURRENTLY "media_list_created_id_idx" ON "media" USING btree ("created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "media_list_created_id_idx"',
  },
  {
    name: "media_folder_list_created_id_idx",
    table: "media",
    group: "read-performance",
    unique: false,
    order: 61,
    createSql:
      'CREATE INDEX CONCURRENTLY "media_folder_list_created_id_idx" ON "media" USING btree ("folder_id","created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "media_folder_list_created_id_idx"',
  },
  {
    name: "access_logs_retention_idx",
    table: "access_logs",
    group: "read-performance",
    unique: false,
    order: 62,
    createSql:
      'CREATE INDEX CONCURRENTLY "access_logs_retention_idx" ON "access_logs" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "access_logs_retention_idx"',
  },
  {
    name: "audit_logs_retention_idx",
    table: "audit_logs",
    group: "read-performance",
    unique: false,
    order: 63,
    createSql:
      'CREATE INDEX CONCURRENTLY "audit_logs_retention_idx" ON "audit_logs" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "audit_logs_retention_idx"',
  },
  {
    name: "email_delivery_logs_retention_idx",
    table: "email_delivery_logs",
    group: "read-performance",
    unique: false,
    order: 64,
    createSql:
      'CREATE INDEX CONCURRENTLY "email_delivery_logs_retention_idx" ON "email_delivery_logs" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "email_delivery_logs_retention_idx"',
  },
  {
    name: "solution_kit_runs_retention_idx",
    table: "solution_kit_install_runs",
    group: "read-performance",
    unique: false,
    order: 65,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_runs_retention_idx" ON "solution_kit_install_runs" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_runs_retention_idx"',
  },
  {
    name: "solution_kit_runs_anchor_idx",
    table: "solution_kit_install_runs",
    group: "read-performance",
    unique: false,
    order: 66,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_runs_anchor_idx" ON "solution_kit_install_runs" USING btree ("kit_id","created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_runs_anchor_idx"',
  },
  {
    name: "solution_kit_runs_history_idx",
    table: "solution_kit_install_runs",
    group: "read-performance",
    unique: false,
    order: 67,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_runs_history_idx" ON "solution_kit_install_runs" USING btree ("created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_runs_history_idx"',
  },
  {
    name: "solution_kit_runs_successful_apply_order_idx",
    table: "solution_kit_install_runs",
    group: "read-performance",
    unique: false,
    order: 68,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_runs_successful_apply_order_idx" ON "solution_kit_install_runs" USING btree ("kit_id","created_at" desc,"id" desc) WHERE mode = \'apply\' AND status = \'success\' AND finished_at IS NOT NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_runs_successful_apply_order_idx"',
  },
  {
    name: "solution_kit_runs_successful_rollback_relation_idx",
    table: "solution_kit_install_runs",
    group: "read-performance",
    unique: false,
    order: 69,
    createSql:
      'CREATE INDEX CONCURRENTLY "solution_kit_runs_successful_rollback_relation_idx" ON "solution_kit_install_runs" USING btree ("kit_id","rollback_of_run_id","id") WHERE mode = \'rollback\' AND status = \'success\' AND finished_at IS NOT NULL',
    dropSql:
      'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_runs_successful_rollback_relation_idx"',
  },
  {
    name: "solution_kit_runs_active_rollback_source_idx",
    table: "solution_kit_install_runs",
    group: "read-performance",
    unique: true,
    order: 70,
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_runs_active_rollback_source_idx" ON "solution_kit_install_runs" USING btree ("rollback_of_run_id") WHERE mode = \'rollback\' AND status = \'running\' AND rollback_of_run_id IS NOT NULL',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "solution_kit_runs_active_rollback_source_idx"',
  },
  {
    name: "detail_page_revisions_retention_idx",
    table: "detail_page_revisions",
    group: "read-performance",
    unique: false,
    order: 71,
    createSql:
      'CREATE INDEX CONCURRENTLY "detail_page_revisions_retention_idx" ON "detail_page_revisions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "detail_page_revisions_retention_idx"',
  },
  {
    name: "page_revisions_page_kind_version_id_idx",
    table: "page_revisions",
    group: "read-performance",
    unique: false,
    order: 72,
    createSql:
      'CREATE INDEX CONCURRENTLY "page_revisions_page_kind_version_id_idx" ON "page_revisions" USING btree ("page_id","kind","version" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "page_revisions_page_kind_version_id_idx"',
  },
  {
    name: "page_revisions_retention_idx",
    table: "page_revisions",
    group: "read-performance",
    unique: false,
    order: 73,
    createSql:
      'CREATE INDEX CONCURRENTLY "page_revisions_retention_idx" ON "page_revisions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "page_revisions_retention_idx"',
  },
  {
    name: "pages_search_vector_idx",
    table: "pages",
    group: "read-performance",
    unique: false,
    order: 74,
    createSql:
      'CREATE INDEX CONCURRENTLY "pages_search_vector_idx" ON "pages" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "pages_search_vector_idx"',
  },
  {
    name: "pages_search_trigram_idx",
    table: "pages",
    group: "read-performance",
    unique: false,
    order: 75,
    createSql:
      'CREATE INDEX CONCURRENTLY "pages_search_trigram_idx" ON "pages" USING gin ("search_trigram_text" gin_trgm_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "pages_search_trigram_idx"',
  },
  {
    name: "pages_list_updated_id_idx",
    table: "pages",
    group: "read-performance",
    unique: false,
    order: 76,
    createSql:
      'CREATE INDEX CONCURRENTLY "pages_list_updated_id_idx" ON "pages" USING btree ("updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "pages_list_updated_id_idx"',
  },
  {
    name: "pages_author_list_updated_id_idx",
    table: "pages",
    group: "read-performance",
    unique: false,
    order: 77,
    createSql:
      'CREATE INDEX CONCURRENTLY "pages_author_list_updated_id_idx" ON "pages" USING btree ("author_id","updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "pages_author_list_updated_id_idx"',
  },
  {
    name: "preview_tokens_retention_idx",
    table: "preview_tokens",
    group: "read-performance",
    unique: false,
    order: 78,
    createSql:
      'CREATE INDEX CONCURRENTLY "preview_tokens_retention_idx" ON "preview_tokens" USING btree ("expires_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "preview_tokens_retention_idx"',
  },
  {
    name: "search_history_user_created_id_idx",
    table: "search_history",
    group: "read-performance",
    unique: false,
    order: 79,
    createSql:
      'CREATE INDEX CONCURRENTLY "search_history_user_created_id_idx" ON "search_history" USING btree ("user_id","created_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "search_history_user_created_id_idx"',
  },
  {
    name: "search_history_retention_idx",
    table: "search_history",
    group: "read-performance",
    unique: false,
    order: 80,
    createSql:
      'CREATE INDEX CONCURRENTLY "search_history_retention_idx" ON "search_history" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "search_history_retention_idx"',
  },
  {
    name: "post_preview_tokens_retention_idx",
    table: "post_preview_tokens",
    group: "read-performance",
    unique: false,
    order: 81,
    createSql:
      'CREATE INDEX CONCURRENTLY "post_preview_tokens_retention_idx" ON "post_preview_tokens" USING btree ("expires_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "post_preview_tokens_retention_idx"',
  },
  {
    name: "post_revisions_retention_idx",
    table: "post_revisions",
    group: "read-performance",
    unique: false,
    order: 82,
    createSql:
      'CREATE INDEX CONCURRENTLY "post_revisions_retention_idx" ON "post_revisions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "post_revisions_retention_idx"',
  },
  {
    name: "posts_search_vector_idx",
    table: "posts",
    group: "read-performance",
    unique: false,
    order: 83,
    createSql:
      'CREATE INDEX CONCURRENTLY "posts_search_vector_idx" ON "posts" USING gin ("search_vector")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "posts_search_vector_idx"',
  },
  {
    name: "posts_search_trigram_idx",
    table: "posts",
    group: "read-performance",
    unique: false,
    order: 84,
    createSql:
      'CREATE INDEX CONCURRENTLY "posts_search_trigram_idx" ON "posts" USING gin ("search_trigram_text" gin_trgm_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "posts_search_trigram_idx"',
  },
  {
    name: "posts_tags_gin_idx",
    table: "posts",
    group: "read-performance",
    unique: false,
    order: 85,
    createSql:
      'CREATE INDEX CONCURRENTLY "posts_tags_gin_idx" ON "posts" USING gin ("tags" jsonb_path_ops)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "posts_tags_gin_idx"',
  },
  {
    name: "posts_list_updated_id_idx",
    table: "posts",
    group: "read-performance",
    unique: false,
    order: 86,
    createSql:
      'CREATE INDEX CONCURRENTLY "posts_list_updated_id_idx" ON "posts" USING btree ("updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "posts_list_updated_id_idx"',
  },
  {
    name: "posts_author_list_updated_id_idx",
    table: "posts",
    group: "read-performance",
    unique: false,
    order: 87,
    createSql:
      'CREATE INDEX CONCURRENTLY "posts_author_list_updated_id_idx" ON "posts" USING btree ("author_id","updated_at" desc,"id" desc)',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "posts_author_list_updated_id_idx"',
  },
  {
    name: "widget_template_revisions_retention_idx",
    table: "widget_template_revisions",
    group: "read-performance",
    unique: false,
    order: 88,
    createSql:
      'CREATE INDEX CONCURRENTLY "widget_template_revisions_retention_idx" ON "widget_template_revisions" USING btree ("created_at","id")',
    dropSql: 'DROP INDEX CONCURRENTLY IF EXISTS "widget_template_revisions_retention_idx"',
  },
];

/** The closed manifest order: group 1 members first, then group 2. */
export const TASK551_ONLINE_INDEX_ORDER: readonly string[] = TASK551_ONLINE_INDEX_MEMBERS.map(
  (member) => member.name
);

export const TASK551_REVISION_INTEGRITY_MEMBERS = [
  "page_revisions_page_version_idx",
  "widget_template_revisions_template_version_idx",
] as const;

/** The unique constraint members asserted — never rebuilt — from the transactional migration. */
export const TASK551_ASSERTED_UNIQUE_CONSTRAINTS = [
  "solution_kit_runs_id_package_actor_key",
  "solution_kit_runs_id_rollback_relation_key",
  "solution_kit_runs_id_legacy_template_plan_key",
  "solution_kit_legacy_template_evidence_identity_key",
] as const;

/**
 * The one documented snapshot exception: the GiST exclusion constraint is not a
 * manifest member and is never built online; it is added inside the guarded
 * transaction by the exact `BOOKING_RESERVATION_EXCLUSION_SQL` seam.
 */
export const TASK551_EXCLUSION_CONSTRAINT_NAME = "bookings_active_resource_window_excl";

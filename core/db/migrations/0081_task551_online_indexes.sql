-- TASK-551-05-L01 non-transactional online-index companion.
-- Deliberately ABSENT from core/db/migrations/meta/_journal.json: every statement
-- here is a top-level CREATE [UNIQUE] INDEX CONCURRENTLY, which PostgreSQL refuses
-- to run inside a transaction block, so the rollout orchestrator
-- (scripts/task-551-online-indexes.ts) executes these bytes one at a time on its
-- reserved migration backend in exactly this closed manifest order, driven by
-- tests/perf/fixtures/task551OnlineIndexManifest.ts. The transactional migration
-- 0081_task551_search_indexes_constraints_outbox.sql must contain none of them.
-- Group 1 (revision-integrity) is the two new revision unique indexes; group 2
-- (read-performance) is the remaining snapshot-owned set in generated order.
CREATE UNIQUE INDEX CONCURRENTLY "page_revisions_page_version_idx" ON "page_revisions" USING btree ("page_id","version");
CREATE UNIQUE INDEX CONCURRENTLY "widget_template_revisions_template_version_idx" ON "widget_template_revisions" USING btree ("template_id","version");
CREATE UNIQUE INDEX CONCURRENTLY "cache_invalidation_outbox_event_key_idx" ON "cache_invalidation_outbox" USING btree ("event_key");
CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_pending_idx" ON "cache_invalidation_outbox" USING btree ("available_at","id") WHERE processed_at IS NULL AND claim_token IS NULL;
CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_expired_claim_idx" ON "cache_invalidation_outbox" USING btree ("claim_until","id") WHERE processed_at IS NULL AND claim_token IS NOT NULL;
CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_processed_idx" ON "cache_invalidation_outbox" USING btree ("processed_at","id") WHERE processed_at IS NOT NULL;
CREATE INDEX CONCURRENTLY "cache_outbox_unprocessed_age_idx" ON "cache_invalidation_outbox" USING btree ("created_at","id") WHERE processed_at IS NULL;
CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_legacy_rollback_progress_rollback_position_idx" ON "solution_kit_legacy_rollback_progress" USING btree ("rollback_run_id","rollback_position");
CREATE INDEX CONCURRENTLY "solution_kit_legacy_rollback_progress_source_idx" ON "solution_kit_legacy_rollback_progress" USING btree ("source_run_id","source_position");
CREATE INDEX CONCURRENTLY "solution_kit_legacy_rollback_progress_source_evidence_idx" ON "solution_kit_legacy_rollback_progress" USING btree ("source_evidence_id");
CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_legacy_template_evidence_source_position_key" ON "solution_kit_legacy_template_evidence" USING btree ("source_run_id","source_position");
CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_legacy_template_evidence_source_key" ON "solution_kit_legacy_template_evidence" USING btree ("source_run_id","template_key");
CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_starter_apply_owners_active_idx" ON "solution_kit_starter_apply_owners" USING btree ("package_key","actor_id") WHERE released_at IS NULL;
CREATE INDEX CONCURRENTLY "analytics_pageviews_session_created_idx" ON "analytics_pageviews" USING btree ("session_id","created_at","id");
CREATE INDEX CONCURRENTLY "analytics_pageviews_retention_idx" ON "analytics_pageviews" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "analytics_sessions_retention_idx" ON "analytics_sessions" USING btree ("last_seen_at","id");
CREATE INDEX CONCURRENTLY "assistant_action_executions_retention_idx" ON "assistant_action_executions" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "assistant_action_undo_execution_created_idx" ON "assistant_action_undo_items" USING btree ("execution_id","created_at","id");
CREATE INDEX CONCURRENTLY "assistant_doc_chunks_search_vector_idx" ON "assistant_doc_chunks" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "assistant_ingest_retention_idx" ON "assistant_doc_ingest_runs" USING btree ("started_at","id");
CREATE INDEX CONCURRENTLY "assistant_ingest_source_success_idx" ON "assistant_doc_ingest_runs" USING btree ("source_root","started_at" desc,"id" desc) WHERE status = 'success';
CREATE INDEX CONCURRENTLY "assistant_docs_search_vector_idx" ON "assistant_docs" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "booking_blackouts_starts_id_idx" ON "booking_blackouts" USING btree ("starts_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "booking_blackouts_resource_starts_id_idx" ON "booking_blackouts" USING btree ("resource_id","starts_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "booking_resources_name_id_idx" ON "booking_resources" USING btree ("name","id");
CREATE INDEX CONCURRENTLY "booking_schedules_resource_order_idx" ON "booking_schedules" USING btree ("resource_id","day_of_week","start_minute","id");
CREATE INDEX CONCURRENTLY "booking_services_name_id_idx" ON "booking_services" USING btree ("name","id");
CREATE INDEX CONCURRENTLY "bookings_list_starts_id_idx" ON "bookings" USING btree ("starts_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "bookings_resource_list_starts_id_idx" ON "bookings" USING btree ("resource_id","starts_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "bookings_service_list_starts_id_idx" ON "bookings" USING btree ("service_id","starts_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "bookings_status_list_starts_id_idx" ON "bookings" USING btree ("status","starts_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "content_entries_search_vector_idx" ON "content_entries" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "content_entries_search_trigram_idx" ON "content_entries" USING gin ("search_trigram_text" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "content_entries_list_updated_id_idx" ON "content_entries" USING btree ("updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "content_entries_type_list_updated_id_idx" ON "content_entries" USING btree ("type_id","updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "content_entries_author_list_updated_id_idx" ON "content_entries" USING btree ("author_id","updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "content_entries_type_author_list_updated_id_idx" ON "content_entries" USING btree ("type_id","author_id","updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "content_revisions_retention_idx" ON "content_revisions" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "form_action_runs_submission_created_idx" ON "form_action_runs" USING btree ("submission_id","created_at","id");
CREATE INDEX CONCURRENTLY "form_action_runs_retention_idx" ON "form_action_runs" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "form_submissions_form_list_idx" ON "form_submissions" USING btree ("form_id","created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "form_submissions_retention_idx" ON "form_submissions" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "forms_list_updated_id_idx" ON "forms" USING btree ("updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "password_resets_retention_idx" ON "password_resets" USING btree ("expires_at","id");
CREATE INDEX CONCURRENTLY "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
CREATE INDEX CONCURRENTLY "sessions_expired_retention_idx" ON "sessions" USING btree ("expires_at","id") WHERE revoked_at IS NULL;
CREATE INDEX CONCURRENTLY "sessions_revoked_retention_idx" ON "sessions" USING btree ("revoked_at","id") WHERE revoked_at IS NOT NULL;
CREATE INDEX CONCURRENTLY "user_roles_role_user_idx" ON "user_roles" USING btree ("role_id","user_id");
CREATE INDEX CONCURRENTLY "users_search_vector_idx" ON "users" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "users_search_trigram_idx" ON "users" USING gin ("search_trigram_text" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "users_list_created_id_idx" ON "users" USING btree ("created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "integration_requests_retention_idx" ON "integration_requests" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "webhook_deliveries_webhook_list_idx" ON "webhook_deliveries" USING btree ("webhook_id","created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "webhook_deliveries_retry_idx" ON "webhook_deliveries" USING btree ("status","created_at","id") WHERE status IN ('pending', 'failed');
CREATE INDEX CONCURRENTLY "webhook_deliveries_terminal_retention_idx" ON "webhook_deliveries" USING btree ("created_at","id") WHERE status IN ('success', 'failed');
CREATE INDEX CONCURRENTLY "webhooks_events_gin_idx" ON "webhooks" USING gin ("events" jsonb_path_ops);
CREATE INDEX CONCURRENTLY "webhooks_list_created_id_idx" ON "webhooks" USING btree ("created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "media_search_vector_idx" ON "media" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "media_search_trigram_idx" ON "media" USING gin ("search_trigram_text" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "media_tags_gin_idx" ON "media" USING gin ("tags" jsonb_path_ops);
CREATE INDEX CONCURRENTLY "media_list_created_id_idx" ON "media" USING btree ("created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "media_folder_list_created_id_idx" ON "media" USING btree ("folder_id","created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "access_logs_retention_idx" ON "access_logs" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "audit_logs_retention_idx" ON "audit_logs" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "email_delivery_logs_retention_idx" ON "email_delivery_logs" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "solution_kit_runs_retention_idx" ON "solution_kit_install_runs" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "solution_kit_runs_anchor_idx" ON "solution_kit_install_runs" USING btree ("kit_id","created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "solution_kit_runs_history_idx" ON "solution_kit_install_runs" USING btree ("created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "solution_kit_runs_successful_apply_order_idx" ON "solution_kit_install_runs" USING btree ("kit_id","created_at" desc,"id" desc) WHERE mode = 'apply' AND status = 'success' AND finished_at IS NOT NULL;
CREATE INDEX CONCURRENTLY "solution_kit_runs_successful_rollback_relation_idx" ON "solution_kit_install_runs" USING btree ("kit_id","rollback_of_run_id","id") WHERE mode = 'rollback' AND status = 'success' AND finished_at IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY "solution_kit_runs_active_rollback_source_idx" ON "solution_kit_install_runs" USING btree ("rollback_of_run_id") WHERE mode = 'rollback' AND status = 'running' AND rollback_of_run_id IS NOT NULL;
CREATE INDEX CONCURRENTLY "detail_page_revisions_retention_idx" ON "detail_page_revisions" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "page_revisions_page_kind_version_id_idx" ON "page_revisions" USING btree ("page_id","kind","version" desc,"id" desc);
CREATE INDEX CONCURRENTLY "page_revisions_retention_idx" ON "page_revisions" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "pages_search_vector_idx" ON "pages" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "pages_search_trigram_idx" ON "pages" USING gin ("search_trigram_text" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "pages_list_updated_id_idx" ON "pages" USING btree ("updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "pages_author_list_updated_id_idx" ON "pages" USING btree ("author_id","updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "preview_tokens_retention_idx" ON "preview_tokens" USING btree ("expires_at","id");
CREATE INDEX CONCURRENTLY "search_history_user_created_id_idx" ON "search_history" USING btree ("user_id","created_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "search_history_retention_idx" ON "search_history" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "post_preview_tokens_retention_idx" ON "post_preview_tokens" USING btree ("expires_at","id");
CREATE INDEX CONCURRENTLY "post_revisions_retention_idx" ON "post_revisions" USING btree ("created_at","id");
CREATE INDEX CONCURRENTLY "posts_search_vector_idx" ON "posts" USING gin ("search_vector");
CREATE INDEX CONCURRENTLY "posts_search_trigram_idx" ON "posts" USING gin ("search_trigram_text" gin_trgm_ops);
CREATE INDEX CONCURRENTLY "posts_tags_gin_idx" ON "posts" USING gin ("tags" jsonb_path_ops);
CREATE INDEX CONCURRENTLY "posts_list_updated_id_idx" ON "posts" USING btree ("updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "posts_author_list_updated_id_idx" ON "posts" USING btree ("author_id","updated_at" desc,"id" desc);
CREATE INDEX CONCURRENTLY "widget_template_revisions_retention_idx" ON "widget_template_revisions" USING btree ("created_at","id");

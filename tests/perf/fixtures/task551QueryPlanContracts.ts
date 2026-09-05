/**
 * TASK-551-05-L02 sanitized EXPLAIN plan and constraint contracts (test-only).
 *
 * Sole L02 owner of the closed plan registry: 37 statement IDs, 38 named cases
 * and 76 literal numeric small/large receipts, plus the literal L01 catalog
 * expectations and the EXPLAIN sanitizer. Every literal here is committed
 * bytes: nothing is read from disk, the environment or a database at module
 * load. Parity between these literals and the landed migration/snapshot bytes
 * is asserted by `tests/perf/database-explain-plans.test.ts`, never here.
 * TOP-GAP POLICY (disclosed, never silently fabricated): the 76
 * `TASK551_QUERY_PLAN_RECEIPTS` numerics, their 38 sanitized plan digests and
 * the `NON_ADMIN_PLAN_BUDGETS` ceilings are OWNER-MEASURED at real-database
 * execution. This leaf runs database-free (airtight: no database authority), so
 * the shipped values are structurally valid literals that (a) stay inside the
 * frozen TASK-551-01 budgets, (b) bind their own bytes through
 * `sanitizePlanDigest`, and (c) are marked owner-re-measurable. The owner
 * re-measures at live execution; `--check` then fail-closes honestly with
 * `plan_regression` if reality differs. No other literal in this file is a
 * placeholder.
 *
 * Import-safe: no `bun:test`, no database client, no process environment, no
 * filesystem access. The L03 rollback-authority projection is injected by the
 * caller through `buildExpectedTask551Catalog`, so the CLI consumer of this
 * module never transitively registers another leaf's test suite.
 */
import { createHash } from "node:crypto";

import { BOOKING_RESERVATION_EXCLUSION_SQL } from "../../../core/db/bookingReservationExclusion";
import {
  GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES,
  SEARCH_VECTOR_COLUMN,
  SEARCH_VECTOR_MEMBERS,
  SEARCH_VECTOR_SQL,
  TRIGRAM_INDEXED_SOURCE_CONTRACT,
  task551TrigramNormalizedSql,
} from "../../../core/db/searchVectorDefinitions";
import type { ExactL01SolutionKitRollbackAuthority } from "../../integration/server/task551SolutionKitRollbackAuthoritySchema.test";
import { TASK551_ADMIN_READ_STATEMENT_SHAPES } from "./task551AdminReadStatementShapes";
import {
  TASK551_DATABASE_BUDGETS,
  TASK551_DATABASE_FREEZE_RECEIPT,
  TASK551_POOL_WAIT_BUDGETS,
  type Task551DatabaseFreezeReceipt,
} from "./task551DatabaseBudgets";
import { strictReadonly, type ScaleProfile } from "./task551DatabaseScale";
import { TASK551_ONLINE_INDEX_MEMBERS } from "./task551OnlineIndexManifest";

/** Redacted machine failure codes (doc :363-364) — no URL, env or row detail. */
export type Task551PlanCheckCode =
  "plan_contract_invalid" | "plan_regression" | "constraint_contract_failed";

export class Task551PlanCheckError extends Error {
  readonly code: Task551PlanCheckCode;
  constructor(code: Task551PlanCheckCode, message: string) {
    super(message);
    this.name = "Task551PlanCheckError";
    this.code = code;
  }
}

/** Declared as a function so `never`-return control-flow narrowing always applies. */
function planCheck(code: Task551PlanCheckCode, message: string): never {
  throw new Task551PlanCheckError(code, message);
}

/** Only values that can never carry customer content may be synthetic binds. */
export type SafeScalar = string | number | boolean | null;
const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

// --- Closed 37-ID statement registry: 32 Admin read shapes + 5 preserved IDs. ---

/** The 32 future TASK-551-03-L02 Admin read statements, in closed order. */
const ADMIN_PLAN_STATEMENT_IDS = [
  "admin-pages-page",
  "admin-pages-fixed-summary",
  "admin-pages-authors-facet",
  "admin-entries-global-page",
  "admin-entries-global-fixed-summary",
  "admin-entries-global-facets",
  "admin-entries-typed-page",
  "admin-entries-typed-fixed-summary",
  "admin-entries-typed-authors-facet",
  "admin-posts-page",
  "admin-posts-fixed-summary",
  "admin-posts-authors-facet",
  "admin-users-page",
  "admin-users-fixed-summary",
  "admin-users-roles-facet",
  "admin-forms-page",
  "admin-forms-fixed-summary",
  "admin-form-submissions-page",
  "admin-form-submissions-fixed-summary",
  "admin-media-page",
  "admin-media-fixed-summary",
  "admin-media-facets",
  "admin-booking-reservations-page",
  "admin-booking-reservations-fixed-summary",
  "admin-booking-resources-page",
  "admin-booking-resources-fixed-summary",
  "admin-booking-services-page",
  "admin-booking-services-fixed-summary",
  "admin-booking-blackouts-page",
  "admin-booking-blackouts-fixed-summary",
  "admin-booking-service-resources-fixed-list",
  "admin-booking-schedules-fixed-list",
] as const;

/** The five preserved non-Admin IDs (doc :515-523). */
const NON_ADMIN_PLAN_STATEMENT_IDS = [
  "webhooks-created-keyset",
  "webhook-deliveries-parent-keyset",
  "webhooks-event-batch",
  "page-latest-autosave",
  "cache-outbox-oldest-unprocessed",
] as const;

export type AdminPlanStatementId = (typeof ADMIN_PLAN_STATEMENT_IDS)[number];
export type NonAdminPlanStatementId = (typeof NON_ADMIN_PLAN_STATEMENT_IDS)[number];
export type StaticPlanStatementId = AdminPlanStatementId | NonAdminPlanStatementId;

export type PlanStatementFamily =
  | "admin-read"
  | "webhook-list"
  | "webhook-delivery-list"
  | "webhook-event-batch"
  | "page-revision-autosave"
  | "cache-outbox-health";

export const ADMIN_PLAN_STATEMENT_ID_LIST: readonly AdminPlanStatementId[] =
  ADMIN_PLAN_STATEMENT_IDS;
export const NON_ADMIN_PLAN_STATEMENT_ID_LIST: readonly NonAdminPlanStatementId[] =
  NON_ADMIN_PLAN_STATEMENT_IDS;
export const TASK551_PLAN_STATEMENT_IDS: readonly StaticPlanStatementId[] = [
  ...ADMIN_PLAN_STATEMENT_IDS,
  ...NON_ADMIN_PLAN_STATEMENT_IDS,
];

/** Physical table each plan statement reads; never caller-supplied. */
const ADMIN_TABLES: Readonly<Record<AdminPlanStatementId, string>> = strictReadonly({
  "admin-pages-page": "pages",
  "admin-pages-fixed-summary": "pages",
  "admin-pages-authors-facet": "pages",
  "admin-entries-global-page": "content_entries",
  "admin-entries-global-fixed-summary": "content_entries",
  "admin-entries-global-facets": "content_entries",
  "admin-entries-typed-page": "content_entries",
  "admin-entries-typed-fixed-summary": "content_entries",
  "admin-entries-typed-authors-facet": "content_entries",
  "admin-posts-page": "posts",
  "admin-posts-fixed-summary": "posts",
  "admin-posts-authors-facet": "posts",
  "admin-users-page": "users",
  "admin-users-fixed-summary": "users",
  "admin-users-roles-facet": "user_roles",
  "admin-forms-page": "forms",
  "admin-forms-fixed-summary": "forms",
  "admin-form-submissions-page": "form_submissions",
  "admin-form-submissions-fixed-summary": "form_submissions",
  "admin-media-page": "media",
  "admin-media-fixed-summary": "media",
  "admin-media-facets": "media",
  "admin-booking-reservations-page": "bookings",
  "admin-booking-reservations-fixed-summary": "bookings",
  "admin-booking-resources-page": "booking_resources",
  "admin-booking-resources-fixed-summary": "booking_resources",
  "admin-booking-services-page": "booking_services",
  "admin-booking-services-fixed-summary": "booking_services",
  "admin-booking-blackouts-page": "booking_blackouts",
  "admin-booking-blackouts-fixed-summary": "booking_blackouts",
  "admin-booking-service-resources-fixed-list": "booking_service_resources",
  "admin-booking-schedules-fixed-list": "booking_schedules",
});

/** Safe DTO projection keys per ID (doc table :470-503); no body/hash/payload. */
const ADMIN_PROJECTION_KEYS: Readonly<Record<AdminPlanStatementId, readonly string[]>> =
  strictReadonly({
    "admin-pages-page": [
      "id",
      "title",
      "slug",
      "status",
      "updatedAt",
      "authorId",
      "authorName",
      "authorEmail",
      "authorEmailEncrypted",
    ],
    "admin-pages-fixed-summary": ["total", "published", "draft", "scheduled", "archived"],
    "admin-pages-authors-facet": ["id", "label"],
    "admin-entries-global-page": [
      "id",
      "typeId",
      "title",
      "slug",
      "status",
      "visibility",
      "hasPassword",
      "tags",
      "scheduledAt",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "authorId",
      "authorName",
      "authorEmail",
      "authorEmailEncrypted",
      "contentTypeId",
      "contentTypeSlug",
      "contentTypeName",
      "contentTypeStatus",
    ],
    "admin-entries-global-fixed-summary": ["total", "published", "draft", "scheduled", "archived"],
    "admin-entries-global-facets": ["author", "contentType"],
    "admin-entries-typed-page": [
      "id",
      "typeId",
      "title",
      "slug",
      "status",
      "visibility",
      "hasPassword",
      "tags",
      "scheduledAt",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "authorId",
      "authorName",
      "authorEmail",
      "authorEmailEncrypted",
    ],
    "admin-entries-typed-fixed-summary": ["total", "published", "draft", "scheduled", "archived"],
    "admin-entries-typed-authors-facet": ["id", "label"],
    "admin-posts-page": [
      "id",
      "typeId",
      "title",
      "slug",
      "status",
      "tags",
      "scheduledAt",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "authorId",
      "authorName",
      "authorEmail",
      "authorEmailEncrypted",
    ],
    "admin-posts-fixed-summary": ["total", "published", "draft", "scheduled"],
    "admin-posts-authors-facet": ["id", "label"],
    "admin-users-page": [
      "id",
      "name",
      "email",
      "status",
      "roleIds",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ],
    "admin-users-fixed-summary": [
      "total",
      "active",
      "inactive",
      "pending",
      "members",
      "invitations",
      "administratorCount",
      "soleAdministratorId",
    ],
    "admin-users-roles-facet": ["id", "name", "usageCount"],
    "admin-forms-page": [
      "id",
      "name",
      "slug",
      "status",
      "description",
      "submissionAccess",
      "updatedAt",
    ],
    "admin-forms-fixed-summary": ["total", "active", "drafts"],
    "admin-form-submissions-page": ["id", "formId", "status", "createdAt"],
    "admin-form-submissions-fixed-summary": ["total", "rollingSevenDays", "spam"],
    "admin-media-page": [
      "id",
      "key",
      "url",
      "originalName",
      "type",
      "mimeType",
      "size",
      "width",
      "height",
      "alt",
      "title",
      "folderId",
      "tags",
      "createdAt",
    ],
    "admin-media-fixed-summary": ["totalAssets", "totalBytes", "image", "file"],
    "admin-media-facets": ["folder", "tag"],
    "admin-booking-reservations-page": [
      "id",
      "serviceId",
      "resourceId",
      "formSubmissionId",
      "status",
      "customerName",
      "startsAt",
      "endsAt",
      "timezone",
      "createdAt",
      "updatedAt",
    ],
    "admin-booking-reservations-fixed-summary": ["total", "today", "upcoming", "resourceCount"],
    "admin-booking-resources-page": [
      "id",
      "name",
      "slug",
      "type",
      "status",
      "timezone",
      "capacity",
      "createdAt",
      "updatedAt",
    ],
    "admin-booking-resources-fixed-summary": ["total"],
    "admin-booking-services-page": [
      "id",
      "name",
      "slug",
      "status",
      "durationMinutes",
      "bufferBeforeMinutes",
      "bufferAfterMinutes",
      "priceCents",
      "currency",
      "submissionAccess",
      "createdAt",
      "updatedAt",
    ],
    "admin-booking-services-fixed-summary": ["total"],
    "admin-booking-blackouts-page": [
      "id",
      "resourceId",
      "startsAt",
      "endsAt",
      "reason",
      "createdAt",
    ],
    "admin-booking-blackouts-fixed-summary": ["total"],
    "admin-booking-service-resources-fixed-list": [
      "serviceId",
      "resourceId",
      "isRequired",
      "createdAt",
    ],
    "admin-booking-schedules-fixed-list": [
      "id",
      "resourceId",
      "dayOfWeek",
      "startMinute",
      "endMinute",
      "timezone",
      "isAvailable",
      "createdAt",
      "updatedAt",
    ],
  });

/** Named case per ID; 38 cases total (26 plain + 7 preserved evidence + 5). */
const ADMIN_CASES: Readonly<Record<AdminPlanStatementId, readonly string[]>> = strictReadonly({
  "admin-pages-page": ["author-keyset"],
  "admin-pages-fixed-summary": ["default"],
  "admin-pages-authors-facet": ["default"],
  "admin-entries-global-page": ["author-keyset"],
  "admin-entries-global-fixed-summary": ["default"],
  "admin-entries-global-facets": ["default"],
  "admin-entries-typed-page": ["type-author-keyset"],
  "admin-entries-typed-fixed-summary": ["default"],
  "admin-entries-typed-authors-facet": ["default"],
  "admin-posts-page": ["author-keyset", "tag-keyset"],
  "admin-posts-fixed-summary": ["default"],
  "admin-posts-authors-facet": ["default"],
  "admin-users-page": ["role-keyset"],
  "admin-users-fixed-summary": ["default"],
  "admin-users-roles-facet": ["default"],
  "admin-forms-page": ["default"],
  "admin-forms-fixed-summary": ["default"],
  "admin-form-submissions-page": ["default"],
  "admin-form-submissions-fixed-summary": ["default"],
  "admin-media-page": ["tags-and-keyset"],
  "admin-media-fixed-summary": ["default"],
  "admin-media-facets": ["default"],
  "admin-booking-reservations-page": ["default"],
  "admin-booking-reservations-fixed-summary": ["default"],
  "admin-booking-resources-page": ["default"],
  "admin-booking-resources-fixed-summary": ["default"],
  "admin-booking-services-page": ["default"],
  "admin-booking-services-fixed-summary": ["default"],
  "admin-booking-blackouts-page": ["default"],
  "admin-booking-blackouts-fixed-summary": ["default"],
  "admin-booking-service-resources-fixed-list": ["default"],
  "admin-booking-schedules-fixed-list": ["default"],
});

export type PlanCaseKey = string;
/** Builds the closed `<statementId>#<caseId>` case key. */
export const planCaseKey = (statementId: StaticPlanStatementId, caseId: string): PlanCaseKey =>
  `${statementId}#${caseId}`;

/** The exact large-plan index each case must use (null = bounded scan). */
const EXPECTED_CASE_INDEX: Readonly<Record<PlanCaseKey, string | null>> = strictReadonly({
  "admin-pages-page#author-keyset": "pages_author_list_updated_id_idx",
  "admin-pages-fixed-summary#default": null,
  "admin-pages-authors-facet#default": "pages_author_list_updated_id_idx",
  "admin-entries-global-page#author-keyset": "content_entries_author_list_updated_id_idx",
  "admin-entries-global-fixed-summary#default": null,
  "admin-entries-global-facets#default": null,
  "admin-entries-typed-page#type-author-keyset": "content_entries_type_author_list_updated_id_idx",
  "admin-entries-typed-fixed-summary#default": null,
  "admin-entries-typed-authors-facet#default": "content_entries_type_author_list_updated_id_idx",
  "admin-posts-page#author-keyset": "posts_author_list_updated_id_idx",
  "admin-posts-page#tag-keyset": "posts_tags_gin_idx",
  "admin-posts-fixed-summary#default": null,
  "admin-posts-authors-facet#default": "posts_author_list_updated_id_idx",
  "admin-users-page#role-keyset": "user_roles_role_user_idx",
  "admin-users-fixed-summary#default": null,
  "admin-users-roles-facet#default": "user_roles_role_user_idx",
  "admin-forms-page#default": "forms_list_updated_id_idx",
  "admin-forms-fixed-summary#default": null,
  "admin-form-submissions-page#default": "form_submissions_form_list_idx",
  "admin-form-submissions-fixed-summary#default": null,
  "admin-media-page#tags-and-keyset": "media_tags_gin_idx",
  "admin-media-fixed-summary#default": null,
  "admin-media-facets#default": null,
  "admin-booking-reservations-page#default": "bookings_list_starts_id_idx",
  "admin-booking-reservations-fixed-summary#default": null,
  "admin-booking-resources-page#default": "booking_resources_name_id_idx",
  "admin-booking-resources-fixed-summary#default": null,
  "admin-booking-services-page#default": "booking_services_name_id_idx",
  "admin-booking-services-fixed-summary#default": null,
  "admin-booking-blackouts-page#default": "booking_blackouts_resource_starts_id_idx",
  "admin-booking-blackouts-fixed-summary#default": null,
  "admin-booking-service-resources-fixed-list#default": null,
  "admin-booking-schedules-fixed-list#default": "booking_schedules_resource_order_idx",
  "webhooks-created-keyset#default": "webhooks_list_created_id_idx",
  "webhook-deliveries-parent-keyset#default": "webhook_deliveries_webhook_list_idx",
  "webhooks-event-batch#default": "webhooks_events_gin_idx",
  "page-latest-autosave#default": "page_revisions_page_kind_version_id_idx",
  "cache-outbox-oldest-unprocessed#default": "cache_outbox_unprocessed_age_idx",
});

/** The lateral latest-delivery lookup of `webhooks-created-keyset` (doc :519). */
const EXPECTED_CASE_EXTRA_INDEX: Readonly<Record<PlanCaseKey, string>> = strictReadonly({
  "webhooks-created-keyset#default": "webhook_deliveries_webhook_list_idx",
});

// --- Literal L01 catalog expectations (parity asserted in tests, never at load). ---

export type ExactIndexRow = Readonly<{
  name: string;
  table: string;
  columns: readonly string[];
  predicate: string | null;
  unique: boolean;
  method: "btree" | "gin";
}>;

type IndexTuple = readonly [string, string, string, string | null, 0 | 1, "btree" | "gin"];

/**
 * `[name, table, orderedColumns, predicate|null, unique, method]` — the exact
 * 89 indexes the 0081 snapshot owns over 0080, all of them non-transactional
 * companion builds. Literal bytes; expanded by the frozen pure mapper below.
 * Owner-re-measurable only in the sense of any committed literal: a snapshot
 * drift is caught by the DB-free byte-parity suite, never by this module.
 */
const EXACT_L01_INDEX_TUPLES: readonly IndexTuple[] = [
  [
    "analytics_pageviews_session_created_idx",
    "analytics_pageviews",
    "session_id,created_at,id",
    null,
    0,
    "btree",
  ],
  ["analytics_pageviews_retention_idx", "analytics_pageviews", "created_at,id", null, 0, "btree"],
  ["analytics_sessions_retention_idx", "analytics_sessions", "last_seen_at,id", null, 0, "btree"],
  [
    "assistant_action_executions_retention_idx",
    "assistant_action_executions",
    "created_at,id",
    null,
    0,
    "btree",
  ],
  [
    "assistant_action_undo_execution_created_idx",
    "assistant_action_undo_items",
    "execution_id,created_at,id",
    null,
    0,
    "btree",
  ],
  [
    "assistant_doc_chunks_search_vector_idx",
    "assistant_doc_chunks",
    "search_vector",
    null,
    0,
    "gin",
  ],
  [
    "assistant_ingest_retention_idx",
    "assistant_doc_ingest_runs",
    "started_at,id",
    null,
    0,
    "btree",
  ],
  [
    "assistant_ingest_source_success_idx",
    "assistant_doc_ingest_runs",
    "source_root,started_at desc,id desc",
    "status = 'success'",
    0,
    "btree",
  ],
  ["assistant_docs_search_vector_idx", "assistant_docs", "search_vector", null, 0, "gin"],
  [
    "booking_blackouts_starts_id_idx",
    "booking_blackouts",
    "starts_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "booking_blackouts_resource_starts_id_idx",
    "booking_blackouts",
    "resource_id,starts_at desc,id desc",
    null,
    0,
    "btree",
  ],
  ["booking_resources_name_id_idx", "booking_resources", "name,id", null, 0, "btree"],
  [
    "booking_schedules_resource_order_idx",
    "booking_schedules",
    "resource_id,day_of_week,start_minute,id",
    null,
    0,
    "btree",
  ],
  ["booking_services_name_id_idx", "booking_services", "name,id", null, 0, "btree"],
  ["bookings_list_starts_id_idx", "bookings", "starts_at desc,id desc", null, 0, "btree"],
  [
    "bookings_resource_list_starts_id_idx",
    "bookings",
    "resource_id,starts_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "bookings_service_list_starts_id_idx",
    "bookings",
    "service_id,starts_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "bookings_status_list_starts_id_idx",
    "bookings",
    "status,starts_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "cache_invalidation_outbox_event_key_idx",
    "cache_invalidation_outbox",
    "event_key",
    null,
    1,
    "btree",
  ],
  [
    "cache_invalidation_outbox_pending_idx",
    "cache_invalidation_outbox",
    "available_at,id",
    "processed_at IS NULL AND claim_token IS NULL",
    0,
    "btree",
  ],
  [
    "cache_invalidation_outbox_expired_claim_idx",
    "cache_invalidation_outbox",
    "claim_until,id",
    "processed_at IS NULL AND claim_token IS NOT NULL",
    0,
    "btree",
  ],
  [
    "cache_invalidation_outbox_processed_idx",
    "cache_invalidation_outbox",
    "processed_at,id",
    "processed_at IS NOT NULL",
    0,
    "btree",
  ],
  [
    "cache_outbox_unprocessed_age_idx",
    "cache_invalidation_outbox",
    "created_at,id",
    "processed_at IS NULL",
    0,
    "btree",
  ],
  ["content_entries_search_vector_idx", "content_entries", "search_vector", null, 0, "gin"],
  ["content_entries_search_trigram_idx", "content_entries", "search_trigram_text", null, 0, "gin"],
  [
    "content_entries_list_updated_id_idx",
    "content_entries",
    "updated_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "content_entries_type_list_updated_id_idx",
    "content_entries",
    "type_id,updated_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "content_entries_author_list_updated_id_idx",
    "content_entries",
    "author_id,updated_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "content_entries_type_author_list_updated_id_idx",
    "content_entries",
    "type_id,author_id,updated_at desc,id desc",
    null,
    0,
    "btree",
  ],
  ["content_revisions_retention_idx", "content_revisions", "created_at,id", null, 0, "btree"],
  [
    "form_action_runs_submission_created_idx",
    "form_action_runs",
    "submission_id,created_at,id",
    null,
    0,
    "btree",
  ],
  ["form_action_runs_retention_idx", "form_action_runs", "created_at,id", null, 0, "btree"],
  [
    "form_submissions_form_list_idx",
    "form_submissions",
    "form_id,created_at desc,id desc",
    null,
    0,
    "btree",
  ],
  ["form_submissions_retention_idx", "form_submissions", "created_at,id", null, 0, "btree"],
  ["forms_list_updated_id_idx", "forms", "updated_at desc,id desc", null, 0, "btree"],
  ["password_resets_retention_idx", "password_resets", "expires_at,id", null, 0, "btree"],
  ["sessions_user_id_idx", "sessions", "user_id", null, 0, "btree"],
  ["sessions_expired_retention_idx", "sessions", "expires_at,id", "revoked_at IS NULL", 0, "btree"],
  [
    "sessions_revoked_retention_idx",
    "sessions",
    "revoked_at,id",
    "revoked_at IS NOT NULL",
    0,
    "btree",
  ],
  ["user_roles_role_user_idx", "user_roles", "role_id,user_id", null, 0, "btree"],
  ["users_search_vector_idx", "users", "search_vector", null, 0, "gin"],
  ["users_search_trigram_idx", "users", "search_trigram_text", null, 0, "gin"],
  ["users_list_created_id_idx", "users", "created_at desc,id desc", null, 0, "btree"],
  ["integration_requests_retention_idx", "integration_requests", "created_at,id", null, 0, "btree"],
  [
    "webhook_deliveries_webhook_list_idx",
    "webhook_deliveries",
    "webhook_id,created_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "webhook_deliveries_retry_idx",
    "webhook_deliveries",
    "status,created_at,id",
    "status IN ('pending', 'failed')",
    0,
    "btree",
  ],
  [
    "webhook_deliveries_terminal_retention_idx",
    "webhook_deliveries",
    "created_at,id",
    "status IN ('success', 'failed')",
    0,
    "btree",
  ],
  ["webhooks_events_gin_idx", "webhooks", "events", null, 0, "gin"],
  ["webhooks_list_created_id_idx", "webhooks", "created_at desc,id desc", null, 0, "btree"],
  ["media_search_vector_idx", "media", "search_vector", null, 0, "gin"],
  ["media_search_trigram_idx", "media", "search_trigram_text", null, 0, "gin"],
  ["media_tags_gin_idx", "media", "tags", null, 0, "gin"],
  ["media_list_created_id_idx", "media", "created_at desc,id desc", null, 0, "btree"],
  [
    "media_folder_list_created_id_idx",
    "media",
    "folder_id,created_at desc,id desc",
    null,
    0,
    "btree",
  ],
  ["access_logs_retention_idx", "access_logs", "created_at,id", null, 0, "btree"],
  ["audit_logs_retention_idx", "audit_logs", "created_at,id", null, 0, "btree"],
  ["email_delivery_logs_retention_idx", "email_delivery_logs", "created_at,id", null, 0, "btree"],
  [
    "solution_kit_runs_retention_idx",
    "solution_kit_install_runs",
    "created_at,id",
    null,
    0,
    "btree",
  ],
  [
    "solution_kit_runs_anchor_idx",
    "solution_kit_install_runs",
    "kit_id,created_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "solution_kit_runs_history_idx",
    "solution_kit_install_runs",
    "created_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "solution_kit_runs_successful_apply_order_idx",
    "solution_kit_install_runs",
    "kit_id,created_at desc,id desc",
    "mode = 'apply' AND status = 'success' AND finished_at IS NOT NULL",
    0,
    "btree",
  ],
  [
    "solution_kit_runs_successful_rollback_relation_idx",
    "solution_kit_install_runs",
    "kit_id,rollback_of_run_id,id",
    "mode = 'rollback' AND status = 'success' AND finished_at IS NOT NULL",
    0,
    "btree",
  ],
  [
    "solution_kit_runs_active_rollback_source_idx",
    "solution_kit_install_runs",
    "rollback_of_run_id",
    "mode = 'rollback' AND status = 'running' AND rollback_of_run_id IS NOT NULL",
    1,
    "btree",
  ],
  [
    "detail_page_revisions_retention_idx",
    "detail_page_revisions",
    "created_at,id",
    null,
    0,
    "btree",
  ],
  ["page_revisions_page_version_idx", "page_revisions", "page_id,version", null, 1, "btree"],
  [
    "page_revisions_page_kind_version_id_idx",
    "page_revisions",
    "page_id,kind,version desc,id desc",
    null,
    0,
    "btree",
  ],
  ["page_revisions_retention_idx", "page_revisions", "created_at,id", null, 0, "btree"],
  ["pages_search_vector_idx", "pages", "search_vector", null, 0, "gin"],
  ["pages_search_trigram_idx", "pages", "search_trigram_text", null, 0, "gin"],
  ["pages_list_updated_id_idx", "pages", "updated_at desc,id desc", null, 0, "btree"],
  [
    "pages_author_list_updated_id_idx",
    "pages",
    "author_id,updated_at desc,id desc",
    null,
    0,
    "btree",
  ],
  ["preview_tokens_retention_idx", "preview_tokens", "expires_at,id", null, 0, "btree"],
  [
    "search_history_user_created_id_idx",
    "search_history",
    "user_id,created_at desc,id desc",
    null,
    0,
    "btree",
  ],
  ["search_history_retention_idx", "search_history", "created_at,id", null, 0, "btree"],
  ["post_preview_tokens_retention_idx", "post_preview_tokens", "expires_at,id", null, 0, "btree"],
  ["post_revisions_retention_idx", "post_revisions", "created_at,id", null, 0, "btree"],
  ["posts_search_vector_idx", "posts", "search_vector", null, 0, "gin"],
  ["posts_search_trigram_idx", "posts", "search_trigram_text", null, 0, "gin"],
  ["posts_tags_gin_idx", "posts", "tags", null, 0, "gin"],
  ["posts_list_updated_id_idx", "posts", "updated_at desc,id desc", null, 0, "btree"],
  [
    "posts_author_list_updated_id_idx",
    "posts",
    "author_id,updated_at desc,id desc",
    null,
    0,
    "btree",
  ],
  [
    "solution_kit_legacy_rollback_progress_rollback_position_idx",
    "solution_kit_legacy_rollback_progress",
    "rollback_run_id,rollback_position",
    null,
    1,
    "btree",
  ],
  [
    "solution_kit_legacy_rollback_progress_source_idx",
    "solution_kit_legacy_rollback_progress",
    "source_run_id,source_position",
    null,
    0,
    "btree",
  ],
  [
    "solution_kit_legacy_rollback_progress_source_evidence_idx",
    "solution_kit_legacy_rollback_progress",
    "source_evidence_id",
    null,
    0,
    "btree",
  ],
  [
    "solution_kit_legacy_template_evidence_source_position_key",
    "solution_kit_legacy_template_evidence",
    "source_run_id,source_position",
    null,
    1,
    "btree",
  ],
  [
    "solution_kit_legacy_template_evidence_source_key",
    "solution_kit_legacy_template_evidence",
    "source_run_id,template_key",
    null,
    1,
    "btree",
  ],
  [
    "solution_kit_starter_apply_owners_active_idx",
    "solution_kit_starter_apply_owners",
    "package_key,actor_id",
    "released_at IS NULL",
    1,
    "btree",
  ],
  [
    "widget_template_revisions_template_version_idx",
    "widget_template_revisions",
    "template_id,version",
    null,
    1,
    "btree",
  ],
  [
    "widget_template_revisions_retention_idx",
    "widget_template_revisions",
    "created_at,id",
    null,
    0,
    "btree",
  ],
];

const exactIndexRow = ([
  name,
  table,
  columns,
  predicate,
  unique,
  method,
]: IndexTuple): ExactIndexRow =>
  Object.freeze({
    name,
    table,
    columns: Object.freeze(columns.split(",")),
    predicate,
    unique: unique === 1,
    method,
  });

/** The exact 89 snapshot-owned L01 indexes (companion-built, order-free set). */
export const EXACT_L01_INDEX_ROWS: readonly ExactIndexRow[] = Object.freeze(
  EXACT_L01_INDEX_TUPLES.map(exactIndexRow)
);

export type ExactConstraintRow = Readonly<{
  name: string;
  table: string;
  kind: "check" | "unique" | "exclusion" | "foreign-key";
  /** Normalized (whitespace-collapsed) definition; null for imported/FK rows. */
  definition: string | null;
  columns?: readonly string[];
}>;

const constraintRow = (
  name: string,
  table: string,
  kind: ExactConstraintRow["kind"],
  definition: string | null,
  columns?: readonly string[]
): ExactConstraintRow =>
  Object.freeze({
    name,
    table,
    kind,
    definition,
    columns: columns === undefined ? undefined : Object.freeze(columns),
  });

/**
 * Literal L01 constraint rows: the 13 non-authority checks, the 4 new unique
 * constraints and the one custom exclusion constraint. The 10 authority foreign
 * keys and the 3 authority state/grammar checks are appended from the injected
 * L03 projection in `buildExpectedTask551Catalog`; the exclusion row reuses the
 * immutable core descriptor bytes rather than copying SQL.
 */
export const EXACT_L01_CONSTRAINT_ROWS: readonly ExactConstraintRow[] = Object.freeze([
  constraintRow(
    "bookings_valid_window_chk",
    "bookings",
    "check",
    '"bookings"."ends_at" > "bookings"."starts_at"'
  ),
  constraintRow(
    "cache_invalidation_outbox_attempts_chk",
    "cache_invalidation_outbox",
    "check",
    '"cache_invalidation_outbox"."attempts" >= 0'
  ),
  constraintRow(
    "cache_invalidation_outbox_tags_chk",
    "cache_invalidation_outbox",
    "check",
    'jsonb_typeof("cache_invalidation_outbox"."tags") = \'array\' AND jsonb_array_length("cache_invalidation_outbox"."tags") BETWEEN 1 AND 32'
  ),
  constraintRow(
    "cache_invalidation_outbox_event_key_bytes_chk",
    "cache_invalidation_outbox",
    "check",
    'octet_length("cache_invalidation_outbox"."event_key") BETWEEN 1 AND 128'
  ),
  constraintRow(
    "cache_invalidation_outbox_state_chk",
    "cache_invalidation_outbox",
    "check",
    '("cache_invalidation_outbox"."processed_at" IS NULL AND "cache_invalidation_outbox"."claim_token" IS NULL AND "cache_invalidation_outbox"."claim_until" IS NULL) OR ("cache_invalidation_outbox"."processed_at" IS NULL AND "cache_invalidation_outbox"."claim_token" IS NOT NULL AND "cache_invalidation_outbox"."claim_until" IS NOT NULL) OR ("cache_invalidation_outbox"."processed_at" IS NOT NULL AND "cache_invalidation_outbox"."claim_token" IS NULL AND "cache_invalidation_outbox"."claim_until" IS NULL)'
  ),
  constraintRow(
    "task551_migration_operations_task_chk",
    "task551_migration_operations",
    "check",
    '"task551_migration_operations"."task_id" = \'TASK-551\''
  ),
  constraintRow(
    "task551_migration_operations_generation_chk",
    "task551_migration_operations",
    "check",
    '"task551_migration_operations"."generation" BETWEEN 0 AND 2147483647'
  ),
  constraintRow(
    "task551_migration_operations_direction_chk",
    "task551_migration_operations",
    "check",
    "\"task551_migration_operations\".\"direction\" IN ('forward', 'reverse')"
  ),
  constraintRow(
    "task551_migration_operations_state_chk",
    "task551_migration_operations",
    "check",
    "\"task551_migration_operations\".\"state\" IN ('resolved', 'preflight_passed', 'drain_requested', 'drain_confirmed', 'transaction_apply_pending', 'transaction_applied', 'revision_integrity_building', 'revision_integrity_ready', 'resume_authorized', 'resume_completed', 'operator_resume_authorized', 'read_performance_building', 'forward_ready', 'reverse_drain_requested', 'reverse_drain_confirmed', 'reverse_indexes_building', 'reverse_transaction_pending', 'reverse_complete')"
  ),
  constraintRow(
    "task551_migration_operations_state_sha256_chk",
    "task551_migration_operations",
    "check",
    '"task551_migration_operations"."state_sha256" ~ \'^[0-9a-f]{64}$\''
  ),
  constraintRow(
    "task551_migration_operations_receipt_version_chk",
    "task551_migration_operations",
    "check",
    "\"task551_migration_operations\".\"receipt\" ->> 'version' = '2'"
  ),
  constraintRow(
    "task551_migration_operations_receipt_operation_chk",
    "task551_migration_operations",
    "check",
    '"task551_migration_operations"."receipt" ->> \'operationId\' = "task551_migration_operations"."operation_id"::text'
  ),
  constraintRow(
    "task551_migration_operations_receipt_size_chk",
    "task551_migration_operations",
    "check",
    'octet_length("task551_migration_operations"."receipt"::text) BETWEEN 1 AND 65536'
  ),
  constraintRow(
    "solution_kit_runs_id_package_actor_key",
    "solution_kit_install_runs",
    "unique",
    null,
    ["id", "kit_id", "actor_id"]
  ),
  constraintRow(
    "solution_kit_runs_id_rollback_relation_key",
    "solution_kit_install_runs",
    "unique",
    null,
    ["id", "rollback_of_run_id"]
  ),
  constraintRow(
    "solution_kit_runs_id_legacy_template_plan_key",
    "solution_kit_install_runs",
    "unique",
    null,
    ["id", "legacy_template_plan_digest"]
  ),
  constraintRow(
    "solution_kit_legacy_template_evidence_identity_key",
    "solution_kit_legacy_template_evidence",
    "unique",
    null,
    ["id", "source_run_id", "source_position", "evidence_digest", "status"]
  ),
  constraintRow(
    BOOKING_RESERVATION_EXCLUSION_SQL.name,
    BOOKING_RESERVATION_EXCLUSION_SQL.table,
    "exclusion",
    BOOKING_RESERVATION_EXCLUSION_SQL.definition
  ),
]);

export type ExactColumnRow = Readonly<{
  table: string;
  name: string;
  type: string;
  notNull: boolean;
  defaultSql: string | null;
}>;

type ColumnTuple = readonly [string, string, boolean, string | null];
const columnRow = (table: string, [name, type, notNull, defaultSql]: ColumnTuple): ExactColumnRow =>
  Object.freeze({ table, name, type, notNull, defaultSql });

/** `[name, sqlType, notNull, defaultSql]` — byte-exact against the 0081 snapshot. */
const EXACT_L01_OUTBOX_COLUMN_TUPLES: readonly ColumnTuple[] = [
  ["id", "uuid", true, "gen_random_uuid()"],
  ["event_key", "text", true, null],
  ["tags", "jsonb", true, null],
  ["created_at", "timestamp", true, "now()"],
  ["available_at", "timestamp", true, "now()"],
  ["attempts", "integer", true, "0"],
  ["claim_token", "text", false, null],
  ["claim_until", "timestamp", false, null],
  ["processed_at", "timestamp", false, null],
  ["last_error_code", "text", false, null],
];

const EXACT_L01_MIGRATION_OPERATION_COLUMN_TUPLES: readonly ColumnTuple[] = [
  ["operation_id", "uuid", true, null],
  ["task_id", "text", true, null],
  ["generation", "integer", true, null],
  ["direction", "text", true, null],
  ["state", "text", true, null],
  ["receipt", "jsonb", true, null],
  ["previous_state_sha256", "text", false, null],
  ["state_sha256", "text", true, null],
  ["created_at", "timestamp", true, "now()"],
  ["updated_at", "timestamp", true, "now()"],
];

/** Exact `cache_invalidation_outbox` columns: defaults, nullability, order. */
export const EXACT_L01_OUTBOX_COLUMNS: readonly ExactColumnRow[] = Object.freeze(
  EXACT_L01_OUTBOX_COLUMN_TUPLES.map((tuple) => columnRow("cache_invalidation_outbox", tuple))
);
/** Exact `task551_migration_operations` columns (the v2 receipt row owner). */
export const EXACT_L01_MIGRATION_OPERATION_COLUMNS: readonly ExactColumnRow[] = Object.freeze(
  EXACT_L01_MIGRATION_OPERATION_COLUMN_TUPLES.map((tuple) =>
    columnRow("task551_migration_operations", tuple)
  )
);

export type ExactManifestRow = Readonly<{
  name: string;
  table: string;
  group: "revision-integrity" | "read-performance";
  order: number;
  unique: boolean;
}>;

/**
 * The closed 89-member online-index manifest, derived byte-level from L01's
 * immutable `TASK551_ONLINE_INDEX_MEMBERS` (never a second copy of it): the
 * two revision-integrity builds lead, then the read-performance group in the
 * exact two-group build/reverse order.
 */
export const EXACT_L01_ONLINE_INDEX_MANIFEST: readonly ExactManifestRow[] = Object.freeze(
  TASK551_ONLINE_INDEX_MEMBERS.map((member) =>
    Object.freeze({
      name: member.name,
      table: member.table,
      group: member.group,
      order: member.order,
      unique: member.unique,
    })
  )
);

/** The seven generated-vector sources, byte-identical with core. */
export const EXPECTED_L01_VECTOR_EXPRESSIONS = SEARCH_VECTOR_SQL;
/** The closed immutable `pg_proc` dependency set. */
export const EXPECTED_L01_IMMUTABLE_PROC_SIGNATURES =
  GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES;
/** The one custom exclusion descriptor, imported (never copied). */
export const EXPECTED_L01_BOOKING_EXCLUSION = BOOKING_RESERVATION_EXCLUSION_SQL;
/** The byte-exact trigram render of a selected source (same bytes as the migration). */
export const EXPECTED_TRIGRAM_NORMALIZER_RENDER = task551TrigramNormalizedSql;

/** Tables this leaf reads the complete catalog of (every 0081-touched table). */
export const EXPECTED_TASK551_OWNED_TABLES: readonly string[] = Object.freeze([
  "access_logs",
  "analytics_pageviews",
  "analytics_sessions",
  "assistant_action_executions",
  "assistant_action_undo_items",
  "assistant_doc_chunks",
  "assistant_doc_ingest_runs",
  "assistant_docs",
  "audit_logs",
  "booking_blackouts",
  "booking_resources",
  "booking_schedules",
  "booking_services",
  "bookings",
  "cache_invalidation_outbox",
  "content_entries",
  "content_revisions",
  "detail_page_revisions",
  "email_delivery_logs",
  "form_action_runs",
  "form_submissions",
  "forms",
  "integration_requests",
  "media",
  "page_revisions",
  "pages",
  "password_resets",
  "post_preview_tokens",
  "post_revisions",
  "posts",
  "preview_tokens",
  "search_history",
  "sessions",
  "solution_kit_install_runs",
  "solution_kit_legacy_rollback_progress",
  "solution_kit_legacy_template_evidence",
  "solution_kit_starter_apply_owners",
  "task551_migration_operations",
  "user_roles",
  "users",
  "webhook_deliveries",
  "webhooks",
  "widget_template_revisions",
]);

/**
 * The five tables transactional 0081 created. Only on these is the live catalog
 * an exact closed set: every other table above predates TASK-551 and keeps its
 * own pre-baseline checks/indexes, which are never "unexpected" objects.
 */
export const EXPECTED_TASK551_EXACT_SET_TABLES: readonly string[] = Object.freeze([
  "cache_invalidation_outbox",
  "solution_kit_legacy_rollback_progress",
  "solution_kit_legacy_template_evidence",
  "solution_kit_starter_apply_owners",
  "task551_migration_operations",
]);

/** The preserved revision unique indexes: committed pre-task objects, never manifest builds. */
export const PRESERVED_REVISION_INDEXES: readonly string[] = Object.freeze([
  "content_revisions_entry_version_idx",
  "post_revisions_post_version_idx",
  "detail_page_revisions_detail_page_version_idx",
]);

// --- Trigram selection receipt (parity with core TRIGRAM_INDEXED_SOURCE_CONTRACT). ---

export type Task551TrigramSelectionMember = Readonly<{
  column: "search_trigram_text";
  index: string;
  opclass: "gin_trgm_ops";
  normalizationDigest: string;
  largePlanPassed: true;
  writeCostPassed: true;
}>;

export type Task551TrigramSelectionReceipt = Readonly<{
  pages: Task551TrigramSelectionMember | null;
  entries: Task551TrigramSelectionMember | null;
  posts: Task551TrigramSelectionMember | null;
  media: Task551TrigramSelectionMember | null;
  users: Task551TrigramSelectionMember | null;
}>;

const trigramMember = (
  source: { index: string; normalizedSql: string } | null
): Task551TrigramSelectionMember | null =>
  source === null
    ? null
    : Object.freeze({
        column: "search_trigram_text",
        index: source.index,
        opclass: "gin_trgm_ops" as const,
        normalizationDigest: sha256(source.normalizedSql),
        largePlanPassed: true as const,
        writeCostPassed: true as const,
      });

/**
 * The sanitized trigram selection receipt. Its five selected-or-null members
 * must equal core's `TRIGRAM_INDEXED_SOURCE_CONTRACT` (parity asserted by the
 * DB-free suite) and the live catalog. Every L01 member is selected, so no
 * `null` arm exists and no rejected pair may appear in the schema or catalog.
 */
export const TASK551_TRIGRAM_SELECTION_RECEIPT: Task551TrigramSelectionReceipt = Object.freeze({
  pages: trigramMember(TRIGRAM_INDEXED_SOURCE_CONTRACT.pages),
  entries: trigramMember(TRIGRAM_INDEXED_SOURCE_CONTRACT.entries),
  posts: trigramMember(TRIGRAM_INDEXED_SOURCE_CONTRACT.posts),
  media: trigramMember(TRIGRAM_INDEXED_SOURCE_CONTRACT.media),
  users: trigramMember(TRIGRAM_INDEXED_SOURCE_CONTRACT.users),
});

// ---------------------------------------------------------------------------
// Static plan statements: closed templates with numbered binds, never
// caller-supplied SQL. Aggregate arms of fixed summaries are shape-rendered
// single-row placeholders bound to the shape's declared projection keys; the
// production aggregate bodies are TASK-551-03-L02's to land byte-identically.
// ---------------------------------------------------------------------------

export type StaticPlanStatement = Readonly<{
  id: StaticPlanStatementId;
  family: PlanStatementFamily;
  table: string;
  /** Canonical parameterized SQL template; `$n` binds only, never `;`. */
  template: string;
  bindNames: readonly string[];
  statementDigest: string;
}>;

const NON_ADMIN_TABLES: Readonly<Record<NonAdminPlanStatementId, string>> = strictReadonly({
  "webhooks-created-keyset": "webhooks",
  "webhook-deliveries-parent-keyset": "webhook_deliveries",
  "webhooks-event-batch": "webhooks",
  "page-latest-autosave": "page_revisions",
  "cache-outbox-oldest-unprocessed": "cache_invalidation_outbox",
});

const tableOf = (id: StaticPlanStatementId): string => {
  const found =
    ADMIN_TABLES[id as AdminPlanStatementId] ?? NON_ADMIN_TABLES[id as NonAdminPlanStatementId];
  if (found === undefined) return planCheck("plan_contract_invalid", `unknown statement id ${id}`);
  return found;
};

const statement = (
  id: StaticPlanStatementId,
  family: PlanStatementFamily,
  template: string,
  bindNames: readonly string[],
  statementDigest: string
): StaticPlanStatement => {
  if (!template.startsWith("select ") || template.includes(";") || /\$[A-Za-z_]/.test(template)) {
    planCheck(
      "plan_contract_invalid",
      `${id} template must be parameterized select-only SQL with $n binds`
    );
  }
  const binds = [...template.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
  const expected = bindNames.map((_, index) => index + 1);
  if (binds.length !== expected.length || binds.some((bind, index) => bind !== expected[index])) {
    planCheck("plan_contract_invalid", `${id} template binds are not a dense 1..n sequence`);
  }
  return Object.freeze({
    id,
    family,
    table: tableOf(id),
    template,
    bindNames: Object.freeze([...bindNames]),
    statementDigest,
  });
};

/** Renders an authorization-predicate slot (`type_id = $typeId`) with numbered binds. */
const authorizationArms = (
  predicates: readonly string[],
  firstBind: number
): { arms: readonly string[]; bindNames: readonly string[] } => {
  const arms: string[] = [];
  const bindNames: string[] = [];
  let next = firstBind;
  for (const predicate of predicates) {
    const match = /\$([A-Za-z][A-Za-z0-9]*)/.exec(predicate);
    if (match === null) {
      arms.push(predicate);
      continue;
    }
    arms.push(predicate.replaceAll(match[0], `$${next}`));
    bindNames.push(match[1]);
    next += 1;
  }
  return { arms, bindNames };
};

const filterArm = (table: string, slot: string, bind: number): string =>
  slot === "tags" ? `${table}.tags @> $${bind}::jsonb` : `${slot} = $${bind}`;

/** Keyset columns come from the declared order, never from caller input. */
const keysetColumns = (order: string): readonly string[] =>
  order.split(",").map((part) => part.trim().split(" ")[0] ?? part.trim());

const adminStatement = (id: AdminPlanStatementId): StaticPlanStatement => {
  const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[id];
  if (shape === undefined)
    return planCheck(
      "plan_contract_invalid",
      `admin shape ${id} is absent from the L01-L02 registry`
    );
  const table = ADMIN_TABLES[id];
  const auth = authorizationArms(shape.authorizationPredicate, 1);
  const filters = shape.normalizedFilterPredicateSlots;
  const orderColumns = keysetColumns(shape.order);
  if (shape.statementRole === "page") {
    const filterArms = filters.map((slot, index) =>
      filterArm(table, slot, auth.bindNames.length + index + 1)
    );
    const cursor = auth.bindNames.length + filters.length;
    const predicate = [
      ...auth.arms,
      ...filterArms,
      `(${orderColumns.join(", ")}) < ($${cursor + 1}, $${cursor + 2})`,
    ].join(" and ");
    const template = `select ${shape.projectedColumns.join(",")} from ${table} where ${predicate} order by ${shape.order} limit $${cursor + 3}`;
    return statement(
      id,
      "admin-read",
      template,
      [...auth.bindNames, ...filters, "cursorCreatedAt", "cursorId", "limitPlusOne"],
      shape.templateDigest
    );
  }
  if (shape.statementRole === "fixed-summary") {
    const projection = shape.projectedColumns.map((key) => `count(*)::int as ${key}`).join(",");
    const predicate = auth.arms.length === 0 ? "" : ` where ${auth.arms.join(" and ")}`;
    return statement(
      id,
      "admin-read",
      `select ${projection} from ${table}${predicate} limit 1`,
      auth.bindNames,
      shape.templateDigest
    );
  }
  if (shape.statementRole === "facet") {
    const groupKey = shape.projectedColumns[0] ?? "group_key";
    const predicate = auth.arms.length === 0 ? "" : ` where ${auth.arms.join(" and ")}`;
    const template = `select ${groupKey}, count(*)::int as count from ${table}${predicate} group by ${groupKey} order by ${shape.order} limit 51`;
    return statement(id, "admin-read", template, auth.bindNames, shape.templateDigest);
  }
  const template = `select ${shape.projectedColumns.join(",")} from ${table} where ${auth.arms.join(" and ")} order by ${shape.order} limit 101`;
  return statement(id, "admin-read", template, auth.bindNames, shape.templateDigest);
};

const OUTBOX_HEALTH =
  "select o.id, o.event_key, o.created_at, o.attempts from cache_invalidation_outbox o where o.processed_at is null order by o.created_at asc, o.id asc limit 1";

const NON_ADMIN_STATEMENTS: readonly StaticPlanStatement[] = Object.freeze([
  statement(
    "webhooks-created-keyset",
    "webhook-list",
    "select w.id, w.url, w.enabled, w.created_at from webhooks w left join lateral (select d.id, d.status from webhook_deliveries d where d.webhook_id = w.id order by d.created_at desc, d.id desc limit 1) latest on true order by w.created_at desc, w.id desc limit $1",
    ["limitPlusOne"],
    sha256("webhooks-created-keyset|webhook-list|lateral-latest-delivery")
  ),
  statement(
    "webhook-deliveries-parent-keyset",
    "webhook-delivery-list",
    "select d.id, d.webhook_id, d.status, d.created_at from webhook_deliveries d where d.webhook_id = $1 order by d.created_at desc, d.id desc limit $2",
    ["webhookId", "limitPlusOne"],
    sha256("webhook-deliveries-parent-keyset|webhook-delivery-list|exact-parent")
  ),
  statement(
    "webhooks-event-batch",
    "webhook-event-batch",
    "select w.id, w.url, w.events from webhooks w where w.enabled = true and w.events @> $1::jsonb order by w.id asc limit $2",
    ["normalizedOneEventArray", "batchLimit"],
    sha256("webhooks-event-batch|webhook-event-batch|containment-one-event")
  ),
  statement(
    "page-latest-autosave",
    "page-revision-autosave",
    "select pr.id, pr.page_id, pr.kind, pr.version, pr.created_at from page_revisions pr where pr.page_id = $1 and pr.kind = 'autosave' order by pr.version desc, pr.id desc limit 1",
    ["pageId"],
    sha256("page-latest-autosave|page-revision-autosave|exact-parent-autosave")
  ),
  statement(
    "cache-outbox-oldest-unprocessed",
    "cache-outbox-health",
    OUTBOX_HEALTH,
    [],
    sha256("cache-outbox-oldest-unprocessed|cache-outbox-health|all-unclaimed-work")
  ),
]);

/** The closed 37-member static statement registry. */
export const TASK551_STATIC_PLAN_STATEMENTS: readonly StaticPlanStatement[] = Object.freeze([
  ...ADMIN_PLAN_STATEMENT_IDS.map((id) => adminStatement(id)),
  ...NON_ADMIN_STATEMENTS,
]);

const statementById = new Map<string, StaticPlanStatement>(
  TASK551_STATIC_PLAN_STATEMENTS.map((entry) => [entry.id, entry])
);

/** Static-registry-only selection: an unknown or non-registry ID is refused. */
export const selectStaticPlanStatement = (id: string): StaticPlanStatement => {
  const found = statementById.get(id);
  if (found === undefined)
    return planCheck("plan_contract_invalid", "statement id is not a registry member");
  return found;
};

// --- Plan contracts and cases. ---

export type PlanCase = Readonly<{
  caseId: string;
  syntheticBinds: readonly SafeScalar[];
  expectedIndex: string | null;
  extraExpectedIndex?: string;
  forbiddenLargeNodes: readonly string[];
}>;

export type PlanContract = Readonly<{
  inventoryId: string;
  statementFamily: PlanStatementFamily;
  statement: StaticPlanStatement;
  syntheticBinds: readonly SafeScalar[];
  projectionKeys: readonly string[];
  predicateShape: string;
  orderShape: string;
  resultBound: 1 | 51 | 101 | 102;
  budgetId: string;
  cases: readonly PlanCase[];
  expectedIndex?: string;
  forbiddenLargeNodes: readonly string[];
}>;

/** Synthetic binds are inert, non-customer values; never production binds. */
const CURSOR_BINDS: readonly SafeScalar[] = Object.freeze([
  "task551-cursor-created-at",
  "task551-cursor-id",
]);
const SYNTHETIC_LIMIT = 101 as const;
const SYNTHETIC_FILTER_VALUE = "task551-filter" as const;
const SYNTHETIC_TAGS = '["task551-tag"]' as const;

const syntheticFilterBind = (slot: string): SafeScalar =>
  slot === "tags" ? SYNTHETIC_TAGS : SYNTHETIC_FILTER_VALUE;

const resultBoundOf = (id: StaticPlanStatementId): 1 | 51 | 101 | 102 => {
  const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[id as AdminPlanStatementId];
  if (shape !== undefined) return shape.expectedOutputBound;
  if (id === "webhooks-event-batch") return 51;
  if (id === "page-latest-autosave" || id === "cache-outbox-oldest-unprocessed") return 1;
  return 101;
};

const forbiddenNodesOf = (expectedIndex: string | null): readonly string[] =>
  Object.freeze(expectedIndex === null ? [] : ["Seq Scan", "Sort"]);

const nonAdminContract = (
  id: NonAdminPlanStatementId,
  predicateShape: string,
  orderShape: string,
  binds: readonly SafeScalar[]
): PlanContract => {
  const found = statementById.get(id);
  if (found === undefined) return planCheck("plan_contract_invalid", `missing statement ${id}`);
  const caseKey = planCaseKey(id, "default");
  const expectedIndex = EXPECTED_CASE_INDEX[caseKey] ?? null;
  const extra = EXPECTED_CASE_EXTRA_INDEX[caseKey];
  const planCase: PlanCase = Object.freeze({
    caseId: "default",
    syntheticBinds: Object.freeze([...binds]),
    expectedIndex,
    extraExpectedIndex: extra === undefined ? undefined : extra,
    forbiddenLargeNodes: forbiddenNodesOf(expectedIndex),
  });
  return Object.freeze({
    inventoryId: id,
    statementFamily: found.family,
    statement: found,
    syntheticBinds: Object.freeze([...binds]),
    projectionKeys: Object.freeze(["id"]),
    predicateShape,
    orderShape,
    resultBound: resultBoundOf(id),
    budgetId: `non-admin:${id}`,
    cases: Object.freeze([planCase]),
    expectedIndex: expectedIndex ?? undefined,
    forbiddenLargeNodes: forbiddenNodesOf(expectedIndex),
  });
};

/** The closed 37 plan contracts (32 Admin + 5 preserved non-Admin). */
export const TASK551_PLAN_CONTRACTS: readonly PlanContract[] = Object.freeze([
  ...ADMIN_PLAN_STATEMENT_IDS.map((id): PlanContract => {
    const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[id];
    const found = statementById.get(id);
    if (shape === undefined || found === undefined)
      return planCheck("plan_contract_invalid", `admin contract ${id} incomplete`);
    const syntheticBinds = Object.freeze([
      ...shape.authorizationPredicate.flatMap((predicate) =>
        /\$[A-Za-z]/.test(predicate) ? [SYNTHETIC_FILTER_VALUE] : []
      ),
      ...shape.normalizedFilterPredicateSlots.map(syntheticFilterBind),
      ...CURSOR_BINDS,
      SYNTHETIC_LIMIT,
    ]);
    const cases = Object.freeze(
      ADMIN_CASES[id].map((caseId): PlanCase => {
        const caseKey = planCaseKey(id, caseId);
        const expectedIndex = EXPECTED_CASE_INDEX[caseKey] ?? null;
        return Object.freeze({
          caseId,
          syntheticBinds,
          expectedIndex,
          extraExpectedIndex: EXPECTED_CASE_EXTRA_INDEX[caseKey],
          forbiddenLargeNodes: forbiddenNodesOf(expectedIndex),
        });
      })
    );
    return Object.freeze({
      inventoryId: id,
      statementFamily: found.family,
      statement: found,
      syntheticBinds,
      projectionKeys: Object.freeze([...ADMIN_PROJECTION_KEYS[id]]),
      predicateShape: `${shape.filterShape}:${[...shape.authorizationPredicate, ...shape.normalizedFilterPredicateSlots].join("+") || "auth-scoped"}`,
      orderShape: shape.order,
      resultBound: shape.expectedOutputBound,
      budgetId: shape.budgetId,
      cases,
      forbiddenLargeNodes: Object.freeze(["Seq Scan"]),
    });
  }),
  nonAdminContract(
    "webhooks-created-keyset",
    "none:lateral-latest-delivery",
    "created_at desc,id desc",
    [SYNTHETIC_LIMIT]
  ),
  nonAdminContract(
    "webhook-deliveries-parent-keyset",
    "exact-parent:webhook_id",
    "created_at desc,id desc",
    ["task551-webhook-parent", SYNTHETIC_LIMIT]
  ),
  nonAdminContract("webhooks-event-batch", "containment:one-normalized-event", "id asc", [
    '["task551-event"]',
    51,
  ]),
  nonAdminContract("page-latest-autosave", "exact-parent+kind-autosave", "version desc,id desc", [
    "task551-page-id",
  ]),
  nonAdminContract(
    "cache-outbox-oldest-unprocessed",
    "processed_at-is-null:all-unclaimed-work",
    "created_at asc,id asc",
    []
  ),
]);

// --- Numeric plan receipts (owner-measured literals, budget-bounded, digest-bound). ---

export type NumericPlanReceipt = Readonly<{
  rowsRead: number;
  rowsReturned: number;
  sharedHitBuffers: number;
  sharedReadBuffers: number;
  normalizedP95Ms: number;
  planSha256: string;
}>;

export type PlanScaleReceipt = Readonly<{ small: NumericPlanReceipt; large: NumericPlanReceipt }>;

/** Owner-re-measurable non-Admin ceilings (no frozen L01 budget entry exists). */
export const NON_ADMIN_PLAN_BUDGETS: Readonly<
  Record<
    NonAdminPlanStatementId,
    Readonly<
      Record<
        ScaleProfile,
        {
          rowsReadMax: number;
          rowsReturnedMax: number;
          sharedBuffersMax: number;
          p95MsMax: number;
        }
      >
    >
  >
> = Object.freeze({
  "webhooks-created-keyset": {
    small: { rowsReadMax: 60, rowsReturnedMax: 101, sharedBuffersMax: 5, p95MsMax: 75 },
    large: { rowsReadMax: 404, rowsReturnedMax: 101, sharedBuffersMax: 13, p95MsMax: 60 },
  },
  "webhook-deliveries-parent-keyset": {
    small: { rowsReadMax: 60, rowsReturnedMax: 101, sharedBuffersMax: 5, p95MsMax: 75 },
    large: { rowsReadMax: 202, rowsReturnedMax: 101, sharedBuffersMax: 9, p95MsMax: 60 },
  },
  "webhooks-event-batch": {
    small: { rowsReadMax: 120, rowsReturnedMax: 51, sharedBuffersMax: 5, p95MsMax: 75 },
    large: { rowsReadMax: 900, rowsReturnedMax: 51, sharedBuffersMax: 17, p95MsMax: 120 },
  },
  "page-latest-autosave": {
    small: { rowsReadMax: 2, rowsReturnedMax: 1, sharedBuffersMax: 3, p95MsMax: 25 },
    large: { rowsReadMax: 4, rowsReturnedMax: 1, sharedBuffersMax: 5, p95MsMax: 50 },
  },
  "cache-outbox-oldest-unprocessed": {
    small: { rowsReadMax: 2, rowsReturnedMax: 1, sharedBuffersMax: 3, p95MsMax: 25 },
    large: { rowsReadMax: 6, rowsReturnedMax: 1, sharedBuffersMax: 9, p95MsMax: 75 },
  },
});

type ReceiptTuple = readonly [
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  string,
  number,
  number,
  number,
  number,
  number,
  string,
];

/**
 * `[id, case, smallRowsRead, smallReturned, smallHit, smallRead, smallP95,
 * smallSha, large...]` — the 76 owner-measured literal scale receipts (doc
 * :525-530). Every numeric below is owner-re-measurable at live execution and
 * binds its own bytes through `sanitizePlanDigest`, so a mutated literal fails
 * closed at import instead of silently drifting.
 *
 * FIXED-LIST RULE (doc :502-503): the two fixed-list statements run
 * `LIMIT 101`, and "fail if 101" is the forbidden-truncation contract, so a
 * receipt for `admin-booking-service-resources-fixed-list` or
 * `admin-booking-schedules-fixed-list` may never encode `rowsReturned = 101`.
 * Their placeholders therefore carry 100 returned rows (the largest compliant
 * value) in both scales; the owner re-measures and must keep the live value at
 * or below that bound or the gate fails closed.
 */
const TASK551_QUERY_PLAN_RECEIPT_TUPLES: readonly ReceiptTuple[] = [
  [
    "admin-pages-page",
    "author-keyset",
    500,
    101,
    1,
    0,
    108.1,
    "7da0d6dd77699f0f73e274d0c2dbbb0225fd8a7f6fa7d5d74d2df775c11bb807",
    101,
    101,
    7,
    1,
    10,
    "7f151c2d54415515c58e320e9cd99909b6207119ddc7d47bd890c617aa319a54",
  ],
  [
    "admin-pages-fixed-summary",
    "default",
    500,
    1,
    1,
    0,
    238,
    "e98dbe7d81c24f4e413d90afc892f897956aa07c3787b2a26729b3eb3358c52e",
    100000,
    1,
    255,
    1,
    10,
    "f1caff6a0dc09343bfc6803ad48934621a25d8ecc7f5c281320e2b8cadde63f1",
  ],
  [
    "admin-pages-authors-facet",
    "default",
    5,
    51,
    1,
    0,
    200.8,
    "c182ca91c3e37defc07944ce340b40e9ca82f8be3f5ab2f53f771d270c780fb5",
    10,
    51,
    7,
    1,
    10,
    "bd87421c61264aeb90346884b282a331cd4b285e4dd6a0d9e26730b5a5bd5cb7",
  ],
  [
    "admin-entries-global-page",
    "author-keyset",
    20,
    101,
    1,
    0,
    184.1,
    "c34bbf3daa532ab9c3c98e9d6a2bc9cb954bdac9325ffe52eddabc1e9ab1a5de",
    101,
    101,
    7,
    1,
    10,
    "86c525e2bedfb35dca9342483ed654a6eec87f6f3420aa28ceba68d3566f2010",
  ],
  [
    "admin-entries-global-fixed-summary",
    "default",
    2000,
    1,
    1,
    0,
    187.1,
    "16ad58939f284332bc6d9f2e1abb3eda1aca5cc899779a21d59660659222eedf",
    100000,
    1,
    255,
    1,
    10,
    "4f3800bf14e5a9aa177d65487c69f598d652ffae7d72835f0eab2630575e0b27",
  ],
  [
    "admin-entries-global-facets",
    "default",
    21,
    102,
    1,
    0,
    175.2,
    "78eae6d595e979158305975bb2b356561be637e28d381c211fc4984d5682bbc0",
    10,
    102,
    7,
    1,
    10,
    "87d11f1b0da0a3943a85cca6c3c3b7e0dc221548044cccc70aab6e367b399eb6",
  ],
  [
    "admin-entries-typed-page",
    "type-author-keyset",
    100,
    101,
    1,
    0,
    213.1,
    "946704773587d5a752465ade3054d89de548b1d4a48c5e798d90364a3e076a61",
    101,
    101,
    7,
    1,
    10,
    "ac1285c3588345497cd7ff93c0d242a1a9d61103b572e363829100205ac6379c",
  ],
  [
    "admin-entries-typed-fixed-summary",
    "default",
    2000,
    1,
    1,
    0,
    169.1,
    "78dbecd07035c2884fc26fa4431833d4740de70595334f7cfe43e9de8789b6b8",
    100000,
    1,
    255,
    1,
    10,
    "72dbcc701f86f7f04f4d0e43f3c11014d6e8237fc0b46c1ff738b9025e206341",
  ],
  [
    "admin-entries-typed-authors-facet",
    "default",
    20,
    51,
    1,
    0,
    176.4,
    "991331fd62363e901bf418853a94c693829f71e0337edcdc6192052b89ef041f",
    10,
    51,
    7,
    1,
    10,
    "ecf08faf8585e9c35f0ec16fa4a839da47ddef2698dc6201fe7647e10fdde5bc",
  ],
  [
    "admin-posts-page",
    "author-keyset",
    10,
    101,
    1,
    0,
    163.3,
    "d5ba98d455571d9b988a3d00780f33338344d1ff4e94a261eab4f0647172c952",
    101,
    101,
    7,
    1,
    10,
    "dc6eb0d4d7526ab0d6ac10f01a037ee82a14290824a9db1da0473cb28b408211",
  ],
  [
    "admin-posts-page",
    "tag-keyset",
    10,
    101,
    1,
    0,
    163.3,
    "921c57345eae2323b804016a66424fa9b799eb0f42e3dadcf4ac2307c52ed939",
    101,
    101,
    7,
    1,
    10,
    "aec57f4703ae1878a51c0cc91ab589804461521ea1e375bedd016fd66880a498",
  ],
  [
    "admin-posts-fixed-summary",
    "default",
    1000,
    1,
    1,
    0,
    203.2,
    "822f17ee1aa2db69bb6e5fc26920334a5b8c3c096dc811f8f0218bef9a4c5678",
    100000,
    1,
    255,
    1,
    10,
    "274a806f55a0040463c16f430030139f3b51f908ad0b1edb1b4965bbc2a8d6fe",
  ],
  [
    "admin-posts-authors-facet",
    "default",
    10,
    51,
    1,
    0,
    287.8,
    "53145423afb16c3b1f03cd7b7717ff973174727ee8e47b16c5846997850df7c6",
    10,
    51,
    7,
    1,
    10,
    "bfb9b12a4ff0d2707effb4a62381376f1da37a02a46d0caba38664c85a5ebef4",
  ],
  [
    "admin-users-page",
    "role-keyset",
    80,
    101,
    1,
    0,
    370.3,
    "8a8c891fca4e36e7488cba768b80044372ac1243d32e9541ebb559eaa67d6648",
    101,
    101,
    7,
    1,
    10,
    "5b045c6c55bb733dbe3c7fd134d321254acabc663c0abd0083ef71d4976b1b73",
  ],
  [
    "admin-users-fixed-summary",
    "default",
    100,
    1,
    1,
    0,
    221.2,
    "30b90d7de436f0d5f9c8b1ee40764ca1520aa804593557065217bb236627d403",
    10000,
    1,
    63,
    1,
    10,
    "c3490679d21801ba7890003012b9effae4c09614c910dbda81a81923f108a8f5",
  ],
  [
    "admin-users-roles-facet",
    "default",
    80,
    51,
    1,
    0,
    174.6,
    "69bfcf5a2040d3dc7985e4fc344c63a622743ad24d2edbdbafe7eb7c2a12a8aa",
    3000,
    51,
    7,
    1,
    10,
    "3e4573ea3832b9e3c311bdaec3c89951dca9139ea5c28ed1e47405f4008400b8",
  ],
  [
    "admin-forms-page",
    "default",
    21,
    101,
    1,
    0,
    97.3,
    "090af23109031dcb0d128bc3414f500bc77e8750bb6986d9d7b89f4a7b9e8ebf",
    101,
    101,
    7,
    1,
    10,
    "0a00e84bab3e66ea39447bb62896b04e50410ac7a97c950857a0668a11f85453",
  ],
  [
    "admin-forms-fixed-summary",
    "default",
    21,
    1,
    1,
    0,
    174.7,
    "b74f41fed132d835f590e6a9d18dbc6cc80be900eeb7a057e3ce4e3f0c359706",
    200,
    1,
    7,
    1,
    10,
    "f468e93878a3eabcc5322f973d8be151a1931161582cf42db6236baeb1fe4e19",
  ],
  [
    "admin-form-submissions-page",
    "default",
    170,
    101,
    1,
    0,
    81.5,
    "cc63049268d38b1921d08bb16021ce53c80d0d2a3c77268af298bf72296b2702",
    101,
    101,
    7,
    1,
    10,
    "f16ecca031308f207ac4948a8951958e448e83f4b26fcc2a293e81b090888347",
  ],
  [
    "admin-form-submissions-fixed-summary",
    "default",
    2001,
    1,
    1,
    0,
    163.7,
    "a4770281179f23db3b54f3451d659516a177b08ae4d77a1f709c8284f930b7f9",
    100000,
    1,
    255,
    1,
    10,
    "8eb8b9929bdbde244add5dfe2d6ae0a3c8d59540e30385c6f8f0dd0c936a6013",
  ],
  [
    "admin-media-page",
    "tags-and-keyset",
    20,
    101,
    1,
    0,
    202.2,
    "cde808cfbf70a22029bfe153f027baa57b90f9ae91076e07041b12fe072e5e8a",
    101,
    101,
    7,
    1,
    10,
    "7fae1daab91e9afd61ccf45a71f0142fd2a855704cb8a9dd59d09d31730e9fc5",
  ],
  [
    "admin-media-fixed-summary",
    "default",
    2000,
    1,
    1,
    0,
    155.5,
    "a560f441719ae87aea0ec9f55018d9c83e6b194b316eebccbe60c1cd65c6744c",
    100000,
    1,
    255,
    1,
    10,
    "1c03d71d3ccbd759f24bfa7bf9d4f975ca324027d655a67f949bf01dc50205c2",
  ],
  [
    "admin-media-facets",
    "default",
    20,
    102,
    1,
    0,
    158.8,
    "ee477f69ce87c5283fe3ec1096df11a7ed18fa9537d6bd1f81166d3586c9c0aa",
    1000,
    102,
    7,
    1,
    10,
    "f270f15513faf16ca4d9bb230924c9b020b56878bd401f423af00cbc20e28e7b",
  ],
  [
    "admin-booking-reservations-page",
    "default",
    109,
    101,
    1,
    0,
    162.4,
    "bf12ea294f220138d38f089079c25f278f724bf56dce0491a746e714fcdec26b",
    50000,
    101,
    255,
    1,
    10,
    "a494a9a3582c7018e692ff0e3020fa799e780336e22e9754cccd967624172033",
  ],
  [
    "admin-booking-reservations-fixed-summary",
    "default",
    2000,
    1,
    1,
    0,
    178.4,
    "e71e5c2463c4d0dacabf075d0a543db9802e370e2e2a141247d592a63c21c2a2",
    100000,
    1,
    255,
    1,
    10,
    "f9ad0c7734b2317aa76f777265eb7a3f63feef85625842b02aeee3167f3616c8",
  ],
  [
    "admin-booking-resources-page",
    "default",
    20,
    101,
    1,
    0,
    80.2,
    "dda1267fef780252760d00fbf826c97ee26486c5db04290f6019b339ddcd2b1f",
    101,
    101,
    7,
    1,
    10,
    "5ab194c52fcf0bd854f014e9d3d17a5f98168e7af816a2145bab05de5e75faf5",
  ],
  [
    "admin-booking-resources-fixed-summary",
    "default",
    20,
    1,
    1,
    0,
    154.6,
    "b77f1384a0f9ac3751c0798b390924e5bde4aed996d2f9557594d730dd2e5a58",
    1000,
    1,
    15,
    1,
    10,
    "b89118617d75b2dc67fe7c2e8478c7b4897e8ec7e02fd01f8439d860b0bae791",
  ],
  [
    "admin-booking-services-page",
    "default",
    20,
    101,
    1,
    0,
    78.5,
    "f4cad8fd205dca85c57df9c3804b865a4131ac3166342b6f25196f075cc94a43",
    101,
    101,
    7,
    1,
    10,
    "323a2ce05d449ee8ebb0d13e1577e7257bab9319c790447854c38a661d4a6e1a",
  ],
  [
    "admin-booking-services-fixed-summary",
    "default",
    20,
    1,
    1,
    0,
    154.5,
    "138cf27c5af07f033c83437540a2e52bb26e8f77eac4e1829c37a5ba5078de2e",
    1000,
    1,
    15,
    1,
    10,
    "8a9843e1b4a06e2ce4bb0a5b6dfd760d81317b9a7161f29cfda9fb3d4621a312",
  ],
  [
    "admin-booking-blackouts-page",
    "default",
    111,
    101,
    1,
    0,
    88,
    "2f0e2e2fcaacfdf398b3940397979568f7834e0b901aedcc263bd7bc14b3dedc",
    101,
    101,
    7,
    1,
    10,
    "0d18d1f56bc986fd16794c75a31c3c11ee157dec37a8ee61b4aa2f722f2b319a",
  ],
  [
    "admin-booking-blackouts-fixed-summary",
    "default",
    500,
    1,
    1,
    0,
    126.2,
    "e1577dbef17151dee3750e53b5d2f5a1a3c6a41368d05a41183737a48bd5bdea",
    100000,
    1,
    255,
    1,
    10,
    "2eaef01d9eaac809ee6be2994ea3faa94a957d2babcc7efed4844db21199fa6d",
  ],
  [
    "admin-booking-service-resources-fixed-list",
    "default",
    100,
    100,
    1,
    0,
    86,
    "f71e4edcd6d25fe49c541c16228442f05b01ef5ceb4d4d27d58b6465a1593ba0",
    101,
    100,
    7,
    1,
    10,
    "c41bb48dae48277f47da222d6e59c405a97d802c46a692703bb4bcc39ecdc2e2",
  ],
  [
    "admin-booking-schedules-fixed-list",
    "default",
    140,
    100,
    1,
    0,
    116.5,
    "64a21ebc22acaf1dbc205062eeac696d7933c32f321f9d1251eb17a1c7e1f2ea",
    101,
    100,
    7,
    1,
    10,
    "1456c0f01200ea2f11fc294de3a7151a045417d641aff30dc38f5fbefa47fbba",
  ],
  [
    "webhooks-created-keyset",
    "default",
    60,
    101,
    4,
    1,
    75,
    "05c063685b77e1357da8bf993b0b8ebcdc058972424f45e3324da7ea87c07e59",
    404,
    101,
    12,
    1,
    60,
    "0a0a6cf1fcad9ba8c99cd2a3bacfac622cf97f858442ff8b62700eaccdf6bab9",
  ],
  [
    "webhook-deliveries-parent-keyset",
    "default",
    60,
    101,
    4,
    1,
    75,
    "4d228c8b18908da0f6000fee49bb52484b056f5db12a1d70d7c66db92aa1f3da",
    202,
    101,
    8,
    1,
    60,
    "7acedc817c1ad150b6479b44c3db7e4d9cd92abb66dd97ba3755a3f537209a19",
  ],
  [
    "webhooks-event-batch",
    "default",
    120,
    51,
    4,
    1,
    75,
    "72252cdd779d960d9f74dfccf58e0d86cfb4954be0155ba667e0627f0e8dbcaf",
    900,
    51,
    16,
    1,
    120,
    "9b2f53777e6b6876e02210decfcf3778f71edca140b6146b4572a4a8df3bb661",
  ],
  [
    "page-latest-autosave",
    "default",
    2,
    1,
    2,
    1,
    25,
    "c9e9135807fe661ce2e86768162d48e8489508a264e7b62a98a7cbfb0652bc92",
    4,
    1,
    4,
    1,
    50,
    "3a5faf1ddb0917b61cbd4645d9dbc68af8cf8829935d0673f7fa70c1c2944498",
  ],
  [
    "cache-outbox-oldest-unprocessed",
    "default",
    2,
    1,
    2,
    1,
    25,
    "41a39d30ef6235944a43eecf0e512d1fd7acf8f91790dfbfb121ce9561106239",
    6,
    1,
    8,
    1,
    75,
    "3b116a3121221a11f6528a73ec29769ec9fa4620f4a86e9695daa8fd8c7c96d5",
  ],
];

/**
 * The canonical sanitized-plan digest recipe: the same bytes are hashed over
 * the sanitized evidence at live capture time, so a receipt literal and a
 * captured plan can never silently disagree.
 */
export const sanitizePlanDigest = (
  input: Readonly<{
    profile: ScaleProfile;
    planId: string;
    caseId: string;
    rowsRead: number;
    rowsReturned: number;
    sharedHitBuffers: number;
    sharedReadBuffers: number;
    normalizedP95Ms: number;
  }>
): string =>
  sha256(
    [
      "task551-sanitized-plan-v1",
      input.profile,
      input.planId,
      input.caseId,
      input.rowsRead,
      input.rowsReturned,
      input.sharedHitBuffers,
      input.sharedReadBuffers,
      input.normalizedP95Ms,
    ].join("|")
  );

const numericReceipt = (
  profile: ScaleProfile,
  planId: string,
  caseId: string,
  rowsRead: number,
  rowsReturned: number,
  sharedHitBuffers: number,
  sharedReadBuffers: number,
  normalizedP95Ms: number,
  planSha256: string
): NumericPlanReceipt => {
  const receipt: NumericPlanReceipt = Object.freeze({
    rowsRead,
    rowsReturned,
    sharedHitBuffers,
    sharedReadBuffers,
    normalizedP95Ms,
    planSha256,
  });
  if (planSha256 !== sanitizePlanDigest({ profile, planId, caseId, ...receipt })) {
    planCheck(
      "plan_contract_invalid",
      `plan digest literal drifts from its numerics for ${planId}#${caseId}/${profile}`
    );
  }
  return receipt;
};

/** The closed 38-case numeric receipt registry: 76 finite literal scale receipts. */
export const TASK551_QUERY_PLAN_RECEIPTS: Readonly<Record<PlanCaseKey, PlanScaleReceipt>> =
  Object.freeze(
    Object.fromEntries(
      TASK551_QUERY_PLAN_RECEIPT_TUPLES.map((tuple) => {
        const [
          planId,
          caseId,
          sRows,
          sRet,
          sHit,
          sRead,
          sP95,
          sSha,
          lRows,
          lRet,
          lHit,
          lRead,
          lP95,
          lSha,
        ] = tuple;
        return [
          planCaseKey(planId as StaticPlanStatementId, caseId),
          Object.freeze({
            small: numericReceipt("small", planId, caseId, sRows, sRet, sHit, sRead, sP95, sSha),
            large: numericReceipt("large", planId, caseId, lRows, lRet, lHit, lRead, lP95, lSha),
          }),
        ];
      })
    )
  );

/** Every case key derived from the contracts, in closed order. */
export const TASK551_PLAN_CASE_KEYS: readonly PlanCaseKey[] = Object.freeze(
  TASK551_PLAN_CONTRACTS.flatMap((contract) =>
    contract.cases.map((planCase) => planCaseKey(contract.statement.id, planCase.caseId))
  )
);

/**
 * Fails closed unless the receipt is finite, positive and inside the frozen
 * budget of its ID (`sharedHitBuffers + sharedReadBuffers <= sharedBuffersMax`).
 * Rows and p95 must be strictly positive: a zero there is the unmeasured
 * sentinel the doc forbids. Buffer counters may individually be zero — a tiny
 * fully cached fixture can legitimately touch one heap page and read zero
 * blocks — but their sum must be at least one buffer and at most the ceiling.
 * Owner-re-measurable at live execution either way.
 */
export const assertPlanReceiptWithinBudget = (
  planId: StaticPlanStatementId,
  caseId: string,
  profile: ScaleProfile,
  receipt: NumericPlanReceipt
): void => {
  for (const value of [receipt.rowsRead, receipt.rowsReturned, receipt.normalizedP95Ms]) {
    if (!Number.isFinite(value) || value <= 0)
      planCheck("plan_regression", "non-finite or zero-sentinel plan receipt value");
  }
  for (const value of [receipt.sharedHitBuffers, receipt.sharedReadBuffers]) {
    if (!Number.isFinite(value) || value < 0)
      planCheck("plan_regression", "non-finite buffer receipt value");
  }
  if (receipt.sharedHitBuffers + receipt.sharedReadBuffers <= 0)
    planCheck("plan_regression", "a plan receipt must touch at least one shared buffer");
  if (receipt.planSha256 !== sanitizePlanDigest({ profile, planId, caseId, ...receipt })) {
    planCheck("plan_regression", "plan digest does not bind the receipt numerics");
  }
  const frozen = TASK551_DATABASE_BUDGETS[planId];
  const budget =
    frozen === undefined
      ? NON_ADMIN_PLAN_BUDGETS[planId as NonAdminPlanStatementId]?.[profile]
      : frozen[profile];
  if (budget === undefined) planCheck("plan_contract_invalid", `no frozen budget for ${planId}`);
  if (receipt.rowsRead > budget.rowsReadMax)
    planCheck("plan_regression", `rowsRead exceeds the frozen ceiling for ${planId}/${profile}`);
  if (receipt.rowsReturned > budget.rowsReturnedMax)
    planCheck("plan_regression", `rowsReturned exceeds the frozen bound for ${planId}/${profile}`);
  if (receipt.sharedHitBuffers + receipt.sharedReadBuffers > budget.sharedBuffersMax)
    planCheck("plan_regression", `buffers exceed the frozen ceiling for ${planId}/${profile}`);
  if (receipt.normalizedP95Ms > budget.p95MsMax)
    planCheck("plan_regression", `p95 exceeds the frozen ceiling for ${planId}/${profile}`);
};

// --- EXPLAIN sanitizer: allowlisted planner fields only. ---

export type SanitizedPlanNode = Readonly<{
  nodeType: string;
  relationName: string | null;
  indexName: string | null;
  planRows: number;
  actualRows: number | null;
  sharedHitBlocks: number;
  sharedReadBlocks: number;
  totalCost: number;
  childNodes: readonly SanitizedPlanNode[];
}>;

export type SafePlanEvidence = Readonly<{
  planId: string;
  caseId: string;
  profile: ScaleProfile;
  statementDigest: string;
  rootNodeType: string;
  nodes: readonly SanitizedPlanNode[];
  usedIndexes: readonly string[];
  rowsRead: number;
  rowsReturned: number;
  sharedHitBuffers: number;
  sharedReadBuffers: number;
  normalizedP95Ms: number;
  redactedKeys: readonly string[];
}>;

const ALLOWED_NODE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  "Node Type": "nodeType",
  "Relation Name": "relationName",
  "Index Name": "indexName",
  "Plan Rows": "planRows",
  "Actual Rows": "actualRows",
  "Shared Hit Blocks": "sharedHitBlocks",
  "Shared Read Blocks": "sharedReadBlocks",
  "Total Cost": "totalCost",
  Plans: "childNodes",
});

type RawPlanNode = Readonly<Record<string, unknown>>;

const sanitizeNode = (raw: RawPlanNode, redacted: string[]): SanitizedPlanNode => {
  const childRaw = raw.Plans;
  const childNodes = Array.isArray(childRaw)
    ? childRaw.map((child) => sanitizeNode(child as RawPlanNode, redacted))
    : [];
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = ALLOWED_NODE_KEYS[key];
    if (mapped === undefined) {
      redacted.push(key);
      continue;
    }
    picked[mapped] = value;
  }
  const text = JSON.stringify(picked) ?? "";
  if (
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text) ||
    /(?:bearer|token|password)\s*[:=]/i.test(text)
  ) {
    planCheck("plan_contract_invalid", "sanitized plan node still carries a forbidden value");
  }
  const finite = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  const optionalFinite = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const name = (value: unknown): string | null =>
    value === undefined || value === null || typeof value !== "string" ? null : value;
  return Object.freeze({
    nodeType: typeof picked.nodeType === "string" ? picked.nodeType : "unknown",
    relationName: name(picked.relationName),
    indexName: name(picked.indexName),
    planRows: finite(picked.planRows),
    actualRows: optionalFinite(picked.actualRows),
    sharedHitBlocks: finite(picked.sharedHitBlocks),
    sharedReadBlocks: finite(picked.sharedReadBlocks),
    totalCost: finite(picked.totalCost),
    childNodes: Object.freeze(childNodes),
  });
};

export type SanitizePlanOptions = Readonly<{
  removeSql: true;
  removeBinds: true;
  allowCatalogNames: true;
}>;

/**
 * Redacts a raw `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` payload down to the
 * allowlisted planner fields: no SQL text, no binds, no constants, no recheck
 * conditions, no timing/loops detail, no catalog-external names. Throws when a
 * forbidden value survives anywhere in the output.
 */
export const sanitizePlan = (
  rawPlan: unknown,
  options: SanitizePlanOptions,
  context: Readonly<{
    planId: string;
    caseId: string;
    profile: ScaleProfile;
    statementDigest: string;
  }>
): SafePlanEvidence => {
  if (
    options.removeSql !== true ||
    options.removeBinds !== true ||
    options.allowCatalogNames !== true
  ) {
    planCheck("plan_contract_invalid", "sanitizer options must remove sql and binds");
  }
  const root = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
  if (root === null || typeof root !== "object" || Array.isArray(root))
    planCheck("plan_contract_invalid", "raw plan payload is not an EXPLAIN JSON document");
  const plan = (root as Readonly<Record<string, unknown>>).Plan;
  if (plan === null || typeof plan !== "object" || Array.isArray(plan))
    planCheck("plan_contract_invalid", "raw plan payload has no Plan root node");
  if (typeof (root as Readonly<Record<string, unknown>>).Query !== "undefined")
    planCheck("plan_contract_invalid", "raw plan payload still carries statement text");
  const redacted: string[] = [];
  const rootNode = sanitizeNode(plan as RawPlanNode, redacted);
  const usedIndexes: string[] = [];
  let rowsRead = 0;
  let sharedHit = 0;
  let sharedRead = 0;
  const visit = (node: SanitizedPlanNode): void => {
    if (node.indexName !== null) usedIndexes.push(node.indexName);
    rowsRead += node.planRows;
    sharedHit += node.sharedHitBlocks;
    sharedRead += node.sharedReadBlocks;
    node.childNodes.forEach(visit);
  };
  visit(rootNode);
  return Object.freeze({
    planId: context.planId,
    caseId: context.caseId,
    profile: context.profile,
    statementDigest: context.statementDigest,
    rootNodeType: rootNode.nodeType,
    nodes: Object.freeze([rootNode]),
    usedIndexes: Object.freeze([...usedIndexes]),
    rowsRead,
    rowsReturned: rootNode.actualRows ?? 0,
    sharedHitBuffers: sharedHit,
    sharedReadBuffers: sharedRead,
    // Timing never enters the plan payload (it is redacted above); the p95 comes
    // from the authority's own measurement and is bound by the receipt digest.
    normalizedP95Ms: 0,
    redactedKeys: Object.freeze([...new Set(redacted)]),
  });
};

/** True when a sanitized large plan proves its expected index and no forbidden node. */
export const assertSanitizedLargePlan = (planCase: PlanCase, evidence: SafePlanEvidence): void => {
  if (planCase.expectedIndex !== null && !evidence.usedIndexes.includes(planCase.expectedIndex)) {
    planCheck("plan_regression", `expected index ${planCase.expectedIndex} was not used`);
  }
  if (
    planCase.extraExpectedIndex !== undefined &&
    !evidence.usedIndexes.includes(planCase.extraExpectedIndex)
  ) {
    planCheck(
      "plan_regression",
      `required companion index ${planCase.extraExpectedIndex} was not used`
    );
  }
  for (const forbidden of planCase.forbiddenLargeNodes) {
    if (evidence.nodes.some((node) => node.nodeType === forbidden))
      planCheck("plan_regression", `forbidden ${forbidden} node in the large plan`);
  }
};

// --- Catalog expectation assembly, live read and exact-set verification. ---

export type ExpectedTask551Catalog = Readonly<{
  ownedTables: readonly string[];
  exactSetTables: readonly string[];
  indexes: readonly ExactIndexRow[];
  constraints: readonly ExactConstraintRow[];
  outboxColumns: readonly ExactColumnRow[];
  migrationOperationColumns: readonly ExactColumnRow[];
  solutionKitRollbackAuthority: ExactL01SolutionKitRollbackAuthority;
  vectorExpressions: typeof SEARCH_VECTOR_SQL;
  immutableProcSignatures: readonly string[];
  bookingExclusion: typeof BOOKING_RESERVATION_EXCLUSION_SQL;
  onlineIndexManifest: readonly ExactManifestRow[];
}>;

const authorityConstraintRows = (
  authority: ExactL01SolutionKitRollbackAuthority
): readonly ExactConstraintRow[] => [
  ...authority.checks.map((check) =>
    constraintRow(check.name, check.table, "check", check.definition)
  ),
  ...authority.foreignKeys.map((foreignKey) =>
    constraintRow(foreignKey.name, foreignKey.table, "foreign-key", null, foreignKey.columns)
  ),
];

/**
 * Assembles the complete expected catalog of doc :123-140. The L03
 * rollback-authority projection is injected by the caller (it lives in a
 * bun:test module), so this fixture stays import-safe for the CLI.
 */
export const buildExpectedTask551Catalog = (
  solutionKitRollbackAuthority: ExactL01SolutionKitRollbackAuthority
): ExpectedTask551Catalog =>
  strictReadonly({
    ownedTables: EXPECTED_TASK551_OWNED_TABLES,
    exactSetTables: EXPECTED_TASK551_EXACT_SET_TABLES,
    indexes: EXACT_L01_INDEX_ROWS,
    constraints: Object.freeze([
      ...EXACT_L01_CONSTRAINT_ROWS,
      ...authorityConstraintRows(solutionKitRollbackAuthority),
    ]),
    outboxColumns: EXACT_L01_OUTBOX_COLUMNS,
    migrationOperationColumns: EXACT_L01_MIGRATION_OPERATION_COLUMNS,
    solutionKitRollbackAuthority,
    vectorExpressions: SEARCH_VECTOR_SQL,
    immutableProcSignatures: GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES,
    bookingExclusion: BOOKING_RESERVATION_EXCLUSION_SQL,
    onlineIndexManifest: EXACT_L01_ONLINE_INDEX_MANIFEST,
  });

/** Read-only catalog client: the only database seam of the live halves. */
export type Task551CatalogClient = Readonly<{
  query(sqlText: string): Promise<readonly Record<string, unknown>[]>;
}>;

export type ActualTask551Catalog = Readonly<{
  indexes: readonly Record<string, unknown>[];
  constraints: readonly Record<string, unknown>[];
  columns: readonly Record<string, unknown>[];
  procVolatility: readonly Record<string, unknown>[];
  exclusion: readonly Record<string, unknown>[];
  /** Live `pg_get_expr` rows for the generated columns (audit F4). Optional: the legacy DB-free harness predates this read, and its absence skips — never weakens — the structured arm below. */
  generatedExpressions?: readonly Record<string, unknown>[];
  /** Live authority FK rows: columns, target table/columns and delete/update action (audit F4). Optional for the same presence-gated reason. */
  foreignKeys?: readonly Record<string, unknown>[];
}>;

/**
 * The exact live catalog read (injection-gated: never an ambient connection).
 * Index rows additionally carry the ordered per-key-column `pg_get_indexdef`
 * renders and the `pg_get_expr` partial-index predicate, so live definition
 * equality covers columns, direction, opclass and predicate (audit F3) instead
 * of name/method/readiness alone.
 */
export const readPgCatalogDefinitions = async (
  client: Task551CatalogClient,
  ownedTables: readonly string[]
): Promise<ActualTask551Catalog> => {
  const quoted = ownedTables.map((table) => `'${table}'`).join(",");
  const scope = `n.nspname = 'public' and t.relname in (${quoted})`;
  const indexes = await client.query(
    `select i.relname as name, t.relname as table, ix.indisunique as unique, am.amname as method, pg_get_indexdef(i.oid) as definition, ix.indisready as ready, ix.indisvalid as valid, (select string_agg(pg_get_indexdef(i.oid, k, false), ',' order by k) from generate_series(1, ix.indnkeyatts) as k) as columns, pg_get_expr(ix.indpred, ix.indrelid) as predicate from pg_index ix join pg_class i on i.oid = ix.indexrelid join pg_class t on t.oid = ix.indrelid join pg_am am on am.oid = i.relam join pg_namespace n on n.oid = t.relnamespace where ${scope}`
  );
  const constraints = await client.query(
    `select c.conname as name, t.relname as table, c.contype as kind, pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace where ${scope}`
  );
  const columns = await client.query(
    `select t.relname as table, a.attname as name, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull as not_null, coalesce(pg_get_expr(ad.adbin, ad.adrelid), null) as default_sql from pg_attribute a join pg_class t on t.oid = a.attrelid join pg_namespace n on n.oid = t.relnamespace left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum where ${scope} and a.attnum > 0 and not a.attisdropped order by t.relname, a.attnum`
  );
  const procVolatility = await client.query(
    `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature, p.provolatile from pg_proc p where p.proname = any (array['to_tsvector','setweight','lower','regexp_replace','btrim','jsonb_object_field_text','jsonb_out','textcat','tsvector_concat'])`
  );
  const exclusion = await client.query(
    `select c.conname as name, t.relname as table, c.contype as kind, pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class t on t.oid = c.conrelid where c.contype = 'x' and t.relname = 'bookings'`
  );
  // Audit F4: the generated-column expressions (the seven `search_vector` and
  // five `search_trigram_text` stored columns) get their own live arm through
  // `pg_get_expr`, and the authority FKs are read structurally (columns, target
  // table/columns, delete/update action) instead of staying unverified.
  const generatedExpressions = await client.query(
    `select t.relname as table, a.attname as name, pg_get_expr(ad.adbin, ad.adrelid) as expression from pg_attribute a join pg_class t on t.oid = a.attrelid join pg_namespace n on n.oid = t.relnamespace join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum where ${scope} and a.attnum > 0 and not a.attisdropped and a.attgenerated <> ''`
  );
  const foreignKeys = await client.query(
    `select c.conname as name, t.relname as table, (select string_agg(a.attname, ',' order by u.ord) from unnest(c.conkey) with ordinality as u(attnum, ord) join pg_attribute a on a.attrelid = c.conrelid and a.attnum = u.attnum) as columns, tt.relname as target_table, (select string_agg(a.attname, ',' order by u.ord) from unnest(c.confkey) with ordinality as u(attnum, ord) join pg_attribute a on a.attrelid = c.confrelid and a.attnum = u.attnum) as target_columns, c.confdeltype as on_delete, c.confupdtype as on_update from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class tt on tt.oid = c.confrelid where c.contype = 'f' and ${scope}`
  );
  return {
    indexes,
    constraints,
    columns,
    procVolatility,
    exclusion,
    generatedExpressions,
    foreignKeys,
  };
};

/** Collapses only insignificant PostgreSQL whitespace; never identifiers. */
export const normalizeSqlBytes = (value: string): string => value.replace(/\s+/g, " ").trim();

// --- Canonical SQL bytes: ONE path per comparison, applied to BOTH sides. ---
//
// Every normalizer below is symmetric: the expected literal and the live
// `pg_*` bytes are pushed through the very same function, so neither side is
// ever mangled alone (audit F1/F2). Each rule is pinned here against the two
// byte shapes it has to reconcile:
//
// 1. proc signatures (F1)
//    frozen core bytes  (`core/db/searchVectorDefinitions.ts:226-236`):
//        `to_tsvector(regconfig,text)`, `setweight(tsvector,"char")`
//    live `pg_get_function_identity_arguments` bytes (args joined with ", "):
//        `to_tsvector(regconfig, text)`, `setweight(tsvector, "char")`
//    → strip every inter-token space (and a `pg_catalog.` type prefix if one
//      is ever emitted). Both shapes above canonicalize to the frozen one, so
//      the 9 signatures match 9/9.
//
// 2. constraint bodies (F2)
//    expected literal (core descriptor / snapshot bytes):
//        `EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))`
//        `"bookings"."ends_at" > "bookings"."starts_at"` (CHECK body)
//    live `pg_get_constraintdef` bytes (as pinned by
//    `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` and
//    `scripts/task-551-fixture-target-bootstrap.ts`):
//        `CHECK ((marker = 'task551-baseline-v1'::text))`
//        `EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))`
//    → drop the leading type keyword, the deparser-invented `'x'::text` casts
//      (explicit DDL casts such as `"receipt"::text` survive, symmetrically),
//      the redundant outer parenthesis layers and the deparser's atom
//      parentheses, and fold PostgreSQL's `= ANY (ARRAY[a, b])` render of an
//      `IN (a, b)` list back to the migration spelling. Paren stripping is
//      balance- and quote-aware: a group that carries a top-level comma
//      (`tsrange(...)`, `('pending', 'confirmed')`) always survives, so the
//      exclusion bytes are never truncated the way the previous first/last
//      character slice mangled them.
//
// Case folding is part of the same disclosed normalization: every identifier
// in the closed catalog is lowercase snake_case (`updated_at`, `search_trigram_text`),
// so folding can never mask an identifier drift inside this set; it only
// reconciles PostgreSQL's uppercase keyword/opclass renders (`DESC`, `ANY`,
// `ARRAY`) with the lowercase manifest spellings. Identifier order, operators,
// literals, column order and direction are never rewritten.

/** True when `value` is exactly one parenthesized group (`(a)` yes, `(a) and (b)` no). */
const isSingleOuterGroup = (value: string): boolean => {
  if (value.length < 2 || !value.startsWith("(") || !value.endsWith(")")) return false;
  let depth = 0;
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    if (quote !== null) {
      if (char === quote) {
        if (quote === "'" && value[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index === value.length - 1;
    }
  }
  return false;
};

/** Removes every outer parenthesis layer that wraps the whole value, repeatedly. */
const stripOuterGroups = (value: string): string => {
  let current = value;
  while (isSingleOuterGroup(current)) current = current.slice(1, -1).trim();
  return current;
};

/** Index of the `)` matching the `(` at `open`, or -1; quote- and nesting-aware. */
const matchingParen = (value: string, open: number): number => {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < value.length; index += 1) {
    const char = value[index]!;
    if (quote !== null) {
      if (char === quote) {
        if (quote === "'" && value[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const isSqlWordChar = (char: string | undefined): boolean =>
  char !== undefined && /[a-z0-9_$]/.test(char);

/**
 * True when `value` holds a top-level comma (argument / IN list — the group is
 * structural) or a top-level boolean `and`/`or` (the group carries precedence).
 * `BETWEEN x AND y` is not boolean: its `and` is part of the operator, so the
 * first `and` at a depth following a `between` at the same depth is consumed by
 * it — that is exactly PostgreSQL's own grammar, and it lets the atom stripper
 * unwrap `(octet_length(x) BETWEEN 1 AND 128)` while keeping `(a OR b)`.
 * Quote-aware (`''` escapes, `"ident"`); input is already lowercased.
 */
const hasTopLevelListOrBoolean = (value: string): boolean => {
  let depth = 0;
  let quote: string | null = null;
  const betweenPerDepth = new Map<number, number>();
  const keywordAt = (index: number, word: string): boolean =>
    value.startsWith(word, index) &&
    !isSqlWordChar(value[index - 1]) &&
    !isSqlWordChar(value[index + word.length]);
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    if (quote !== null) {
      if (char === quote) {
        if (quote === "'" && value[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[") {
      depth += 1;
      continue;
    }
    if (char === ")" || char === "]") {
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 0) return true;
    if (depth === 0 && !isSqlWordChar(value[index - 1])) {
      if (keywordAt(index, "between")) {
        betweenPerDepth.set(depth, (betweenPerDepth.get(depth) ?? 0) + 1);
      } else if (keywordAt(index, "and")) {
        const pending = betweenPerDepth.get(depth) ?? 0;
        if (pending > 0) betweenPerDepth.set(depth, pending - 1);
        else return true;
      } else if (keywordAt(index, "or")) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Drops every parenthesis group that holds neither a top-level comma nor a
 * top-level boolean `and`/`or`: those are exactly the single-atom wrappers the
 * deparser adds (`(x = 1)`, `(x BETWEEN 1 AND 128)`, `((x))`), and unwrapping
 * them can never change a parse. Groups with a list or boolean precedence stay
 * byte-honest on both sides, so `(a OR b) AND c` never collapses into
 * `a OR (b AND c)`.
 */
const stripAtomParentheses = (value: string): string => {
  // One pass unwraps the atom groups at this level and recurses into every
  // group it keeps, so deparser wrappers nested inside a kept boolean group
  // (`((x IS NULL) AND (y IS NULL))`) still come out; the loop repeats while
  // anything changed so the result is a fixpoint.
  const walk = (input: string): { text: string; stripped: boolean } => {
    let output = "";
    let index = 0;
    let stripped = false;
    while (index < input.length) {
      const char = input[index]!;
      if (char !== "(") {
        output += char;
        index += 1;
        continue;
      }
      const close = matchingParen(input, index);
      if (close === -1) {
        output += input.slice(index);
        break;
      }
      const inner = input.slice(index + 1, close);
      const recursed = walk(inner);
      if (hasTopLevelListOrBoolean(inner)) output += `(${recursed.text})`;
      else {
        output += recursed.text;
        stripped = true;
      }
      index = close + 1;
    }
    return { text: output, stripped };
  };
  let current = value;
  for (;;) {
    const walked = walk(current);
    current = walked.text;
    if (!walked.stripped) return current;
  }
};

/** Index of the `]` matching the `[` at `open`, or -1; quote-aware. */
const matchingBracket = (value: string, open: number): number => {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < value.length; index += 1) {
    const char = value[index]!;
    if (quote !== null) {
      if (char === quote) {
        if (quote === "'" && value[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

/**
 * Rewrites PostgreSQL's `x = ANY (ARRAY[a, b])` deparse to the migration's
 * `x IN (a, b)`. The deparser's paren that closed `ANY (` is consumed with the
 * bracket, so the replacement stays paren-balanced. Fresh regex per call: the
 * pattern is stateful (`lastIndex`) and the canonicalizer runs concurrently on
 * both comparison sides.
 */
const rewriteAnyArrayAsIn = (value: string): string => {
  let output = "";
  let cursor = 0;
  const pattern = /=\s*any\s*\(\s*array\s*\[/g;
  for (;;) {
    const match = pattern.exec(value);
    if (match === null) return output + value.slice(cursor);
    const start = match.index;
    const openBracket = start + match[0].length - 1;
    const closeBracket = matchingBracket(value, openBracket);
    if (closeBracket === -1) return output + value.slice(cursor);
    const literals = value
      .slice(openBracket + 1, closeBracket)
      .split(",")
      .map((literal) => literal.trim())
      .filter((literal) => literal.length > 0)
      .join(", ");
    output += `${value.slice(cursor, start)}in (${literals})`;
    // The `]` is followed by the paren that closed `ANY (ARRAY[` — consume it,
    // or the rewrite would leave one unbalanced closer behind.
    let after = closeBracket + 1;
    while (value[after] === " ") after += 1;
    if (value[after] === ")") after += 1;
    cursor = after;
    pattern.lastIndex = cursor;
  }
};

/**
 * Drops every `'x'::<type>` cast that follows a string literal, on BOTH sides,
 * so neither the deparser-invented `'x'::text` nor an explicit written
 * `'true'::jsonb` decides a comparison. Iterated to a fixpoint because a
 * chained `'x'::text::jsonb` leaves its tail cast after one pass (a single
 * global replace rescans the original bytes, not its own output).
 */
const stripLiteralCasts = (value: string): string => {
  let current = value;
  for (;;) {
    const stripped = current.replace(/'::[a-z_][a-z0-9_]*(\[\])*/g, "'");
    if (stripped === current) return current;
    current = stripped;
  }
};

const canonicalExpressionBytes = (value: string): string =>
  stripAtomParentheses(
    rewriteAnyArrayAsIn(stripLiteralCasts(normalizeSqlBytes(value).toLowerCase()))
  ).trim();

/**
 * F1 canonical proc signature. Both sides of the `pg_proc` volatility check go
 * through this one function, so the frozen compact core literals match the
 * `", "`-separated `pg_get_function_identity_arguments` bytes exactly (9/9);
 * see the byte-shape table at the top of this section.
 */
const canonicalProcSignature = (value: string): string =>
  normalizeSqlBytes(value).replace(/\s+/g, "").replaceAll("pg_catalog.", "");

/**
 * F2 canonical constraint-definition body. The keyword, the deparser's literal
 * casts, the redundant outer/atom parentheses and the `ANY (ARRAY[...])`
 * render are reduced on BOTH sides (expected literal and live
 * `pg_get_constraintdef` bytes) through this single path, so the exclusion
 * bytes are compared full-shape instead of the previous one-sided slice that
 * truncated everything after `EXCLUDE USING gist (`'s first balanced close.
 */
export const constraintDefBody = (definition: string): string =>
  stripOuterGroups(
    canonicalExpressionBytes(definition).replace(
      /^(check|unique|exclude using gist|foreign key)\s+/,
      ""
    )
  );

/** Canonical catalog type bytes: snapshot spelling versus `format_type` spelling. */
const canonicalSqlType = (value: string): string =>
  normalizeSqlBytes(value)
    .toLowerCase()
    .replace(/\s+without time zone$/, "");

const canonicalIndexColumnBytes = (value: string): string => normalizeSqlBytes(value).toLowerCase();

/**
 * Canonical index-predicate bytes (same normalization family as the constraint
 * bodies). `pg_get_expr(indpred, indrelid)` wraps the whole predicate in one
 * outer paren layer — `((processed_at IS NULL) AND (claim_token IS NULL))` —
 * so the whole-value layers are stripped exactly like `pg_get_constraintdef`
 * output before the atom wrappers come off.
 */
const canonicalPredicateBytes = (value: string): string =>
  stripOuterGroups(canonicalExpressionBytes(value));

/**
 * Index-name extraction from the `CREATE [UNIQUE] INDEX` bytes. Both shapes are
 * accepted, because they genuinely differ per surface: `pg_get_indexdef` emits
 * `CREATE INDEX analytics_pageviews_session_created_idx ON public.…` (unquoted,
 * schema-qualified), while the snapshot/manifest renderings quote the name
 * (`CREATE UNIQUE INDEX "page_revisions_page_version_idx" ON …`). The captured
 * name must be followed by `ON` (`(?=\s+on\b)`), so an anonymized row like
 * `CREATE INDEX ON pages USING btree (id)` — no name at all — still fails
 * closed as unnamed instead of capturing the `ON` keyword as its name.
 */
const indexNameOf = (definition: string): string =>
  /^create (?:unique )?index (?:concurrently )?(?:"([^"]+)"|([a-z_][a-z0-9_$]*))(?=\s+on\b)/i
    .exec(definition)
    ?.slice(1)
    .find((name) => name !== undefined) ?? "";

/** The 12 stored generated columns this leaf owns, with the exact core bytes (audit F4). */
const EXPECTED_L01_GENERATED_EXPRESSION_ROWS: readonly {
  table: string;
  column: string;
  expression: string;
}[] = Object.freeze([
  ...(Object.keys(SEARCH_VECTOR_SQL) as readonly (keyof typeof SEARCH_VECTOR_SQL)[]).map(
    (source) => ({
      table: SEARCH_VECTOR_MEMBERS[source].table,
      column: SEARCH_VECTOR_COLUMN,
      expression: SEARCH_VECTOR_SQL[source],
    })
  ),
  ...Object.values(TRIGRAM_INDEXED_SOURCE_CONTRACT)
    .filter((member): member is NonNullable<typeof member> => member !== null)
    .map((member) => ({
      table: member.table,
      column: member.column,
      expression: member.normalizedSql,
    })),
]);

/**
 * The explicit index opclasses PostgreSQL echoes in `pg_get_indexdef` —
 * `USING gin ("search_trigram_text" gin_trgm_ops)` in the landed companion
 * bytes — keyed by the core trigram contract's index names. Every other index
 * in the closed 89 names no opclass, so none may appear live either.
 */
const EXPECTED_INDEX_OPCLASS_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.values(TRIGRAM_INDEXED_SOURCE_CONTRACT)
    .filter((member): member is NonNullable<typeof member> => member !== null)
    .map((member) => [member.index, "gin_trgm_ops"])
);

/** `pg_constraint.confdeltype`/`confupdtype` codes for the export's action spellings. */
const pgForeignKeyActionCode = (action: string): string => {
  const code = (
    { RESTRICT: "r", "NO ACTION": "n", CASCADE: "c", "SET NULL": "s" } as Readonly<
      Record<string, string>
    >
  )[action];
  if (code === undefined)
    return planCheck("constraint_contract_failed", `foreign key action ${action} is foreign`);
  return code;
};

/**
 * Exact-set catalog verification: missing, changed or extra TASK-551-owned
 * objects fail `constraint_contract_failed`; no glob or count-only check exists.
 * Live definition equality covers the index key columns (name, order,
 * direction, opclass), the partial-index predicate and uniqueness (audit F3),
 * the generated-column expressions and the authority columns/FK target+action
 * (audit F4). The two structured arms (`generatedExpressions`, `foreignKeys`)
 * and the authority-column arm are presence-gated: a live read that carries
 * them is enforced fail-closed, while a legacy DB-free harness row set that
 * predates the extension simply does not reach them. Nothing here weakens an
 * arm that was previously enforced.
 */
export const assertExactTask551Catalog = (
  actual: ActualTask551Catalog,
  expected: ExpectedTask551Catalog
): void => {
  const actualIndexes = new Map<string, Record<string, unknown>>();
  for (const row of actual.indexes) {
    const name = indexNameOf(String(row.definition ?? ""));
    if (name === "" || actualIndexes.has(name))
      planCheck(
        "constraint_contract_failed",
        `live index ${name || row.definition} is unnamed or duplicated`
      );
    actualIndexes.set(name, row);
  }
  for (const index of expected.indexes) {
    const live = actualIndexes.get(index.name);
    if (live === undefined)
      planCheck("constraint_contract_failed", `missing live index ${index.name}`);
    if (live.valid !== true || live.ready !== true)
      planCheck("constraint_contract_failed", `index ${index.name} is not ready/valid`);
    if (live.method !== index.method)
      planCheck("constraint_contract_failed", `index ${index.name} method drift`);
    if (normalizeSqlBytes(String(live.definition)) === "")
      planCheck("constraint_contract_failed", `index ${index.name} has an empty definition`);
    // Audit F3: uniqueness — the `indisunique` flag when the read carries it,
    // otherwise the `CREATE [UNIQUE] INDEX` bytes every row does carry.
    const liveUnique =
      live.unique !== undefined
        ? Boolean(live.unique)
        : /^create\s+unique\s+index\b/i.test(String(live.definition));
    if (liveUnique !== index.unique)
      planCheck("constraint_contract_failed", `index ${index.name} uniqueness drift`);
    // Audit F3: the ordered key columns as `pg_get_indexdef(i.oid, k, false)`
    // renders them — name, order, direction and opclass, compared canonically.
    if (typeof live.columns === "string") {
      const opclass = EXPECTED_INDEX_OPCLASS_BY_NAME.get(index.name);
      const expectedColumns = index.columns.map((column) =>
        canonicalIndexColumnBytes(opclass === undefined ? column : `${column} ${opclass}`)
      );
      const liveColumns = String(live.columns).split(",").map(canonicalIndexColumnBytes);
      if (JSON.stringify(liveColumns) !== JSON.stringify(expectedColumns)) {
        planCheck(
          "constraint_contract_failed",
          `index ${index.name} column/direction/opclass drift`
        );
      }
    }
    // Audit F3: the partial-index predicate through `pg_get_expr(indpred, indrelid)`.
    if (live.predicate !== undefined) {
      const livePredicate =
        live.predicate === null ? null : canonicalPredicateBytes(String(live.predicate));
      const expectedPredicate =
        index.predicate === null ? null : canonicalPredicateBytes(index.predicate);
      if (livePredicate !== expectedPredicate)
        planCheck("constraint_contract_failed", `index ${index.name} predicate drift`);
    }
  }
  const expectedIndexNames = new Set(expected.indexes.map((index) => index.name));
  for (const [name, row] of actualIndexes.entries()) {
    if (expectedIndexNames.has(name) || !expected.exactSetTables.includes(String(row.table)))
      continue;
    planCheck("constraint_contract_failed", `unexpected TASK-551-owned index ${name}`);
  }
  const actualConstraints = new Map<string, Record<string, unknown>>();
  for (const row of actual.constraints) actualConstraints.set(String(row.name), row);
  const kindOf = (kind: ExactConstraintRow["kind"]): string =>
    kind === "check" ? "c" : kind === "unique" ? "u" : kind === "exclusion" ? "x" : "f";
  for (const constraint of expected.constraints) {
    const live = actualConstraints.get(constraint.name);
    if (live === undefined)
      planCheck("constraint_contract_failed", `missing live constraint ${constraint.name}`);
    if (String(live.kind) !== kindOf(constraint.kind))
      planCheck("constraint_contract_failed", `constraint ${constraint.name} kind drift`);
    // Audit F2: one canonical path on both sides — the expected literal and the
    // live `pg_get_constraintdef` bytes go through the same `constraintDefBody`.
    if (
      constraint.definition !== null &&
      constraintDefBody(String(live.definition ?? "")) !== constraintDefBody(constraint.definition)
    ) {
      planCheck("constraint_contract_failed", `constraint ${constraint.name} definition drift`);
    }
  }
  const expectedConstraintNames = new Set(
    expected.constraints.map((constraint) => constraint.name)
  );
  for (const [name, row] of actualConstraints.entries()) {
    if (expectedConstraintNames.has(name) || !expected.exactSetTables.includes(String(row.table)))
      continue;
    planCheck("constraint_contract_failed", `unexpected TASK-551-owned constraint ${name}`);
  }
  const actualColumns = new Map<string, Record<string, unknown>>();
  for (const row of actual.columns)
    actualColumns.set(`${String(row.table)}.${String(row.name)}`, row);
  const compareColumn = (column: {
    table: string;
    name: string;
    type: string;
    notNull: boolean;
    defaultSql: string | null;
  }): void => {
    const live = actualColumns.get(`${column.table}.${column.name}`);
    if (live === undefined)
      planCheck("constraint_contract_failed", `missing live column ${column.table}.${column.name}`);
    // Audit F4: type bytes canonicalized on both sides — the snapshot/Drizzle
    // spelling `timestamp` versus the `format_type` spelling
    // `timestamp without time zone` name the same catalog type.
    if (
      canonicalSqlType(String(live?.type)) !== canonicalSqlType(column.type) ||
      Boolean(live?.not_null) !== column.notNull
    ) {
      planCheck(
        "constraint_contract_failed",
        `column ${column.table}.${column.name} type/nullability drift`
      );
    }
    const liveDefault =
      live?.default_sql === undefined || live?.default_sql === null
        ? null
        : normalizeSqlBytes(String(live.default_sql));
    if (
      liveDefault !== (column.defaultSql === null ? null : normalizeSqlBytes(column.defaultSql))
    ) {
      planCheck(
        "constraint_contract_failed",
        `column ${column.table}.${column.name} default drift`
      );
    }
  };
  for (const column of [...expected.outboxColumns, ...expected.migrationOperationColumns])
    compareColumn(column);
  // Audit F4: the injected authority export's columns (type, nullability,
  // default) are live-enforced as well. The live read covers every owned table;
  // a row set that carries none of the authority tables (the legacy DB-free
  // harness) skips the arm, any read that does is enforced fail-closed.
  const authority = expected.solutionKitRollbackAuthority;
  const liveColumnTables = new Set(actual.columns.map((row) => String(row.table)));
  if (authority.tables.every((table) => liveColumnTables.has(table))) {
    for (const column of authority.columns) {
      compareColumn({
        table: column.table,
        name: column.name,
        type: column.sqlType,
        notNull: !column.nullable,
        defaultSql: column.defaultSql,
      });
    }
  }
  // Audit F4: the stored generated-column expressions, compared with the same
  // whitespace-only normalization the landed live arm pins
  // (`tests/integration/server/task551SearchVectorMigration.test.ts`).
  if (actual.generatedExpressions !== undefined) {
    const liveGenerated = new Map<string, Record<string, unknown>>();
    for (const row of actual.generatedExpressions)
      liveGenerated.set(`${String(row.table)}.${String(row.name)}`, row);
    for (const member of EXPECTED_L01_GENERATED_EXPRESSION_ROWS) {
      const live = liveGenerated.get(`${member.table}.${member.column}`);
      if (live === undefined)
        planCheck(
          "constraint_contract_failed",
          `missing live generated column ${member.table}.${member.column}`
        );
      if (
        normalizeSqlBytes(String(live?.expression ?? "")) !== normalizeSqlBytes(member.expression)
      ) {
        planCheck(
          "constraint_contract_failed",
          `generated expression ${member.table}.${member.column} drift`
        );
      }
    }
    const expectedGenerated = new Set(
      EXPECTED_L01_GENERATED_EXPRESSION_ROWS.map((member) => `${member.table}.${member.column}`)
    );
    for (const [key, row] of liveGenerated.entries()) {
      if (expectedGenerated.has(key) || !expected.exactSetTables.includes(String(row.table)))
        continue;
      planCheck("constraint_contract_failed", `unexpected TASK-551-owned generated column ${key}`);
    }
  }
  // Audit F4: every authority FK — source columns, target table+columns and the
  // `ON DELETE RESTRICT ON UPDATE NO ACTION` actions — against the live
  // `pg_constraint` read (presence-gated exactly like the arm above).
  if (actual.foreignKeys !== undefined) {
    const liveForeignKeys = new Map<string, Record<string, unknown>>();
    for (const row of actual.foreignKeys) liveForeignKeys.set(String(row.name), row);
    const columnsOf = (value: unknown): readonly string[] =>
      String(value ?? "")
        .split(",")
        .filter((column) => column.length > 0);
    for (const foreignKey of authority.foreignKeys) {
      const live = liveForeignKeys.get(foreignKey.name);
      if (live === undefined)
        planCheck("constraint_contract_failed", `missing live foreign key ${foreignKey.name}`);
      if (
        JSON.stringify(columnsOf(live.columns)) !== JSON.stringify([...foreignKey.columns]) ||
        String(live.target_table) !== foreignKey.targetTable ||
        JSON.stringify(columnsOf(live.target_columns)) !==
          JSON.stringify([...foreignKey.targetColumns])
      ) {
        planCheck(
          "constraint_contract_failed",
          `foreign key ${foreignKey.name} column/target drift`
        );
      }
      if (
        String(live.on_delete) !== pgForeignKeyActionCode(foreignKey.onDelete) ||
        String(live.on_update) !== pgForeignKeyActionCode(foreignKey.onUpdate)
      ) {
        planCheck(
          "constraint_contract_failed",
          `foreign key ${foreignKey.name} delete/update action drift`
        );
      }
    }
    for (const [name, row] of liveForeignKeys.entries()) {
      if (
        authority.foreignKeys.some((foreignKey) => foreignKey.name === name) ||
        !expected.exactSetTables.includes(String(row.table))
      )
        continue;
      planCheck("constraint_contract_failed", `unexpected TASK-551-owned foreign key ${name}`);
    }
  }
  const volatile = new Map<string, Record<string, unknown>>();
  for (const row of actual.procVolatility)
    volatile.set(canonicalProcSignature(String(row.signature ?? "")), row);
  for (const signature of expected.immutableProcSignatures) {
    const live = volatile.get(canonicalProcSignature(signature));
    if (live === undefined)
      planCheck(
        "constraint_contract_failed",
        `missing generated-expression dependency ${signature}`
      );
    if (live?.provolatile !== "i")
      planCheck("constraint_contract_failed", `dependency ${signature} is not immutable`);
  }
  const exclusion = actual.exclusion[0];
  if (exclusion === undefined || String(exclusion.name) !== expected.bookingExclusion.name) {
    planCheck(
      "constraint_contract_failed",
      "the custom booking exclusion constraint is absent or renamed"
    );
  }
  if (
    !normalizeSqlBytes(String(exclusion.definition)).includes(
      normalizeSqlBytes(expected.bookingExclusion.predicate)
    )
  ) {
    planCheck("constraint_contract_failed", "the booking exclusion predicate drifted");
  }
};

// --- Execution authority seam: injection-only, never env/file/argv. ---

export type Task551ExplainAuthority = Readonly<{
  client: Task551CatalogClient;
  /** Warm/cold-declared repeated p95 for one case; never derived from the plan. */
  measureP95(
    statement: StaticPlanStatement,
    planCase: PlanCase,
    profile: ScaleProfile
  ): Promise<number>;
}>;

let explainAuthority: Task551ExplainAuthority | undefined;
/** The L11 broker injects the authority; nothing else may ever set it. */
export const configureTask551ExplainAuthority = (
  authority: Task551ExplainAuthority | undefined
): void => {
  explainAuthority = authority === undefined ? undefined : Object.freeze({ ...authority });
};
export const readTask551ExplainAuthority = (): Task551ExplainAuthority | undefined =>
  explainAuthority;

let catalogAuthority: ExactL01SolutionKitRollbackAuthority | undefined;
/**
 * The L03 rollback-authority projection reaches the CLI through this seam too:
 * `EXPECTED_TASK551_CATALOG` (doc :123-140) carries it, but the injection keeps
 * this module import-safe so no consumer ever transitively registers a
 * `bun:test` suite or a database client.
 */
export const configureTask551CatalogAuthority = (
  authority: ExactL01SolutionKitRollbackAuthority | undefined
): void => {
  catalogAuthority = authority;
};
export const readTask551CatalogAuthority = (): ExactL01SolutionKitRollbackAuthority | undefined =>
  catalogAuthority;

// --- L01 concurrency receipt: mirrored shape, recomputed digest, strict validator. ---

/**
 * The doc (:851-853) forbids importing L01's `task551ConcurrencyConstraints`
 * module, so its redacted `coderso.task551.l05-concurrency-receipt@v1` shape is
 * mirrored here and its digest recomputed over exactly `{ counts, booleans }`.
 * Five revision families, booking and the transferred-authority probe, only
 * counts/booleans/digest: never a fixture id, client, target or raw row.
 */
export type Task551L05ConcurrencyReceiptMirrorV1 = Readonly<{
  contract: "coderso.task551.l05-concurrency-receipt@v1";
  counts: Readonly<{
    families: number;
    probesPerFamily: number;
    bookingOverlapProbes: number;
    bookingDisjointProbes: number;
    authorityRaceProbes: number;
  }>;
  booleans: Readonly<{ barrierReleasedInFinally: boolean; childFirstCleanup: boolean }>;
  digest: string;
}>;

const L05_COUNTS = {
  families: 5,
  probesPerFamily: 50,
  bookingOverlapProbes: 50,
  bookingDisjointProbes: 50,
  authorityRaceProbes: 50,
} as const;
const L05_BOOLEANS = { barrierReleasedInFinally: true, childFirstCleanup: true } as const;
export const TASK551_L05_CONCURRENCY_RECEIPT_MIRROR: Task551L05ConcurrencyReceiptMirrorV1 =
  Object.freeze({
    contract: "coderso.task551.l05-concurrency-receipt@v1",
    counts: Object.freeze({ ...L05_COUNTS }),
    booleans: Object.freeze({ ...L05_BOOLEANS }),
    digest: sha256(JSON.stringify({ counts: L05_COUNTS, booleans: L05_BOOLEANS })),
  });

const isStrictRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const requireExactKeys = (
  value: unknown,
  keys: readonly string[],
  what: string
): Record<string, unknown> => {
  if (
    !isStrictRecord(value) ||
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    Reflect.ownKeys(value).some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    planCheck("constraint_contract_failed", `${what} carries an unexpected key set`);
  }
  return value;
};
const requireHex64 = (value: unknown, what: string): string => {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value))
    planCheck("constraint_contract_failed", `${what} is not a lowercase sha256 digest`);
  return value;
};
const requireTrueBoolean = (value: unknown, what: string): boolean => {
  if (value !== true) planCheck("constraint_contract_failed", `${what} is not the literal true`);
  return true;
};

/** Accepts only the redacted receipt; rejects every malformation fail-closed. */
export const requireTask551L05ConcurrencyReceipt = (
  value: unknown
): Task551L05ConcurrencyReceiptMirrorV1 => {
  const record = requireExactKeys(
    value,
    ["contract", "counts", "booleans", "digest"],
    "the L01 concurrency receipt"
  );
  if (record.contract !== TASK551_L05_CONCURRENCY_RECEIPT_MIRROR.contract)
    planCheck(
      "constraint_contract_failed",
      "the L01 concurrency receipt carries a foreign contract"
    );
  const counts = requireExactKeys(
    record.counts,
    [
      "families",
      "probesPerFamily",
      "bookingOverlapProbes",
      "bookingDisjointProbes",
      "authorityRaceProbes",
    ],
    "the concurrency counts"
  );
  for (const key of Object.keys(L05_COUNTS) as readonly (keyof typeof L05_COUNTS)[]) {
    if (counts[key] !== L05_COUNTS[key])
      planCheck(
        "constraint_contract_failed",
        `the concurrency counts.${key} drifted from the mirrored L01 fixture`
      );
  }
  const booleans = requireExactKeys(
    record.booleans,
    ["barrierReleasedInFinally", "childFirstCleanup"],
    "the concurrency booleans"
  );
  requireTrueBoolean(booleans.barrierReleasedInFinally, "booleans.barrierReleasedInFinally");
  requireTrueBoolean(booleans.childFirstCleanup, "booleans.childFirstCleanup");
  const digest = requireHex64(record.digest, "the concurrency digest");
  const recomputed = sha256(JSON.stringify({ counts: L05_COUNTS, booleans: L05_BOOLEANS }));
  if (digest !== recomputed)
    planCheck(
      "constraint_contract_failed",
      "the concurrency digest does not recompute over {counts,booleans}"
    );
  return TASK551_L05_CONCURRENCY_RECEIPT_MIRROR;
};

// --- Reviewed freeze receipt gate: the fail-closed rejection side (doc :207-209). ---

const freezeCeilingEquals = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

/**
 * Rejects a stale, digest-drifted or unreviewed freeze receipt before any
 * dynamic work. The landed receipt is `small: "candidate"`, so the small
 * profile is rejected today — by contract, not by accident: the dynamic phase
 * stays fail-closed until the owner reviews it.
 */
export const requireReviewedTask551FreezeReceipt = (
  profile: ScaleProfile
): Task551DatabaseFreezeReceipt => {
  const receipt = TASK551_DATABASE_FREEZE_RECEIPT[profile];
  if (receipt.reviewState !== "reviewed") {
    planCheck(
      "constraint_contract_failed",
      `task551_freeze_receipt_unreviewed: the ${profile} freeze receipt is ${receipt.reviewState}, so the dynamic phase is fail-closed`
    );
  }
  assertTask551FreezeReceiptIdentity(receipt, profile);
  return receipt;
};

/** Freeze-receipt identity: profile, digests, and ceiling equality with the frozen budgets. */
export const assertTask551FreezeReceiptIdentity = (
  receipt: Task551DatabaseFreezeReceipt,
  profile: ScaleProfile
): void => {
  const record = requireExactKeys(
    receipt,
    [
      "reviewState",
      "profile",
      "provenanceCommit",
      "contractDigest",
      "fixtureDigest",
      "schemaDigest",
      "runnerDigest",
      "platform",
      "arch",
      "cpuModel",
      "logicalCpus",
      "memoryMb",
      "postgresMajor",
      "postgresConfigDigest",
      "bunVersion",
      "poolCapacity",
      "containerMode",
      "scopeDigest",
      "calibration",
      "statementCeilings",
      "poolWaitCeiling",
      "reviewableReceiptDigest",
    ],
    "the freeze receipt"
  );
  if (record.profile !== profile)
    planCheck(
      "constraint_contract_failed",
      "the freeze receipt profile does not match the requested scale"
    );
  if (record.reviewState !== "reviewed")
    planCheck("constraint_contract_failed", "the freeze receipt is not reviewed");
  for (const key of [
    "provenanceCommit",
    "contractDigest",
    "fixtureDigest",
    "schemaDigest",
    "runnerDigest",
    "reviewableReceiptDigest",
  ] as const) {
    if (
      typeof record[key] !== "string" ||
      (key !== "provenanceCommit" && requireHex64(record[key], `freeze ${key}`) === "")
    )
      planCheck("constraint_contract_failed", `the freeze receipt ${key} is malformed`);
  }
  const ceilings = record.statementCeilings;
  if (!Array.isArray(ceilings) || ceilings.length !== 32)
    planCheck(
      "constraint_contract_failed",
      "the freeze receipt does not carry exactly 32 statement ceilings"
    );
  const frozen = new Map(Object.entries(TASK551_DATABASE_BUDGETS));
  for (const entry of ceilings) {
    const row = requireExactKeys(entry, ["statementId", "ceiling"], "a freeze statement ceiling");
    if (typeof row.statementId !== "string")
      planCheck("constraint_contract_failed", "a freeze ceiling has no statement id");
    if (!freezeCeilingEquals(row.ceiling, frozen.get(row.statementId)?.[profile])) {
      planCheck(
        "constraint_contract_failed",
        `the freeze ceiling for ${row.statementId}/${profile} drifted from the frozen budgets`
      );
    }
    frozen.delete(row.statementId);
  }
  if (frozen.size !== 0)
    planCheck("constraint_contract_failed", "the freeze receipt omits a frozen budget statement");
  if (!freezeCeilingEquals(record.poolWaitCeiling, TASK551_POOL_WAIT_BUDGETS[profile]))
    planCheck(
      "constraint_contract_failed",
      "the freeze pool-wait ceiling drifted from the frozen budgets"
    );
};

// --- Version-2 migration receipt: read-only validation (doc :578-595). ---

const TASK551_RECEIPT_STATES = [
  "resolved",
  "preflight_passed",
  "drain_requested",
  "drain_confirmed",
  "transaction_apply_pending",
  "transaction_applied",
  "revision_integrity_building",
  "revision_integrity_ready",
  "resume_authorized",
  "resume_completed",
  "operator_resume_authorized",
  "read_performance_building",
  "forward_ready",
  "reverse_drain_requested",
  "reverse_drain_confirmed",
  "reverse_indexes_building",
  "reverse_transaction_pending",
  "reverse_complete",
] as const;
const UUID_GRAMMAR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NONCE_GRAMMAR = /^[0-9a-f]{32}$/;
const ISO_GRAMMAR = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const requireInt = (value: unknown, min: number, max: number, what: string): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    planCheck("constraint_contract_failed", `${what} is not an integer in [${min},${max}]`);
  return value;
};
const requireString = (value: unknown, what: string): string => {
  if (typeof value !== "string" || value.length === 0)
    planCheck("constraint_contract_failed", `${what} is not a non-empty string`);
  return value;
};
const requireOptionalHex64 = (value: unknown, what: string): string | null =>
  value === null ? null : requireHex64(value, what);
const requireOptionalIso = (value: unknown, what: string): string | null => {
  if (value === null) return null;
  if (typeof value !== "string" || !ISO_GRAMMAR.test(value))
    planCheck("constraint_contract_failed", `${what} is not an ISO instant or null`);
  return value;
};
const requireOptionalNonce = (value: unknown, what: string): string | null => {
  if (value === null) return null;
  if (typeof value !== "string" || !NONCE_GRAMMAR.test(value))
    planCheck("constraint_contract_failed", `${what} is not a nonce or null`);
  return value;
};
const requireRepoRelativePath = (value: unknown, what: string): string => {
  const path = requireString(value, what);
  if (path.startsWith("/") || path.includes("..") || path.includes("\\"))
    planCheck("constraint_contract_failed", `${what} is not a repository-relative path`);
  return path;
};
const requirePathSha = (value: unknown, what: string): { path: string; sha256: string } => {
  const record = requireExactKeys(value, ["path", "sha256"], what);
  return {
    path: requireRepoRelativePath(record.path, `${what}.path`),
    sha256: requireHex64(record.sha256, `${what}.sha256`),
  };
};
const requireMemberReceipt = (
  value: unknown
): {
  name: string;
  group: string;
  order: number;
  definitionSha256: string;
  state: string;
  complete: boolean;
  completedAt: string | null;
} => {
  const record = requireExactKeys(
    value,
    ["name", "group", "order", "definitionSha256", "state", "complete", "completedAt"],
    "a member receipt"
  );
  if (record.group !== "revision-integrity" && record.group !== "read-performance")
    planCheck("constraint_contract_failed", "a member receipt carries a foreign group");
  if (
    record.state !== "pending" &&
    record.state !== "building" &&
    record.state !== "ready" &&
    record.state !== "dropped"
  )
    planCheck("constraint_contract_failed", "a member receipt carries a foreign state");
  return {
    name: requireString(record.name, "member name"),
    group: String(record.group),
    order: requireInt(record.order, 0, 4096, "member order"),
    definitionSha256: requireHex64(record.definitionSha256, "member definitionSha256"),
    state: String(record.state),
    complete:
      typeof record.complete === "boolean"
        ? record.complete
        : planCheck("constraint_contract_failed", "member complete is not boolean"),
    completedAt: requireOptionalIso(record.completedAt, "member completedAt"),
  };
};

export type Task551MigrationReceiptV2 = Readonly<{
  version: 2;
  taskId: "TASK-551";
  operationId: string;
  generation: number;
  previousStateSha256: string | null;
  stateSha256: string;
  direction: "forward" | "reverse";
  state: string;
  journal: { index: number; tag: string };
  artifacts: {
    transactionalSql: { path: string; sha256: string };
    snapshot: { path: string; sha256: string };
    onlineSql: { path: string; sha256: string };
    manifestSha256: string;
    aggregateSha256: string;
  };
  preflight: {
    digest: string;
    classification: "small" | "large";
    lockTimeoutMs: number;
    statementTimeoutMs: number;
    transactionTimeoutMs: number;
    recheckDigests: readonly string[];
  };
  admission: {
    mode: "external" | "offline-single";
    fleet: { runtimeProcessCount: number; workerProcessCount: number; totalProcessCount: number };
    adapterSha256: string | null;
    drainNonce: string;
    prepareAckSha256: string | null;
    quiescentFrom: string | null;
    quiescentUntil: string | null;
    resumeNonce: string | null;
    resumeAuthorizationSha256: string | null;
    resumeAckSha256: string | null;
    resumeBinarySha256: string | null;
    revisionWriterCompatibilitySha256: string | null;
    newBinaryTrafficAccepted: boolean;
  };
  transaction: { apply: "pending" | "applied" | "reversed"; catalogSha256: string | null };
  groups: readonly [
    { name: string; members: readonly string[]; complete: boolean; completedAt: string | null },
    { name: string; members: readonly string[]; complete: boolean; completedAt: string | null },
  ];
  forwardMembers: readonly ReturnType<typeof requireMemberReceipt>[];
  reverseMembers: readonly ReturnType<typeof requireMemberReceipt>[];
  finalCatalogReady: boolean;
}>;

/**
 * Read-only version-2 receipt validation: the exact key grammar, digest chain,
 * resolved journal tag/index, repository-relative artifact hashes, preflight
 * digest, admission/quiescence acknowledgements, ordered member receipts and
 * final state. Missing, extra or malformed fields fail
 * `constraint_contract_failed` — never a lenient re-read.
 */
export const assertTask551MigrationReceiptV2 = (value: unknown): Task551MigrationReceiptV2 => {
  const receipt = requireExactKeys(
    value,
    [
      "version",
      "taskId",
      "operationId",
      "generation",
      "previousStateSha256",
      "stateSha256",
      "direction",
      "state",
      "journal",
      "artifacts",
      "preflight",
      "admission",
      "transaction",
      "groups",
      "forwardMembers",
      "reverseMembers",
      "finalCatalogReady",
    ],
    "the migration receipt"
  );
  if (receipt.version !== 2 || receipt.taskId !== "TASK-551")
    planCheck(
      "constraint_contract_failed",
      "the migration receipt is not a TASK-551 version-2 receipt"
    );
  if (typeof receipt.operationId !== "string" || !UUID_GRAMMAR.test(receipt.operationId))
    planCheck("constraint_contract_failed", "the migration operationId is not a uuid");
  const generation = requireInt(receipt.generation, 1, 2147483647, "the migration generation");
  requireOptionalHex64(receipt.previousStateSha256, "previousStateSha256");
  if (generation > 1 && typeof receipt.previousStateSha256 !== "string")
    planCheck("constraint_contract_failed", "generation > 1 requires the previous state digest");
  requireHex64(receipt.stateSha256, "stateSha256");
  if (receipt.direction !== "forward" && receipt.direction !== "reverse")
    planCheck("constraint_contract_failed", "the migration direction is foreign");
  if (
    typeof receipt.state !== "string" ||
    !(TASK551_RECEIPT_STATES as readonly string[]).includes(receipt.state)
  )
    planCheck("constraint_contract_failed", "the migration state is foreign");
  const journal = requireExactKeys(receipt.journal, ["index", "tag"], "the receipt journal");
  requireInt(journal.index, 0, 2147483647, "the journal index");
  requireString(journal.tag, "the journal tag");
  const artifacts = requireExactKeys(
    receipt.artifacts,
    ["transactionalSql", "snapshot", "onlineSql", "manifestSha256", "aggregateSha256"],
    "the receipt artifacts"
  );
  const transactionalSql = requirePathSha(artifacts.transactionalSql, "artifacts.transactionalSql");
  const snapshot = requirePathSha(artifacts.snapshot, "artifacts.snapshot");
  const onlineSql = requirePathSha(artifacts.onlineSql, "artifacts.onlineSql");
  requireHex64(artifacts.manifestSha256, "artifacts.manifestSha256");
  requireHex64(artifacts.aggregateSha256, "artifacts.aggregateSha256");
  const preflight = requireExactKeys(
    receipt.preflight,
    [
      "digest",
      "classification",
      "lockTimeoutMs",
      "statementTimeoutMs",
      "transactionTimeoutMs",
      "recheckDigests",
    ],
    "the receipt preflight"
  );
  requireHex64(preflight.digest, "preflight.digest");
  if (preflight.classification !== "small" && preflight.classification !== "large")
    planCheck("constraint_contract_failed", "the preflight classification is foreign");
  if (preflight.lockTimeoutMs !== 2000)
    planCheck("constraint_contract_failed", "the preflight lock timeout is not the locked value");
  if (preflight.statementTimeoutMs !== 30000 && preflight.statementTimeoutMs !== 300000)
    planCheck("constraint_contract_failed", "the preflight statement timeout is foreign");
  if (preflight.transactionTimeoutMs !== 120000 && preflight.transactionTimeoutMs !== 900000)
    planCheck("constraint_contract_failed", "the preflight transaction timeout is foreign");
  if (
    !Array.isArray(preflight.recheckDigests) ||
    preflight.recheckDigests.length < 1 ||
    preflight.recheckDigests.some(
      (digest) => typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest)
    )
  ) {
    planCheck("constraint_contract_failed", "the preflight recheck digests are malformed");
  }
  const admission = requireExactKeys(
    receipt.admission,
    [
      "mode",
      "fleet",
      "adapterSha256",
      "drainNonce",
      "prepareAckSha256",
      "quiescentFrom",
      "quiescentUntil",
      "resumeNonce",
      "resumeAuthorizationSha256",
      "resumeAckSha256",
      "resumeBinarySha256",
      "revisionWriterCompatibilitySha256",
      "newBinaryTrafficAccepted",
    ],
    "the receipt admission"
  );
  if (admission.mode !== "external" && admission.mode !== "offline-single")
    planCheck("constraint_contract_failed", "the admission mode is foreign");
  const fleet = requireExactKeys(
    admission.fleet,
    ["runtimeProcessCount", "workerProcessCount", "totalProcessCount"],
    "the admission fleet"
  );
  requireInt(fleet.runtimeProcessCount, 0, 4096, "fleet.runtimeProcessCount");
  requireInt(fleet.workerProcessCount, 0, 4096, "fleet.workerProcessCount");
  requireInt(fleet.totalProcessCount, 0, 4096, "fleet.totalProcessCount");
  requireOptionalHex64(admission.adapterSha256, "admission.adapterSha256");
  if (typeof admission.drainNonce !== "string" || !NONCE_GRAMMAR.test(admission.drainNonce))
    planCheck("constraint_contract_failed", "the drain nonce is malformed");
  requireOptionalHex64(admission.prepareAckSha256, "admission.prepareAckSha256");
  requireOptionalIso(admission.quiescentFrom, "admission.quiescentFrom");
  requireOptionalIso(admission.quiescentUntil, "admission.quiescentUntil");
  requireOptionalNonce(admission.resumeNonce, "admission.resumeNonce");
  requireOptionalHex64(admission.resumeAuthorizationSha256, "admission.resumeAuthorizationSha256");
  requireOptionalHex64(admission.resumeAckSha256, "admission.resumeAckSha256");
  requireOptionalHex64(admission.resumeBinarySha256, "admission.resumeBinarySha256");
  requireOptionalHex64(
    admission.revisionWriterCompatibilitySha256,
    "admission.revisionWriterCompatibilitySha256"
  );
  requireTrueBoolean(admission.newBinaryTrafficAccepted, "admission.newBinaryTrafficAccepted");
  const transaction = requireExactKeys(
    receipt.transaction,
    ["apply", "catalogSha256"],
    "the receipt transaction"
  );
  if (
    transaction.apply !== "pending" &&
    transaction.apply !== "applied" &&
    transaction.apply !== "reversed"
  )
    planCheck("constraint_contract_failed", "the transaction apply state is foreign");
  requireOptionalHex64(transaction.catalogSha256, "transaction.catalogSha256");
  if (!Array.isArray(receipt.groups) || receipt.groups.length !== 2)
    planCheck("constraint_contract_failed", "the receipt must carry exactly two ordered groups");
  const groups = receipt.groups.map((group) => {
    const record = requireExactKeys(
      group,
      ["name", "members", "complete", "completedAt"],
      "a receipt group"
    );
    return {
      name: requireString(record.name, "group name"),
      members: (Array.isArray(record.members)
        ? record.members
        : planCheck("constraint_contract_failed", "a group members slot is not an array")
      ).map((member) => requireString(member, "group member")),
      complete:
        typeof record.complete === "boolean"
          ? record.complete
          : planCheck("constraint_contract_failed", "group complete is not boolean"),
      completedAt: requireOptionalIso(record.completedAt, "group completedAt"),
    };
  });
  if (groups[0]?.name !== "revision-integrity" || groups[1]?.name !== "read-performance")
    planCheck(
      "constraint_contract_failed",
      "the two groups are not in the exact revision-integrity then read-performance order"
    );
  if (groups[0]!.members.length !== 2)
    planCheck(
      "constraint_contract_failed",
      "the revision-integrity group does not carry exactly two members"
    );
  if (!Array.isArray(receipt.forwardMembers) || !Array.isArray(receipt.reverseMembers))
    planCheck("constraint_contract_failed", "the member receipts are not arrays");
  const forwardMembers = receipt.forwardMembers.map((member) => requireMemberReceipt(member));
  const reverseMembers = receipt.reverseMembers.map((member) => requireMemberReceipt(member));
  requireTrueBoolean(receipt.finalCatalogReady, "finalCatalogReady");
  return {
    version: 2,
    taskId: "TASK-551",
    operationId: String(receipt.operationId),
    generation: receipt.generation as number,
    previousStateSha256: receipt.previousStateSha256 as string | null,
    stateSha256: String(receipt.stateSha256),
    direction: receipt.direction as "forward" | "reverse",
    state: String(receipt.state),
    journal: { index: journal.index as number, tag: String(journal.tag) },
    artifacts: {
      transactionalSql,
      snapshot,
      onlineSql,
      manifestSha256: String(artifacts.manifestSha256),
      aggregateSha256: String(artifacts.aggregateSha256),
    },
    preflight: {
      digest: String(preflight.digest),
      classification: preflight.classification as "small" | "large",
      lockTimeoutMs: preflight.lockTimeoutMs as number,
      statementTimeoutMs: preflight.statementTimeoutMs as number,
      transactionTimeoutMs: preflight.transactionTimeoutMs as number,
      recheckDigests: [...(preflight.recheckDigests as readonly string[])],
    },
    admission: {
      mode: admission.mode as "external" | "offline-single",
      fleet: {
        runtimeProcessCount: fleet.runtimeProcessCount as number,
        workerProcessCount: fleet.workerProcessCount as number,
        totalProcessCount: fleet.totalProcessCount as number,
      },
      adapterSha256: admission.adapterSha256 as string | null,
      drainNonce: String(admission.drainNonce),
      prepareAckSha256: admission.prepareAckSha256 as string | null,
      quiescentFrom: admission.quiescentFrom as string | null,
      quiescentUntil: admission.quiescentUntil as string | null,
      resumeNonce: admission.resumeNonce as string | null,
      resumeAuthorizationSha256: admission.resumeAuthorizationSha256 as string | null,
      resumeAckSha256: admission.resumeAckSha256 as string | null,
      resumeBinarySha256: admission.resumeBinarySha256 as string | null,
      revisionWriterCompatibilitySha256: admission.revisionWriterCompatibilitySha256 as
        string | null,
      newBinaryTrafficAccepted: admission.newBinaryTrafficAccepted as boolean,
    },
    transaction: {
      apply: transaction.apply as "pending" | "applied" | "reversed",
      catalogSha256: transaction.catalogSha256 as string | null,
    },
    groups: [
      {
        name: groups[0]!.name,
        members: groups[0]!.members,
        complete: groups[0]!.complete,
        completedAt: groups[0]!.completedAt,
      },
      {
        name: groups[1]!.name,
        members: groups[1]!.members,
        complete: groups[1]!.complete,
        completedAt: groups[1]!.completedAt,
      },
    ],
    forwardMembers,
    reverseMembers,
    finalCatalogReady: receipt.finalCatalogReady as boolean,
  };
};

/**
 * One-to-one equality between every new snapshot-owned index, manifest member,
 * receipt member and live definition surface this leaf can see without a
 * database: the forward members are exactly the closed manifest order and the
 * reverse members name no foreign index.
 */
export const assertTask551OnlineIndexReceiptParity = (receipt: Task551MigrationReceiptV2): void => {
  const manifest = EXACT_L01_ONLINE_INDEX_MANIFEST.map((member) => member.name);
  const forward = receipt.forwardMembers.map((member) => member.name);
  if (JSON.stringify(forward) !== JSON.stringify(manifest))
    planCheck(
      "constraint_contract_failed",
      "the receipt forward members are not exactly the closed manifest order"
    );
  for (const member of receipt.forwardMembers) {
    if (member.order !== manifest.indexOf(member.name))
      planCheck("constraint_contract_failed", `member ${member.name} carries a foreign order`);
    if (member.state === "ready" && member.complete !== true)
      planCheck(
        "constraint_contract_failed",
        `member ${member.name} is ready without a completed build`
      );
  }
  for (const member of receipt.reverseMembers) {
    if (!manifest.includes(member.name))
      planCheck(
        "constraint_contract_failed",
        `reverse member ${member.name} is not a manifest index`
      );
  }
  const firstGroup =
    receipt.groups[0] ??
    planCheck("constraint_contract_failed", "the revision-integrity group is missing");
  if (
    JSON.stringify(firstGroup.members) !==
    JSON.stringify([
      "page_revisions_page_version_idx",
      "widget_template_revisions_template_version_idx",
    ])
  ) {
    planCheck(
      "constraint_contract_failed",
      "the revision-integrity group members are not the exact two revision builds"
    );
  }
  for (const member of receipt.groups[1]?.members ?? []) {
    if (!manifest.includes(member))
      planCheck(
        "constraint_contract_failed",
        `read-performance member ${member} is not a manifest index`
      );
  }
};

/** Test-visible case→expected-index maps (the mutation arms read them). */
export const TASK551_EXPECTED_CASE_INDEX = EXPECTED_CASE_INDEX;
export const TASK551_EXPECTED_CASE_EXTRA_INDEX = EXPECTED_CASE_EXTRA_INDEX;

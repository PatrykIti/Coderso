/**
 * Pure production owner of the closed append-heavy retention registry
 * (TASK-551-06-L01). The reviewed map below is a one-time transcription of the
 * "Complete Family Policy Matrix" plus the explicit reviewed exemptions in
 * `_docs/_TASKS/TASK-551-06-L01-Append-Heavy-Retention-And-Bounded-Pruners.md`;
 * no production file imports `tests/**` (same rule as
 * `core/db/queryFingerprintRegistry.ts`).
 *
 * Scale/budget pins are transcribed from TASK-551-01-L02's reviewed frozen
 * fixture `tests/perf/fixtures/task551DatabaseScale.ts` (whose own header
 * forbids production imports): `TASK551_RETENTION_BATCH_PINS` (default batch
 * 500 / max 2,000, sentinel edges 499/500/501/2,000/2,001) and the frozen
 * `2036-01-01` retention clock at that file's line 33, which the perf leg
 * `tests/perf/database-retention-batches.test.ts` replays verbatim. That
 * fixture is the 06-L01 prose's named budgets source and is not allowlisted
 * for this leaf (and production never imports `tests/**`), so its pins are
 * transcribed verbatim here instead of imported (disclosed contract defect
 * LOW-3 in the leaf receipt); a policy family absent from that frozen
 * fixture/budget registry fails the perf suite.
 *
 * The registry is the single fail-closed classification of every append-heavy
 * schema table: either bounded (a policy family) or explicitly exempt (a
 * reviewed owner). Adding a future append-heavy table requires a policy or an
 * explicit reviewed exemption in the same change; an unknown family name is
 * rejected, never defaulted, and no unclassified table may be pruned. This
 * module is Bun-free, reads no environment, issues no SQL, and validates once
 * at module evaluation.
 */

import { createHash } from "node:crypto";

/**
 * Every raised code comes from the 06-L01 closed error-code set
 * (`retention_policy_invalid` / `retention_batch_failed`); the keys name the
 * failing registry invariant for call-site readability and never introduce an
 * alternate code.
 */
export const APPEND_HEAVY_RETENTION_ERROR_CODES = {
  unknownFamily: "retention_policy_invalid",
  unclassifiedTable: "retention_policy_invalid",
  duplicateTable: "retention_policy_invalid",
  invalidBounds: "retention_policy_invalid",
} as const;

/**
 * Global knob bounds (prefix `RETENTION_`), transcribed from the family policy
 * matrix: batch size defaults to 500 and validates 1..2,000; max batches per
 * run defaults to 10 and validates 1..100. Dry run is owned only by
 * `RETENTION_DRY_RUN` and is parsed by the policy owner, not here.
 */
export const APPEND_HEAVY_RETENTION_BATCH_BOUNDS = Object.freeze({
  defaultBatchSize: 500,
  minBatchSize: 1,
  maxBatchSize: 2_000,
  defaultMaxBatchesPerRun: 10,
  minMaxBatchesPerRun: 1,
  maxMaxBatchesPerRun: 100,
});

/**
 * `age` means `cutoff column < now - maxAgeDays` and the boundary row is
 * retained; `expired_only`/`expired_or_revoked` prune only rows already past
 * their own lifecycle timestamp; the remaining modes carry the family's
 * anchored/child-first/graph-predicate semantics in `deleteOrder`.
 */
type AppendHeavyRetentionCutoffMode =
  | "age"
  | "expired_only"
  | "expired_or_revoked"
  | "age_then_newest_per_user"
  | "preserve_newest_successful"
  | "child_first"
  | "terminal_only"
  | "graph_predicate";

type AppendHeavyRetentionFamilyDefinition = Readonly<{
  family: string;
  /** Physical schema tables owned by this family, in prune order. */
  tables: readonly string[];
  /** Family environment prefix (`RETENTION_`-framed); the policy owner owns suffixes. */
  envPrefix: string;
  /** Only the analytics family keeps its canonical legacy age variable. */
  ageEnvKey?: string;
  /** Only the analytics family separates enablement from age. */
  enabledEnvKey?: string;
  enabledByDefault: boolean;
  defaultMaxAgeDays: number;
  minMaxAgeDays: number;
  maxMaxAgeDays: number;
  cutoffMode: AppendHeavyRetentionCutoffMode;
  /** Lifecycle columns the cutoff compares; empty when the pruner computes it. */
  cutoffColumns: readonly string[];
  /** Exact delete order from the policy matrix, oldest first per phase. */
  deleteOrder: readonly string[];
  /** Rows this family must always preserve. */
  preservation: string;
}>;

/**
 * The fourteen bounded families of the policy matrix, verbatim: env prefix,
 * default age, inclusive age bounds, cutoff mode, and delete order. Disabled
 * legal/business families (`formSubmissions`, `solutionKitRuns`) stay
 * disabled until explicitly enabled.
 */
export const APPEND_HEAVY_RETENTION_FAMILIES: Readonly<
  Record<string, AppendHeavyRetentionFamilyDefinition>
> = Object.freeze({
  accessLogs: Object.freeze({
    family: "accessLogs",
    tables: Object.freeze(["access_logs"]),
    envPrefix: "RETENTION_ACCESS_LOGS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 90,
    minMaxAgeDays: 7,
    maxMaxAgeDays: 365,
    cutoffMode: "age",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze(["created_at ASC, id ASC"]),
    preservation: "none; the boundary row is retained",
  }),
  auditLogs: Object.freeze({
    family: "auditLogs",
    tables: Object.freeze(["audit_logs"]),
    envPrefix: "RETENTION_AUDIT_LOGS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 365,
    minMaxAgeDays: 30,
    maxMaxAgeDays: 2_555,
    cutoffMode: "age",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze(["created_at ASC, id ASC"]),
    preservation: "none; the boundary row is retained",
  }),
  emailDeliveryLogs: Object.freeze({
    family: "emailDeliveryLogs",
    tables: Object.freeze(["email_delivery_logs"]),
    envPrefix: "RETENTION_EMAIL_DELIVERY_LOGS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 90,
    minMaxAgeDays: 7,
    maxMaxAgeDays: 365,
    cutoffMode: "age",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze(["created_at ASC, id ASC"]),
    preservation: "none; the boundary row is retained",
  }),
  searchHistory: Object.freeze({
    family: "searchHistory",
    tables: Object.freeze(["search_history"]),
    envPrefix: "RETENTION_SEARCH_HISTORY_",
    enabledByDefault: true,
    defaultMaxAgeDays: 90,
    minMaxAgeDays: 7,
    maxMaxAgeDays: 365,
    cutoffMode: "age_then_newest_per_user",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze([
      "age cutoff first, then excess per user",
      "created_at ASC, id ASC",
    ]),
    preservation: "the newest 10 rows per user",
  }),
  integrationRequests: Object.freeze({
    family: "integrationRequests",
    tables: Object.freeze(["integration_requests"]),
    envPrefix: "RETENTION_INTEGRATION_REQUESTS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 90,
    minMaxAgeDays: 7,
    maxMaxAgeDays: 365,
    cutoffMode: "age",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze(["created_at ASC, id ASC"]),
    preservation: "none; the boundary row is retained",
  }),
  passwordResets: Object.freeze({
    family: "passwordResets",
    tables: Object.freeze(["password_resets"]),
    envPrefix: "RETENTION_PASSWORD_RESETS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 7,
    minMaxAgeDays: 1,
    maxMaxAgeDays: 30,
    cutoffMode: "expired_only",
    cutoffColumns: Object.freeze(["expires_at"]),
    deleteOrder: Object.freeze(["only expired; expires_at ASC, id ASC"]),
    preservation: "unexpired reset requests",
  }),
  previewTokens: Object.freeze({
    family: "previewTokens",
    tables: Object.freeze(["preview_tokens", "post_preview_tokens"]),
    envPrefix: "RETENTION_PREVIEW_TOKENS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 1,
    minMaxAgeDays: 1,
    maxMaxAgeDays: 30,
    cutoffMode: "expired_only",
    cutoffColumns: Object.freeze(["expires_at"]),
    deleteOrder: Object.freeze([
      "only expired; page tokens then post tokens",
      "expires_at ASC, id ASC",
    ]),
    preservation: "unexpired preview tokens on both tables",
  }),
  assistantDocIngestRuns: Object.freeze({
    family: "assistantDocIngestRuns",
    tables: Object.freeze(["assistant_doc_ingest_runs"]),
    envPrefix: "RETENTION_ASSISTANT_INGEST_RUNS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 90,
    minMaxAgeDays: 7,
    maxMaxAgeDays: 365,
    cutoffMode: "preserve_newest_successful",
    cutoffColumns: Object.freeze(["started_at"]),
    deleteOrder: Object.freeze(["preserve newest successful run/source", "started_at ASC, id ASC"]),
    preservation: "the newest successful run and its source per anchor",
  }),
  assistantActions: Object.freeze({
    family: "assistantActions",
    tables: Object.freeze(["assistant_action_undo_items", "assistant_action_executions"]),
    envPrefix: "RETENTION_ASSISTANT_ACTIONS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 180,
    minMaxAgeDays: 30,
    maxMaxAgeDays: 730,
    cutoffMode: "child_first",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze(["undo children then executions", "created_at ASC, id ASC"]),
    preservation: "none beyond the age window; children always precede executions",
  }),
  analytics: Object.freeze({
    family: "analytics",
    tables: Object.freeze(["analytics_pageviews", "analytics_sessions"]),
    envPrefix: "RETENTION_ANALYTICS_",
    ageEnvKey: "ANALYTICS_RETENTION_DAYS",
    enabledEnvKey: "RETENTION_ANALYTICS_ENABLED",
    enabledByDefault: true,
    defaultMaxAgeDays: 365,
    minMaxAgeDays: 30,
    maxMaxAgeDays: 1_095,
    cutoffMode: "child_first",
    cutoffColumns: Object.freeze(["created_at", "last_seen_at"]),
    deleteOrder: Object.freeze([
      "pageviews by created_at ASC, id ASC",
      "then sessions by last_seen_at ASC, id ASC",
    ]),
    preservation: "none; the boundary row is retained",
  }),
  formSubmissions: Object.freeze({
    family: "formSubmissions",
    tables: Object.freeze(["form_action_runs", "form_submissions"]),
    envPrefix: "RETENTION_FORM_SUBMISSIONS_",
    enabledByDefault: false,
    defaultMaxAgeDays: 365,
    minMaxAgeDays: 1,
    maxMaxAgeDays: 3_650,
    cutoffMode: "child_first",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze([
      "action-run children before submissions",
      "created_at ASC, id ASC",
    ]),
    preservation: "disabled by default; nothing is deleted until explicitly enabled",
  }),
  webhookDeliveries: Object.freeze({
    family: "webhookDeliveries",
    tables: Object.freeze(["webhook_deliveries"]),
    envPrefix: "RETENTION_WEBHOOK_DELIVERIES_",
    enabledByDefault: true,
    defaultMaxAgeDays: 30,
    minMaxAgeDays: 1,
    maxMaxAgeDays: 365,
    cutoffMode: "terminal_only",
    cutoffColumns: Object.freeze(["created_at"]),
    deleteOrder: Object.freeze(["terminal deliveries only; created_at ASC, id ASC"]),
    preservation: "non-terminal deliveries",
  }),
  sessions: Object.freeze({
    family: "sessions",
    tables: Object.freeze(["sessions"]),
    envPrefix: "RETENTION_SESSIONS_",
    enabledByDefault: true,
    defaultMaxAgeDays: 30,
    minMaxAgeDays: 1,
    maxMaxAgeDays: 365,
    cutoffMode: "expired_or_revoked",
    cutoffColumns: Object.freeze(["expires_at", "revoked_at"]),
    deleteOrder: Object.freeze(["only expired/revoked; effective cutoff then id ASC"]),
    preservation: "live sessions that are neither expired nor revoked",
  }),
  solutionKitRuns: Object.freeze({
    family: "solutionKitRuns",
    tables: Object.freeze([
      "solution_kit_legacy_rollback_progress",
      "solution_kit_starter_apply_owners",
      "solution_kit_legacy_template_evidence",
      "solution_kit_install_items",
      "solution_kit_install_runs",
    ]),
    envPrefix: "RETENTION_SOLUTION_KIT_RUNS_",
    enabledByDefault: false,
    defaultMaxAgeDays: 365,
    minMaxAgeDays: 30,
    maxMaxAgeDays: 3_650,
    cutoffMode: "graph_predicate",
    cutoffColumns: Object.freeze([]),
    deleteOrder: Object.freeze([
      "progress/owner/evidence/items and rollback children before source runs",
    ]),
    preservation:
      "the complete active/retry graph: running/recovery owners, unreleased sources, " +
      "unproven or contradictory rollback owners, and any `LIMIT 2001` corruption sentinel",
  }),
});

type AppendHeavyRetentionExemption = Readonly<{
  exemption: string;
  tables: readonly string[];
  /** Reviewed owner that decides when (and whether) these rows are removed. */
  owner: string;
  reason: string;
}>;

/**
 * Explicitly reviewed non-retention classifications. Revision tables are
 * governed by 06-L02's separate count-plus-age policy; backups stay TASK-511
 * owned and the cache invalidation outbox stays TASK-551-08 owned because
 * their recovery/coherence consumers determine safe deletion; the remaining
 * groups are authoritative domain records, not disposable append logs.
 */
export const APPEND_HEAVY_RETENTION_EXEMPTIONS: Readonly<
  Record<string, AppendHeavyRetentionExemption>
> = Object.freeze({
  revisions: Object.freeze({
    exemption: "revisions",
    tables: Object.freeze([
      "page_revisions",
      "detail_page_revisions",
      "post_revisions",
      "content_revisions",
      "widget_template_revisions",
    ]),
    owner: "TASK-551-06-L02",
    reason: "governed by the separate count-plus-age revision policy",
  }),
  backups: Object.freeze({
    exemption: "backups",
    tables: Object.freeze(["backups", "backup_schedules", "backup_users_staging"]),
    owner: "TASK-511",
    reason: "backup recovery consumers determine safe deletion",
  }),
  cacheInvalidationOutbox: Object.freeze({
    exemption: "cacheInvalidationOutbox",
    tables: Object.freeze(["cache_invalidation_outbox"]),
    owner: "TASK-551-08",
    reason: "cache coherence consumers determine safe deletion",
  }),
  assistantDomainRecords: Object.freeze({
    exemption: "assistantDomainRecords",
    tables: Object.freeze(["assistant_docs", "assistant_doc_chunks"]),
    owner: "assistant content lifecycle",
    reason: "authoritative assistant documents/chunks, not disposable append logs",
  }),
  identityDomainRecords: Object.freeze({
    exemption: "identityDomainRecords",
    tables: Object.freeze(["users", "api_keys"]),
    owner: "identity lifecycle",
    reason: "authoritative users/API keys, not disposable append logs",
  }),
  engagementDomainRecords: Object.freeze({
    exemption: "engagementDomainRecords",
    tables: Object.freeze([
      "bookings",
      "reviews",
      "booking_resources",
      "booking_services",
      "booking_service_resources",
      "booking_schedules",
      "booking_blackouts",
    ]),
    owner: "booking/review lifecycle",
    reason: "authoritative bookings/reviews and their configuration, not append logs",
  }),
  authoredDomainRecords: Object.freeze({
    exemption: "authoredDomainRecords",
    tables: Object.freeze([
      "pages",
      "page_templates",
      "detail_page_documents",
      "posts",
      "post_term_assignments",
      "content_types",
      "content_entries",
      "content_taxonomies",
      "content_terms",
      "content_term_assignments",
      "media",
      "media_folders",
      "forms",
      "form_fields",
      "form_actions",
      "submission_export_jobs",
      "custom_screens",
      "custom_screen_entry_presentation_overrides",
      "menus",
      "menu_items",
      "popups",
      "widget_templates",
      "listing_templates",
      "listing_queries",
      "theme_profiles",
      "theme_routes",
      "admin_theme_templates",
      "admin_theme_profiles",
      "seo_documents",
      "seo_indexed_pages",
      "seo_search_metrics",
      "seo_search_queries",
      "seo_sitemap_submissions",
      "redirects",
      "commerce_products",
      "commerce_collections",
      "commerce_product_collections",
      "settings",
      "user_settings",
      "dashboard_layouts",
      "plugins",
      "plugin_settings",
      "webhooks",
      "integrations",
      "roles",
      "user_roles",
      "ip_allowlist",
    ]),
    owner: "domain record lifecycle",
    reason: "authored CMS/media/configuration records, not disposable append logs",
  }),
});

/**
 * Fails module evaluation on any closed-registry invariant violation: a family
 * without tables, an age default outside its inclusive bounds, a table owned
 * by more than one classification, or a missing `RETENTION_` frame.
 */
function validateAppendHeavyRetentionRegistry(): void {
  const classifications = [
    ...Object.values(APPEND_HEAVY_RETENTION_FAMILIES),
    ...Object.values(APPEND_HEAVY_RETENTION_EXEMPTIONS),
  ];
  const seen = new Set<string>();
  for (const classification of classifications) {
    if (classification.tables.length === 0) {
      throw new Error(APPEND_HEAVY_RETENTION_ERROR_CODES.invalidBounds);
    }
    for (const table of classification.tables) {
      if (seen.has(table)) {
        throw new Error(APPEND_HEAVY_RETENTION_ERROR_CODES.duplicateTable);
      }
      seen.add(table);
    }
  }
  for (const definition of Object.values(APPEND_HEAVY_RETENTION_FAMILIES)) {
    if (
      !definition.envPrefix.startsWith("RETENTION_") ||
      definition.defaultMaxAgeDays < definition.minMaxAgeDays ||
      definition.defaultMaxAgeDays > definition.maxMaxAgeDays ||
      definition.minMaxAgeDays < 1 ||
      (definition.cutoffMode === "age" && definition.cutoffColumns.length === 0)
    ) {
      throw new Error(APPEND_HEAVY_RETENTION_ERROR_CODES.invalidBounds);
    }
  }
}

validateAppendHeavyRetentionRegistry();

export type AppendHeavyRetentionFamily = Extract<
  keyof typeof APPEND_HEAVY_RETENTION_FAMILIES,
  string
>;

export type AppendHeavyRetentionExemptionName = Extract<
  keyof typeof APPEND_HEAVY_RETENTION_EXEMPTIONS,
  string
>;

/**
 * Fail-closed family lookup: an unknown family name throws the stable
 * `retention_policy_invalid` code instead of silently defaulting.
 */
export function resolveAppendHeavyRetentionFamily(
  family: string
): AppendHeavyRetentionFamilyDefinition {
  const definition = APPEND_HEAVY_RETENTION_FAMILIES[family];
  if (!definition) {
    throw new Error(`${APPEND_HEAVY_RETENTION_ERROR_CODES.unknownFamily}: ${family}`);
  }
  return definition;
}

/**
 * Fail-closed table classification: an unclassified table throws the stable
 * `retention_policy_invalid` code instead of returning a classification, so a
 * registry coverage gap can never be silently treated as prunable.
 */
export function classifyAppendHeavyTable(
  table: string
): Readonly<{ kind: "family"; name: string }> | Readonly<{ kind: "exempt"; name: string }> {
  for (const [name, definition] of Object.entries(APPEND_HEAVY_RETENTION_FAMILIES)) {
    if (definition.tables.includes(table)) {
      return { kind: "family", name };
    }
  }
  for (const [name, exemption] of Object.entries(APPEND_HEAVY_RETENTION_EXEMPTIONS)) {
    if (exemption.tables.includes(table)) {
      return { kind: "exempt", name };
    }
  }
  throw new Error(`${APPEND_HEAVY_RETENTION_ERROR_CODES.unclassifiedTable}: ${table}`);
}

/** Stable registry digest over the closed family/exemption table set. */
export function computeAppendHeavyRetentionRegistryDigest(): string {
  const canonical = [
    ...Object.entries(APPEND_HEAVY_RETENTION_FAMILIES).map(
      ([name, definition]) => `family:${name}->${definition.tables.join(",")}`
    ),
    ...Object.entries(APPEND_HEAVY_RETENTION_EXEMPTIONS).map(
      ([name, exemption]) => `exempt:${name}->${exemption.tables.join(",")}`
    ),
  ]
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

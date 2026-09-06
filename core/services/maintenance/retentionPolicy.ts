/**
 * TASK-551-06-L01: shared retention policy core — the single pure owner of the
 * append-heavy retention truth table.
 *
 * This module owns, and only owns, the truth table and shared vocabulary of
 * the append-heavy retention policy. Adoption is gradual rather than
 * universal: as of this leaf the one production importer is
 * `core/services/search/searchHistoryRetentionService.ts`; the twelve
 * per-family retention services and the append-heavy registry still declare
 * their equivalents inline, and the suites pin those re-declared copies to
 * this truth table so a divergence fails a gate instead of drifting. The
 * vocabulary:
 *
 * - the global knobs (`RETENTION_BATCH_SIZE`, `RETENTION_MAX_BATCHES_PER_RUN`,
 *   `RETENTION_DRY_RUN`) with their defaults and closed bounds;
 * - the per-family matrix (env prefix, default enablement, default/bounded age,
 *   cutoff column, child-first delete order) exactly as the leaf's policy table
 *   pins it;
 * - the canonical `ANALYTICS_RETENTION_DAYS` compatibility parser, whose
 *   outcome is preserved byte-for-byte from the removed inline gate;
 * - the deprecated `ANALYTICS_PRUNE_INLINE_DISABLED` / `ANALYTICS_PRUNE_INLINE_ENABLED`
 *   no-op branch and its warning-once tokens.
 *
 * Purity contract: no SQL, no database client, no scheduler, no clock and no
 * `process.env` read lives here. Every function takes the environment record
 * and/or the instant it needs; `cutoff` is `column < now - age`, so the
 * boundary row is always retained. Nothing in this file mutates process state
 * except the once-per-process deprecated-warning guard, which is unreachable
 * from a policy read and exists only for retention initialization.
 *
 * Stricter-than-minimum behavior, documented for operators: any `RETENTION_`
 * prefixed key outside the supported set — including a family-scoped dry-run
 * override and both unsupported analytics age aliases — fails startup with the
 * stable `retention_policy_invalid` code instead of being ignored, because a
 * silently ignored knob is indistinguishable from a knob that took effect.
 * Error messages and warning tokens carry stable codes only; raw environment
 * values never reach them.
 *
 * Dependency direction: this module imports nothing from the database, cache,
 * runtime or service layers. Its importers (the search-history retention
 * service in production, the retention suites in test) consume it one way;
 * nothing here depends on them.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** The one stable policy failure code; every rejection below carries it. */
export const RETENTION_POLICY_ERROR_CODE = "retention_policy_invalid";

/**
 * Typed startup/validation failure. `code` is the stable machine-readable
 * code; `reason` is a second stable token that narrows the rule that failed.
 * Neither ever embeds a raw environment key or value.
 */
export class RetentionPolicyError extends Error {
  readonly code: string;
  readonly reason: string;

  constructor(reason: string) {
    super(`${RETENTION_POLICY_ERROR_CODE} (${reason})`);
    this.name = "RetentionPolicyError";
    this.code = RETENTION_POLICY_ERROR_CODE;
    this.reason = reason;
  }
}

function fail(reason: string): never {
  throw new RetentionPolicyError(reason);
}

// ---------------------------------------------------------------------------
// Environment record (injected explicitly; nothing reads process.env here)
// ---------------------------------------------------------------------------

export type RuntimeEnv = Readonly<Record<string, string | undefined>>;

// ---------------------------------------------------------------------------
// Global knobs
// ---------------------------------------------------------------------------

export const RETENTION_BATCH_SIZE_ENV = "RETENTION_BATCH_SIZE";
export const RETENTION_BATCH_SIZE_DEFAULT = 500;
export const RETENTION_BATCH_SIZE_MIN = 1;
export const RETENTION_BATCH_SIZE_MAX = 2_000;

export const RETENTION_MAX_BATCHES_PER_RUN_ENV = "RETENTION_MAX_BATCHES_PER_RUN";
export const RETENTION_MAX_BATCHES_PER_RUN_DEFAULT = 10;
export const RETENTION_MAX_BATCHES_PER_RUN_MIN = 1;
export const RETENTION_MAX_BATCHES_PER_RUN_MAX = 100;

export const RETENTION_DRY_RUN_ENV = "RETENTION_DRY_RUN";

/** Search history keeps the newest ten rows per user, forever, by contract. */
export const SEARCH_HISTORY_KEEP_NEWEST_PER_USER = 10;

/**
 * The typed global runtime every policy inherits. `dryRun` is parsed once here
 * and propagated as the required typed field; no family, CLI flag or alias can
 * reparse or override it, so a global true can never degrade into writes.
 */
export type RetentionRuntimeOptions = Readonly<{
  batchSize: number;
  maxBatchesPerRun: number;
  dryRun: boolean;
}>;

const CANONICAL_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

/**
 * Strict retention boolean grammar: absent falls back, otherwise the value
 * must be exactly the lowercase strings `true` or `false`. Empty string,
 * whitespace, a case variant, `1`, `0` or any other value rejects startup.
 */
function parseEnvRetentionBoolean(
  raw: string | undefined,
  fallback: boolean,
  reason: string
): boolean {
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  fail(reason);
}

/**
 * Bounded integer knob grammar. Absent (or empty, the sibling cache-config
 * convention) resolves to the default; anything present must be a canonical
 * non-negative integer inside `[min, max]`. Explicit out-of-range values are
 * rejected, never silently clamped; `01`, `1.0`, ` 500`, `500 ` and signed
 * input all reject.
 */
function parseEnvBoundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  reason: string
): number {
  if (raw === undefined || raw === "") return fallback;
  if (!CANONICAL_INTEGER_PATTERN.test(raw)) fail(reason);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(reason);
  return value;
}

/** Shared strict-boolean parse over already-typed values (no string grammar). */
function normalizeBooleanValue(value: unknown, reason: string): boolean {
  if (value !== true && value !== false) fail(reason);
  return value;
}

/** Shared bounded-integer parse over already-typed values. Never clamps. */
function normalizeIntegerValue(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail(reason);
  if (value < minimum || value > maximum) fail(reason);
  return value;
}

export function resolveRetentionBatchSize(env: RuntimeEnv): number {
  return parseEnvBoundedInteger(
    env[RETENTION_BATCH_SIZE_ENV],
    RETENTION_BATCH_SIZE_DEFAULT,
    RETENTION_BATCH_SIZE_MIN,
    RETENTION_BATCH_SIZE_MAX,
    "batch_size_invalid"
  );
}

export function resolveRetentionMaxBatchesPerRun(env: RuntimeEnv): number {
  return parseEnvBoundedInteger(
    env[RETENTION_MAX_BATCHES_PER_RUN_ENV],
    RETENTION_MAX_BATCHES_PER_RUN_DEFAULT,
    RETENTION_MAX_BATCHES_PER_RUN_MIN,
    RETENTION_MAX_BATCHES_PER_RUN_MAX,
    "max_batches_per_run_invalid"
  );
}

export function resolveRetentionDryRun(env: RuntimeEnv): boolean {
  return parseEnvRetentionBoolean(env[RETENTION_DRY_RUN_ENV], false, "dry_run_invalid");
}

export function resolveRetentionRuntimeOptions(env: RuntimeEnv): RetentionRuntimeOptions {
  return Object.freeze({
    batchSize: resolveRetentionBatchSize(env),
    maxBatchesPerRun: resolveRetentionMaxBatchesPerRun(env),
    dryRun: resolveRetentionDryRun(env),
  });
}

// ---------------------------------------------------------------------------
// Family matrix — the leaf's policy table, encoded
// ---------------------------------------------------------------------------

/**
 * Family keys in the exact order of the leaf's policy matrix. Every
 * append-heavy table must classify into exactly one of these families; the
 * registry rejects an unknown family instead of inventing a row.
 */
export const RETENTION_FAMILY_ORDER = [
  "access_logs",
  "audit_logs",
  "email_delivery_logs",
  "search_history",
  "integration_requests",
  "password_resets",
  "preview_tokens",
  "assistant_ingest_runs",
  "assistant_actions",
  "analytics",
  "form_submissions",
  "webhook_deliveries",
  "sessions",
  "solution_kit_runs",
] as const;

export type RetentionFamily = (typeof RETENTION_FAMILY_ORDER)[number];

/** Ascending-only order columns; every order finishes with immutable `id ASC`. */
export type RetentionOrderColumn = Readonly<{ column: string; direction: "asc" }>;

/** Which rows of a table are retention-eligible at all. */
export type RetentionRowFilter =
  "all" | "expired_only" | "expired_or_revoked_only" | "terminal_deliveries_only";

/**
 * One physical table inside a family. `cutoffColumn` is the column the age
 * cutoff applies to (`column < now - age`); `null` marks a graph child that is
 * never age-selected and only dies with its owning run. Tables are listed in
 * the mandatory child-first delete order.
 */
export type RetentionTableSpec = Readonly<{
  table: string;
  cutoffColumn: string | null;
  rowFilter: RetentionRowFilter;
  orderBy: readonly RetentionOrderColumn[];
}>;

export type RetentionFamilySpec = Readonly<{
  family: RetentionFamily;
  /** Env prefix for the family knobs; `null` marks the analytics family. */
  envPrefix: string | null;
  tables: readonly RetentionTableSpec[];
  defaultEnabled: boolean;
  defaultAgeDays: number;
  minAgeDays: number;
  maxAgeDays: number;
  keepNewestPerUser: number | null;
  preserveNewestSuccessfulPerSource: number | null;
}>;

const ascending = (column: string): RetentionOrderColumn =>
  Object.freeze({ column, direction: "asc" });

const table = (
  name: string,
  cutoffColumn: string | null,
  rowFilter: RetentionRowFilter,
  orderColumns: readonly string[]
): RetentionTableSpec =>
  Object.freeze({
    table: name,
    cutoffColumn,
    rowFilter,
    orderBy: Object.freeze(orderColumns.map(ascending)),
  });

export const RETENTION_FAMILY_SPECS: Readonly<Record<RetentionFamily, RetentionFamilySpec>> =
  deepFreeze({
    access_logs: {
      family: "access_logs",
      envPrefix: "RETENTION_ACCESS_LOGS_",
      tables: [table("access_logs", "created_at", "all", ["created_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 90,
      minAgeDays: 7,
      maxAgeDays: 365,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    audit_logs: {
      family: "audit_logs",
      envPrefix: "RETENTION_AUDIT_LOGS_",
      tables: [table("audit_logs", "created_at", "all", ["created_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 365,
      minAgeDays: 30,
      maxAgeDays: 2555,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    email_delivery_logs: {
      family: "email_delivery_logs",
      envPrefix: "RETENTION_EMAIL_DELIVERY_LOGS_",
      tables: [table("email_delivery_logs", "created_at", "all", ["created_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 90,
      minAgeDays: 7,
      maxAgeDays: 365,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    search_history: {
      family: "search_history",
      envPrefix: "RETENTION_SEARCH_HISTORY_",
      tables: [table("search_history", "created_at", "all", ["created_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 90,
      minAgeDays: 7,
      maxAgeDays: 365,
      keepNewestPerUser: SEARCH_HISTORY_KEEP_NEWEST_PER_USER,
      preserveNewestSuccessfulPerSource: null,
    },
    integration_requests: {
      family: "integration_requests",
      envPrefix: "RETENTION_INTEGRATION_REQUESTS_",
      tables: [table("integration_requests", "created_at", "all", ["created_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 90,
      minAgeDays: 7,
      maxAgeDays: 365,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    password_resets: {
      family: "password_resets",
      envPrefix: "RETENTION_PASSWORD_RESETS_",
      tables: [table("password_resets", "expires_at", "expired_only", ["expires_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 7,
      minAgeDays: 1,
      maxAgeDays: 30,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    preview_tokens: {
      family: "preview_tokens",
      envPrefix: "RETENTION_PREVIEW_TOKENS_",
      tables: [
        table("preview_tokens", "expires_at", "expired_only", ["expires_at", "id"]),
        table("post_preview_tokens", "expires_at", "expired_only", ["expires_at", "id"]),
      ],
      defaultEnabled: true,
      defaultAgeDays: 1,
      minAgeDays: 1,
      maxAgeDays: 30,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    assistant_ingest_runs: {
      family: "assistant_ingest_runs",
      envPrefix: "RETENTION_ASSISTANT_INGEST_RUNS_",
      tables: [table("assistant_doc_ingest_runs", "started_at", "all", ["started_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 90,
      minAgeDays: 7,
      maxAgeDays: 365,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: 1,
    },
    assistant_actions: {
      family: "assistant_actions",
      envPrefix: "RETENTION_ASSISTANT_ACTIONS_",
      tables: [
        table("assistant_action_undo_items", "created_at", "all", ["created_at", "id"]),
        table("assistant_action_executions", "created_at", "all", ["created_at", "id"]),
      ],
      defaultEnabled: true,
      defaultAgeDays: 180,
      minAgeDays: 30,
      maxAgeDays: 730,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    analytics: {
      family: "analytics",
      envPrefix: null,
      tables: [
        table("analytics_pageviews", "created_at", "all", ["created_at", "id"]),
        table("analytics_sessions", "last_seen_at", "all", ["last_seen_at", "id"]),
      ],
      defaultEnabled: true,
      defaultAgeDays: 365,
      minAgeDays: 30,
      maxAgeDays: 1095,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    form_submissions: {
      family: "form_submissions",
      envPrefix: "RETENTION_FORM_SUBMISSIONS_",
      tables: [
        table("form_action_runs", "created_at", "all", ["created_at", "id"]),
        table("form_submissions", "created_at", "all", ["created_at", "id"]),
      ],
      defaultEnabled: false,
      defaultAgeDays: 365,
      minAgeDays: 1,
      maxAgeDays: 3650,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    webhook_deliveries: {
      family: "webhook_deliveries",
      envPrefix: "RETENTION_WEBHOOK_DELIVERIES_",
      tables: [
        table("webhook_deliveries", "created_at", "terminal_deliveries_only", ["created_at", "id"]),
      ],
      defaultEnabled: true,
      defaultAgeDays: 30,
      minAgeDays: 1,
      maxAgeDays: 365,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    sessions: {
      family: "sessions",
      envPrefix: "RETENTION_SESSIONS_",
      tables: [table("sessions", "expires_at", "expired_or_revoked_only", ["expires_at", "id"])],
      defaultEnabled: true,
      defaultAgeDays: 30,
      minAgeDays: 1,
      maxAgeDays: 365,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
    solution_kit_runs: {
      family: "solution_kit_runs",
      envPrefix: "RETENTION_SOLUTION_KIT_RUNS_",
      tables: [
        table("solution_kit_legacy_rollback_progress", null, "all", ["id"]),
        table("solution_kit_install_items", null, "all", ["id"]),
        table("solution_kit_starter_apply_owners", null, "all", ["id"]),
        table("solution_kit_legacy_template_evidence", null, "all", ["id"]),
        table("solution_kit_install_runs", "created_at", "all", ["created_at", "id"]),
      ],
      defaultEnabled: false,
      defaultAgeDays: 365,
      minAgeDays: 30,
      maxAgeDays: 3650,
      keepNewestPerUser: null,
      preserveNewestSuccessfulPerSource: null,
    },
  });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const property of Object.values(value as Record<string, unknown>)) {
      deepFreeze(property);
    }
    Object.freeze(value);
  }
  return value;
}

export function isRetentionFamily(value: unknown): value is RetentionFamily {
  return (
    typeof value === "string" && Object.prototype.hasOwnProperty.call(RETENTION_FAMILY_SPECS, value)
  );
}

export function getRetentionFamilySpec(family: RetentionFamily): RetentionFamilySpec {
  if (!isRetentionFamily(family)) fail("family_unknown");
  return RETENTION_FAMILY_SPECS[family];
}

export type FamilyBounds = Readonly<{
  family: RetentionFamily;
  defaultEnabled: boolean;
  defaultAgeDays: number;
  minAgeDays: number;
  maxAgeDays: number;
}>;

export function getRetentionFamilyBounds(family: RetentionFamily): FamilyBounds {
  const spec = getRetentionFamilySpec(family);
  return Object.freeze({
    family: spec.family,
    defaultEnabled: spec.defaultEnabled,
    defaultAgeDays: spec.defaultAgeDays,
    minAgeDays: spec.minAgeDays,
    maxAgeDays: spec.maxAgeDays,
  });
}

/**
 * Self-check over the encoded matrix: bounds sane, orders end with `id ASC`,
 * no family re-lists a table. Exported so the pure suite can pin the table as
 * data, not restate it.
 */
export function assertRetentionFamilySpecInvariants(): void {
  const seenTables = new Set<string>();
  for (const family of RETENTION_FAMILY_ORDER) {
    const spec = RETENTION_FAMILY_SPECS[family];
    if (spec.family !== family) fail("spec_family_mismatch");
    if (spec.minAgeDays > spec.defaultAgeDays) fail("spec_bounds_invalid");
    if (spec.defaultAgeDays > spec.maxAgeDays) fail("spec_bounds_invalid");
    if (spec.tables.length === 0) fail("spec_tables_empty");
    for (const entry of spec.tables) {
      if (seenTables.has(entry.table)) fail("spec_table_duplicated");
      seenTables.add(entry.table);
      if (entry.orderBy.length === 0) fail("spec_order_empty");
      const last = entry.orderBy[entry.orderBy.length - 1];
      if (last.column !== "id" || last.direction !== "asc") fail("spec_order_invalid");
      for (const order of entry.orderBy) {
        if (order.direction !== "asc") fail("spec_order_invalid");
      }
    }
  }
}

// ---------------------------------------------------------------------------
// RetentionPolicy — the typed unit L03 and every family service consume
// ---------------------------------------------------------------------------

export type RetentionPolicy = Readonly<{
  family: RetentionFamily;
  enabled: boolean;
  /** Sole source: strict `RETENTION_DRY_RUN`; never family- or CLI-overridable. */
  dryRun: boolean;
  maxAgeDays: number;
  /** Default 500, max 2_000. */
  batchSize: number;
  /** Default 10, max 100. */
  maxBatchesPerRun: number;
}>;

const RETENTION_POLICY_INPUT_KEYS: readonly string[] = [
  "family",
  "enabled",
  "dryRun",
  "maxAgeDays",
  "batchSize",
  "maxBatchesPerRun",
];

/**
 * Normalize a raw policy candidate against one family's bounds. Exact keys
 * only, no coercion, no clamping: an out-of-range or non-integer age, batch
 * size or batch count rejects with `retention_policy_invalid`.
 */
export function normalizeRetentionPolicy(input: unknown, bounds: FamilyBounds): RetentionPolicy {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("policy_input_invalid");
  }
  const record = input as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(record)) {
    if (!RETENTION_POLICY_INPUT_KEYS.includes(key)) fail("policy_input_invalid");
  }
  if (record.family !== bounds.family) fail("family_unknown");
  const family = normalizeFamily(record.family);
  return Object.freeze({
    family,
    enabled: normalizeBooleanValue(record.enabled, "policy_enabled_invalid"),
    dryRun: normalizeBooleanValue(record.dryRun, "policy_dry_run_invalid"),
    maxAgeDays: normalizeIntegerValue(
      record.maxAgeDays,
      bounds.minAgeDays,
      bounds.maxAgeDays,
      "policy_age_invalid"
    ),
    batchSize: normalizeIntegerValue(
      record.batchSize,
      RETENTION_BATCH_SIZE_MIN,
      RETENTION_BATCH_SIZE_MAX,
      "policy_batch_size_invalid"
    ),
    maxBatchesPerRun: normalizeIntegerValue(
      record.maxBatchesPerRun,
      RETENTION_MAX_BATCHES_PER_RUN_MIN,
      RETENTION_MAX_BATCHES_PER_RUN_MAX,
      "policy_max_batches_invalid"
    ),
  });
}

function normalizeFamily(value: unknown): RetentionFamily {
  if (!isRetentionFamily(value)) fail("family_unknown");
  return value;
}

// ---------------------------------------------------------------------------
// Canonical analytics age (legacy compatibility, preserved byte-for-byte)
// ---------------------------------------------------------------------------

export const ANALYTICS_RETENTION_DAYS_ENV = "ANALYTICS_RETENTION_DAYS";
export const ANALYTICS_RETENTION_DAYS_DEFAULT = 365;
export const ANALYTICS_RETENTION_DAYS_MIN = 30;
export const ANALYTICS_RETENTION_DAYS_MAX = 1095;

export const RETENTION_ANALYTICS_ENABLED_ENV = "RETENTION_ANALYTICS_ENABLED";

/** Unsupported age aliases; rejected even beside the canonical variable. */
export const UNSUPPORTED_RETENTION_ANALYTICS_AGE_ALIASES = Object.freeze([
  "RETENTION_ANALYTICS_DAYS",
  "RETENTION_ANALYTICS_MAX_AGE_DAYS",
]);

/**
 * The legacy analytics age parser, preserved in outcome from the removed
 * inline gate: `Number(raw)` is evaluated first, so absent or a non-finite
 * result resolves to 365, while a finite result is floored and then clamped to
 * the inclusive `[30, 1095]` window. Fractions, hexadecimal and exponent
 * strings therefore land on their `Number` value, and empty/whitespace strings
 * (which `Number` maps to 0) clamp to 30 — exactly the locked truth table.
 */
export function resolveAnalyticsRetentionDays(env: RuntimeEnv): number {
  const raw = Number(env[ANALYTICS_RETENTION_DAYS_ENV]);
  if (!Number.isFinite(raw)) return ANALYTICS_RETENTION_DAYS_DEFAULT;
  return Math.min(
    Math.max(Math.floor(raw), ANALYTICS_RETENTION_DAYS_MIN),
    ANALYTICS_RETENTION_DAYS_MAX
  );
}

function assertAnalyticsAgeAliasesAbsent(env: RuntimeEnv): void {
  for (const alias of UNSUPPORTED_RETENTION_ANALYTICS_AGE_ALIASES) {
    if (env[alias] !== undefined) fail("analytics_age_alias_rejected");
  }
}

/**
 * Analytics family policy. Age comes only from `ANALYTICS_RETENTION_DAYS`;
 * enablement comes only from `RETENTION_ANALYTICS_ENABLED`; the global knobs
 * (including dry-run) come from the shared owner. Both unsupported age aliases
 * reject, alone or beside the canonical key.
 */
export function loadAnalyticsRetentionPolicy(env: RuntimeEnv): RetentionPolicy {
  assertAnalyticsAgeAliasesAbsent(env);
  const runtime = resolveRetentionRuntimeOptions(env);
  return Object.freeze({
    family: "analytics",
    enabled: parseEnvRetentionBoolean(
      env[RETENTION_ANALYTICS_ENABLED_ENV],
      RETENTION_FAMILY_SPECS.analytics.defaultEnabled,
      "analytics_enabled_invalid"
    ),
    dryRun: runtime.dryRun,
    maxAgeDays: resolveAnalyticsRetentionDays(env),
    batchSize: runtime.batchSize,
    maxBatchesPerRun: runtime.maxBatchesPerRun,
  });
}

// ---------------------------------------------------------------------------
// Family loading
// ---------------------------------------------------------------------------

const familyEnabledKey = (spec: RetentionFamilySpec): string => {
  if (spec.envPrefix === null) return RETENTION_ANALYTICS_ENABLED_ENV;
  return `${spec.envPrefix}ENABLED`;
};

const familyAgeKey = (spec: RetentionFamilySpec): string => {
  if (spec.envPrefix === null) return ANALYTICS_RETENTION_DAYS_ENV;
  return `${spec.envPrefix}DAYS`;
};

/**
 * Load one family's policy from the injected environment. Every family
 * inherits the same parsed-once global runtime; a family can only turn itself
 * on/off and move its own age inside its bounds — never the batch shape, never
 * the global dry-run.
 */
export function loadRetentionFamilyPolicy(
  family: RetentionFamily,
  env: RuntimeEnv
): RetentionPolicy {
  const spec = getRetentionFamilySpec(family);
  if (family === "analytics") return loadAnalyticsRetentionPolicy(env);
  const runtime = resolveRetentionRuntimeOptions(env);
  return Object.freeze({
    family,
    enabled: parseEnvRetentionBoolean(
      env[familyEnabledKey(spec)],
      spec.defaultEnabled,
      "family_enabled_invalid"
    ),
    dryRun: runtime.dryRun,
    maxAgeDays: parseEnvBoundedInteger(
      env[familyAgeKey(spec)],
      spec.defaultAgeDays,
      spec.minAgeDays,
      spec.maxAgeDays,
      "family_age_invalid"
    ),
    batchSize: runtime.batchSize,
    maxBatchesPerRun: runtime.maxBatchesPerRun,
  });
}

export function loadRetentionPolicies(
  env: RuntimeEnv
): Readonly<Record<RetentionFamily, RetentionPolicy>> {
  const policies = {} as Record<RetentionFamily, RetentionPolicy>;
  for (const family of RETENTION_FAMILY_ORDER) {
    policies[family] = loadRetentionFamilyPolicy(family, env);
  }
  return Object.freeze(policies);
}

// ---------------------------------------------------------------------------
// Unsupported-key sweep — no family or CLI alias, override or rename
// ---------------------------------------------------------------------------

const SUPPORTED_RETENTION_ENV_KEYS: ReadonlySet<string> = new Set<string>([
  RETENTION_BATCH_SIZE_ENV,
  RETENTION_MAX_BATCHES_PER_RUN_ENV,
  RETENTION_DRY_RUN_ENV,
  ...RETENTION_FAMILY_ORDER.flatMap((family) => {
    const spec = RETENTION_FAMILY_SPECS[family];
    return spec.envPrefix === null
      ? [RETENTION_ANALYTICS_ENABLED_ENV]
      : [`${spec.envPrefix}ENABLED`, `${spec.envPrefix}DAYS`];
  }),
]);

/**
 * Reject any `RETENTION_`-prefixed key outside the supported set. This is what
 * makes the global dry-run unoverridable (a family-scoped `*_DRY_RUN` key is
 * unsupported) and what rejects both unsupported analytics age aliases —
 * including when the canonical variable is also present. Only the stable code
 * surfaces; the offending key and value never do.
 */
export function assertNoUnsupportedRetentionEnvKeys(env: RuntimeEnv): void {
  for (const key of Object.keys(env)) {
    if (!key.startsWith("RETENTION_")) continue;
    if (SUPPORTED_RETENTION_ENV_KEYS.has(key)) continue;
    fail("unsupported_retention_env_key");
  }
}

// ---------------------------------------------------------------------------
// Deprecated analytics inline flags — warning-once no-ops
// ---------------------------------------------------------------------------

export const ANALYTICS_PRUNE_INLINE_DISABLED_ENV = "ANALYTICS_PRUNE_INLINE_DISABLED";
export const ANALYTICS_PRUNE_INLINE_ENABLED_ENV = "ANALYTICS_PRUNE_INLINE_ENABLED";

export const ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING =
  "analytics_prune_inline_disabled_deprecated";
export const ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING =
  "analytics_prune_inline_enabled_deprecated";

/**
 * Pure collector: which deprecated inline keys are present, in the fixed
 * `DISABLED` then `ENABLED` order. Any present string counts — including an
 * empty or formerly malformed one — because inline pruning is removed
 * unconditionally and the key can no longer change behavior.
 */
export function collectDeprecatedAnalyticsInlineWarningTokens(env: RuntimeEnv): readonly string[] {
  const tokens: string[] = [];
  if (env[ANALYTICS_PRUNE_INLINE_DISABLED_ENV] !== undefined) {
    tokens.push(ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING);
  }
  if (env[ANALYTICS_PRUNE_INLINE_ENABLED_ENV] !== undefined) {
    tokens.push(ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING);
  }
  return Object.freeze(tokens);
}

const deprecatedInlineWarningsEmitted = new Set<string>();

/**
 * Emit each present deprecated key's exact warning token at most once per key
 * per process. The callback receives only the token — never the raw key value
 * — so no value can reach logs. Neither key ever rejects startup or alters
 * age/enablement/dry-run; both present yield exactly two warnings.
 */
export function emitDeprecatedAnalyticsInlineWarningsOnce(
  env: RuntimeEnv,
  warn: (token: string) => void
): void {
  for (const token of collectDeprecatedAnalyticsInlineWarningTokens(env)) {
    if (deprecatedInlineWarningsEmitted.has(token)) continue;
    deprecatedInlineWarningsEmitted.add(token);
    warn(token);
  }
}

export function __resetDeprecatedAnalyticsInlineWarningsForTests(): void {
  deprecatedInlineWarningsEmitted.clear();
}

/**
 * Retention initialization: sweep unsupported keys, emit the deprecated
 * warnings once, and return every family's frozen policy. This is the one
 * entry point L03's scheduler startup uses; per-request and per-batch paths
 * read the already-loaded policies and never re-emit warnings.
 */
export function initializeRetentionPolicies(
  env: RuntimeEnv,
  warn?: (token: string) => void
): Readonly<Record<RetentionFamily, RetentionPolicy>> {
  assertNoUnsupportedRetentionEnvKeys(env);
  if (warn) emitDeprecatedAnalyticsInlineWarningsOnce(env, warn);
  return loadRetentionPolicies(env);
}

// ---------------------------------------------------------------------------
// Cutoff math
// ---------------------------------------------------------------------------

/**
 * `now - age` in whole days. Consumers compare `column < cutoff`, so a row
 * exactly at the cutoff is retained — the boundary is never pruned.
 */
export function computeRetentionCutoff(now: Date, maxAgeDays: number): Date {
  if (!Number.isSafeInteger(maxAgeDays) || maxAgeDays < 0) fail("cutoff_age_invalid");
  return new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
}

/** True only when the value is strictly older than the cutoff. */
export function isEligibleForRetentionCutoff(value: Date, cutoff: Date): boolean {
  return value.getTime() < cutoff.getTime();
}

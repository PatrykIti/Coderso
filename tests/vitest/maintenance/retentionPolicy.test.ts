import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING,
  ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING,
  RETENTION_BATCH_SIZE_DEFAULT,
  RETENTION_BATCH_SIZE_MAX,
  RETENTION_BATCH_SIZE_MIN,
  RETENTION_DRY_RUN_ENV,
  RETENTION_FAMILY_ORDER,
  RETENTION_FAMILY_SPECS,
  RETENTION_MAX_BATCHES_PER_RUN_DEFAULT,
  RETENTION_MAX_BATCHES_PER_RUN_MAX,
  RETENTION_MAX_BATCHES_PER_RUN_MIN,
  RETENTION_POLICY_ERROR_CODE,
  RetentionPolicyError,
  assertNoUnsupportedRetentionEnvKeys,
  assertRetentionFamilySpecInvariants,
  collectDeprecatedAnalyticsInlineWarningTokens,
  computeRetentionCutoff,
  emitDeprecatedAnalyticsInlineWarningsOnce,
  getRetentionFamilyBounds,
  getRetentionFamilySpec,
  initializeRetentionPolicies,
  isEligibleForRetentionCutoff,
  isRetentionFamily,
  loadAnalyticsRetentionPolicy,
  loadRetentionFamilyPolicy,
  loadRetentionPolicies,
  normalizeRetentionPolicy,
  resolveAnalyticsRetentionDays,
  resolveRetentionBatchSize,
  resolveRetentionDryRun,
  resolveRetentionMaxBatchesPerRun,
  resolveRetentionRuntimeOptions,
  __resetDeprecatedAnalyticsInlineWarningsForTests,
} from "../../../core/services/maintenance/retentionPolicy";

const EMPTY_ENV: Readonly<Record<string, string | undefined>> = Object.freeze({});

const expectPolicyInvalid = (run: () => unknown, reason?: string): void => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RetentionPolicyError);
    expect((error as RetentionPolicyError).code).toBe(RETENTION_POLICY_ERROR_CODE);
    expect((error as RetentionPolicyError).message).toContain(RETENTION_POLICY_ERROR_CODE);
    if (reason) expect((error as RetentionPolicyError).reason).toBe(reason);
    return;
  }
  throw new Error(`expected ${RETENTION_POLICY_ERROR_CODE}`);
};

// ---------------------------------------------------------------------------
// Global knobs
// ---------------------------------------------------------------------------

describe("global knobs", () => {
  test("defaults are 500 rows per batch, 10 batches per run, dry-run off", () => {
    const runtime = resolveRetentionRuntimeOptions(EMPTY_ENV);
    expect(runtime).toEqual({
      batchSize: 500,
      maxBatchesPerRun: 10,
      dryRun: false,
    });
    expect(RETENTION_BATCH_SIZE_DEFAULT).toBe(500);
    expect(RETENTION_MAX_BATCHES_PER_RUN_DEFAULT).toBe(10);
    expect(resolveRetentionBatchSize(EMPTY_ENV)).toBe(500);
    expect(resolveRetentionMaxBatchesPerRun(EMPTY_ENV)).toBe(10);
    expect(resolveRetentionDryRun(EMPTY_ENV)).toBe(false);
  });

  test.each([[1], [500], [2_000]])("accepts batch size %i", (value) => {
    expect(resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: String(value) })).toBe(value);
  });

  test.each([[0], [-1], [2_001], [30_000]])("rejects batch size %i", (value) => {
    expectPolicyInvalid(
      () => resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: String(value) }),
      "batch_size_invalid"
    );
  });

  test.each([[1], [10], [100]])("accepts max batches per run %i", (value) => {
    expect(resolveRetentionMaxBatchesPerRun({ RETENTION_MAX_BATCHES_PER_RUN: String(value) })).toBe(
      value
    );
  });

  test.each([[0], [-1], [101]])("rejects max batches per run %i", (value) => {
    expectPolicyInvalid(
      () =>
        resolveRetentionMaxBatchesPerRun({
          RETENTION_MAX_BATCHES_PER_RUN: String(value),
        }),
      "max_batches_per_run_invalid"
    );
  });

  test("bound constants bracket every family age bound", () => {
    expect(RETENTION_BATCH_SIZE_MIN).toBe(1);
    expect(RETENTION_BATCH_SIZE_MAX).toBe(2_000);
    expect(RETENTION_MAX_BATCHES_PER_RUN_MIN).toBe(1);
    expect(RETENTION_MAX_BATCHES_PER_RUN_MAX).toBe(100);
  });

  test("an empty knob value is absent and resolves to the default", () => {
    expect(resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: "" })).toBe(500);
    expect(resolveRetentionMaxBatchesPerRun({ RETENTION_MAX_BATCHES_PER_RUN: "" })).toBe(10);
  });

  test("rejects non-canonical integer spellings instead of coercing them", () => {
    for (const raw of [" ", " 500", "500 ", "01", "1.0", "5e2", "0x1f4", "abc"]) {
      expectPolicyInvalid(
        () => resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: raw }),
        "batch_size_invalid"
      );
      expectPolicyInvalid(
        () => resolveRetentionMaxBatchesPerRun({ RETENTION_MAX_BATCHES_PER_RUN: raw }),
        "max_batches_per_run_invalid"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// RETENTION_DRY_RUN — strict, global, unoverridable
// ---------------------------------------------------------------------------

describe("RETENTION_DRY_RUN", () => {
  test("absent resolves to false", () => {
    expect(resolveRetentionDryRun(EMPTY_ENV)).toBe(false);
  });

  test("accepts exactly the lowercase strings true and false", () => {
    expect(resolveRetentionDryRun({ [RETENTION_DRY_RUN_ENV]: "true" })).toBe(true);
    expect(resolveRetentionDryRun({ [RETENTION_DRY_RUN_ENV]: "false" })).toBe(false);
  });

  test.each(["", " ", "  true", "TRUE", "True", "FALSE", "1", "0", "yes", "on", "null"])(
    "rejects the noncanonical value %j",
    (raw) => {
      expectPolicyInvalid(
        () => resolveRetentionDryRun({ [RETENTION_DRY_RUN_ENV]: raw }),
        "dry_run_invalid"
      );
    }
  );

  test("a global true propagates to every family and cannot be overridden", () => {
    const env: Record<string, string> = {
      [RETENTION_DRY_RUN_ENV]: "true",
      RETENTION_ACCESS_LOGS_ENABLED: "true",
      RETENTION_ACCESS_LOGS_DAYS: "7",
      RETENTION_FORM_SUBMISSIONS_ENABLED: "true",
      RETENTION_FORM_SUBMISSIONS_DAYS: "3650",
      RETENTION_SOLUTION_KIT_RUNS_ENABLED: "true",
      RETENTION_ANALYTICS_ENABLED: "true",
      ANALYTICS_RETENTION_DAYS: "1095",
    };
    const policies = loadRetentionPolicies(env);
    for (const family of RETENTION_FAMILY_ORDER) {
      expect(policies[family].dryRun).toBe(true);
      expect(policies[family].batchSize).toBe(500);
      expect(policies[family].maxBatchesPerRun).toBe(10);
    }
    expect(policies.analytics.maxAgeDays).toBe(1095);
    expect(policies.form_submissions.maxAgeDays).toBe(3650);
  });

  test("a family-scoped dry-run key is an unsupported alias, not an override", () => {
    expectPolicyInvalid(() =>
      assertNoUnsupportedRetentionEnvKeys({
        RETENTION_ACCESS_LOGS_DRY_RUN: "false",
      })
    );
    expectPolicyInvalid(() =>
      initializeRetentionPolicies({
        RETENTION_DRY_RUN: "true",
        RETENTION_SESSIONS_DRY_RUN: "false",
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Family matrix — the leaf's policy table, pinned as data
// ---------------------------------------------------------------------------

type FamilyExpectation = {
  family: string;
  envPrefix: string | null;
  enabledKey: string;
  ageKey: string;
  defaultEnabled: boolean;
  defaultAgeDays: number;
  minAgeDays: number;
  maxAgeDays: number;
  tables: readonly string[];
  cutoffColumns: readonly (string | null)[];
  rowFilters: readonly string[];
  orderColumns: readonly (readonly string[])[];
};

const FAMILY_MATRIX: readonly FamilyExpectation[] = [
  {
    family: "access_logs",
    envPrefix: "RETENTION_ACCESS_LOGS_",
    enabledKey: "RETENTION_ACCESS_LOGS_ENABLED",
    ageKey: "RETENTION_ACCESS_LOGS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 90,
    minAgeDays: 7,
    maxAgeDays: 365,
    tables: ["access_logs"],
    cutoffColumns: ["created_at"],
    rowFilters: ["all"],
    orderColumns: [["created_at", "id"]],
  },
  {
    family: "audit_logs",
    envPrefix: "RETENTION_AUDIT_LOGS_",
    enabledKey: "RETENTION_AUDIT_LOGS_ENABLED",
    ageKey: "RETENTION_AUDIT_LOGS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 365,
    minAgeDays: 30,
    maxAgeDays: 2555,
    tables: ["audit_logs"],
    cutoffColumns: ["created_at"],
    rowFilters: ["all"],
    orderColumns: [["created_at", "id"]],
  },
  {
    family: "email_delivery_logs",
    envPrefix: "RETENTION_EMAIL_DELIVERY_LOGS_",
    enabledKey: "RETENTION_EMAIL_DELIVERY_LOGS_ENABLED",
    ageKey: "RETENTION_EMAIL_DELIVERY_LOGS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 90,
    minAgeDays: 7,
    maxAgeDays: 365,
    tables: ["email_delivery_logs"],
    cutoffColumns: ["created_at"],
    rowFilters: ["all"],
    orderColumns: [["created_at", "id"]],
  },
  {
    family: "search_history",
    envPrefix: "RETENTION_SEARCH_HISTORY_",
    enabledKey: "RETENTION_SEARCH_HISTORY_ENABLED",
    ageKey: "RETENTION_SEARCH_HISTORY_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 90,
    minAgeDays: 7,
    maxAgeDays: 365,
    tables: ["search_history"],
    cutoffColumns: ["created_at"],
    rowFilters: ["all"],
    orderColumns: [["created_at", "id"]],
  },
  {
    family: "integration_requests",
    envPrefix: "RETENTION_INTEGRATION_REQUESTS_",
    enabledKey: "RETENTION_INTEGRATION_REQUESTS_ENABLED",
    ageKey: "RETENTION_INTEGRATION_REQUESTS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 90,
    minAgeDays: 7,
    maxAgeDays: 365,
    tables: ["integration_requests"],
    cutoffColumns: ["created_at"],
    rowFilters: ["all"],
    orderColumns: [["created_at", "id"]],
  },
  {
    family: "password_resets",
    envPrefix: "RETENTION_PASSWORD_RESETS_",
    enabledKey: "RETENTION_PASSWORD_RESETS_ENABLED",
    ageKey: "RETENTION_PASSWORD_RESETS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 7,
    minAgeDays: 1,
    maxAgeDays: 30,
    tables: ["password_resets"],
    cutoffColumns: ["expires_at"],
    rowFilters: ["expired_only"],
    orderColumns: [["expires_at", "id"]],
  },
  {
    family: "preview_tokens",
    envPrefix: "RETENTION_PREVIEW_TOKENS_",
    enabledKey: "RETENTION_PREVIEW_TOKENS_ENABLED",
    ageKey: "RETENTION_PREVIEW_TOKENS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 1,
    minAgeDays: 1,
    maxAgeDays: 30,
    tables: ["preview_tokens", "post_preview_tokens"],
    cutoffColumns: ["expires_at", "expires_at"],
    rowFilters: ["expired_only", "expired_only"],
    orderColumns: [
      ["expires_at", "id"],
      ["expires_at", "id"],
    ],
  },
  {
    family: "assistant_ingest_runs",
    envPrefix: "RETENTION_ASSISTANT_INGEST_RUNS_",
    enabledKey: "RETENTION_ASSISTANT_INGEST_RUNS_ENABLED",
    ageKey: "RETENTION_ASSISTANT_INGEST_RUNS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 90,
    minAgeDays: 7,
    maxAgeDays: 365,
    tables: ["assistant_doc_ingest_runs"],
    cutoffColumns: ["started_at"],
    rowFilters: ["all"],
    orderColumns: [["started_at", "id"]],
  },
  {
    family: "assistant_actions",
    envPrefix: "RETENTION_ASSISTANT_ACTIONS_",
    enabledKey: "RETENTION_ASSISTANT_ACTIONS_ENABLED",
    ageKey: "RETENTION_ASSISTANT_ACTIONS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 180,
    minAgeDays: 30,
    maxAgeDays: 730,
    tables: ["assistant_action_undo_items", "assistant_action_executions"],
    cutoffColumns: ["created_at", "created_at"],
    rowFilters: ["all", "all"],
    orderColumns: [
      ["created_at", "id"],
      ["created_at", "id"],
    ],
  },
  {
    family: "analytics",
    envPrefix: null,
    enabledKey: "RETENTION_ANALYTICS_ENABLED",
    ageKey: "ANALYTICS_RETENTION_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 365,
    minAgeDays: 30,
    maxAgeDays: 1095,
    tables: ["analytics_pageviews", "analytics_sessions"],
    cutoffColumns: ["created_at", "last_seen_at"],
    rowFilters: ["all", "all"],
    orderColumns: [
      ["created_at", "id"],
      ["last_seen_at", "id"],
    ],
  },
  {
    family: "form_submissions",
    envPrefix: "RETENTION_FORM_SUBMISSIONS_",
    enabledKey: "RETENTION_FORM_SUBMISSIONS_ENABLED",
    ageKey: "RETENTION_FORM_SUBMISSIONS_DAYS",
    defaultEnabled: false,
    defaultAgeDays: 365,
    minAgeDays: 1,
    maxAgeDays: 3650,
    tables: ["form_action_runs", "form_submissions"],
    cutoffColumns: ["created_at", "created_at"],
    rowFilters: ["all", "all"],
    orderColumns: [
      ["created_at", "id"],
      ["created_at", "id"],
    ],
  },
  {
    family: "webhook_deliveries",
    envPrefix: "RETENTION_WEBHOOK_DELIVERIES_",
    enabledKey: "RETENTION_WEBHOOK_DELIVERIES_ENABLED",
    ageKey: "RETENTION_WEBHOOK_DELIVERIES_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 30,
    minAgeDays: 1,
    maxAgeDays: 365,
    tables: ["webhook_deliveries"],
    cutoffColumns: ["created_at"],
    rowFilters: ["terminal_deliveries_only"],
    orderColumns: [["created_at", "id"]],
  },
  {
    family: "sessions",
    envPrefix: "RETENTION_SESSIONS_",
    enabledKey: "RETENTION_SESSIONS_ENABLED",
    ageKey: "RETENTION_SESSIONS_DAYS",
    defaultEnabled: true,
    defaultAgeDays: 30,
    minAgeDays: 1,
    maxAgeDays: 365,
    tables: ["sessions"],
    cutoffColumns: ["expires_at"],
    rowFilters: ["expired_or_revoked_only"],
    orderColumns: [["expires_at", "id"]],
  },
  {
    family: "solution_kit_runs",
    envPrefix: "RETENTION_SOLUTION_KIT_RUNS_",
    enabledKey: "RETENTION_SOLUTION_KIT_RUNS_ENABLED",
    ageKey: "RETENTION_SOLUTION_KIT_RUNS_DAYS",
    defaultEnabled: false,
    defaultAgeDays: 365,
    minAgeDays: 30,
    maxAgeDays: 3650,
    tables: [
      "solution_kit_legacy_rollback_progress",
      "solution_kit_install_items",
      "solution_kit_starter_apply_owners",
      "solution_kit_legacy_template_evidence",
      "solution_kit_install_runs",
    ],
    cutoffColumns: [null, null, null, null, "created_at"],
    rowFilters: ["all", "all", "all", "all", "all"],
    orderColumns: [["id"], ["id"], ["id"], ["id"], ["created_at", "id"]],
  },
];

describe("family policy matrix", () => {
  test("enumerates exactly the matrix families, in matrix order", () => {
    expect(RETENTION_FAMILY_ORDER).toEqual(FAMILY_MATRIX.map((row) => row.family));
    expect(isRetentionFamily("access_logs")).toBe(true);
    expect(isRetentionFamily("content_revisions")).toBe(false);
    expect(isRetentionFamily("backups")).toBe(false);
    expect(isRetentionFamily(42)).toBe(false);
  });

  test.each(FAMILY_MATRIX.map((row) => [row.family, row] as const))(
    "%s pins its prefix, bounds, tables, cutoff columns and delete order",
    (_family, row) => {
      const spec = getRetentionFamilySpec(row.family as never);
      expect(spec.envPrefix).toBe(row.envPrefix);
      expect(spec.defaultEnabled).toBe(row.defaultEnabled);
      expect(spec.defaultAgeDays).toBe(row.defaultAgeDays);
      expect(spec.minAgeDays).toBe(row.minAgeDays);
      expect(spec.maxAgeDays).toBe(row.maxAgeDays);
      expect(spec.tables.map((entry) => entry.table)).toEqual(row.tables);
      expect(spec.tables.map((entry) => entry.cutoffColumn)).toEqual(row.cutoffColumns);
      expect(spec.tables.map((entry) => entry.rowFilter)).toEqual(row.rowFilters);
      expect(spec.tables.map((entry) => entry.orderBy.map((order) => order.column))).toEqual(
        row.orderColumns
      );
      for (const entry of spec.tables) {
        for (const order of entry.orderBy) expect(order.direction).toBe("asc");
        expect(entry.orderBy[entry.orderBy.length - 1].column).toBe("id");
      }
      expect(getRetentionFamilyBounds(row.family as never)).toEqual({
        family: row.family,
        defaultEnabled: row.defaultEnabled,
        defaultAgeDays: row.defaultAgeDays,
        minAgeDays: row.minAgeDays,
        maxAgeDays: row.maxAgeDays,
      });
    }
  );

  test("family spec constants stay pinned", () => {
    expect(RETENTION_FAMILY_SPECS.search_history.keepNewestPerUser).toBe(10);
    expect(RETENTION_FAMILY_SPECS.assistant_ingest_runs.preserveNewestSuccessfulPerSource).toBe(1);
    for (const family of RETENTION_FAMILY_ORDER) {
      expect(RETENTION_FAMILY_SPECS[family].keepNewestPerUser === null).toBe(
        family !== "search_history"
      );
    }
  });

  test("the encoded matrix satisfies its structural invariants", () => {
    expect(() => assertRetentionFamilySpecInvariants()).not.toThrow();
  });

  test("the matrix is deep-frozen", () => {
    expect(Object.isFrozen(RETENTION_FAMILY_SPECS)).toBe(true);
    expect(Object.isFrozen(RETENTION_FAMILY_SPECS.preview_tokens.tables)).toBe(true);
    expect(Object.isFrozen(RETENTION_FAMILY_SPECS.analytics.tables[0].orderBy)).toBe(true);
    expect(Object.isFrozen(RETENTION_FAMILY_SPECS.analytics.tables[0].orderBy[0])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Family loading — enablement and bounded ages
// ---------------------------------------------------------------------------

describe("family policy loading", () => {
  test("defaults follow the matrix, including the disabled legal/business families", () => {
    const policies = loadRetentionPolicies(EMPTY_ENV);
    expect(policies.access_logs).toEqual({
      family: "access_logs",
      enabled: true,
      dryRun: false,
      maxAgeDays: 90,
      batchSize: 500,
      maxBatchesPerRun: 10,
    });
    expect(policies.form_submissions.enabled).toBe(false);
    expect(policies.form_submissions.maxAgeDays).toBe(365);
    expect(policies.solution_kit_runs.enabled).toBe(false);
    expect(policies.solution_kit_runs.maxAgeDays).toBe(365);
    expect(policies.webhook_deliveries.maxAgeDays).toBe(30);
    expect(policies.sessions.maxAgeDays).toBe(30);
    expect(policies.assistant_actions.maxAgeDays).toBe(180);
    expect(Object.isFrozen(policies.access_logs)).toBe(true);
  });

  test("an explicit enablement flag turns a disabled family on and back off", () => {
    expect(
      loadRetentionFamilyPolicy("form_submissions", { RETENTION_FORM_SUBMISSIONS_ENABLED: "true" })
        .enabled
    ).toBe(true);
    expect(
      loadRetentionFamilyPolicy("solution_kit_runs", {
        RETENTION_SOLUTION_KIT_RUNS_ENABLED: "true",
      }).enabled
    ).toBe(true);
    expect(
      loadRetentionFamilyPolicy("access_logs", { RETENTION_ACCESS_LOGS_ENABLED: "false" }).enabled
    ).toBe(false);
  });

  test("enablement flags use the same strict boolean grammar", () => {
    for (const raw of ["", " ", "TRUE", "1", "0", "yes"]) {
      expectPolicyInvalid(
        () => loadRetentionFamilyPolicy("access_logs", { RETENTION_ACCESS_LOGS_ENABLED: raw }),
        "family_enabled_invalid"
      );
    }
  });

  test("ages resolve at the bounds and reject explicit out-of-range values", () => {
    const env: Record<string, string> = {
      RETENTION_ACCESS_LOGS_DAYS: "7",
      RETENTION_AUDIT_LOGS_DAYS: "2555",
      RETENTION_EMAIL_DELIVERY_LOGS_DAYS: "365",
      RETENTION_SEARCH_HISTORY_DAYS: "90",
      RETENTION_INTEGRATION_REQUESTS_DAYS: "8",
      RETENTION_PASSWORD_RESETS_DAYS: "1",
      RETENTION_PREVIEW_TOKENS_DAYS: "30",
      RETENTION_ASSISTANT_INGEST_RUNS_DAYS: "364",
      RETENTION_ASSISTANT_ACTIONS_DAYS: "730",
      RETENTION_FORM_SUBMISSIONS_DAYS: "3650",
      RETENTION_WEBHOOK_DELIVERIES_DAYS: "1",
      RETENTION_SESSIONS_DAYS: "365",
      RETENTION_SOLUTION_KIT_RUNS_DAYS: "3650",
    };
    const policies = loadRetentionPolicies(env);
    expect(policies.access_logs.maxAgeDays).toBe(7);
    expect(policies.audit_logs.maxAgeDays).toBe(2555);
    expect(policies.email_delivery_logs.maxAgeDays).toBe(365);
    expect(policies.search_history.maxAgeDays).toBe(90);
    expect(policies.integration_requests.maxAgeDays).toBe(8);
    expect(policies.password_resets.maxAgeDays).toBe(1);
    expect(policies.preview_tokens.maxAgeDays).toBe(30);
    expect(policies.assistant_ingest_runs.maxAgeDays).toBe(364);
    expect(policies.assistant_actions.maxAgeDays).toBe(730);
    expect(policies.form_submissions.maxAgeDays).toBe(3650);
    expect(policies.webhook_deliveries.maxAgeDays).toBe(1);
    expect(policies.sessions.maxAgeDays).toBe(365);
    expect(policies.solution_kit_runs.maxAgeDays).toBe(3650);
  });

  test.each([
    ["RETENTION_ACCESS_LOGS_DAYS", "6"],
    ["RETENTION_ACCESS_LOGS_DAYS", "366"],
    ["RETENTION_AUDIT_LOGS_DAYS", "29"],
    ["RETENTION_AUDIT_LOGS_DAYS", "2556"],
    ["RETENTION_PASSWORD_RESETS_DAYS", "0"],
    ["RETENTION_PASSWORD_RESETS_DAYS", "31"],
    ["RETENTION_PREVIEW_TOKENS_DAYS", "0"],
    ["RETENTION_PREVIEW_TOKENS_DAYS", "31"],
    ["RETENTION_ASSISTANT_ACTIONS_DAYS", "29"],
    ["RETENTION_ASSISTANT_ACTIONS_DAYS", "731"],
    ["RETENTION_FORM_SUBMISSIONS_DAYS", "0"],
    ["RETENTION_FORM_SUBMISSIONS_DAYS", "3651"],
    ["RETENTION_WEBHOOK_DELIVERIES_DAYS", "0"],
    ["RETENTION_WEBHOOK_DELIVERIES_DAYS", "366"],
    ["RETENTION_SESSIONS_DAYS", "0"],
    ["RETENTION_SESSIONS_DAYS", "366"],
    ["RETENTION_SOLUTION_KIT_RUNS_DAYS", "29"],
    ["RETENTION_SOLUTION_KIT_RUNS_DAYS", "3651"],
    ["RETENTION_SEARCH_HISTORY_DAYS", "6.5"],
  ])("rejects %s=%s instead of clamping it", (key, raw) => {
    expectPolicyInvalid(() => loadRetentionPolicies({ [key]: raw }), "family_age_invalid");
  });

  test("an unknown family is rejected, not invented", () => {
    expectPolicyInvalid(() => getRetentionFamilySpec("backups" as never), "family_unknown");
  });
});

// ---------------------------------------------------------------------------
// Canonical analytics age — the locked compatibility truth table
// ---------------------------------------------------------------------------

describe("ANALYTICS_RETENTION_DAYS compatibility truth table", () => {
  test.each([
    [undefined, 365],
    ["NaN", 365],
    ["Infinity", 365],
    ["-Infinity", 365],
    ["not-a-number", 365],
    ["1x", 365],
    ["", 30],
    ["   ", 30],
    ["0", 30],
    ["-1", 30],
    ["1.9", 30],
    ["30.9", 30],
    ["0x20", 32],
    ["1e2", 100],
    ["1095.9", 1095],
    ["1096", 1095],
    ["365", 365],
    ["30", 30],
    ["1095", 1095],
    ["31.99", 31],
  ])("raw %j resolves to %i", (raw, expected) => {
    const env = raw === undefined ? EMPTY_ENV : { ANALYTICS_RETENTION_DAYS: raw };
    expect(resolveAnalyticsRetentionDays(env)).toBe(expected);
    expect(loadAnalyticsRetentionPolicy(env).maxAgeDays).toBe(expected);
  });

  test("the family matrix carries the same analytics bounds", () => {
    const spec = getRetentionFamilySpec("analytics");
    expect(spec.defaultAgeDays).toBe(365);
    expect(spec.minAgeDays).toBe(30);
    expect(spec.maxAgeDays).toBe(1095);
    expect(spec.defaultEnabled).toBe(true);
  });

  test("RETENTION_ANALYTICS_ENABLED controls enablement only", () => {
    const enabled = loadAnalyticsRetentionPolicy({ RETENTION_ANALYTICS_ENABLED: "true" });
    const disabled = loadAnalyticsRetentionPolicy({ RETENTION_ANALYTICS_ENABLED: "false" });
    expect(enabled.enabled).toBe(true);
    expect(disabled.enabled).toBe(false);
    expect(disabled.maxAgeDays).toBe(enabled.maxAgeDays);
    expect(disabled.dryRun).toBe(enabled.dryRun);
    expectPolicyInvalid(
      () => loadAnalyticsRetentionPolicy({ RETENTION_ANALYTICS_ENABLED: "1" }),
      "analytics_enabled_invalid"
    );
  });

  test.each([
    [{ RETENTION_ANALYTICS_DAYS: "200" }],
    [{ RETENTION_ANALYTICS_MAX_AGE_DAYS: "200" }],
    [{ RETENTION_ANALYTICS_DAYS: "200", ANALYTICS_RETENTION_DAYS: "400" }],
    [{ ANALYTICS_RETENTION_DAYS: "400", RETENTION_ANALYTICS_MAX_AGE_DAYS: "200" }],
    [{ RETENTION_ANALYTICS_DAYS: "", RETENTION_ANALYTICS_MAX_AGE_DAYS: "" }],
  ])("rejects the unsupported age aliases %j", (env) => {
    expectPolicyInvalid(() => loadAnalyticsRetentionPolicy(env), "analytics_age_alias_rejected");
  });
});

// ---------------------------------------------------------------------------
// Deprecated inline flags — warning-once no-ops
// ---------------------------------------------------------------------------

describe("deprecated analytics inline flags", () => {
  test("absent keys produce no warnings and no rejection", () => {
    expect(collectDeprecatedAnalyticsInlineWarningTokens(EMPTY_ENV)).toEqual([]);
    const warnings: string[] = [];
    initializeRetentionPolicies(EMPTY_ENV, (token) => warnings.push(token));
    expect(warnings).toEqual([]);
  });

  test.each([
    ["ANALYTICS_PRUNE_INLINE_DISABLED", ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING],
    ["ANALYTICS_PRUNE_INLINE_ENABLED", ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING],
  ])("any present string of %s yields exactly its warning token", (key, token) => {
    for (const raw of ["1", "", " ", "0", "garbage", "true"]) {
      expect(collectDeprecatedAnalyticsInlineWarningTokens({ [key]: raw })).toEqual([token]);
    }
  });

  test("both present keys yield exactly two warnings in fixed order", () => {
    const env = {
      ANALYTICS_PRUNE_INLINE_ENABLED: "1",
      ANALYTICS_PRUNE_INLINE_DISABLED: "",
    };
    expect(collectDeprecatedAnalyticsInlineWarningTokens(env)).toEqual([
      ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING,
      ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING,
    ]);
    const warnings: string[] = [];
    initializeRetentionPolicies(env, (token) => warnings.push(token));
    expect(warnings).toEqual([
      ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING,
      ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING,
    ]);
  });

  test("warnings are once per key per process and never repeat on re-initialization", () => {
    __resetDeprecatedAnalyticsInlineWarningsForTests();
    const env = {
      ANALYTICS_PRUNE_INLINE_DISABLED: "1",
      ANALYTICS_PRUNE_INLINE_ENABLED: "1",
    };
    const first: string[] = [];
    const second: string[] = [];
    const third: string[] = [];
    initializeRetentionPolicies(env, (token) => first.push(token));
    initializeRetentionPolicies(env, (token) => second.push(token));
    emitDeprecatedAnalyticsInlineWarningsOnce(env, (token) => third.push(token));
    expect(first).toEqual([
      ANALYTICS_PRUNE_INLINE_DISABLED_DEPRECATED_WARNING,
      ANALYTICS_PRUNE_INLINE_ENABLED_DEPRECATED_WARNING,
    ]);
    expect(second).toEqual([]);
    expect(third).toEqual([]);
    __resetDeprecatedAnalyticsInlineWarningsForTests();
  });

  test("warning tokens never contain the raw key or its value", () => {
    const env = { ANALYTICS_PRUNE_INLINE_DISABLED: "secret-value-42" };
    for (const token of collectDeprecatedAnalyticsInlineWarningTokens(env)) {
      expect(token).not.toContain("secret-value-42");
      expect(token).not.toContain("ANALYTICS_PRUNE_INLINE_DISABLED");
    }
  });

  test("no present value rejects startup or changes scheduled behavior", () => {
    __resetDeprecatedAnalyticsInlineWarningsForTests();
    const baseline = loadAnalyticsRetentionPolicy(EMPTY_ENV);
    const decorated = loadAnalyticsRetentionPolicy({
      ANALYTICS_PRUNE_INLINE_DISABLED: "1",
      ANALYTICS_PRUNE_INLINE_ENABLED: "0",
      RETENTION_DRY_RUN: "false",
    });
    expect(decorated).toEqual(baseline);
    __resetDeprecatedAnalyticsInlineWarningsForTests();
  });
});

// ---------------------------------------------------------------------------
// Unsupported-key sweep
// ---------------------------------------------------------------------------

describe("unsupported RETENTION_ key sweep", () => {
  test("every supported key passes", () => {
    const env: Record<string, string> = { RETENTION_DRY_RUN: "false" };
    for (const family of RETENTION_FAMILY_ORDER) {
      const spec = getRetentionFamilySpec(family);
      if (spec.envPrefix === null) {
        env.RETENTION_ANALYTICS_ENABLED = "true";
        continue;
      }
      env[`${spec.envPrefix}ENABLED`] = "true";
      env[`${spec.envPrefix}DAYS`] = String(spec.defaultAgeDays);
    }
    env.RETENTION_BATCH_SIZE = "500";
    env.RETENTION_MAX_BATCHES_PER_RUN = "10";
    expect(() => assertNoUnsupportedRetentionEnvKeys(env)).not.toThrow();
    expect(() => initializeRetentionPolicies(env)).not.toThrow();
  });

  test.each([
    { RETENTION_DRYRUN: "true" },
    { RETENTION_DRY_RUN_MODE: "true" },
    { RETENTION_BATCHSIZE: "500" },
    { RETENTION_ANALYTICS_DAYS: "90" },
    { RETENTION_ANALYTICS_MAX_AGE_DAYS: "90" },
    { RETENTION_ACCESS_LOGS_DRY_RUN: "false" },
    { RETENTION_WEBHOOK_DELIVERIES_MAX_AGE_DAYS: "30" },
    { RETENTION_UNKNOWN_FAMILY_ENABLED: "true" },
  ])("rejects %j with the stable code only", (env) => {
    expectPolicyInvalid(() => assertNoUnsupportedRetentionEnvKeys(env));
    try {
      assertNoUnsupportedRetentionEnvKeys(env);
    } catch (error) {
      expect((error as RetentionPolicyError).message).not.toContain(String(Object.keys(env)[0]));
    }
  });

  test("non-retention keys are ignored by the sweep", () => {
    expect(() =>
      assertNoUnsupportedRetentionEnvKeys({ ANALYTICS_RETENTION_DAYS: "365", NODE_ENV: "test" })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// normalizeRetentionPolicy
// ---------------------------------------------------------------------------

describe("normalizeRetentionPolicy", () => {
  const bounds = getRetentionFamilyBounds("access_logs");

  const validInput = {
    family: "access_logs",
    enabled: true,
    dryRun: false,
    maxAgeDays: 90,
    batchSize: 500,
    maxBatchesPerRun: 10,
  };

  test("accepts a well-formed policy and freezes the result", () => {
    const policy = normalizeRetentionPolicy(validInput, bounds);
    expect(policy).toEqual(validInput);
    expect(Object.isFrozen(policy)).toBe(true);
  });

  test("rejects unknown fields and missing fields", () => {
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, schedule: "hourly" }, bounds),
      "policy_input_invalid"
    );
    expectPolicyInvalid(() => normalizeRetentionPolicy({}, bounds));
    expectPolicyInvalid(() => normalizeRetentionPolicy(null, bounds));
    expectPolicyInvalid(() => normalizeRetentionPolicy(undefined, bounds));
    expectPolicyInvalid(() => normalizeRetentionPolicy([validInput], bounds));
    expectPolicyInvalid(() => normalizeRetentionPolicy("access_logs", bounds));
  });

  test("rejects a family that is unknown or mismatched with the bounds", () => {
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, family: "sessions" }, bounds),
      "family_unknown"
    );
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, family: "backups" }, bounds),
      "family_unknown"
    );
  });

  test("rejects non-boolean enablement or dry-run without coercion", () => {
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, enabled: "true" }, bounds),
      "policy_enabled_invalid"
    );
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, enabled: 1 }, bounds),
      "policy_enabled_invalid"
    );
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, dryRun: "false" }, bounds),
      "policy_dry_run_invalid"
    );
    expectPolicyInvalid(
      () => normalizeRetentionPolicy({ ...validInput, dryRun: null }, bounds),
      "policy_dry_run_invalid"
    );
  });

  test("rejects non-integer and out-of-range ages without clamping", () => {
    for (const maxAgeDays of [6, 366, 90.5, "90", Number.NaN, Infinity]) {
      expectPolicyInvalid(
        () => normalizeRetentionPolicy({ ...validInput, maxAgeDays }, bounds),
        "policy_age_invalid"
      );
    }
  });

  test("rejects out-of-range batch bounds", () => {
    for (const batchSize of [0, 2_001, 500.5, "500"]) {
      expectPolicyInvalid(
        () => normalizeRetentionPolicy({ ...validInput, batchSize }, bounds),
        "policy_batch_size_invalid"
      );
    }
    for (const maxBatchesPerRun of [0, 101, 10.5, "10"]) {
      expectPolicyInvalid(
        () => normalizeRetentionPolicy({ ...validInput, maxBatchesPerRun }, bounds),
        "policy_max_batches_invalid"
      );
    }
  });

  test("accepts the exact bound edges of its family", () => {
    expect(normalizeRetentionPolicy({ ...validInput, maxAgeDays: 7 }, bounds).maxAgeDays).toBe(7);
    expect(normalizeRetentionPolicy({ ...validInput, maxAgeDays: 365 }, bounds).maxAgeDays).toBe(
      365
    );
    expect(
      normalizeRetentionPolicy({ ...validInput, batchSize: 2_000, maxBatchesPerRun: 100 }, bounds)
    ).toEqual({ ...validInput, batchSize: 2_000, maxBatchesPerRun: 100 });
  });
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("initializeRetentionPolicies", () => {
  test("returns every family with its default policy and no warnings", () => {
    const policies = initializeRetentionPolicies(EMPTY_ENV);
    expect(Object.keys(policies).sort()).toEqual([...RETENTION_FAMILY_ORDER].sort());
    expect(policies.access_logs.enabled).toBe(true);
    expect(policies.form_submissions.enabled).toBe(false);
    expect(policies.analytics.maxAgeDays).toBe(365);
    expect(Object.isFrozen(policies)).toBe(true);
  });

  test("unsupported keys reject before any policy is produced", () => {
    expectPolicyInvalid(() => initializeRetentionPolicies({ RETENTION_ANALYTICS_DAYS: "90" }));
  });
});

// ---------------------------------------------------------------------------
// Cutoff math
// ---------------------------------------------------------------------------

describe("retention cutoff math", () => {
  const FIXED_CLOCK = new Date("2036-01-01T00:00:00.000Z");

  test.each([
    [1, "2035-12-31T00:00:00.000Z"],
    [7, "2035-12-25T00:00:00.000Z"],
    [30, "2035-12-02T00:00:00.000Z"],
    [90, "2035-10-03T00:00:00.000Z"],
    [365, "2035-01-01T00:00:00.000Z"],
  ])("%i days before the fixed clock is %s", (days, expected) => {
    expect(computeRetentionCutoff(FIXED_CLOCK, days).toISOString()).toBe(expected);
  });

  test("the boundary row is retained: only strictly older rows are eligible", () => {
    const cutoff = computeRetentionCutoff(FIXED_CLOCK, 90);
    expect(isEligibleForRetentionCutoff(cutoff, cutoff)).toBe(false);
    expect(isEligibleForRetentionCutoff(new Date(cutoff.getTime() - 1), cutoff)).toBe(true);
    expect(isEligibleForRetentionCutoff(new Date(cutoff.getTime() + 1), cutoff)).toBe(false);
  });

  test("rejects a non-integer or negative age", () => {
    expectPolicyInvalid(() => computeRetentionCutoff(FIXED_CLOCK, -1), "cutoff_age_invalid");
    expectPolicyInvalid(() => computeRetentionCutoff(FIXED_CLOCK, 1.5), "cutoff_age_invalid");
  });
});

// ---------------------------------------------------------------------------
// Purity guard — zero SQL, no database/runtime import, no process.env read
// ---------------------------------------------------------------------------

describe("module purity", () => {
  const source = readFileSync(
    fileURLToPath(
      new URL("../../../core/services/maintenance/retentionPolicy.ts", import.meta.url)
    ),
    "utf8"
  );

  const isComment = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
  };

  test("imports no database, drizzle, cache or runtime module", () => {
    const importLines = source
      .split("\n")
      .filter((line) => /^import\s/.test(line.trim()) || /^}\sfrom\s/.test(line.trim()));
    expect(importLines.length).toBe(0);
    expect(source).not.toMatch(/from\s+"(.*db\/.*|drizzle-orm.*)"/);
    expect(source).not.toMatch(/from\s+"[.]{2}\/\.\.\/db\//);
    expect(source).not.toMatch(/\brequire\(/);
  });

  test("contains no process.env read outside comments", () => {
    const codeLines = source.split("\n").filter((line) => !isComment(line));
    expect(codeLines.filter((line) => line.includes("process.env"))).toEqual([]);
  });

  test("carries no DELETE, UPDATE or SQL statement text", () => {
    const codeLines = source.split("\n").filter((line) => !isComment(line));
    expect(codeLines.filter((line) => /\bDELETE FROM\b/.test(line))).toEqual([]);
    expect(codeLines.filter((line) => /\bsql`/.test(line))).toEqual([]);
  });
});

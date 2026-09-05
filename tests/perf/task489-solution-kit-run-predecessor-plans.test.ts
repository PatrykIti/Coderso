/**
 * TASK-551-05-L02 TASK-489 solution-kit run predecessor plans (S4).
 *
 * The leaf's sole S4 executable and the SOLE writer of the one allowlisted
 * generated output `.tmp/task-551/task489-predecessor-v1.json` (doc :36-47 and
 * :444-468). The database-free halves asserted here never open a socket, never
 * import a database driver and never read an ambient URL: they prove the closed
 * companion registry (exactly 5 companion IDs / 14 logical cases / 15 statement
 * cases / 30 numeric small+large profile receipts), the three distinct run
 * cardinalities (10,000 small and 1,000,000 large bulk history, exactly 109,890
 * bounded-support runs, exactly 119,890/1,109,890 full totals), the frozen
 * literal budgets and safe projections, the parameterized select-only statement
 * renders, the L02 receipt factory round trip with all of its fail-closed
 * malformation arms, the artifact eligibility and path-state guards, the
 * reviewed-freeze-receipt gate the envelope itself applies per doc :207-209
 * (the landed candidate small receipt is refused, the reviewed large one is
 * admitted), the combined safe-detail p95 ceiling of doc :413 (separate
 * receipts PLUS the paired-sample bundle ceiling), and the import-safe
 * fixture-target seam through an injected fake proof client
 * (doc :407-413, :470-530, :690-734).
 *
 * LIVE HALF IS INJECTION-GATED AND OWNER/L11-EXECUTED (doc :188-270, :704-725).
 * `runTask489PredecessorDynamicPhase` runs only when an L11 broker first called
 * `configureTask489PredecessorFixtureInjection` with that operation's exact
 * direct three-key `TASK551_FIXTURE_DATABASE_*` map, the read-only proof client
 * and the dynamic query client. Under the airtight local form (the ambient
 * database variable pinned to a non-routable loopback URL and
 * `bun --env-file=/dev/null test tests/perf/task489-solution-kit-run-predecessor-plans.test.ts`)
 * the dynamic half fail-closes: nothing is seeded, nothing is captured, no
 * connection is opened and NO artifact exists — the airtight arm below asserts
 * that absence. The dynamic seed/plan/cleanup body is desk-checked code: it is
 * the owner/L11-executed half, never a second runner, wrapper, target parser or
 * environment authority.
 *
 * NO RIDER: this file imports no L01/L03 test module, so its bun run registers
 * exactly its own tests and nothing else.
 */
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import {
  createRunScope,
  task551UuidV5,
  uniqueTs,
  type ScaleProfile,
} from "./fixtures/task551DatabaseScale";
import {
  EXACT_L01_INDEX_ROWS,
  TASK551_STATIC_PLAN_STATEMENTS,
  requireReviewedTask551FreezeReceipt,
  sanitizePlan,
} from "./fixtures/task551QueryPlanContracts";
import {
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS,
  createTask489PredecessorReceiptV1,
  parseTask489PredecessorReceiptV1,
  serializeTask489PredecessorReceiptV1,
  type Task489CompanionId,
  type Task489PredecessorLogicalCaseV1,
  type Task489PredecessorProfileResultV1,
  type Task489PredecessorStatementReceiptV1,
  type Task489StaticPlanStatement,
} from "./fixtures/task489SolutionKitRunPredecessor";
import {
  assertTask551FixtureTarget,
  assertTask551FixtureTargetChildKeys,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
  type Task551FixtureTarget,
  type Task551FixtureTargetClient,
} from "../../scripts/task551DatabaseBaseline/fixtureTarget";

/** The one allowlisted generated output of this leaf (doc :36-47, :444-468). */
const ARTIFACT_DIRECTORY = ".tmp/task-551";
const ARTIFACT_FILE_NAME = "task489-predecessor-v1.json";
const ARTIFACT_PATH = `${ARTIFACT_DIRECTORY}/${ARTIFACT_FILE_NAME}`;

/** Fixed redacted failure slugs: never a target, URL, sentinel, env or raw error. */
const REASON_INJECTION_ABSENT = "task551_predecessor_fixture_injection_absent";
const REASON_STATEMENT_ABSENT = "task551_predecessor_statement_absent";
const REASON_CASE_ABSENT = "task551_predecessor_logical_case_absent";
const REASON_PLAN_LEAK = "task551_predecessor_plan_leak";
const REASON_BUDGET = "task551_predecessor_budget_regression";
const REASON_FREEZE_UNREVIEWED = "task551_predecessor_freeze_receipt_unreviewed";
const REASON_DYNAMIC_INCOMPLETE = "task551_predecessor_dynamic_incomplete";
const REASON_DYNAMIC_UNEXPECTED = "task551_predecessor_dynamic_unexpected";
const REASON_TEARDOWN = "task551_predecessor_teardown_unclean";
const REASON_ARTIFACT_NOT_EARNED = "task551_predecessor_artifact_not_earned";
const REASON_ARTIFACT_PATH = "task551_predecessor_artifact_path_state_invalid";
const REASON_ARTIFACT_DUPLICATE = "task551_predecessor_artifact_duplicate";
const REASON_ARTIFACT_BYTES = "task551_predecessor_artifact_byte_mismatch";

/** Redacted failure carrier: the reason slug is the whole public surface. */
class Task489PredecessorError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.name = "Task489PredecessorError";
    this.reason = reason;
  }
}

const sha256Hex = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const COMPANION_ORDER = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.companionIds;

/** Resolves a companion statement through the imported registry only. */
const statementFor = (statementId: string): Task489StaticPlanStatement => {
  for (const companionId of COMPANION_ORDER) {
    const statement =
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES[companionId].statements[statementId];
    if (statement !== undefined) return statement;
  }
  throw new Task489PredecessorError(REASON_STATEMENT_ABSENT);
};

/** Resolves the owning logical case of a statement through the imported order. */
const logicalCaseFor = (statementId: string): Task489PredecessorLogicalCaseV1 => {
  const found = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.find((logicalCase) =>
    logicalCase.statementIds.includes(statementId)
  );
  if (found === undefined) throw new Task489PredecessorError(REASON_CASE_ABSENT);
  return found;
};

// --- Shared doc-derived expectations (read-only literals; never a second registry). ---

/** Doc :407-413: the exact logical case inventory per companion ID. */
const EXPECTED_CASE_IDS: Readonly<Record<Task489CompanionId, readonly string[]>> = {
  "task489-runs-all-keyset": ["default", "relation-heavy-101"],
  "task489-runs-package-keyset": ["default", "relation-heavy-101"],
  "task489-effective-supersession": [
    "newer-0",
    "newer-1",
    "newer-511",
    "newer-512",
    "newer-513-all-rolled",
    "newer-513-unrolled-first",
    "newer-513-unrolled-middle",
    "newer-513-unrolled-last",
  ],
  "task489-active-starter-owner": ["active-owner"],
  "task489-safe-detail": ["point-plus-items"],
};
const SUPERSESSION_CASE_IDS = EXPECTED_CASE_IDS["task489-effective-supersession"];

/** Doc :409-411: the required large-plan authority (index) per statement case. */
const EXPECTED_CASE_INDEX: Readonly<Record<string, string>> = Object.freeze({
  "task489-runs-all-keyset/default": "solution_kit_runs_history_idx",
  "task489-runs-all-keyset/relation-heavy-101": "solution_kit_runs_history_idx",
  "task489-runs-package-keyset/default": "solution_kit_runs_anchor_idx",
  "task489-runs-package-keyset/relation-heavy-101": "solution_kit_runs_anchor_idx",
  ...Object.fromEntries(
    SUPERSESSION_CASE_IDS.map((caseId) => [
      `task489-effective-supersession/${caseId}`,
      "solution_kit_runs_successful_apply_order_idx",
    ])
  ),
  "task489-active-starter-owner/active-owner": "solution_kit_starter_apply_owners_active_idx",
  "task489-safe-detail/run-point": "solution_kit_install_runs_pkey",
  "task489-safe-detail/items-page": "solution_kit_install_items_run_position_idx",
});

/** Doc :409-411: the bounded rows-read ceiling per statement case. */
const SUPERSESSION_ROWS_READ: Readonly<Record<string, number>> = Object.freeze({
  "newer-0": 1,
  "newer-1": 3,
  "newer-511": 1_023,
  "newer-512": 1_025,
  "newer-513-all-rolled": 1_027,
  "newer-513-unrolled-first": 1_026,
  "newer-513-unrolled-middle": 1_026,
  "newer-513-unrolled-last": 1_026,
});
const EXPECTED_CASE_ROWS_READ: Readonly<Record<string, number>> = Object.freeze({
  "task489-runs-all-keyset/default": 404,
  "task489-runs-all-keyset/relation-heavy-101": 404 + 51_813 + 51_813,
  "task489-runs-package-keyset/default": 404,
  "task489-runs-package-keyset/relation-heavy-101": 404 + 51_813 + 51_813,
  ...Object.fromEntries(
    SUPERSESSION_CASE_IDS.map((caseId) => [
      `task489-effective-supersession/${caseId}`,
      SUPERSESSION_ROWS_READ[caseId],
    ])
  ),
  "task489-active-starter-owner/active-owner": 2,
  "task489-safe-detail/run-point": 1,
  "task489-safe-detail/items-page": 513,
});

/** Doc :409-413: the declared result bound (LIMIT) per statement case. */
const EXPECTED_CASE_BOUND: Readonly<Record<string, number>> = Object.freeze({
  "task489-runs-all-keyset/default": 101,
  "task489-runs-all-keyset/relation-heavy-101": 101,
  "task489-runs-package-keyset/default": 101,
  "task489-runs-package-keyset/relation-heavy-101": 101,
  ...Object.fromEntries(
    SUPERSESSION_CASE_IDS.map((caseId) => [`task489-effective-supersession/${caseId}`, 1])
  ),
  "task489-active-starter-owner/active-owner": 2,
  "task489-safe-detail/run-point": 1,
  "task489-safe-detail/items-page": 513,
});

/** Doc :409-413 p95 ceilings as (small, large) per statement case. */
const expectedCaseP95 = (statementId: string): readonly [number, number] => {
  if (statementId.endsWith("/relation-heavy-101")) return [250, 750];
  if (statementId === "task489-active-starter-owner/active-owner") return [25, 25];
  if (statementId === "task489-safe-detail/run-point") return [25, 50];
  return [75, 200];
};

/**
 * Doc :413: the safe-detail bundle is its two separate receipts PLUS one
 * combined p95 ceiling of <=100/250 ms — exactly the sum of the two separate
 * p95 ceilings (25+75 small, 50+200 large). Its statements are resolved through
 * the imported registry order only, never re-declared here.
 */
const SAFE_DETAIL_COMBINED_P95_MS: Readonly<Record<ScaleProfile, number>> = Object.freeze({
  small: 100,
  large: 250,
});
const SAFE_DETAIL_STATEMENT_IDS: readonly string[] =
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.filter(
    (logicalCase) => logicalCase.companionId === "task489-safe-detail"
  ).flatMap((logicalCase) => logicalCase.statementIds);

/** Doc :413: the combined ceiling is a budget of its own, per scale, fail-closed. */
const assertTask489CombinedSafeDetailBudget = (
  profile: ScaleProfile,
  combinedP95Ms: number
): void => {
  if (
    typeof combinedP95Ms !== "number" ||
    !Number.isFinite(combinedP95Ms) ||
    combinedP95Ms > SAFE_DETAIL_COMBINED_P95_MS[profile]
  ) {
    throw new Task489PredecessorError(REASON_BUDGET);
  }
};

/** Doc :431-439: an actor ID may be bound but never projected, digested or returned. */
const PROHIBITED_PROJECTION_NEEDLES: readonly string[] = [
  "actor_id",
  "owner_run_id",
  "options",
  "summary",
  "snapshot",
  "rollback_action",
  "error",
  "password",
  "email",
  "token",
  "digest",
];

/** Renders one synthetic bind tuple per statement (never a database input here). */
/** 0044 legacy index names the plans legitimately hit (never L01-owned). */
const LEGACY_PLAN_INDEXES: readonly string[] = [
  "solution_kit_install_runs_pkey",
  "solution_kit_install_items_run_position_idx",
];
const SYNTHETIC_PARAMS: Readonly<Record<string, string | number>> = {
  cursorCreatedAt: uniqueTs(101).toISOString(),
  limitPlusOne: 101,
  cursorId: "00000000-0000-4000-8000-0000000000c7",
  kitId: "task489-kit-0",
  sourceRunId: "00000000-0000-4000-8000-0000000000c8",
  packageKey: "task489-package-0",
  actorId: "00000000-0000-4000-8000-0000000000c9",
  runId: "00000000-0000-4000-8000-0000000000ca",
};

// --- 1. Closed companion registry: 5 IDs / 14 cases / 15 statements / 30 receipts. ---

describe("closed TASK-489 predecessor companion registry", () => {
  test("holds exactly five companion IDs, fourteen logical cases and fifteen statements", () => {
    expect(COMPANION_ORDER.length).toBe(5);
    expect(new Set(COMPANION_ORDER).size).toBe(5);
    expect(COMPANION_ORDER.join()).toBe(
      "task489-runs-all-keyset,task489-runs-package-keyset,task489-effective-supersession,task489-active-starter-owner,task489-safe-detail"
    );
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.length).toBe(14);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.length).toBe(15);
    expect(new Set(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS).size).toBe(15);
    let statementCases = 0;
    for (const companionId of COMPANION_ORDER) {
      const registry = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES[companionId];
      expect(Object.keys(registry.logicalCases).join()).toBe(EXPECTED_CASE_IDS[companionId].join());
      const derived = Object.entries(registry.logicalCases).flatMap(
        ([, value]) => value.statementIds
      );
      for (const statementId of derived) {
        expect(registry.statements[statementId]).toBeDefined();
        expect(statementFor(statementId).companionId).toBe(companionId);
        statementCases += 1;
      }
    }
    expect(statementCases).toBe(15);
    expect(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.flatMap(
        (logicalCase) => logicalCase.statementIds
      ).join()
    ).toBe(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.join());
    // A history plan without its relation-heavy page, or a safe-detail bundle
    // without both receipts, is an exact-set rejection (doc :438-439).
    for (const historyId of ["task489-runs-all-keyset", "task489-runs-package-keyset"] as const) {
      expect(
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.some(
          (logicalCase) =>
            logicalCase.companionId === historyId &&
            logicalCase.logicalCaseId === "relation-heavy-101"
        )
      ).toBe(true);
    }
    const safeDetail = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.filter(
      (logicalCase) => logicalCase.companionId === "task489-safe-detail"
    );
    expect(safeDetail.length).toBe(1);
    expect(safeDetail[0]?.statementIds.join()).toBe(
      "task489-safe-detail/run-point,task489-safe-detail/items-page"
    );
    // The companion stays outside the closed 37-ID registry (doc :434-437, :893-895).
    expect(TASK551_STATIC_PLAN_STATEMENTS.length).toBe(37);
    expect(
      TASK551_STATIC_PLAN_STATEMENTS.some((statement) =>
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.includes(statement.id)
      )
    ).toBe(false);
  });

  test("separately proves bulk, bounded-support and total run cardinalities", () => {
    const counts = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.profile;
    expect(counts.bulkRuns).toStrictEqual({ small: 10_000, large: 1_000_000 });
    // 101 candidates, 513 applies and 513 rollbacks each, plus the bounded
    // supersession/sentinel/owner/rollback graphs (doc :401-405).
    expect(counts.historyCandidates).toBe(101);
    expect(counts.appliesPerCandidate).toBe(513);
    expect(counts.historyRuns).toBe(101 + 2 * 101 * 513);
    expect(counts.supersessionRuns).toBe(1 + 3 + 1_023 + 1_025 + 1_027 + 3 * 1_026);
    expect([counts.sentinelRuns, counts.ownerGraphRuns, counts.rollbackGraphRuns].join()).toBe(
      "1,3,2"
    );
    const boundedSupport =
      counts.historyRuns +
      counts.supersessionRuns +
      counts.sentinelRuns +
      counts.ownerGraphRuns +
      counts.rollbackGraphRuns;
    expect(boundedSupport).toBe(109_890);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.boundedSupportRuns).toBe(
      boundedSupport
    );
    for (const profile of ["small", "large"] as const) {
      expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.totalRuns(profile)).toBe(
        counts.bulkRuns[profile] + boundedSupport
      );
      expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.totalRuns[profile]).toBe(
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.totalRuns(profile)
      );
    }
    // No assertion may label the bulk number as the scenario total (doc :692-694).
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.totalRuns.small).toBe(119_890);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.totalRuns.large).toBe(1_109_890);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.bulkHistoryRuns.small).toBe(10_000);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.bulkHistoryRuns.large).toBe(
      1_000_000
    );
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.bulkHistoryRuns.small).not.toBe(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.totalRuns.small
    );
    // The normalized closure is exactly 100 actors, 513 items and one each
    // owner/evidence/progress row (doc :415-423, :694-696).
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.syntheticActorUsers).toBe(100);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.safeDetailItems).toBe(513);
    expect(
      [
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.activeStarterOwners,
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.templateEvidenceRows,
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.rollbackProgressRows,
      ].join()
    ).toBe("1,1,1");
    // The history cursor points at the first bulk apply run (ordinal 101).
    expect(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.historyCandidateCursor("task551-scope", "small")
        .createdAtMs
    ).toBe(uniqueTs(101).getTime());
    expect(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.historyCandidateCursor("task551-scope", "large").id
    ).toBe(task551UuidV5("task551-scope", "large", "task489-history", 101));
  });

  test("every statement carries literal finite budgets inside the doc p95 ceilings", () => {
    for (const statementId of TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS) {
      const statement = statementFor(statementId);
      const [p95Small, p95Large] = expectedCaseP95(statementId);
      for (const profile of ["small", "large"] as const) {
        const budget = statement.budgets[profile];
        expect(budget.queryCountMax).toBe(1);
        for (const value of [
          budget.rowsReadMax,
          budget.rowsReturnedMax,
          budget.transferredBytesMax,
          budget.sharedBuffersMax,
          budget.p50MsMax,
          budget.p95MsMax,
          budget.p99MsMax,
        ]) {
          expect(typeof value).toBe("number");
          expect(Number.isFinite(value)).toBe(true);
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
        }
        expect(budget.p50MsMax).toBeLessThanOrEqual(budget.p95MsMax);
        expect(budget.p95MsMax).toBeLessThanOrEqual(budget.p99MsMax);
        expect(budget.rowsReturnedMax).toBeLessThanOrEqual(statement.bound);
        expect(budget.p95MsMax).toBe(profile === "small" ? p95Small : p95Large);
      }
      expect(statement.budgets.small.rowsReadMax).toBe(EXPECTED_CASE_ROWS_READ[statementId]);
      expect(statement.budgets.large.rowsReadMax).toBe(EXPECTED_CASE_ROWS_READ[statementId]);
      expect(statement.bound).toBe(EXPECTED_CASE_BOUND[statementId]);
    }
  });

  test("expected large-plan indexes are landed schema objects and projections stay safe", () => {
    expect(Object.keys(EXPECTED_CASE_INDEX).length).toBe(15);
    let l01OwnedCount = 0;
    let legacyCount = 0;
    for (const statementId of TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS) {
      const statement = statementFor(statementId);
      expect(statement.expectedLargePlanIndex).toBe(EXPECTED_CASE_INDEX[statementId]);
      // Thirteen expected indexes are L01-owned; the run-point primary key and
      // the items unique index are 0044 legacy objects the plans still hit.
      const l01Owned = EXACT_L01_INDEX_ROWS.some(
        (row) => row.name === statement.expectedLargePlanIndex
      );
      expect(l01Owned || LEGACY_PLAN_INDEXES.includes(statement.expectedLargePlanIndex)).toBe(true);
      if (l01Owned) l01OwnedCount += 1;
      else legacyCount += 1;
      const projection = statement.projection.split(",");
      expect(projection.length).toBeGreaterThan(0);
      expect(new Set(projection).size).toBe(projection.length);
      expect(statement.projection.includes("*")).toBe(false);
      for (const needle of PROHIBITED_PROJECTION_NEEDLES)
        expect(projection.includes(needle)).toBe(false);
      expect(statement.predicate.length).toBeGreaterThan(0);
      expect(statement.order.length).toBeGreaterThan(0);
      expect(statement.statementId).toBe(statementId);
      expect(statement.logicalCaseId).toBe(logicalCaseFor(statementId).logicalCaseId);
    }
    expect(l01OwnedCount).toBe(13);
    expect(legacyCount).toBe(2);
  });

  test("every statement renders a parameterized select-only query with its declared bound", () => {
    for (const statementId of TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS) {
      const built = statementFor(statementId).build(SYNTHETIC_PARAMS);
      expect(built.sql.startsWith("select ")).toBe(true);
      expect(built.sql.includes(";")).toBe(false);
      for (const keyword of [
        "insert ",
        "update ",
        "delete ",
        "drop ",
        "alter ",
        "truncate ",
        "grant ",
        "create ",
      ])
        expect(built.sql.toLowerCase().includes(keyword)).toBe(false);
      const binds = [...built.sql.matchAll(/\$(\d+)/gu)].map((match) => Number(match[1]));
      expect(binds.join(",")).toBe(binds.map((_, index) => index + 1).join(","));
      expect(binds.length).toBe(built.values.length);
      expect(built.bound).toBe(statementFor(statementId).bound);
      // The declared bound is always the final bind: LIMIT is never caller-sized.
      expect(built.values[built.values.length - 1]).toBe(built.bound);
      // Relation-heavy pages carry exactly the two lateral probes; plain pages none.
      if (statementId.endsWith("/relation-heavy-101")) {
        expect(built.sql.split("left join lateral").length - 1).toBe(2);
        expect(built.sql.includes("r.created_at desc, r.id desc")).toBe(true);
        expect(built.sql.includes("rollback_rel.rollback_of_run_id = r.id")).toBe(true);
      } else {
        expect(built.sql.toLowerCase().includes("lateral")).toBe(false);
      }
    }
  });

  test("the small-profile seed recipe materializes the exact closure shape", () => {
    const scope = "task551-predecessor-contract-scope";
    const recipe = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.recipe(scope, "small");
    expect(recipe.length).toBe(2);
    expect(recipe.map((seedTable) => seedTable.table).join()).toBe(
      "solution_kit_install_runs,solution_kit_install_items"
    );
    expect(recipe[0]?.columns.join()).toBe(
      "id,kit_id,mode,status,actor_id,rollback_of_run_id,options,summary,error,created_at,updated_at,finished_at"
    );
    expect(recipe[1]?.columns.join()).toBe(
      "id,run_id,position,resource_type,resource_key,operation,status,before_snapshot,after_snapshot,rollback_action,error,created_at,updated_at"
    );
    expect(recipe[0]?.rows.length).toBe(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.totalRuns("small")
    );
    expect(recipe[1]?.rows.length).toBe(513);
    const derived = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.deriveIds(scope, "small");
    expect(derived.runIds.length).toBe(119_890);
    expect(derived.itemIds.length).toBe(513);
    expect(new Set(derived.runIds).size).toBe(derived.runIds.length);
    const seededRunIds = new Set(recipe[0]!.rows.map((row) => String(row[0])));
    expect(seededRunIds.size).toBe(119_890);
    expect(derived.runIds.every((runId) => seededRunIds.has(runId))).toBe(true);
    expect(
      derived.itemIds.every((itemId) => recipe[1]!.rows.some((row) => row[0] === itemId))
    ).toBe(true);
    // A second scope derives a disjoint fixture: ids are scope-bound, never ambient.
    expect(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.deriveIds("task551-other-scope", "small").runIds[0]
    ).not.toBe(derived.runIds[0]);
  });
});

// --- 2. The imported L02 receipt model: factory round trip and fail-closed arms. ---

type LooseRecord = { [key: string]: unknown };
const setIn = (target: object, key: string, value: unknown): void => {
  (target as LooseRecord)[key] = value;
};
const profileResultsOf = (statementReceipt: Task489PredecessorStatementReceiptV1): LooseRecord[] =>
  statementReceipt.profileResults as unknown as LooseRecord[];

/** One in-budget literal profile result for a statement (doc :525-530 numerics). */
const budgetBoundProfileResult = <Profile extends ScaleProfile>(
  statement: Task489StaticPlanStatement,
  profile: Profile
): Task489PredecessorProfileResultV1<Profile> => {
  const budget = statement.budgets[profile];
  return {
    profile,
    planDigest: sha256Hex(`task489-predecessor-plan|${statement.statementId}|${profile}`),
    queryCount: 1,
    rowsRead: budget.rowsReadMax,
    rowsReturned: budget.rowsReturnedMax,
    transferredBytes: budget.transferredBytesMax,
    sharedBuffers: budget.sharedBuffersMax,
    p50Ms: budget.p50MsMax,
    p95Ms: budget.p95MsMax,
    p99Ms: budget.p99MsMax,
  };
};

/** Fifteen ordered statement receipts in the exact imported statement order. */
const validStatementReceipts = (): Task489PredecessorStatementReceiptV1[] =>
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.map(
    (statementId): Task489PredecessorStatementReceiptV1 => {
      const statement = statementFor(statementId);
      const logicalCase = logicalCaseFor(statementId);
      return {
        companionId: logicalCase.companionId,
        logicalCaseId: logicalCase.logicalCaseId,
        statementId,
        profileResults: [
          budgetBoundProfileResult(statement, "small"),
          budgetBoundProfileResult(statement, "large"),
        ],
      };
    }
  );

const mutatedStatementReceipts = (
  mutate: (receipts: Task489PredecessorStatementReceiptV1[]) => void
): Task489PredecessorStatementReceiptV1[] => {
  const clone = structuredClone(validStatementReceipts());
  mutate(clone);
  return clone;
};

/** Every L02 receipt rejection is the single redacted fixture failure. */
const expectInvalid = (run: () => unknown): void => {
  let message = "";
  try {
    run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe("database_baseline_invalid");
};

const canonicalBytes = (): Uint8Array =>
  serializeTask489PredecessorReceiptV1(createTask489PredecessorReceiptV1(validStatementReceipts()));
const textOf = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/** Top-level grammar arms: re-parse a mutated canonical document. */
const parseMutatedDocument = (mutate: (document: Record<string, unknown>) => void): unknown => {
  const document = JSON.parse(textOf(canonicalBytes())) as Record<string, unknown>;
  mutate(document);
  return parseTask489PredecessorReceiptV1(
    new TextEncoder().encode(`${JSON.stringify(document)}\n`)
  );
};

describe("L02 predecessor receipt factory, serializer and parser", () => {
  test("the factory builds the exact five/fourteen/fifteen/thirty shape and the bytes are canonical", () => {
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA).toBe(
      "coderso.task551.task489-predecessor@v1"
    );
    const receipt = createTask489PredecessorReceiptV1(validStatementReceipts());
    expect(receipt.schema).toBe(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA);
    expect(receipt.pass).toBe(true);
    expect(receipt.noLeak).toBe(true);
    expect(receipt.companionIds.join()).toBe(COMPANION_ORDER.join());
    expect(receipt.fixtureCounts).toBe(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS);
    expect(receipt.logicalCases).toStrictEqual(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES);
    expect(receipt.logicalCases.length).toBe(14);
    expect(receipt.statementReceipts.length).toBe(15);
    let profileResults = 0;
    for (const statementReceipt of receipt.statementReceipts) {
      expect(statementReceipt.profileResults.length).toBe(2);
      expect(statementReceipt.profileResults.map((result) => result.profile).join()).toBe(
        "small,large"
      );
      profileResults += statementReceipt.profileResults.length;
    }
    expect(profileResults).toBe(30);
    expect(receipt.statementReceipts.map((entry) => entry.statementId).join()).toBe(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.join()
    );
    // The serializer emits one canonical document followed by exactly one LF.
    const bytes = canonicalBytes();
    const text = textOf(bytes);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.slice(0, -1).includes("\n")).toBe(false);
    // Round trip: the parser accepts exactly those bytes and re-serializes to them.
    const parsed = parseTask489PredecessorReceiptV1(bytes);
    expect(parsed).toStrictEqual(receipt);
    expect(textOf(serializeTask489PredecessorReceiptV1(parsed))).toBe(text);
    expect(
      textOf(
        serializeTask489PredecessorReceiptV1(
          createTask489PredecessorReceiptV1(validStatementReceipts())
        )
      )
    ).toBe(text);
    const reparsed = parseTask489PredecessorReceiptV1(new TextEncoder().encode(text));
    expect(textOf(serializeTask489PredecessorReceiptV1(reparsed))).toBe(text);
  });

  test("statement-receipt order, arity, identity and shape arms fail closed", () => {
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          receipts.pop();
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          receipts.push(receipts[0]!);
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          const swap = receipts[0]!;
          receipts[0] = receipts[1]!;
          receipts[1] = swap;
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(receipts[2]!, "statementId", "task489-safe-detail/items-page");
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(receipts[2]!, "companionId", "task489-safe-detail");
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(receipts[2]!, "logicalCaseId", "point-plus-items");
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(receipts[2]!, "extra", 1);
        })
      )
    );
    // A keyed statement-result map is never accepted: the model is array-only.
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        Object.fromEntries(
          TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.map((id) => [
            id,
            validStatementReceipts()[0],
          ])
        ) as unknown as Task489PredecessorStatementReceiptV1[]
      )
    );
  });

  test("profile-result literals, finiteness and budget arms fail closed", () => {
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "profile", "large");
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "queryCount", 2);
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "rowsRead", Number.NaN);
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "p95Ms", -1);
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "transferredBytes", Number.POSITIVE_INFINITY);
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "sharedBuffers", "8");
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "planDigest", sha256Hex("seed").toUpperCase());
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "planDigest", "short-digest");
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "planDigest", "0".repeat(64));
        })
      )
    );
    // A negative metric is rejected like any other non-finite literal.
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(profileResultsOf(receipts[0]!)[0], "rowsRead", -1);
        })
      )
    );
    // Budget breach in either direction is a rejection, never a rebaseline.
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(
            profileResultsOf(receipts[3]!)[1],
            "p99Ms",
            statementFor(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS[3]!).budgets.large
              .p99MsMax + 1
          );
        })
      )
    );
    expectInvalid(() =>
      createTask489PredecessorReceiptV1(
        mutatedStatementReceipts((receipts) => {
          setIn(
            profileResultsOf(receipts[3]!)[1],
            "rowsRead",
            statementFor(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS[3]!).budgets.large
              .rowsReadMax + 1
          );
        })
      )
    );
  });

  test("top-level grammar arms: a sixth ID, drift and map shapes fail closed", () => {
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "companionIds", [...COMPANION_ORDER, "task489-sixth-companion"]);
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "companionIds", [COMPANION_ORDER[1], ...COMPANION_ORDER.slice(0, 4)]);
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "companionIds", [...COMPANION_ORDER.slice(0, 4)]);
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "pass", false);
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "noLeak", false);
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "schema", "coderso.task551.task489-predecessor@v2");
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "extra", 1);
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "fixtureCounts", {
          ...TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS,
          syntheticActorUsers: 101,
        });
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "fixtureCounts", { bulkHistoryRuns: { small: 10_000, large: 1_000_000 } });
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        (document.logicalCases as LooseRecord[]).pop();
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        (document.logicalCases as LooseRecord[]).push({
          ...((document.logicalCases as LooseRecord[])[0] as LooseRecord),
        });
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "statementReceipts", {});
      })
    );
    expectInvalid(() =>
      parseMutatedDocument((document) => {
        setIn(document, "statementReceipts", [
          ...(document.statementReceipts as LooseRecord[]).slice(0, 14),
        ]);
      })
    );
  });

  test("byte-level parser arms: truncation, double LF and foreign payloads fail closed", () => {
    const bytes = canonicalBytes();
    expectInvalid(() => parseTask489PredecessorReceiptV1(bytes.slice(0, bytes.length - 1)));
    expectInvalid(() => parseTask489PredecessorReceiptV1(bytes.slice(0, bytes.length - 32)));
    expectInvalid(() =>
      parseTask489PredecessorReceiptV1(new TextEncoder().encode(`${textOf(bytes)}\n`))
    );
    expectInvalid(() =>
      parseTask489PredecessorReceiptV1(new TextEncoder().encode(`${textOf(bytes).slice(0, -1)} \n`))
    );
    expectInvalid(() => parseTask489PredecessorReceiptV1(new Uint8Array(0)));
    expectInvalid(() => parseTask489PredecessorReceiptV1(new TextEncoder().encode("{}\n")));
    expectInvalid(() => parseTask489PredecessorReceiptV1(new TextEncoder().encode("null\n")));
    expectInvalid(() => parseTask489PredecessorReceiptV1(new TextEncoder().encode("not-json\n")));
    expectInvalid(() => parseTask489PredecessorReceiptV1(new TextEncoder().encode("[]\n")));
  });
});

// --- 3. The sole artifact writer: eligibility gates and fixed-path state guards. ---

type ArtifactPathState = "absent" | "regular-file" | "symlink" | "other";
type ArtifactPathInfo = Readonly<{ isSymbolicLink(): boolean; isFile(): boolean }>;

const classifyArtifactPath = (info: ArtifactPathInfo | undefined): ArtifactPathState => {
  if (info === undefined) return "absent";
  if (info.isSymbolicLink()) return "symlink";
  if (info.isFile()) return "regular-file";
  return "other";
};

/** Doc :276-278: setup may clear only a stale regular artifact, never a symlink. */
const assertPreparableArtifactPath = (state: ArtifactPathState): void => {
  if (state === "symlink" || state === "other")
    throw new Task489PredecessorError(REASON_ARTIFACT_PATH);
};

/** Doc :312-317: only a fresh regular file at the fixed path is the artifact. */
const assertWrittenArtifactPath = (state: ArtifactPathState): void => {
  if (state !== "regular-file") throw new Task489PredecessorError(REASON_ARTIFACT_PATH);
};

type ArtifactEligibility = Readonly<{
  profiles: readonly ScaleProfile[];
  teardownFailureCount: number;
  statementReceipts: readonly Task489PredecessorStatementReceiptV1[];
  combinedSafeDetailP95Ms: Readonly<Record<ScaleProfile, number>>;
}>;

/** Doc :276-286 and :413: both profiles, a clean teardown, all fifteen cases and the combined safe-detail ceiling come first. */
const assertArtifactEligibility = (eligibility: ArtifactEligibility): void => {
  if (eligibility.profiles.join() !== "small,large")
    throw new Task489PredecessorError(REASON_ARTIFACT_NOT_EARNED);
  if (eligibility.teardownFailureCount !== 0) throw new Task489PredecessorError(REASON_TEARDOWN);
  if (
    eligibility.statementReceipts.length !==
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.length
  )
    throw new Task489PredecessorError(REASON_ARTIFACT_NOT_EARNED);
  if (
    eligibility.statementReceipts.some(
      (statementReceipt, index) =>
        statementReceipt.statementId !== TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS[index]
    )
  ) {
    throw new Task489PredecessorError(REASON_ARTIFACT_NOT_EARNED);
  }
  // The combined safe-detail p95 is an artifact precondition of its own: the
  // two separate receipts alone never earn the write (doc :413).
  for (const profile of ["small", "large"] as const)
    assertTask489CombinedSafeDetailBudget(
      profile,
      eligibility.combinedSafeDetailP95Ms[profile] as number
    );
};

/** Combined p95 literals comfortably inside the doc :413 ceiling. */
const withinCombinedSafeDetailCeiling = (): Readonly<Record<ScaleProfile, number>> => ({
  small: 50,
  large: 125,
});

describe("sole artifact writer guards", () => {
  test("the one output path is fixed, named and never derived from a caller", () => {
    expect(ARTIFACT_PATH).toBe(".tmp/task-551/task489-predecessor-v1.json");
    expect(ARTIFACT_DIRECTORY).toBe(".tmp/task-551");
    expect(ARTIFACT_FILE_NAME).toBe("task489-predecessor-v1.json");
    expect(ARTIFACT_PATH.startsWith(ARTIFACT_DIRECTORY)).toBe(true);
  });

  test("path-state guards reject a symlink, a directory and a post-write non-file", () => {
    expect(classifyArtifactPath(undefined)).toBe("absent");
    expect(classifyArtifactPath({ isSymbolicLink: () => false, isFile: () => true })).toBe(
      "regular-file"
    );
    expect(classifyArtifactPath({ isSymbolicLink: () => true, isFile: () => false })).toBe(
      "symlink"
    );
    expect(classifyArtifactPath({ isSymbolicLink: () => false, isFile: () => false })).toBe(
      "other"
    );
    expect(() => assertPreparableArtifactPath("absent")).not.toThrow();
    expect(() => assertPreparableArtifactPath("regular-file")).not.toThrow();
    expectTask489Failure(() => assertPreparableArtifactPath("symlink"), REASON_ARTIFACT_PATH);
    expectTask489Failure(() => assertPreparableArtifactPath("other"), REASON_ARTIFACT_PATH);
    expect(() => assertWrittenArtifactPath("regular-file")).not.toThrow();
    for (const state of ["absent", "symlink", "other"] as const)
      expectTask489Failure(() => assertWrittenArtifactPath(state), REASON_ARTIFACT_PATH);
  });

  test("the artifact is earned only by both profiles, a clean teardown, fifteen ordered cases and the combined ceiling", () => {
    expect(() =>
      assertArtifactEligibility({
        profiles: ["small", "large"],
        teardownFailureCount: 0,
        statementReceipts: validStatementReceipts(),
        combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
      })
    ).not.toThrow();
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
        }),
      REASON_ARTIFACT_NOT_EARNED
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["large", "small"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
        }),
      REASON_ARTIFACT_NOT_EARNED
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: [],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
        }),
      REASON_ARTIFACT_NOT_EARNED
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 1,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
        }),
      REASON_TEARDOWN
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts().slice(0, 14),
          combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
        }),
      REASON_ARTIFACT_NOT_EARNED
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 0,
          statementReceipts: mutatedStatementReceipts((receipts) => {
            const swap = receipts[0]!;
            receipts[0] = receipts[1]!;
            receipts[1] = swap;
          }),
          combinedSafeDetailP95Ms: withinCombinedSafeDetailCeiling(),
        }),
      REASON_ARTIFACT_NOT_EARNED
    );
    // A bundle over its combined ceiling earns nothing, even with clean receipts.
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: { small: 101, large: 125 },
        }),
      REASON_BUDGET
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: { small: 50, large: 251 },
        }),
      REASON_BUDGET
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: { small: Number.NaN, large: 125 },
        }),
      REASON_BUDGET
    );
    expectTask489Failure(
      () =>
        assertArtifactEligibility({
          profiles: ["small", "large"],
          teardownFailureCount: 0,
          statementReceipts: validStatementReceipts(),
          combinedSafeDetailP95Ms: {} as Readonly<Record<ScaleProfile, number>>,
        }),
      REASON_BUDGET
    );
  });
});

// --- 4. Fixture-target seam and the nested-finally teardown collector. ---

type Task489TeardownStage = "cleanup" | "zero-residue" | "post-cleanup-proof";

/**
 * Mirrors the doc's nested finally (doc :238-270, :326-334): child-first
 * cleanup, then the zero-residue assertion even when cleanup failed, then the
 * rolled-back bound-target proof even when both failed. Every failure is
 * collected as a fixed stage slug; none is swallowed and none carries raw detail.
 */
const collectTask489TeardownFailures = async (
  stages: Readonly<Record<Task489TeardownStage, () => Promise<void>>>
): Promise<readonly Task489TeardownStage[]> => {
  const failures: Task489TeardownStage[] = [];
  try {
    try {
      await stages.cleanup();
    } catch {
      failures.push("cleanup");
    } finally {
      try {
        await stages["zero-residue"]();
      } catch {
        failures.push("zero-residue");
      }
    }
  } finally {
    try {
      await stages["post-cleanup-proof"]();
    } catch {
      failures.push("post-cleanup-proof");
    }
  }
  return failures;
};

type Task489DynamicScalar = string | number | boolean | null | Date | readonly string[];
type Task489DynamicRow = Readonly<Record<string, unknown>>;
/** The dynamic query client: parameterized text plus closed scalars, never a driver import. */
type Task489DynamicClient = Readonly<{
  query(
    text: string,
    values?: readonly Task489DynamicScalar[]
  ): Promise<readonly Task489DynamicRow[]>;
}>;

/**
 * The exact L11 05-L02 injection for this test: that operation's direct
 * three-key `TASK551_FIXTURE_DATABASE_*` map, the read-only proof client and
 * the dynamic query client. Nothing else may ever set it, and no env, file or
 * argv path can construct it (doc :346-356, :782-800).
 */
type Task489PredecessorInjection = Readonly<{
  fixtureValues: Readonly<Record<string, unknown>>;
  client: Task551FixtureTargetClient;
  database: Task489DynamicClient;
}>;

let dynamicInjection: Task489PredecessorInjection | undefined;

/** The L11 broker injects the fixture authority once; nothing else may ever set it. */
export const configureTask489PredecessorFixtureInjection = (
  value: Task489PredecessorInjection | undefined
): void => {
  dynamicInjection =
    value === undefined
      ? undefined
      : Object.freeze({
          fixtureValues: Object.freeze({ ...value.fixtureValues }),
          client: value.client,
          database: value.database,
        });
};

export const readTask489PredecessorInjection = (): Task489PredecessorInjection | undefined =>
  dynamicInjection;

const requireTask489PredecessorInjection = (): Task489PredecessorInjection => {
  if (dynamicInjection === undefined) throw new Task489PredecessorError(REASON_INJECTION_ABSENT);
  return dynamicInjection;
};

/** Binds the injected map through the imported seam only, then runs the preflight proof. */
const bindTask489PredecessorTarget = async (): Promise<
  Readonly<{ target: Task551FixtureTarget; client: Task551FixtureTargetClient }>
> => {
  const injection = requireTask489PredecessorInjection();
  const childValues = assertTask551FixtureTargetChildKeys(injection.fixtureValues);
  const target = parseTask551FixtureTarget(childValues);
  await assertTask551FixtureTarget(target, injection.client);
  return Object.freeze({ target, client: injection.client });
};

const expectTask489Failure = (run: () => unknown, reason: string): void => {
  let threw: unknown;
  try {
    run();
  } catch (error) {
    threw = error;
  }
  expect(threw).toBeInstanceOf(Task489PredecessorError);
  if (threw instanceof Task489PredecessorError) expect(threw.reason).toBe(reason);
};

const expectTask489AsyncFailure = async (
  run: () => Promise<unknown>,
  reason: string
): Promise<void> => {
  let threw: unknown;
  try {
    await run();
  } catch (error) {
    threw = error;
  }
  expect(threw).toBeInstanceOf(Task489PredecessorError);
  if (threw instanceof Task489PredecessorError) expect(threw.reason).toBe(reason);
};

const expectTargetRejection = (run: () => unknown): void => {
  let message = "";
  try {
    run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe("database_baseline_invalid");
};

const rejectsWithInvalid = async (run: () => Promise<unknown>): Promise<void> => {
  let message = "";
  try {
    await run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toBe("database_baseline_invalid");
};

const VALID_CHILD: LooseRecord = {
  TASK551_FIXTURE_DATABASE_URL:
    "postgresql://task551_owner:task551_secret@127.0.0.1:5433/coderso02",
  TASK551_FIXTURE_DATABASE_NAME: "coderso02",
  TASK551_FIXTURE_DATABASE_SENTINEL:
    "task489-predecessor-sentinel-0123456789abcdef0123456789abcdef",
};
const OK_OBSERVATION = {
  currentDatabaseMatched: true,
  markerCount: 1,
  boundSentinelByteMatched: true,
};
const NO_DATABASE: Task489DynamicClient = { query: async () => [] };
const proofClient = (
  observation: unknown,
  rollback: () => Promise<void> = async () => {},
  begin: () => void = () => {}
): Task551FixtureTargetClient => ({
  beginReadOnlyTransaction: async () => {
    begin();
    return { readFixtureTargetProof: async () => observation as never, rollback };
  },
});

describe("fixture-target seam and nested-finally teardown (no socket)", () => {
  test("the exact three-key map binds the frozen target and the preflight proof rolls back", async () => {
    const inputs: unknown[] = [];
    let rollbacks = 0;
    configureTask489PredecessorFixtureInjection({
      fixtureValues: VALID_CHILD,
      client: {
        beginReadOnlyTransaction: async () => ({
          readFixtureTargetProof: async (input) => {
            inputs.push(input);
            return OK_OBSERVATION as never;
          },
          rollback: async () => {
            rollbacks += 1;
          },
        }),
      },
      database: NO_DATABASE,
    });
    try {
      const bound = await bindTask489PredecessorTarget();
      expect(Object.isFrozen(bound)).toBe(true);
      expect(Object.isFrozen(bound.target)).toBe(true);
      expect(bound.target.expectedDatabaseName).toBe("coderso02");
      expect(bound.target.url).toBe(VALID_CHILD.TASK551_FIXTURE_DATABASE_URL);
      expect(bound.target.sentinel).toBe(VALID_CHILD.TASK551_FIXTURE_DATABASE_SENTINEL);
      expect(bound.client).toBe(readTask489PredecessorInjection()?.client);
      expect(rollbacks).toBe(1);
      expect(inputs[0]).toStrictEqual({
        expectedDatabaseName: "coderso02",
        expectedSentinel: VALID_CHILD.TASK551_FIXTURE_DATABASE_SENTINEL,
        marker: "task551-baseline-v1",
        sentinelTable: "public.task551_fixture_sentinel",
      });
    } finally {
      configureTask489PredecessorFixtureInjection(undefined);
    }
    expect(readTask489PredecessorInjection()).toBeUndefined();
  });

  test("an absent injection fail-closes and foreign maps or failed proofs reject", async () => {
    expectTask489Failure(() => requireTask489PredecessorInjection(), REASON_INJECTION_ABSENT);
    await expectTask489AsyncFailure(() => bindTask489PredecessorTarget(), REASON_INJECTION_ABSENT);
    const child = (patch: LooseRecord): LooseRecord => ({ ...VALID_CHILD, ...patch });
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(null as unknown as LooseRecord)
    );
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys({ ...VALID_CHILD, EXTRA: 1 }));
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys({
        TASK551_FIXTURE_DATABASE_URL: VALID_CHILD.TASK551_FIXTURE_DATABASE_URL,
        TASK551_FIXTURE_DATABASE_NAME: "coderso02",
      })
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(child({ TASK551_FIXTURE_DATABASE_NAME: "coderso" }))
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(
        child({
          TASK551_FIXTURE_DATABASE_URL:
            "mysql://task551_owner:task551_secret@127.0.0.1:5433/coderso02",
        })
      )
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(
        child({
          TASK551_FIXTURE_DATABASE_URL:
            "postgresql://task551_owner:task551_secret@127.0.0.1:5433/coderso",
        })
      )
    );
    expectTargetRejection(() =>
      assertTask551FixtureTargetChildKeys(child({ TASK551_FIXTURE_DATABASE_SENTINEL: "short" }))
    );
    const getterMap = { ...VALID_CHILD };
    Object.defineProperty(getterMap, "TASK551_FIXTURE_DATABASE_SENTINEL", {
      enumerable: true,
      get: () => VALID_CHILD.TASK551_FIXTURE_DATABASE_SENTINEL,
    });
    expectTargetRejection(() => assertTask551FixtureTargetChildKeys(getterMap));
    configureTask489PredecessorFixtureInjection({
      fixtureValues: child({ EXTRA: 1 }),
      client: proofClient(OK_OBSERVATION),
      database: NO_DATABASE,
    });
    try {
      await rejectsWithInvalid(() => bindTask489PredecessorTarget());
      configureTask489PredecessorFixtureInjection({
        fixtureValues: VALID_CHILD,
        client: proofClient({
          currentDatabaseMatched: false,
          markerCount: 1,
          boundSentinelByteMatched: true,
        }),
        database: NO_DATABASE,
      });
      await rejectsWithInvalid(() => bindTask489PredecessorTarget());
      configureTask489PredecessorFixtureInjection({
        fixtureValues: VALID_CHILD,
        client: proofClient({
          currentDatabaseMatched: true,
          markerCount: 2,
          boundSentinelByteMatched: true,
        }),
        database: NO_DATABASE,
      });
      await rejectsWithInvalid(() => bindTask489PredecessorTarget());
      configureTask489PredecessorFixtureInjection({
        fixtureValues: VALID_CHILD,
        client: proofClient(OK_OBSERVATION, async () => {
          throw new Error("rollback failed");
        }),
        database: NO_DATABASE,
      });
      await rejectsWithInvalid(() => bindTask489PredecessorTarget());
    } finally {
      configureTask489PredecessorFixtureInjection(undefined);
    }
    expect(readTask489PredecessorInjection()).toBeUndefined();
  });

  test("the nested finally runs child-first cleanup, zero residue and the post-cleanup proof", async () => {
    const order: string[] = [];
    const stage =
      (name: string, fail: boolean): (() => Promise<void>) =>
      async () => {
        order.push(name);
        if (fail) throw new Error(`injected ${name} failure`);
      };
    expect(
      await collectTask489TeardownFailures({
        cleanup: stage("cleanup", false),
        "zero-residue": stage("zero-residue", false),
        "post-cleanup-proof": stage("post-cleanup-proof", false),
      })
    ).toStrictEqual([]);
    expect(order.join()).toBe("cleanup,zero-residue,post-cleanup-proof");
    order.length = 0;
    // Every stage may fail; all three failures are collected and none propagates early.
    expect(
      await collectTask489TeardownFailures({
        cleanup: stage("cleanup", true),
        "zero-residue": stage("zero-residue", true),
        "post-cleanup-proof": stage("post-cleanup-proof", true),
      })
    ).toStrictEqual(["cleanup", "zero-residue", "post-cleanup-proof"]);
    expect(order.join()).toBe("cleanup,zero-residue,post-cleanup-proof");
    order.length = 0;
    // A cleanup failure never skips the zero-residue assertion (nested finally).
    expect(
      await collectTask489TeardownFailures({
        cleanup: stage("cleanup", true),
        "zero-residue": stage("zero-residue", false),
        "post-cleanup-proof": stage("post-cleanup-proof", false),
      })
    ).toStrictEqual(["cleanup"]);
    expect(order.join()).toBe("cleanup,zero-residue,post-cleanup-proof");
    order.length = 0;
    // A zero-residue failure never skips the post-cleanup target proof either.
    expect(
      await collectTask489TeardownFailures({
        cleanup: stage("cleanup", false),
        "zero-residue": stage("zero-residue", true),
        "post-cleanup-proof": stage("post-cleanup-proof", false),
      })
    ).toStrictEqual(["zero-residue"]);
    expect(order.join()).toBe("cleanup,zero-residue,post-cleanup-proof");
  });
});

// --- 5. Injection-gated dynamic half: seed, sanitized plan capture, cleanup (owner/L11-executed). ---

const DYNAMIC_PROFILES: readonly ScaleProfile[] = ["small", "large"];
const EXPLAIN_SAMPLES = 5;
const INSERT_CHUNK_ROWS = 400;
const PROBE_CHUNK_ROWS = 20_000;
const ACTOR_USERS = 100 as const;

/** Desk-checked supersession chain source offsets (cumulative chain starts). */
const SUPERSESSION_SOURCE_OFFSETS: Readonly<Record<string, number>> = Object.freeze({
  "newer-0": 0,
  "newer-1": 1,
  "newer-511": 4,
  "newer-512": 1_027,
  "newer-513-all-rolled": 2_052,
  "newer-513-unrolled-first": 3_079,
  "newer-513-unrolled-middle": 4_105,
  "newer-513-unrolled-last": 5_131,
});

type Task489DynamicFixture = Readonly<{
  scope: string;
  profile: ScaleProfile;
  bulkRunIds: readonly string[];
  runIds: readonly string[];
  itemIds: readonly string[];
  actorIds: readonly string[];
  supersessionSourceIds: Readonly<Record<string, string>>;
  ownerRunIds: Readonly<{ starter: string; active: string; rollback: string }>;
  sentinelRunId: string;
  ownerPackageKey: string;
  ownerActorId: string;
}>;

const requireId = (ids: readonly string[], index: number): string => {
  const id = ids[index];
  if (id === undefined || id.length === 0)
    throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
  return id;
};

/** Binds every dynamic id to the imported scope-derived recipe; no ambient id exists. */
const buildTask489DynamicFixture = (
  scope: string,
  profile: ScaleProfile
): Task489DynamicFixture => {
  const derived = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.deriveIds(scope, profile);
  const counts = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.profile;
  let cursor = 0;
  const take = (length: number): readonly string[] => {
    const slice = derived.runIds.slice(cursor, cursor + length);
    cursor += length;
    return slice;
  };
  const bulkRunIds = take(counts.bulkRuns[profile]);
  take(counts.historyRuns);
  const supersession = take(counts.supersessionRuns);
  const sentinel = take(counts.sentinelRuns);
  const owner = take(counts.ownerGraphRuns);
  take(counts.rollbackGraphRuns);
  if (cursor !== derived.runIds.length)
    throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
  return Object.freeze({
    scope,
    profile,
    bulkRunIds,
    runIds: derived.runIds,
    itemIds: derived.itemIds,
    actorIds: Array.from({ length: ACTOR_USERS }, (_, ordinal) =>
      task551UuidV5(scope, profile, "task489-actors", ordinal)
    ),
    supersessionSourceIds: Object.freeze(
      Object.fromEntries(
        SUPERSESSION_CASE_IDS.map((caseId) => [
          caseId,
          requireId(supersession, SUPERSESSION_SOURCE_OFFSETS[caseId] ?? -1),
        ])
      )
    ),
    ownerRunIds: Object.freeze({
      starter: requireId(owner, 0),
      active: requireId(owner, 1),
      rollback: requireId(owner, 2),
    }),
    sentinelRunId: requireId(sentinel, 0),
    ownerPackageKey: `task489-package-${sha256Hex(`task489-owner|${scope}`).slice(0, 12)}`,
    ownerActorId: task551UuidV5(scope, profile, "task489-actors", 0),
  });
};

const dynamicClosureDigest = (seed: string): string => sha256Hex(`task489-dynamic|${seed}`);

/** Binds recipe rows and the normalized closure as dense positional binds. */
const scalarBind = (value: unknown): { placeholder: string; scalar: Task489DynamicScalar } => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return { placeholder: "$", scalar: value };
  }
  if (typeof value === "object") return { placeholder: "$::jsonb", scalar: JSON.stringify(value) };
  throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
};

const insertSeedRows = async (
  client: Task489DynamicClient,
  tableName: string,
  columns: readonly string[],
  rows: readonly (readonly unknown[])[]
): Promise<number> => {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_ROWS) {
    const chunk = rows.slice(start, start + INSERT_CHUNK_ROWS);
    const values: Task489DynamicScalar[] = [];
    const tuples = chunk.map((row) => {
      if (row.length !== columns.length)
        throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
      return `(${columns
        .map((_column, index) => {
          const bound = scalarBind(row[index]);
          values.push(bound.scalar);
          return `${bound.placeholder}${values.length}`;
        })
        .join(",")})`;
    });
    await client.query(
      `insert into ${tableName} (${columns.join(",")}) values ${tuples.join(",")}`,
      values
    );
    inserted += chunk.length;
  }
  return inserted;
};

/** The minimal normalized closure: the owned runs/items plus 100 actors and one each owner/evidence/progress row. */
const seedTask489DynamicClosure = async (
  client: Task489DynamicClient,
  fixture: Task489DynamicFixture
): Promise<number> => {
  let seeded = 0;
  for (const seedTable of TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.recipe(
    fixture.scope,
    fixture.profile
  )) {
    seeded += await insertSeedRows(client, seedTable.table, seedTable.columns, seedTable.rows);
  }
  seeded += await insertSeedRows(
    client,
    "users",
    ["id", "email", "email_hash", "password_hash", "name", "status", "created_at", "updated_at"],
    fixture.actorIds.map((actorId, ordinal) => [
      actorId,
      `task489-actor-${ordinal}@fixture.invalid`,
      dynamicClosureDigest(`actor-email|${fixture.scope}|${ordinal}`),
      dynamicClosureDigest(`actor-password|${fixture.scope}|${ordinal}`),
      `task489-actor-${ordinal}`,
      "active",
      uniqueTs(ordinal),
      uniqueTs(ordinal),
    ])
  );
  // One active starter owner keyed by source_run_id (never an owner_run_id field).
  seeded += await insertSeedRows(
    client,
    "solution_kit_starter_apply_owners",
    [
      "source_run_id",
      "package_key",
      "actor_id",
      "contract",
      "definition_digest",
      "phase",
      "envelope",
      "envelope_digest",
      "released_at",
    ],
    [
      [
        fixture.ownerRunIds.starter,
        fixture.ownerPackageKey,
        fixture.ownerActorId,
        "coderso.starter-content-rollback@v1",
        dynamicClosureDigest("definition"),
        "core_applied",
        {
          contract: "coderso.starter-content-rollback@v1",
          definitionDigest: dynamicClosureDigest("definition"),
          phase: "core_applied",
          active: true,
        },
        dynamicClosureDigest("definition"),
        null,
      ],
    ]
  );
  const evidenceId = task551UuidV5(fixture.scope, fixture.profile, "task489-evidence", 0);
  seeded += await insertSeedRows(
    client,
    "solution_kit_legacy_template_evidence",
    [
      "id",
      "source_run_id",
      "source_position",
      "template_key",
      "template_id",
      "plan_digest",
      "operation",
      "status",
      "before_snapshot",
      "after_snapshot",
      "rollback_action",
      "safe_error_code",
      "evidence_digest",
    ],
    [
      [
        evidenceId,
        fixture.ownerRunIds.starter,
        0,
        "task489-template-0",
        task551UuidV5(fixture.scope, fixture.profile, "task489-template", 0),
        dynamicClosureDigest("plan"),
        "update",
        "success",
        { rows: 1 },
        { rows: 2 },
        { action: "restore" },
        null,
        dynamicClosureDigest("evidence"),
      ],
    ]
  );
  seeded += await insertSeedRows(
    client,
    "solution_kit_legacy_rollback_progress",
    [
      "rollback_run_id",
      "source_run_id",
      "source_evidence_id",
      "contract",
      "source_status",
      "source_position",
      "rollback_position",
      "state",
      "source_evidence_digest",
      "source_after_digest",
      "rollback_target_digest",
      "mutation_invalidation_event_key",
      "compensation_invalidation_event_key",
      "progress_digest",
    ],
    [
      [
        fixture.ownerRunIds.rollback,
        fixture.ownerRunIds.starter,
        evidenceId,
        "coderso.legacy-template-rollback-progress@v1",
        "success",
        0,
        0,
        "rollback_committed",
        dynamicClosureDigest("evidence"),
        dynamicClosureDigest("after"),
        dynamicClosureDigest("target"),
        `task489-event-${fixture.scope}`.slice(0, 96),
        null,
        dynamicClosureDigest("progress"),
      ],
    ]
  );
  return seeded;
};

const countRowsByKeys = async (
  client: Task489DynamicClient,
  tableName: string,
  column: string,
  keys: readonly string[]
): Promise<number> => {
  let total = 0;
  for (let start = 0; start < keys.length; start += PROBE_CHUNK_ROWS) {
    const rows = await client.query(
      `select count(*)::int as total from ${tableName} where ${column} = any($1::uuid[])`,
      [keys.slice(start, start + PROBE_CHUNK_ROWS)]
    );
    total += Number(rows[0]?.total ?? 0);
  }
  return total;
};

/** Records all three cardinalities separately before any plan is captured. */
const assertTask489DynamicClosure = async (
  client: Task489DynamicClient,
  fixture: Task489DynamicFixture
): Promise<void> => {
  const counts = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.profile;
  const probes: readonly (readonly [string, string, readonly string[], number])[] = [
    ["solution_kit_install_runs", "id", fixture.bulkRunIds, counts.bulkRuns[fixture.profile]],
    [
      "solution_kit_install_runs",
      "id",
      fixture.runIds,
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.totalRuns(fixture.profile),
    ],
    ["solution_kit_install_items", "id", fixture.itemIds, counts.sentinelItems],
    ["users", "id", fixture.actorIds, ACTOR_USERS],
    ["solution_kit_starter_apply_owners", "source_run_id", [fixture.ownerRunIds.starter], 1],
    ["solution_kit_legacy_template_evidence", "source_run_id", [fixture.ownerRunIds.starter], 1],
    ["solution_kit_legacy_rollback_progress", "rollback_run_id", [fixture.ownerRunIds.rollback], 1],
  ];
  for (const [tableName, column, keys, expected] of probes) {
    if ((await countRowsByKeys(client, tableName, column, keys)) !== expected)
      throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
  }
};

const deleteRowsByKeys = async (
  client: Task489DynamicClient,
  tableName: string,
  column: string,
  keys: readonly string[]
): Promise<number> => {
  let deleted = 0;
  for (let start = 0; start < keys.length; start += PROBE_CHUNK_ROWS) {
    const rows = await client.query(
      `delete from ${tableName} where ${column} = any($1::uuid[]) returning 1 as deleted`,
      [keys.slice(start, start + PROBE_CHUNK_ROWS)]
    );
    deleted += rows.length;
  }
  return deleted;
};

/** Child-first cleanup order (doc :423-425): progress, evidence, owner, items, rollback runs, apply runs, actors. */
const cleanupTask489DynamicClosure = async (
  client: Task489DynamicClient,
  fixture: Task489DynamicFixture
): Promise<number> => {
  let deleted = 0;
  deleted += await deleteRowsByKeys(
    client,
    "solution_kit_legacy_rollback_progress",
    "rollback_run_id",
    [fixture.ownerRunIds.rollback]
  );
  deleted += await deleteRowsByKeys(
    client,
    "solution_kit_legacy_rollback_progress",
    "source_run_id",
    [fixture.ownerRunIds.starter]
  );
  deleted += await deleteRowsByKeys(
    client,
    "solution_kit_legacy_template_evidence",
    "source_run_id",
    [fixture.ownerRunIds.starter]
  );
  deleted += await deleteRowsByKeys(client, "solution_kit_starter_apply_owners", "source_run_id", [
    fixture.ownerRunIds.starter,
  ]);
  deleted += await deleteRowsByKeys(client, "solution_kit_install_items", "run_id", [
    fixture.sentinelRunId,
  ]);
  deleted += await deleteRowsByKeys(
    client,
    "solution_kit_install_runs",
    "rollback_of_run_id",
    fixture.runIds
  );
  deleted += await deleteRowsByKeys(client, "solution_kit_install_runs", "id", fixture.runIds);
  deleted += await deleteRowsByKeys(client, "solution_kit_install_items", "id", fixture.itemIds);
  deleted += await deleteRowsByKeys(client, "users", "id", fixture.actorIds);
  return deleted;
};

/** The finally proof queries every physical table by its scope-derived keys (doc :425-429). */
const assertTask489ZeroResidue = async (
  client: Task489DynamicClient,
  fixture: Task489DynamicFixture
): Promise<void> => {
  const probes: readonly (readonly [string, string, readonly string[]])[] = [
    ["solution_kit_legacy_rollback_progress", "rollback_run_id", [fixture.ownerRunIds.rollback]],
    ["solution_kit_legacy_rollback_progress", "source_run_id", [fixture.ownerRunIds.starter]],
    ["solution_kit_legacy_template_evidence", "source_run_id", [fixture.ownerRunIds.starter]],
    ["solution_kit_starter_apply_owners", "source_run_id", [fixture.ownerRunIds.starter]],
    ["solution_kit_starter_apply_owners", "actor_id", [fixture.ownerActorId]],
    ["solution_kit_install_items", "run_id", [fixture.sentinelRunId]],
    ["solution_kit_install_items", "id", fixture.itemIds],
    ["solution_kit_install_runs", "id", fixture.runIds],
    ["users", "id", fixture.actorIds],
  ];
  for (const [tableName, column, keys] of probes) {
    if ((await countRowsByKeys(client, tableName, column, keys)) !== 0)
      throw new Task489PredecessorError(REASON_TEARDOWN);
  }
};

// --- Sanitized plan evidence: allowlisted fields and charset only, never raw EXPLAIN. ---

type Task489PlanEvidence = Readonly<{
  usedIndexes: readonly string[];
  rootNodeType: string;
  /** Receipt numeric: the ANALYZE actual-row visit sum; the estimate sum ONLY in the disclosed no-ANALYZE fallback. */
  rowsRead: number;
  rowsReturned: number;
  sharedHitBuffers: number;
  sharedReadBuffers: number;
  executionTimeMs: number;
  redactedKeyCount: number;
}>;

/**
 * Audit :1043 (round 3): the frozen registry ceilings this suite bounds receipts
 * with (`EXPECTED_CASE_ROWS_READ`, e.g. 404 + 101x513 + 101x513) are
 * visit-arithmetic over *measured* rows, so the receipt numeric they bound is
 * the ANALYZE actual-row sum over the sanitized nodes — the exact semantic the
 * S2 CLI and the S3 suite fixed — and never the planner-estimate sum
 * `sanitizePlan` accumulates into `evidence.rowsRead` (fixture :837). Fallback
 * disclosure: the planner-estimate sum is returned ONLY when no node carries an
 * `Actual Rows` value anywhere, i.e. the payload is a plain `EXPLAIN` without
 * `ANALYZE`; this suite's own capture loop always runs `EXPLAIN (ANALYZE, ...)`
 * (:1101), so the fallback exists to keep the ceiling meaningful for such a
 * payload, never to soften a measured receipt.
 */
const task489ReceiptRowsRead = (evidence: ReturnType<typeof sanitizePlan>): number => {
  let visitedNodes = 0;
  let analyzedNodes = 0;
  let actualSum = 0;
  const visit = (node: ReturnType<typeof sanitizePlan>["nodes"][number]): void => {
    visitedNodes += 1;
    if (node.actualRows !== null) {
      analyzedNodes += 1;
      actualSum += node.actualRows;
    }
    node.childNodes.forEach(visit);
  };
  evidence.nodes.forEach(visit);
  if (visitedNodes > 0 && analyzedNodes === 0) return evidence.rowsRead; // ANALYZE absent: planner-estimate fallback
  return actualSum;
};

/**
 * The landed S1 sanitizer is the ONLY field allowlist: no SQL text, no binds,
 * no recheck conditions, no timing detail survives it, and any forbidden value
 * fails closed. `Execution Time` is read at the document level only (it never
 * enters the plan digest input). The receipt rows-read numeric is the ANALYZE
 * actual-row visit sum (`task489ReceiptRowsRead`), not the sanitizer's
 * planner-estimate accumulation.
 */
const task489PlanEvidence = (
  statement: Task489StaticPlanStatement,
  profile: ScaleProfile,
  payload: unknown
): Task489PlanEvidence => {
  const document = Array.isArray(payload) ? payload[0] : payload;
  if (document === null || typeof document !== "object" || Array.isArray(document))
    throw new Task489PredecessorError(REASON_PLAN_LEAK);
  const executionTime = (document as Readonly<Record<string, unknown>>)["Execution Time"];
  if (typeof executionTime !== "number" || !Number.isFinite(executionTime) || executionTime < 0)
    throw new Task489PredecessorError(REASON_PLAN_LEAK);
  let evidence;
  try {
    evidence = sanitizePlan(
      payload,
      { removeSql: true, removeBinds: true, allowCatalogNames: true },
      {
        planId: statement.statementId,
        caseId: statement.logicalCaseId,
        profile,
        statementDigest: sha256Hex(`task489-plan|${statement.statementId}`),
      }
    );
  } catch {
    throw new Task489PredecessorError(REASON_PLAN_LEAK);
  }
  return Object.freeze({
    usedIndexes: evidence.usedIndexes,
    rootNodeType: evidence.rootNodeType,
    rowsRead: task489ReceiptRowsRead(evidence),
    rowsReturned: evidence.rowsReturned,
    sharedHitBuffers: evidence.sharedHitBuffers,
    sharedReadBuffers: evidence.sharedReadBuffers,
    executionTimeMs: executionTime,
    redactedKeyCount: evidence.redactedKeys.length,
  });
};

const percentile = (values: readonly number[], fraction: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const index = sorted[Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)))];
  if (index === undefined) throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
  return index;
};

/**
 * Doc :413: the safe-detail bundle's combined p95, computed from the same pg
 * `Execution Time` samples its two separate receipts used: the p95 of the
 * element-wise sums of the two sample vectors (sample i of run-point plus
 * sample i of items-page), never a sum of the two separate percentiles. Both
 * vectors must be the full EXPLAIN sample set or the profile fails closed.
 */
const combinedSafeDetailP95 = (timingsMs: ReadonlyMap<string, readonly number[]>): number => {
  const vectors = SAFE_DETAIL_STATEMENT_IDS.map((statementId) => {
    const vector = timingsMs.get(statementId);
    if (vector === undefined || vector.length !== EXPLAIN_SAMPLES)
      throw new Task489PredecessorError(REASON_DYNAMIC_INCOMPLETE);
    return vector;
  });
  const sums: number[] = [];
  for (let sample = 0; sample < EXPLAIN_SAMPLES; sample += 1) {
    let sum = 0;
    for (const vector of vectors) {
      const value = vector[sample];
      if (value === undefined || !Number.isFinite(value) || value < 0)
        throw new Task489PredecessorError(REASON_BUDGET);
      sum += value;
    }
    sums.push(sum);
  }
  return percentile(sums, 0.95);
};

const dynamicParams = (
  fixture: Task489DynamicFixture,
  statementId: string
): Readonly<Record<string, string>> => {
  const cursor = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.historyCandidateCursor(
    fixture.scope,
    fixture.profile
  );
  return {
    cursorCreatedAt: new Date(cursor.createdAtMs).toISOString(),
    cursorId: cursor.id,
    kitId: "task489-kit-0",
    sourceRunId:
      fixture.supersessionSourceIds[statementId.slice("task489-effective-supersession/".length)] ??
      fixture.ownerRunIds.starter,
    packageKey: fixture.ownerPackageKey,
    actorId: fixture.ownerActorId,
    runId: fixture.sentinelRunId,
  };
};

/** Captures, sanitizes and budget-bounds one statement at one scale (queryCount stays 1). */
const measureTask489Statement = async <Profile extends ScaleProfile>(
  client: Task489DynamicClient,
  statement: Task489StaticPlanStatement,
  params: Readonly<Record<string, string>>,
  profile: Profile
): Promise<
  Readonly<{ result: Task489PredecessorProfileResultV1<Profile>; timingsMs: readonly number[] }>
> => {
  const built = statement.build(params);
  const timings: number[] = [];
  let evidence: Task489PlanEvidence | undefined;
  for (let sample = 0; sample < EXPLAIN_SAMPLES; sample += 1) {
    const rows = await client.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${built.sql}`,
      built.values
    );
    const payload = rows[0]?.["QUERY PLAN"] ?? rows[0]?.plan;
    evidence = task489PlanEvidence(
      statement,
      profile,
      typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload
    );
    timings.push(evidence.executionTimeMs);
  }
  if (
    evidence === undefined ||
    evidence.usedIndexes.includes(statement.expectedLargePlanIndex) === false
  ) {
    throw new Task489PredecessorError(REASON_BUDGET);
  }
  const budget = statement.budgets[profile];
  const result: Task489PredecessorProfileResultV1<Profile> = {
    profile,
    // Only statement/case identity and sanitized counters enter the digest input.
    planDigest: sha256Hex(
      JSON.stringify([
        statement.statementId,
        profile,
        evidence.rootNodeType,
        evidence.usedIndexes,
        evidence.rowsRead,
        evidence.rowsReturned,
        evidence.sharedHitBuffers,
        evidence.sharedReadBuffers,
        evidence.redactedKeyCount,
      ])
    ),
    queryCount: 1,
    // `evidence.rowsRead` is already the ANALYZE actual-row visit sum (audit :1043).
    rowsRead: evidence.rowsRead,
    rowsReturned: evidence.rowsReturned,
    transferredBytes: statement.projection.split(",").length * evidence.rowsReturned * 8,
    sharedBuffers: evidence.sharedHitBuffers + evidence.sharedReadBuffers,
    p50Ms: percentile(timings, 0.5),
    p95Ms: percentile(timings, 0.95),
    p99Ms: percentile(timings, 0.99),
  };
  if (
    result.rowsReturned > statement.bound ||
    result.rowsRead > budget.rowsReadMax ||
    result.rowsReturned > budget.rowsReturnedMax ||
    result.transferredBytes > budget.transferredBytesMax ||
    result.sharedBuffers > budget.sharedBuffersMax ||
    result.p50Ms > budget.p50MsMax ||
    result.p95Ms > budget.p95MsMax ||
    result.p99Ms > budget.p99MsMax
  ) {
    throw new Task489PredecessorError(REASON_BUDGET);
  }
  // The raw pg `Execution Time` samples stay private to this scale: only their
  // element-wise safe-detail sums form the combined receipt (doc :413).
  return Object.freeze({ result, timingsMs: Object.freeze(timings) });
};

// --- DB-free proof (audit :1043): the ANALYZE actual-row sum — and only in the disclosed fallback the estimate sum — is what the rows-read ceiling consumes. ---

/**
 * Drives the real `measureTask489Statement` capture loop through a canned
 * EXPLAIN client (no socket): one stable `Execution Time` sample set keeps every
 * timing percentile inside the run-point budget, so the ONLY way an arm passes
 * or fails is its rows-read numeric against `rowsReadMax = 1`.
 */
describe("rows-read receipt semantic against the visit-arithmetic registry ceiling (DB-free)", () => {
  const runPoint = statementFor("task489-safe-detail/run-point");
  const measureParams: Readonly<Record<string, string>> = {
    runId: SYNTHETIC_PARAMS.runId as string,
  };
  const scanNode = (
    planRows: number,
    actualRows: number | undefined
  ): Readonly<Record<string, unknown>> => ({
    "Node Type": "Index Scan",
    "Relation Name": "solution_kit_install_runs",
    "Index Name": runPoint.expectedLargePlanIndex,
    "Plan Rows": planRows,
    ...(actualRows === undefined ? {} : { "Actual Rows": actualRows }),
    "Shared Hit Blocks": 2,
    "Shared Read Blocks": 0,
    "Total Cost": 0.2,
  });
  const limitNode = (
    planRows: number,
    actualRows: number,
    child: Readonly<Record<string, unknown>>
  ): Readonly<Record<string, unknown>> => ({
    "Node Type": "Limit",
    "Plan Rows": planRows,
    "Actual Rows": actualRows,
    "Shared Hit Blocks": 0,
    "Shared Read Blocks": 0,
    "Total Cost": 0.1,
    Plans: [child],
  });
  const cannedClient = (plan: Readonly<Record<string, unknown>>): Task489DynamicClient => ({
    query: async () => [{ "QUERY PLAN": { Plan: plan, "Execution Time": 10 } }],
  });
  const measure = async (
    plan: Readonly<Record<string, unknown>>
  ): Promise<Task489PredecessorProfileResultV1<"small">> =>
    (await measureTask489Statement(cannedClient(plan), runPoint, measureParams, "small")).result;

  test("a 9000-row planner estimate cannot pass, while its ANALYZE actual-row sum of exactly the ceiling does", async () => {
    // Pre-fix this arm threw `budget_regression`: the receipt numeric was the
    // estimate sum (9000). Post-fix the actual-row visit sum (1) feeds the
    // ceiling and becomes the receipt numeric.
    const single = await measure(scanNode(9_000, 1));
    expect(single.rowsRead).toBe(1);
    expect(single.rowsRead).toBe(runPoint.budgets.small.rowsReadMax);
    expect(single.rowsReturned).toBe(1);
    // A nested plan whose actual-row visit sum (1 + 2 = 3) crosses the ceiling
    // fails closed even though its estimate sum (1 + 0 = 1) would have passed:
    // the ceiling provably consumes ACTUAL rows, not the planner estimates.
    const nested = limitNode(1, 1, scanNode(0, 2));
    await expectTask489AsyncFailure(() => measure(nested), REASON_BUDGET);
  });

  test("the disclosed fallback fires only when no node carries Actual Rows and then feeds the estimate sum to the ceiling", async () => {
    // Plain `EXPLAIN` without ANALYZE: no `Actual Rows` anywhere, so the
    // planner-estimate sum is the only available visit arithmetic. At the
    // ceiling it passes and is the receipt numeric; one row over, it breaches.
    const estimate = await measure(scanNode(1, undefined));
    expect(estimate.rowsRead).toBe(1);
    expect(estimate.rowsRead).toBe(runPoint.budgets.small.rowsReadMax);
    expect(estimate.rowsReturned).toBe(0); // no ANALYZE: the root never reports actual rows
    await expectTask489AsyncFailure(() => measure(scanNode(2, undefined)), REASON_BUDGET);
  });
});

/**
 * Doc :207-209: this envelope itself reads the reviewed freeze receipt and
 * rejects a stale, digest-drifted or unreviewed receipt BEFORE any fixture
 * build, seed, plan capture or cleanup work. The landed small receipt is a
 * "candidate", so the small profile stays fail-closed by contract until the
 * owner reviews it; only a reviewed receipt admits dynamic work. The redacted
 * reason slug is the whole surface — the underlying plan-check detail never is.
 */
const requireReviewedTask489PredecessorFreezeReceipt = (
  profile: ScaleProfile
): ReturnType<typeof requireReviewedTask551FreezeReceipt> => {
  try {
    return requireReviewedTask551FreezeReceipt(profile);
  } catch {
    throw new Task489PredecessorError(REASON_FREEZE_UNREVIEWED);
  }
};

/** The doc-:188-270 envelope: preflight, reviewed freeze receipt, seed, run, and the nested-finally cleanup. */
const withTask489PredecessorFixture = async <T>(
  scope: string,
  profile: ScaleProfile,
  run: (client: Task489DynamicClient, fixture: Task489DynamicFixture) => Promise<T>
): Promise<T> => {
  const injection = requireTask489PredecessorInjection();
  const childValues = assertTask551FixtureTargetChildKeys(injection.fixtureValues);
  const target = parseTask551FixtureTarget(childValues);
  await assertTask551FixtureTarget(target, injection.client);
  // Doc :207-209: per-profile reviewed freeze receipt, ahead of the fixture
  // build and of every seed, plan, inspection or cleanup connection.
  requireReviewedTask489PredecessorFreezeReceipt(profile);
  const fixture = buildTask489DynamicFixture(scope, profile);
  let result!: T;
  let completed = false;
  let primaryReason: string | undefined;
  let teardownFailures: readonly Task489TeardownStage[] = [];
  try {
    try {
      await seedTask489DynamicClosure(injection.database, fixture);
      await assertTask489DynamicClosure(injection.database, fixture);
      result = await run(injection.database, fixture);
      completed = true;
    } catch (error) {
      primaryReason =
        error instanceof Task489PredecessorError ? error.reason : REASON_DYNAMIC_UNEXPECTED;
    }
  } finally {
    teardownFailures = await collectTask489TeardownFailures({
      cleanup: async () => {
        await cleanupTask489DynamicClosure(injection.database, fixture);
      },
      "zero-residue": async () => {
        await assertTask489ZeroResidue(injection.database, fixture);
      },
      "post-cleanup-proof": async () => {
        await assertTask551FixtureTargetPostCleanup(target, injection.client);
      },
    });
  }
  if (teardownFailures.length > 0) throw new Task489PredecessorError(REASON_TEARDOWN);
  if (primaryReason !== undefined) throw new Task489PredecessorError(primaryReason);
  if (!completed) throw new Task489PredecessorError(REASON_DYNAMIC_INCOMPLETE);
  return result;
};

const requireResult = <Profile extends ScaleProfile>(
  results: ReadonlyMap<string, Task489PredecessorProfileResultV1<Profile>>,
  statementId: string
): Task489PredecessorProfileResultV1<Profile> => {
  const value = results.get(statementId);
  if (value === undefined) throw new Task489PredecessorError(REASON_DYNAMIC_INCOMPLETE);
  return value;
};

/** One scale's measured model: fifteen separate receipts plus the safe-detail combined p95. */
type Task489ProfileMeasurement<Profile extends ScaleProfile> = Readonly<{
  results: ReadonlyMap<string, Task489PredecessorProfileResultV1<Profile>>;
  combinedSafeDetailP95Ms: number;
}>;

/** One scale, all fifteen cases, inside one seeded and fully cleaned fixture scope. */
const measureProfile = async <Profile extends ScaleProfile>(
  scope: string,
  profile: Profile
): Promise<Task489ProfileMeasurement<Profile>> => {
  const results = new Map<string, Task489PredecessorProfileResultV1<Profile>>();
  const timingsMs = new Map<string, readonly number[]>();
  await withTask489PredecessorFixture(scope, profile, async (client, fixture) => {
    for (const statementId of TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS) {
      const statement = statementFor(statementId);
      const params = dynamicParams(fixture, statementId);
      const measured = await measureTask489Statement(client, statement, params, profile);
      results.set(statementId, measured.result);
      timingsMs.set(statementId, measured.timingsMs);
    }
  });
  if (results.size !== TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.length)
    throw new Task489PredecessorError(REASON_DYNAMIC_INCOMPLETE);
  // Doc :413: the bundle's combined ceiling is a budget of its own, beyond the
  // two separate per-statement receipts the map already enforces.
  const combinedSafeDetailP95Ms = combinedSafeDetailP95(timingsMs);
  assertTask489CombinedSafeDetailBudget(profile, combinedSafeDetailP95Ms);
  return Object.freeze({ results, combinedSafeDetailP95Ms });
};

/** Doc :188-270 and :292-310: both scales, the fifteen ordered statement receipts and the per-scale combined safe-detail p95. */
const runTask489PredecessorDynamicPhase = async (): Promise<
  Readonly<{
    statementReceipts: Task489PredecessorStatementReceiptV1[];
    combinedSafeDetailP95Ms: Readonly<Record<ScaleProfile, number>>;
  }>
> => {
  const smallScope = createRunScope();
  const largeScope = createRunScope();
  const small = await measureProfile(smallScope, "small");
  const large = await measureProfile(largeScope, "large");
  const statementReceipts = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.map(
    (statementId): Task489PredecessorStatementReceiptV1 => {
      const statement = statementFor(statementId);
      return {
        companionId: statement.companionId,
        logicalCaseId: statement.logicalCaseId,
        statementId,
        profileResults: [
          requireResult(small.results, statementId),
          requireResult(large.results, statementId),
        ],
      };
    }
  );
  return Object.freeze({
    statementReceipts,
    combinedSafeDetailP95Ms: Object.freeze({
      small: small.combinedSafeDetailP95Ms,
      large: large.combinedSafeDetailP95Ms,
    }),
  });
};

let task489ArtifactWritten = false;

/** Setup may clear only a stale regular artifact; a symlink or other node fails closed. */
const prepareOnlyOwnedTask489PredecessorArtifactPath = (): void => {
  const state = classifyArtifactPath(
    existsSync(ARTIFACT_PATH) ? lstatSync(ARTIFACT_PATH) : undefined
  );
  assertPreparableArtifactPath(state);
  if (state === "regular-file") unlinkSync(ARTIFACT_PATH);
};

/** Doc :444-468: canonical bytes, exclusive create at the fixed path, nothing else. */
const writeCanonicalTask489PredecessorArtifact = (bytes: Uint8Array): number => {
  if (bytes.length === 0 || bytes[bytes.length - 1] !== 10)
    throw new Task489PredecessorError(REASON_ARTIFACT_BYTES);
  prepareOnlyOwnedTask489PredecessorArtifactPath();
  mkdirSync(ARTIFACT_DIRECTORY, { recursive: true });
  const handle = openSync(ARTIFACT_PATH, "wx");
  try {
    let written = 0;
    while (written < bytes.length)
      written += writeSync(handle, bytes, written, bytes.length - written);
    return written;
  } finally {
    closeSync(handle);
  }
};

const writeOnlyTask489PredecessorArtifactOnce = (bytes: Uint8Array): number => {
  if (task489ArtifactWritten) throw new Task489PredecessorError(REASON_ARTIFACT_DUPLICATE);
  task489ArtifactWritten = true;
  return writeCanonicalTask489PredecessorArtifact(bytes);
};

describe("injection-gated dynamic half and the one artifact", () => {
  test("runs both scales and all fifteen cases, then writes the one canonical artifact", async () => {
    if (readTask489PredecessorInjection() === undefined) return; // airtight fail-close (doc :188-197)
    const { statementReceipts, combinedSafeDetailP95Ms } =
      await runTask489PredecessorDynamicPhase();
    // Doc :413: the safe-detail bundle is asserted under its combined ceiling in
    // addition to the two separate per-statement receipts the map enforces.
    expect(combinedSafeDetailP95Ms.small).toBeLessThanOrEqual(SAFE_DETAIL_COMBINED_P95_MS.small);
    expect(combinedSafeDetailP95Ms.large).toBeLessThanOrEqual(SAFE_DETAIL_COMBINED_P95_MS.large);
    assertArtifactEligibility({
      profiles: DYNAMIC_PROFILES,
      teardownFailureCount: 0,
      statementReceipts,
      combinedSafeDetailP95Ms,
    });
    expect(statementReceipts.map((statementReceipt) => statementReceipt.statementId)).toEqual([
      ...TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS,
    ]);
    const bytes = serializeTask489PredecessorReceiptV1(
      createTask489PredecessorReceiptV1(statementReceipts)
    );
    const written = writeOnlyTask489PredecessorArtifactOnce(bytes);
    expect(written).toBe(bytes.length);
    assertWrittenArtifactPath(classifyArtifactPath(lstatSync(ARTIFACT_PATH)));
    const readback = readFileSync(ARTIFACT_PATH);
    expect(readback.length).toBe(bytes.length);
    expect(textOf(readback)).toBe(textOf(bytes));
    expect(parseTask489PredecessorReceiptV1(readback).statementReceipts.length).toBe(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.length
    );
  });

  test("airtight form fail-closes the dynamic half and leaves no artifact", () => {
    if (readTask489PredecessorInjection() !== undefined) return;
    expect(existsSync(ARTIFACT_PATH)).toBe(false);
  });

  test("the envelope's reviewed-freeze-receipt gate rejects the candidate small receipt and admits only the reviewed one (no socket)", () => {
    // Landed receipt byte shapes (tests/perf/task551DatabaseBaseline/freezeReceipts.ts):
    // small.reviewState === "candidate", large.reviewState === "reviewed".
    expectTask489Failure(
      () => requireReviewedTask489PredecessorFreezeReceipt("small"),
      REASON_FREEZE_UNREVIEWED
    );
    const reviewed = requireReviewedTask489PredecessorFreezeReceipt("large");
    expect(reviewed.reviewState).toBe("reviewed");
    expect(reviewed.profile).toBe("large");
    expect(reviewed.statementCeilings.length).toBe(32);
    // The combined ceiling is exactly the sum of the two separate p95 ceilings
    // of the bundle (doc :413), and the bundle is the registry's only one.
    expect(SAFE_DETAIL_STATEMENT_IDS.join()).toBe(
      "task489-safe-detail/run-point,task489-safe-detail/items-page"
    );
    expect(SAFE_DETAIL_COMBINED_P95_MS.small).toBe(
      expectedCaseP95(SAFE_DETAIL_STATEMENT_IDS[0]!)[0] +
        expectedCaseP95(SAFE_DETAIL_STATEMENT_IDS[1]!)[0]
    );
    expect(SAFE_DETAIL_COMBINED_P95_MS.large).toBe(
      expectedCaseP95(SAFE_DETAIL_STATEMENT_IDS[0]!)[1] +
        expectedCaseP95(SAFE_DETAIL_STATEMENT_IDS[1]!)[1]
    );
    expect(SAFE_DETAIL_COMBINED_P95_MS.small).toBe(100);
    expect(SAFE_DETAIL_COMBINED_P95_MS.large).toBe(250);
    expectTask489Failure(
      () => assertTask489CombinedSafeDetailBudget("small", 100.5),
      REASON_BUDGET
    );
    expect(() => assertTask489CombinedSafeDetailBudget("large", 250)).not.toThrow();
  });

  test("the combined safe-detail p95 is the p95 of paired sample sums and breaches fail-closed (no socket)", async () => {
    const paired = new Map<string, readonly number[]>([
      [SAFE_DETAIL_STATEMENT_IDS[0]!, [10, 10, 10, 10, 10]],
      [SAFE_DETAIL_STATEMENT_IDS[1]!, [20, 20, 20, 20, 20]],
    ]);
    expect(combinedSafeDetailP95(paired)).toBe(30);
    expect(() =>
      assertTask489CombinedSafeDetailBudget("small", combinedSafeDetailP95(paired))
    ).not.toThrow();
    // Both separate p95s stay at their own ceilings while the paired sums cross
    // the combined ceiling: separate passes never imply a combined pass.
    const runPoint = [30, 25, 20, 20, 20] as const;
    const itemsPage = [75, 100, 20, 20, 20] as const;
    expect(percentile(runPoint, 0.95)).toBe(25);
    expect(percentile(itemsPage, 0.95)).toBe(75);
    expect(percentile(runPoint, 0.95)).toBeLessThanOrEqual(
      expectedCaseP95(SAFE_DETAIL_STATEMENT_IDS[0]!)[0]
    );
    expect(percentile(itemsPage, 0.95)).toBeLessThanOrEqual(
      expectedCaseP95(SAFE_DETAIL_STATEMENT_IDS[1]!)[0]
    );
    const over = new Map<string, readonly number[]>([
      [SAFE_DETAIL_STATEMENT_IDS[0]!, runPoint],
      [SAFE_DETAIL_STATEMENT_IDS[1]!, itemsPage],
    ]);
    expect(combinedSafeDetailP95(over)).toBe(105);
    expectTask489Failure(
      () => assertTask489CombinedSafeDetailBudget("small", combinedSafeDetailP95(over)),
      REASON_BUDGET
    );
    // A truncated or non-finite sample vector never silently produces a receipt.
    await expectTask489AsyncFailure(
      async () => combinedSafeDetailP95(new Map([[SAFE_DETAIL_STATEMENT_IDS[0]!, [10, 10]]])),
      REASON_DYNAMIC_INCOMPLETE
    );
    await expectTask489AsyncFailure(
      async () =>
        combinedSafeDetailP95(
          new Map([
            [SAFE_DETAIL_STATEMENT_IDS[0]!, [10, 10, 10, 10, Number.NaN]],
            [SAFE_DETAIL_STATEMENT_IDS[1]!, [20, 20, 20, 20, 20]],
          ])
        ),
      REASON_BUDGET
    );
  });
});

// --- 6. Source contract: this file's own imports and write family stay allowlisted. ---

const SELF_SOURCE_LINES: readonly string[] = textOf(
  readFileSync(fileURLToPath(import.meta.url))
).split("\n");
const SELF_SOURCE_BODY: string = SELF_SOURCE_LINES.filter(
  (line) =>
    !line.trimStart().startsWith("import") &&
    !line.trimStart().startsWith("} from") &&
    !line.includes("occurrencesOf(")
).join("\n");
const SELF_IMPORT_SPECIFIERS: readonly string[] = SELF_SOURCE_LINES.flatMap((line) => {
  const match = /from "([^"]+)"/.exec(line);
  return match === null ? [] : [match[1]];
});
const occurrencesOf = (needle: string): number => SELF_SOURCE_BODY.split(needle).length - 1;

/** Slices one top-level declaration (signature line through its closing brace line). */
const sourceOfDeclaration = (signatureNeedle: string): string => {
  const start = SELF_SOURCE_LINES.findIndex((line) => line.includes(signatureNeedle));
  const end =
    start < 0 ? -1 : SELF_SOURCE_LINES.findIndex((line, index) => index > start && line === "};");
  if (start < 0 || end < 0) throw new Task489PredecessorError(REASON_DYNAMIC_UNEXPECTED);
  return SELF_SOURCE_LINES.slice(start, end + 1).join("\n");
};

describe("source contract of this file", () => {
  test("imports exactly the four seam modules plus node builtins and bun:test, never a test rider", () => {
    const projectImports = SELF_IMPORT_SPECIFIERS.filter((specifier) => specifier.startsWith("."));
    expect(projectImports).toEqual([
      "./fixtures/task551DatabaseScale",
      "./fixtures/task551QueryPlanContracts",
      "./fixtures/task489SolutionKitRunPredecessor",
      "../../scripts/task551DatabaseBaseline/fixtureTarget",
    ]);
    expect(SELF_IMPORT_SPECIFIERS.filter((specifier) => specifier.startsWith("node:"))).toEqual([
      "node:crypto",
      "node:fs",
      "node:url",
    ]);
    expect(SELF_IMPORT_SPECIFIERS.filter((specifier) => specifier === "bun:test")).toHaveLength(1);
    expect(SELF_IMPORT_SPECIFIERS.some((specifier) => specifier.endsWith(".test"))).toBe(false);
    expect(
      SELF_IMPORT_SPECIFIERS.some(
        (specifier) => specifier.includes("..") && !specifier.includes("scripts/")
      )
    ).toBe(false);
  });

  test("uses exactly one write family and never a second output, driver, DDL or generated doc path", () => {
    expect(occurrencesOf("openSync")).toBe(1);
    expect(occurrencesOf("writeSync")).toBe(1);
    expect(occurrencesOf("unlinkSync")).toBe(1);
    expect(occurrencesOf("mkdirSync")).toBe(1);
    expect(occurrencesOf("closeSync")).toBe(1);
    expect(occurrencesOf("readFileSync")).toBe(2);
    expect(occurrencesOf("existsSync")).toBe(3);
    expect(occurrencesOf("lstatSync")).toBe(2);
    expect(occurrencesOf("readdirSync")).toBe(1);
    // One declaration each for the generated directory and file name.
    expect(occurrencesOf("const ARTIFACT_DIRECTORY")).toBe(1);
    expect(occurrencesOf("const ARTIFACT_FILE_NAME")).toBe(1);
    for (const [left, right] of [
      ["writeFile", "Sync"],
      ["appendFile", "Sync"],
      ["copyFile", "Sync"],
      ["rename", "Sync"],
      ["mkdtemp", "Sync"],
      ["chmod", "Sync"],
      ["process.", "env"],
      ["import.meta", ".env"],
      ["Bun.", "spawn"],
      ["node:child", "_process"],
      ["from ", `"pg"`],
      ["from ", `"postgres"`],
      ["drizz", "le"],
      ["CREATE IND", "EX"],
      ["ALTER TAB", "LE"],
      ["_docs/_work", "flows"],
      ["task551IndexAndConstraint", "Catalog"],
      ["OnlineIndex", "Deployment"],
      ["Concurrency", "Constraints"],
      ["database-pg-stat-", "interval"],
      ["task-551-online-", "indexes"],
    ] as const) {
      expect(occurrencesOf(`${left}${right}`)).toBe(0);
    }
    // The only ambient-URL-shaped text is the seam's required three-key name.
    expect(occurrencesOf(["DATABASE_", "URL"].join(""))).toBe(
      occurrencesOf(["TASK551_FIXTURE_DATA", "BASE_URL"].join(""))
    );
  });

  test("the dynamic envelope itself reads the reviewed freeze receipt ahead of any seed (doc :207-209)", () => {
    const envelope = sourceOfDeclaration("const withTask489PredecessorFixture");
    const gateName = "requireReviewedTask489PredecessorFreezeReceipt(profile)";
    const gate = envelope.indexOf(gateName);
    const seed = envelope.indexOf("seedTask489DynamicClosure(injection.database, fixture)");
    expect(gate).toBeGreaterThan(-1);
    expect(seed).toBeGreaterThan(-1);
    // The gate is inside the envelope, is called exactly once, and precedes the
    // fixture build and every seed, plan, inspection or cleanup connection.
    expect(envelope.split(gateName).length - 1).toBe(1);
    expect(gate).toBeLessThan(envelope.indexOf("buildTask489DynamicFixture(scope, profile)"));
    expect(gate).toBeLessThan(seed);
  });

  test("the generated directory holds at most the one artifact file", () => {
    if (!existsSync(ARTIFACT_DIRECTORY)) return; // airtight form: nothing was ever created
    const siblings = readdirSync(ARTIFACT_DIRECTORY);
    expect(
      siblings.length === 0 || (siblings.length === 1 && siblings[0] === ARTIFACT_FILE_NAME)
    ).toBe(true);
  });
});

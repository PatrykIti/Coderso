/**
 * TASK-551-01-L02 TASK-489 predecessor fixture (sole ownership).
 *
 * Deterministic seed recipe and future-query contract for TASK-489's solution-kit
 * run-history and rollback surfaces. This registry remains outside the closed
 * TASK-551 Admin plan set: five companion IDs, fourteen logical cases, fifteen
 * statement cases, and thirty numeric small/large statement receipts.
 */
import { createHash } from "node:crypto";
import { requireTask551LowercaseSha256 } from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  equalSortTs,
  TASK551_GENERAL_CLOCK_MS,
  task551UuidV5,
  uniqueTs,
  type ScaleProfile,
  type SeedTable,
} from "./task551DatabaseScale";

export type Task489CompanionId =
  | "task489-runs-all-keyset"
  | "task489-runs-package-keyset"
  | "task489-effective-supersession"
  | "task489-active-starter-owner"
  | "task489-safe-detail";

type Task489NumericBudget = Readonly<{
  queryCountMax: 1;
  rowsReadMax: number;
  rowsReturnedMax: number;
  transferredBytesMax: number;
  sharedBuffersMax: number;
  p50MsMax: number;
  p95MsMax: number;
  p99MsMax: number;
}>;

type Task489QueryValue = string | number;
type Task489StaticPlanQuery = Readonly<{
  sql: string;
  values: readonly Task489QueryValue[];
  bound: number;
}>;
type Task489StaticPlanParams = Readonly<Record<string, unknown>>;

function invalidTask489Query(): never {
  throw new Error("database_baseline_invalid");
}

const requiredTask489String = (params: Task489StaticPlanParams, key: string): string => {
  const value = params[key];
  if (typeof value !== "string" || value.length === 0) invalidTask489Query();
  return value;
};

const task489Query = (
  sql: string,
  values: readonly Task489QueryValue[],
  bound: number
): Task489StaticPlanQuery => {
  if (!Number.isSafeInteger(bound) || bound < 1 || sql.includes(";")) invalidTask489Query();
  return Object.freeze({ sql, values: Object.freeze([...values]), bound });
};

export type Task489StaticPlanStatement = Readonly<{
  statementId: string;
  logicalCaseId: string;
  companionId: Task489CompanionId;
  projection: string;
  predicate: string;
  order: string;
  bound: number;
  expectedLargePlanIndex: string;
  build: (params: Task489StaticPlanParams) => Task489StaticPlanQuery;
  budgets: Readonly<Record<ScaleProfile, Task489NumericBudget>>;
}>;

const fixtureDigest = (seed: string): string =>
  createHash("sha256").update(`task489-predecessor|${seed}`).digest("hex");
const BULK_RUNS = { small: 10_000, large: 1_000_000 } as const;
const PACKAGE_KEYS = { small: 20, large: 2_000 } as const;
const HISTORY_CANDIDATES = 101 as const;
const APPLIES_PER_CANDIDATE = 513 as const;
const HISTORY_APPLIES = HISTORY_CANDIDATES * APPLIES_PER_CANDIDATE;
const HISTORY_ROLLBACKS = HISTORY_APPLIES;
const HISTORY_RUNS = HISTORY_CANDIDATES + HISTORY_APPLIES + HISTORY_ROLLBACKS;
const SUPERSESSION_CHAIN_SIZES = [1, 3, 1_023, 1_025, 1_027, 1_026, 1_026, 1_026] as const;
const SUPERSESSION_RUNS = SUPERSESSION_CHAIN_SIZES.reduce((sum, size) => sum + size, 0);
const SENTINEL_RUNS = 1 as const;
const OWNER_GRAPH_RUNS = 3 as const;
const ROLLBACK_GRAPH_RUNS = 2 as const;
const SENTINEL_ITEMS = 513 as const;
const modeStatus = (ordinal: number): readonly [string, string] =>
  (
    [
      ["apply", "success"],
      ["rollback", "success"],
      ["apply", "failed"],
      ["apply", "running"],
    ] as const
  )[ordinal % 4]!;
const runId = (scope: string, profile: ScaleProfile, family: string, ordinal: number): string =>
  task551UuidV5(scope, profile, family, ordinal);
const kitId = (ordinal: number, profile: ScaleProfile): string =>
  `task489-kit-${ordinal % PACKAGE_KEYS[profile]}`;
const runRow = (
  id: string,
  kit: string,
  mode: string,
  status: string,
  actor: string,
  rollbackOfRunId: string | null,
  createdAt: Date,
  finishedAt: Date | null,
  summary: Readonly<Record<string, unknown>>
): readonly unknown[] => [
  id,
  kit,
  mode,
  status,
  actor,
  rollbackOfRunId,
  {},
  summary,
  status === "failed" ? "task489-fixture-failure" : null,
  createdAt,
  createdAt,
  finishedAt,
];
const itemRow = (id: string, run: string, position: number): readonly unknown[] => [
  id,
  run,
  position,
  `resource-${position % 8}`,
  `task489-resource-${position}`,
  (["create", "update", "noop", "delete", "restore"] as const)[position % 5],
  "success",
  null,
  { id: `res-${position}`, digest: fixtureDigest(`item-${position}`) },
  null,
  null,
  uniqueTs(position),
  uniqueTs(position),
];

const chainRows = (
  scope: string,
  profile: ScaleProfile,
  startOrdinal: number,
  applyCount: number,
  rollbackCount: number,
  unrolledAt: number | null
): readonly (readonly unknown[])[] => {
  const rows: (readonly unknown[])[] = [];
  const source = runId(scope, profile, "task489-supersession", startOrdinal);
  rows.push(
    runRow(
      source,
      "task489-kit-supersession",
      "apply",
      "success",
      "task489-actor-0",
      null,
      uniqueTs(startOrdinal),
      uniqueTs(startOrdinal),
      { planDigest: fixtureDigest("ss-source") }
    )
  );
  const applyIds: string[] = [];
  for (let index = 0; index < applyCount; index += 1) {
    const ordinal = startOrdinal + index + 1;
    const id = runId(scope, profile, "task489-supersession", ordinal);
    applyIds.push(id);
    rows.push(
      runRow(
        id,
        "task489-kit-supersession",
        "apply",
        "success",
        "task489-actor-0",
        null,
        uniqueTs(ordinal),
        uniqueTs(ordinal),
        { planDigest: fixtureDigest(`ss-apply-${index}`) }
      )
    );
  }
  let rollbackOrdinal = startOrdinal + applyCount + 1;
  let emitted = 0;
  for (let index = 0; index < applyCount && emitted < rollbackCount; index += 1) {
    if (index === unrolledAt) continue;
    rows.push(
      runRow(
        runId(scope, profile, "task489-supersession", rollbackOrdinal),
        "task489-kit-supersession",
        "rollback",
        "success",
        "task489-actor-0",
        applyIds[index]!,
        uniqueTs(rollbackOrdinal),
        uniqueTs(rollbackOrdinal),
        { planDigest: fixtureDigest(`ss-rollback-${index}`) }
      )
    );
    rollbackOrdinal += 1;
    emitted += 1;
  }
  return rows;
};

const supersessionRows = (
  scope: string,
  profile: ScaleProfile
): readonly (readonly unknown[])[] => {
  const rows: (readonly unknown[])[] = [];
  const unrolledPositions: readonly (number | null)[] = [null, null, null, null, null, 0, 256, 512];
  let ordinal = 0;
  for (let index = 0; index < SUPERSESSION_CHAIN_SIZES.length; index += 1) {
    const size = SUPERSESSION_CHAIN_SIZES[index]!;
    const applyCount =
      size === 1 ? 0 : size === 3 ? 1 : size === 1_023 ? 511 : size === 1_025 ? 512 : 513;
    const rollbackCount = size === 1_026 ? applyCount - 1 : applyCount;
    rows.push(
      ...chainRows(scope, profile, ordinal, applyCount, rollbackCount, unrolledPositions[index]!)
    );
    ordinal += size;
  }
  return rows;
};

const historyRows = (scope: string, profile: ScaleProfile): readonly (readonly unknown[])[] => {
  const rows: (readonly unknown[])[] = [];
  const applyOrdinals: number[] = [];
  for (let index = 0; index < HISTORY_CANDIDATES; index += 1)
    rows.push(
      runRow(
        runId(scope, profile, "task489-history", index),
        "task489-kit-history",
        "apply",
        "success",
        `task489-actor-${index % 100}`,
        null,
        uniqueTs(index),
        uniqueTs(index),
        { progressDigest: fixtureDigest(`history-candidate-${index}`) }
      )
    );
  for (let index = 0; index < HISTORY_APPLIES; index += 1) {
    const ordinal = HISTORY_CANDIDATES + index;
    applyOrdinals.push(ordinal);
    rows.push(
      runRow(
        runId(scope, profile, "task489-history", ordinal),
        "task489-kit-history",
        "apply",
        "success",
        `task489-actor-${Math.floor(index / APPLIES_PER_CANDIDATE) % 100}`,
        null,
        uniqueTs(ordinal),
        uniqueTs(ordinal),
        { planDigest: fixtureDigest(`history-apply-${index}`) }
      )
    );
  }
  for (let index = 0; index < HISTORY_ROLLBACKS; index += 1) {
    const ordinal = HISTORY_CANDIDATES + HISTORY_APPLIES + index;
    rows.push(
      runRow(
        runId(scope, profile, "task489-history", ordinal),
        "task489-kit-history",
        "rollback",
        "success",
        `task489-actor-${index % 100}`,
        runId(scope, profile, "task489-history", applyOrdinals[index]!),
        uniqueTs(ordinal),
        uniqueTs(ordinal),
        { planDigest: fixtureDigest(`history-rollback-${index}`) }
      )
    );
  }
  return rows;
};

const sentinelRows = (
  scope: string,
  profile: ScaleProfile
): Readonly<{ runs: readonly (readonly unknown[])[]; items: readonly (readonly unknown[])[] }> => {
  const id = runId(scope, profile, "task489-sentinel", 0);
  return {
    runs: [
      runRow(
        id,
        "task489-kit-sentinel",
        "apply",
        "success",
        "task489-actor-0",
        null,
        uniqueTs(0),
        uniqueTs(0),
        { planDigest: fixtureDigest("sentinel") }
      ),
    ],
    items: Array.from({ length: SENTINEL_ITEMS }, (_, position) =>
      itemRow(runId(scope, profile, "task489-items", position), id, position)
    ),
  };
};
const ownerGraphRows = (scope: string, profile: ScaleProfile): readonly (readonly unknown[])[] => [
  runRow(
    runId(scope, profile, "task489-owner", 0),
    "task489-kit-owner",
    "apply",
    "success",
    "task489-actor-0",
    null,
    uniqueTs(0),
    uniqueTs(0),
    { planDigest: fixtureDigest("owner-starter") }
  ),
  runRow(
    runId(scope, profile, "task489-owner", 1),
    "task489-kit-owner",
    "apply",
    "success",
    "task489-actor-0",
    null,
    uniqueTs(1),
    uniqueTs(1),
    { planDigest: fixtureDigest("owner-active") }
  ),
  runRow(
    runId(scope, profile, "task489-owner", 2),
    "task489-kit-owner",
    "rollback",
    "success",
    "task489-actor-0",
    runId(scope, profile, "task489-owner", 0),
    uniqueTs(2),
    uniqueTs(2),
    { planDigest: fixtureDigest("owner-rollback") }
  ),
];
const rollbackGraphRows = (
  scope: string,
  profile: ScaleProfile
): readonly (readonly unknown[])[] => [
  runRow(
    runId(scope, profile, "task489-rollback-graph", 0),
    "task489-kit-rollback",
    "apply",
    "success",
    "task489-actor-1",
    null,
    uniqueTs(0),
    uniqueTs(0),
    { planDigest: fixtureDigest("rb-apply") }
  ),
  runRow(
    runId(scope, profile, "task489-rollback-graph", 1),
    "task489-kit-rollback",
    "rollback",
    "running",
    "task489-actor-1",
    runId(scope, profile, "task489-rollback-graph", 0),
    uniqueTs(1),
    null,
    { progressDigest: fixtureDigest("rb-running") }
  ),
];

export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS = {
  companionIds: [
    "task489-runs-all-keyset",
    "task489-runs-package-keyset",
    "task489-effective-supersession",
    "task489-active-starter-owner",
    "task489-safe-detail",
  ] as const satisfies readonly Task489CompanionId[],
  profile: {
    bulkRuns: BULK_RUNS,
    packageKeys: PACKAGE_KEYS,
    historyCandidates: HISTORY_CANDIDATES,
    appliesPerCandidate: APPLIES_PER_CANDIDATE,
    historyRuns: HISTORY_RUNS,
    supersessionRuns: SUPERSESSION_RUNS,
    sentinelRuns: SENTINEL_RUNS,
    ownerGraphRuns: OWNER_GRAPH_RUNS,
    rollbackGraphRuns: ROLLBACK_GRAPH_RUNS,
    sentinelItems: SENTINEL_ITEMS,
  },
  totalRuns: (profile: ScaleProfile): number =>
    BULK_RUNS[profile] +
    HISTORY_RUNS +
    SUPERSESSION_RUNS +
    SENTINEL_RUNS +
    OWNER_GRAPH_RUNS +
    ROLLBACK_GRAPH_RUNS,
  historyCandidateCursor: (
    scope: string,
    profile: ScaleProfile
  ): Readonly<{ createdAtMs: number; id: string }> => ({
    createdAtMs: TASK551_GENERAL_CLOCK_MS + HISTORY_CANDIDATES,
    id: runId(scope, profile, "task489-history", HISTORY_CANDIDATES),
  }),
  deriveIds: (
    scope: string,
    profile: ScaleProfile
  ): Readonly<{ runIds: readonly string[]; itemIds: readonly string[] }> => ({
    runIds: [
      ...Array.from({ length: BULK_RUNS[profile] }, (_, ordinal) =>
        runId(scope, profile, "task489-bulk", ordinal)
      ),
      ...Array.from({ length: HISTORY_RUNS }, (_, ordinal) =>
        runId(scope, profile, "task489-history", ordinal)
      ),
      ...Array.from({ length: SUPERSESSION_RUNS }, (_, ordinal) =>
        runId(scope, profile, "task489-supersession", ordinal)
      ),
      ...Array.from({ length: SENTINEL_RUNS }, (_, ordinal) =>
        runId(scope, profile, "task489-sentinel", ordinal)
      ),
      ...Array.from({ length: OWNER_GRAPH_RUNS }, (_, ordinal) =>
        runId(scope, profile, "task489-owner", ordinal)
      ),
      ...Array.from({ length: ROLLBACK_GRAPH_RUNS }, (_, ordinal) =>
        runId(scope, profile, "task489-rollback-graph", ordinal)
      ),
    ],
    itemIds: Array.from({ length: SENTINEL_ITEMS }, (_, ordinal) =>
      runId(scope, profile, "task489-items", ordinal)
    ),
  }),
  recipe: (scope: string, profile: ScaleProfile): readonly SeedTable[] => {
    const runs: (readonly unknown[])[] = [];
    for (let ordinal = 0; ordinal < BULK_RUNS[profile]; ordinal += 1) {
      const [mode, status] = modeStatus(ordinal);
      runs.push(
        runRow(
          runId(scope, profile, "task489-bulk", ordinal),
          kitId(ordinal, profile),
          mode,
          status,
          `task489-actor-${ordinal % 100}`,
          mode === "rollback" ? runId(scope, profile, "task489-bulk", ordinal - 1) : null,
          equalSortTs(ordinal),
          status === "running" ? null : equalSortTs(ordinal),
          {}
        )
      );
    }
    runs.push(...supersessionRows(scope, profile), ...historyRows(scope, profile));
    const sentinel = sentinelRows(scope, profile);
    runs.push(
      ...sentinel.runs,
      ...ownerGraphRows(scope, profile),
      ...rollbackGraphRows(scope, profile)
    );
    return [
      {
        table: "solution_kit_install_runs",
        columns: [
          "id",
          "kit_id",
          "mode",
          "status",
          "actor_id",
          "rollback_of_run_id",
          "options",
          "summary",
          "error",
          "created_at",
          "updated_at",
          "finished_at",
        ],
        rows: runs,
      },
      {
        table: "solution_kit_install_items",
        columns: [
          "id",
          "run_id",
          "position",
          "resource_type",
          "resource_key",
          "operation",
          "status",
          "before_snapshot",
          "after_snapshot",
          "rollback_action",
          "error",
          "created_at",
          "updated_at",
        ],
        rows: sentinel.items,
      },
    ];
  },
} as const;

const budget = (
  rowsReadMax: number,
  rowsReturnedMax: number,
  transferredBytesMax: number,
  sharedBuffersMax: number,
  small: readonly [number, number, number],
  large: readonly [number, number, number]
): Readonly<Record<ScaleProfile, Task489NumericBudget>> => ({
  small: {
    queryCountMax: 1,
    rowsReadMax,
    rowsReturnedMax,
    transferredBytesMax,
    sharedBuffersMax,
    p50MsMax: small[0],
    p95MsMax: small[1],
    p99MsMax: small[2],
  },
  large: {
    queryCountMax: 1,
    rowsReadMax,
    rowsReturnedMax,
    transferredBytesMax,
    sharedBuffersMax,
    p50MsMax: large[0],
    p95MsMax: large[1],
    p99MsMax: large[2],
  },
});
const statement = (
  statementId: string,
  logicalCaseId: string,
  companionId: Task489CompanionId,
  projection: string,
  predicate: string,
  order: string,
  bound: number,
  expectedLargePlanIndex: string,
  build: (params: Task489StaticPlanParams) => Task489StaticPlanQuery,
  budgets: Readonly<Record<ScaleProfile, Task489NumericBudget>>
): Task489StaticPlanStatement => ({
  statementId,
  logicalCaseId,
  companionId,
  projection,
  predicate,
  order,
  bound,
  expectedLargePlanIndex,
  build,
  budgets,
});
const RUN_PROJECTION = "id,kit_id,mode,status,rollback_of_run_id,created_at,updated_at,finished_at";
const HISTORY_LIMIT_PLUS_ONE = 101 as const;
const isTask489RelationHeavyLogicalCaseInternal = (logicalCaseId: string): boolean =>
  logicalCaseId === "relation-heavy-101";
const requiredTask489Cursor = (params: Task489StaticPlanParams): readonly [string, string] => [
  requiredTask489String(params, "cursorCreatedAt"),
  requiredTask489String(params, "cursorId"),
];
const requiredTask489LimitPlusOne = (params: Task489StaticPlanParams): 101 => {
  if (params.limitPlusOne !== HISTORY_LIMIT_PLUS_ONE) invalidTask489Query();
  return HISTORY_LIMIT_PLUS_ONE;
};
const historyStatement = (
  id: string,
  logicalCaseId: string,
  companionId: Task489CompanionId,
  predicate: string,
  packageFilter: string,
  relationHeavy: boolean
): Task489StaticPlanStatement => {
  if (isTask489RelationHeavyLogicalCaseInternal(logicalCaseId) !== relationHeavy)
    invalidTask489Query();
  const relationPrefix =
    "left join lateral (select count(*)::int as newer_apply_count from solution_kit_install_runs newer where newer.kit_id = r.kit_id and newer.created_at > r.created_at) newer_apply on true left join lateral (select count(*)::int as rollback_count from solution_kit_install_runs rollback_rel where rollback_rel.rollback_of_run_id = r.id) rollback_relation on true";
  const select = relationHeavy
    ? `select r.${RUN_PROJECTION.replaceAll(",", ",r.")}`
    : `select ${RUN_PROJECTION}`;
  return statement(
    id,
    logicalCaseId,
    companionId,
    RUN_PROJECTION,
    predicate,
    "(created_at,id) cursor; created_at DESC,id DESC LIMIT :limitPlusOne",
    HISTORY_LIMIT_PLUS_ONE,
    packageFilter ? "solution_kit_runs_anchor_idx" : "solution_kit_runs_history_idx",
    (params) => {
      const [cursorCreatedAt, cursorId] = requiredTask489Cursor(params);
      const limitPlusOne = requiredTask489LimitPlusOne(params);
      if (packageFilter) {
        const from = relationHeavy
          ? `from solution_kit_install_runs r ${relationPrefix}`
          : "from solution_kit_install_runs";
        const prefix = relationHeavy ? "r.kit_id = $1" : "kit_id = $1";
        const cursor = relationHeavy
          ? "(r.created_at, r.id) < ($2, $3)"
          : "(created_at, id) < ($2, $3)";
        return task489Query(
          `${select} ${from} where ${prefix} and ${cursor} order by ${relationHeavy ? "r.created_at desc, r.id desc" : "created_at desc, id desc"} limit $4`,
          [requiredTask489String(params, "kitId"), cursorCreatedAt, cursorId, limitPlusOne],
          limitPlusOne
        );
      }
      const from = relationHeavy
        ? `from solution_kit_install_runs r ${relationPrefix}`
        : "from solution_kit_install_runs";
      const cursor = relationHeavy
        ? "(r.created_at, r.id) < ($1, $2)"
        : "(created_at, id) < ($1, $2)";
      return task489Query(
        `${select} ${from} where ${cursor} order by ${relationHeavy ? "r.created_at desc, r.id desc" : "created_at desc, id desc"} limit $3`,
        [cursorCreatedAt, cursorId, limitPlusOne],
        limitPlusOne
      );
    },
    budget(
      relationHeavy ? 104_030 : 404,
      HISTORY_LIMIT_PLUS_ONE,
      20_200,
      relationHeavy ? 64 : 32,
      relationHeavy ? [125, 250, 350] : [37, 75, 100],
      relationHeavy ? [375, 750, 900] : [100, 200, 300]
    )
  );
};

type Task489CaseRegistry = Readonly<{
  logicalCases: Readonly<Record<string, Readonly<{ statementIds: readonly string[] }>>>;
  statements: Readonly<Record<string, Task489StaticPlanStatement>>;
}>;

export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES: Readonly<
  Record<Task489CompanionId, Task489CaseRegistry>
> = {
  "task489-runs-all-keyset": {
    logicalCases: {
      default: { statementIds: ["task489-runs-all-keyset/default"] },
      "relation-heavy-101": { statementIds: ["task489-runs-all-keyset/relation-heavy-101"] },
    },
    statements: {
      "task489-runs-all-keyset/default": historyStatement(
        "task489-runs-all-keyset/default",
        "default",
        "task489-runs-all-keyset",
        "no filters",
        "",
        false
      ),
      "task489-runs-all-keyset/relation-heavy-101": historyStatement(
        "task489-runs-all-keyset/relation-heavy-101",
        "relation-heavy-101",
        "task489-runs-all-keyset",
        "no filters; lateral newer-apply and rollback-relation probes",
        "",
        true
      ),
    },
  },
  "task489-runs-package-keyset": {
    logicalCases: {
      default: { statementIds: ["task489-runs-package-keyset/default"] },
      "relation-heavy-101": { statementIds: ["task489-runs-package-keyset/relation-heavy-101"] },
    },
    statements: {
      "task489-runs-package-keyset/default": historyStatement(
        "task489-runs-package-keyset/default",
        "default",
        "task489-runs-package-keyset",
        "exact kit_id",
        "kit_id = :kitId",
        false
      ),
      "task489-runs-package-keyset/relation-heavy-101": historyStatement(
        "task489-runs-package-keyset/relation-heavy-101",
        "relation-heavy-101",
        "task489-runs-package-keyset",
        "exact kit_id; lateral newer-apply and rollback-relation probes",
        "kit_id = :kitId",
        true
      ),
    },
  },
  "task489-effective-supersession": {
    logicalCases: {
      "newer-0": { statementIds: ["task489-effective-supersession/newer-0"] },
      "newer-1": { statementIds: ["task489-effective-supersession/newer-1"] },
      "newer-511": { statementIds: ["task489-effective-supersession/newer-511"] },
      "newer-512": { statementIds: ["task489-effective-supersession/newer-512"] },
      "newer-513-all-rolled": {
        statementIds: ["task489-effective-supersession/newer-513-all-rolled"],
      },
      "newer-513-unrolled-first": {
        statementIds: ["task489-effective-supersession/newer-513-unrolled-first"],
      },
      "newer-513-unrolled-middle": {
        statementIds: ["task489-effective-supersession/newer-513-unrolled-middle"],
      },
      "newer-513-unrolled-last": {
        statementIds: ["task489-effective-supersession/newer-513-unrolled-last"],
      },
    },
    statements: Object.fromEntries(
      (
        [
          ["newer-0", 1],
          ["newer-1", 3],
          ["newer-511", 1_023],
          ["newer-512", 1_025],
          ["newer-513-all-rolled", 1_027],
          ["newer-513-unrolled-first", 1_026],
          ["newer-513-unrolled-middle", 1_026],
          ["newer-513-unrolled-last", 1_026],
        ] as const
      ).map(([logicalCaseId, rowsRead]) => {
        const id = `task489-effective-supersession/${logicalCaseId}`;
        return [
          id,
          statement(
            id,
            logicalCaseId,
            "task489-effective-supersession",
            "source_run_id,kit_id,effective,newer_apply_count,unrolled_apply_id",
            "exact source_run_id",
            "none; LIMIT $2",
            1,
            "solution_kit_runs_successful_apply_order_idx",
            (params) =>
              task489Query(
                "select source_run_id,kit_id,effective,newer_apply_count,unrolled_apply_id from solution_kit_install_runs where id = $1 limit $2",
                [requiredTask489String(params, "sourceRunId"), 1],
                1
              ),
            budget(
              Number(rowsRead),
              1,
              200,
              rowsRead === 1 ? 8 : 16,
              [37, 75, 100],
              [100, 200, 300]
            )
          ),
        ] as const;
      })
    ) as Readonly<Record<string, Task489StaticPlanStatement>>,
  },
  "task489-active-starter-owner": {
    logicalCases: {
      "active-owner": { statementIds: ["task489-active-starter-owner/active-owner"] },
    },
    statements: {
      "task489-active-starter-owner/active-owner": statement(
        "task489-active-starter-owner/active-owner",
        "active-owner",
        "task489-active-starter-owner",
        "package_key,source_run_id,released_at",
        "released_at IS NULL; normalized package and actor; source_run_id identity",
        "none; LIMIT $3",
        2,
        "solution_kit_starter_apply_owners_active_idx",
        (params) =>
          task489Query(
            "select package_key, source_run_id, released_at from solution_kit_starter_apply_owners where package_key = $1 and actor_id = $2 and released_at is null limit $3",
            [
              requiredTask489String(params, "packageKey"),
              requiredTask489String(params, "actorId"),
              2,
            ],
            2
          ),
        budget(2, 2, 400, 8, [12, 25, 30], [12, 25, 30])
      ),
    },
  },
  "task489-safe-detail": {
    logicalCases: {
      "point-plus-items": {
        statementIds: ["task489-safe-detail/run-point", "task489-safe-detail/items-page"],
      },
    },
    statements: {
      "task489-safe-detail/run-point": statement(
        "task489-safe-detail/run-point",
        "point-plus-items",
        "task489-safe-detail",
        "id,kit_id,mode,status,rollback_of_run_id,created_at,updated_at,finished_at",
        "exact run id (PK)",
        "none; LIMIT $2",
        1,
        "solution_kit_install_runs_pkey",
        (params) =>
          task489Query(
            "select id,kit_id,mode,status,rollback_of_run_id,created_at,updated_at,finished_at from solution_kit_install_runs where id = $1 limit $2",
            [requiredTask489String(params, "runId"), 1],
            1
          ),
        budget(1, 1, 200, 8, [12, 25, 30], [25, 50, 60])
      ),
      "task489-safe-detail/items-page": statement(
        "task489-safe-detail/items-page",
        "point-plus-items",
        "task489-safe-detail",
        "id,run_id,position,resource_type,resource_key,operation,status,created_at,updated_at",
        "exact run_id; safe columns only",
        "position ASC,id ASC; LIMIT $2",
        513,
        "solution_kit_install_items_run_position_idx",
        (params) =>
          task489Query(
            "select id,run_id,position,resource_type,resource_key,operation,status,created_at,updated_at from solution_kit_install_items where run_id = $1 order by position asc,id asc limit $2",
            [requiredTask489String(params, "runId"), 513],
            513
          ),
        budget(513, 513, 61_560, 16, [37, 75, 100], [100, 200, 300])
      ),
    },
  },
};

export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA =
  "coderso.task551.task489-predecessor@v1" as const;

export type Task489PredecessorFixtureCountsV1 = Readonly<{
  bulkHistoryRuns: Readonly<{ small: 10_000; large: 1_000_000 }>;
  boundedSupportRuns: 109_890;
  totalRuns: Readonly<{ small: 119_890; large: 1_109_890 }>;
  syntheticActorUsers: 100;
  safeDetailItems: 513;
  activeStarterOwners: 1;
  templateEvidenceRows: 1;
  rollbackProgressRows: 1;
}>;

export type Task489PredecessorLogicalCaseV1 = Readonly<{
  companionId: Task489CompanionId;
  logicalCaseId: string;
  statementIds: readonly string[];
}>;

export type Task489PredecessorProfileResultV1<Profile extends ScaleProfile = ScaleProfile> =
  Readonly<{
    profile: Profile;
    planDigest: string;
    queryCount: 1;
    rowsRead: number;
    rowsReturned: number;
    transferredBytes: number;
    sharedBuffers: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  }>;

export type Task489PredecessorStatementReceiptV1 = Readonly<{
  companionId: Task489CompanionId;
  logicalCaseId: string;
  statementId: string;
  profileResults: readonly [
    Task489PredecessorProfileResultV1<"small">,
    Task489PredecessorProfileResultV1<"large">,
  ];
}>;

export type Task489PredecessorReceiptV1 = Readonly<{
  schema: typeof TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA;
  pass: true;
  noLeak: true;
  companionIds: readonly Task489CompanionId[];
  fixtureCounts: Task489PredecessorFixtureCountsV1;
  logicalCases: readonly Task489PredecessorLogicalCaseV1[];
  statementReceipts: readonly Task489PredecessorStatementReceiptV1[];
}>;

export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS: Task489PredecessorFixtureCountsV1 =
  {
    bulkHistoryRuns: { small: 10_000, large: 1_000_000 },
    boundedSupportRuns: 109_890,
    totalRuns: { small: 119_890, large: 1_109_890 },
    syntheticActorUsers: 100,
    safeDetailItems: 513,
    activeStarterOwners: 1,
    templateEvidenceRows: 1,
    rollbackProgressRows: 1,
  };

const companionOrder = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.companionIds;
export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES: readonly Task489PredecessorLogicalCaseV1[] =
  companionOrder.flatMap((companionId) => {
    const cases = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES[companionId].logicalCases;
    return Object.entries(cases).map(([logicalCaseId, value]) => ({
      companionId,
      logicalCaseId,
      statementIds: value.statementIds,
    }));
  });

export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS: readonly string[] =
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.flatMap(
    (logicalCase) => logicalCase.statementIds
  );

const INVALID_RECEIPT = "database_baseline_invalid";
function receiptInvalid(): never {
  throw new Error(INVALID_RECEIPT);
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exactKeys = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!isRecord(value)) receiptInvalid();
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => typeof key !== "string" || !keys.includes(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    receiptInvalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      receiptInvalid();
  }
  return value;
};
const strictArray = (value: unknown, length?: number): readonly unknown[] => {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    (length !== undefined && value.length !== length)
  )
    receiptInvalid();
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== value.length + 1 ||
    actual.some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/u.test(key)))
  )
    receiptInvalid();
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      receiptInvalid();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.enumerable !== false ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
  )
    receiptInvalid();
  return value;
};
const finiteMetric = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) receiptInvalid();
  return value;
};
const digestValue = (value: unknown): string => {
  if (typeof value !== "string") receiptInvalid();
  return requireTask551LowercaseSha256(value);
};

function statementById(statementId: string): Task489StaticPlanStatement {
  for (const companionId of companionOrder) {
    const statement =
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES[companionId].statements[statementId];
    if (statement !== undefined) return statement;
  }
  receiptInvalid();
}

function validateProfileResult(
  value: unknown,
  expectedProfile: ScaleProfile,
  statement: Task489StaticPlanStatement
): Task489PredecessorProfileResultV1 {
  const record = exactKeys(value, [
    "profile",
    "planDigest",
    "queryCount",
    "rowsRead",
    "rowsReturned",
    "transferredBytes",
    "sharedBuffers",
    "p50Ms",
    "p95Ms",
    "p99Ms",
  ]);
  if (record.profile !== expectedProfile || record.queryCount !== 1) receiptInvalid();
  const result = {
    profile: expectedProfile,
    planDigest: digestValue(record.planDigest),
    queryCount: 1 as const,
    rowsRead: finiteMetric(record.rowsRead),
    rowsReturned: finiteMetric(record.rowsReturned),
    transferredBytes: finiteMetric(record.transferredBytes),
    sharedBuffers: finiteMetric(record.sharedBuffers),
    p50Ms: finiteMetric(record.p50Ms),
    p95Ms: finiteMetric(record.p95Ms),
    p99Ms: finiteMetric(record.p99Ms),
  };
  for (const profile of ["small", "large"] as const) {
    if (profile !== expectedProfile) continue;
    const budgetValue = statement.budgets[profile];
    if (
      result.rowsRead > budgetValue.rowsReadMax ||
      result.rowsReturned > budgetValue.rowsReturnedMax ||
      result.transferredBytes > budgetValue.transferredBytesMax ||
      result.sharedBuffers > budgetValue.sharedBuffersMax ||
      result.p50Ms > budgetValue.p50MsMax ||
      result.p95Ms > budgetValue.p95MsMax ||
      result.p99Ms > budgetValue.p99MsMax
    )
      receiptInvalid();
  }
  return result;
}

function validateReceipt(value: unknown): Task489PredecessorReceiptV1 {
  const record = exactKeys(value, [
    "schema",
    "pass",
    "noLeak",
    "companionIds",
    "fixtureCounts",
    "logicalCases",
    "statementReceipts",
  ]);
  if (record.schema !== TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA || record.pass !== true)
    receiptInvalid();
  if (record.noLeak !== true || typeof record.noLeak !== "boolean") receiptInvalid();
  if (
    JSON.stringify(strictArray(record.companionIds, companionOrder.length)) !==
    JSON.stringify(companionOrder)
  )
    receiptInvalid();
  if (
    JSON.stringify(record.fixtureCounts) !==
    JSON.stringify(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS)
  )
    receiptInvalid();
  const logicalCasesInput = strictArray(
    record.logicalCases,
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.length
  );
  const logicalCases = logicalCasesInput.map((value, index) => {
    const expected = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES[index]!;
    const item = exactKeys(value, ["companionId", "logicalCaseId", "statementIds"]);
    if (
      item.companionId !== expected.companionId ||
      item.logicalCaseId !== expected.logicalCaseId ||
      JSON.stringify(item.statementIds) !== JSON.stringify(expected.statementIds)
    )
      receiptInvalid();
    return expected;
  });
  const statementReceiptsInput = strictArray(
    record.statementReceipts,
    TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.length
  );
  const statementReceipts = statementReceiptsInput.map((value, index) => {
    const expectedStatementId = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS[index]!;
    const expectedCase = logicalCases.find((logicalCase) =>
      logicalCase.statementIds.includes(expectedStatementId)
    );
    if (expectedCase === undefined) receiptInvalid();
    const item = exactKeys(value, [
      "companionId",
      "logicalCaseId",
      "statementId",
      "profileResults",
    ]);
    if (
      item.companionId !== expectedCase.companionId ||
      item.logicalCaseId !== expectedCase.logicalCaseId ||
      item.statementId !== expectedStatementId
    )
      receiptInvalid();
    const profileResults = strictArray(item.profileResults, 2);
    const statement = statementById(expectedStatementId);
    return {
      companionId: expectedCase.companionId,
      logicalCaseId: expectedCase.logicalCaseId,
      statementId: expectedStatementId,
      profileResults: [
        validateProfileResult(profileResults[0], "small", statement),
        validateProfileResult(profileResults[1], "large", statement),
      ],
    } as Task489PredecessorStatementReceiptV1;
  });
  return {
    schema: TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA,
    pass: true,
    noLeak: true,
    companionIds: companionOrder,
    fixtureCounts: TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS,
    logicalCases,
    statementReceipts,
  };
}

export function createTask489PredecessorReceiptV1(
  statementReceipts: readonly Task489PredecessorStatementReceiptV1[]
): Task489PredecessorReceiptV1 {
  return validateReceipt({
    schema: TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA,
    pass: true,
    noLeak: true,
    companionIds: companionOrder,
    fixtureCounts: TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS,
    logicalCases: TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES,
    statementReceipts,
  });
}

function orderedJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  )
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(orderedJson).join(",")}]`;
  if (!isRecord(value)) receiptInvalid();
  const keys = Object.keys(value);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${orderedJson(value[key])}`).join(",")}}`;
}

export function serializeTask489PredecessorReceiptV1(
  receipt: Task489PredecessorReceiptV1
): Uint8Array {
  const checked = validateReceipt(receipt);
  const ordered = {
    schema: checked.schema,
    pass: checked.pass,
    noLeak: checked.noLeak,
    companionIds: checked.companionIds,
    fixtureCounts: checked.fixtureCounts,
    logicalCases: checked.logicalCases,
    statementReceipts: checked.statementReceipts,
  };
  return new TextEncoder().encode(`${orderedJson(ordered)}\n`);
}

export function parseTask489PredecessorReceiptV1(bytes: Uint8Array): Task489PredecessorReceiptV1 {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes[bytes.length - 1] !== 10)
    receiptInvalid();
  const text = new TextDecoder().decode(bytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1)) as unknown;
  } catch {
    receiptInvalid();
  }
  const checked = validateReceipt(parsed);
  const canonical = serializeTask489PredecessorReceiptV1(checked);
  if (new TextDecoder().decode(canonical) !== text) receiptInvalid();
  return checked;
}

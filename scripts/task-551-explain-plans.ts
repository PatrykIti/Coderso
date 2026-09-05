/**
 * TASK-551-05-L02 sanitized EXPLAIN plan check CLI (`--scale small|large --check`).
 *
 * Sole S2 executable of the leaf (doc :60-324 pseudocode, :358-364 contract).
 * It selects statements ONLY from the closed static registry exported by
 * `tests/perf/fixtures/task551QueryPlanContracts.ts` (37 statements, 38 named
 * cases, 76 literal small/large receipts): no caller SQL, no caller path, no
 * caller case id ever reaches a database. Every case is captured with
 * `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, redacted through the fixture's
 * `sanitizePlan` (no SQL text, no binds, no constants, no nested raw fields),
 * compared against its frozen receipt (expected large-plan index, bounded
 * rows/buffers and p95) and against the frozen TASK-551-01 budgets, then
 * reported as sanitized numbers only.
 *
 * AUTHORITY IS INJECTION-ONLY. The CLI runs no database driver and never
 * derives a target: the explain/catalog authority objects, the exact three-key
 * `TASK551_FIXTURE_DATABASE_*` `fixtureValues` map and the read-only proof
 * client reach it only through the `configureTask551*` seams below, and every
 * target parse/proof is delegated to the import-safe L02 module
 * `./task551DatabaseBaseline/fixtureTarget`. This file reads no `.env`, no
 * `DATABASE_URL`/`DATABASE_DIRECT_URL`, no ambient environment and no fixture
 * path: `--scale` is the only caller input and it can never select a target,
 * statement, bind or case. Without an injected authority (the airtight local
 * form) the CLI is fail-closed: it exits 1 with a redacted code before any
 * connection, capture or receipt read. The live halves (catalog read, EXPLAIN
 * capture, p95 measurement, target preflight/post-cleanup proofs) are
 * therefore injection-gated owner/L11-executed code.
 *
 * INVOCATION (runbook form): `bun run --env-file=/dev/null
 * scripts/task-551-explain-plans.ts --scale small --check` (or `--scale
 * large`). `bun run` forwards `--scale`/`--check` to this module so the argv
 * parser below sees the documented form. The plain `bun
 * scripts/task-551-explain-plans.ts ...` form is NOT the runbook form: what
 * Bun's flag parser does with `--scale` is version-dependent (on some
 * versions it consumes it and this module exits 1
 * `task551_explain_argv_invalid`; on bun 1.4.0 the flags are forwarded and it
 * exits 1 `task551_explain_authority_absent`). Either way the plain form is
 * fail-closed with a redacted code before any connection, capture or receipt
 * read — it never reaches a live half without injected authority.
 *
 * Read-only elsewhere: L01's v2 migration receipt
 * (`.tmp/task551-migration-receipt.json`) is validated through the fixture's
 * strict `assertTask551MigrationReceiptV2` + online-index parity and never
 * written; L01's concurrency receipt is consumed only through its strict
 * redacted mirror validator (the doc forbids importing L01's test module).
 * Fail-closed codes: `plan_contract_invalid` (invocation/registry/capture
 * contract), `plan_regression` (measured index/rows/buffer/p95 regression),
 * `constraint_contract_failed` (authority, target, catalog, freeze or receipt
 * contract). Reports are one JSON line; no URL, target, sentinel, env dump,
 * bind or raw database error is ever printed.
 */
import { readFile } from "node:fs/promises";

import {
  TASK551_L05_CONCURRENCY_RECEIPT_MIRROR,
  TASK551_PLAN_CASE_KEYS,
  TASK551_PLAN_CONTRACTS,
  TASK551_QUERY_PLAN_RECEIPTS,
  TASK551_STATIC_PLAN_STATEMENTS,
  Task551PlanCheckError,
  assertExactTask551Catalog,
  assertPlanReceiptWithinBudget,
  assertSanitizedLargePlan,
  assertTask551MigrationReceiptV2,
  assertTask551OnlineIndexReceiptParity,
  buildExpectedTask551Catalog,
  planCaseKey,
  readPgCatalogDefinitions,
  readTask551CatalogAuthority,
  readTask551ExplainAuthority,
  requireReviewedTask551FreezeReceipt,
  requireTask551L05ConcurrencyReceipt,
  sanitizePlan,
  sanitizePlanDigest,
  selectStaticPlanStatement,
  type NumericPlanReceipt,
  type PlanCase,
  type PlanContract,
  type SafePlanEvidence,
  type SafeScalar,
  type Task551CatalogClient,
  type Task551ExplainAuthority,
  type Task551PlanCheckCode,
} from "../tests/perf/fixtures/task551QueryPlanContracts";
import type { ScaleProfile } from "../tests/perf/fixtures/task551DatabaseScale";
import {
  assertTask551FixtureTarget,
  assertTask551FixtureTargetChildKeys,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
  type Task551FixtureTarget,
  type Task551FixtureTargetClient,
} from "./task551DatabaseBaseline/fixtureTarget";

/** Closed registry cardinality (doc :366-374): 37 IDs, 38 cases, 76 receipts. */
const REQUIRED_STATEMENT_COUNT = 37 as const;
const REQUIRED_CONTRACT_COUNT = 37 as const;
const REQUIRED_CASE_COUNT = 38 as const;
const REQUIRED_SCALE_RECEIPT_COUNT = 76 as const;

/** Result bound union the contracts may declare (doc :69). */
const ALLOWED_RESULT_BOUNDS: readonly number[] = [1, 51, 101, 102];

/** The one repository-relative v2 migration receipt this leaf may read. */
const TASK551_MIGRATION_RECEIPT_PATH = ".tmp/task551-migration-receipt.json" as const;

/** Redacted failure reason slugs — never a target, URL, env key or raw error. */
const REASON_ARGV = "task551_explain_argv_invalid";
const REASON_UNEXPECTED = "task551_explain_unexpected_failure";
const REASON_AUTHORITY = "task551_explain_authority_absent";
const REASON_CATALOG_AUTHORITY = "task551_catalog_authority_absent";
const REASON_TARGET_INJECTION = "task551_fixture_target_injection_absent";
const REASON_TARGET_INVALID = "task551_fixture_target_invalid";
const REASON_TARGET_POST_CLEANUP = "task551_fixture_target_post_cleanup_failed";
const REASON_MIGRATION_RECEIPT = "task551_migration_receipt_unreadable";
const REASON_CODE_FALLBACK: Readonly<Record<Task551PlanCheckCode, string>> = Object.freeze({
  plan_contract_invalid: "task551_plan_contract_invalid",
  plan_regression: "task551_plan_regression",
  constraint_contract_failed: "task551_constraint_contract_failed",
});

/**
 * Declared comparison tolerances against the owner-measured receipts: a large
 * run must stay inside twice the frozen rows/buffers of its receipt (planner
 * drift, not regression), small runs are looser by design (doc :361-362), and
 * p95 is a hard ceiling — exceeding it is the hot-query regression.
 */
const ROWS_READ_TOLERANCE: Readonly<Record<ScaleProfile, number>> = Object.freeze({
  small: 4,
  large: 2,
});
const BUFFER_TOLERANCE: Readonly<Record<ScaleProfile, number>> = Object.freeze({
  small: 4,
  large: 2,
});
const BUFFER_FLOOR = 16 as const;

const REPORT_SCHEMA = "coderso.task551.explain-plan-check@v1" as const;
const REPORT_TASK_ID = "TASK-551-05-L02" as const;
const REPORT_CHECK = "explain-plan-check" as const;

type Task551ExplainCaseReport = Readonly<{
  planId: string;
  caseId: string;
  family: string;
  budgetId: string;
  resultBound: number;
  rootNodeType: string;
  usedIndexes: readonly string[];
  rowsRead: number;
  rowsReturned: number;
  sharedHitBuffers: number;
  sharedReadBuffers: number;
  normalizedP95Ms: number;
  redactedKeyCount: number;
}>;

type Task551ExplainCheckReport = Readonly<{
  schema: typeof REPORT_SCHEMA;
  taskId: typeof REPORT_TASK_ID;
  check: typeof REPORT_CHECK;
  scale?: ScaleProfile;
  status: "passed" | "failed";
  code?: Task551PlanCheckCode;
  reason?: string;
  registry?: Readonly<{
    statements: number;
    contracts: number;
    cases: number;
    scaleReceipts: number;
  }>;
  failedCase?: Readonly<{ planId: string; caseId: string }>;
  cases?: readonly Task551ExplainCaseReport[];
}>;

type Task551ExplainCaseEntry = Readonly<{ contract: PlanContract; planCase: PlanCase }>;

// --- Injection seams: the only authority surfaces of this CLI. ---

/**
 * The catalog client is text-only (the fixture's `Task551CatalogClient`); the
 * injected broker object additionally exposes the parameterized capture form
 * used by the L01 baseline transport (`sql.unsafe(text, values)` parity). There
 * is no literal-rendering fallback: a client that cannot bind synthetic values
 * is a `plan_contract_invalid` block, never a weaker capture path.
 */
type Task551ExplainValuesClient = Task551CatalogClient &
  Readonly<{
    queryWithValues(
      sqlText: string,
      values: readonly SafeScalar[]
    ): Promise<readonly Record<string, unknown>[]>;
  }>;

/**
 * The exact L11 05-L02 injection for the fixture target: a direct three-key
 * `fixtureValues` map plus the injected read-only proof client. Nothing else
 * may ever set it, and no env/file/argv path can construct it.
 */
export type Task551ExplainTargetInjection = Readonly<{
  fixtureValues: Readonly<Record<string, unknown>>;
  client: Task551FixtureTargetClient;
}>;

let targetInjection: Task551ExplainTargetInjection | undefined;

/** The L11 broker injects the target once; nothing else may ever set it. */
export const configureTask551ExplainTargetInjection = (
  injection: Task551ExplainTargetInjection | undefined
): void => {
  targetInjection =
    injection === undefined
      ? undefined
      : Object.freeze({
          fixtureValues: Object.freeze({ ...injection.fixtureValues }),
          client: injection.client,
        });
};

const argvError = (): Task551PlanCheckError =>
  new Task551PlanCheckError("plan_contract_invalid", REASON_ARGV);

/**
 * Accepts exactly `--scale small|large` and `--check`, in any order, and
 * nothing else: any other token (flag, SQL fragment, path) is refused.
 * Reached by the `bun run <file>` runbook form (see header); the plain
 * `bun <file>` form is fail-closed too — exit 1 with a redacted code whether
 * Bun strips `--scale` (argv_invalid here) or forwards it (the parser
 * succeeds and the run stops at authority_absent).
 */
export const parseTask551ExplainArgv = (
  argv: readonly string[]
): Readonly<{ scale: ScaleProfile; check: true }> => {
  let scale: ScaleProfile | undefined;
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--scale") {
      if (scale !== undefined) throw argvError();
      const value = argv[index + 1];
      if (value !== "small" && value !== "large") throw argvError();
      scale = value;
      index += 1;
      continue;
    }
    if (token === "--check") {
      if (check) throw argvError();
      check = true;
      continue;
    }
    throw argvError();
  }
  if (scale === undefined || !check) throw argvError();
  return { scale, check: true };
};

const registryCounts = (): Readonly<{
  statements: number;
  contracts: number;
  cases: number;
  scaleReceipts: number;
}> =>
  Object.freeze({
    statements: TASK551_STATIC_PLAN_STATEMENTS.length,
    contracts: TASK551_PLAN_CONTRACTS.length,
    cases: TASK551_PLAN_CASE_KEYS.length,
    scaleReceipts: REQUIRED_SCALE_RECEIPT_COUNT,
  });

/**
 * DB-free closed-registry verification (doc :525-530): exact cardinalities,
 * unique statements, static-registry-only selection, dense binds per case and
 * every one of the 76 literal scale receipts inside its frozen TASK-551-01
 * budget. Fails before any authority, connection or capture.
 */
export const assertTask551ExplainRegistryContract = (): ReadonlyMap<
  string,
  Task551ExplainCaseEntry
> => {
  if (TASK551_STATIC_PLAN_STATEMENTS.length !== REQUIRED_STATEMENT_COUNT) {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      `the static registry must hold exactly ${REQUIRED_STATEMENT_COUNT} statements`
    );
  }
  if (TASK551_PLAN_CONTRACTS.length !== REQUIRED_CONTRACT_COUNT) {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      `the plan registry must hold exactly ${REQUIRED_CONTRACT_COUNT} contracts`
    );
  }
  if (TASK551_PLAN_CASE_KEYS.length !== REQUIRED_CASE_COUNT) {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      `the plan registry must hold exactly ${REQUIRED_CASE_COUNT} named cases`
    );
  }
  const caseIndex = new Map<string, Task551ExplainCaseEntry>();
  const statements = new Set<string>();
  let scaleReceiptCount = 0;
  for (const contract of TASK551_PLAN_CONTRACTS) {
    if (statements.has(contract.statement.id)) {
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `duplicate plan contract ${contract.statement.id}`
      );
    }
    statements.add(contract.statement.id);
    // Static-registry-only selection: the CLI can never supply SQL text.
    if (selectStaticPlanStatement(contract.statement.id) !== contract.statement) {
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `contract ${contract.statement.id} is not the static registry member`
      );
    }
    if (
      contract.statement.template.includes(";") ||
      !contract.statement.template.startsWith("select ")
    ) {
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `statement ${contract.statement.id} is not a parameterized select-only template`
      );
    }
    // Synthetic binds are a positional prefix of the contract's declared tuple:
    // fixed summaries and facets omit the normalized row filters, cursor and
    // limit binds that page statements carry (doc :470-503, :525-530), so the
    // tuple is the page-shaped superset in the same declared order.
    if (contract.syntheticBinds.length < contract.statement.bindNames.length) {
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `contract ${contract.statement.id} carries fewer synthetic binds than its statement arity`
      );
    }
    if (!ALLOWED_RESULT_BOUNDS.includes(contract.resultBound) || contract.cases.length === 0) {
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `contract ${contract.statement.id} carries a foreign result bound or no case`
      );
    }
    for (const planCase of contract.cases) {
      const key = planCaseKey(contract.statement.id, planCase.caseId);
      if (caseIndex.has(key))
        throw new Task551PlanCheckError("plan_contract_invalid", `duplicate case ${key}`);
      if (planCase.syntheticBinds.length < contract.statement.bindNames.length) {
        throw new Task551PlanCheckError(
          "plan_contract_invalid",
          `case ${key} carries fewer synthetic binds than its statement arity`
        );
      }
      const scaleReceipt = TASK551_QUERY_PLAN_RECEIPTS[key];
      if (scaleReceipt === undefined)
        throw new Task551PlanCheckError(
          "plan_contract_invalid",
          `case ${key} has no numeric receipt`
        );
      for (const profile of ["small", "large"] as const) {
        // Fails closed on non-finite/zero sentinels, digest drift and budget breach.
        assertPlanReceiptWithinBudget(
          contract.statement.id,
          planCase.caseId,
          profile,
          scaleReceipt[profile]
        );
        scaleReceiptCount += 1;
      }
      caseIndex.set(key, Object.freeze({ contract, planCase }));
    }
  }
  if (
    caseIndex.size !== REQUIRED_CASE_COUNT ||
    scaleReceiptCount !== REQUIRED_SCALE_RECEIPT_COUNT
  ) {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      "the plan registry case/receipt cardinality drifted"
    );
  }
  for (const key of TASK551_PLAN_CASE_KEYS) {
    if (!caseIndex.has(key))
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `registry case key ${key} is not derivable from the contracts`
      );
  }
  return caseIndex;
};

/**
 * Resolves the injected target through the import-safe L02 module only: strict
 * three-key validation, then the bound target, then the rolled-back preflight
 * proof. Target name, URL and sentinel stay private — every rejection is a
 * fixed redacted code.
 */
const requireTask551ExplainFixtureTarget = async (): Promise<
  Readonly<{ target: Task551FixtureTarget; client: Task551FixtureTargetClient }>
> => {
  if (targetInjection === undefined) {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_TARGET_INJECTION);
  }
  let target: Task551FixtureTarget;
  try {
    const childValues = assertTask551FixtureTargetChildKeys(targetInjection.fixtureValues);
    target = parseTask551FixtureTarget(childValues);
  } catch {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_TARGET_INVALID);
  }
  try {
    await assertTask551FixtureTarget(target, targetInjection.client);
  } catch {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_TARGET_INVALID);
  }
  return Object.freeze({ target, client: targetInjection.client });
};

/** The injected client must bind the registry's synthetic values; no fallback. */
const requireExplainValuesClient = (client: Task551CatalogClient): Task551ExplainValuesClient => {
  const candidate = client as Partial<Task551ExplainValuesClient>;
  if (typeof candidate.query !== "function" || typeof candidate.queryWithValues !== "function") {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      "the injected explain authority client cannot bind the static registry values"
    );
  }
  return client as Task551ExplainValuesClient;
};

/** `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` over the registry template only. */
const captureSanitizedPlan = async (
  client: Task551ExplainValuesClient,
  contract: PlanContract,
  planCase: PlanCase,
  profile: ScaleProfile
): Promise<SafePlanEvidence> => {
  let rows: readonly Record<string, unknown>[];
  // Exactly the statement's declared arity, taken as the positional prefix of
  // the case's declared synthetic tuple (never a caller value).
  const binds = planCase.syntheticBinds.slice(0, contract.statement.bindNames.length);
  try {
    rows = await client.queryWithValues(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${contract.statement.template}`,
      binds
    );
  } catch {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      `the explain capture failed for ${contract.statement.id}#${planCase.caseId}`
    );
  }
  const planValue = rows[0]?.["QUERY PLAN"];
  let parsed: unknown = planValue;
  if (typeof planValue === "string") {
    try {
      parsed = JSON.parse(planValue) as unknown;
    } catch {
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `the explain payload for ${contract.statement.id}#${planCase.caseId} is not JSON`
      );
    }
  }
  return sanitizePlan(
    parsed,
    { removeSql: true, removeBinds: true, allowCatalogNames: true },
    {
      planId: contract.statement.id,
      caseId: planCase.caseId,
      profile,
      statementDigest: contract.statement.statementDigest,
    }
  );
};

type Task551MeasuredReceipt = Readonly<{
  rowsRead: number;
  rowsReturned: number;
  sharedHitBuffers: number;
  sharedReadBuffers: number;
  normalizedP95Ms: number;
}>;

/**
 * Audit F7: the receipt's "rows read" is the ANALYZE **actual** row count, not
 * the planner's estimate. `sanitizePlan` accumulates `Plan Rows` into
 * `evidence.rowsRead` (fixture :837); on the L01 100k outbox fixture that is
 * the planner's ~100k estimate for the partial-index scan, which would breach
 * the frozen `rowsReadMax` of 6 on a perfectly healthy plan. The doc freezes
 * literal *measured* rows read/returned beside hit/read buffers (:525-527) and
 * demands bounded rows for the large outbox plan (:684-686); its frozen outbox
 * receipts prove the semantic — small `rowsRead: 2` = Limit(1) + Index Scan(1)
 * actual rows. Every receipt this CLI builds and compares therefore derives its
 * rows-read numeric from the sanitized nodes' `actualRows` here.
 */
const actualRowsRead = (evidence: SafePlanEvidence): number => {
  let total = 0;
  const visit = (node: SafePlanEvidence["nodes"][number]): void => {
    total += node.actualRows ?? 0;
    node.childNodes.forEach(visit);
  };
  evidence.nodes.forEach(visit);
  return total;
};

/** Redacted per-case context for the failure report, set while the loop runs. */
let activeCase: Readonly<{ planId: string; caseId: string }> | undefined;

/**
 * Receipt comparison (doc :361-364): rows returned never exceed the frozen
 * bound, rows/buffers stay inside the declared tolerance of the owner-measured
 * receipt, and p95 is a hard ceiling — a breach is `plan_regression`.
 */
const assertMeasuredAgainstReceipt = (
  key: string,
  profile: ScaleProfile,
  receipt: NumericPlanReceipt,
  measured: Task551MeasuredReceipt
): void => {
  if (measured.rowsReturned > receipt.rowsReturned) {
    throw new Task551PlanCheckError(
      "plan_regression",
      `rowsReturned exceeds the frozen receipt bound for ${key}/${profile}`
    );
  }
  if (measured.rowsRead > Math.max(receipt.rowsRead * ROWS_READ_TOLERANCE[profile], 1)) {
    throw new Task551PlanCheckError(
      "plan_regression",
      `rowsRead exceeds the frozen receipt tolerance for ${key}/${profile}`
    );
  }
  const receiptBuffers = receipt.sharedHitBuffers + receipt.sharedReadBuffers;
  const measuredBuffers = measured.sharedHitBuffers + measured.sharedReadBuffers;
  if (measuredBuffers > Math.max(receiptBuffers * BUFFER_TOLERANCE[profile], BUFFER_FLOOR)) {
    throw new Task551PlanCheckError(
      "plan_regression",
      `shared buffers exceed the frozen receipt tolerance for ${key}/${profile}`
    );
  }
  if (measured.normalizedP95Ms > receipt.normalizedP95Ms) {
    throw new Task551PlanCheckError(
      "plan_regression",
      `hot-query p95 regression for ${key}/${profile}`
    );
  }
};

const caseReport = (
  contract: PlanContract,
  planCase: PlanCase,
  evidence: SafePlanEvidence,
  measured: Task551MeasuredReceipt
): Task551ExplainCaseReport =>
  Object.freeze({
    planId: contract.statement.id,
    caseId: planCase.caseId,
    family: contract.statementFamily,
    budgetId: contract.budgetId,
    resultBound: contract.resultBound,
    rootNodeType: evidence.rootNodeType,
    usedIndexes: evidence.usedIndexes,
    rowsRead: measured.rowsRead,
    rowsReturned: measured.rowsReturned,
    sharedHitBuffers: measured.sharedHitBuffers,
    sharedReadBuffers: measured.sharedReadBuffers,
    normalizedP95Ms: measured.normalizedP95Ms,
    redactedKeyCount: evidence.redactedKeys.length,
  });

/** Captures, sanitizes and verifies every closed case at the requested scale. */
const verifyAllCases = async (
  scale: ScaleProfile,
  caseIndex: ReadonlyMap<string, Task551ExplainCaseEntry>,
  client: Task551ExplainValuesClient,
  authority: Task551ExplainAuthority
): Promise<readonly Task551ExplainCaseReport[]> => {
  const reports: Task551ExplainCaseReport[] = [];
  for (const key of TASK551_PLAN_CASE_KEYS) {
    const entry = caseIndex.get(key);
    if (entry === undefined)
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `registry case ${key} has no contract`
      );
    const { contract, planCase } = entry;
    activeCase = Object.freeze({ planId: contract.statement.id, caseId: planCase.caseId });
    const evidence = await captureSanitizedPlan(client, contract, planCase, scale);
    // Large plans must prove the named index and no forbidden node; small plans
    // tolerate planner-node differences (doc :361-363).
    if (scale === "large") assertSanitizedLargePlan(planCase, evidence);
    const measured: Task551MeasuredReceipt = Object.freeze({
      rowsRead: actualRowsRead(evidence),
      rowsReturned: evidence.rowsReturned,
      sharedHitBuffers: evidence.sharedHitBuffers,
      sharedReadBuffers: evidence.sharedReadBuffers,
      normalizedP95Ms: await authority.measureP95(contract.statement, planCase, scale),
    });
    const digest = sanitizePlanDigest({
      profile: scale,
      planId: contract.statement.id,
      caseId: planCase.caseId,
      ...measured,
    });
    assertPlanReceiptWithinBudget(contract.statement.id, planCase.caseId, scale, {
      ...measured,
      planSha256: digest,
    });
    const receipt = TASK551_QUERY_PLAN_RECEIPTS[key];
    if (receipt === undefined)
      throw new Task551PlanCheckError(
        "plan_contract_invalid",
        `case ${key} lost its numeric receipt`
      );
    assertMeasuredAgainstReceipt(key, scale, receipt[scale], measured);
    reports.push(caseReport(contract, planCase, evidence, measured));
  }
  if (reports.length !== REQUIRED_CASE_COUNT) {
    throw new Task551PlanCheckError(
      "plan_contract_invalid",
      "the case verification did not cover the closed case count"
    );
  }
  return Object.freeze(reports);
};

/**
 * Read-only v2 migration receipt validation (doc :578-595): strict grammar and
 * digest chain through the fixture validator, then exact online-index/manifest
 * parity. The path is fixed and never written.
 */
const requireTask551MigrationReceiptV2 = async (): Promise<void> => {
  let bytes: string;
  try {
    bytes = await readFile(TASK551_MIGRATION_RECEIPT_PATH, "utf8");
  } catch {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_MIGRATION_RECEIPT);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes) as unknown;
  } catch {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_MIGRATION_RECEIPT);
  }
  assertTask551OnlineIndexReceiptParity(assertTask551MigrationReceiptV2(parsed));
};

/** One full check: registry -> authorities -> target -> catalog -> receipt -> cases. */
export const runTask551ExplainCheck = async (
  scale: ScaleProfile
): Promise<Task551ExplainCheckReport> => {
  const caseIndex = assertTask551ExplainRegistryContract();
  const authority = readTask551ExplainAuthority();
  if (authority === undefined) {
    // The airtight-mode proof: no injected authority, no run, redacted exit.
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_AUTHORITY);
  }
  const catalogAuthority = readTask551CatalogAuthority();
  if (catalogAuthority === undefined) {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_CATALOG_AUTHORITY);
  }
  // L01's concurrency receipt is consumed strictly and redacted; L05 never
  // imports the L01 test module that owns the raw fixture.
  requireTask551L05ConcurrencyReceipt(TASK551_L05_CONCURRENCY_RECEIPT_MIRROR);
  // The reviewed freeze receipt gates the dynamic phase per profile.
  requireReviewedTask551FreezeReceipt(scale);
  const { target, client: targetClient } = await requireTask551ExplainFixtureTarget();
  const client = requireExplainValuesClient(authority.client);
  const expected = buildExpectedTask551Catalog(catalogAuthority);

  let cases: readonly Task551ExplainCaseReport[] = Object.freeze([]);
  let primaryFailure: unknown;
  let postCleanupFailed = false;
  try {
    const actual = await readPgCatalogDefinitions(authority.client, expected.ownedTables);
    assertExactTask551Catalog(actual, expected);
    await requireTask551MigrationReceiptV2();
    cases = await verifyAllCases(scale, caseIndex, client, authority);
  } catch (error) {
    primaryFailure = error;
  } finally {
    // Post-cleanup target proof after every success and failure; its failure is
    // never swallowed by an earlier case failure (doc :326-333).
    try {
      await assertTask551FixtureTargetPostCleanup(target, targetClient);
    } catch {
      postCleanupFailed = true;
    }
  }
  if (postCleanupFailed) {
    throw new Task551PlanCheckError("constraint_contract_failed", REASON_TARGET_POST_CLEANUP);
  }
  if (primaryFailure !== undefined) throw primaryFailure;
  return Object.freeze({
    schema: REPORT_SCHEMA,
    taskId: REPORT_TASK_ID,
    check: REPORT_CHECK,
    scale,
    status: "passed" as const,
    registry: registryCounts(),
    cases,
  });
};

/** Maps a check error to its fixed redacted reason slug (never raw detail). */
const reasonOf = (error: Task551PlanCheckError): string => {
  const slug = /^task551_[a-z0-9_]+/.exec(error.message)?.[0];
  return slug ?? REASON_CODE_FALLBACK[error.code];
};

const failureReport = (
  scale: ScaleProfile | undefined,
  error: unknown
): Task551ExplainCheckReport => {
  const base: Task551ExplainCheckReport = Object.freeze({
    schema: REPORT_SCHEMA,
    taskId: REPORT_TASK_ID,
    check: REPORT_CHECK,
    ...(scale === undefined ? {} : { scale }),
    status: "failed" as const,
    registry: registryCounts(),
    ...(activeCase === undefined ? {} : { failedCase: activeCase }),
  });
  if (error instanceof Task551PlanCheckError) {
    return Object.freeze({ ...base, code: error.code, reason: reasonOf(error) });
  }
  // Unknown failures stay fully redacted: no raw driver/database text.
  return Object.freeze({
    ...base,
    code: "constraint_contract_failed" as const,
    reason: REASON_UNEXPECTED,
  });
};

/** Prints exactly one redacted JSON report line; returns the process exit code. */
export const main = async (argv: readonly string[]): Promise<number> => {
  let scale: ScaleProfile;
  try {
    scale = parseTask551ExplainArgv(argv).scale;
  } catch (error) {
    process.stdout.write(`${JSON.stringify(failureReport(undefined, error))}\n`);
    return 1;
  }
  try {
    const report = await runTask551ExplainCheck(scale);
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify(failureReport(scale, error))}\n`);
    return 1;
  }
};

// Runbook form (see header): `bun run --env-file=/dev/null <this file> --scale
// small|large --check`. Plain `bun <this file> ...` is also fail-closed: exit 1
// with a redacted code (argv_invalid if Bun strips `--scale`, authority_absent
// if it forwards the flags) before any connection, capture or receipt read.
if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}

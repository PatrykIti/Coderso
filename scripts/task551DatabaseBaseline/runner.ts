import { readFileSync } from "node:fs";
import {
  assertExactTask551RequiredCatalogProjection,
  buildTask551ContractDigestInput,
  buildTask551FixtureDigestInput,
  computeTask551ContractDigest,
  computeTask551FixtureDigest,
  computeTask551ManifestScenarioResultDigest,
  computeTask551ReviewableReceiptDigest,
  computeTask551RunnerDigest,
  computeTask551SchemaDigest,
  requireTask551LowercaseSha256,
  resolveTask551ExecutableScenarioSelector,
  TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION,
  TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
  TASK551_RUNNER_DIGEST_SOURCE_PATHS,
  type Task551BaselineCheckSuccessRecord,
  type Task551CanonicalSelector,
  type Task551DigestScenario,
  type Task551LowercaseSha256,
  type Task551ReviewableFreezeReceiptV1,
  type Task551ReviewableReceiptDigestInputV1,
  type Task551ReviewableReceiptNumericCeilingV1,
  type Task551ReviewableReceiptStatementCeilingV1,
  type Task551SanitizedCatalogProjectionV1,
} from "./digestContract";
import {
  assertTask551FixtureTarget,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
  type Task551FixtureTarget,
  type Task551FixtureTargetClient,
  type Task551FixtureTargetProof,
} from "./fixtureTarget";
import {
  TASK551_ADMIN_READ_PLANNED_IDS,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
} from "../../tests/perf/fixtures/task551AdminReadStatementShapes";
import {
  MEASUREMENT,
  PROFILE_POOL_CAPACITY,
  TASK551_SCENARIO_MANIFEST_VERSION,
  TASK551_SCALE_COUNTS,
  TASK551_SCALE_DISTRIBUTIONS,
} from "../../tests/perf/fixtures/task551DatabaseScale";
import { assertMeasuredCeiling, assertP95SpreadWithinBudget, p95SpreadPercent } from "./metrics";
import {
  activeTask551CandidateReceiptWriterForRunner,
  defaultReadReceipt,
  readTask551L02ReviewedStateAttestationForCheck,
  type Task551CandidateReceiptWriterForRunner,
  type Task551ReviewedPairWriteResult,
} from "./reviewedPairTransition";
import { requireTask551ActiveGenerationStateForBaselineEntry } from "./freezeCandidateGenerationStore";
export {
  createTask551L02OwnerCapabilityFactory,
  createTask551ReviewedPairPersistence,
  transitionJustFrozenCandidatesAfterL02HumanApproval,
} from "./reviewedPairPersistence";
export type {
  Task551L02OwnerApprovalCapability,
  Task551L02OwnerCapabilityFactory,
  Task551L02OwnerCapabilityObserved,
  Task551L02OwnedReviewedCandidateTransitionDeps,
  Task551L02ReviewedCandidateTransitionDeps,
  Task551L02OwnerCapabilityReceiptV1,
  Task551ReviewedCandidateTransitionOutcome,
  Task551ReviewedPairCleanupFailureKind,
  Task551ReviewedPairCleanupTelemetry,
  Task551ReviewedPairPersistence,
  Task551ReviewedPairPersistenceCapability,
  Task551ReviewedPairWriteResult,
} from "./reviewedPairPersistence";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

type Task551ScaleProfile = "small" | "large";
export type Task551ScenarioInput = Readonly<{
  scenario: Task551DigestScenario;
  profile: Task551ScaleProfile;
}>;

type Task551ScenarioLifecycle = Readonly<{
  executeScenario: (input: Task551ScenarioInput) => Promise<void>;
  measureScenario: (input: Task551ScenarioInput) => Promise<Task551ScenarioMeasurement>;
  cleanupScenario: (input: Task551ScenarioInput) => Promise<void>;
}>;

export type Task551ScenarioMeasurement = Readonly<{
  statementCeilings: readonly Task551ReviewableReceiptNumericCeilingV1[];
  statementIds?: readonly string[];
  poolWaitCeiling: Task551ReviewableReceiptNumericCeilingV1;
  calibrationMedianMs: number;
  p95Repetitions?: readonly [number, number, number];
  p95SpreadPercent?: number;
  scopeDigest?: Task551LowercaseSha256;
  runtimeContext?: Task551DatabaseRuntimeContext;
}>;

export type Task551DatabaseRuntimeContext = Readonly<{
  provenanceCommit: string;
  platform: string;
  arch: string;
  cpuModel: string;
  logicalCpus: number;
  memoryMb: number;
  postgresMajor: number;
  postgresConfigDigest: string;
  bunVersion: string;
  poolCapacity: number;
  containerMode: string;
  scopeDigest: string;
}>;

export type Task551DatabaseTargetTransport = Readonly<{
  client: Task551FixtureTargetClient;
  close: () => Promise<void>;
  executeScenario?: (input: Task551ScenarioInput) => Promise<void>;
  cleanupScenario?: (input: Task551ScenarioInput) => Promise<void>;
  measureScenario?: (input: Task551ScenarioInput) => Promise<Task551ScenarioMeasurement>;
  readSanitizedCatalogProjection?: () => Promise<Task551SanitizedCatalogProjectionV1>;
  readRuntimeContext?: () => Promise<Task551DatabaseRuntimeContext>;
}>;

export type Task551DatabaseBaselineRunInput = Readonly<{
  mode: "freeze" | "check";
  profile: Task551ScaleProfile;
  selector: Task551CanonicalSelector;
  target: Task551FixtureTarget;
  scenarios: readonly Task551DigestScenario[];
}>;

export type Task551DatabaseBaselineRunDeps = Readonly<{
  sha256Bytes?: (bytes: Uint8Array) => string;
  openTransport?: (target: Task551FixtureTarget) => Promise<Task551DatabaseTargetTransport>;
  executeScenario?: (input: Task551ScenarioInput) => Promise<void>;
  cleanupScenario?: (input: Task551ScenarioInput) => Promise<void>;
  measureScenario?: (input: Task551ScenarioInput) => Promise<Task551ScenarioMeasurement>;
  readSanitizedCatalogProjection?: () => Promise<Task551SanitizedCatalogProjectionV1>;
  readRuntimeContext?: () => Promise<Task551DatabaseRuntimeContext>;
  onReviewedPairWriteResult?: (result: Task551ReviewedPairWriteResult) => void;
  writeCandidateReceipt?: never;
  buildCandidateReceipt?: (
    input: Readonly<{
      profile: Task551ScaleProfile;
      measurements: readonly Task551ScenarioMeasurement[];
      digests: Readonly<{
        contractDigest: Task551LowercaseSha256;
        fixtureDigest: Task551LowercaseSha256;
        schemaDigest: Task551LowercaseSha256;
        runnerDigest: Task551LowercaseSha256;
      }>;
    }>
  ) => Promise<Task551ReviewableFreezeReceiptV1>;
  sourceHashes?: Readonly<Record<string, Task551LowercaseSha256>>;
}>;

export type Task551DatabaseBaselineRunResult =
  Task551BaselineCheckSuccessRecord | Task551ReviewedPairWriteResult | undefined;

type Task551PostgresRows = readonly Record<string, unknown>[];
type Task551PostgresClient = {
  unsafe(query: string, values?: readonly unknown[]): Promise<Task551PostgresRows>;
  end(options?: Readonly<{ timeout?: number }>): Promise<void>;
  reserve(): Promise<Task551PostgresReservedClient>;
};

type Task551PostgresReservedClient = Task551PostgresClient & {
  release(): void;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function assertOwnKeys(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(value)) invalid();
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(keys);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  return value;
}

function assertRunInput(value: Task551DatabaseBaselineRunInput): void {
  const record = assertOwnKeys(value, ["mode", "profile", "selector", "target", "scenarios"]);
  if (record.mode !== "freeze" && record.mode !== "check") invalid();
  if (record.profile !== "small" && record.profile !== "large") invalid();
  if (!isPlainObject(record.target)) invalid();
  const target = assertOwnKeys(record.target, ["url", "expectedDatabaseName", "sentinel"]);
  for (const key of ["url", "expectedDatabaseName", "sentinel"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  if (target.expectedDatabaseName !== "coderso02") invalid();
  if (
    typeof target.url !== "string" ||
    target.url.length === 0 ||
    typeof target.sentinel !== "string"
  )
    invalid();
  parseTask551FixtureTarget({
    TASK551_FIXTURE_DATABASE_URL: target.url,
    TASK551_FIXTURE_DATABASE_NAME: target.expectedDatabaseName,
    TASK551_FIXTURE_DATABASE_SENTINEL: target.sentinel,
  });
  if (
    !Array.isArray(record.scenarios) ||
    Object.getPrototypeOf(record.scenarios) !== Array.prototype
  )
    invalid();
}

function requireSha256(
  value: ((bytes: Uint8Array) => string) | undefined
): (bytes: Uint8Array) => string {
  if (typeof value !== "function") invalid();
  return value;
}

function requireCandidateReceiptWriter(
  deps: Task551DatabaseBaselineRunDeps
): Task551CandidateReceiptWriterForRunner {
  if (!isPlainObject(deps)) invalid();
  if (
    Object.prototype.hasOwnProperty.call(deps, "writeCandidateReceipt") ||
    Object.prototype.hasOwnProperty.call(deps, "candidateReceiptWriter") ||
    Object.prototype.hasOwnProperty.call(deps, "reviewedPairPersistence") ||
    Object.prototype.hasOwnProperty.call(deps, "readReviewableReceipt") ||
    Object.prototype.hasOwnProperty.call(deps, "readState") ||
    Object.prototype.hasOwnProperty.call(deps, "writeState")
  )
    invalid();

  const observerDescriptor = Object.getOwnPropertyDescriptor(deps, "onReviewedPairWriteResult");
  if (
    observerDescriptor !== undefined &&
    (observerDescriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(observerDescriptor, "value") ||
      observerDescriptor.get !== undefined ||
      observerDescriptor.set !== undefined ||
      typeof observerDescriptor.value !== "function")
  )
    invalid();
  return activeTask551CandidateReceiptWriterForRunner();
}

function readCheckedInSourceHashes(
  sha256Bytes: (bytes: Uint8Array) => string
): Readonly<Record<string, Task551LowercaseSha256>> {
  const result: Record<string, Task551LowercaseSha256> = {};
  for (const sourcePath of TASK551_RUNNER_DIGEST_SOURCE_PATHS) {
    let bytes: Uint8Array;
    try {
      bytes = readFileSync(new URL(`../../${sourcePath}`, import.meta.url));
    } catch {
      invalid();
    }
    result[sourcePath] = computeTask551SourceHash(bytes, sha256Bytes);
  }
  return result;
}

function computeTask551SourceHash(
  bytes: Uint8Array,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  if (!(bytes instanceof Uint8Array)) invalid();
  let digest: string;
  try {
    digest = sha256Bytes(bytes);
  } catch {
    invalid();
  }
  return requireTask551LowercaseSha256(digest);
}

function assertReceiptDigest(
  receipt: Task551ReviewableFreezeReceiptV1,
  profile: Task551ScaleProfile,
  expected: Readonly<{
    contractDigest: Task551LowercaseSha256;
    fixtureDigest: Task551LowercaseSha256;
    schemaDigest: Task551LowercaseSha256;
    runnerDigest: Task551LowercaseSha256;
  }>,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  if (receipt.profile !== profile || receipt.reviewState !== "reviewed") invalid();
  const reviewableReceiptDigest = computeTask551ReviewableReceiptDigest(receipt, sha256Bytes);
  if (
    receipt.contractDigest !== expected.contractDigest ||
    receipt.fixtureDigest !== expected.fixtureDigest ||
    receipt.schemaDigest !== expected.schemaDigest ||
    receipt.runnerDigest !== expected.runnerDigest ||
    receipt.reviewableReceiptDigest !== reviewableReceiptDigest
  )
    invalid();
  return reviewableReceiptDigest;
}

function assertPersistedReceiptIntegrity(
  receipt: Task551ReviewableFreezeReceiptV1,
  profile: Task551ScaleProfile,
  sha256Bytes: (bytes: Uint8Array) => string
): void {
  const selfDigest = computeTask551ReviewableReceiptDigest(receipt, sha256Bytes);
  if (
    receipt.profile !== profile ||
    (receipt.reviewState !== "candidate" && receipt.reviewState !== "reviewed") ||
    receipt.reviewableReceiptDigest !== selfDigest
  ) {
    invalid();
  }
}

function computeStaticDigests(
  profile: Task551ScaleProfile,
  selector: Task551CanonicalSelector,
  scenarios: readonly Task551DigestScenario[],
  sourceHashes: Readonly<Record<string, Task551LowercaseSha256>>,
  sha256Bytes: (bytes: Uint8Array) => string
): Readonly<{
  contractDigest: Task551LowercaseSha256;
  fixtureDigest: Task551LowercaseSha256;
  schemaDigest: Task551LowercaseSha256;
  runnerDigest: Task551LowercaseSha256;
  manifestScenarioResultDigest: Task551LowercaseSha256;
}> {
  const contractDigest = computeTask551ContractDigest(
    buildTask551ContractDigestInput({
      plannedIds: TASK551_ADMIN_READ_PLANNED_IDS,
      shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
      measurement: MEASUREMENT,
    }),
    sha256Bytes
  );
  const fixtureDigest = computeTask551FixtureDigest(
    buildTask551FixtureDigestInput({
      manifestVersion: TASK551_SCENARIO_MANIFEST_VERSION,
      scenarios,
      scaleCounts: TASK551_SCALE_COUNTS,
      distributions: TASK551_SCALE_DISTRIBUTIONS,
    }),
    sha256Bytes
  );
  const schemaDigest = computeTask551SchemaDigest(
    TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
    sha256Bytes
  );
  const runnerDigest = computeTask551RunnerDigest(sourceHashes, sha256Bytes);
  const manifestScenarioResultDigest = computeTask551ManifestScenarioResultDigest(
    { profile, selector, scenarios },
    sha256Bytes
  );
  return {
    contractDigest,
    fixtureDigest,
    schemaDigest,
    runnerDigest,
    manifestScenarioResultDigest,
  };
}

function measurementCeilings(
  measurement: Task551ScenarioMeasurement
): readonly Task551ReviewableReceiptNumericCeilingV1[] {
  if (
    !Array.isArray(measurement.statementCeilings) ||
    !Array.isArray(measurement.statementIds ?? [])
  )
    invalid();
  if (
    measurement.statementIds !== undefined &&
    measurement.statementIds.length !== measurement.statementCeilings.length
  )
    invalid();
  const result = measurement.statementCeilings.map((value, index) => {
    const ceiling = assertMeasuredCeiling(value);
    const statementId = measurement.statementIds?.[index];
    if (statementId !== undefined && !TASK551_ADMIN_READ_PLANNED_IDS.includes(statementId))
      invalid();
    return ceiling;
  });
  if (
    measurement.statementIds !== undefined &&
    new Set(measurement.statementIds).size !== measurement.statementIds.length
  )
    invalid();
  assertMeasuredCeiling(measurement.poolWaitCeiling);
  if (
    typeof measurement.calibrationMedianMs !== "number" ||
    !Number.isFinite(measurement.calibrationMedianMs) ||
    measurement.calibrationMedianMs <= 0
  )
    invalid();
  if (measurement.p95Repetitions === undefined || measurement.p95Repetitions.length !== 3)
    invalid();
  assertP95SpreadWithinBudget(measurement.p95Repetitions, MEASUREMENT.maxP95VariancePercent);
  if (
    measurement.p95SpreadPercent !== undefined &&
    measurement.p95SpreadPercent !== p95SpreadPercent(measurement.p95Repetitions)
  )
    invalid();
  return result;
}

const RECEIPT_RUNTIME_CONTEXT_KEYS = [
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
] as const;

const RECEIPT_CEILING_KEYS = [
  "queryCountMax",
  "rowsReadMax",
  "rowsReturnedMax",
  "transferredBytesMax",
  "sharedBuffersMax",
  "p50MsMax",
  "p95MsMax",
  "p99MsMax",
] as const;

function assertMeasuredBelowReviewed(
  measured: Task551ReviewableReceiptNumericCeilingV1,
  reviewed: Task551ReviewableReceiptNumericCeilingV1
): void {
  for (const key of RECEIPT_CEILING_KEYS) {
    if (measured[key] > reviewed[key]) invalid();
  }
}

function normalizeMeasuredLatencyCeilings(
  measured: Task551ReviewableReceiptNumericCeilingV1,
  calibrationFactor: number
): Task551ReviewableReceiptNumericCeilingV1 {
  return {
    ...measured,
    p50MsMax: measured.p50MsMax * calibrationFactor,
    p95MsMax: measured.p95MsMax * calibrationFactor,
    p99MsMax: measured.p99MsMax * calibrationFactor,
  };
}

function assertCheckMeasurementAgainstReceipt(
  measurement: Task551ScenarioMeasurement,
  receipt: Task551ReviewableFreezeReceiptV1,
  profile: Task551ScaleProfile
): void {
  const measured = measurementCeilings(measurement);
  const ids = measurement.statementIds ?? TASK551_ADMIN_READ_PLANNED_IDS;
  if (ids.length !== measured.length || new Set(ids).size !== ids.length) invalid();
  if (measurement.runtimeContext === undefined) invalid();
  if (measurement.runtimeContext.poolCapacity !== PROFILE_POOL_CAPACITY[profile]) invalid();
  const reviewedCalibration = receipt.calibration.medianMs;
  const calibrationFactor = reviewedCalibration / measurement.calibrationMedianMs;
  if (!Number.isFinite(calibrationFactor) || calibrationFactor < 0.8 || calibrationFactor > 1.2)
    invalid();
  const reviewedById = new Map(
    receipt.statementCeilings.map((entry) => [entry.statementId, entry.ceiling])
  );
  for (const [index, statementId] of ids.entries()) {
    const reviewed = reviewedById.get(statementId);
    if (reviewed === undefined) invalid();
    assertMeasuredBelowReviewed(
      normalizeMeasuredLatencyCeilings(measured[index]!, calibrationFactor),
      reviewed
    );
  }
  const measuredPool = assertMeasuredCeiling(measurement.poolWaitCeiling);
  assertMeasuredBelowReviewed(
    normalizeMeasuredLatencyCeilings(measuredPool, calibrationFactor),
    receipt.poolWaitCeiling
  );
  for (const key of RECEIPT_RUNTIME_CONTEXT_KEYS) {
    if (measurement.runtimeContext[key] !== receipt[key]) invalid();
  }
}

function mergeNumericCeilings(
  left: Task551ReviewableReceiptNumericCeilingV1,
  right: Task551ReviewableReceiptNumericCeilingV1
): Task551ReviewableReceiptNumericCeilingV1 {
  return {
    queryCountMax: 1,
    rowsReadMax: Math.max(left.rowsReadMax, right.rowsReadMax),
    rowsReturnedMax: Math.max(left.rowsReturnedMax, right.rowsReturnedMax) as 1 | 51 | 101 | 102,
    transferredBytesMax: Math.max(left.transferredBytesMax, right.transferredBytesMax),
    sharedBuffersMax: Math.max(left.sharedBuffersMax, right.sharedBuffersMax),
    p50MsMax: Math.max(left.p50MsMax, right.p50MsMax),
    p95MsMax: Math.max(left.p95MsMax, right.p95MsMax),
    p99MsMax: Math.max(left.p99MsMax, right.p99MsMax),
  };
}

function mergeMeasurements(measurements: readonly Task551ScenarioMeasurement[]): Readonly<{
  statementCeilings: readonly Task551ReviewableReceiptStatementCeilingV1[];
  poolWaitCeiling: Task551ReviewableReceiptNumericCeilingV1;
  calibrationMedianMs: number;
}> {
  if (measurements.length === 0) invalid();
  const checked = measurements.map((measurement) => ({
    statementCeilings: measurementCeilings(measurement),
    poolWaitCeiling: assertMeasuredCeiling(measurement.poolWaitCeiling),
    calibrationMedianMs: measurement.calibrationMedianMs,
  }));
  const ceilingsById = new Map<string, Task551ReviewableReceiptNumericCeilingV1>();
  for (const [measurementIndex, current] of checked.entries()) {
    const original = measurements[measurementIndex]!;
    const ids = original.statementIds ?? TASK551_ADMIN_READ_PLANNED_IDS;
    if (ids.length !== current.statementCeilings.length) invalid();
    for (const [index, statementId] of ids.entries()) {
      if (!TASK551_ADMIN_READ_PLANNED_IDS.includes(statementId)) invalid();
      const prior = ceilingsById.get(statementId);
      const next =
        prior === undefined
          ? current.statementCeilings[index]!
          : mergeNumericCeilings(prior, current.statementCeilings[index]!);
      ceilingsById.set(statementId, next);
    }
  }
  const statementCeilings = TASK551_ADMIN_READ_PLANNED_IDS.map((statementId) => {
    const ceiling = ceilingsById.get(statementId);
    if (ceiling === undefined) invalid();
    return { statementId, ceiling };
  });
  const poolWaitCeiling = checked
    .slice(1)
    .reduce(
      (current, measurement) => mergeNumericCeilings(current, measurement.poolWaitCeiling),
      checked[0]!.poolWaitCeiling
    );
  const calibrationMedianMs = Math.max(
    ...checked.map((measurement) => measurement.calibrationMedianMs)
  );
  return { statementCeilings, poolWaitCeiling, calibrationMedianMs };
}

function defaultCandidateReceipt(
  profile: Task551ScaleProfile,
  measurements: readonly Task551ScenarioMeasurement[],
  runtimeContext: Task551DatabaseRuntimeContext,
  digests: Readonly<{
    contractDigest: Task551LowercaseSha256;
    fixtureDigest: Task551LowercaseSha256;
    schemaDigest: Task551LowercaseSha256;
    runnerDigest: Task551LowercaseSha256;
  }>,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewableFreezeReceiptV1 {
  const merged = mergeMeasurements(measurements);
  if (runtimeContext.poolCapacity !== PROFILE_POOL_CAPACITY[profile]) invalid();
  const input: Task551ReviewableReceiptDigestInputV1 = {
    reviewState: "candidate",
    profile,
    provenanceCommit: runtimeContext.provenanceCommit,
    contractDigest: digests.contractDigest,
    fixtureDigest: digests.fixtureDigest,
    schemaDigest: digests.schemaDigest,
    runnerDigest: digests.runnerDigest,
    platform: runtimeContext.platform,
    arch: runtimeContext.arch,
    cpuModel: runtimeContext.cpuModel,
    logicalCpus: runtimeContext.logicalCpus,
    memoryMb: runtimeContext.memoryMb,
    postgresMajor: runtimeContext.postgresMajor,
    postgresConfigDigest: runtimeContext.postgresConfigDigest,
    bunVersion: runtimeContext.bunVersion,
    poolCapacity: runtimeContext.poolCapacity,
    containerMode: runtimeContext.containerMode,
    scopeDigest: runtimeContext.scopeDigest,
    calibration: { warmups: 20, samples: 100, medianMs: merged.calibrationMedianMs },
    statementCeilings: merged.statementCeilings,
    poolWaitCeiling: merged.poolWaitCeiling,
  };
  const reviewableReceiptDigest = computeTask551ReviewableReceiptDigest(input, sha256Bytes);
  return { ...input, reviewableReceiptDigest };
}

async function runScenarioLifecycle(
  scenarioInput: Task551ScenarioInput,
  client: Task551FixtureTargetClient,
  target: Task551FixtureTarget,
  lifecycle: Task551ScenarioLifecycle,
  afterCleanup?: () => Promise<void>
): Promise<Task551ScenarioMeasurement> {
  let failed = false;
  let measurement: Task551ScenarioMeasurement | undefined;
  try {
    await lifecycle.executeScenario(scenarioInput);
    measurement = await lifecycle.measureScenario(scenarioInput);
    measurementCeilings(measurement);
  } catch {
    failed = true;
  } finally {
    try {
      await lifecycle.cleanupScenario(scenarioInput);
    } catch {
      failed = true;
    }
    // The only permitted step between a cleanup and the mandatory
    // post-cleanup preservation proof is the freeze's own candidate write on
    // the final scenario; a failed cleanup never reaches it.
    if (!failed && afterCleanup !== undefined) {
      try {
        await afterCleanup();
      } catch {
        failed = true;
      }
    }
    try {
      await assertTask551FixtureTargetPostCleanup(target, client);
    } catch {
      failed = true;
    }
  }
  if (failed || measurement === undefined) invalid();
  return measurement;
}

function requireScenarioLifecycle(
  deps: Task551DatabaseBaselineRunDeps,
  transport: Task551DatabaseTargetTransport
): Task551ScenarioLifecycle {
  const executeScenario = deps.executeScenario ?? transport.executeScenario;
  const measureScenario = deps.measureScenario ?? transport.measureScenario;
  const cleanupScenario = deps.cleanupScenario ?? transport.cleanupScenario;
  if (
    typeof executeScenario !== "function" ||
    typeof measureScenario !== "function" ||
    typeof cleanupScenario !== "function"
  ) {
    invalid();
  }
  return { executeScenario, measureScenario, cleanupScenario };
}

export async function runTask551DatabaseBaseline(
  input: Task551DatabaseBaselineRunInput,
  deps: Task551DatabaseBaselineRunDeps = {}
): Promise<Task551DatabaseBaselineRunResult> {
  assertRunInput(input);
  // The active-generation entry gate runs before any fixture source, transport,
  // scenario, or candidate write: only the exact legal state passes, and a
  // legacy or non-v2 durable state surfaces its fixed migration code.
  const entryState = requireTask551ActiveGenerationStateForBaselineEntry({
    mode: input.mode,
    profile: input.profile,
  });
  const candidateReceiptWriter = requireCandidateReceiptWriter(deps);
  const sha256Bytes = requireSha256(deps.sha256Bytes);
  const selected = resolveTask551ExecutableScenarioSelector(input.selector, input.scenarios);
  if (typeof deps.openTransport !== "function") invalid();
  const prepared = await (async () => {
    try {
      const sourceHashes = deps.sourceHashes ?? readCheckedInSourceHashes(sha256Bytes);
      const smallDigests = computeStaticDigests(
        "small",
        input.selector,
        input.scenarios,
        sourceHashes,
        sha256Bytes
      );
      const largeDigests = computeStaticDigests(
        "large",
        input.selector,
        input.scenarios,
        sourceHashes,
        sha256Bytes
      );
      if (input.mode !== "check") {
        // A freeze entry is already state-gated: no reviewed pair is read.
        return Object.freeze({
          digests: input.profile === "small" ? smallDigests : largeDigests,
          persistedPair: undefined,
          entryState,
        });
      }
      const persistedPair = [defaultReadReceipt("small"), defaultReadReceipt("large")] as const;
      assertPersistedReceiptIntegrity(persistedPair[0], "small", sha256Bytes);
      assertPersistedReceiptIntegrity(persistedPair[1], "large", sha256Bytes);
      assertReceiptDigest(persistedPair[0], "small", smallDigests, sha256Bytes);
      assertReceiptDigest(persistedPair[1], "large", largeDigests, sha256Bytes);
      const attestation = readTask551L02ReviewedStateAttestationForCheck();
      return Object.freeze({
        digests: input.profile === "small" ? smallDigests : largeDigests,
        persistedPair,
        entryState,
        attestation,
      });
    } catch {
      invalid();
    }
  })();
  const transport = await deps.openTransport(input.target);
  let result: Task551BaselineCheckSuccessRecord | undefined;
  let writeResult: Task551ReviewedPairWriteResult | undefined;
  let failure = false;
  try {
    let preflight: Task551FixtureTargetProof;
    try {
      preflight = await assertTask551FixtureTarget(input.target, transport.client);
    } catch {
      invalid();
    }
    const readCatalog =
      deps.readSanitizedCatalogProjection ?? transport.readSanitizedCatalogProjection;
    if (readCatalog !== undefined) {
      try {
        assertExactTask551RequiredCatalogProjection(await readCatalog());
      } catch {
        invalid();
      }
    }
    const { digests, persistedPair } = prepared;
    if (input.mode === "check") {
      if (persistedPair === undefined) invalid();
      const receipt = persistedPair[input.profile === "small" ? 0 : 1];
      const reviewableReceiptDigest = receipt.reviewableReceiptDigest;
      const lifecycle = requireScenarioLifecycle(deps, transport);
      for (const scenario of selected) {
        const scenarioInput = { scenario, profile: input.profile } as const;
        const measurement = await runScenarioLifecycle(
          scenarioInput,
          transport.client,
          input.target,
          lifecycle
        );
        assertCheckMeasurementAgainstReceipt(measurement, receipt, input.profile);
      }
      result = {
        schema: "coderso.task551.database-baseline-check@v1",
        taskId: "TASK-551-01-L02",
        mode: "check",
        profile: input.profile,
        pass: true,
        fixtureTargetPreflight: preflight,
        reviewableReceiptDigest,
        contractDigest: digests.contractDigest,
        fixtureDigest: digests.fixtureDigest,
        schemaDigest: digests.schemaDigest,
        runnerDigest: digests.runnerDigest,
        manifestScenarioResultDigest: digests.manifestScenarioResultDigest,
      };
    } else {
      const lifecycle = requireScenarioLifecycle(deps, transport);
      const measurements: Task551ScenarioMeasurement[] = [];
      const freezeCandidate = async (
        collected: readonly Task551ScenarioMeasurement[]
      ): Promise<void> => {
        const candidate =
          deps.buildCandidateReceipt === undefined
            ? defaultCandidateReceipt(
                input.profile,
                collected,
                await (
                  deps.readRuntimeContext ??
                  transport.readRuntimeContext ??
                  (() => Promise.reject(new Error(INVALID_ERROR_MESSAGE)))
                )(),
                digests,
                sha256Bytes
              )
            : await deps.buildCandidateReceipt({
                profile: input.profile,
                measurements: collected,
                digests,
              });
        if (candidate.reviewState !== "candidate" || candidate.profile !== input.profile) invalid();
        if (
          computeTask551ReviewableReceiptDigest(candidate, sha256Bytes) !==
          candidate.reviewableReceiptDigest
        )
          invalid();
        let written: Task551ReviewedPairWriteResult;
        try {
          written = await candidateReceiptWriter.writeCandidateReceipt(candidate);
        } catch {
          invalid();
        }
        if (written.committed !== true) invalid();
        writeResult = written;
        try {
          deps.onReviewedPairWriteResult?.(writeResult);
        } catch {
          // A telemetry observer must not turn a committed replacement into a mutation failure.
        }
      };
      for (const [index, scenario] of selected.entries()) {
        const scenarioInput = { scenario, profile: input.profile } as const;
        const isFinalScenario = index === selected.length - 1;
        measurements.push(
          await runScenarioLifecycle(
            scenarioInput,
            transport.client,
            input.target,
            lifecycle,
            isFinalScenario ? () => freezeCandidate(measurements) : undefined
          )
        );
      }
      if (writeResult === undefined) invalid();
    }
  } catch {
    failure = true;
  } finally {
    try {
      await transport.close();
    } catch {
      failure = true;
    }
  }
  if (
    failure ||
    (input.mode === "check" && result === undefined) ||
    (input.mode === "freeze" && writeResult === undefined)
  )
    invalid();
  return input.mode === "freeze" ? writeResult : result;
}

export const TASK551_DATABASE_BASELINE_DIGEST_VERSION =
  TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION;

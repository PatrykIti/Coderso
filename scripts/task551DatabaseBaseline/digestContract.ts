import { TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION_LITERAL } from "./requiredSanitizedCatalogProjection";
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | Readonly<{ readonly [key: string]: JsonValue }>;
export type Task551LowercaseSha256 = string;
export type Task551ScaleProfile = "small" | "large";
export type Task551BaselineCheckSuccessRecord = Readonly<{
  schema: "coderso.task551.database-baseline-check@v1";
  taskId: "TASK-551-01-L02";
  mode: "check";
  profile: Task551ScaleProfile;
  pass: true;
  fixtureTargetPreflight: Readonly<{
    rolledBack: true;
    currentDatabaseMatched: true;
    exactSingleMarkerMatched: true;
    boundSentinelByteMatched: true;
  }>;
  reviewableReceiptDigest: Task551LowercaseSha256;
  contractDigest: Task551LowercaseSha256;
  fixtureDigest: Task551LowercaseSha256;
  schemaDigest: Task551LowercaseSha256;
  runnerDigest: Task551LowercaseSha256;
  manifestScenarioResultDigest: Task551LowercaseSha256;
}>;
export type Task551CanonicalSelector =
  Readonly<{ kind: "all" }> | Readonly<{ kind: "scenario"; id: string }>;
export type Task551ReviewableReceiptNumericCeilingV1 = Readonly<{
  queryCountMax: 1;
  rowsReadMax: number;
  rowsReturnedMax: 1 | 51 | 101 | 102;
  transferredBytesMax: number;
  sharedBuffersMax: number;
  p50MsMax: number;
  p95MsMax: number;
  p99MsMax: number;
}>;
export type Task551ReviewableReceiptStatementCeilingV1 = Readonly<{
  statementId: string;
  ceiling: Task551ReviewableReceiptNumericCeilingV1;
}>;
export type Task551ReviewableReceiptDigestInputV1 = Readonly<{
  reviewableReceiptDigest?: Task551LowercaseSha256;
  reviewState: "candidate" | "reviewed";
  profile: Task551ScaleProfile;
  provenanceCommit: string;
  contractDigest: Task551LowercaseSha256;
  fixtureDigest: Task551LowercaseSha256;
  schemaDigest: Task551LowercaseSha256;
  runnerDigest: Task551LowercaseSha256;
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
  calibration: Readonly<{ warmups: 20; samples: 100; medianMs: number }>;
  statementCeilings: readonly Task551ReviewableReceiptStatementCeilingV1[];
  poolWaitCeiling: Task551ReviewableReceiptNumericCeilingV1;
}>;
export type Task551ReviewableFreezeReceiptV1 = Readonly<
  Omit<Task551ReviewableReceiptDigestInputV1, "reviewableReceiptDigest"> &
    Readonly<{ reviewableReceiptDigest: Task551LowercaseSha256 }>
>;
export type Task551L02OwnerCapabilityReceiptV1 = Readonly<{
  schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1";
  digest: Task551LowercaseSha256;
}>;
export type Task551ReviewedCandidateTransitionInputV1 = Readonly<{
  schema: "coderso.task551.reviewed-candidate-transition-input@v1";
  candidates: readonly [
    Readonly<{
      profile: "small";
      candidateReceipt: Task551ReviewableFreezeReceiptV1;
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
    Readonly<{
      profile: "large";
      candidateReceipt: Task551ReviewableFreezeReceiptV1;
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
  ];
}>;
export type Task551ReviewedCandidateTransitionResultV1 = Readonly<{
  schema: "coderso.task551.reviewed-candidate-transition-result@v1";
  capabilityReceipt: Task551L02OwnerCapabilityReceiptV1;
  reviewed: readonly [
    Readonly<{
      profile: "small";
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
      reviewedReceipt: Task551ReviewableFreezeReceiptV1;
      reviewedCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
    Readonly<{
      profile: "large";
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
      reviewedReceipt: Task551ReviewableFreezeReceiptV1;
      reviewedCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
  ];
}>;
export type Task551DigestScenario = Readonly<{
  id: string;
  kind: "admin-shape" | "supplemental" | "task489-predecessor";
  targetStatementOrFamily: string;
  minimumClosure: readonly string[];
  supportTables: readonly string[];
  expectedTableCounts: JsonValue;
  ownedKeyPredicate: JsonValue;
  equalityParticipation: "admin-32" | "supplemental" | "deferred";
  statementShapeId?: string;
}>;
export type Task551SanitizedCatalogProjectionV1 = Readonly<{
  version: "task551-sanitized-catalog@v1";
  tables: readonly Readonly<{
    schema: "public";
    name: string;
    columns: readonly Readonly<{
      name: string;
      postgresType: string;
      nullable: boolean;
    }>[];
    constraints: readonly Readonly<{
      name: string;
      kind: "primary-key" | "foreign-key" | "unique" | "check";
      columns: readonly string[];
      referencedTable: string | null;
      referencedColumns: readonly string[];
    }>[];
    indexes: readonly Readonly<{
      name: string;
      unique: boolean;
      method: string;
      columns: readonly Readonly<{
        name: string;
        direction: "asc" | "desc";
      }>[];
    }>[];
  }>[];
}>;
export type Task551ContractDigestSource = Readonly<{
  plannedIds: readonly string[];
  shapes: JsonValue;
  measurement: JsonValue;
}>;
export type Task551ContractDigestInput = Readonly<{
  version: "task551-database-baseline-digest@v1";
  plannedIds: readonly string[];
  shapes: JsonValue;
  measurement: JsonValue;
}>;
export type Task551FixtureDigestSource = Readonly<{
  manifestVersion: string;
  scenarios: readonly Task551DigestScenario[];
  scaleCounts: JsonValue;
  distributions: JsonValue;
}>;
export type Task551FixtureDigestInput = Readonly<{
  version: "task551-database-baseline-digest@v1";
  manifestVersion: string;
  scenarios: readonly Task551DigestScenario[];
  scaleCounts: JsonValue;
  distributions: JsonValue;
}>;
export const TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION =
  "task551-database-baseline-digest@v1" as const;
export const TASK551_RUNNER_DIGEST_SOURCE_PATHS = [
  "scripts/task-551-database-baseline.ts",
  "scripts/task551DatabaseBaseline/catalog.ts",
  "scripts/task551DatabaseBaseline/digestContract.ts",
  "scripts/task551DatabaseBaseline/fixtureTarget.ts",
  "scripts/task551DatabaseBaseline/fixtureValidation.ts",
  "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts",
  "scripts/task551DatabaseBaseline/metrics.ts",
  "scripts/task551DatabaseBaseline/postgresTransport.ts",
  "scripts/task551DatabaseBaseline/receiptContract.ts",
  "scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts",
  "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
  "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
  "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts",
  "scripts/task551DatabaseBaseline/reviewedPairTransition.ts",
  "scripts/task551DatabaseBaseline/runner.ts",
  "scripts/task551DatabaseBaseline/runtimeProvenance.ts",
  "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts",
  "tests/perf/fixtures/task551AdminReadStatementShapes.ts",
  "tests/perf/fixtures/task551DatabaseScale.ts",
] as const;
const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
const SENTINEL_TABLE_NAMES = new Set([
  "public.task551_fixture_sentinel",
  "task551_fixture_sentinel",
]);
const ADMIN_STATEMENT_IDS = [
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
function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
function assertOwnKeys(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(value)) {
    invalid();
  }
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(keys);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    invalid();
  }
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
function assertString(value: unknown): string {
  if (typeof value !== "string") {
    invalid();
  }
  return value;
}
type Task551ConstraintKind = "primary-key" | "foreign-key" | "unique" | "check";
function assertTask551ConstraintKind(value: unknown): Task551ConstraintKind {
  if (value !== "primary-key" && value !== "foreign-key" && value !== "unique" && value !== "check")
    invalid();
  return value;
}
function assertTask551IndexDirection(value: unknown): "asc" | "desc" {
  if (value !== "asc" && value !== "desc") invalid();
  return value;
}
function assertJsonValue(value: unknown): asserts value is JsonValue {
  if (value === null || typeof value === "boolean") {
    return;
  }
  if (typeof value === "string") {
    if (SENTINEL_TABLE_NAMES.has(value)) invalid();
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      invalid();
    }
    return;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      invalid();
    }
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== value.length + 1 ||
      ownKeys.some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/u.test(key)))
    )
      invalid();
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        invalid();
    }
    for (const item of value) {
      assertJsonValue(item);
    }
    return;
  }
  if (isPlainObject(value)) {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        invalid();
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        invalid();
      if (SENTINEL_TABLE_NAMES.has(key)) invalid();
      assertJsonValue(value[key]);
    }
    return;
  }
  invalid();
}
function canonicalString(value: JsonValue): string {
  assertJsonValue(value);
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (Object.is(value, -0)) return "0";
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalString(item)).join(",")}]`;
  }
  const record = value as Readonly<{ readonly [key: string]: JsonValue }>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalString(record[key])}`).join(",")}}`;
}
export function canonicalizeTask551Rfc8785(value: JsonValue): Uint8Array {
  return new TextEncoder().encode(canonicalString(value));
}
export function requireTask551LowercaseSha256(value: string): Task551LowercaseSha256 {
  if (!/^[0-9a-f]{64}$/u.test(value) || /^0{64}$/u.test(value)) {
    invalid();
  }
  return value;
}
export function digestTask551CanonicalBytes(
  bytes: Uint8Array,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  if (!(bytes instanceof Uint8Array) || typeof sha256Bytes !== "function") {
    invalid();
  }
  let digest: string;
  try {
    digest = sha256Bytes(bytes);
  } catch {
    invalid();
  }
  return requireTask551LowercaseSha256(digest);
}
function cloneJson(value: unknown): JsonValue {
  assertJsonValue(value);
  return value;
}
function assertStringArray(value: unknown, unique = false): readonly string[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    invalid();
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== value.length + 1 ||
    ownKeys.some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/u.test(key)))
  )
    invalid();
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  const result = value.map(assertString);
  if (result.some((item) => item.length === 0)) invalid();
  if (unique && new Set(result).size !== result.length) {
    invalid();
  }
  return result;
}
function assertScenario(value: unknown): Task551DigestScenario {
  if (!isPlainObject(value)) invalid();
  const keys = [
    "id",
    "kind",
    "targetStatementOrFamily",
    "minimumClosure",
    "supportTables",
    "expectedTableCounts",
    "ownedKeyPredicate",
    "equalityParticipation",
  ];
  const hasShapeId = Object.prototype.hasOwnProperty.call(value, "statementShapeId");
  const record = assertOwnKeys(value, hasShapeId ? [...keys, "statementShapeId"] : keys);
  const id = assertString(record.id);
  if (id.length === 0) invalid();
  const kind = assertString(record.kind);
  const equalityParticipation = assertString(record.equalityParticipation);
  if (
    (kind !== "admin-shape" && kind !== "supplemental" && kind !== "task489-predecessor") ||
    (equalityParticipation !== "admin-32" &&
      equalityParticipation !== "supplemental" &&
      equalityParticipation !== "deferred")
  ) {
    invalid();
  }
  const minimumClosure = assertStringArray(record.minimumClosure, true);
  const supportTables = assertStringArray(record.supportTables, true);
  for (const table of [...minimumClosure, ...supportTables]) {
    if (SENTINEL_TABLE_NAMES.has(table)) invalid();
  }
  const expectedTableCounts = cloneJson(record.expectedTableCounts);
  const ownedKeyPredicate = cloneJson(record.ownedKeyPredicate);
  const predicate = assertOwnKeys(ownedKeyPredicate, [
    "kind",
    "scope",
    "profile",
    "scenario",
    "ordinal",
  ]);
  if (
    predicate.kind !== "uuid-v5" ||
    predicate.scope !== "validated-run-scope" ||
    predicate.profile !== "selected-profile" ||
    predicate.scenario !== id ||
    predicate.ordinal !== "family-ordinal"
  )
    invalid();
  const targetStatementOrFamily = assertString(record.targetStatementOrFamily);
  if (targetStatementOrFamily.length === 0) invalid();
  if (hasShapeId && assertString(record.statementShapeId) !== id) {
    invalid();
  }
  if (kind === "admin-shape" && !hasShapeId) invalid();
  if (kind !== "admin-shape" && hasShapeId) invalid();
  if (kind === "admin-shape" && equalityParticipation !== "admin-32") invalid();
  if (kind === "supplemental" && equalityParticipation !== "supplemental") invalid();
  if (kind === "task489-predecessor") {
    if (
      id !== "task489-predecessor" ||
      targetStatementOrFamily !== "solution_kit_install_runs_normalized" ||
      JSON.stringify(minimumClosure) !== JSON.stringify(["solution_kit_install_runs"]) ||
      JSON.stringify(supportTables) !== JSON.stringify(["solution_kit_install_items"]) ||
      canonicalString(expectedTableCounts) !==
        canonicalString({
          bulkHistoryRuns: { small: 10000, large: 1000000 },
          boundedSupportRuns: 109890,
        }) ||
      equalityParticipation !== "deferred"
    )
      invalid();
  }
  return {
    id,
    kind,
    targetStatementOrFamily,
    minimumClosure,
    supportTables,
    expectedTableCounts,
    ownedKeyPredicate,
    equalityParticipation,
    ...(hasShapeId ? { statementShapeId: id } : {}),
  };
}
function normalizeScenarioArray(value: unknown): readonly Task551DigestScenario[] {
  if (!Array.isArray(value)) invalid();
  const scenarios = value.map(assertScenario);
  if (new Set(scenarios.map((scenario) => scenario.id)).size !== scenarios.length) invalid();
  return scenarios;
}
function normalizeCatalogTable(
  value: unknown
): Task551SanitizedCatalogProjectionV1["tables"][number] {
  if (!isPlainObject(value)) invalid();
  const record = assertOwnKeys(value, ["schema", "name", "columns", "constraints", "indexes"]);
  if (assertString(record.schema) !== "public") invalid();
  const name = assertString(record.name);
  if (SENTINEL_TABLE_NAMES.has(name)) invalid();
  if (
    !Array.isArray(record.columns) ||
    !Array.isArray(record.constraints) ||
    !Array.isArray(record.indexes)
  )
    invalid();
  const columnNames = new Set<string>();
  const columns = record.columns.map((column) => {
    if (!isPlainObject(column)) invalid();
    const item = assertOwnKeys(column, ["name", "postgresType", "nullable"]);
    const columnName = assertString(item.name);
    if (columnNames.has(columnName)) invalid();
    columnNames.add(columnName);
    return {
      name: columnName,
      postgresType: assertString(item.postgresType),
      nullable: typeof item.nullable === "boolean" ? item.nullable : invalid(),
    };
  });
  const constraintNames = new Set<string>();
  const constraints = record.constraints.map((constraint) => {
    if (!isPlainObject(constraint)) invalid();
    const item = assertOwnKeys(constraint, [
      "name",
      "kind",
      "columns",
      "referencedTable",
      "referencedColumns",
    ]);
    const constraintName = assertString(item.name);
    const kind = assertTask551ConstraintKind(item.kind);
    if (constraintNames.has(constraintName)) invalid();
    constraintNames.add(constraintName);
    if (kind !== "primary-key" && kind !== "foreign-key" && kind !== "unique" && kind !== "check")
      invalid();
    const constraintColumns = assertStringArray(item.columns);
    const referencedTable =
      item.referencedTable === null ? null : assertString(item.referencedTable);
    const referencedColumns = assertStringArray(item.referencedColumns);
    if (kind !== "foreign-key" && (referencedTable !== null || referencedColumns.length !== 0))
      invalid();
    if (referencedTable !== null && SENTINEL_TABLE_NAMES.has(referencedTable)) invalid();
    return {
      name: constraintName,
      kind,
      columns: constraintColumns,
      referencedTable,
      referencedColumns,
    };
  });
  const indexNames = new Set<string>();
  const indexes = record.indexes.map((index) => {
    if (!isPlainObject(index)) invalid();
    const item = assertOwnKeys(index, ["name", "unique", "method", "columns"]);
    const indexName = assertString(item.name);
    if (indexNames.has(indexName)) invalid();
    indexNames.add(indexName);
    if (typeof item.unique !== "boolean") invalid();
    const indexColumns = item.columns;
    if (!Array.isArray(indexColumns)) invalid();
    const normalizedColumns = indexColumns.map((column) => {
      if (!isPlainObject(column)) invalid();
      const columnItem = assertOwnKeys(column, ["name", "direction"]);
      const direction = assertTask551IndexDirection(columnItem.direction);
      return { name: assertString(columnItem.name), direction };
    });
    return {
      name: indexName,
      unique: item.unique,
      method: assertString(item.method),
      columns: normalizedColumns,
    };
  });
  columns.sort((left, right) => left.name.localeCompare(right.name));
  constraints.sort(
    (left, right) => left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name)
  );
  indexes.sort((left, right) => left.name.localeCompare(right.name));
  return { schema: "public", name, columns, constraints, indexes };
}
export function normalizeTask551SanitizedCatalogProjection(
  value: Task551SanitizedCatalogProjectionV1
): Task551SanitizedCatalogProjectionV1 {
  if (!isPlainObject(value)) invalid();
  const record = assertOwnKeys(value, ["version", "tables"]);
  if (
    assertString(record.version) !== "task551-sanitized-catalog@v1" ||
    !Array.isArray(record.tables)
  )
    invalid();
  const tables = record.tables.map(normalizeCatalogTable);
  if (new Set(tables.map((table) => table.name)).size !== tables.length) invalid();
  tables.sort(
    (left, right) => left.schema.localeCompare(right.schema) || left.name.localeCompare(right.name)
  );
  return { version: "task551-sanitized-catalog@v1", tables };
}
export const TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION =
  normalizeTask551SanitizedCatalogProjection(TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION_LITERAL);
export function assertExactTask551RequiredCatalogProjection(
  value: Task551SanitizedCatalogProjectionV1
): void {
  const normalized = normalizeTask551SanitizedCatalogProjection(value);
  const expected = canonicalizeTask551Rfc8785(TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION);
  const actual = canonicalizeTask551Rfc8785(normalized);
  if (new TextDecoder().decode(actual) !== new TextDecoder().decode(expected)) invalid();
}
export function resolveTask551ExecutableScenarioSelector(
  selector: Task551CanonicalSelector,
  scenarios: readonly Task551DigestScenario[]
): readonly Task551DigestScenario[] {
  if (!isPlainObject(selector)) invalid();
  const selectorRecord =
    "id" in selector ? assertOwnKeys(selector, ["kind", "id"]) : assertOwnKeys(selector, ["kind"]);
  const normalizedScenarios = normalizeScenarioArray(scenarios);
  const kind = assertString(selectorRecord.kind);
  const executable = normalizedScenarios.filter(
    (scenario) => scenario.kind === "admin-shape" || scenario.kind === "supplemental"
  );
  if (kind === "all") {
    if (Object.prototype.hasOwnProperty.call(selectorRecord, "id")) invalid();
    return executable;
  }
  if (kind !== "scenario") invalid();
  const id = assertString(selectorRecord.id);
  const scenario = normalizedScenarios.find((candidate) => candidate.id === id);
  if (scenario === undefined || scenario.kind === "task489-predecessor") invalid();
  return [scenario];
}
export function buildTask551ContractDigestInput(
  input: Task551ContractDigestSource
): Task551ContractDigestInput {
  if (!isPlainObject(input)) invalid();
  const record = assertOwnKeys(input, ["plannedIds", "shapes", "measurement"]);
  const plannedIds = assertStringArray(record.plannedIds, true);
  if (
    plannedIds.length !== ADMIN_STATEMENT_IDS.length ||
    plannedIds.some((id, index) => id !== ADMIN_STATEMENT_IDS[index])
  )
    invalid();
  const shapes = cloneJson(record.shapes);
  const measurement = cloneJson(record.measurement);
  return {
    version: TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION,
    plannedIds,
    shapes,
    measurement,
  };
}
export function buildTask551FixtureDigestInput(
  input: Task551FixtureDigestSource
): Task551FixtureDigestInput {
  if (!isPlainObject(input)) invalid();
  const record = assertOwnKeys(input, [
    "manifestVersion",
    "scenarios",
    "scaleCounts",
    "distributions",
  ]);
  const manifestVersion = assertString(record.manifestVersion);
  const scenarios = normalizeScenarioArray(record.scenarios);
  const scaleCounts = cloneJson(record.scaleCounts);
  const distributions = cloneJson(record.distributions);
  return {
    version: TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION,
    manifestVersion,
    scenarios,
    scaleCounts,
    distributions,
  };
}
function digestJson(
  value: JsonValue,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  return digestTask551CanonicalBytes(canonicalizeTask551Rfc8785(value), sha256Bytes);
}
export function computeTask551ContractDigest(
  input: Task551ContractDigestInput,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  const checked = buildTask551ContractDigestInput({
    plannedIds: input.plannedIds,
    shapes: input.shapes,
    measurement: input.measurement,
  });
  return digestJson(checked, sha256Bytes);
}
export function computeTask551FixtureDigest(
  input: Task551FixtureDigestInput,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  const checked = buildTask551FixtureDigestInput({
    manifestVersion: input.manifestVersion,
    scenarios: input.scenarios,
    scaleCounts: input.scaleCounts,
    distributions: input.distributions,
  });
  return digestJson(checked, sha256Bytes);
}
export function computeTask551SchemaDigest(
  projection: Task551SanitizedCatalogProjectionV1,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  const normalized = normalizeTask551SanitizedCatalogProjection(projection);
  return digestJson(normalized, sha256Bytes);
}
export function computeTask551RunnerDigest(
  sourceHashes: Readonly<Record<string, Task551LowercaseSha256>>,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  if (!isPlainObject(sourceHashes)) invalid();
  const record = assertOwnKeys(sourceHashes, TASK551_RUNNER_DIGEST_SOURCE_PATHS);
  const checked: Record<string, string> = {};
  for (const path of TASK551_RUNNER_DIGEST_SOURCE_PATHS) {
    checked[path] = requireTask551LowercaseSha256(assertString(record[path]));
  }
  return digestJson(
    { version: TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION, sourceHashes: checked },
    sha256Bytes
  );
}
export function computeTask551ManifestScenarioResultDigest(
  input: Readonly<{
    profile: Task551ScaleProfile;
    selector: Task551CanonicalSelector;
    scenarios: readonly Task551DigestScenario[];
  }>,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  if (!isPlainObject(input)) invalid();
  const record = assertOwnKeys(input, ["profile", "selector", "scenarios"]);
  const profile = assertString(record.profile);
  if (profile !== "small" && profile !== "large") invalid();
  const scenarios = normalizeScenarioArray(record.scenarios);
  const selected = resolveTask551ExecutableScenarioSelector(
    record.selector as Task551CanonicalSelector,
    scenarios
  );
  const entries = selected.map((scenario) => ({
    id: scenario.id,
    entry: scenario,
    preflight: "preflight-complete",
    cleanup: "cleanup-zero-residue",
  }));
  return digestJson(
    {
      version: TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION,
      profile,
      selector: record.selector as JsonValue,
      scenarios: entries,
    },
    sha256Bytes
  );
}
export {
  computeTask551ReviewableReceiptDigest,
  requireExactTask551L02ActiveStateTransitionReceiptV2,
  requireExactTask551L02ReviewedStateAttestationV2,
  TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2,
  TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2,
  TASK551_L02_REVIEWED_STATE_ATTESTATION_SCHEMA_V2,
  buildTask551ReviewedCandidateTransitionInput,
  assertExactTask551ReviewedCandidateTransitionInput,
  assertExactTask551ReviewedCandidateTransition,
  buildExactTask551ReviewedResultByChangingOnlyReviewState,
  parseTask551StrictJson,
  parseCanonicalTask551BaselineCheckStdout,
} from "./receiptContract";
export type {
  Task551L02ActiveStateTransitionReceiptV2,
  Task551L02ReviewedStateAttestationV2,
} from "./receiptContract";

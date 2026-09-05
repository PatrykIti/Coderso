/**
 * Closed, DB-free contracts for the TASK-551 query-inventory tooling.
 *
 * This module intentionally has no filesystem, environment, or production
 * runtime dependency. Errors expose a stable code and a fixed field role only.
 */

export const INVENTORY_ERROR_CODES = [
  "query_inventory_invalid",
  "query_inventory_unowned",
  "query_inventory_writer_conflict",
  "query_inventory_cli_invalid",
  "query_inventory_scan_invalid",
  "query_inventory_phase_invalid",
  "query_inventory_planned_delta_unresolved",
  "query_inventory_final_receipt_missing",
] as const;

export type InventoryErrorCode = (typeof INVENTORY_ERROR_CODES)[number];
export type InventoryPhase = "initial" | "final";
export type CallerFamily =
  | "drizzle-executor"
  | "postgres-client"
  | "session-client"
  | "tagged-raw-sql"
  | "transaction-executor"
  | "dynamic-db-import"
  | "client-construction";
export type CallerOperation =
  | "select"
  | "query"
  | "execute"
  | "insert"
  | "update"
  | "delete"
  | "transaction"
  | "batch"
  | "tag"
  | "import"
  | "postgres"
  | "drizzle";
export type QueryKind =
  "point" | "list" | "search" | "aggregate" | "mutation" | "append" | "maintenance";
export type StatementRole = "page" | "fixed-summary" | "facet" | "fixed-list" | "not-applicable";
export type ProjectionSensitivity =
  "narrow" | "summary" | "aggregate" | "wide-reviewed" | "mutation-only" | "external-unreviewed";
export type FilterShape =
  "none" | "exact-key" | "bounded-filter" | "keyset" | "external-unreviewed";
export type JoinShape = "none" | "bounded" | "external-unreviewed";
export type OrderShape = "not-applicable" | "stable" | "external-unreviewed";
export type Bound = number | "stream" | "missing";
export type QueryCountBudget = number | "external-unreviewed";
export type CacheEligibility = "eligible" | "ineligible" | "external-unreviewed";
export type FreshnessPolicy =
  "request" | "ttl" | "event-invalidated" | "not-applicable" | "external-unreviewed";
export type TransactionMode = "none" | "transaction" | "session-client" | "external-unreviewed";
export type ConstraintOwner =
  `TASK-551-${string}` | `TASK-${number}` | "database-existing" | "none" | "external-unreviewed";
export type OwnerLeaf = `TASK-551-${string}` | `TASK-${number}`;
export type Disposition = "optimize" | "preserve-bounded" | "external-handoff";

export type QueryInventorySource = Readonly<{
  file: string;
  symbol: string;
  line: number | null;
  column: number | null;
}>;

export type QueryInventoryCaller = Readonly<{ family: CallerFamily; operation: CallerOperation }>;

export type QueryInventoryRecord = Readonly<{
  schemaVersion: 1;
  recordState: "current" | "planned";
  id: string;
  source: QueryInventorySource;
  caller: QueryInventoryCaller;
  kind: QueryKind;
  statementRole: StatementRole;
  projectionSensitivity: ProjectionSensitivity;
  filterShape: FilterShape;
  joinShape: JoinShape;
  orderShape: OrderShape;
  bound: Bound;
  queryCountBudget: QueryCountBudget;
  cacheEligibility: CacheEligibility;
  freshnessPolicy: FreshnessPolicy;
  transactionMode: TransactionMode;
  constraintOwner: ConstraintOwner;
  budgetId: string;
  plannedShapeId: string | null;
  telemetryFingerprintKey: string | null;
  owner: OwnerLeaf;
  disposition: Disposition;
}>;

export type DiscoveredCaller = Readonly<{
  id: string;
  source: QueryInventorySource & Readonly<{ line: number; column: number }>;
  caller: QueryInventoryCaller;
}>;

export type QueryInventoryReceipt = Readonly<{
  schemaVersion: 1;
  phase: InventoryPhase;
  sourceTreeDigest: string;
  inventoryDigest: string;
  plannedDeltaDigest: string;
  fingerprintAssociationDigest: string;
  discoveredCount: number;
  ownedCount: number;
  plannedDeltaCount: number;
  adminReadPlannedCount: number;
  legacyPlannedCount: number;
  validatedAt: `reviewed-fixture-v${number}`;
}>;

export type PlannedCounts = Readonly<{ total: number; adminRead: number; legacy: number }>;
export type Task551FingerprintAssociationMap = Readonly<Record<string, string>>;

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;

  constructor(code: InventoryErrorCode, role: string) {
    super(`${code}:${role}`);
    this.code = code;
    this.name = "InventoryError";
  }
}

export function fail(code: InventoryErrorCode, role: string): never {
  throw new InventoryError(code, role);
}

const FAMILIES = new Set<CallerFamily>([
  "drizzle-executor",
  "postgres-client",
  "session-client",
  "tagged-raw-sql",
  "transaction-executor",
  "dynamic-db-import",
  "client-construction",
]);
const OPERATIONS = new Set<CallerOperation>([
  "select",
  "query",
  "execute",
  "insert",
  "update",
  "delete",
  "transaction",
  "batch",
  "tag",
  "import",
  "postgres",
  "drizzle",
]);
const KINDS = new Set<QueryKind>([
  "point",
  "list",
  "search",
  "aggregate",
  "mutation",
  "append",
  "maintenance",
]);
const STATEMENT_ROLES = new Set<StatementRole>([
  "page",
  "fixed-summary",
  "facet",
  "fixed-list",
  "not-applicable",
]);
const PROJECTIONS = new Set<ProjectionSensitivity>([
  "narrow",
  "summary",
  "aggregate",
  "wide-reviewed",
  "mutation-only",
  "external-unreviewed",
]);
const FILTERS = new Set<FilterShape>([
  "none",
  "exact-key",
  "bounded-filter",
  "keyset",
  "external-unreviewed",
]);
const JOINS = new Set<JoinShape>(["none", "bounded", "external-unreviewed"]);
const ORDERS = new Set<OrderShape>(["not-applicable", "stable", "external-unreviewed"]);
const CACHES = new Set<CacheEligibility>(["eligible", "ineligible", "external-unreviewed"]);
const FRESHNESS = new Set<FreshnessPolicy>([
  "request",
  "ttl",
  "event-invalidated",
  "not-applicable",
  "external-unreviewed",
]);
const TRANSACTIONS = new Set<TransactionMode>([
  "none",
  "transaction",
  "session-client",
  "external-unreviewed",
]);
const DISPOSITIONS = new Set<Disposition>(["optimize", "preserve-bounded", "external-handoff"]);
const RECORD_KEYS = [
  "schemaVersion",
  "recordState",
  "id",
  "source",
  "caller",
  "kind",
  "statementRole",
  "projectionSensitivity",
  "filterShape",
  "joinShape",
  "orderShape",
  "bound",
  "queryCountBudget",
  "cacheEligibility",
  "freshnessPolicy",
  "transactionMode",
  "constraintOwner",
  "budgetId",
  "plannedShapeId",
  "telemetryFingerprintKey",
  "owner",
  "disposition",
] as const;
const RECEIPT_KEYS = [
  "schemaVersion",
  "phase",
  "sourceTreeDigest",
  "inventoryDigest",
  "plannedDeltaDigest",
  "fingerprintAssociationDigest",
  "discoveredCount",
  "ownedCount",
  "plannedDeltaCount",
  "adminReadPlannedCount",
  "legacyPlannedCount",
  "validatedAt",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  code: InventoryErrorCode,
  role: string
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    fail(code, role);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasCanonicalSegments(value: string, segmentPattern: RegExp): boolean {
  const segments = value.split("/");
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment.length > 0 && segment !== "." && segment !== ".." && segmentPattern.test(segment)
    )
  );
}

/** A relative production source path with no empty, dot, or traversal segment. */
export function isCanonicalCoreSourceFile(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("core/")) return false;
  const segments = value.split("/");
  const file = segments.at(-1);
  return (
    segments[0] === "core" &&
    segments.length > 1 &&
    file !== undefined &&
    /\.(?:ts|tsx|mts|cts)$/.test(file) &&
    hasCanonicalSegments(value, /^[A-Za-z0-9_.@+-]+$/)
  );
}

/** A source symbol is either module scope or a normalized non-empty path. */
export function isCanonicalSourceSymbol(value: unknown): value is string {
  if (value === "<module>") return true;
  return typeof value === "string" && hasCanonicalSegments(value, /^[A-Za-z_$][A-Za-z0-9_$.-]*$/);
}

function isOwner(value: unknown): value is OwnerLeaf {
  return (
    typeof value === "string" &&
    (/^TASK-551-[A-Za-z0-9-]+$/.test(value) || /^TASK-[0-9]+$/.test(value))
  );
}

function isConstraintOwner(value: unknown): value is ConstraintOwner {
  return (
    value === "database-existing" ||
    value === "none" ||
    value === "external-unreviewed" ||
    isOwner(value)
  );
}

export const CALLER_FAMILY_OPERATION_PAIRS = {
  "drizzle-executor": [
    "select",
    "query",
    "execute",
    "insert",
    "update",
    "delete",
    "transaction",
    "batch",
  ],
  "postgres-client": ["query", "execute", "tag", "postgres"],
  "session-client": [
    "select",
    "query",
    "execute",
    "insert",
    "update",
    "delete",
    "transaction",
    "batch",
    "tag",
  ],
  "tagged-raw-sql": ["tag"],
  "transaction-executor": [
    "select",
    "query",
    "execute",
    "insert",
    "update",
    "delete",
    "transaction",
    "batch",
    "tag",
  ],
  "dynamic-db-import": ["import"],
  "client-construction": ["postgres", "drizzle"],
} as const satisfies Readonly<Record<CallerFamily, readonly CallerOperation[]>>;

function assertCallerCombination(caller: QueryInventoryCaller): void {
  const allowed = CALLER_FAMILY_OPERATION_PAIRS[caller.family] as readonly CallerOperation[];
  if (!allowed.includes(caller.operation)) fail("query_inventory_invalid", "caller");
}

export function canonicalRecordId(
  source: QueryInventorySource & Readonly<{ line: number; column: number }>,
  caller: QueryInventoryCaller
): string {
  return `${source.file}#${source.symbol}:L${source.line}:C${source.column}:${caller.family}:${caller.operation}`;
}

export function validateInventoryRecord(value: unknown): QueryInventoryRecord {
  if (!isPlainRecord(value)) fail("query_inventory_invalid", "record");
  assertExactKeys(value, RECORD_KEYS, "query_inventory_invalid", "record");
  if (
    value.schemaVersion !== 1 ||
    (value.recordState !== "current" && value.recordState !== "planned")
  )
    fail("query_inventory_invalid", "record-state");
  if (typeof value.id !== "string" || value.id.length === 0 || value.id.length > 300)
    fail("query_inventory_invalid", "record-id");
  if (!isPlainRecord(value.source)) fail("query_inventory_invalid", "source");
  assertExactKeys(
    value.source,
    ["file", "symbol", "line", "column"],
    "query_inventory_invalid",
    "source"
  );
  const source = value.source as QueryInventorySource;
  if (!isCanonicalCoreSourceFile(source.file)) {
    fail("query_inventory_invalid", "source-file");
  }
  if (!isCanonicalSourceSymbol(source.symbol)) fail("query_inventory_invalid", "source-symbol");
  if (!isPlainRecord(value.caller)) fail("query_inventory_invalid", "caller");
  assertExactKeys(value.caller, ["family", "operation"], "query_inventory_invalid", "caller");
  const caller = value.caller as QueryInventoryCaller;
  if (!FAMILIES.has(caller.family) || !OPERATIONS.has(caller.operation))
    fail("query_inventory_invalid", "caller");
  assertCallerCombination(caller);
  if (
    !KINDS.has(value.kind as QueryKind) ||
    !STATEMENT_ROLES.has(value.statementRole as StatementRole) ||
    !PROJECTIONS.has(value.projectionSensitivity as ProjectionSensitivity)
  ) {
    fail("query_inventory_invalid", "record-classification");
  }
  if (
    !FILTERS.has(value.filterShape as FilterShape) ||
    !JOINS.has(value.joinShape as JoinShape) ||
    !ORDERS.has(value.orderShape as OrderShape)
  )
    fail("query_inventory_invalid", "record-shape");
  if (
    !CACHES.has(value.cacheEligibility as CacheEligibility) ||
    !FRESHNESS.has(value.freshnessPolicy as FreshnessPolicy) ||
    !TRANSACTIONS.has(value.transactionMode as TransactionMode)
  ) {
    fail("query_inventory_invalid", "record-policy");
  }
  if (
    !isConstraintOwner(value.constraintOwner) ||
    !isOwner(value.owner) ||
    !DISPOSITIONS.has(value.disposition as Disposition)
  )
    fail("query_inventory_unowned", "record-owner");
  if (typeof value.budgetId !== "string" || !/^[a-z0-9][a-z0-9-]{1,159}$/.test(value.budgetId))
    fail("query_inventory_invalid", "budget-id");
  if (
    value.plannedShapeId !== null &&
    (typeof value.plannedShapeId !== "string" ||
      !/^[a-z0-9][a-z0-9-]{1,159}$/.test(value.plannedShapeId))
  ) {
    fail("query_inventory_invalid", "planned-shape-id");
  }
  if (
    value.telemetryFingerprintKey !== null &&
    (typeof value.telemetryFingerprintKey !== "string" ||
      !/^[a-z][a-z0-9_]{2,159}$/.test(value.telemetryFingerprintKey))
  ) {
    fail("query_inventory_invalid", "fingerprint-key");
  }
  if (value.recordState === "current") {
    if (
      !isPositiveInteger(source.line) ||
      !isPositiveInteger(source.column) ||
      value.id !== canonicalRecordId(source as DiscoveredCaller["source"], caller)
    ) {
      fail("query_inventory_invalid", "current-anchor");
    }
  } else {
    if (
      source.line !== null ||
      source.column !== null ||
      !/^[a-z0-9][a-z0-9-]{1,159}$/.test(value.id)
    )
      fail("query_inventory_invalid", "planned-anchor");
  }
  if (value.bound !== "stream" && !isPositiveInteger(value.bound))
    fail("query_inventory_invalid", "record-bound");
  const external = value.disposition === "external-handoff";
  if (external) {
    if (
      value.projectionSensitivity !== "external-unreviewed" ||
      value.filterShape !== "external-unreviewed" ||
      value.joinShape !== "external-unreviewed" ||
      value.orderShape !== "external-unreviewed" ||
      value.queryCountBudget !== "external-unreviewed" ||
      value.cacheEligibility !== "external-unreviewed" ||
      value.freshnessPolicy !== "external-unreviewed" ||
      value.transactionMode !== "external-unreviewed" ||
      value.constraintOwner !== "external-unreviewed" ||
      value.telemetryFingerprintKey !== null
    ) {
      fail("query_inventory_invalid", "external-record");
    }
  } else {
    if (
      !isPositiveInteger(value.queryCountBudget) ||
      value.projectionSensitivity === "external-unreviewed" ||
      value.filterShape === "external-unreviewed" ||
      value.joinShape === "external-unreviewed" ||
      value.orderShape === "external-unreviewed" ||
      value.cacheEligibility === "external-unreviewed" ||
      value.freshnessPolicy === "external-unreviewed" ||
      value.transactionMode === "external-unreviewed" ||
      value.constraintOwner === "external-unreviewed" ||
      value.telemetryFingerprintKey === null
    ) {
      fail("query_inventory_invalid", "reviewed-record");
    }
    if (
      (value.cacheEligibility === "eligible") !==
      (["request", "ttl", "event-invalidated"] as const).includes(
        value.freshnessPolicy as "request" | "ttl" | "event-invalidated"
      )
    )
      fail("query_inventory_invalid", "cache-freshness");
    if ((value.cacheEligibility === "ineligible") !== (value.freshnessPolicy === "not-applicable"))
      fail("query_inventory_invalid", "cache-freshness");
    const hasNoTransaction = value.transactionMode === "none";
    const hasNoConstraintOwner = value.constraintOwner === "none";
    if (hasNoTransaction !== hasNoConstraintOwner) {
      fail("query_inventory_invalid", "transaction-owner");
    }
    if (
      !hasNoTransaction &&
      value.constraintOwner !== "database-existing" &&
      !isOwner(value.constraintOwner)
    ) {
      fail("query_inventory_invalid", "transaction-owner");
    }
  }
  return Object.freeze({
    ...value,
    source: Object.freeze({ ...source }),
    caller: Object.freeze({ ...caller }),
  }) as QueryInventoryRecord;
}

export function validateDiscoveredCaller(value: unknown): DiscoveredCaller {
  if (!isPlainRecord(value)) fail("query_inventory_scan_invalid", "discovery");
  assertExactKeys(value, ["id", "source", "caller"], "query_inventory_scan_invalid", "discovery");
  const synthetic = validateInventoryRecord({
    schemaVersion: 1,
    recordState: "current",
    id: value.id,
    source: value.source,
    caller: value.caller,
    kind: "point",
    statementRole: "not-applicable",
    projectionSensitivity: "narrow",
    filterShape: "none",
    joinShape: "none",
    orderShape: "not-applicable",
    bound: 1,
    queryCountBudget: 1,
    cacheEligibility: "ineligible",
    freshnessPolicy: "not-applicable",
    transactionMode: "none",
    constraintOwner: "none",
    budgetId: "synthetic-discovery",
    plannedShapeId: null,
    telemetryFingerprintKey: "synthetic_discovery",
    owner: "TASK-551-01-L01",
    disposition: "optimize",
  });
  return Object.freeze({
    id: synthetic.id,
    source: synthetic.source as DiscoveredCaller["source"],
    caller: synthetic.caller,
  });
}

export function validateReceipt(value: unknown): QueryInventoryReceipt {
  if (!isPlainRecord(value)) fail("query_inventory_invalid", "receipt");
  assertExactKeys(value, RECEIPT_KEYS, "query_inventory_invalid", "receipt");
  if (value.schemaVersion !== 1 || (value.phase !== "initial" && value.phase !== "final"))
    fail("query_inventory_phase_invalid", "receipt-phase");
  for (const field of [
    "sourceTreeDigest",
    "inventoryDigest",
    "plannedDeltaDigest",
    "fingerprintAssociationDigest",
  ] as const) {
    if (typeof value[field] !== "string" || !/^[0-9a-f]{64}$/.test(value[field]))
      fail("query_inventory_invalid", "receipt-digest");
  }
  for (const field of [
    "discoveredCount",
    "ownedCount",
    "plannedDeltaCount",
    "adminReadPlannedCount",
    "legacyPlannedCount",
  ] as const) {
    if (typeof value[field] !== "number" || !Number.isSafeInteger(value[field]) || value[field] < 0)
      fail("query_inventory_invalid", "receipt-count");
  }
  if (
    typeof value.validatedAt !== "string" ||
    !/^reviewed-fixture-v[1-9][0-9]*$/.test(value.validatedAt)
  )
    fail("query_inventory_invalid", "receipt-marker");
  return Object.freeze({ ...value }) as QueryInventoryReceipt;
}

export function validateFingerprintAssociations(value: unknown): Task551FingerprintAssociationMap {
  if (!isPlainRecord(value)) fail("query_inventory_invalid", "fingerprint-associations");
  for (const [id, key] of Object.entries(value)) {
    if (
      !/^[A-Za-z0-9_$./#:<>{}-]+$/.test(id) ||
      typeof key !== "string" ||
      !/^[a-z][a-z0-9_]{2,159}$/.test(key)
    ) {
      fail("query_inventory_invalid", "fingerprint-associations");
    }
  }
  return Object.freeze({ ...value }) as Task551FingerprintAssociationMap;
}

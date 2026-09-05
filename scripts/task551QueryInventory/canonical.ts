/** Deterministic canonicalization, digests, and closed-set assertions. */
import { createHash } from "node:crypto";

import {
  type DiscoveredCaller,
  type InventoryPhase,
  type PlannedCounts,
  type QueryInventoryReceipt,
  type QueryInventoryRecord,
  type Task551FingerprintAssociationMap,
  fail,
  validateDiscoveredCaller,
  validateFingerprintAssociations,
  validateInventoryRecord,
  validateReceipt,
} from "./contracts";

export type Task551AdminReadPlannedRecordProjection = Readonly<{
  id: string;
  plannedShapeId: string;
  source: QueryInventoryRecord["source"];
  caller: QueryInventoryRecord["caller"];
  kind: QueryInventoryRecord["kind"];
  statementRole: QueryInventoryRecord["statementRole"];
  projectionSensitivity: QueryInventoryRecord["projectionSensitivity"];
  filterShape: QueryInventoryRecord["filterShape"];
  joinShape: QueryInventoryRecord["joinShape"];
  orderShape: QueryInventoryRecord["orderShape"];
  bound: QueryInventoryRecord["bound"];
  queryCountBudget: QueryInventoryRecord["queryCountBudget"];
  cacheEligibility: QueryInventoryRecord["cacheEligibility"];
  freshnessPolicy: QueryInventoryRecord["freshnessPolicy"];
  transactionMode: QueryInventoryRecord["transactionMode"];
  constraintOwner: QueryInventoryRecord["constraintOwner"];
  budgetId: string;
  telemetryFingerprintKey: string;
  owner: QueryInventoryRecord["owner"];
  disposition: QueryInventoryRecord["disposition"];
}>;

export type QueryInventoryDigests = Readonly<{
  sourceTreeDigest: string;
  inventoryDigest: string;
  plannedDeltaDigest: string;
  fingerprintAssociationDigest: string;
}>;

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  )
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  fail("query_inventory_invalid", "canonical-value");
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function canonicalizeDiscoveredCallers(
  callers: readonly unknown[]
): readonly DiscoveredCaller[] {
  const canonical = callers
    .map(validateDiscoveredCaller)
    .sort((left, right) => left.id.localeCompare(right.id));
  const seenIds = new Set<string>();
  const seenAnchors = new Set<string>();
  for (const caller of canonical) {
    const anchor = `${caller.source.file}#${caller.source.symbol}:L${caller.source.line}:C${caller.source.column}`;
    if (seenIds.has(caller.id) || seenAnchors.has(anchor))
      fail("query_inventory_writer_conflict", "discovery-anchor");
    seenIds.add(caller.id);
    seenAnchors.add(anchor);
  }
  return Object.freeze(canonical);
}

export function canonicalizeInventoryRecords(
  records: readonly unknown[]
): readonly QueryInventoryRecord[] {
  const canonical = records
    .map(validateInventoryRecord)
    .sort((left, right) => left.id.localeCompare(right.id));
  const ids = new Set<string>();
  const anchors = new Set<string>();
  for (const record of canonical) {
    const anchor = `${record.source.file}#${record.source.symbol}:L${record.source.line ?? "planned"}:C${record.source.column ?? "planned"}`;
    if (ids.has(record.id) || anchors.has(anchor))
      fail("query_inventory_writer_conflict", "record-anchor");
    ids.add(record.id);
    anchors.add(anchor);
  }
  return Object.freeze(canonical);
}

export function canonicalizeFingerprintAssociations(
  value: unknown
): Task551FingerprintAssociationMap {
  const associations = validateFingerprintAssociations(value);
  return Object.freeze(
    Object.fromEntries(
      Object.entries(associations).sort(([left], [right]) => left.localeCompare(right))
    )
  );
}

export function digestDiscoveredCallers(callers: readonly unknown[]): string {
  return sha256(canonicalizeDiscoveredCallers(callers));
}

export function digestInventoryRecords(records: readonly unknown[]): string {
  return sha256(canonicalizeInventoryRecords(records));
}

export function digestFingerprintAssociations(value: unknown): string {
  return sha256(canonicalizeFingerprintAssociations(value));
}

export function selectedTelemetryRecords(
  records: readonly unknown[]
): readonly QueryInventoryRecord[] {
  return Object.freeze(
    canonicalizeInventoryRecords(records).filter(
      (record) => record.disposition === "optimize" || record.disposition === "preserve-bounded"
    )
  );
}

export function assertExactTelemetrySelectionAndFingerprintNullability(input: {
  records: readonly unknown[];
  associations: unknown;
}): void {
  const records = canonicalizeInventoryRecords(input.records);
  const associations = canonicalizeFingerprintAssociations(input.associations);
  const selected = selectedTelemetryRecords(records);
  const expected: Record<string, string> = {};
  const keys = new Set<string>();
  for (const record of records) {
    const shouldSelect =
      record.disposition === "optimize" || record.disposition === "preserve-bounded";
    if (shouldSelect) {
      if (record.telemetryFingerprintKey === null || keys.has(record.telemetryFingerprintKey))
        fail("query_inventory_writer_conflict", "fingerprint-selection");
      keys.add(record.telemetryFingerprintKey);
      expected[record.id] = record.telemetryFingerprintKey;
    } else if (record.telemetryFingerprintKey !== null) {
      fail("query_inventory_invalid", "external-fingerprint");
    }
  }
  if (
    selected.length !== Object.keys(expected).length ||
    canonicalJson(associations) !== canonicalJson(expected)
  )
    fail("query_inventory_invalid", "fingerprint-associations");
}

/** Initial-only handoff: every selected key has one exact opaque definition. */
export function assertExactPlannedFingerprintRegistry(input: {
  records: readonly unknown[];
  associations: unknown;
  definitions: unknown;
}): void {
  assertExactTelemetrySelectionAndFingerprintNullability({
    records: input.records,
    associations: input.associations,
  });
  const definitions = canonicalizeFingerprintAssociations(input.definitions);
  const expected = Object.freeze(
    Object.fromEntries(
      selectedTelemetryRecords(input.records).map((record) => {
        const key = record.telemetryFingerprintKey;
        if (key === null) fail("query_inventory_invalid", "planned-fingerprint-registry");
        return [key, key];
      })
    )
  );
  if (canonicalJson(definitions) !== canonicalJson(expected))
    fail("query_inventory_invalid", "planned-fingerprint-registry");
}

export function assertExactCurrentCallSiteCoverage(input: {
  discovered: readonly unknown[];
  current: readonly unknown[];
}): void {
  const discovered = canonicalizeDiscoveredCallers(input.discovered);
  const current = canonicalizeInventoryRecords(input.current);
  if (current.some((record) => record.recordState !== "current"))
    fail("query_inventory_invalid", "current-state");
  if (discovered.length !== current.length) fail("query_inventory_unowned", "current-count");
  for (let index = 0; index < discovered.length; index += 1) {
    const caller = discovered[index]!;
    const record = current[index]!;
    if (
      caller.id !== record.id ||
      canonicalJson(caller.source) !== canonicalJson(record.source) ||
      canonicalJson(caller.caller) !== canonicalJson(record.caller)
    ) {
      fail("query_inventory_unowned", "current-coverage");
    }
  }
}

export function assertSingleWriterOwnership(records: readonly unknown[]): void {
  const canonical = canonicalizeInventoryRecords(records);
  const owners = new Set<string>();
  for (const record of canonical) {
    const ownerKey = `${record.id}:${record.owner}`;
    if (owners.has(ownerKey)) fail("query_inventory_writer_conflict", "record-owner");
    owners.add(ownerKey);
  }
}

export function assertExactPlannedSet(records: readonly unknown[], counts: PlannedCounts): void {
  const planned = canonicalizeInventoryRecords(records);
  if (planned.some((record) => record.recordState !== "planned"))
    fail("query_inventory_planned_delta_unresolved", "planned-state");
  const admin = planned.filter((record) => record.owner === "TASK-551-03-L02");
  const legacy = planned.filter((record) => record.owner !== "TASK-551-03-L02");
  if (
    planned.length !== counts.total ||
    admin.length !== counts.adminRead ||
    legacy.length !== counts.legacy
  )
    fail("query_inventory_planned_delta_unresolved", "planned-count");
  const legacyIds = legacy.map((record) => record.id).sort();
  if (
    canonicalJson(legacyIds) !==
    canonicalJson(["cache-outbox-oldest-unprocessed", "public-html-dependencies-128"])
  ) {
    fail("query_inventory_planned_delta_unresolved", "legacy-planned-set");
  }
  for (const record of planned) {
    if (
      !/^TASK-551-0[2-9]-/.test(record.owner) ||
      record.disposition !== "optimize" ||
      record.bound === "missing"
    ) {
      fail("query_inventory_planned_delta_unresolved", "planned-owner");
    }
  }
}

export function buildTask551AdminReadPlannedRecordProjection(
  records: readonly unknown[]
): readonly Task551AdminReadPlannedRecordProjection[] {
  const admin = canonicalizeInventoryRecords(records)
    .filter((record) => record.recordState === "planned" && record.owner === "TASK-551-03-L02")
    .map((record) => {
      if (record.plannedShapeId === null || record.telemetryFingerprintKey === null)
        fail("query_inventory_planned_delta_unresolved", "admin-projection");
      return Object.freeze({
        id: record.id,
        plannedShapeId: record.plannedShapeId,
        source: record.source,
        caller: record.caller,
        kind: record.kind,
        statementRole: record.statementRole,
        projectionSensitivity: record.projectionSensitivity,
        filterShape: record.filterShape,
        joinShape: record.joinShape,
        orderShape: record.orderShape,
        bound: record.bound,
        queryCountBudget: record.queryCountBudget,
        cacheEligibility: record.cacheEligibility,
        freshnessPolicy: record.freshnessPolicy,
        transactionMode: record.transactionMode,
        constraintOwner: record.constraintOwner,
        budgetId: record.budgetId,
        telemetryFingerprintKey: record.telemetryFingerprintKey,
        owner: record.owner,
        disposition: record.disposition,
      });
    });
  if (admin.length !== 32)
    fail("query_inventory_planned_delta_unresolved", "admin-projection-count");
  return Object.freeze(admin);
}

export function assertExactAdminPlannedRecordProjection(input: {
  planned: readonly unknown[];
  projection: readonly unknown[];
}): void {
  const expected = buildTask551AdminReadPlannedRecordProjection(input.planned);
  const actual = input.projection;
  if (!Array.isArray(actual) || canonicalJson(actual) !== canonicalJson(expected))
    fail("query_inventory_planned_delta_unresolved", "admin-projection");
}

export function assertExactAdminPlannedRecordSemantics(records: readonly unknown[]): void {
  const projection = buildTask551AdminReadPlannedRecordProjection(records);
  const ids = new Set<string>();
  for (const record of projection) {
    if (
      ids.has(record.id) ||
      record.id !== record.plannedShapeId ||
      record.budgetId !== record.id ||
      record.source.line !== null ||
      record.source.column !== null ||
      record.statementRole === "not-applicable"
    ) {
      fail("query_inventory_planned_delta_unresolved", "admin-record");
    }
    ids.add(record.id);
  }
}

export function assertNoPlannedDeltasRemain(records: readonly unknown[]): void {
  if (records.length !== 0) fail("query_inventory_planned_delta_unresolved", "planned-deltas");
}

export function buildCanonicalReceipt(input: {
  phase: InventoryPhase;
  discovered: readonly unknown[];
  current: readonly unknown[];
  planned: readonly unknown[];
  associations: unknown;
  validatedAt: `reviewed-fixture-v${number}`;
}): QueryInventoryReceipt {
  const discovered = canonicalizeDiscoveredCallers(input.discovered);
  const current = canonicalizeInventoryRecords(input.current);
  const planned = canonicalizeInventoryRecords(input.planned);
  const associations = canonicalizeFingerprintAssociations(input.associations);
  const adminReadPlannedCount = planned.filter(
    (record) => record.owner === "TASK-551-03-L02"
  ).length;
  return Object.freeze({
    schemaVersion: 1,
    phase: input.phase,
    sourceTreeDigest: sha256(discovered),
    inventoryDigest: sha256(current),
    plannedDeltaDigest: sha256(planned),
    fingerprintAssociationDigest: sha256(associations),
    discoveredCount: discovered.length,
    ownedCount: current.length,
    plannedDeltaCount: planned.length,
    adminReadPlannedCount,
    legacyPlannedCount: planned.length - adminReadPlannedCount,
    validatedAt: input.validatedAt,
  });
}

export function assertExactSanitizedReceipt(input: {
  actual: unknown;
  expected: unknown;
}): QueryInventoryReceipt {
  const actual = validateReceipt(input.actual);
  const expected = validateReceipt(input.expected);
  if (actual.validatedAt !== expected.validatedAt)
    fail("query_inventory_final_receipt_missing", "receipt-marker");
  const fields: Array<keyof QueryInventoryReceipt> = [
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
  ];
  for (const field of fields)
    if (actual[field] !== expected[field])
      fail("query_inventory_final_receipt_missing", "receipt-identity");
  return actual;
}

const FORBIDDEN_OUTPUT = [
  /https?:\/\//i,
  /(?:sk-|pk-|rk-)[A-Za-z0-9_-]{12,}/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /"(?:password|secret|token|api[_-]?key)"\s*:/i,
  /\b(?:password|secret|token|api[_-]?key)\s*=\s*\S+/i,
] as const;

export function assertSanitizedInventoryArtifacts(values: readonly unknown[]): void {
  for (const value of values) {
    const serialized = canonicalJson(value);
    if (FORBIDDEN_OUTPUT.some((pattern) => pattern.test(serialized)))
      fail("query_inventory_invalid", "redaction");
  }
}

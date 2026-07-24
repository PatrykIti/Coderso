import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../core/db/schema";
import {
  buildManagedResourceEvidenceQuery,
  createLegacyInstallLedger,
} from "../../../core/services/kits/legacyInstallRunPersistence";

const EXPLAIN_PROFILES = [
  {
    label: "small",
    candidates: 16,
    rollbacks: 8,
    rollbackItems: 6,
    executionMs: 100,
    scannedRows: 2_000,
    sharedBuffers: 2_048,
  },
  {
    label: "bounded-large",
    candidates: 512,
    rollbacks: 256,
    rollbackItems: 192,
    executionMs: 250,
    scannedRows: 20_000,
    sharedBuffers: 20_480,
  },
] as const;

type ExplainProfile = (typeof EXPLAIN_PROFILES)[number];
type ExplainRecord = Record<string, unknown>;
type ExplainMetrics = {
  executionMs: number;
  emittedRows: number;
  scannedRows: number;
  sharedBuffers: number;
};

const EXPLAIN_INVALID = "managed_evidence_explain_invalid";
const OPTIONAL_REMOVAL_METRICS = [
  "Rows Removed by Filter",
  "Rows Removed by Join Filter",
  "Rows Removed by Index Recheck",
] as const;
const OPTIONAL_BUFFER_METRICS = [
  "Shared Hit Blocks",
  "Shared Read Blocks",
  "Shared Dirtied Blocks",
  "Shared Written Blocks",
] as const;

const invalidExplain = (): never => {
  throw new Error(EXPLAIN_INVALID);
};

const isExplainRecord = (value: unknown): value is ExplainRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const asExplainRecord = (value: unknown): ExplainRecord => {
  if (!isExplainRecord(value)) return invalidExplain();
  return value;
};

const hasOwn = (record: ExplainRecord | readonly unknown[], key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const explainNumber = (record: ExplainRecord, key: string, required: boolean): number => {
  if (!hasOwn(record, key)) return required ? invalidExplain() : 0;
  const value = Reflect.get(record, key);
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return invalidExplain();
  }
  return value;
};

const finiteSum = (values: readonly number[]): number => {
  const sum = values.reduce((total, value) => total + value, 0);
  return Number.isFinite(sum) && sum >= 0 ? sum : invalidExplain();
};

const finiteProduct = (left: number, right: number): number => {
  const product = left * right;
  return Number.isFinite(product) && product >= 0 ? product : invalidExplain();
};

const parsePlanNode = (
  value: unknown,
  visited: WeakSet<object>
): { actualRows: number; actualLoops: number; scannedRows: number } => {
  const node = asExplainRecord(value);
  if (visited.has(node)) return invalidExplain();
  visited.add(node);
  const actualRows = explainNumber(node, "Actual Rows", true);
  const actualLoops = explainNumber(node, "Actual Loops", true);
  const localRows = finiteSum([
    actualRows,
    ...OPTIONAL_REMOVAL_METRICS.map((key) => explainNumber(node, key, false)),
  ]);
  let scannedRows = finiteProduct(localRows, actualLoops);

  if (hasOwn(node, "Plans")) {
    const plans = Reflect.get(node, "Plans");
    if (!Array.isArray(plans)) return invalidExplain();
    const length = Reflect.get(plans, "length");
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
      return invalidExplain();
    }
    for (let index = 0; index < length; index += 1) {
      if (!hasOwn(plans, index)) return invalidExplain();
      const child = parsePlanNode(Reflect.get(plans, index), visited);
      scannedRows = finiteSum([scannedRows, child.scannedRows]);
    }
    if (Reflect.get(plans, "length") !== length) return invalidExplain();
  }

  return { actualRows, actualLoops, scannedRows };
};

const parseManagedEvidenceExplainMetrics = (input: unknown): ExplainMetrics => {
  try {
    const document: unknown = typeof input === "string" ? JSON.parse(input) : input;
    if (!Array.isArray(document)) return invalidExplain();
    const topLevelLength = Reflect.get(document, "length");
    if (topLevelLength !== 1 || !hasOwn(document, 0)) {
      return invalidExplain();
    }
    const result = asExplainRecord(Reflect.get(document, 0));
    if (!hasOwn(result, "Plan")) return invalidExplain();
    const rootRecord = asExplainRecord(Reflect.get(result, "Plan"));
    const root = parsePlanNode(rootRecord, new WeakSet<object>());
    const emittedRows = finiteProduct(root.actualRows, root.actualLoops);
    const sharedBuffers = finiteSum(
      OPTIONAL_BUFFER_METRICS.map((key) => explainNumber(rootRecord, key, false))
    );
    const metrics = {
      executionMs: explainNumber(result, "Execution Time", true),
      emittedRows,
      scannedRows: root.scannedRows,
      sharedBuffers,
    };
    if (Reflect.get(document, "length") !== topLevelLength) return invalidExplain();
    return metrics;
  } catch {
    throw new Error(EXPLAIN_INVALID);
  }
};

const cleanupExplainFixture = async (
  ownedItemIds: ReadonlySet<string>,
  ownedRunIds: ReadonlySet<string>
): Promise<void> => {
  let cleanupFailed = false;
  if (ownedItemIds.size > 0) {
    try {
      await db
        .delete(solutionKitInstallItems)
        .where(inArray(solutionKitInstallItems.id, [...ownedItemIds]));
    } catch {
      cleanupFailed = true;
    }
  }
  if (ownedRunIds.size > 0) {
    try {
      await db
        .delete(solutionKitInstallRuns)
        .where(inArray(solutionKitInstallRuns.id, [...ownedRunIds]));
    } catch {
      cleanupFailed = true;
    }
  }
  if (ownedItemIds.size > 0) {
    try {
      const remainingItems = await db
        .select({ id: solutionKitInstallItems.id })
        .from(solutionKitInstallItems)
        .where(inArray(solutionKitInstallItems.id, [...ownedItemIds]))
        .limit(1);
      if (remainingItems.length > 0) cleanupFailed = true;
    } catch {
      cleanupFailed = true;
    }
  }
  if (ownedRunIds.size > 0) {
    try {
      const remainingRuns = await db
        .select({ id: solutionKitInstallRuns.id })
        .from(solutionKitInstallRuns)
        .where(inArray(solutionKitInstallRuns.id, [...ownedRunIds]))
        .limit(1);
      if (remainingRuns.length > 0) cleanupFailed = true;
    } catch {
      cleanupFailed = true;
    }
  }
  if (cleanupFailed) throw new Error("managed_evidence_explain_cleanup_failed");
};

const assertBudget = (actual: number, maximum: number): void => {
  if (!Number.isFinite(actual) || actual > maximum) {
    throw new Error("managed_evidence_explain_budget_failed");
  }
};

const assertManagedResourceEvidenceExplainBudgets = async (profile: ExplainProfile) => {
  const scope = randomUUID();
  const packageKey = `managed-explain-${profile.label}-${scope}`;
  const resourceKey = `resource-${scope}`;
  const candidateRunIds = Array.from({ length: profile.candidates }, () => randomUUID());
  const candidateItemIds = Array.from({ length: profile.candidates }, () => randomUUID());
  const resourceIds = Array.from({ length: profile.candidates }, () => randomUUID());
  const rollbackRunIds = Array.from({ length: profile.rollbacks }, () => randomUUID());
  const rollbackItemIds = Array.from({ length: profile.rollbackItems }, () => randomUUID());
  const ownedItemIds = new Set<string>([...candidateItemIds, ...rollbackItemIds]);
  const ownedRunIds = new Set<string>([...candidateRunIds, ...rollbackRunIds]);
  const groupSize = profile.rollbacks / 4;
  const baseTime = Date.parse("2026-07-24T12:00:00.000Z");
  const candidateTime = (index: number) =>
    new Date(baseTime + (profile.candidates - index) * 1_000);

  try {
    await db.insert(solutionKitInstallRuns).values(
      candidateRunIds.map((id, index) => ({
        id,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { fullSitePackage: true },
        summary: {},
        error: null,
        createdAt: candidateTime(index),
        updatedAt: candidateTime(index),
        finishedAt: candidateTime(index),
      }))
    );
    await db.insert(solutionKitInstallItems).values(
      candidateItemIds.map((id, index) => ({
        id,
        runId: candidateRunIds[index]!,
        position: 0,
        resourceType: "form",
        resourceKey,
        operation: index % 2 === 0 ? "create" : "update",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: resourceIds[index], desired: { candidate: index } },
        rollbackAction: null,
        error: null,
        createdAt: candidateTime(index),
        updatedAt: candidateTime(index),
      }))
    );
    await db.insert(solutionKitInstallRuns).values(
      rollbackRunIds.map((id, index) => {
        const group = Math.floor(index / groupSize);
        const status =
          group === 0
            ? "success"
            : group === 1
              ? "failed"
              : group === 2
                ? "running"
                : index % 2 === 0
                  ? "failed"
                  : "running";
        return {
          id,
          kitId: packageKey,
          mode: "rollback",
          status,
          actorId: null,
          rollbackOfRunId: candidateRunIds[index]!,
          options: {},
          summary: {},
          error: status === "failed" ? "site_package_rollback_failed" : null,
          createdAt: new Date(baseTime + index * 10),
          updatedAt: new Date(baseTime + index * 10),
          finishedAt: status === "running" ? null : new Date(baseTime + index * 10),
        };
      })
    );
    await db.insert(solutionKitInstallItems).values(
      rollbackItemIds.map((id, itemIndex) => {
        const rollbackIndex = groupSize + itemIndex;
        return {
          id,
          runId: rollbackRunIds[rollbackIndex]!,
          position: 0,
          resourceType: "form",
          resourceKey,
          operation: "update",
          status: rollbackIndex < groupSize * 3 ? "success" : "failed",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: null,
          error: null,
          createdAt: new Date(baseTime + rollbackIndex * 10),
          updatedAt: new Date(baseTime + rollbackIndex * 10),
        };
      })
    );

    const winnerIndex = groupSize * 3;
    const expectedRunId = candidateRunIds[winnerIndex]!;
    const expectedResourceId = resourceIds[winnerIndex]!;
    const winner = await createLegacyInstallLedger().findManagedResourceEvidence({
      packageKey,
      kind: "form",
      key: resourceKey,
    });
    if (!winner || winner.runId !== expectedRunId || winner.resourceId !== expectedResourceId) {
      throw new Error("managed_evidence_explain_winner_mismatch");
    }

    const compiled = buildManagedResourceEvidenceQuery({
      packageKey,
      kind: "form",
      key: resourceKey,
    }).toSQL();
    const explainParameters = compiled.params.map((value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(EXPLAIN_INVALID);
      }
      return value;
    });
    const explainRows = await db.$client.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${compiled.sql}`,
      explainParameters
    );
    const rawDocument = explainRows[0]?.["QUERY PLAN"];
    const parsed = parseManagedEvidenceExplainMetrics(rawDocument);
    const metrics = {
      label: profile.label,
      candidates: profile.candidates,
      rollbacks: profile.rollbacks,
      rollbackItems: profile.rollbackItems,
      ...parsed,
    };
    console.info("managed evidence EXPLAIN profile", JSON.stringify(metrics));
    assertBudget(metrics.executionMs, profile.executionMs);
    assertBudget(metrics.emittedRows, 1);
    assertBudget(metrics.scannedRows, profile.scannedRows);
    assertBudget(metrics.sharedBuffers, profile.sharedBuffers);
    return metrics;
  } finally {
    await cleanupExplainFixture(ownedItemIds, ownedRunIds);
  }
};

const createNestedExplainFixture = () => {
  const child: ExplainRecord = {
    "Actual Rows": 29,
    "Actual Loops": 2,
    "Rows Removed by Filter": 31,
    "Rows Removed by Join Filter": 37,
    "Rows Removed by Index Recheck": 41,
  };
  const root: ExplainRecord = {
    "Actual Rows": 2,
    "Actual Loops": 3,
    "Rows Removed by Filter": 5,
    "Rows Removed by Join Filter": 7,
    "Rows Removed by Index Recheck": 11,
    "Shared Hit Blocks": 13,
    "Shared Read Blocks": 17,
    "Shared Dirtied Blocks": 19,
    "Shared Written Blocks": 23,
    Plans: [child],
  };
  const result: ExplainRecord = { "Execution Time": 7, Plan: root };
  return { document: [result], result, root, child };
};

const expectExplainInvalid = (value: unknown): void => {
  let thrown: unknown;
  try {
    parseManagedEvidenceExplainMetrics(value);
  } catch (error) {
    thrown = error;
  }
  if (thrown === undefined) throw new Error("managed_evidence_explain_rejection_expected");
  expect(thrown).toBeInstanceOf(Error);
  if (!(thrown instanceof Error)) throw new Error("managed_evidence_explain_error_expected");
  expect(Object.getPrototypeOf(thrown)).toBe(Error.prototype);
  expect(thrown.message).toBe(EXPLAIN_INVALID);
  expect(thrown.message).not.toContain("hostile_explain_sentinel");
  expect(Object.prototype.hasOwnProperty.call(thrown, "cause")).toBe(false);
};

test("EXPLAIN parser accepts the exact nested fixture in both driver representations", () => {
  const { document } = createNestedExplainFixture();
  const expected: ExplainMetrics = {
    executionMs: 7,
    emittedRows: 6,
    scannedRows: 351,
    sharedBuffers: 72,
  };
  expect(parseManagedEvidenceExplainMetrics(document)).toEqual(expected);
  expect(parseManagedEvidenceExplainMetrics(JSON.stringify(document))).toEqual(expected);
});

test("EXPLAIN parser accepts a zero-valued leaf with absent optional metrics", () => {
  expect(
    parseManagedEvidenceExplainMetrics([
      { "Execution Time": 0, Plan: { "Actual Rows": 0, "Actual Loops": 0 } },
    ])
  ).toEqual({ executionMs: 0, emittedRows: 0, scannedRows: 0, sharedBuffers: 0 });
});

test("EXPLAIN parser rejects malformed top-level and trapped representations", () => {
  const twoResults = createNestedExplainFixture();
  const sparseTop = new Array(1);
  const hostileResult = new Proxy(createNestedExplainFixture().result, {
    getOwnPropertyDescriptor: () => {
      throw new Error("hostile_explain_sentinel");
    },
  });
  const hostilePlan = new Proxy(createNestedExplainFixture().root, {
    getPrototypeOf: () => {
      throw new Error("hostile_explain_sentinel");
    },
  });
  for (const value of [
    null,
    {},
    [],
    sparseTop,
    [twoResults.result, twoResults.result],
    [{ "Execution Time": 1 }],
    "{hostile_explain_sentinel",
    JSON.stringify({ Plan: {} }),
    [hostileResult],
    [{ "Execution Time": 1, Plan: hostilePlan }],
  ]) {
    expectExplainInvalid(value);
  }
});

test("EXPLAIN parser rejects every required and optional numeric metric class", () => {
  const required = [
    ["Execution Time", "result"],
    ["Actual Rows", "root"],
    ["Actual Loops", "root"],
  ] as const;
  const optional = [...OPTIONAL_REMOVAL_METRICS, ...OPTIONAL_BUFFER_METRICS];
  const missing = Symbol("missing");

  for (const [key, ownerName] of required) {
    for (const value of [missing, undefined, "1", Number.NaN, Infinity, -1]) {
      const fixture = createNestedExplainFixture();
      const owner = ownerName === "result" ? fixture.result : fixture.root;
      if (value === missing) delete owner[key];
      else owner[key] = value;
      expectExplainInvalid(fixture.document);
    }
  }
  for (const key of optional) {
    for (const value of [undefined, "1", Number.NaN, Infinity, -1]) {
      const fixture = createNestedExplainFixture();
      fixture.root[key] = value;
      expectExplainInvalid(fixture.document);
    }
  }
});

test("EXPLAIN parser rejects malformed root, child, and Plans shapes", () => {
  for (const root of [null, [], "root", new Date()]) {
    const fixture = createNestedExplainFixture();
    fixture.result.Plan = root;
    expectExplainInvalid(fixture.document);
  }
  const sparsePlans = new Array(1);
  for (const plans of [null, {}, "plans", sparsePlans, [null], [{}]]) {
    const fixture = createNestedExplainFixture();
    fixture.root.Plans = plans;
    expectExplainInvalid(fixture.document);
  }
});

test("EXPLAIN parser rejects non-finite derived metrics", () => {
  const rowOverflow = createNestedExplainFixture();
  rowOverflow.root["Actual Rows"] = Number.MAX_VALUE;
  rowOverflow.root["Actual Loops"] = 2;
  expectExplainInvalid(rowOverflow.document);

  const bufferOverflow = createNestedExplainFixture();
  bufferOverflow.root["Shared Hit Blocks"] = Number.MAX_VALUE;
  bufferOverflow.root["Shared Read Blocks"] = Number.MAX_VALUE;
  expectExplainInvalid(bufferOverflow.document);
});

test("managed evidence SELECT satisfies no-migration EXPLAIN budgets", async () => {
  for (const profile of EXPLAIN_PROFILES) {
    await assertManagedResourceEvidenceExplainBudgets(profile);
  }
}, 360_000);

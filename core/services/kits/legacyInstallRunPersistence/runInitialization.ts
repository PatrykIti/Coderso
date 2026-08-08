import { and, asc, eq } from "drizzle-orm";

import { acquireNativeCmsWriterFence } from "../../../db/nativeCmsWriterFence";
import { db } from "../../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../db/schema";
import type {
  FullSiteInitializedLedgerItemInput,
  FullSiteInstallLedgerPort,
  FullSiteReservedRunInitializationInput,
} from "../fullSiteInstallTypes";
import {
  readFullSiteRollbackActionV1,
  readStrictInitializationPlanV1,
} from "../fullSiteInstallTypes";
import {
  compareFullSitePackageObjectKeys,
  createDiagnosticCollector,
  isAllowedFullSitePackageSettingKey,
  readPackageKey,
} from "../fullSitePackage/schema";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_KINDS,
  type JsonObject,
  type JsonValue,
} from "../fullSitePackage/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INPUT_KEYS = new Set(["ownerRunId", "packageKey", "actorId", "dryRun", "options", "items"]);
const ITEM_KEYS = new Set([
  "position",
  "kind",
  "key",
  "operation",
  "beforeSnapshot",
  "afterSnapshot",
  "rollbackAction",
]);
const OPERATIONS = new Set(["create", "update", "noop"]);
const RESOURCE_KINDS = new Set<string>(PACKAGE_RESOURCE_KINDS);
const PRIVATE_OPTION_KEYS = new Set(["nativeCmsWriterFenceV1", "initializationPlanV1"]);

const fail = (code = "site_package_invalid"): never => {
  throw new Error(code);
};

const exactDataRecord = (value: unknown, keys?: ReadonlySet<string>): Record<string, unknown> => {
  if (!value || Array.isArray(value) || typeof value !== "object") fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail();
  if (keys && (ownKeys.length !== keys.size || ownKeys.some((key) => !keys.has(key as string))))
    fail();
  for (const descriptor of Object.values(descriptors)) {
    if (!("value" in descriptor) || descriptor.enumerable !== true) fail();
  }
  return value as Record<string, unknown>;
};

const cloneJson = (value: unknown, depth = 1): JsonValue => {
  if (depth > PACKAGE_LIMITS.depth) fail("site_package_too_complex");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) {
    const length = Reflect.get(value, "length");
    if (!Number.isSafeInteger(length) || length < 0) fail();
    const output: JsonValue[] = [];
    for (let index = 0; index < length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) fail();
      output.push(cloneJson(Reflect.get(value, String(index)), depth + 1));
    }
    if (Reflect.get(value, "length") !== length) fail();
    return output;
  }
  const record = exactDataRecord(value);
  const output: JsonObject = {};
  for (const key of Object.keys(record).sort(compareFullSitePackageObjectKeys)) {
    output[key] = cloneJson(record[key], depth + 1);
  }
  return output;
};

const readCanonicalKey = (value: unknown): string => {
  const diagnostics = createDiagnosticCollector();
  const key = readPackageKey(value, "$.key", diagnostics);
  const batch = diagnostics.read();
  if (batch.overflowed || batch.diagnostics.length > 0 || key !== value) fail();
  return key;
};

const readCanonicalItemKey = (kind: unknown, value: unknown): string => {
  if (typeof kind !== "string" || !RESOURCE_KINDS.has(kind)) fail();
  if (kind === "setting") {
    const settingKey = typeof value === "string" ? value : fail();
    if (!isAllowedFullSitePackageSettingKey(settingKey)) fail();
    return settingKey;
  }
  return readCanonicalKey(value);
};

const cloneOptions = (value: unknown): JsonObject => {
  const options = cloneJson(value);
  if (!options || Array.isArray(options) || typeof options !== "object") fail();
  const record = options as JsonObject;
  if (Object.keys(record).some((key) => PRIVATE_OPTION_KEYS.has(key))) fail();
  return record;
};

const readItem = (value: unknown, position: number): FullSiteInitializedLedgerItemInput => {
  const row = exactDataRecord(value, ITEM_KEYS);
  const kind = Reflect.get(row, "kind");
  const key = readCanonicalItemKey(kind, Reflect.get(row, "key"));
  const operation = Reflect.get(row, "operation");
  const before = Reflect.get(row, "beforeSnapshot");
  const after = cloneJson(Reflect.get(row, "afterSnapshot"));
  const action = cloneJson(Reflect.get(row, "rollbackAction"));
  const parsedAction = readFullSiteRollbackActionV1(action);
  const identity = `${String(kind)}:${key}`;
  if (
    Reflect.get(row, "position") !== position ||
    !parsedAction ||
    parsedAction.dependencies.includes(identity as (typeof parsedAction.dependencies)[number]) ||
    typeof operation !== "string" ||
    !OPERATIONS.has(operation) ||
    !after ||
    Array.isArray(after) ||
    typeof after !== "object" ||
    !action ||
    Array.isArray(action) ||
    typeof action !== "object"
  )
    fail();
  const beforeSnapshot = before === null ? null : cloneJson(before);
  if (
    beforeSnapshot !== null &&
    (Array.isArray(beforeSnapshot) || typeof beforeSnapshot !== "object")
  )
    fail();
  return Object.freeze({
    position,
    kind: kind as FullSiteInitializedLedgerItemInput["kind"],
    key,
    operation: operation as FullSiteInitializedLedgerItemInput["operation"],
    beforeSnapshot: beforeSnapshot as JsonObject | null,
    afterSnapshot: after as JsonObject,
    rollbackAction: action as JsonObject,
  });
};

const readInput = (value: unknown): FullSiteReservedRunInitializationInput => {
  try {
    const row = exactDataRecord(value, INPUT_KEYS);
    const ownerRunId = Reflect.get(row, "ownerRunId");
    const actorId = Reflect.get(row, "actorId");
    const dryRun = Reflect.get(row, "dryRun");
    const itemsValue = Reflect.get(row, "items");
    if (
      !UUID_PATTERN.test(String(ownerRunId)) ||
      !UUID_PATTERN.test(String(actorId)) ||
      typeof dryRun !== "boolean"
    )
      fail();
    const validatedDryRun = dryRun as boolean;
    const inputItems = Array.isArray(itemsValue) ? itemsValue : fail();
    const length = Reflect.get(inputItems, "length");
    if (!Number.isSafeInteger(length) || length < 0) fail();
    if (length > PACKAGE_LIMITS.resourcesTotal) fail("site_package_too_large");
    const items: FullSiteInitializedLedgerItemInput[] = [];
    const identities = new Set<string>();
    for (let index = 0; index < length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(inputItems, index)) fail();
      const item = readItem(Reflect.get(inputItems, String(index)), index);
      const identity = `${item.kind}:${item.key}`;
      if (identities.has(identity)) fail();
      identities.add(identity);
      items.push(item);
    }
    if (Reflect.get(inputItems, "length") !== length) fail();
    return Object.freeze({
      ownerRunId: String(ownerRunId),
      packageKey: readCanonicalKey(Reflect.get(row, "packageKey")),
      actorId: String(actorId),
      dryRun: validatedDryRun,
      options: cloneOptions(Reflect.get(row, "options")),
      items: Object.freeze(items),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "site_package_too_large")
      throw new Error("site_package_too_large");
    throw new Error("site_package_invalid");
  }
};

const canonicalJson = (value: JsonValue): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort(compareFullSitePackageObjectKeys)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
};

const publicOptions = (value: unknown): JsonObject => {
  const cloned = cloneJson(value);
  if (!cloned || Array.isArray(cloned) || typeof cloned !== "object") fail();
  const output: JsonObject = { ...(cloned as JsonObject) };
  delete output.nativeCmsWriterFenceV1;
  delete output.initializationPlanV1;
  return output;
};

const initializationPlan = (items: readonly FullSiteInitializedLedgerItemInput[]) =>
  items.map(({ position, kind, key, operation }) => ({ position, kind, key, operation }));

const rowsMatchPlan = (
  rows: readonly (typeof solutionKitInstallItems.$inferSelect)[],
  plan: ReturnType<typeof initializationPlan>
): boolean =>
  rows.length === plan.length &&
  rows.every((row, index) => {
    const expected = plan[index];
    return (
      row.position === expected.position &&
      row.resourceType === expected.kind &&
      row.resourceKey === expected.key &&
      row.operation === expected.operation
    );
  });

const rereadState = async (input: FullSiteReservedRunInitializationInput) => {
  try {
    return await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        const [owner] = await tx
          .select({ options: solutionKitInstallRuns.options })
          .from(solutionKitInstallRuns)
          .where(eq(solutionKitInstallRuns.id, input.ownerRunId))
          .limit(1);
        const items = await tx
          .select()
          .from(solutionKitInstallItems)
          .where(eq(solutionKitInstallItems.runId, input.ownerRunId))
          .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id))
          .limit(PACKAGE_LIMITS.resourcesTotal + 1);
        if (!owner || items.length > PACKAGE_LIMITS.resourcesTotal) {
          return "partial_or_impossible" as const;
        }
        const options = exactDataRecord(owner.options);
        const rawPlan = Reflect.get(options, "initializationPlanV1");
        if (rawPlan === undefined && items.length === 0) return "reserved" as const;
        let plan;
        try {
          plan = readStrictInitializationPlanV1(rawPlan);
        } catch {
          return "partial_or_impossible" as const;
        }
        return rowsMatchPlan(items, [...plan])
          ? ("initialized" as const)
          : ("partial_or_impossible" as const);
      },
      { isolationLevel: "read committed" }
    );
  } catch {
    return "unresolved" as const;
  }
};

export const createRunInitialization = (
  database: Pick<typeof db, "transaction"> = db
): Pick<FullSiteInstallLedgerPort, "initializeReservedRun"> => ({
  async initializeReservedRun(value: unknown) {
    const input = readInput(value);
    const plan = initializationPlan(input.items);
    try {
      return await database.transaction(
        async (tx) => {
          await acquireNativeCmsWriterFence(tx);
          const [owner] = await tx
            .select()
            .from(solutionKitInstallRuns)
            .where(
              and(
                eq(solutionKitInstallRuns.id, input.ownerRunId),
                eq(solutionKitInstallRuns.status, "running")
              )
            )
            .limit(1);
          if (
            !owner ||
            owner.kitId !== input.packageKey ||
            owner.actorId !== input.actorId ||
            owner.mode !== (input.dryRun ? "dry_run" : "apply") ||
            canonicalJson(publicOptions(owner.options)) !== canonicalJson(input.options)
          ) {
            throw new Error("native_cms_writer_fence_lost");
          }
          const ownerOptions = cloneJson(owner.options) as JsonObject;
          await tx
            .update(solutionKitInstallRuns)
            .set({
              options: { ...ownerOptions, initializationPlanV1: plan },
              updatedAt: new Date(),
            })
            .where(eq(solutionKitInstallRuns.id, input.ownerRunId));
          if (input.items.length > 0) {
            const now = new Date();
            await tx.insert(solutionKitInstallItems).values(
              input.items.map((item) => ({
                runId: input.ownerRunId,
                position: item.position,
                resourceType: item.kind,
                resourceKey: item.key,
                operation: item.operation,
                status: "planned",
                beforeSnapshot: item.beforeSnapshot,
                afterSnapshot: item.afterSnapshot,
                rollbackAction: item.rollbackAction,
                error: null,
                createdAt: now,
                updatedAt: now,
              }))
            );
          }
          return Object.freeze({ id: input.ownerRunId });
        },
        { isolationLevel: "read committed" }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "native_cms_writer_fence_lost" ||
          error.message === "native_cms_writer_fence_failed")
      ) {
        throw new Error(error.message);
      }
      const state = await rereadState(input);
      if (state === "initialized") return Object.freeze({ id: input.ownerRunId });
      if (state === "reserved") throw new Error("site_package_ledger_initialization_failed");
      if (state === "partial_or_impossible") throw new Error("native_cms_writer_recovery_required");
      throw new Error("native_cms_writer_fence_failed");
    }
  },
});

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  buildFullSiteRollbackActionV1,
  type FullSiteInitializedLedgerItemInput,
  type FullSiteInstallPlan,
  type FullSiteInstallPlanItem,
  type FullSiteResourceIdentity,
} from "../fullSiteInstallTypes";
import {
  resolvePlannedPackageResourceRefs,
  type PlannedPackageResource,
} from "../fullSitePackage/referenceGraph";
import type { JsonObject, JsonValue } from "../fullSitePackage/types";
import type {
  AdapterApplyInput,
  FullSiteNativeSnapshot,
  FullSitePreparedNativeTargets,
  FullSiteResourceAdapterRegistry,
  FullSiteSagaAdapterApplyInput,
  FullSiteSagaAdapterPrepareInput,
} from "./adapterTypes";
import { validateFullSiteOperation } from "./preflight";
import {
  buildFullSiteDurableAfterSnapshotV1,
  fullSiteJsonValuesEqual,
  prepareDurableCreateIntent,
  type FullSiteDurableAfterSnapshotV1,
} from "./staging";

type ExecutablePlanItem = FullSiteInstallPlanItem &
  Readonly<{ operation: "create" | "update" | "noop" }>;

export type PreparedFullSiteSagaItem = Readonly<{
  operation: ExecutablePlanItem;
  intendedId: string;
  normalized: JsonObject;
  beforeSnapshot: FullSiteNativeSnapshot | null;
  targets: FullSitePreparedNativeTargets;
  afterSnapshot: FullSiteDurableAfterSnapshotV1;
  rollbackAction: JsonObject;
}>;

export type PreparedFullSiteSaga = Readonly<{
  prepared: readonly PreparedFullSiteSagaItem[];
  intendedRegistry: ReadonlyMap<FullSiteResourceIdentity, string>;
}>;

const UUID_NOT_FOUND_CODES = new Set([
  "content_type_not_found",
  "form_not_found",
  "page_template_not_found",
  "listing_template_not_found",
  "content_entry_not_found",
  "listing_query_not_found",
  "detail_page_not_found",
  "page_not_found",
  "menu_not_found",
]);

const toJsonObject = (value: unknown): JsonObject =>
  JSON.parse(JSON.stringify(value)) as JsonObject;

const assertPlanAlignment = (
  plan: FullSiteInstallPlan,
  referencePlan: readonly PlannedPackageResource[]
): readonly ExecutablePlanItem[] => {
  if (plan.operations.length !== referencePlan.length) throw new Error("site_package_invalid");
  return plan.operations.map((operation, index) => {
    const resource = referencePlan[index];
    if (
      !resource ||
      operation.position !== index ||
      operation.identity !== resource.identity ||
      operation.kind !== resource.kind ||
      operation.key !== resource.key ||
      operation.operation === "conflict" ||
      !fullSiteJsonValuesEqual(
        operation.desired as unknown as JsonValue,
        resource.seed.desired as unknown as JsonValue
      ) ||
      !isDeepStrictEqual(operation.dependencies, resource.dependencies)
    ) {
      throw new Error("site_package_invalid");
    }
    return operation as ExecutablePlanItem;
  });
};

const isAbsentSettingSnapshot = (snapshot: FullSiteNativeSnapshot): boolean =>
  snapshot.desired.present === false && Reflect.ownKeys(snapshot.desired).length === 1;

const proveCreateTargetAbsent = async (
  operation: ExecutablePlanItem,
  id: string,
  adapters: FullSiteResourceAdapterRegistry
): Promise<void> => {
  try {
    const current = await adapters[operation.kind].captureSnapshotById(id);
    if (operation.kind === "setting" && isAbsentSettingSnapshot(current)) return;
    throw new Error("site_package_state_changed");
  } catch (error) {
    if (
      operation.kind !== "setting" &&
      error instanceof Error &&
      UUID_NOT_FOUND_CODES.has(error.message)
    ) {
      return;
    }
    throw error;
  }
};

const captureBefore = async (
  operation: ExecutablePlanItem,
  intendedId: string,
  adapters: FullSiteResourceAdapterRegistry
): Promise<FullSiteNativeSnapshot | null> => {
  if (operation.operation === "create") {
    await proveCreateTargetAbsent(operation, intendedId, adapters);
    return null;
  }
  if (!operation.currentId || operation.currentId !== intendedId) {
    throw new Error("site_package_invalid");
  }
  const snapshot = await adapters[operation.kind].captureSnapshotById(intendedId);
  if (snapshot.id !== intendedId) throw new Error("site_package_state_changed");
  return snapshot;
};

const toPrepareInput = (
  input: Readonly<{
    operation: ExecutablePlanItem;
    intendedId: string;
    normalized: JsonObject;
    beforeSnapshot: FullSiteNativeSnapshot | null;
    actorId: string;
  }>
): FullSiteSagaAdapterPrepareInput =>
  input.operation.operation === "create"
    ? {
        operation: "create",
        currentId: null,
        key: input.operation.key,
        desired: input.normalized,
        actorId: input.actorId,
        intendedId: input.intendedId,
        expectedSnapshot: null,
      }
    : {
        operation: "update",
        currentId: input.intendedId,
        key: input.operation.key,
        desired: input.normalized,
        actorId: input.actorId,
        intendedId: null,
        expectedSnapshot: input.beforeSnapshot!,
      };

const assertTargetIds = (intendedId: string, targets: FullSitePreparedNativeTargets): void => {
  if (
    targets.complete.id !== intendedId ||
    (targets.staged !== null && targets.staged.id !== intendedId)
  ) {
    throw new Error("site_package_invalid");
  }
};

export const prepareFullSiteSaga = async (
  input: Readonly<{
    plan: FullSiteInstallPlan;
    referencePlan: readonly PlannedPackageResource[];
    adapters: FullSiteResourceAdapterRegistry;
    actorId: string;
    generateId?: () => string;
  }>
): Promise<PreparedFullSiteSaga> => {
  const operations = assertPlanAlignment(input.plan, input.referencePlan);
  const generateId = input.generateId ?? randomUUID;
  const intendedRegistry = new Map<FullSiteResourceIdentity, string>();
  for (const operation of operations) {
    const intent = prepareDurableCreateIntent(operation, generateId);
    const intendedId = operation.currentId ?? intent.intendedId ?? operation.key;
    if (!intendedId || intendedRegistry.has(operation.identity)) {
      throw new Error("site_package_invalid");
    }
    intendedRegistry.set(operation.identity, intendedId);
  }

  const prepared: PreparedFullSiteSagaItem[] = [];
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    const resource = input.referencePlan[index];
    const intendedId = intendedRegistry.get(operation.identity);
    if (!resource || !intendedId) throw new Error("site_package_invalid");
    const resolved = resolvePlannedPackageResourceRefs(resource, intendedRegistry);
    const normalized = await validateFullSiteOperation({
      operation,
      plan: input.plan,
      desired: resolved,
      actorId: input.actorId,
      adapter: input.adapters[operation.kind],
    });
    if (
      operation.operation === "noop" &&
      (!operation.currentDesired ||
        !fullSiteJsonValuesEqual(normalized as JsonValue, operation.currentDesired as JsonValue))
    ) {
      throw new Error("site_package_state_changed");
    }
    const beforeSnapshot = await captureBefore(operation, intendedId, input.adapters);
    const targets =
      operation.operation === "noop"
        ? { staged: null, complete: beforeSnapshot! }
        : await input.adapters[operation.kind].prepareNativeTargets(
            toPrepareInput({
              operation,
              intendedId,
              normalized,
              beforeSnapshot,
              actorId: input.actorId,
            })
          );
    if (!targets.complete || (operation.operation === "noop" && !beforeSnapshot)) {
      throw new Error("site_package_invalid");
    }
    assertTargetIds(intendedId, targets);
    const afterSnapshot = buildFullSiteDurableAfterSnapshotV1({
      complete: targets.complete,
      staged: targets.staged,
      phase: "prepared",
    });
    const rollbackAction = buildFullSiteRollbackActionV1({
      identity: operation.identity,
      dependencies: operation.dependencies,
    });
    prepared.push(
      Object.freeze({
        operation,
        intendedId,
        normalized: toJsonObject(normalized),
        beforeSnapshot: beforeSnapshot ? structuredClone(beforeSnapshot) : null,
        targets: structuredClone(targets),
        afterSnapshot,
        rollbackAction,
      })
    );
  }
  return Object.freeze({
    prepared: Object.freeze(prepared),
    intendedRegistry: new Map(intendedRegistry),
  });
};

export const toInitializedLedgerItem = (
  item: PreparedFullSiteSagaItem
): FullSiteInitializedLedgerItemInput => ({
  position: item.operation.position,
  kind: item.operation.kind,
  key: item.operation.key,
  operation: item.operation.operation,
  beforeSnapshot: item.beforeSnapshot ? toJsonObject(item.beforeSnapshot) : null,
  afterSnapshot: toJsonObject(item.afterSnapshot),
  rollbackAction: toJsonObject(item.rollbackAction),
});

export const toSagaApplyInput = (
  item: PreparedFullSiteSagaItem,
  targetSnapshot: FullSiteNativeSnapshot,
  actorId: string
): FullSiteSagaAdapterApplyInput => {
  const base: AdapterApplyInput = {
    operation: item.operation.operation === "create" ? "create" : "update",
    currentId: item.operation.operation === "create" ? null : item.intendedId,
    key: item.operation.key,
    desired: targetSnapshot.desired,
    actorId,
  };
  return item.operation.operation === "create"
    ? {
        ...base,
        operation: "create",
        currentId: null,
        intendedId: item.intendedId,
        expectedSnapshot: null,
        targetSnapshot,
      }
    : {
        ...base,
        operation: "update",
        currentId: item.intendedId,
        intendedId: null,
        expectedSnapshot: item.beforeSnapshot!,
        targetSnapshot,
      };
};

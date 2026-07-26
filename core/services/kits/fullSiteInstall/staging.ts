import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import type { FullSitePackageV1, JsonObject, JsonValue } from "../fullSitePackage/types";
import type {
  CurrentResourceState,
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallPlan,
  FullSiteInstallPlanItem,
} from "../fullSiteInstallTypes";

export type FullSiteSagaPhase = "unresolved" | "prepared" | "staged" | "complete";

export type FullSiteSagaSnapshot = {
  id: string | null;
  desired: JsonObject;
  phase: FullSiteSagaPhase;
  intendedDesired: JsonObject | null;
};

const canonicalJson = (value: JsonValue): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const fullSitePackageFingerprint = (pkg: FullSitePackageV1): string =>
  createHash("sha256")
    .update(canonicalJson(pkg as unknown as JsonValue))
    .digest("hex");

export const makeSagaSnapshot = (input: FullSiteSagaSnapshot): JsonObject => ({
  id: input.id,
  desired: input.desired,
  recovery: {
    phase: input.phase,
    intendedDesired: input.intendedDesired,
  },
});

export const readSagaSnapshot = (value: JsonObject | null): FullSiteSagaSnapshot | null => {
  if (
    !value ||
    (value.id !== null && typeof value.id !== "string") ||
    !value.desired ||
    Array.isArray(value.desired) ||
    typeof value.desired !== "object" ||
    !value.recovery ||
    Array.isArray(value.recovery) ||
    typeof value.recovery !== "object"
  ) {
    return null;
  }
  const recovery = value.recovery as JsonObject;
  if (
    recovery.phase !== "unresolved" &&
    recovery.phase !== "prepared" &&
    recovery.phase !== "staged" &&
    recovery.phase !== "complete"
  ) {
    return null;
  }
  const intended = recovery.intendedDesired;
  if (
    intended !== null &&
    intended !== undefined &&
    (Array.isArray(intended) || typeof intended !== "object")
  ) {
    return null;
  }
  return {
    id: value.id as string | null,
    desired: value.desired as JsonObject,
    phase: recovery.phase,
    intendedDesired: (intended as JsonObject | null | undefined) ?? null,
  };
};

const readBefore = (value: JsonObject | null): { id: string; desired: JsonObject } | null => {
  if (
    !value ||
    typeof value.id !== "string" ||
    !value.desired ||
    Array.isArray(value.desired) ||
    typeof value.desired !== "object"
  ) {
    return null;
  }
  return { id: value.id, desired: value.desired as JsonObject };
};

export const planBeforeSnapshot = (operation: FullSiteInstallPlanItem): JsonObject | null =>
  operation.currentId && operation.currentDesired
    ? { id: operation.currentId, desired: operation.currentDesired }
    : null;

export const initializeFullSiteSaga = async (input: {
  ledger: FullSiteInstallLedgerPort;
  runId: string;
  plan: FullSiteInstallPlan;
}): Promise<void> => {
  for (const operation of input.plan.operations) {
    await input.ledger.recordItem({
      runId: input.runId,
      position: operation.position,
      kind: operation.kind,
      key: operation.key,
      operation: operation.operation,
      status: "planned",
      beforeSnapshot: planBeforeSnapshot(operation),
      afterSnapshot: makeSagaSnapshot({
        id: operation.currentId,
        desired: operation.desired,
        phase: "unresolved",
        intendedDesired: null,
      }),
      error: null,
    });
  }
};

export type PreparedMutationState =
  | { state: "pending"; current: CurrentResourceState | null }
  | { state: "applied"; current: CurrentResourceState }
  | { state: "conflict"; current: CurrentResourceState | null };

export const classifyPreparedMutation = async (input: {
  operation: FullSiteInstallPlanItem;
  snapshot: FullSiteSagaSnapshot;
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}): Promise<PreparedMutationState> => {
  if (input.snapshot.phase === "unresolved") {
    return { state: "conflict", current: null };
  }
  const current = await input.resolveCurrentResource(
    input.operation.kind,
    { key: input.operation.key, desired: input.snapshot.desired },
    input.snapshot.id ?? input.operation.currentId ?? undefined
  );
  if (input.operation.operation === "create") {
    if (!current) return { state: "pending", current: null };
    return isDeepStrictEqual(current.desired, input.snapshot.desired)
      ? { state: "applied", current }
      : { state: "conflict", current };
  }
  const before =
    input.operation.currentId && input.operation.currentDesired
      ? { id: input.operation.currentId, desired: input.operation.currentDesired }
      : null;
  if (!before) return { state: "conflict", current };
  if (current?.id === before.id && isDeepStrictEqual(current.desired, before.desired)) {
    return { state: "pending", current };
  }
  if (
    current?.id === (input.snapshot.id ?? before.id) &&
    isDeepStrictEqual(current.desired, input.snapshot.desired)
  ) {
    return { state: "applied", current };
  }
  return { state: "conflict", current };
};

const isBeforeState = (
  item: FullSiteInstallLedgerItem,
  current: CurrentResourceState | null
): boolean => {
  if (item.operation === "create") return current === null;
  const before = readBefore(item.beforeSnapshot);
  return Boolean(
    before && current?.id === before.id && isDeepStrictEqual(current.desired, before.desired)
  );
};

/**
 * Converts only exact durable prepared intents into compensation authority.
 * A natural-key row with any payload drift remains an unmanaged conflict.
 */
export const recoverInterruptedSagaItems = async (input: {
  items: readonly FullSiteInstallLedgerItem[];
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}): Promise<FullSiteInstallLedgerItem[]> => {
  const recovered: FullSiteInstallLedgerItem[] = [];
  const preparedSettings: Array<{
    item: FullSiteInstallLedgerItem;
    snapshot: FullSiteSagaSnapshot;
    state: PreparedMutationState;
  }> = [];

  for (const item of input.items) {
    if (item.operation === "noop") {
      if (item.status === "success") recovered.push(item);
      continue;
    }
    const snapshot = readSagaSnapshot(item.afterSnapshot);
    if (!snapshot) {
      if (item.status === "success") recovered.push(item);
      else throw new Error("site_package_recovery_conflict");
      continue;
    }
    if (item.status === "success") {
      if (snapshot.phase !== "staged") {
        recovered.push(item);
        continue;
      }
      const current = await input.resolveCurrentResource(
        item.kind,
        { key: item.key, desired: snapshot.desired },
        snapshot.id ?? undefined
      );
      if (isBeforeState(item, current)) {
        recovered.push(item);
        continue;
      }
      const matchesStaged =
        current?.id === snapshot.id && isDeepStrictEqual(current.desired, snapshot.desired);
      const matchesPublished = Boolean(
        snapshot.intendedDesired &&
        current?.id === snapshot.id &&
        isDeepStrictEqual(current.desired, snapshot.intendedDesired)
      );
      if (!matchesStaged && !matchesPublished) {
        throw new Error("site_package_recovery_conflict");
      }
      recovered.push({
        ...item,
        afterSnapshot: makeSagaSnapshot({
          id: current!.id,
          desired: current!.desired,
          phase: matchesPublished ? "complete" : "staged",
          intendedDesired: snapshot.intendedDesired,
        }),
      });
      continue;
    }
    if (snapshot.phase === "unresolved") continue;
    const operation: FullSiteInstallPlanItem = {
      position: item.position,
      identity: `${item.kind}:${item.key}`,
      kind: item.kind,
      key: item.key,
      operation: item.operation,
      desired: snapshot.intendedDesired ?? snapshot.desired,
      currentId: readBefore(item.beforeSnapshot)?.id ?? null,
      currentDesired: readBefore(item.beforeSnapshot)?.desired ?? null,
      managedRunId: null,
      dependencies: [],
    };
    const state = await classifyPreparedMutation({
      operation,
      snapshot,
      resolveCurrentResource: input.resolveCurrentResource,
    });
    if (item.kind === "setting") {
      preparedSettings.push({ item, snapshot, state });
      continue;
    }
    if (state.state === "conflict") throw new Error("site_package_recovery_conflict");
    if (state.state === "pending") continue;
    recovered.push({
      ...item,
      status: "success",
      afterSnapshot: makeSagaSnapshot({
        id: state.current.id,
        desired: state.current.desired,
        phase: "complete",
        intendedDesired: snapshot.intendedDesired,
      }),
      error: null,
    });
  }

  if (preparedSettings.some(({ state }) => state.state === "conflict")) {
    throw new Error("site_package_recovery_conflict");
  }
  const appliedSettings = preparedSettings.filter(({ state }) => state.state === "applied");
  if (appliedSettings.length > 0 && appliedSettings.length !== preparedSettings.length) {
    throw new Error("site_package_recovery_conflict");
  }
  for (const { item, snapshot, state } of appliedSettings) {
    if (state.state !== "applied") continue;
    recovered.push({
      ...item,
      status: "success",
      afterSnapshot: makeSagaSnapshot({
        id: state.current.id,
        desired: state.current.desired,
        phase: "complete",
        intendedDesired: snapshot.intendedDesired,
      }),
      error: null,
    });
  }
  return recovered;
};

export const toStagedDetailDocument = (desired: JsonObject): JsonObject => {
  const document = desired.document;
  const source =
    document && typeof document === "object" && !Array.isArray(document)
      ? (document as JsonObject)
      : desired;
  return { ...source, status: "draft" };
};

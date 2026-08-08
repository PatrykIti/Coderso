import { createHash } from "node:crypto";

import type { FullSitePackageV1, JsonObject, JsonValue } from "../fullSitePackage/types";
import type {
  CurrentResourceState,
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallPlan,
  FullSiteInstallPlanItem,
  FullSiteInstallResourceKind,
  FullSiteResourceIdentity,
  PersistedFullSiteInstallLedgerItem,
} from "../fullSiteInstallTypes";
import type { FullSiteNativeSnapshot } from "./adapterTypes";

export type FullSiteSagaPhase = "unresolved" | "prepared" | "staged" | "complete";

export type FullSiteSagaSnapshot = {
  id: string | null;
  desired: JsonObject;
  phase: FullSiteSagaPhase;
  intendedDesired: JsonObject | null;
};

export const canonicalizeFullSiteJsonValue = (value: JsonValue): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeFullSiteJsonValue).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeFullSiteJsonValue(value[key]!)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const fullSiteJsonValuesEqual = (left: JsonValue, right: JsonValue): boolean =>
  canonicalizeFullSiteJsonValue(left) === canonicalizeFullSiteJsonValue(right);

export const fullSitePackageFingerprint = (pkg: FullSitePackageV1): string =>
  createHash("sha256")
    .update(canonicalizeFullSiteJsonValue(pkg as unknown as JsonValue))
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

export const DURABLE_CREATE_ID_KINDS = Object.freeze([
  "content_type",
  "form",
  "page_template",
  "listing_template",
  "content_entry",
  "listing_query",
  "detail_page",
  "page",
  "menu",
] as const satisfies readonly FullSiteInstallResourceKind[]);

export type DurableCreateIntent = Readonly<{
  intendedId: string | null;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DURABLE_CREATE_KIND_SET = new Set<FullSiteInstallResourceKind>(DURABLE_CREATE_ID_KINDS);

export const prepareDurableCreateIntent = (
  operation: FullSiteInstallPlanItem,
  generateId: () => string
): DurableCreateIntent => {
  if (operation.operation !== "create") return Object.freeze({ intendedId: null });
  if (operation.kind === "setting") return Object.freeze({ intendedId: null });
  if (!DURABLE_CREATE_KIND_SET.has(operation.kind)) {
    throw new Error("site_package_resource_kind_invalid");
  }
  const intendedId = generateId();
  if (!UUID_PATTERN.test(intendedId)) throw new Error("site_package_invalid");
  return Object.freeze({ intendedId });
};

export type FullSiteDurableAfterSnapshotV1 = FullSiteNativeSnapshot &
  Readonly<{
    recovery: Readonly<{
      schemaVersion: 1;
      phase: "prepared" | "staged" | "publish_prepared" | "complete";
      stagedSnapshot: FullSiteNativeSnapshot | null;
    }>;
  }>;

const isDirectPlainObject = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isDirectPlainObject(value)) return false;
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && isJsonValue(Reflect.get(value, key))
  );
};

const hasExactOwnKeys = (
  value: Record<PropertyKey, unknown>,
  expected: readonly string[]
): boolean => {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => typeof key === "string" && expected.includes(key))
  );
};

const readStrictNativeSnapshot = (value: unknown): FullSiteNativeSnapshot | null => {
  if (!isDirectPlainObject(value) || !hasExactOwnKeys(value, ["id", "desired"])) return null;
  const id = Reflect.get(value, "id");
  const desired = Reflect.get(value, "desired");
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    !isDirectPlainObject(desired) ||
    !isJsonValue(desired)
  ) {
    return null;
  }
  return { id, desired: desired as JsonObject };
};

export const buildFullSiteDurableAfterSnapshotV1 = (
  input: Readonly<{
    complete: FullSiteNativeSnapshot;
    staged: FullSiteNativeSnapshot | null;
    phase: FullSiteDurableAfterSnapshotV1["recovery"]["phase"];
  }>
): FullSiteDurableAfterSnapshotV1 => {
  const complete = readStrictNativeSnapshot(input.complete);
  const staged = input.staged === null ? null : readStrictNativeSnapshot(input.staged);
  if (
    !complete ||
    (input.staged !== null && !staged) ||
    (staged && staged.id !== complete.id) ||
    ((input.phase === "staged" || input.phase === "publish_prepared") && !staged)
  ) {
    throw new Error("site_package_invalid");
  }
  return Object.freeze({
    id: complete.id,
    desired: structuredClone(complete.desired),
    recovery: Object.freeze({
      schemaVersion: 1 as const,
      phase: input.phase,
      stagedSnapshot: staged
        ? Object.freeze({ id: staged.id, desired: structuredClone(staged.desired) })
        : null,
    }),
  });
};

export const readFullSiteDurableAfterSnapshotV1 = (
  value: unknown
): FullSiteDurableAfterSnapshotV1 | null => {
  try {
    if (!isDirectPlainObject(value) || !hasExactOwnKeys(value, ["id", "desired", "recovery"])) {
      return null;
    }
    const snapshot = readStrictNativeSnapshot({
      id: Reflect.get(value, "id"),
      desired: Reflect.get(value, "desired"),
    });
    const recovery = Reflect.get(value, "recovery");
    if (
      !snapshot ||
      !isDirectPlainObject(recovery) ||
      !hasExactOwnKeys(recovery, ["schemaVersion", "phase", "stagedSnapshot"])
    ) {
      return null;
    }
    const schemaVersion = Reflect.get(recovery, "schemaVersion");
    const phase = Reflect.get(recovery, "phase");
    const stagedValue = Reflect.get(recovery, "stagedSnapshot");
    const staged = stagedValue === null ? null : readStrictNativeSnapshot(stagedValue);
    if (
      schemaVersion !== 1 ||
      (phase !== "prepared" &&
        phase !== "staged" &&
        phase !== "publish_prepared" &&
        phase !== "complete") ||
      (stagedValue !== null && !staged) ||
      (staged && staged.id !== snapshot.id) ||
      ((phase === "staged" || phase === "publish_prepared") && !staged)
    ) {
      return null;
    }
    return {
      ...snapshot,
      recovery: {
        schemaVersion: 1,
        phase,
        stagedSnapshot: staged,
      },
    };
  } catch {
    return null;
  }
};

export const FULL_SITE_DURABLE_SOURCE_STATUS_PHASES_V1 = Object.freeze([
  Object.freeze({
    operations: Object.freeze(["create", "update"] as const),
    status: "planned",
    phase: "prepared",
  }),
  Object.freeze({
    operations: Object.freeze(["create", "update"] as const),
    status: "success",
    phase: "staged",
  }),
  Object.freeze({
    operations: Object.freeze(["create", "update"] as const),
    status: "success",
    phase: "publish_prepared",
  }),
  Object.freeze({
    operations: Object.freeze(["create", "update"] as const),
    status: "success",
    phase: "complete",
  }),
  Object.freeze({
    operations: Object.freeze(["noop"] as const),
    status: "planned",
    phase: "prepared",
  }),
  Object.freeze({
    operations: Object.freeze(["noop"] as const),
    status: "success",
    phase: "complete",
  }),
] as const);

export const isValidFullSiteDurableSourceStatusPhaseV1 = (
  input: Readonly<{
    operation: FullSiteInstallLedgerItem["operation"];
    status: FullSiteInstallLedgerItem["status"];
    phase: FullSiteDurableAfterSnapshotV1["recovery"]["phase"];
    stagedSnapshot: FullSiteNativeSnapshot | null;
  }>
): boolean => {
  const pairIsValid = FULL_SITE_DURABLE_SOURCE_STATUS_PHASES_V1.some(
    (candidate) =>
      (candidate.operations as readonly FullSiteInstallLedgerItem["operation"][]).includes(
        input.operation
      ) &&
      candidate.status === input.status &&
      candidate.phase === input.phase
  );
  if (!pairIsValid) return false;
  if (input.operation === "noop") return input.stagedSnapshot === null;
  if (input.phase === "staged" || input.phase === "publish_prepared") {
    return input.stagedSnapshot !== null;
  }
  return true;
};

export type FullSiteSagaRecoveryClassification = Readonly<{
  identity: FullSiteResourceIdentity;
  item: PersistedFullSiteInstallLedgerItem;
  hint: "not_applied" | "applied" | "already_recovered" | "noop";
}>;

const assertRecoverableItem = (
  item: PersistedFullSiteInstallLedgerItem
): FullSiteResourceIdentity => {
  if (
    !Number.isSafeInteger(item.position) ||
    item.position < 0 ||
    typeof item.key !== "string" ||
    item.key.length === 0 ||
    (!DURABLE_CREATE_KIND_SET.has(item.kind) && item.kind !== "setting") ||
    (item.operation !== "create" && item.operation !== "update" && item.operation !== "noop")
  ) {
    throw new Error("site_package_recovery_invalid_source");
  }
  return `${item.kind}:${item.key}`;
};

const matchesBefore = (
  item: PersistedFullSiteInstallLedgerItem,
  current: CurrentResourceState | null
): boolean => {
  const before = readBefore(item.beforeSnapshot);
  return Boolean(
    before && current?.id === before.id && fullSiteJsonValuesEqual(current.desired, before.desired)
  );
};

export const classifyInterruptedSagaItems = async (
  input: Readonly<{
    items: readonly PersistedFullSiteInstallLedgerItem[];
    resolveCurrentResource: FullSiteCurrentResourceResolver;
  }>
): Promise<readonly FullSiteSagaRecoveryClassification[]> => {
  const output: FullSiteSagaRecoveryClassification[] = [];
  for (const item of input.items) {
    const identity = assertRecoverableItem(item);
    if (item.operation === "noop") {
      output.push({ identity, item, hint: "noop" });
      continue;
    }
    const durable = readFullSiteDurableAfterSnapshotV1(item.afterSnapshot);
    if (!durable || !durable.id) {
      throw new Error("site_package_recovery_missing_intended_id");
    }
    const current = await input.resolveCurrentResource(
      item.kind,
      { key: item.key, desired: durable.desired },
      durable.id
    );
    let hint: FullSiteSagaRecoveryClassification["hint"];
    if (item.operation === "create" && current === null) {
      hint = item.status === "success" ? "already_recovered" : "not_applied";
    } else if (item.operation === "update" && matchesBefore(item, current)) {
      hint = item.status === "success" ? "already_recovered" : "not_applied";
    } else {
      hint = "applied";
    }
    output.push({ identity, item, hint });
  }
  return output;
};

/** @deprecated Final compensation consumes classifyInterruptedSagaItems directly. */
export const recoverInterruptedSagaItems = async (
  input: Readonly<{
    items: readonly FullSiteInstallLedgerItem[];
    resolveCurrentResource: FullSiteCurrentResourceResolver;
  }>
): Promise<FullSiteInstallLedgerItem[]> => {
  const persisted = input.items.map((item): PersistedFullSiteInstallLedgerItem => ({
    ...item,
    rollbackAction: item.rollbackAction ?? null,
  }));
  const classified = await classifyInterruptedSagaItems({
    items: persisted,
    resolveCurrentResource: input.resolveCurrentResource,
  });
  return classified.filter(({ hint }) => hint !== "not_applied").map(({ item }) => item);
};

export const toStagedDetailDocument = (desired: JsonObject): JsonObject => {
  const document = desired.document;
  const source =
    document && typeof document === "object" && !Array.isArray(document)
      ? (document as JsonObject)
      : desired;
  return { ...source, status: "draft" };
};

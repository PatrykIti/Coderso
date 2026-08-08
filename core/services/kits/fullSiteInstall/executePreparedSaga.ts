import { isDeepStrictEqual } from "node:util";

import type { FullSiteInstallLedgerPort, FullSiteInstallPlanItem } from "../fullSiteInstallTypes";
import type { JsonObject } from "../fullSitePackage/types";
import {
  isLifecycleCapablePublishKind,
  type FullSiteNativeSnapshot,
  type FullSiteResourceAdapterRegistry,
} from "./adapterTypes";
import {
  buildFullSiteDurableAfterSnapshotV1,
  type FullSiteDurableAfterSnapshotV1,
} from "./staging";
import {
  toSagaApplyInput,
  type PreparedFullSiteSaga,
  type PreparedFullSiteSagaItem,
} from "./preparedSaga";

export type ExecutedFullSiteResource = Readonly<{
  identity: string;
  id: string;
  operation: FullSiteInstallPlanItem["operation"];
}>;

const phaseSnapshot = (
  item: PreparedFullSiteSagaItem,
  phase: FullSiteDurableAfterSnapshotV1["recovery"]["phase"]
): JsonObject =>
  buildFullSiteDurableAfterSnapshotV1({
    complete: item.targets.complete,
    staged: item.targets.staged,
    phase,
  }) as unknown as JsonObject;

const recordPhase = async (
  input: Readonly<{
    ledger: FullSiteInstallLedgerPort;
    ownerRunId: string;
    item: PreparedFullSiteSagaItem;
    status: "planned" | "success";
    phase: FullSiteDurableAfterSnapshotV1["recovery"]["phase"];
  }>
): Promise<void> => {
  await input.ledger.recordItem({
    runId: input.ownerRunId,
    position: input.item.operation.position,
    kind: input.item.operation.kind,
    key: input.item.operation.key,
    operation: input.item.operation.operation,
    status: input.status,
    beforeSnapshot: input.item.beforeSnapshot as JsonObject | null,
    afterSnapshot: phaseSnapshot(input.item, input.phase),
    rollbackAction: input.item.rollbackAction,
    error: null,
  });
};

const assertExactSnapshot = (
  actual: FullSiteNativeSnapshot,
  expected: FullSiteNativeSnapshot
): void => {
  if (!isDeepStrictEqual(actual, expected)) throw new Error("site_package_state_changed");
};

const applyPreparedNonSettingItem = async (
  input: Readonly<{
    item: PreparedFullSiteSagaItem;
    actorId: string;
    ownerRunId: string;
    adapters: FullSiteResourceAdapterRegistry;
    ledger: FullSiteInstallLedgerPort;
  }>
): Promise<void> => {
  const { item } = input;
  if (item.operation.operation === "noop") {
    await recordPhase({ ...input, status: "success", phase: "complete" });
    return;
  }
  const adapter = input.adapters[item.operation.kind];
  const target = item.targets.staged ?? item.targets.complete;
  const applyInput = toSagaApplyInput(item, target, input.actorId);
  const result = isLifecycleCapablePublishKind(item.operation.kind)
    ? await adapter.applyStaged(applyInput)
    : await adapter.applyDesired(applyInput);
  if (result.id !== item.intendedId) throw new Error("site_package_state_changed");
  const current = await adapter.captureSnapshotById(item.intendedId);
  assertExactSnapshot(current, target);
  await recordPhase({
    ...input,
    status: "success",
    phase: item.targets.staged ? "staged" : "complete",
  });
};

const applyPreparedSettings = async (
  input: Readonly<{
    items: readonly PreparedFullSiteSagaItem[];
    actorId: string;
    ownerRunId: string;
    adapters: FullSiteResourceAdapterRegistry;
    ledger: FullSiteInstallLedgerPort;
  }>
): Promise<void> => {
  const mutations = input.items.filter((item) => item.operation.operation !== "noop");
  if (mutations.length > 0) {
    const results = await input.adapters.setting.applySettingsBatchAtomic({
      items: mutations.map((item) => toSagaApplyInput(item, item.targets.complete, input.actorId)),
      actorId: input.actorId,
    });
    if (results.length !== mutations.length) throw new Error("setting_batch_write_failed");
    const resultsById = new Map(results.map((snapshot) => [snapshot.id, snapshot]));
    for (const item of mutations) {
      const snapshot = resultsById.get(item.intendedId);
      if (!snapshot) throw new Error("setting_batch_write_failed");
      assertExactSnapshot(snapshot, item.targets.complete);
    }
  }
  for (const item of input.items) {
    if (item.operation.operation === "noop") {
      await recordPhase({ ...input, item, status: "success", phase: "complete" });
      continue;
    }
    const current = await input.adapters.setting.captureSnapshotById(item.intendedId);
    assertExactSnapshot(current, item.targets.complete);
    await recordPhase({ ...input, item, status: "success", phase: "complete" });
  }
};

const publishPreparedLifecycle = async (
  input: Readonly<{
    items: readonly PreparedFullSiteSagaItem[];
    actorId: string;
    ownerRunId: string;
    adapters: FullSiteResourceAdapterRegistry;
    ledger: FullSiteInstallLedgerPort;
  }>
): Promise<void> => {
  for (const item of input.items) {
    if (!item.targets.staged) continue;
    const adapter = input.adapters[item.operation.kind];
    if (!adapter.publishSnapshotAtomic) throw new Error("site_package_publish_unsupported");
    await recordPhase({ ...input, item, status: "success", phase: "publish_prepared" });
    await adapter.publishSnapshotAtomic({
      id: item.intendedId,
      expectedCurrent: item.targets.staged,
      target: item.targets.complete,
      actorId: input.actorId,
    });
    const current = await adapter.captureSnapshotById(item.intendedId);
    assertExactSnapshot(current, item.targets.complete);
    await recordPhase({ ...input, item, status: "success", phase: "complete" });
  }
};

export const executePreparedPlanWithDomainAtomicAdapters = async (
  input: Readonly<{
    saga: PreparedFullSiteSaga;
    actorId: string;
    ownerRunId: string;
    adapters: FullSiteResourceAdapterRegistry;
    ledger: FullSiteInstallLedgerPort;
  }>
): Promise<readonly ExecutedFullSiteResource[]> => {
  const nonSettings = input.saga.prepared.filter((item) => item.operation.kind !== "setting");
  for (const item of nonSettings) {
    await applyPreparedNonSettingItem({ ...input, item });
  }
  await applyPreparedSettings({
    ...input,
    items: input.saga.prepared.filter((item) => item.operation.kind === "setting"),
  });
  await publishPreparedLifecycle({
    ...input,
    items: nonSettings.filter((item) => item.targets.staged !== null),
  });
  return input.saga.prepared.map((item) => ({
    identity: item.operation.identity,
    id: item.intendedId,
    operation: item.operation.operation,
  }));
};

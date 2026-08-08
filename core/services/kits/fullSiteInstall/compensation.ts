import { isDeepStrictEqual } from "node:util";

import {
  readFullSiteRollbackActionV1,
  readStrictInitializationPlanV1,
  toSafeFullSiteErrorCode,
  type FullSiteCurrentResourceResolver,
  type FullSiteInstallLedgerPort,
  type FullSiteInstallRun,
  type FullSiteResourceIdentity,
  type PersistedFullSiteInstallLedgerItem,
  type RawFullSiteInstallLedgerItem,
} from "../fullSiteInstallTypes";
import { compareFullSitePackageText } from "../fullSitePackage/schema";
import { PACKAGE_RESOURCE_KINDS, type JsonObject } from "../fullSitePackage/types";
import {
  isFullSiteNativeSnapshot,
  isJsonValue,
  type FullSiteNativeReversal,
  type FullSiteNativeSnapshot,
  type FullSiteRollbackAdapters,
} from "./adapterTypes";
import {
  classifyInterruptedSagaItems,
  fullSiteJsonValuesEqual,
  isValidFullSiteDurableSourceStatusPhaseV1,
  readFullSiteDurableAfterSnapshotV1,
  type FullSiteDurableAfterSnapshotV1,
  type FullSiteSagaRecoveryClassification,
} from "./staging";

export type { FullSiteRollbackAdapters, RollbackResourceAdapter } from "./adapterTypes";

const RESOURCE_KINDS = new Set<string>(PACKAGE_RESOURCE_KINDS);
const SOURCE_KEYS = new Set<PropertyKey>([
  "position",
  "kind",
  "key",
  "operation",
  "status",
  "beforeSnapshot",
  "afterSnapshot",
  "rollbackAction",
  "error",
]);

const isDirectPlainObject = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const hasExactKeys = (
  value: Record<PropertyKey, unknown>,
  expected: ReadonlySet<PropertyKey>
): boolean => {
  const keys = Reflect.ownKeys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
};

const invalidSource = (): never => {
  throw new Error("site_package_rollback_invalid_source");
};

const identityOf = (kind: string, key: string): FullSiteResourceIdentity =>
  `${kind}:${key}` as FullSiteResourceIdentity;

const readScalarFields = (raw: unknown) => {
  if (!isDirectPlainObject(raw)) return invalidSource();
  const source = raw;
  if (!hasExactKeys(source, SOURCE_KEYS)) return invalidSource();
  const position = Reflect.get(source, "position");
  const kind = Reflect.get(source, "kind");
  const key = Reflect.get(source, "key");
  const operation = Reflect.get(source, "operation");
  const status = Reflect.get(source, "status");
  const error = Reflect.get(source, "error");
  if (
    !Number.isSafeInteger(position) ||
    (position as number) < 0 ||
    typeof kind !== "string" ||
    !RESOURCE_KINDS.has(kind) ||
    typeof key !== "string" ||
    !key ||
    (operation !== "create" && operation !== "update" && operation !== "noop") ||
    (status !== "planned" && status !== "success" && status !== "failed" && status !== "skipped") ||
    (error !== null && typeof error !== "string")
  ) {
    return invalidSource();
  }
  return {
    source,
    position: position as number,
    kind: kind as PersistedFullSiteInstallLedgerItem["kind"],
    key,
    operation,
    status,
    error: error as string | null,
  } as const;
};

const readSnapshot = (value: unknown): FullSiteNativeSnapshot => {
  if (!isFullSiteNativeSnapshot(value)) return invalidSource();
  return {
    id: value.id,
    desired: structuredClone(value.desired),
  };
};

const readNullableJsonObject = (value: unknown): JsonObject | null => {
  if (value === null) return null;
  if (!isDirectPlainObject(value) || !isJsonValue(value)) return invalidSource();
  return structuredClone(value) as JsonObject;
};

export type PreflightedRollbackEvidenceBase = Readonly<{
  identity: FullSiteResourceIdentity;
  persistedSourceItem: PersistedFullSiteInstallLedgerItem;
  durableAfter: FullSiteDurableAfterSnapshotV1;
  finalTarget: FullSiteNativeSnapshot;
  phase: "prepared" | "staged" | "publish_prepared" | "complete";
}>;

export type PreflightedRollbackEvidence = PreflightedRollbackEvidenceBase &
  (
    | Readonly<{
        operation: "create";
        before: null;
        stagedTarget: FullSiteNativeSnapshot | null;
      }>
    | Readonly<{
        operation: "update";
        before: FullSiteNativeSnapshot;
        stagedTarget: FullSiteNativeSnapshot | null;
      }>
    | Readonly<{
        operation: "noop";
        before: FullSiteNativeSnapshot;
        stagedTarget: null;
      }>
  );

const validateInitializationManifest = (
  parsed: readonly PreflightedRollbackEvidence[],
  value: unknown
): void => {
  if (value === undefined) return;
  const plan = (() => {
    try {
      return readStrictInitializationPlanV1(value);
    } catch {
      return invalidSource();
    }
  })();
  if (plan.length !== parsed.length) invalidSource();
  for (let index = 0; index < parsed.length; index += 1) {
    const evidence = parsed[index];
    const row = plan[index];
    if (
      !row ||
      row.position !== evidence.persistedSourceItem.position ||
      row.kind !== evidence.persistedSourceItem.kind ||
      row.key !== evidence.persistedSourceItem.key ||
      row.operation !== evidence.persistedSourceItem.operation
    ) {
      invalidSource();
    }
  }
};

export const preflightRollbackEvidence = (
  input: Readonly<{
    items: readonly RawFullSiteInstallLedgerItem[];
    initializationPlanV1: unknown;
  }>
): readonly PreflightedRollbackEvidence[] => {
  if (!Array.isArray(input.items)) invalidSource();
  const identities = new Set<FullSiteResourceIdentity>();
  const parsed = input.items.map((raw, index): PreflightedRollbackEvidence => {
    const scalar = readScalarFields(raw);
    if (scalar.position !== index || scalar.status === "failed" || scalar.status === "skipped") {
      return invalidSource();
    }
    const identity = identityOf(scalar.kind, scalar.key);
    if (identities.has(identity)) return invalidSource();
    identities.add(identity);
    const beforeValue = Reflect.get(scalar.source, "beforeSnapshot");
    const afterValue = Reflect.get(scalar.source, "afterSnapshot");
    const actionValue = Reflect.get(scalar.source, "rollbackAction");
    const before = beforeValue === null ? null : readSnapshot(beforeValue);
    const durableAfter = readFullSiteDurableAfterSnapshotV1(afterValue);
    const rollbackAction = readNullableJsonObject(actionValue);
    if (!durableAfter) return invalidSource();
    if (
      scalar.error !== null ||
      !isValidFullSiteDurableSourceStatusPhaseV1({
        operation: scalar.operation,
        status: scalar.status,
        phase: durableAfter.recovery.phase,
        stagedSnapshot: durableAfter.recovery.stagedSnapshot,
      })
    ) {
      return invalidSource();
    }
    const persistedSourceItem: PersistedFullSiteInstallLedgerItem = {
      position: scalar.position,
      kind: scalar.kind,
      key: scalar.key,
      operation: scalar.operation,
      status: scalar.status,
      beforeSnapshot: before ? (structuredClone(before) as JsonObject) : null,
      afterSnapshot: structuredClone(afterValue) as JsonObject,
      rollbackAction,
      error: null,
    };
    const finalTarget: FullSiteNativeSnapshot = {
      id: durableAfter.id,
      desired: structuredClone(durableAfter.desired),
    };
    const stagedTarget = durableAfter.recovery.stagedSnapshot;
    const base = {
      identity,
      persistedSourceItem,
      durableAfter,
      finalTarget,
      phase: durableAfter.recovery.phase,
    } as const;
    if (scalar.operation === "create") {
      if (before !== null) return invalidSource();
      return { ...base, operation: "create", before: null, stagedTarget };
    }
    if (!before || before.id !== durableAfter.id) return invalidSource();
    if (scalar.operation === "noop") {
      if (stagedTarget !== null || !fullSiteJsonValuesEqual(before.desired, durableAfter.desired)) {
        return invalidSource();
      }
      return { ...base, operation: "noop", before, stagedTarget: null };
    }
    return { ...base, operation: "update", before, stagedTarget };
  });
  validateInitializationManifest(parsed, input.initializationPlanV1);
  return Object.freeze(parsed);
};

const jsonEqual = (left: unknown, right: unknown): boolean => {
  if (left === null || right === null) return left === right;
  return isJsonValue(left) && isJsonValue(right) && fullSiteJsonValuesEqual(left, right);
};

export const preflightPriorRollbackSuccessOutcomes = (
  input: Readonly<{
    sourceItems: readonly RawFullSiteInstallLedgerItem[];
    priorOutcomes: readonly RawFullSiteInstallLedgerItem[];
  }>
): ReadonlySet<FullSiteResourceIdentity> => {
  if (!Array.isArray(input.sourceItems) || !Array.isArray(input.priorOutcomes)) invalidSource();
  const sources = new Map<string, ReturnType<typeof readScalarFields>>();
  for (const raw of input.sourceItems) {
    const scalar = readScalarFields(raw);
    const key = `${scalar.position}:${scalar.kind}:${scalar.key}`;
    if (sources.has(key)) invalidSource();
    sources.set(key, scalar);
  }
  const seen = new Set<string>();
  const completed = new Set<FullSiteResourceIdentity>();
  for (const raw of input.priorOutcomes) {
    const outcome = readScalarFields(raw);
    const sourceKey = `${outcome.position}:${outcome.kind}:${outcome.key}`;
    const source = sources.get(sourceKey);
    if (!source || seen.has(sourceKey) || outcome.status === "planned") {
      return invalidSource();
    }
    seen.add(sourceKey);
    if (
      outcome.operation !== source.operation ||
      !jsonEqual(
        Reflect.get(outcome.source, "beforeSnapshot"),
        Reflect.get(source.source, "afterSnapshot")
      ) ||
      !jsonEqual(
        Reflect.get(outcome.source, "afterSnapshot"),
        Reflect.get(source.source, "beforeSnapshot")
      ) ||
      !jsonEqual(
        Reflect.get(outcome.source, "rollbackAction"),
        Reflect.get(source.source, "rollbackAction")
      ) ||
      (outcome.status === "success" && outcome.error !== null)
    ) {
      invalidSource();
    }
    if (outcome.status === "success") {
      completed.add(identityOf(outcome.kind, outcome.key));
    }
  }
  return completed;
};

export type RollbackDependencyGraph = Readonly<{
  dependencyKnowledge: "v1" | "legacy-unknown";
  nodes: ReadonlyMap<FullSiteResourceIdentity, PersistedFullSiteInstallLedgerItem>;
  dependencies: ReadonlyMap<FullSiteResourceIdentity, ReadonlySet<FullSiteResourceIdentity>>;
  dependents: ReadonlyMap<FullSiteResourceIdentity, ReadonlySet<FullSiteResourceIdentity>>;
}>;

export const buildRollbackDependencyGraph = (
  input: Readonly<{
    items: readonly PersistedFullSiteInstallLedgerItem[];
    declaredVersion: unknown;
    readAction?: typeof readFullSiteRollbackActionV1;
  }>
): RollbackDependencyGraph => {
  const readAction = input.readAction ?? readFullSiteRollbackActionV1;
  const knowledge =
    input.declaredVersion === undefined
      ? "legacy-unknown"
      : input.declaredVersion === 1
        ? "v1"
        : invalidSource();
  const nodes = new Map<FullSiteResourceIdentity, PersistedFullSiteInstallLedgerItem>();
  for (const item of input.items) {
    const identity = identityOf(item.kind, item.key);
    if (nodes.has(identity)) throw new Error("site_package_rollback_dependency_invalid");
    nodes.set(identity, item);
  }
  const dependencies = new Map<FullSiteResourceIdentity, Set<FullSiteResourceIdentity>>();
  const dependents = new Map<FullSiteResourceIdentity, Set<FullSiteResourceIdentity>>();
  for (const identity of nodes.keys()) {
    dependencies.set(identity, new Set());
    dependents.set(identity, new Set());
  }
  if (knowledge === "v1") {
    for (const [identity, item] of nodes) {
      const action = readAction(item.rollbackAction);
      if (!action) throw new Error("site_package_rollback_dependency_invalid");
      for (const dependency of action.dependencies) {
        if (dependency === identity || !nodes.has(dependency)) {
          throw new Error("site_package_rollback_dependency_invalid");
        }
        dependencies.get(identity)!.add(dependency);
        dependents.get(dependency)!.add(identity);
      }
    }
    const visiting = new Set<FullSiteResourceIdentity>();
    const visited = new Set<FullSiteResourceIdentity>();
    const visit = (identity: FullSiteResourceIdentity): void => {
      if (visiting.has(identity)) throw new Error("site_package_rollback_dependency_invalid");
      if (visited.has(identity)) return;
      visiting.add(identity);
      for (const dependency of dependencies.get(identity) ?? []) visit(dependency);
      visiting.delete(identity);
      visited.add(identity);
    };
    for (const identity of nodes.keys()) visit(identity);
  }
  return Object.freeze({
    dependencyKnowledge: knowledge,
    nodes,
    dependencies,
    dependents,
  });
};

export const collectTransitiveRollbackDependencies = (
  input: Readonly<{
    graph: RollbackDependencyGraph;
    identity: FullSiteResourceIdentity;
  }>
): ReadonlySet<FullSiteResourceIdentity> => {
  if (!input.graph.nodes.has(input.identity)) {
    throw new Error("site_package_rollback_dependency_invalid");
  }
  const output = new Set<FullSiteResourceIdentity>();
  const visit = (identity: FullSiteResourceIdentity): void => {
    for (const dependency of input.graph.dependencies.get(identity) ?? []) {
      if (output.has(dependency)) continue;
      output.add(dependency);
      visit(dependency);
    }
  };
  visit(input.identity);
  return output;
};

const isAbsentSettingSnapshot = (snapshot: FullSiteNativeSnapshot | null): boolean =>
  Boolean(
    snapshot && snapshot.desired.present === false && Reflect.ownKeys(snapshot.desired).length === 1
  );

const capturedIsAbsent = (
  kind: PersistedFullSiteInstallLedgerItem["kind"],
  snapshot: FullSiteNativeSnapshot | null
): boolean => snapshot === null || (kind === "setting" && isAbsentSettingSnapshot(snapshot));

export const preflightPriorRollbackSuccessNativeState = async (
  input: Readonly<{
    parsed: readonly PreflightedRollbackEvidence[];
    completedIdentities: ReadonlySet<FullSiteResourceIdentity>;
    adapters: FullSiteRollbackAdapters;
  }>
): Promise<void> => {
  for (const evidence of input.parsed) {
    if (!input.completedIdentities.has(evidence.identity)) continue;
    let current: FullSiteNativeSnapshot | null;
    try {
      current = await input.adapters[evidence.persistedSourceItem.kind].captureSnapshotByIdOrNull(
        evidence.finalTarget.id
      );
    } catch {
      throw new Error("site_package_rollback_conflict");
    }
    const valid =
      evidence.operation === "create"
        ? capturedIsAbsent(evidence.persistedSourceItem.kind, current)
        : current !== null && isDeepStrictEqual(current, evidence.before);
    if (!valid) throw new Error("site_package_rollback_conflict");
  }
};

export type RefinedRollbackItem =
  | Readonly<{
      state: "noop";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Extract<PreflightedRollbackEvidence, { operation: "noop" }>;
    }>
  | Readonly<{
      state: "already_recovered";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>;
    }>
  | Readonly<{
      state: "applied";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>;
      reversal: FullSiteNativeReversal;
    }>
  | Readonly<{
      state: "conflict";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>;
      error: "site_package_rollback_conflict";
    }>;

const currentMatchesAppliedTarget = (
  current: FullSiteNativeSnapshot,
  evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>,
  sourceAllowsStaged: boolean
): boolean =>
  isDeepStrictEqual(current, evidence.finalTarget) ||
  Boolean(
    sourceAllowsStaged && evidence.stagedTarget && isDeepStrictEqual(current, evidence.stagedTarget)
  );

export const refineAllRollbackStates = async (
  input: Readonly<{
    parsed: readonly PreflightedRollbackEvidence[];
    classifications: readonly FullSiteSagaRecoveryClassification[];
    adapters: FullSiteRollbackAdapters;
    currentSource: FullSiteInstallRun;
    ledger: FullSiteInstallLedgerPort;
    completedIdentities: ReadonlySet<FullSiteResourceIdentity>;
  }>
): Promise<readonly RefinedRollbackItem[]> => {
  if (input.classifications.length !== input.parsed.length) invalidSource();
  const output: RefinedRollbackItem[] = [];
  for (let index = 0; index < input.parsed.length; index += 1) {
    const evidence = input.parsed[index];
    const classification = input.classifications[index];
    if (!classification || classification.identity !== evidence.identity) invalidSource();
    if (input.completedIdentities.has(evidence.identity)) continue;
    if (evidence.operation === "noop") {
      output.push({ state: "noop", classification, evidence });
      continue;
    }
    let current: FullSiteNativeSnapshot | null;
    try {
      current = await input.adapters[evidence.persistedSourceItem.kind].captureSnapshotByIdOrNull(
        evidence.finalTarget.id
      );
    } catch {
      output.push({
        state: "conflict",
        classification,
        evidence,
        error: "site_package_rollback_conflict",
      });
      continue;
    }
    if (
      evidence.operation === "create" &&
      capturedIsAbsent(evidence.persistedSourceItem.kind, current)
    ) {
      output.push({ state: "already_recovered", classification, evidence });
      continue;
    }
    if (evidence.operation === "update" && current && isDeepStrictEqual(current, evidence.before)) {
      output.push({ state: "already_recovered", classification, evidence });
      continue;
    }
    if (
      !current ||
      !currentMatchesAppliedTarget(current, evidence, input.currentSource.status !== "success")
    ) {
      output.push({
        state: "conflict",
        classification,
        evidence,
        error: "site_package_rollback_conflict",
      });
      continue;
    }
    if (input.currentSource.status === "success") {
      const managed = await input.ledger.findManagedResourceEvidence({
        packageKey: input.currentSource.packageKey,
        kind: evidence.persistedSourceItem.kind,
        key: evidence.persistedSourceItem.key,
      });
      if (
        !managed ||
        managed.runId !== input.currentSource.id ||
        managed.resourceId !== evidence.finalTarget.id ||
        managed.successful !== true ||
        managed.rolledBack !== false
      ) {
        output.push({
          state: "conflict",
          classification,
          evidence,
          error: "site_package_rollback_conflict",
        });
        continue;
      }
    }
    output.push({
      state: "applied",
      classification,
      evidence,
      reversal:
        evidence.operation === "create"
          ? {
              operation: "create",
              id: evidence.finalTarget.id,
              expectedCurrent: current,
              target: null,
            }
          : {
              operation: "update",
              id: evidence.finalTarget.id,
              expectedCurrent: current,
              target: evidence.before,
            },
    });
  }
  return Object.freeze(output);
};

export type ReverseSettingsBatchSchedulerInput = Readonly<{
  items: readonly RefinedRollbackItem[];
  actorId: string;
  adapter: FullSiteRollbackAdapters["setting"];
}>;

export type RollbackNativeResult = Readonly<{
  refined: Exclude<RefinedRollbackItem, { state: "conflict" }>;
  outcome: "reversed" | "already_recovered" | "noop";
}>;

const compareRefined = (left: RefinedRollbackItem, right: RefinedRollbackItem): number =>
  right.evidence.persistedSourceItem.position - left.evidence.persistedSourceItem.position ||
  compareFullSitePackageText(
    left.evidence.persistedSourceItem.kind,
    right.evidence.persistedSourceItem.kind
  ) ||
  compareFullSitePackageText(
    left.evidence.persistedSourceItem.key,
    right.evidence.persistedSourceItem.key
  );

export const reverseSettingsBatch = async (
  input: ReverseSettingsBatchSchedulerInput
): Promise<readonly RollbackNativeResult[]> => {
  if (
    input.items.some(
      (item, index) =>
        item.evidence.persistedSourceItem.kind !== "setting" ||
        item.state === "conflict" ||
        (index > 0 && compareRefined(input.items[index - 1], item) > 0)
    )
  ) {
    throw new Error("site_package_rollback_conflict");
  }
  const applied = input.items.filter(
    (item): item is Extract<RefinedRollbackItem, { state: "applied" }> => item.state === "applied"
  );
  if (applied.length > 0) {
    await input.adapter.reverseSettingsBatch({
      items: applied.map((item) => item.reversal),
      actorId: input.actorId,
    });
  }
  return input.items.map((item) => {
    if (item.state === "conflict") throw new Error("site_package_rollback_conflict");
    return {
      refined: item,
      outcome:
        item.state === "applied"
          ? "reversed"
          : item.state === "noop"
            ? "noop"
            : "already_recovered",
    };
  });
};

const recordRollbackOutcome = async (
  input: Readonly<{
    refined: RefinedRollbackItem;
    status: "success" | "failed" | "skipped";
    error: string | null;
    ledger: FullSiteInstallLedgerPort;
    rollbackRunId: string;
  }>
): Promise<void> => {
  const source = input.refined.evidence.persistedSourceItem;
  try {
    await input.ledger.recordItem({
      runId: input.rollbackRunId,
      position: source.position,
      kind: source.kind,
      key: source.key,
      operation: source.operation,
      status: input.status,
      beforeSnapshot: source.afterSnapshot,
      afterSnapshot: source.beforeSnapshot,
      rollbackAction: source.rollbackAction,
      error: input.error,
    });
  } catch {
    throw new Error("site_package_rollback_ledger_failed");
  }
};

const reverseOne = async (
  input: Readonly<{
    refined: RefinedRollbackItem;
    actorId: string;
    adapters: FullSiteRollbackAdapters;
  }>
): Promise<void> => {
  if (input.refined.state === "noop" || input.refined.state === "already_recovered") return;
  if (input.refined.state === "conflict") throw new Error(input.refined.error);
  const adapter = input.adapters[input.refined.evidence.persistedSourceItem.kind];
  if (input.refined.reversal.operation === "create") {
    await adapter.deleteSnapshotAtomic({
      id: input.refined.reversal.id,
      expectedCurrent: input.refined.reversal.expectedCurrent,
      actorId: input.actorId,
    });
    return;
  }
  await adapter.restoreSnapshotAtomic({
    id: input.refined.reversal.id,
    expectedCurrent: input.refined.reversal.expectedCurrent,
    target: input.refined.reversal.target,
    actorId: input.actorId,
  });
};

export const compensateDependencyBranches = async (
  input: Readonly<{
    graph: RollbackDependencyGraph;
    refinements: readonly RefinedRollbackItem[];
    actorId: string;
    adapters: FullSiteRollbackAdapters;
    ledger: FullSiteInstallLedgerPort;
    rollbackRunId: string;
    completedIdentities: ReadonlySet<FullSiteResourceIdentity>;
    currentSource: FullSiteInstallRun;
  }>
): Promise<void> => {
  const remaining = new Map(
    input.refinements.map((refined) => [refined.evidence.identity, refined])
  );
  let primary: Error | null = null;
  const block = async (failed: readonly FullSiteResourceIdentity[]): Promise<void> => {
    const blocked = new Set<FullSiteResourceIdentity>();
    if (input.graph.dependencyKnowledge === "legacy-unknown") {
      for (const identity of remaining.keys()) blocked.add(identity);
    } else {
      for (const identity of failed) {
        for (const dependency of collectTransitiveRollbackDependencies({
          graph: input.graph,
          identity,
        })) {
          if (remaining.has(dependency)) blocked.add(dependency);
        }
      }
    }
    for (const identity of blocked) {
      const refined = remaining.get(identity);
      if (!refined) continue;
      await recordRollbackOutcome({
        refined,
        status: "skipped",
        error: "site_package_rollback_dependency_blocked",
        ledger: input.ledger,
        rollbackRunId: input.rollbackRunId,
      });
      remaining.delete(identity);
    }
  };

  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([identity]) =>
        [...(input.graph.dependents.get(identity) ?? [])].every(
          (dependent) => !remaining.has(dependent)
        )
      )
      .map(([, refined]) => refined)
      .sort(compareRefined);
    if (ready.length === 0) throw new Error("site_package_rollback_dependency_invalid");
    const readySettings = ready.filter(
      (refined) => refined.evidence.persistedSourceItem.kind === "setting"
    );
    if (readySettings.length > 0) {
      try {
        await reverseSettingsBatch({
          items: readySettings,
          actorId: input.actorId,
          adapter: input.adapters.setting,
        });
        for (const refined of readySettings) {
          await recordRollbackOutcome({
            refined,
            status: "success",
            error: null,
            ledger: input.ledger,
            rollbackRunId: input.rollbackRunId,
          });
          remaining.delete(refined.evidence.identity);
        }
      } catch (error) {
        if (error instanceof Error && error.message === "site_package_rollback_ledger_failed") {
          throw error;
        }
        const failure = new Error(toSafeFullSiteErrorCode(error, "site_package_rollback_failed"));
        primary ??= failure;
        const failedIdentities: FullSiteResourceIdentity[] = [];
        for (const refined of readySettings) {
          await recordRollbackOutcome({
            refined,
            status: "failed",
            error: failure.message,
            ledger: input.ledger,
            rollbackRunId: input.rollbackRunId,
          });
          failedIdentities.push(refined.evidence.identity);
          remaining.delete(refined.evidence.identity);
        }
        await block(failedIdentities);
      }
    }
    for (const refined of ready.filter(
      (candidate) => candidate.evidence.persistedSourceItem.kind !== "setting"
    )) {
      if (!remaining.has(refined.evidence.identity)) continue;
      try {
        await reverseOne({ refined, actorId: input.actorId, adapters: input.adapters });
        await recordRollbackOutcome({
          refined,
          status: "success",
          error: null,
          ledger: input.ledger,
          rollbackRunId: input.rollbackRunId,
        });
        remaining.delete(refined.evidence.identity);
      } catch (error) {
        if (error instanceof Error && error.message === "site_package_rollback_ledger_failed") {
          throw error;
        }
        const failure = new Error(toSafeFullSiteErrorCode(error, "site_package_rollback_failed"));
        primary ??= failure;
        await recordRollbackOutcome({
          refined,
          status: "failed",
          error: failure.message,
          ledger: input.ledger,
          rollbackRunId: input.rollbackRunId,
        });
        remaining.delete(refined.evidence.identity);
        await block([refined.evidence.identity]);
      }
    }
  }
  if (primary) throw primary;
};

export type CompensateItemsInput = Readonly<{
  items: readonly RawFullSiteInstallLedgerItem[];
  priorOutcomes: readonly RawFullSiteInstallLedgerItem[];
  currentSource: FullSiteInstallRun;
  actorId: string;
  adapters: FullSiteRollbackAdapters;
  ledger: FullSiteInstallLedgerPort;
  rollbackRunId: string;
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}>;

export const compensateItems = async (input: CompensateItemsInput): Promise<void> => {
  const parsed = preflightRollbackEvidence({
    items: input.items,
    initializationPlanV1: input.currentSource.options?.initializationPlanV1,
  });
  const completedIdentities = preflightPriorRollbackSuccessOutcomes({
    sourceItems: input.items,
    priorOutcomes: input.priorOutcomes,
  });
  const persistedSourceItems = parsed.map((evidence) => evidence.persistedSourceItem);
  const graph = buildRollbackDependencyGraph({
    items: persistedSourceItems,
    declaredVersion: input.currentSource.options?.rollbackDependencySchemaVersion,
    readAction: readFullSiteRollbackActionV1,
  });
  await preflightPriorRollbackSuccessNativeState({
    parsed,
    completedIdentities,
    adapters: input.adapters,
  });
  const classifications = await classifyInterruptedSagaItems({
    items: persistedSourceItems,
    resolveCurrentResource: input.resolveCurrentResource,
  });
  const refinements = await refineAllRollbackStates({
    parsed,
    classifications,
    adapters: input.adapters,
    currentSource: input.currentSource,
    ledger: input.ledger,
    completedIdentities,
  });
  await compensateDependencyBranches({
    graph,
    refinements,
    actorId: input.actorId,
    adapters: input.adapters,
    ledger: input.ledger,
    rollbackRunId: input.rollbackRunId,
    completedIdentities,
    currentSource: input.currentSource,
  });
};

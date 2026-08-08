import { isDeepStrictEqual } from "node:util";

import {
  buildReferencePlan,
  resolvePlannedPackageResourceRefs,
  type PlannedPackageResource,
} from "./fullSitePackage/referenceGraph";
import type { FullSitePackageV1, JsonObject } from "./fullSitePackage/types";
import type {
  FullSiteInstallPlan,
  FullSiteInstallPlanItem,
  FullSitePlanningDesiredNormalizer,
  FullSitePlanningSnapshotLoader,
  FullSitePlanningSnapshotRow,
  FullSiteResourceIdentity,
} from "./fullSiteInstallTypes";

const PLACEHOLDER_ID_PREFIX = "00000000-0000-4000-8000-";

export class FullSiteInstallPlannerError extends Error {
  readonly code: "site_package_conflict" | "site_package_invalid";
  readonly identity: string;

  constructor(code: "site_package_conflict" | "site_package_invalid", identity: string) {
    super(code);
    this.name = "FullSiteInstallPlannerError";
    this.code = code;
    this.identity = identity;
  }
}

export type FullSiteInstallPlannerDeps = Readonly<{
  loadPlanningSnapshot: FullSitePlanningSnapshotLoader;
  normalizeDesired?: FullSitePlanningDesiredNormalizer;
  allowSettingTakeover?: boolean;
}>;

const assertExactPlanningSnapshot = (
  resources: readonly PlannedPackageResource[],
  rows: readonly FullSitePlanningSnapshotRow[]
): readonly FullSitePlanningSnapshotRow[] => {
  if (!Array.isArray(rows) || rows.length !== resources.length) {
    throw new FullSiteInstallPlannerError("site_package_invalid", "planning_snapshot");
  }
  const identities = new Set<FullSiteResourceIdentity>();
  for (let index = 0; index < resources.length; index += 1) {
    const resource = resources[index];
    const row = rows[index];
    if (
      !row ||
      row.identity !== resource.identity ||
      identities.has(row.identity) ||
      (row.current !== null &&
        (typeof row.current.id !== "string" ||
          !row.current.id ||
          !row.current.desired ||
          Array.isArray(row.current.desired))) ||
      (row.evidence !== null &&
        (typeof row.evidence.runId !== "string" ||
          !row.evidence.runId ||
          typeof row.evidence.resourceId !== "string" ||
          !row.evidence.resourceId))
    ) {
      throw new FullSiteInstallPlannerError("site_package_invalid", resource.identity);
    }
    identities.add(row.identity);
  }
  return rows;
};

const normalizePlanningDesired = async (
  input: Readonly<{
    normalizer: FullSitePlanningDesiredNormalizer | undefined;
    kind: FullSiteInstallPlanItem["kind"];
    key: string;
    identity: FullSiteResourceIdentity;
    currentId: string;
    desired: JsonObject;
  }>
): Promise<JsonObject> => {
  if (!input.normalizer) {
    throw new FullSiteInstallPlannerError("site_package_invalid", input.identity);
  }
  try {
    const normalized = await input.normalizer({
      kind: input.kind,
      key: input.key,
      currentId: input.currentId,
      desired: input.desired,
    });
    if (!normalized || Array.isArray(normalized) || typeof normalized !== "object") {
      throw new Error("site_package_invalid");
    }
    return normalized;
  } catch {
    throw new FullSiteInstallPlannerError("site_package_invalid", input.identity);
  }
};

const rawDesired = (resource: PlannedPackageResource): JsonObject =>
  resource.seed.desired as unknown as JsonObject;

const buildOperations = async (
  pkg: FullSitePackageV1,
  ordered: readonly PlannedPackageResource[],
  rows: readonly FullSitePlanningSnapshotRow[],
  deps: FullSiteInstallPlannerDeps
): Promise<FullSiteInstallPlan> => {
  const resolvedIds = new Map<FullSiteResourceIdentity, string>();
  const createdResourceIdentities = new Set<FullSiteResourceIdentity>();

  for (let index = 0; index < ordered.length; index += 1) {
    const resource = ordered[index];
    const current = rows[index].current;
    if (!current) createdResourceIdentities.add(resource.identity);
    resolvedIds.set(
      resource.identity,
      current?.id ?? `${PLACEHOLDER_ID_PREFIX}${String(index + 1).padStart(12, "0")}`
    );
  }

  const operations: FullSiteInstallPlanItem[] = [];
  for (let position = 0; position < ordered.length; position += 1) {
    const resource = ordered[position];
    const row = rows[position];
    const current = row.current;
    const managedRunId =
      current && row.evidence?.resourceId === current.id ? row.evidence.runId : null;

    if (
      current &&
      managedRunId === null &&
      (resource.kind !== "setting" || deps.allowSettingTakeover !== true)
    ) {
      throw new FullSiteInstallPlannerError("site_package_conflict", resource.identity);
    }

    if (!current) {
      operations.push({
        position,
        identity: resource.identity,
        kind: resource.kind,
        key: resource.key,
        operation: "create",
        desired: rawDesired(resource),
        currentId: null,
        currentDesired: null,
        managedRunId: null,
        dependencies: resource.dependencies,
      });
      continue;
    }

    let resolvedDesired: JsonObject;
    try {
      resolvedDesired = resolvePlannedPackageResourceRefs(resource, resolvedIds);
    } catch {
      throw new FullSiteInstallPlannerError("site_package_invalid", resource.identity);
    }
    const normalizedDesired = await normalizePlanningDesired({
      normalizer: deps.normalizeDesired,
      kind: resource.kind,
      key: resource.key,
      identity: resource.identity,
      currentId: current.id,
      desired: resolvedDesired,
    });
    const referencesCreatedResource = resource.references.some((reference) =>
      createdResourceIdentities.has(reference.targetIdentity)
    );

    operations.push({
      position,
      identity: resource.identity,
      kind: resource.kind,
      key: resource.key,
      operation:
        referencesCreatedResource || !isDeepStrictEqual(current.desired, normalizedDesired)
          ? "update"
          : "noop",
      desired: rawDesired(resource),
      currentId: current.id,
      currentDesired: current.desired,
      managedRunId,
      dependencies: resource.dependencies,
    });
  }

  return { packageKey: pkg.key, operations };
};

export const planFullSiteInstall: {
  (pkg: FullSitePackageV1, deps: FullSiteInstallPlannerDeps): Promise<FullSiteInstallPlan>;
  (
    pkg: FullSitePackageV1,
    referencePlan: readonly PlannedPackageResource[],
    deps: FullSiteInstallPlannerDeps
  ): Promise<FullSiteInstallPlan>;
} = async (
  pkg: FullSitePackageV1,
  referencePlanOrDeps: readonly PlannedPackageResource[] | FullSiteInstallPlannerDeps,
  maybeDeps?: FullSiteInstallPlannerDeps
): Promise<FullSiteInstallPlan> => {
  const referencePlan = maybeDeps
    ? (referencePlanOrDeps as readonly PlannedPackageResource[])
    : buildReferencePlan(pkg);
  const deps = maybeDeps ?? (referencePlanOrDeps as FullSiteInstallPlannerDeps);
  const rows = assertExactPlanningSnapshot(
    referencePlan,
    await deps.loadPlanningSnapshot(referencePlan)
  );
  return buildOperations(pkg, referencePlan, rows, deps);
};

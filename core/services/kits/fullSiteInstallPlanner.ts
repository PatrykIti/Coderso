import { isDeepStrictEqual } from "node:util";

import { buildReferencePlan } from "./fullSitePackage/referenceGraph";
import type { FullSitePackageV1, JsonObject, JsonValue } from "./fullSitePackage/types";
import type {
  CurrentResourceState,
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteInstallPlan,
  FullSiteInstallPlanItem,
  FullSitePlanningDesiredNormalizer,
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

export type FullSiteInstallPlannerDeps = {
  ledger: FullSiteInstallLedgerPort;
  resolveCurrentResource: FullSiteCurrentResourceResolver;
  normalizeDesired?: FullSitePlanningDesiredNormalizer;
  allowSettingTakeover?: boolean;
};

type PlanningRefResolution = {
  value: JsonValue;
  referencesCreatedResource: boolean;
};

const resolvePlanningRefs = (
  value: JsonValue,
  resolvedIds: ReadonlyMap<string, string>,
  createdResourceIdentities: ReadonlySet<string>,
  identity: string
): PlanningRefResolution => {
  if (Array.isArray(value)) {
    const resolved = value.map((item) =>
      resolvePlanningRefs(item, resolvedIds, createdResourceIdentities, identity)
    );
    return {
      value: resolved.map((item) => item.value),
      referencesCreatedResource: resolved.some((item) => item.referencesCreatedResource),
    };
  }
  if (value === null || typeof value !== "object") {
    return { value, referencesCreatedResource: false };
  }
  const keys = Object.keys(value);
  if (keys.length === 2 && typeof value.ref === "string" && typeof value.key === "string") {
    const targetIdentity = `${value.ref}:${value.key}`;
    const id = resolvedIds.get(targetIdentity);
    if (!id) throw new FullSiteInstallPlannerError("site_package_invalid", identity);
    return {
      value: id,
      referencesCreatedResource: createdResourceIdentities.has(targetIdentity),
    };
  }
  const resolved = Object.entries(value).map(
    ([key, child]) =>
      [key, resolvePlanningRefs(child, resolvedIds, createdResourceIdentities, identity)] as const
  );
  return {
    value: Object.fromEntries(resolved.map(([key, child]) => [key, child.value])) as JsonObject,
    referencesCreatedResource: resolved.some(([, child]) => child.referencesCreatedResource),
  };
};

const normalizePlanningDesired = async (input: {
  normalizer: FullSitePlanningDesiredNormalizer | undefined;
  kind: FullSiteInstallPlanItem["kind"];
  key: string;
  identity: string;
  currentId: string;
  desired: JsonObject;
}): Promise<JsonObject> => {
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

export const planFullSiteInstall = async (
  pkg: FullSitePackageV1,
  deps: FullSiteInstallPlannerDeps
): Promise<FullSiteInstallPlan> => {
  const ordered = buildReferencePlan(pkg);
  const operations: FullSiteInstallPlanItem[] = [];
  const evidenceByIdentity = new Map(
    await Promise.all(
      ordered.map(
        async (resource) =>
          [
            resource.identity,
            await deps.ledger.findManagedResourceEvidence({
              packageKey: pkg.key,
              kind: resource.kind,
              key: resource.key,
            }),
          ] as const
      )
    )
  );
  const inspected: Array<{
    resource: (typeof ordered)[number];
    current: CurrentResourceState | null;
    managedRunId: string | null;
  }> = [];
  const resolvedIds = new Map<string, string>();
  const createdResourceIdentities = new Set<string>();

  for (const [index, resource] of ordered.entries()) {
    const evidence = evidenceByIdentity.get(resource.identity) ?? null;
    const inspectionSeed = {
      key: resource.seed.key,
      desired: resolvePlanningRefs(
        resource.seed.desired,
        resolvedIds,
        createdResourceIdentities,
        resource.identity
      ).value as JsonObject,
    };
    const current = await deps.resolveCurrentResource(
      resource.kind,
      inspectionSeed,
      undefined,
      evidence
    );
    const managedRunId =
      current &&
      evidence?.successful === true &&
      evidence.rolledBack === false &&
      evidence.resourceId === current.id
        ? evidence.runId
        : null;
    inspected.push({ resource, current, managedRunId });
    resolvedIds.set(
      resource.identity,
      current?.id ?? `${PLACEHOLDER_ID_PREFIX}${String(index + 1).padStart(12, "0")}`
    );
    if (!current) createdResourceIdentities.add(resource.identity);
  }
  const unmanaged = inspected.find(
    ({ resource, current, managedRunId }) =>
      current !== null &&
      managedRunId === null &&
      (resource.kind !== "setting" || !deps.allowSettingTakeover)
  );
  if (unmanaged) {
    throw new FullSiteInstallPlannerError("site_package_conflict", unmanaged.resource.identity);
  }

  for (const [position, { resource, current, managedRunId }] of inspected.entries()) {
    if (!current) {
      operations.push({
        position,
        identity: resource.identity,
        kind: resource.kind,
        key: resource.key,
        operation: "create",
        desired: resource.seed.desired,
        currentId: null,
        currentDesired: null,
        managedRunId: null,
        dependencies: resource.dependencies,
      });
      continue;
    }

    const refResolution = resolvePlanningRefs(
      resource.seed.desired,
      resolvedIds,
      createdResourceIdentities,
      resource.identity
    );
    const normalizedDesired = await normalizePlanningDesired({
      normalizer: deps.normalizeDesired,
      kind: resource.kind,
      key: resource.key,
      identity: resource.identity,
      currentId: current.id,
      desired: refResolution.value as JsonObject,
    });
    const operation =
      refResolution.referencesCreatedResource ||
      !isDeepStrictEqual(current.desired, normalizedDesired)
        ? "update"
        : "noop";

    if (resource.kind === "setting") {
      operations.push({
        position,
        identity: resource.identity,
        kind: resource.kind,
        key: resource.key,
        operation,
        desired: resource.seed.desired,
        currentId: current.id,
        currentDesired: current.desired,
        managedRunId,
        dependencies: resource.dependencies,
      });
      continue;
    }

    operations.push({
      position,
      identity: resource.identity,
      kind: resource.kind,
      key: resource.key,
      operation,
      desired: resource.seed.desired,
      currentId: current.id,
      currentDesired: current.desired,
      managedRunId,
      dependencies: resource.dependencies,
    });
  }

  return { packageKey: pkg.key, operations };
};

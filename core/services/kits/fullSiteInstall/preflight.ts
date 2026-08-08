import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";

import { validateEntryData } from "../../content/validation";
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallPlan,
  FullSiteInstallPlanItem,
} from "../fullSiteInstallTypes";
import type { JsonObject, JsonValue } from "../fullSitePackage/types";
import type { AdapterApplyInput, ResourceAdapter } from "./adapters";

const PLACEHOLDER_ID_PREFIX = "00000000-0000-4000-8000-";

export const resolveFullSiteRefs = (
  value: JsonValue,
  installedIds: ReadonlyMap<string, string>
): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((item) => resolveFullSiteRefs(item, installedIds));
  }
  if (value === null || typeof value !== "object") return value;
  const keys = Object.keys(value);
  if (keys.length === 2 && typeof value.ref === "string" && typeof value.key === "string") {
    const id = installedIds.get(`${value.ref}:${value.key}`);
    if (!id) throw new Error("site_package_ref_missing");
    return id;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, resolveFullSiteRefs(child, installedIds)])
  ) as JsonObject;
};

const adapterInput = (
  operation: FullSiteInstallPlanItem,
  desired: JsonObject,
  actorId: string
): AdapterApplyInput => ({
  operation: operation.currentId ? "update" : "create",
  currentId: operation.currentId,
  key: operation.key,
  desired,
  actorId,
});

const validateContentEntryData = (
  operation: FullSiteInstallPlanItem,
  plan: FullSiteInstallPlan
) => {
  if (operation.kind !== "content_entry") return;
  const ref = operation.desired.contentTypeId;
  if (
    !ref ||
    Array.isArray(ref) ||
    typeof ref !== "object" ||
    ref.ref !== "content_type" ||
    typeof ref.key !== "string"
  ) {
    throw new Error("content_entry_invalid");
  }
  const contentType = plan.operations.find(
    (candidate) => candidate.kind === "content_type" && candidate.key === ref.key
  );
  if (
    !contentType ||
    !contentType.desired.schema ||
    Array.isArray(contentType.desired.schema) ||
    typeof contentType.desired.schema !== "object" ||
    !operation.desired.data ||
    Array.isArray(operation.desired.data) ||
    typeof operation.desired.data !== "object"
  ) {
    throw new Error("content_entry_invalid");
  }
  const schemaFingerprint = createHash("sha256")
    .update(JSON.stringify(contentType.desired.schema))
    .digest("hex");
  validateEntryData(
    `full-site:${plan.packageKey}:${ref.key}:${schemaFingerprint}`,
    contentType.desired.schema,
    operation.desired.data
  );
};

export const validateFullSiteOperation = async (input: {
  operation: FullSiteInstallPlanItem;
  plan: FullSiteInstallPlan;
  desired: JsonObject;
  actorId: string;
  adapter: ResourceAdapter;
}): Promise<JsonObject> => {
  validateContentEntryData(input.operation, input.plan);
  const normalized = await input.adapter.validateDesired(
    adapterInput(input.operation, input.desired, input.actorId)
  );
  return normalized ?? input.desired;
};

export const preflightFullSitePlan = async (input: {
  plan: FullSiteInstallPlan;
  actorId: string;
  adapters: Record<FullSiteInstallPlanItem["kind"], ResourceAdapter>;
}): Promise<void> => {
  const ids = new Map<string, string>();
  for (const [index, operation] of input.plan.operations.entries()) {
    ids.set(
      operation.identity,
      operation.currentId ?? `${PLACEHOLDER_ID_PREFIX}${String(index + 1).padStart(12, "0")}`
    );
  }
  for (const operation of input.plan.operations) {
    const desired = resolveFullSiteRefs(operation.desired, ids) as JsonObject;
    await validateFullSiteOperation({
      operation,
      plan: input.plan,
      desired,
      actorId: input.actorId,
      adapter: input.adapters[operation.kind],
    });
  }
};

export const assertPlanItemCurrent = async (input: {
  operation: FullSiteInstallPlanItem;
  resolvedDesired: JsonObject;
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}): Promise<void> => {
  const current = await input.resolveCurrentResource(
    input.operation.kind,
    { key: input.operation.key, desired: input.resolvedDesired },
    input.operation.currentId ?? undefined
  );
  if (input.operation.operation === "create") {
    if (current) throw new Error("site_package_state_changed");
    return;
  }
  if (
    !input.operation.currentId ||
    !input.operation.currentDesired ||
    current?.id !== input.operation.currentId ||
    !isDeepStrictEqual(current.desired, input.operation.currentDesired)
  ) {
    throw new Error("site_package_state_changed");
  }
  if (
    input.operation.operation === "noop" &&
    !isDeepStrictEqual(current.desired, input.resolvedDesired)
  ) {
    throw new Error("site_package_state_changed");
  }
};

export const assertInstalledSnapshotCurrent = async (input: {
  operation: FullSiteInstallPlanItem;
  id: string;
  desired: JsonObject;
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}): Promise<void> => {
  const current = await input.resolveCurrentResource(
    input.operation.kind,
    { key: input.operation.key, desired: input.desired },
    input.id
  );
  if (current?.id !== input.id || !isDeepStrictEqual(current.desired, input.desired)) {
    throw new Error("site_package_state_changed");
  }
};

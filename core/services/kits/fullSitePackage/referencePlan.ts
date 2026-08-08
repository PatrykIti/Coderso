import {
  ReferenceGraphError,
  toResourceIdentity,
  type PackageResourceIdentity,
  type RegisteredPackageResource,
} from "./referenceRegistry";
import type {
  JsonObject,
  JsonPrimitive,
  JsonValue,
  PackageResourceCollection,
  PackageResourceKind,
} from "./types";

type PathSegment = string | number;

export type FrozenJsonValue =
  JsonPrimitive | readonly FrozenJsonValue[] | { readonly [key: string]: FrozenJsonValue };

export type FrozenJsonObject = { readonly [key: string]: FrozenJsonValue };

export type PlannedPackageReference = Readonly<{
  path: readonly PathSegment[];
  targetIdentity: PackageResourceIdentity;
}>;

export type PlannedPackageResource = Readonly<{
  identity: PackageResourceIdentity;
  kind: PackageResourceKind;
  collection: PackageResourceCollection;
  key: string;
  ordinal: number;
  collectionIndex: number;
  seed: Readonly<{ key: string; desired: FrozenJsonObject }>;
  dependencies: readonly PackageResourceIdentity[];
  references: readonly PlannedPackageReference[];
}>;

export type ReferencePlanTopologyResource = RegisteredPackageResource &
  Readonly<{ dependencies: readonly PackageResourceIdentity[] }>;

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isFrozenJsonArray = (
  value: FrozenJsonValue | undefined
): value is readonly FrozenJsonValue[] => Array.isArray(value);

const isFrozenJsonObject = (value: FrozenJsonValue | undefined): value is FrozenJsonObject =>
  value !== undefined && value !== null && typeof value === "object" && !isFrozenJsonArray(value);

const freezeJsonValue = (value: JsonValue): FrozenJsonValue => {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeJsonValue));
  if (!isJsonObject(value)) return value;
  const output: Record<string, FrozenJsonValue> = {};
  for (const key of Object.keys(value)) {
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: freezeJsonValue(value[key]),
      writable: true,
    });
  }
  return Object.freeze(output);
};

export const freezeReferencePlan = (
  ordered: readonly ReferencePlanTopologyResource[],
  descriptorsByIdentity: ReadonlyMap<PackageResourceIdentity, readonly PlannedPackageReference[]>
): readonly PlannedPackageResource[] =>
  Object.freeze(
    ordered.map((resource) =>
      Object.freeze({
        identity: resource.identity,
        kind: resource.kind,
        collection: resource.collection,
        key: resource.key,
        ordinal: resource.ordinal,
        collectionIndex: resource.collectionIndex,
        seed: Object.freeze({
          key: resource.seed.key,
          desired: freezeJsonValue(resource.seed.desired) as FrozenJsonObject,
        }),
        dependencies: Object.freeze([...resource.dependencies]),
        references: Object.freeze(
          (descriptorsByIdentity.get(resource.identity) ?? []).map((descriptor) =>
            Object.freeze({
              path: Object.freeze([...descriptor.path]),
              targetIdentity: descriptor.targetIdentity,
            })
          )
        ),
      })
    )
  );

const cloneJsonValue = (value: FrozenJsonValue): JsonValue => {
  if (isFrozenJsonArray(value)) return value.map(cloneJsonValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneJsonValue(child)])
  );
};

const readPath = (
  root: FrozenJsonObject,
  path: readonly PathSegment[]
): FrozenJsonValue | undefined => {
  let value: FrozenJsonValue = root;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!isFrozenJsonArray(value)) return undefined;
      value = value[segment];
    } else {
      if (!isFrozenJsonObject(value)) return undefined;
      value = value[segment];
    }
  }
  return value;
};

const setPath = (root: JsonObject, path: readonly PathSegment[], replacement: string): boolean => {
  let value: JsonValue = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    if (typeof segment === "number") {
      if (!Array.isArray(value)) return false;
      value = value[segment];
    } else {
      if (!isJsonObject(value)) return false;
      value = value[segment];
    }
  }
  const terminal = path[path.length - 1];
  if (typeof terminal === "number") {
    if (!Array.isArray(value)) return false;
    value[terminal] = replacement;
  } else {
    if (!isJsonObject(value)) return false;
    value[terminal] = replacement;
  }
  return true;
};

const descriptorMatchesSource = (
  value: FrozenJsonValue | undefined,
  targetIdentity: PackageResourceIdentity
): boolean => {
  if (!isFrozenJsonObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("ref") || !keys.includes("key")) return false;
  if (typeof value.ref !== "string" || typeof value.key !== "string") return false;
  return toResourceIdentity(value.ref as PackageResourceKind, value.key) === targetIdentity;
};

const encodeDescriptorPath = (
  resource: Pick<PlannedPackageResource, "collection" | "collectionIndex">,
  path: readonly PathSegment[]
): string => {
  let output = `$.resources.${resource.collection}[${resource.collectionIndex}].desired`;
  for (const segment of path) {
    output += typeof segment === "number" ? `[${segment}]` : `.${segment}`;
  }
  return output.slice(0, 240);
};

export const resolvePlannedPackageResourceRefs = (
  resource: PlannedPackageResource,
  resolvedIds: ReadonlyMap<PackageResourceIdentity, string>
): JsonObject => {
  const desired = cloneJsonValue(resource.seed.desired) as JsonObject;
  for (const descriptor of resource.references) {
    if (
      !descriptorMatchesSource(
        readPath(resource.seed.desired, descriptor.path),
        descriptor.targetIdentity
      )
    ) {
      throw new ReferenceGraphError("site_package_ref_bad_path", [
        {
          path: encodeDescriptorPath(resource, descriptor.path),
          reason: "planned_reference_drift",
        },
      ]);
    }
    const resolvedId = resolvedIds.get(descriptor.targetIdentity);
    if (!resolvedId) {
      throw new ReferenceGraphError("site_package_ref_missing", [
        {
          path: encodeDescriptorPath(resource, descriptor.path),
          reason: "resolved_target_id_missing",
        },
      ]);
    }
    if (!setPath(desired, descriptor.path, resolvedId)) {
      throw new ReferenceGraphError("site_package_ref_bad_path", [
        {
          path: encodeDescriptorPath(resource, descriptor.path),
          reason: "planned_reference_drift",
        },
      ]);
    }
  }
  return desired;
};

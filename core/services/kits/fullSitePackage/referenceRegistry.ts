import { createDiagnosticCollector } from "./schema";
import {
  PACKAGE_RESOURCE_COLLECTIONS,
  PACKAGE_RESOURCE_KIND_BY_COLLECTION,
  type FullSitePackageResources,
  type PackageResourceCollection,
  type PackageResourceKind,
  type ResourceSeed,
} from "./types";

export type PackageResourceIdentity = `${PackageResourceKind}:${string}`;

export type RegisteredPackageResource = Readonly<{
  identity: PackageResourceIdentity;
  kind: PackageResourceKind;
  collection: PackageResourceCollection;
  key: string;
  seed: ResourceSeed;
  ordinal: number;
  collectionIndex: number;
}>;

export type PackageResourceRegistry = Readonly<{
  byIdentity: ReadonlyMap<PackageResourceIdentity, RegisteredPackageResource>;
  byKindAndKey: ReadonlyMap<PackageResourceKind, ReadonlyMap<string, RegisteredPackageResource>>;
  resources: readonly RegisteredPackageResource[];
}>;

export type ReferenceGraphErrorCode =
  | "site_package_ref_duplicate"
  | "site_package_ref_missing"
  | "site_package_ref_ambiguous"
  | "site_package_ref_cycle"
  | "site_package_ref_bad_path"
  | "site_package_too_complex";

export type ReferenceGraphDiagnosticReason =
  | "duplicate_resource_identity"
  | "expected_package_ref"
  | "package_ref_shape_invalid"
  | "package_ref_kind_mismatch"
  | "package_ref_key_invalid"
  | "package_ref_path_forbidden"
  | "package_ref_target_missing"
  | "content_routes_invalid"
  | "content_route_type_invalid"
  | "content_route_content_type_missing"
  | "content_route_content_type_ambiguous"
  | "content_route_detail_content_type_mismatch"
  | "page_slots_forbidden"
  | "page_slot_key_forbidden"
  | "page_tree_depth_exceeded"
  | "page_slot_children_exceeded"
  | "json_depth_exceeded"
  | "reference_edges_exceeded"
  | "dependency_depth_exceeded"
  | "diagnostic_limit_exceeded"
  | "reference_cycle"
  | "resolved_target_id_missing"
  | "planned_reference_drift";

export type ReferenceGraphDiagnostic = Readonly<{
  path: string;
  reason: ReferenceGraphDiagnosticReason;
}>;

export class ReferenceGraphError extends Error {
  readonly code: ReferenceGraphErrorCode;
  readonly diagnostics: readonly ReferenceGraphDiagnostic[];

  constructor(code: ReferenceGraphErrorCode, diagnostics: readonly ReferenceGraphDiagnostic[]) {
    super(code);
    this.name = "ReferenceGraphError";
    this.code = code;
    this.diagnostics = Object.freeze(
      diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic }))
    );
  }
}

export const toResourceIdentity = (
  kind: PackageResourceKind,
  key: string
): PackageResourceIdentity => `${kind}:${key}`;

export const indexUniqueKindKeys = (
  resources: FullSitePackageResources
): PackageResourceRegistry => {
  const duplicates = createDiagnosticCollector<ReferenceGraphDiagnostic>();
  const byIdentity = new Map<PackageResourceIdentity, RegisteredPackageResource>();
  const mutableByKindAndKey = new Map<
    PackageResourceKind,
    Map<string, RegisteredPackageResource>
  >();
  const registered: RegisteredPackageResource[] = [];
  let ordinal = 0;

  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    const kind = PACKAGE_RESOURCE_KIND_BY_COLLECTION[collection];
    let byKey = mutableByKindAndKey.get(kind);
    if (!byKey) {
      byKey = new Map();
      mutableByKindAndKey.set(kind, byKey);
    }
    for (
      let collectionIndex = 0;
      collectionIndex < resources[collection].length;
      collectionIndex += 1
    ) {
      const seed = resources[collection][collectionIndex];
      const identity = toResourceIdentity(kind, seed.key);
      if (byKey.has(seed.key)) {
        duplicates.add(
          Object.freeze({
            path: `$.resources.${collection}`,
            reason: "duplicate_resource_identity",
          })
        );
        ordinal += 1;
        continue;
      }
      const resource = Object.freeze({
        identity,
        kind,
        collection,
        key: seed.key,
        seed,
        ordinal,
        collectionIndex,
      });
      ordinal += 1;
      byKey.set(seed.key, resource);
      byIdentity.set(identity, resource);
      registered.push(resource);
    }
  }

  const batch = duplicates.read();
  if (batch.overflowed) {
    throw new ReferenceGraphError("site_package_too_complex", batch.diagnostics);
  }
  if (batch.diagnostics.length > 0) {
    throw new ReferenceGraphError("site_package_ref_duplicate", batch.diagnostics);
  }

  return Object.freeze({
    byIdentity,
    byKindAndKey: mutableByKindAndKey,
    resources: Object.freeze(registered),
  });
};

export const findRegisteredResource = (
  registry: PackageResourceRegistry,
  kind: PackageResourceKind,
  key: string
): RegisteredPackageResource | undefined => registry.byKindAndKey.get(kind)?.get(key);

import {
  PACKAGE_RESOURCE_COLLECTIONS,
  PACKAGE_RESOURCE_KIND_BY_COLLECTION,
  type FullSitePackageResources,
  type PackageResourceCollection,
  type PackageResourceKind,
  type ResourceSeed,
} from "./types";

export type PackageResourceIdentity = `${PackageResourceKind}:${string}`;

export type RegisteredPackageResource = {
  identity: PackageResourceIdentity;
  kind: PackageResourceKind;
  collection: PackageResourceCollection;
  key: string;
  seed: ResourceSeed;
  ordinal: number;
};

export type PackageResourceRegistry = {
  byIdentity: ReadonlyMap<PackageResourceIdentity, RegisteredPackageResource>;
  byKindAndKey: ReadonlyMap<PackageResourceKind, ReadonlyMap<string, RegisteredPackageResource>>;
  resources: readonly RegisteredPackageResource[];
};

export type ReferenceGraphErrorCode =
  | "site_package_ref_duplicate"
  | "site_package_ref_missing"
  | "site_package_ref_ambiguous"
  | "site_package_ref_cycle"
  | "site_package_ref_bad_path"
  | "site_package_too_complex";

export type ReferenceGraphDiagnostic = {
  path: string;
  reason: string;
};

export class ReferenceGraphError extends Error {
  readonly code: ReferenceGraphErrorCode;
  readonly diagnostics: ReferenceGraphDiagnostic[];

  constructor(code: ReferenceGraphErrorCode, diagnostics: ReferenceGraphDiagnostic[]) {
    super(code);
    this.name = "ReferenceGraphError";
    this.code = code;
    this.diagnostics = diagnostics.slice(0, 100);
  }
}

export const toResourceIdentity = (
  kind: PackageResourceKind,
  key: string
): PackageResourceIdentity => `${kind}:${key}`;

export const indexUniqueKindKeys = (
  resources: FullSitePackageResources
): PackageResourceRegistry => {
  const byIdentity = new Map<PackageResourceIdentity, RegisteredPackageResource>();
  const mutableByKindAndKey = new Map<
    PackageResourceKind,
    Map<string, RegisteredPackageResource>
  >();
  const registered: RegisteredPackageResource[] = [];
  const duplicates: ReferenceGraphDiagnostic[] = [];
  let ordinal = 0;

  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    const kind = PACKAGE_RESOURCE_KIND_BY_COLLECTION[collection];
    let byKey = mutableByKindAndKey.get(kind);
    if (!byKey) {
      byKey = new Map();
      mutableByKindAndKey.set(kind, byKey);
    }
    for (const seed of resources[collection]) {
      const identity = toResourceIdentity(kind, seed.key);
      if (byKey.has(seed.key)) {
        duplicates.push({
          path: `$.resources.${collection}`,
          reason: `duplicate:${identity}`,
        });
        continue;
      }
      const resource: RegisteredPackageResource = {
        identity,
        kind,
        collection,
        key: seed.key,
        seed,
        ordinal,
      };
      ordinal += 1;
      byKey.set(seed.key, resource);
      byIdentity.set(identity, resource);
      registered.push(resource);
    }
  }

  if (duplicates.length > 0) {
    throw new ReferenceGraphError("site_package_ref_duplicate", duplicates);
  }

  return {
    byIdentity,
    byKindAndKey: mutableByKindAndKey,
    resources: registered,
  };
};

export const findRegisteredResource = (
  registry: PackageResourceRegistry,
  kind: PackageResourceKind,
  key: string
): RegisteredPackageResource | undefined => registry.byKindAndKey.get(kind)?.get(key);

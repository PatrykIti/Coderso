import {
  ReferenceGraphError,
  findRegisteredResource,
  indexUniqueKindKeys,
  toResourceIdentity,
  type PackageResourceIdentity,
  type PackageResourceRegistry,
  type ReferenceGraphDiagnostic,
  type RegisteredPackageResource,
} from "./referenceRegistry";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_KINDS,
  type FullSitePackageV1,
  type JsonValue,
  type PackageRef,
  type PackageResourceKind,
} from "./types";

type PathSegment = string | "*";

export type AllowedReferencePath = {
  sourceKind: PackageResourceKind;
  segments: readonly PathSegment[];
  targetKind: PackageResourceKind;
  settingKey?: string;
};

export const REFERENCE_PATHS: readonly AllowedReferencePath[] = [
  { sourceKind: "content_entry", segments: ["contentTypeId"], targetKind: "content_type" },
  {
    sourceKind: "listing_query",
    segments: ["query", "sourceConfig", "contentTypeId"],
    targetKind: "content_type",
  },
  { sourceKind: "detail_page", segments: ["contentTypeId"], targetKind: "content_type" },
  {
    sourceKind: "detail_page",
    segments: ["related", "*", "listingQueryId"],
    targetKind: "listing_query",
  },
  {
    sourceKind: "page",
    segments: ["document", "settings", "collectionLink", "contentTypeId"],
    targetKind: "content_type",
  },
  {
    sourceKind: "page",
    segments: ["document", "settings", "collectionLink", "listingQueryId"],
    targetKind: "listing_query",
  },
  {
    sourceKind: "page",
    segments: ["document", "settings", "collectionLink", "listingTemplateId"],
    targetKind: "listing_template",
  },
  {
    sourceKind: "page",
    segments: ["document", "sections", "*", "blocks", "*", "props", "contentTypeId"],
    targetKind: "content_type",
  },
  {
    sourceKind: "page",
    segments: ["document", "sections", "*", "blocks", "*", "props", "queryId"],
    targetKind: "listing_query",
  },
  {
    sourceKind: "page",
    segments: ["document", "sections", "*", "blocks", "*", "props", "templateId"],
    targetKind: "listing_template",
  },
  {
    sourceKind: "page",
    segments: ["document", "sections", "*", "blocks", "*", "props", "formId"],
    targetKind: "form",
  },
  { sourceKind: "menu", segments: ["items", "*", "pageId"], targetKind: "page" },
  {
    sourceKind: "menu",
    segments: ["document", "items", "*", "pageId"],
    targetKind: "page",
  },
  {
    sourceKind: "setting",
    settingKey: "site.homepageId",
    segments: ["value"],
    targetKind: "page",
  },
  {
    sourceKind: "setting",
    settingKey: "site.navigationMenuId",
    segments: ["value"],
    targetKind: "menu",
  },
  {
    sourceKind: "setting",
    settingKey: "site.footerTemplateId",
    segments: ["value"],
    targetKind: "page_template",
  },
  {
    sourceKind: "setting",
    settingKey: "site.contentRoutes",
    segments: ["value", "*", "detailPageId"],
    targetKind: "detail_page",
  },
] as const;

export type PackageReferenceEdge = {
  from: PackageResourceIdentity;
  to: PackageResourceIdentity;
  path: string;
};

export type PlannedPackageResource = RegisteredPackageResource & {
  dependencies: readonly PackageResourceIdentity[];
};

class BoundedDiagnostics {
  readonly values: ReferenceGraphDiagnostic[] = [];
  private overflow = false;

  add(path: string, reason: string): void {
    if (this.values.length < PACKAGE_LIMITS.diagnostics) {
      this.values.push({ path: sanitizePath(path), reason });
    } else {
      this.overflow = true;
    }
  }

  throwIfAny(code: "site_package_ref_bad_path" | "site_package_ref_missing"): void {
    if (this.values.length === 0 && !this.overflow) return;
    if (this.overflow) {
      throw new ReferenceGraphError("site_package_too_complex", this.values);
    }
    throw new ReferenceGraphError(code, this.values);
  }
}

const sanitizePath = (path: string): string =>
  path.replace(/[^A-Za-z0-9.[\]_-]/g, "_").slice(0, 240);

const isRecord = (value: JsonValue | undefined): value is Record<string, JsonValue> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isRefLike = (value: Record<string, JsonValue>): boolean =>
  Object.prototype.hasOwnProperty.call(value, "ref") ||
  Object.prototype.hasOwnProperty.call(value, "$ref");

const readPackageRef = (
  value: JsonValue | undefined,
  expectedKind: PackageResourceKind,
  path: string,
  diagnostics: BoundedDiagnostics
): PackageRef | undefined => {
  if (!isRecord(value)) {
    diagnostics.add(path, "expected_package_ref");
    return undefined;
  }
  const keys = Object.keys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("ref") ||
    !keys.includes("key") ||
    value.ref !== expectedKind ||
    typeof value.key !== "string" ||
    value.key.length === 0
  ) {
    diagnostics.add(path, `invalid_package_ref:${expectedKind}`);
    return undefined;
  }
  return { ref: expectedKind, key: value.key };
};

const expandPath = (
  value: JsonValue,
  segments: readonly PathSegment[],
  basePath: string
): Array<{ value: JsonValue | undefined; path: string }> => {
  let matches: Array<{ value: JsonValue | undefined; path: string }> = [{ value, path: basePath }];
  for (const segment of segments) {
    const next: Array<{ value: JsonValue | undefined; path: string }> = [];
    for (const match of matches) {
      if (segment === "*") {
        if (!Array.isArray(match.value)) continue;
        match.value.forEach((item, index) => {
          next.push({ value: item, path: `${match.path}[${index}]` });
        });
      } else if (
        isRecord(match.value) &&
        Object.prototype.hasOwnProperty.call(match.value, segment)
      ) {
        next.push({ value: match.value[segment], path: `${match.path}.${segment}` });
      }
    }
    matches = next;
  }
  return matches;
};

const pathMatches = (
  actual: readonly (string | number)[],
  allowed: readonly PathSegment[]
): boolean =>
  actual.length === allowed.length &&
  actual.every((segment, index) => allowed[index] === "*" || allowed[index] === segment);

const scanRefLikeObjects = (
  value: JsonValue,
  source: RegisteredPackageResource,
  allowedPaths: readonly AllowedReferencePath[],
  diagnostics: BoundedDiagnostics,
  path: Array<string | number> = [],
  depth = 1
): void => {
  if (depth > PACKAGE_LIMITS.depth) {
    throw new ReferenceGraphError("site_package_too_complex", [
      { path: resourcePath(source, path), reason: "depth_exceeded" },
    ]);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanRefLikeObjects(item, source, allowedPaths, diagnostics, [...path, index], depth + 1)
    );
    return;
  }
  if (!isRecord(value)) return;
  if (isRefLike(value) && !allowedPaths.some((allowed) => pathMatches(path, allowed.segments))) {
    diagnostics.add(resourcePath(source, path), "package_ref_path_forbidden");
  }
  for (const [key, child] of Object.entries(value)) {
    scanRefLikeObjects(child, source, allowedPaths, diagnostics, [...path, key], depth + 1);
  }
};

const resourcePath = (
  resource: RegisteredPackageResource,
  segments: readonly (string | number)[]
): string => {
  let path = `$.resources.${resource.collection}[${resource.ordinal}].desired`;
  for (const segment of segments) {
    path += typeof segment === "number" ? `[${segment}]` : `.${segment}`;
  }
  return path;
};

const addResolvedEdge = (
  source: RegisteredPackageResource,
  ref: PackageRef,
  path: string,
  registry: PackageResourceRegistry,
  edges: PackageReferenceEdge[],
  diagnostics: BoundedDiagnostics
): void => {
  const target = findRegisteredResource(registry, ref.ref, ref.key);
  if (!target) {
    diagnostics.add(path, `missing:${toResourceIdentity(ref.ref, ref.key)}`);
    return;
  }
  edges.push({ from: source.identity, to: target.identity, path });
  if (edges.length > PACKAGE_LIMITS.referenceEdges) {
    throw new ReferenceGraphError("site_package_too_complex", [
      { path: "$.resources", reason: "reference_edges_exceeded" },
    ]);
  }
};

const collectContentRouteTypeEdges = (
  source: RegisteredPackageResource,
  registry: PackageResourceRegistry,
  edges: PackageReferenceEdge[],
  diagnostics: BoundedDiagnostics
): void => {
  if (source.kind !== "setting" || source.key !== "site.contentRoutes") return;
  const routes = isRecord(source.seed.desired) ? source.seed.desired.value : undefined;
  if (!Array.isArray(routes)) {
    diagnostics.add(resourcePath(source, ["value"]), "expected_content_routes");
    return;
  }
  routes.forEach((route, index) => {
    if (!isRecord(route) || typeof route.type !== "string" || route.type.length === 0) {
      diagnostics.add(resourcePath(source, ["value", index, "type"]), "invalid_content_type_slug");
      return;
    }
    const matches = registry.resources.filter(
      (resource) =>
        resource.kind === "content_type" &&
        isRecord(resource.seed.desired) &&
        resource.seed.desired.slug === route.type
    );
    if (matches.length === 0) {
      diagnostics.add(
        resourcePath(source, ["value", index, "type"]),
        `missing_content_type_slug:${route.type}`
      );
      return;
    }
    if (matches.length > 1) {
      throw new ReferenceGraphError("site_package_ref_ambiguous", [
        {
          path: resourcePath(source, ["value", index, "type"]),
          reason: `ambiguous_content_type_slug:${route.type}`,
        },
      ]);
    }
    edges.push({
      from: source.identity,
      to: matches[0].identity,
      path: resourcePath(source, ["value", index, "type"]),
    });
  });
};

export const collectRefsAtAllowedPaths = (
  registry: PackageResourceRegistry
): PackageReferenceEdge[] => {
  const diagnostics = new BoundedDiagnostics();
  const missing = new BoundedDiagnostics();
  const edges: PackageReferenceEdge[] = [];

  for (const source of registry.resources) {
    const allowedPaths = REFERENCE_PATHS.filter(
      (path) =>
        path.sourceKind === source.kind &&
        (path.settingKey === undefined || path.settingKey === source.key)
    );
    scanRefLikeObjects(source.seed.desired, source, allowedPaths, diagnostics);
    for (const allowed of allowedPaths) {
      const matches = expandPath(source.seed.desired, allowed.segments, resourcePath(source, []));
      for (const match of matches) {
        const ref = readPackageRef(match.value, allowed.targetKind, match.path, diagnostics);
        if (ref) addResolvedEdge(source, ref, match.path, registry, edges, missing);
      }
    }
    collectContentRouteTypeEdges(source, registry, edges, missing);
  }

  diagnostics.throwIfAny("site_package_ref_bad_path");
  missing.throwIfAny("site_package_ref_missing");
  if (edges.length > PACKAGE_LIMITS.referenceEdges) {
    throw new ReferenceGraphError("site_package_too_complex", [
      { path: "$.resources", reason: "reference_edges_exceeded" },
    ]);
  }
  return edges;
};

const stableResourceCompare = (
  left: RegisteredPackageResource,
  right: RegisteredPackageResource
): number => left.ordinal - right.ordinal || left.identity.localeCompare(right.identity);

const assertDependencyDepth = (ordered: readonly PlannedPackageResource[]): void => {
  const depthByIdentity = new Map<PackageResourceIdentity, number>();
  for (const resource of ordered) {
    let depth = 0;
    for (const dependency of resource.dependencies) {
      depth = Math.max(depth, (depthByIdentity.get(dependency) ?? 0) + 1);
    }
    if (depth > PACKAGE_LIMITS.depth) {
      throw new ReferenceGraphError("site_package_too_complex", [
        { path: "$.resources", reason: "dependency_depth_exceeded" },
      ]);
    }
    depthByIdentity.set(resource.identity, depth);
  }
};

export const stableTopologicalSort = (
  registry: PackageResourceRegistry,
  edges: readonly PackageReferenceEdge[]
): PlannedPackageResource[] => {
  const dependencies = new Map<PackageResourceIdentity, Set<PackageResourceIdentity>>();
  const dependents = new Map<PackageResourceIdentity, Set<PackageResourceIdentity>>();
  for (const resource of registry.resources) {
    dependencies.set(resource.identity, new Set());
    dependents.set(resource.identity, new Set());
  }
  for (const edge of edges) {
    dependencies.get(edge.from)?.add(edge.to);
    dependents.get(edge.to)?.add(edge.from);
  }
  const declaredDependencies = new Map(
    [...dependencies].map(([identity, values]) => [identity, new Set(values)])
  );
  const ready = registry.resources
    .filter((resource) => dependencies.get(resource.identity)?.size === 0)
    .sort(stableResourceCompare);
  const ordered: PlannedPackageResource[] = [];

  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) break;
    ordered.push({
      ...current,
      dependencies: [...(declaredDependencies.get(current.identity) ?? [])].sort(),
    });
    for (const dependentIdentity of dependents.get(current.identity) ?? []) {
      const dependentDependencies = dependencies.get(dependentIdentity);
      dependentDependencies?.delete(current.identity);
      if (dependentDependencies?.size === 0) {
        const dependent = registry.byIdentity.get(dependentIdentity);
        if (dependent && !ready.includes(dependent)) {
          ready.push(dependent);
          ready.sort(stableResourceCompare);
        }
      }
    }
  }

  if (ordered.length !== registry.resources.length) {
    const cyclic = registry.resources
      .filter((resource) => !ordered.some((item) => item.identity === resource.identity))
      .map((resource) => resource.identity)
      .sort();
    throw new ReferenceGraphError("site_package_ref_cycle", [
      { path: "$.resources", reason: `cycle:${cyclic.join(",")}` },
    ]);
  }
  assertDependencyDepth(ordered);
  return ordered;
};

export const buildReferencePlan = (pkg: FullSitePackageV1): PlannedPackageResource[] => {
  const registry = indexUniqueKindKeys(pkg.resources);
  const edges = collectRefsAtAllowedPaths(registry);
  return stableTopologicalSort(registry, edges);
};

export const isPackageRef = (value: JsonValue): value is PackageRef =>
  isRecord(value) &&
  Object.keys(value).length === 2 &&
  typeof value.ref === "string" &&
  (PACKAGE_RESOURCE_KINDS as readonly string[]).includes(value.ref) &&
  typeof value.key === "string" &&
  value.key.length > 0;

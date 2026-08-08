import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  pageBlockCapabilities,
  pageBlockTypes,
  pageBreakpoints,
  type PageBlockSlotKey,
  type PageBlockType,
} from "../../pages/pageDocumentV2";
import {
  ReferenceGraphError,
  findRegisteredResource,
  indexUniqueKindKeys,
  type PackageResourceIdentity,
  type PackageResourceRegistry,
  type ReferenceGraphDiagnostic,
  type ReferenceGraphDiagnosticReason,
  type RegisteredPackageResource,
} from "./referenceRegistry";
import {
  freezeReferencePlan,
  resolvePlannedPackageResourceRefs,
  type PlannedPackageReference,
  type PlannedPackageResource,
  type ReferencePlanTopologyResource,
} from "./referencePlan";
import {
  FIXED_REFERENCE_RULES,
  REFERENCE_PATHS,
  type FixedReferenceRule,
  type ReferencePresence,
} from "./referencePaths";
import {
  compareFullSitePackageObjectKeys,
  compareFullSitePackageText,
  createDiagnosticCollector,
  isCanonicalPackageKey,
  type DiagnosticBatch,
} from "./schema";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
  type JsonValue,
  type PackageRef,
  type PackageResourceKind,
} from "./types";

export { resolvePlannedPackageResourceRefs };
export { REFERENCE_PATHS };
export type { PackageResourceIdentity } from "./referenceRegistry";
export type {
  FrozenJsonObject,
  FrozenJsonValue,
  PlannedPackageReference,
  PlannedPackageResource,
} from "./referencePlan";
export type { AllowedReferencePath } from "./referencePaths";

type PathSegment = string | number;

export type PackageReferenceEdge = Readonly<{
  from: PackageResourceIdentity;
  to: PackageResourceIdentity;
  path: readonly PathSegment[];
  purpose: "substitute" | "content_route_type";
}>;

export type TaggedGraphDiagnostic = Readonly<{
  code: "site_package_ref_bad_path" | "site_package_ref_missing" | "site_package_ref_ambiguous";
  diagnostic: ReferenceGraphDiagnostic;
}>;

type GraphDiagnostics = Readonly<{
  add(
    code: TaggedGraphDiagnostic["code"],
    source: RegisteredPackageResource,
    relativePath: readonly PathSegment[],
    reason: ReferenceGraphDiagnosticReason
  ): void;
  read(): DiagnosticBatch<TaggedGraphDiagnostic>;
}>;

const PAGE_REFERENCE_AUTHORITY = Object.freeze({
  blockTypes: Object.freeze([...pageBlockTypes]),
  breakpoints: Object.freeze([...pageBreakpoints]),
  slotsByType: Object.freeze(
    Object.fromEntries(
      pageBlockTypes.map((type) => [type, Object.freeze([...pageBlockCapabilities[type].slots])])
    ) as Readonly<Record<PageBlockType, readonly PageBlockSlotKey[]>>
  ),
});

const TRUSTED_REFERENCE_SEGMENTS = new Set<string>([
  "contentTypeId",
  "query",
  "sourceConfig",
  "related",
  "listingQueryId",
  "items",
  "pageId",
  "value",
  "detailPageId",
  "type",
  "data",
  "document",
  "settings",
  "collectionLink",
  "listingTemplateId",
  "sections",
  "blocks",
  "props",
  "responsive",
  "tablet",
  "mobile",
  "queryId",
  "templateId",
  "formId",
  "slots",
  ...Object.values(PAGE_REFERENCE_AUTHORITY.slotsByType).flat(),
]);

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const encodeReferenceDiagnosticPath = (
  source: Pick<RegisteredPackageResource, "collection" | "collectionIndex">,
  relativePath: readonly PathSegment[]
): string => {
  let output = `$.resources.${source.collection}[${source.collectionIndex}].desired`;
  for (const segment of relativePath) {
    if (typeof segment === "number") {
      output += `[${segment}]`;
      continue;
    }
    if (!TRUSTED_REFERENCE_SEGMENTS.has(segment)) {
      output += ".[redacted]";
      break;
    }
    output += `.${segment}`;
  }
  return output.slice(0, 240);
};

const createGraphDiagnostics = (): GraphDiagnostics => {
  const collector = createDiagnosticCollector<TaggedGraphDiagnostic>();
  return Object.freeze({
    add(code, source, relativePath, reason): void {
      collector.add(
        Object.freeze({
          code,
          diagnostic: Object.freeze({
            path: encodeReferenceDiagnosticPath(source, relativePath),
            reason,
          }),
        })
      );
    },
    read: collector.read,
  });
};

const GRAPH_ERROR_PRIORITY = Object.freeze([
  "site_package_ref_bad_path",
  "site_package_ref_missing",
  "site_package_ref_ambiguous",
] as const);

const throwGraphDiagnostics = (batch: DiagnosticBatch<TaggedGraphDiagnostic>): void => {
  if (batch.overflowed) {
    throw new ReferenceGraphError("site_package_too_complex", batch.diagnostics);
  }
  const code = GRAPH_ERROR_PRIORITY.find((candidate) =>
    batch.diagnostics.some((value) => value.code === candidate)
  );
  if (!code) return;
  throw new ReferenceGraphError(
    code,
    batch.diagnostics.map(({ diagnostic }) => diagnostic)
  );
};

const throwStaticComplexity = (
  reason: "json_depth_exceeded" | "reference_edges_exceeded" | "dependency_depth_exceeded"
): never => {
  throw new ReferenceGraphError("site_package_too_complex", [{ path: "$.resources", reason }]);
};

const assertJsonDepth = (value: JsonValue, depth: number): void => {
  if (depth > PACKAGE_LIMITS.depth) throwStaticComplexity("json_depth_exceeded");
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertJsonDepth(value[index], depth + 1);
    }
    return;
  }
  if (!isJsonObject(value)) return;
  for (const child of Object.values(value)) assertJsonDepth(child, depth + 1);
};

const assertReferenceGraphJsonDepth = (resources: FullSitePackageResources): void => {
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    for (const seed of resources[collection]) assertJsonDepth(seed.desired, 1);
  }
};

type ReferenceAuthorityPath = Readonly<{
  sourceOrdinal: number;
  path: readonly PathSegment[];
}>;

type OccurrenceState = Readonly<{
  edges: PackageReferenceEdge[];
  descriptorsByIdentity: Map<PackageResourceIdentity, PlannedPackageReference[]>;
  registeredReferencePaths: Set<string>;
  blockedReferencePrefixes: ReferenceAuthorityPath[];
  resolvedDetailPageContentTypes: Map<PackageResourceIdentity, PackageResourceIdentity>;
}>;

type DiscoveryContext = Readonly<{
  registry: PackageResourceRegistry;
  diagnostics: GraphDiagnostics;
  state: OccurrenceState;
}>;

const serializeAuthorityPath = (sourceOrdinal: number, path: readonly PathSegment[]): string =>
  JSON.stringify([sourceOrdinal, path]);

const registerReferenceAuthority = (
  source: RegisteredPackageResource,
  path: readonly PathSegment[],
  state: OccurrenceState
): void => {
  state.registeredReferencePaths.add(serializeAuthorityPath(source.ordinal, path));
};

const recordPackageRefOccurrence = (
  source: RegisteredPackageResource,
  relativePath: readonly PathSegment[],
  targetKind: PackageResourceKind,
  presence: ReferencePresence,
  present: boolean,
  value: JsonValue | undefined,
  context: DiscoveryContext
): RegisteredPackageResource | null => {
  if (!present && presence !== "required") return null;
  if ((value === null || !present) && presence === "nullable") return null;
  registerReferenceAuthority(source, relativePath, context.state);
  if (!present || value === null || !isJsonObject(value)) {
    context.diagnostics.add(
      "site_package_ref_bad_path",
      source,
      relativePath,
      "expected_package_ref"
    );
    return null;
  }
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("ref") || !keys.includes("key")) {
    context.diagnostics.add(
      "site_package_ref_bad_path",
      source,
      relativePath,
      "package_ref_shape_invalid"
    );
    return null;
  }
  if (value.ref !== targetKind) {
    context.diagnostics.add(
      "site_package_ref_bad_path",
      source,
      relativePath,
      "package_ref_kind_mismatch"
    );
    return null;
  }
  if (typeof value.key !== "string" || !isCanonicalPackageKey(value.key)) {
    context.diagnostics.add(
      "site_package_ref_bad_path",
      source,
      relativePath,
      "package_ref_key_invalid"
    );
    return null;
  }
  const packageRef = Object.freeze({ ref: targetKind, key: value.key } satisfies PackageRef);
  const target = findRegisteredResource(context.registry, packageRef.ref, packageRef.key);
  if (!target) {
    context.diagnostics.add(
      "site_package_ref_missing",
      source,
      relativePath,
      "package_ref_target_missing"
    );
    return null;
  }
  context.state.edges.push(
    Object.freeze({
      from: source.identity,
      to: target.identity,
      path: Object.freeze([...relativePath]),
      purpose: "substitute",
    })
  );
  const descriptors = context.state.descriptorsByIdentity.get(source.identity) ?? [];
  descriptors.push(
    Object.freeze({
      path: Object.freeze([...relativePath]),
      targetIdentity: target.identity,
    })
  );
  context.state.descriptorsByIdentity.set(source.identity, descriptors);
  return target;
};

const collectFixedRule = (
  source: RegisteredPackageResource,
  rule: FixedReferenceRule,
  context: DiscoveryContext,
  onResolved?: (target: RegisteredPackageResource) => void
): void => {
  const visit = (
    value: JsonValue | undefined,
    segmentIndex: number,
    path: readonly PathSegment[]
  ): void => {
    const segment = rule.path.segments[segmentIndex];
    if (segment === "*") {
      if (!Array.isArray(value)) return;
      value.forEach((child, index) => visit(child, segmentIndex + 1, [...path, index]));
      return;
    }
    const terminal = segmentIndex === rule.path.segments.length - 1;
    if (!isJsonObject(value)) return;
    const present = hasOwn(value, segment);
    const child = present ? value[segment] : undefined;
    const childPath = [...path, segment];
    if (!terminal) {
      if (present) visit(child, segmentIndex + 1, childPath);
      return;
    }
    const target = recordPackageRefOccurrence(
      source,
      childPath,
      rule.path.targetKind,
      rule.presence,
      present,
      child,
      context
    );
    if (target) onResolved?.(target);
  };
  visit(source.seed.desired, 0, []);
};

const collectFixedSourceOccurrences = (
  source: RegisteredPackageResource,
  context: DiscoveryContext
): void => {
  for (const rule of FIXED_REFERENCE_RULES) {
    if (
      rule.path.sourceKind !== source.kind ||
      (rule.path.settingKey !== undefined && rule.path.settingKey !== source.key)
    ) {
      continue;
    }
    collectFixedRule(source, rule, context, (target) => {
      if (
        source.kind === "detail_page" &&
        rule.path.segments.length === 1 &&
        rule.path.segments[0] === "contentTypeId"
      ) {
        context.state.resolvedDetailPageContentTypes.set(source.identity, target.identity);
      }
    });
  }
};

const collectContentRouteOccurrences = (
  source: RegisteredPackageResource,
  context: DiscoveryContext
): void => {
  const routes = source.seed.desired.value;
  if (!Array.isArray(routes)) {
    context.diagnostics.add(
      "site_package_ref_bad_path",
      source,
      ["value"],
      "content_routes_invalid"
    );
    return;
  }
  routes.forEach((route, routeIndex) => {
    const routePath: readonly PathSegment[] = ["value", routeIndex];
    if (!isJsonObject(route)) {
      context.diagnostics.add(
        "site_package_ref_bad_path",
        source,
        routePath,
        "content_routes_invalid"
      );
      return;
    }
    const detailPath = [...routePath, "detailPageId"];
    const detailPage = recordPackageRefOccurrence(
      source,
      detailPath,
      "detail_page",
      "nullable",
      hasOwn(route, "detailPageId"),
      route.detailPageId,
      context
    );
    const typePath = [...routePath, "type"];
    let contentType: RegisteredPackageResource | null = null;
    if (typeof route.type !== "string" || route.type.length === 0) {
      context.diagnostics.add(
        "site_package_ref_bad_path",
        source,
        typePath,
        "content_route_type_invalid"
      );
    } else {
      const matches = context.registry.resources.filter(
        (resource) => resource.kind === "content_type" && resource.seed.desired.slug === route.type
      );
      if (matches.length === 0) {
        context.diagnostics.add(
          "site_package_ref_missing",
          source,
          typePath,
          "content_route_content_type_missing"
        );
      } else if (matches.length > 1) {
        context.diagnostics.add(
          "site_package_ref_ambiguous",
          source,
          typePath,
          "content_route_content_type_ambiguous"
        );
      } else {
        [contentType] = matches;
        context.state.edges.push(
          Object.freeze({
            from: source.identity,
            to: contentType.identity,
            path: Object.freeze(typePath),
            purpose: "content_route_type",
          })
        );
      }
    }
    if (!detailPage || !contentType) return;
    const detailContentType = context.state.resolvedDetailPageContentTypes.get(detailPage.identity);
    if (detailContentType && detailContentType !== contentType.identity) {
      context.diagnostics.add(
        "site_package_ref_bad_path",
        source,
        detailPath,
        "content_route_detail_content_type_mismatch"
      );
    }
  });
};

type PageReferenceRoot = Readonly<{ rootKey: "data" | "document"; value: JsonObject }>;

const selectPageReferenceRoot = (source: RegisteredPackageResource): PageReferenceRoot | null => {
  const rootKey =
    source.kind === "page" ? "data" : source.kind === "page_template" ? "document" : null;
  if (!rootKey) return null;
  const value = source.seed.desired[rootKey];
  return isJsonObject(value) ? Object.freeze({ rootKey, value }) : null;
};

type IndexedPageBlockChild = Readonly<{ child: JsonObject; childIndex: number }>;
type PreflightPageSlot = Readonly<{
  slotKey: string;
  arrayLength: number | null;
  children: readonly IndexedPageBlockChild[];
}>;
type PageBlockBoundsPreflight = Readonly<{
  hasSlots: boolean;
  depthExceeded: boolean;
  structuralSlots: readonly PreflightPageSlot[] | null;
}>;

const preflightPageBlockBounds = (block: JsonObject, depth: number): PageBlockBoundsPreflight => {
  if (!hasOwn(block, "slots")) {
    return Object.freeze({ hasSlots: false, depthExceeded: false, structuralSlots: null });
  }
  const depthExceeded = depth >= PAGE_BLOCK_MAX_TREE_DEPTH;
  if (!isJsonObject(block.slots)) {
    return Object.freeze({ hasSlots: true, depthExceeded, structuralSlots: null });
  }
  const structuralSlots = Object.keys(block.slots)
    .sort(compareFullSitePackageObjectKeys)
    .map((slotKey): PreflightPageSlot => {
      const value = (block.slots as JsonObject)[slotKey];
      if (!Array.isArray(value)) {
        return Object.freeze({ slotKey, arrayLength: null, children: Object.freeze([]) });
      }
      const children: IndexedPageBlockChild[] = [];
      value.forEach((child, childIndex) => {
        if (isJsonObject(child)) children.push(Object.freeze({ child, childIndex }));
      });
      return Object.freeze({
        slotKey,
        arrayLength: value.length,
        children: Object.freeze(children),
      });
    });
  return Object.freeze({
    hasSlots: true,
    depthExceeded,
    structuralSlots: Object.freeze(structuralSlots),
  });
};

type PageVisitContext = Readonly<{
  source: RegisteredPackageResource;
  graph: DiscoveryContext;
}>;

const rejectPageSlots = (
  path: readonly PathSegment[],
  reason:
    | "page_slots_forbidden"
    | "page_slot_key_forbidden"
    | "page_tree_depth_exceeded"
    | "page_slot_children_exceeded",
  context: PageVisitContext
): void => {
  const slotsPath = Object.freeze([...path, "slots"]);
  context.graph.diagnostics.add("site_package_ref_bad_path", context.source, slotsPath, reason);
  context.graph.state.blockedReferencePrefixes.push(
    Object.freeze({ sourceOrdinal: context.source.ordinal, path: slotsPath })
  );
};

type ValidatedPageSlot = Readonly<{
  slotKey: PageBlockSlotKey;
  children: readonly IndexedPageBlockChild[];
}>;

const validatePageSlots = (
  preflight: PageBlockBoundsPreflight,
  path: readonly PathSegment[],
  allowedSlots: readonly PageBlockSlotKey[],
  context: PageVisitContext
): readonly ValidatedPageSlot[] | null => {
  if (!preflight.hasSlots) return Object.freeze([]);
  if (preflight.depthExceeded) {
    rejectPageSlots(path, "page_tree_depth_exceeded", context);
    return null;
  }
  if (allowedSlots.length === 0) {
    rejectPageSlots(path, "page_slots_forbidden", context);
    return null;
  }
  if (!preflight.structuralSlots) return Object.freeze([]);
  if (
    preflight.structuralSlots.some(
      ({ slotKey }) => !allowedSlots.includes(slotKey as PageBlockSlotKey)
    )
  ) {
    rejectPageSlots(path, "page_slot_key_forbidden", context);
    return null;
  }
  for (const slotKey of allowedSlots) {
    const slot = preflight.structuralSlots.find((candidate) => candidate.slotKey === slotKey);
    if (slot?.arrayLength !== null && (slot?.arrayLength ?? 0) > PAGE_BLOCK_MAX_CHILDREN_PER_SLOT) {
      rejectPageSlots(path, "page_slot_children_exceeded", context);
      return null;
    }
  }
  return Object.freeze(
    allowedSlots.flatMap((slotKey) => {
      const slot = preflight.structuralSlots?.find((candidate) => candidate.slotKey === slotKey);
      return slot && slot.arrayLength !== null
        ? [Object.freeze({ slotKey, children: slot.children })]
        : [];
    })
  );
};

const collectMalformedPageBranchBounds = (
  block: JsonObject,
  path: readonly PathSegment[],
  depth: number,
  context: PageVisitContext,
  preflight = preflightPageBlockBounds(block, depth)
): void => {
  if (!preflight.hasSlots) return;
  if (preflight.depthExceeded) {
    rejectPageSlots(path, "page_tree_depth_exceeded", context);
    return;
  }
  if (!preflight.structuralSlots) return;
  if (
    preflight.structuralSlots.some(
      ({ arrayLength }) => arrayLength !== null && arrayLength > PAGE_BLOCK_MAX_CHILDREN_PER_SLOT
    )
  ) {
    rejectPageSlots(path, "page_slot_children_exceeded", context);
    return;
  }
  for (const { slotKey, children } of preflight.structuralSlots) {
    for (const { child, childIndex } of children) {
      collectMalformedPageBranchBounds(
        child,
        [...path, "slots", slotKey, childIndex],
        depth + 1,
        context
      );
    }
  }
};

const readKnownPageBlockType = (value: JsonValue | undefined): PageBlockType | null =>
  typeof value === "string" && PAGE_REFERENCE_AUTHORITY.blockTypes.includes(value as PageBlockType)
    ? (value as PageBlockType)
    : null;

const referenceFieldsForBlock = (
  type: PageBlockType
): readonly Readonly<{ key: string; targetKind: PackageResourceKind }>[] => {
  if (type === "collection") {
    return Object.freeze([
      Object.freeze({ key: "contentTypeId", targetKind: "content_type" as const }),
      Object.freeze({ key: "queryId", targetKind: "listing_query" as const }),
      Object.freeze({ key: "templateId", targetKind: "listing_template" as const }),
    ]);
  }
  if (type === "filters") {
    return Object.freeze([Object.freeze({ key: "queryId", targetKind: "listing_query" as const })]);
  }
  if (type === "form") {
    return Object.freeze([Object.freeze({ key: "formId", targetKind: "form" as const })]);
  }
  return Object.freeze([]);
};

const collectPageBlockProps = (
  block: JsonObject,
  path: readonly PathSegment[],
  type: PageBlockType,
  context: PageVisitContext
): void => {
  const fields = referenceFieldsForBlock(type);
  for (const breakpoint of PAGE_REFERENCE_AUTHORITY.breakpoints) {
    const propsPath =
      breakpoint === "desktop" ? [...path, "props"] : [...path, "responsive", breakpoint, "props"];
    let props: JsonValue | undefined;
    if (breakpoint === "desktop") props = block.props;
    else if (isJsonObject(block.responsive) && isJsonObject(block.responsive[breakpoint])) {
      props = block.responsive[breakpoint].props;
    }
    if (!isJsonObject(props)) continue;
    for (const field of fields) {
      recordPackageRefOccurrence(
        context.source,
        [...propsPath, field.key],
        field.targetKind,
        "nullable",
        hasOwn(props, field.key),
        props[field.key],
        context.graph
      );
    }
  }
};

const collectPageBlockReferences = (
  block: JsonObject,
  path: readonly PathSegment[],
  depth: number,
  context: PageVisitContext
): void => {
  const preflight = preflightPageBlockBounds(block, depth);
  const type = readKnownPageBlockType(block.type);
  if (!type) {
    collectMalformedPageBranchBounds(block, path, depth, context, preflight);
    return;
  }
  collectPageBlockProps(block, path, type, context);
  const slots = validatePageSlots(
    preflight,
    path,
    PAGE_REFERENCE_AUTHORITY.slotsByType[type],
    context
  );
  if (!slots) return;
  for (const { slotKey, children } of slots) {
    for (const { child, childIndex } of children) {
      collectPageBlockReferences(
        child,
        [...path, "slots", slotKey, childIndex],
        depth + 1,
        context
      );
    }
  }
};

const collectPageCollectionLink = (root: PageReferenceRoot, context: PageVisitContext): void => {
  if (!isJsonObject(root.value.settings)) return;
  const link = root.value.settings.collectionLink;
  if (!isJsonObject(link)) return;
  const basePath: readonly PathSegment[] = [root.rootKey, "settings", "collectionLink"];
  for (const field of [
    { key: "contentTypeId", targetKind: "content_type", presence: "required" },
    { key: "listingQueryId", targetKind: "listing_query", presence: "nullable" },
    { key: "listingTemplateId", targetKind: "listing_template", presence: "nullable" },
  ] as const) {
    recordPackageRefOccurrence(
      context.source,
      [...basePath, field.key],
      field.targetKind,
      field.presence,
      hasOwn(link, field.key),
      link[field.key],
      context.graph
    );
  }
};

const collectPageSourceOccurrences = (
  source: RegisteredPackageResource,
  graph: DiscoveryContext
): void => {
  const root = selectPageReferenceRoot(source);
  if (!root) return;
  const context = Object.freeze({ source, graph });
  collectPageCollectionLink(root, context);
  if (!Array.isArray(root.value.sections)) return;
  root.value.sections.forEach((section, sectionIndex) => {
    if (!isJsonObject(section) || !Array.isArray(section.blocks)) return;
    section.blocks.forEach((block, blockIndex) => {
      if (!isJsonObject(block)) return;
      collectPageBlockReferences(
        block,
        [root.rootKey, "sections", sectionIndex, "blocks", blockIndex],
        1,
        context
      );
    });
  });
};

const pathStartsWith = (value: readonly PathSegment[], prefix: readonly PathSegment[]): boolean =>
  value.length >= prefix.length && prefix.every((segment, index) => segment === value[index]);

const scanRefLikeObjects = (
  value: JsonValue,
  source: RegisteredPackageResource,
  path: readonly PathSegment[],
  context: DiscoveryContext
): void => {
  if (
    context.state.blockedReferencePrefixes.some(
      (prefix) => prefix.sourceOrdinal === source.ordinal && pathStartsWith(path, prefix.path)
    )
  ) {
    return;
  }
  const authority = serializeAuthorityPath(source.ordinal, path);
  if (context.state.registeredReferencePaths.has(authority)) return;
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanRefLikeObjects(child, source, [...path, index], context));
    return;
  }
  if (!isJsonObject(value)) return;
  if (hasOwn(value, "ref") || hasOwn(value, "$ref")) {
    context.diagnostics.add(
      "site_package_ref_bad_path",
      source,
      path,
      "package_ref_path_forbidden"
    );
  }
  for (const key of Object.keys(value).sort(compareFullSitePackageObjectKeys)) {
    scanRefLikeObjects(value[key], source, [...path, key], context);
  }
};

const collectReferenceDiscovery = (registry: PackageResourceRegistry) => {
  const diagnostics = createGraphDiagnostics();
  const state: OccurrenceState = {
    edges: [],
    descriptorsByIdentity: new Map(),
    registeredReferencePaths: new Set(),
    blockedReferencePrefixes: [],
    resolvedDetailPageContentTypes: new Map(),
  };
  const context = Object.freeze({ registry, diagnostics, state });
  for (const source of registry.resources) {
    if (source.kind === "page" || source.kind === "page_template") {
      collectPageSourceOccurrences(source, context);
    } else if (source.kind === "setting" && source.key === "site.contentRoutes") {
      collectContentRouteOccurrences(source, context);
    } else {
      collectFixedSourceOccurrences(source, context);
    }
  }
  for (const source of registry.resources) {
    scanRefLikeObjects(source.seed.desired, source, [], context);
  }
  return Object.freeze({
    edges: state.edges,
    descriptorsByIdentity: state.descriptorsByIdentity,
    batch: diagnostics.read(),
  });
};

const finalizeReferenceDiscovery = (
  edges: readonly PackageReferenceEdge[],
  batch: DiagnosticBatch<TaggedGraphDiagnostic>
): void => {
  if (batch.overflowed) {
    throw new ReferenceGraphError("site_package_too_complex", batch.diagnostics);
  }
  if (edges.length > PACKAGE_LIMITS.referenceEdges) {
    throwStaticComplexity("reference_edges_exceeded");
  }
  throwGraphDiagnostics(batch);
};

export const collectRefsAtAllowedPaths = (
  registry: PackageResourceRegistry
): readonly PackageReferenceEdge[] => {
  const discovery = collectReferenceDiscovery(registry);
  finalizeReferenceDiscovery(discovery.edges, discovery.batch);
  return Object.freeze([...discovery.edges]);
};

type TopologyResource = ReferencePlanTopologyResource;

const stableResourceCompare = (
  left: RegisteredPackageResource,
  right: RegisteredPackageResource
): number =>
  left.ordinal - right.ordinal || compareFullSitePackageText(left.identity, right.identity);

const assertDependencyDepth = (ordered: readonly TopologyResource[]): void => {
  const depthByIdentity = new Map<PackageResourceIdentity, number>();
  for (const resource of ordered) {
    let depth = 0;
    for (const dependency of resource.dependencies) {
      const dependencyDepth = depthByIdentity.get(dependency);
      if (dependencyDepth === undefined) throw new Error("dependency order invariant");
      depth = Math.max(depth, dependencyDepth + 1);
    }
    if (depth > PACKAGE_LIMITS.depth) throwStaticComplexity("dependency_depth_exceeded");
    depthByIdentity.set(resource.identity, depth);
  }
};

export const stableTopologicalSort = (
  registry: PackageResourceRegistry,
  edges: readonly PackageReferenceEdge[]
): readonly TopologyResource[] => {
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
  const declared = new Map(
    [...dependencies].map(([identity, values]) => [identity, new Set(values)])
  );
  const ready = registry.resources
    .filter((resource) => dependencies.get(resource.identity)?.size === 0)
    .sort(stableResourceCompare);
  const ordered: TopologyResource[] = [];
  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) break;
    ordered.push(
      Object.freeze({
        ...current,
        dependencies: Object.freeze(
          [...(declared.get(current.identity) ?? [])].sort(compareFullSitePackageText)
        ),
      })
    );
    for (const dependentIdentity of dependents.get(current.identity) ?? []) {
      const remaining = dependencies.get(dependentIdentity);
      remaining?.delete(current.identity);
      if (remaining?.size === 0) {
        const dependent = registry.byIdentity.get(dependentIdentity);
        if (dependent && !ready.includes(dependent)) {
          ready.push(dependent);
          ready.sort(stableResourceCompare);
        }
      }
    }
  }
  if (ordered.length !== registry.resources.length) {
    throw new ReferenceGraphError("site_package_ref_cycle", [
      { path: "$.resources", reason: "reference_cycle" },
    ]);
  }
  assertDependencyDepth(ordered);
  return Object.freeze(ordered);
};

/** @internal Production-used graph finalizer; direct tests may import it. */
export const finalizeAndSortReferenceGraph = (
  registry: PackageResourceRegistry,
  edges: readonly PackageReferenceEdge[],
  batch: DiagnosticBatch<TaggedGraphDiagnostic>
): readonly TopologyResource[] => {
  finalizeReferenceDiscovery(edges, batch);
  return stableTopologicalSort(registry, edges);
};

export const buildReferencePlan = (pkg: FullSitePackageV1): readonly PlannedPackageResource[] => {
  assertReferenceGraphJsonDepth(pkg.resources);
  const registry = indexUniqueKindKeys(pkg.resources);
  const discovery = collectReferenceDiscovery(registry);
  const ordered = finalizeAndSortReferenceGraph(registry, discovery.edges, discovery.batch);
  return freezeReferencePlan(ordered, discovery.descriptorsByIdentity);
};

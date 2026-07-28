# TASK-547-01-L02: Reference Registry, Graph and Contract Tests
# FileName: TASK-547-01-L02-Reference-Registry-Graph-And-Contract-Tests.md

**Parent Subtask:** TASK-547-01
**Priority:** Critical
**Category:** Solution Kits / Reference Graph
**Estimated Effort:** Medium
**Dependencies:** TASK-547-01-L01
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — implementation remains present; fresh final audit and
validation evidence are pending after drift remediation.

## Overview

Own `referenceRegistry.ts`, `referenceGraph.ts` and graph tests. Consume L01's
frozen resource-kind owner; own package identity, the discriminator-aware
allowlist, stable topological ordering and longest-path dependency-depth
enforcement.

Freeze `PackageRef` exactly as `{ ref: PackageResourceKind; key: string }` with
no extra key. `key` must match
`^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$`; malformed keys fail before lookup.
The closed registry is:

| Source | Exact path/guard | Target | Presence |
| --- | --- | --- | --- |
| `content_entry` | `contentTypeId` | `content_type` | required ref |
| `listing_query` | `query.sourceConfig.contentTypeId` | `content_type` | ref when present; native source discriminator is checked by TASK-547-02 |
| `detail_page` | `contentTypeId` | `content_type` | required ref |
| `detail_page` | `related[*].listingQueryId` | `listing_query` | nullable ref if present; native `kind` rules belong to TASK-547-02 |
| `page` | `data.settings.collectionLink.contentTypeId` when `collectionLink` exists | `content_type` | required ref |
| `page` | same object's `listingQueryId` / `listingTemplateId` | `listing_query` / `listing_template` | nullable ref if present |
| `page_template` | `document.settings.collectionLink.contentTypeId` when `collectionLink` exists | `content_type` | required ref |
| `page_template` | same object's `listingQueryId` / `listingTemplateId` | `listing_query` / `listing_template` | nullable ref if present |
| `page` | every recursive block below `data.sections[*].blocks[*]`: collection `contentTypeId/queryId/templateId`, filters `queryId`, form `formId`, at base/tablet/mobile props | matching declared kind | nullable ref if present |
| `page_template` | the same guarded recursive surfaces below `document.sections[*].blocks[*]` | matching declared kind | nullable ref if present |
| `menu` | `items[*].pageId` | `page` | nullable ref if present |
| shell setting | `desired.value` for `site.homepageId` | `page` | nullable ref |
| shell setting | `desired.value` for `site.navigationMenuId` | `menu` | nullable ref |
| shell setting | `desired.value` for `site.footerTemplateId` | `page_template` | nullable ref |
| `site.contentRoutes` | `desired.value[*].detailPageId` | `detail_page` | nullable ref if present |

There is no `menu.desired.document.items[*].pageId` row: menu navigation items
are the native top-level `desired.items` aggregate, while `desired.document` is
the separate Menu Document V2 appearance/content contract. For content routes,
`type` stays a literal slug cross-checked against exactly one package content
type; it is never rewritten to an ID. Process routes in array order and, within
each route, process present `detailPageId` first and literal `type` second. A
non-null `detailPageId` contributes one occurrence edge plus one substitution
descriptor. A valid `type` contributes one validation-only occurrence edge to
the matched `content_type`: it counts toward the 4,096-edge limit and becomes a
deduplicated direct dependency, but creates no descriptor and is never rewritten.

Before the first write, compare the frozen `PackageResourceIdentity` selected by
a resolved route `type` with the referenced Detail Page's own successfully
resolved required `contentTypeId` target; they must match. A malformed container
or non-object row stops that row. Otherwise order present non-null
`detailPageId` resolution → unique `type` selection → agreement before the next
route. Missing/null/invalid/missing-target detail links, invalid/missing/
ambiguous types and invalid/missing Detail Page `contentTypeId` targets skip only
agreement and retain their existing diagnostic. Each independent success keeps
its original edge (and detail descriptor); agreement adds neither.

A mismatch adds exactly one `site_package_ref_bad_path` diagnostic at the
trusted route `detailPageId` path with static reason
`content_route_detail_content_type_mismatch`. Trusted setting/route indexes may
appear, but no identity, ref key or route slug enters path/reason/static message.

Select exactly one Page-document root by source kind: `page` uses
`seed.desired.data`, while `page_template` uses `seed.desired.document`. Visit
that root's `settings.collectionLink`, `sections[*].blocks[*]` and every child
under only the block type's native allowed `slots.<slotKey>[*]`, bounded by the
native tree-depth/child caps. The opposite root never grants reference authority:
a ref-like object under Page `document` or Page Template `data` is rejected by
the generic scan. A missing/non-object selected root or malformed native
settings/sections/container remains TASK-547-02 native-validation work; graph
discovery neither repairs it nor invents a second native-shape diagnostic.
Traversal is root source order, native capability-registry slot order and child
array order; inspect base props, tablet props, then mobile props at every node.
Import exactly `pageBlockTypes`, `pageBlockCapabilities`, `pageBreakpoints`,
`PAGE_BLOCK_MAX_TREE_DEPTH`, `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT` and the needed
Page types from `core/services/pages/pageDocumentV2.ts`; do not duplicate its
slot-key, block-type, device or limit tables in the package graph. Treat
`pageBlockCapabilities[type].slots` as the persistence slot allowlist and native
slot order. Do not use `getPageBlockActiveSlotKeys`: that editor helper hides
non-destructively preserved `columns` slots above the current `props.count`.
Authored `data.breakpoints`/`document.breakpoints` are not ordering authority;
traverse exported `pageBreakpoints`, mapping `desktop` to base `props` and the
rest to `responsive.<breakpoint>.props`.
TASK-547-04's generator still inserts only its five declared direct-root refs;
that narrower producer does not truncate the general package contract.

At initialization freeze imported Page block types, breakpoints and every slot
array into one private `PAGE_REFERENCE_AUTHORITY`, without copied literals; all
Page decisions use it, so later owner mutation cannot alter paths or order. The
compatibility `REFERENCE_PATHS` export is exactly the recursively frozen fixed
non-Page rows; `page`/`page_template` are absent. `collectFixedSourceOccurrences`
is never invoked for either kind: only the kind-selected walker grants their
authority. Neither registry exposes a mutable validation boundary.

The native bounds are reject boundaries, not scan cutoffs:
`PAGE_BLOCK_MAX_TREE_DEPTH = 4` (root block is depth 1) and
`PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`. For both `page` and `page_template`,
depth 4 and 24 children are accepted and completely scanned; a depth-5 child,
any `slots` member on a depth-4 block or a 25th child rejects regardless of the
block discriminator; with a valid discriminator, an unknown/non-native slot key
or `slots` on a non-slot-capable block also rejects the graph as
`site_package_ref_bad_path`. No structural branch may be clipped or ignored,
even when the invalid branch contains no reference. Bounds enforcement is
independent of a valid `block.type`: before discriminator authority is used,
derive a read-only preflight of the block's own `slots` member, current depth,
array child counts and indexed object children. The preflight records facts only;
it emits no diagnostic and registers no reference, so it cannot reorder the
valid-node first-match contract below.

Reference discovery has one authority path per occurrence. Fixed registry rows
and the Page walker register
`JSON.stringify([source.ordinal, exactRelativeSegmentArray])` in
`registeredReferencePaths` before validating a present required/nullable value;
the resource ordinal scopes the authority to exactly one source resource, and
string and numeric segments therefore cannot collide.
For a valid discriminator, the Page slot validator consumes that preflight and
returns either the native-slot-ordered indexed object children or `null` after
emitting its one first-match structural diagnostic. For a malformed
discriminator, a bounds-only walker consumes the same preflight, checks depth
then child count and recursively visits every array-valued own slot in canonical
object-key order without ever granting reference authority to that node or its
descendants. General malformed slot-container/value/child shapes remain owned
by later native validation; the bounds-only walker follows only object children
at their original array indexes.

Every structural rejection uses one helper that emits exactly one diagnostic at
`[...path, "slots"]`, adds exactly
`{ sourceOrdinal: source.ordinal, path: [...path, "slots"] }` to
`blockedReferencePrefixes`, and stops only that rejected `slots` subtree. Sibling
branches continue discovery. On valid success, recurse explicitly with
`[...path, "slots", slotKey, childIndex]`, retaining the original child index.

After registered discovery, one generic ref-like scan walks the complete desired
value of each source resource. It skips an exact `registeredReferencePaths`
member and any `blockedReferencePrefixes` subtree only when that authority has
the same `source.ordinal`; an identical relative path in another resource can
never inherit the skip. Every other ref-like object gets exactly one
`package_ref_path_forbidden`. This prevents a valid nested ref from being
double-classified and prevents a structurally rejected Page branch from
producing duplicate child findings. An unknown/malformed block discriminator
itself emits no graph diagnostic and registers no reference path anywhere in its
branch: native validation owns that discriminator. Its bounds-only traversal
adds a blocked prefix only where depth or child count actually rejects; the
generic scan therefore forbids every ref-like descendant outside such a prefix,
while a ref-like value inside the rejected `slots` subtree cannot create a
duplicate generic finding.

Absent or `null` nullable paths add no edge. Every present non-null allowed value
must be an exact ref of the frozen target kind. A discriminator-mismatched block
is not an allowed path, even if it uses the same property name. All other
ref-shaped objects/paths, including non-native slot keys and `$ref`, are invalid.
Enforce 4,096 occurrence edges, JSON level 64 and at most 100 diagnostics before
sorting; after cycle detection, enforce dependency-path depth 64.

Diagnostics expose a sanitized path of at most 240 characters and exactly one
member of this closed vocabulary:

```ts
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
```

All validation lists below are first-match precedence, not unordered sets.
For an exact ref validate object/presence → exact own-key shape → `ref` kind →
canonical key → target lookup; only the first failure is reported. Freeze the
condition mapping: duplicate kind/key → `duplicate_resource_identity`;
non-object required/present ref → `expected_package_ref`; extra/missing ref member
→ `package_ref_shape_invalid`; wrong `ref` discriminator →
`package_ref_kind_mismatch`; non-canonical `key` → `package_ref_key_invalid`;
ref-like value outside the registry → `package_ref_path_forbidden`; absent target
→ `package_ref_target_missing`; malformed content-routes container/row →
`content_routes_invalid`; malformed route `type` →
`content_route_type_invalid`; zero/multiple matching slugs →
`content_route_content_type_missing|content_route_content_type_ambiguous`; a
fully resolved route/Detail Page content-type identity inequality →
`content_route_detail_content_type_mismatch`.
For every valid-discriminator Page node with `slots`, validate in this first-match
order: any `slots` member at depth 4 → `page_tree_depth_exceeded`; otherwise a
non-slot-capable block → `page_slots_forbidden`; otherwise the first
unknown/non-native slot key → `page_slot_key_forbidden`; otherwise a 25th child
in one native slot → `page_slot_children_exceeded`. The facts-only preflight
must not let child-count failure leapfrog the atom or unknown-key checks. For a
malformed-discriminator branch, bounds-only first match is a `slots` member at
depth 4 → `page_tree_depth_exceeded`, then the first 25-child array-valued own
slot → `page_slot_children_exceeded`, then recursive child traversal; do not
emit `page_slots_forbidden` or `page_slot_key_forbidden` without a valid type.
Each of these failures uses the single diagnostic/blocked-prefix helper above.
The 4,097th edge, a longest dependency path of 65 edges/66 resources, 101st
diagnostic and cycle → their corresponding static codes; resolver map
miss/source mismatch →
`resolved_target_id_missing|planned_reference_drift`. The top-level error code
remains the matching `site_package_ref_*` or `site_package_too_complex`. On the
101st diagnostic, discard the partial diagnostic list and throw the single
static `diagnostic_limit_exceeded` diagnostic at `$.resources`. No supplied key,
slug, value, payload, target identity or cycle member may appear in a reason.

JSON depth is measured independently for every `seed.desired`: the `desired`
root is level 1 and every own-property value or array element, including an
object, array, scalar or `null`, is one level deeper; property names do not add a
level. Level 64 is accepted. Level 65 throws `site_package_too_complex` with
exactly `{ path: "$.resources", reason: "json_depth_exceeded" }`; no dynamic
desired key is rendered. L01's raw traversal emits this same code/diagnostic
before calling the graph, while L02 repeats it as the first guard for already-
typed callers. Thus depth wins over duplicate identity at both boundaries.

Dependency depth is a separate longest-path edge count over the deduplicated
direct-dependency DAG. A source/root resource with no dependencies has depth 0;
every dependency edge increments the candidate path depth by exactly one, and a
resource's depth is the maximum of those candidates across all its direct
dependencies. The limit 64 therefore accepts a chain of exactly 64 edges/65
resources and rejects a chain of 65 edges/66 resources with exactly
`{ path: "$.resources", reason: "dependency_depth_exceeded" }`. Resource count,
occurrence-edge count and a one-based node count must not be substituted for
this metric.

Freeze the global graph-validation phases as JSON-depth preflight → unique
identity indexing → reference/path/target discovery → discovery finalization
→ stable topological traversal/cycle detection → dependency-depth
calculation. Duplicate identities
terminate after indexing and use the same 100/101 overflow rule below. Semantic
discovery uses one global tagged diagnostic stream, never per-error-code
collectors, and content-route ambiguity is accumulated rather than thrown inline.
Each offending occurrence contributes at most one diagnostic after the local
first-match rules above. Diagnostics retain the frozen discovery order across
categories. For 1..100 mixed semantic diagnostics, choose the top-level code by
fixed priority `site_package_ref_bad_path` → `site_package_ref_missing` →
`site_package_ref_ambiguous`, independent of declaration order, and expose the
complete mixed list without category filtering. The 101st attempted diagnostic
globally, including duplicate identities, discards every partial diagnostic and
throws the one `diagnostic_limit_exceeded` singleton specified above.

During semantic discovery, count every accepted occurrence edge but do not throw
inline at 4,097. Finalize in the exact order diagnostic overflow → edge overflow
→ 1..100 semantic diagnostics: a 101st diagnostic wins with its singleton; else
4,097 accepted edges win with the one `reference_edges_exceeded` diagnostic at
`$.resources`; otherwise throw the complete semantic list by fixed code priority.
Therefore bad-path + 4,097 accepted edges returns edge overflow, while 101 mixed
diagnostics + edge overflow returns diagnostic overflow. Cycle and dependency-
depth checks run only after this finalizer returns with no diagnostic.
`ReferenceGraphError` receives only an already-bounded list and never slices or
repairs it; overflow behavior belongs exclusively to the collectors.

The route/detail mismatch is one ordinary bad-path semantic diagnostic in this
same stream. A resolved mismatching route still contributes its accepted
`detailPageId` and `type` occurrence edges before comparison, and the Detail
Page's own valid `contentTypeId` remains its independent occurrence edge. Thus
1..100 mismatches do not suppress edge overflow, while a 101st mismatch still
selects diagnostic overflow by the finalizer above.

Topological traversal must first determine whether the complete graph is
acyclic. Only a complete acyclic order reaches the longest-path dependency-depth
calculation. Consequently, a cyclic graph that also contains an independent
65-edge/66-resource over-depth branch returns exactly
`{ path: "$.resources", reason: "reference_cycle" }`, never
`dependency_depth_exceeded`; any semantic discovery or finalization failure
prevents both cycle detection and dependency-depth calculation.

Reason-to-code ownership is closed: duplicate identity →
`site_package_ref_duplicate`; expected/shape/kind/key/path, content-route
container/type/detail-content-type mismatch, Page-structure and planned-drift reasons →
`site_package_ref_bad_path`; missing target/content type/resolved ID →
`site_package_ref_missing`; ambiguous content type →
`site_package_ref_ambiguous`; cycle → `site_package_ref_cycle`; and every
JSON/edge/diagnostic/dependency limit reason → `site_package_too_complex`.

Diagnostic paths are display-only and use `encodeReferenceDiagnosticPath`.
Collection names, resource ordinals, numeric array indexes and literal segments
from the closed registry/Page capability owners are trusted; at the first other
object-key segment the encoder appends `[redacted]` and stops. JSON depth, edge,
diagnostic, dependency and cycle diagnostics use static `$.resources`. A supplied
key, slug, target identity, unknown slot name or arbitrary desired key can never
enter the path, reason or error message.

Freeze the complete plan shapes:

```ts
export type FrozenJsonValue =
  | JsonPrimitive
  | readonly FrozenJsonValue[]
  | { readonly [key: string]: FrozenJsonValue };
export type FrozenJsonObject = { readonly [key: string]: FrozenJsonValue };
export type PackageResourceIdentity = `${PackageResourceKind}:${string}`;
type PackageReferenceEdge = Readonly<{
  from: PackageResourceIdentity;
  to: PackageResourceIdentity;
  path: readonly (string | number)[]; // relative to source seed.desired
  purpose: "substitute" | "content_route_type";
}>;
export type PlannedPackageReference = Readonly<{
  path: readonly (string | number)[];
  targetIdentity: PackageResourceIdentity;
}>;
export type PlannedPackageResource = Readonly<{
  identity: PackageResourceIdentity;
  kind: PackageResourceKind;
  collection: PackageResourceCollection;
  key: string;
  ordinal: number;
  seed: Readonly<{ key: string; desired: FrozenJsonObject }>;
  dependencies: readonly PackageResourceIdentity[];
  references: readonly PlannedPackageReference[];
}>;
```

Every accepted `PackageRef` produces one `purpose:"substitute"` occurrence edge
and one descriptor; the content-route literal produces only the
`purpose:"content_route_type"` edge. Count occurrences before deduplication.
`dependencies` contains unique direct targets sorted lexicographically;
`references` keeps occurrence discovery order. The plan is topologically sorted
with dependencies first and stable ties by original package ordinal, then
identity. Every identity/dependency lexical sort/tie uses L01's
`compareFullSitePackageText`, imported from
`core/services/kits/fullSitePackage/schema.ts`; `localeCompare`, `Intl` and host-
locale ordering are forbidden. Discovery is package collection/declaration order; registry-row order;
array index order; and, for Page blocks, section/root-block order followed by
depth-first pre-order. At each Page node inspect the discriminator's applicable
properties in `contentTypeId`, `queryId`, `templateId`, `formId` order for base,
tablet and mobile, then recurse through native slot order and child order.
The malformed-discriminator bounds-only traversal instead orders own slot keys
with L01's `compareFullSitePackageObjectKeys`, then original child index; this
order is used only to select/traverse structural facts, never to authorize a
path or expose an untrusted slot key in a diagnostic.
The seed, every descriptor/path/dependency array and the outer plan are
deep-cloned and frozen. Diagnostic display paths are derived sanitized text,
never substitution authority.

This leaf also owns `resolvePlannedPackageResourceRefs(resource, resolvedIds)`.
It deep-clones `resource.seed.desired`, visits only the recorded descriptors,
requires the value at each path to remain the exact ref/target captured by the
plan, substitutes the mapped ID and rejects missing IDs or any source drift with
a static `site_package_ref_missing` or `site_package_ref_bad_path` respectively.
It performs no allowlist/ref-like scan, graph build or input/descriptor mutation.
L01 planning placeholders and L02 actual intended IDs use
this one exported resolver; neither consumer duplicates the recursive walker.

This leaf is the mandatory second half of complete package validation, with
boundaries frozen as follows:

- an `unknown`/raw entry point calls `normalizeFullSitePackageForWrite` exactly
  once, then `buildReferencePlan` exactly once, before lazy DB acquisition;
- `buildReferencePlan` accepts only `FullSitePackageV1` and never normalizes;
- typed `applyFullSitePackage` accepts an already-normalized package and builds
  its own private plan exactly once, with zero normalizer calls;
- two-argument `planFullSiteInstall(pkg,deps)` accepts an already-normalized
  package and builds once before dependency reads; its three-argument overload
  consumes the exact frozen plan supplied by apply and builds zero times; and
- `prepareFullSiteSaga` consumes that same plan and calls neither function.

The CLI raw boundary and service trust boundary each validate independently, so
an actual CLI→service apply intentionally performs one CLI graph build plus one
private service graph build, not one shared/caller-supplied plan. Do not add a
wrapper helper, normalize at typed internal boundaries or expose the plan through
public input/dependencies.

## Security Contract

Pure Bun-free code; no endpoint. Never recursively substitute arbitrary objects
or strings. Bound edges/depth/diagnostics before sorting.

## Implementation Pseudocode

```ts
export type AllowedReferencePath = Readonly<{
  sourceKind: PackageResourceKind;
  segments: readonly PathSegment[];
  targetKind: PackageResourceKind;
  settingKey?: string;
}>;
const freezeReferencePath = (row: AllowedReferencePath): AllowedReferencePath =>
  Object.freeze({ ...row, segments: Object.freeze([...row.segments]) });
export const REFERENCE_PATHS: readonly AllowedReferencePath[] = Object.freeze(
  FIXED_NON_PAGE_REFERENCE_PATH_ROWS.map(freezeReferencePath),
);
type TaggedGraphDiagnostic = Readonly<{
  code: "site_package_ref_bad_path" | "site_package_ref_missing" | "site_package_ref_ambiguous";
  diagnostic: ReferenceGraphDiagnostic;
}>;
class GraphDiagnostics {
  private readonly values: TaggedGraphDiagnostic[] = [];
  add(
    code: TaggedGraphDiagnostic["code"],
    path: readonly (string | number)[],
    reason: ReferenceGraphDiagnosticReason,
  ): void {
    if (this.values.length === PACKAGE_LIMITS.diagnostics) throwDiagnosticLimitSingleton();
    this.values.push({ code, diagnostic: { path: encodeReferenceDiagnosticPath(path), reason } });
  }
  throwIfAny(): void {
    const code = GRAPH_ERROR_PRIORITY.find((candidate) =>
      this.values.some((value) => value.code === candidate)
    );
    if (code) throw new ReferenceGraphError(code, this.values.map(({ diagnostic }) => diagnostic));
  }
}
class DuplicateIdentityDiagnostics {
  private readonly values: ReferenceGraphDiagnostic[] = [];
  add(collectionPath: string): void {
    if (this.values.length === PACKAGE_LIMITS.diagnostics) throwDiagnosticLimitSingleton();
    this.values.push({ path: collectionPath, reason: "duplicate_resource_identity" });
  }
  throwIfAny(): void {
    if (this.values.length) throw new ReferenceGraphError("site_package_ref_duplicate", this.values);
  }
}
const indexUniqueKindKeys = (resources: FullSitePackageResources) => {
  const duplicates = new DuplicateIdentityDiagnostics();
  const registry = createMutableRegistry();
  forEachPackageResource(resources, ({ collection, resource }) => {
    if (!registerUnique(registry, collection, resource)) {
      duplicates.add(`$.resources.${collection}`);
    }
  });
  duplicates.throwIfAny();
  return freezeRegistry(registry);
};
const collectContentRouteOccurrences = (source, context) => {
  for (const { route, path } of readStructuralContentRoutes(source, context)) {
    const detailPage = collectNullableDetailPageOccurrence(route, path, context);
    const contentType = collectUniqueRouteTypeOccurrence(route, path, context);
    if (!detailPage || !contentType) continue;
    const detailContentType = context.resolvedDetailPageContentTypes.get(
      detailPage.identity,
    );
    if (!detailContentType) continue; // The detail page's own ref diagnostic owns this case.
    if (detailContentType !== contentType.identity) {
      context.collector.add(
        "site_package_ref_bad_path",
        [...path, "detailPageId"],
        "content_route_detail_content_type_mismatch",
      );
    }
  }
};
const collectPackageOccurrences = (context) => {
  const state = createOccurrenceState(context);
  for (const source of context.registry.resources) {
    const sourceContext = { ...context, ...state, source };
    if (isContentRoutesSetting(source)) {
      collectContentRouteOccurrences(source, sourceContext); // Sole route collector.
      continue;
    }
    if (source.kind === "page" || source.kind === "page_template") {
      collectPageSourceReferences(sourceContext); // Sole Page-backed authority.
      continue;
    }
    collectFixedSourceOccurrences(
      sourceContext,
      // Invoked only after exact ref validation and successful target lookup.
      (row, target) => {
        if (
          source.kind === "detail_page" &&
          row.segments.length === 1 &&
          row.segments[0] === "contentTypeId" &&
          target.kind === "content_type"
        ) {
          context.resolvedDetailPageContentTypes.set(source.identity, target.identity);
        }
      },
    );
  }
  return state;
};
const PAGE_REFERENCE_AUTHORITY = Object.freeze({
  blockTypes: Object.freeze([...pageBlockTypes]),
  breakpoints: Object.freeze([...pageBreakpoints]),
  slotsByType: Object.freeze(
    Object.fromEntries(
      pageBlockTypes.map((type) => [
        type,
        Object.freeze([...pageBlockCapabilities[type].slots]),
      ]),
    ) as Readonly<Record<PageBlockType, readonly PageBlockSlotKey[]>>,
  ),
});
type PageReferenceRoot = Readonly<{
  rootKey: "data" | "document";
  value: JsonObject;
}>;
const selectPageReferenceRoot = (
  source: RegisteredPackageResource,
): PageReferenceRoot | null => {
  const rootKey =
    source.kind === "page"
      ? "data"
      : source.kind === "page_template"
        ? "document"
        : null;
  if (rootKey === null) return null;
  const value = source.seed.desired[rootKey];
  return isJsonObject(value) ? { rootKey, value } : null;
};
type PageReferenceVisitContext = Readonly<{
  source: RegisteredPackageResource;
  root: PageReferenceRoot;
  collector: GraphDiagnostics;
  registeredReferencePaths: Set<string>;
  blockedReferencePrefixes: ReferenceAuthorityPath[];
}>;
type ReferenceAuthorityPath = Readonly<{
  sourceOrdinal: number;
  path: readonly (string | number)[];
}>;
const serializeAuthorityPath = (
  sourceOrdinal: number,
  path: readonly (string | number)[],
) => JSON.stringify([sourceOrdinal, path]);
type IndexedPageBlockChild = Readonly<{
  child: JsonObject;
  childIndex: number;
}>;
type PreflightPageSlot = Readonly<{
  slotKey: string;
  arrayLength: number | null;
  children: readonly IndexedPageBlockChild[];
}>;
type PageBlockBoundsPreflight = Readonly<{
  hasSlots: boolean;
  depthExceeded: boolean;
  // null means the present slots value is not an object; native validation owns its shape.
  structuralSlots: readonly PreflightPageSlot[] | null;
}>;
const preflightPageBlockBounds = (
  block: JsonObject,
  depth: number,
): PageBlockBoundsPreflight => {
  if (!hasOwn(block, "slots")) {
    return { hasSlots: false, depthExceeded: false, structuralSlots: null };
  }
  const depthExceeded = depth >= PAGE_BLOCK_MAX_TREE_DEPTH;
  const slotsValue = block.slots;
  if (!isJsonObject(slotsValue)) {
    return { hasSlots: true, depthExceeded, structuralSlots: null };
  }
  const structuralSlots = Object.keys(slotsValue)
    .sort(compareFullSitePackageObjectKeys)
    .map((slotKey): PreflightPageSlot => {
      const value = slotsValue[slotKey];
      if (!Array.isArray(value)) {
        return { slotKey, arrayLength: null, children: [] };
      }
      const children = value.flatMap((child, childIndex) =>
        isJsonObject(child) ? [{ child, childIndex }] : [],
      );
      return { slotKey, arrayLength: value.length, children };
    });
  return { hasSlots: true, depthExceeded, structuralSlots };
};
const rejectPageSlots = (
  path: readonly (string | number)[],
  reason:
    | "page_slots_forbidden"
    | "page_slot_key_forbidden"
    | "page_tree_depth_exceeded"
    | "page_slot_children_exceeded",
  context: PageReferenceVisitContext,
): void => {
  const slotsPath = [...path, "slots"];
  context.collector.add("site_package_ref_bad_path", slotsPath, reason);
  context.blockedReferencePrefixes.push({
    sourceOrdinal: context.source.ordinal,
    path: slotsPath,
  });
};
type ValidatedPageSlot = Readonly<{
  slotKey: PageBlockSlotKey;
  children: readonly IndexedPageBlockChild[];
}>;
const validateSlotsFirstMatch = (
  preflight: PageBlockBoundsPreflight,
  path: readonly (string | number)[],
  allowedSlots: readonly PageBlockSlotKey[],
  context: PageReferenceVisitContext,
): readonly ValidatedPageSlot[] | null => {
  if (!preflight.hasSlots) return [];
  if (preflight.depthExceeded) {
    rejectPageSlots(path, "page_tree_depth_exceeded", context);
    return null;
  }
  if (allowedSlots.length === 0) {
    rejectPageSlots(path, "page_slots_forbidden", context);
    return null;
  }
  if (preflight.structuralSlots === null) return []; // TASK-547-02 later owns native shape.
  const firstUnknown = preflight.structuralSlots.find(
    ({ slotKey }) => !allowedSlots.includes(slotKey as PageBlockSlotKey),
  );
  if (firstUnknown) {
    rejectPageSlots(path, "page_slot_key_forbidden", context);
    return null;
  }
  for (const slotKey of allowedSlots) {
    const slot = preflight.structuralSlots.find((candidate) => candidate.slotKey === slotKey);
    if (
      slot &&
      slot.arrayLength !== null &&
      slot.arrayLength > PAGE_BLOCK_MAX_CHILDREN_PER_SLOT
    ) {
      rejectPageSlots(path, "page_slot_children_exceeded", context);
      return null;
    }
  }
  return allowedSlots.flatMap((slotKey) => {
    const slot = preflight.structuralSlots?.find((candidate) => candidate.slotKey === slotKey);
    return slot?.arrayLength === null || slot === undefined
      ? []
      : [{ slotKey, children: slot.children }];
  });
};
const collectMalformedPageBranchBounds = (
  block: JsonObject,
  path: readonly (string | number)[],
  depth: number,
  context: PageReferenceVisitContext,
  preflight = preflightPageBlockBounds(block, depth),
): void => {
  if (!preflight.hasSlots) return;
  if (preflight.depthExceeded) {
    rejectPageSlots(path, "page_tree_depth_exceeded", context);
    return;
  }
  if (preflight.structuralSlots === null) return;
  const firstOversized = preflight.structuralSlots.find(
    ({ arrayLength }) =>
      arrayLength !== null && arrayLength > PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  );
  if (firstOversized) {
    rejectPageSlots(path, "page_slot_children_exceeded", context);
    return;
  }
  for (const { slotKey, children } of preflight.structuralSlots) {
    for (const { child, childIndex } of children) {
      collectMalformedPageBranchBounds(
        child,
        [...path, "slots", slotKey, childIndex],
        depth + 1,
        context,
      );
    }
  }
};
const collectPageBlockReferences = (
  block: JsonObject, // PackageRefs exist before native ID substitution.
  path: readonly (string | number)[],
  depth: number, // Root block = 1.
  context: PageReferenceVisitContext,
): void => {
  const preflight = preflightPageBlockBounds(block, depth);
  const type = readKnownPageBlockType(block.type, PAGE_REFERENCE_AUTHORITY.blockTypes);
  if (!type) {
    // Enforce bounds through this branch, but grant no ref authority below it.
    collectMalformedPageBranchBounds(block, path, depth, context, preflight);
    return;
  }
  inspectAndRegisterReferenceProps(
    block,
    path,
    type,
    PAGE_REFERENCE_AUTHORITY.breakpoints,
    context,
  );
  const slots = validateSlotsFirstMatch(
    preflight,
    path,
    PAGE_REFERENCE_AUTHORITY.slotsByType[type],
    context,
  );
  if (slots === null) return;
  for (const { slotKey, children } of slots) {
    children.forEach(({ child, childIndex }) =>
      collectPageBlockReferences(
        child,
        [...path, "slots", slotKey, childIndex],
        depth + 1,
        context,
      )
    );
  }
};
const collectPageSourceReferences = (
  context: Omit<PageReferenceVisitContext, "root">,
): void => {
  const root = selectPageReferenceRoot(context.source);
  if (!root) return; // TASK-547-02 owns malformed native root/container shape.
  const pageContext = { ...context, root };
  collectPageCollectionLinkReferences(root.value, [root.rootKey], pageContext);
  forEachNativeRootBlock(root.value, [root.rootKey], (block, path) =>
    collectPageBlockReferences(block, path, 1, pageContext),
  );
};
const collectRefsAtAllowedPaths = (registry: PackageResourceRegistry) => {
  const diagnostics = new GraphDiagnostics();
  const registeredReferencePaths = new Set<string>();
  const blockedReferencePrefixes: ReferenceAuthorityPath[] = [];
  const resolvedDetailPageContentTypes = new Map<
    PackageResourceIdentity,
    PackageResourceIdentity
  >();
  const { edges, descriptorsByIdentity } = collectPackageOccurrences({
    registry,
    diagnostics,
    registeredReferencePaths,
    blockedReferencePrefixes,
    resolvedDetailPageContentTypes,
  });
  scanRefLikeObjectsOnce({
    registry,
    diagnostics,
    registeredReferencePaths,
    blockedReferencePrefixes,
  });
  return { edges, descriptorsByIdentity, diagnostics };
};
const assertDependencyDepth = (
  ordered: readonly PlannedPackageResource[],
): void => {
  const depthByIdentity = new Map<PackageResourceIdentity, number>();
  for (const resource of ordered) {
    let depth = 0;
    for (const dependency of resource.dependencies) {
      const dependencyDepth = depthByIdentity.get(dependency);
      if (dependencyDepth === undefined) throw new Error("dependency order invariant");
      depth = Math.max(depth, dependencyDepth + 1);
    }
    if (depth > PACKAGE_LIMITS.depth) throwDependencyDepthSingleton();
    depthByIdentity.set(resource.identity, depth);
  }
};
export const stableTopologicalSort = (registry, edges) => {
  const ordered = collectStableKahnOrder(registry, edges);
  if (ordered.length !== registry.resources.length) throwReferenceCycleSingleton();
  // The complete acyclic order is the sole input to longest-path validation.
  assertDependencyDepth(ordered);
  return ordered;
};
export function buildReferencePlan(pkg: FullSitePackageV1) {
  assertReferenceGraphJsonDepth(pkg.resources);
  const registry = indexUniqueKindKeys(pkg.resources); // Bounded duplicate 100/101 finalizer.
  const { edges, descriptorsByIdentity, diagnostics } = collectRefsAtAllowedPaths(registry);
  // collectRefsAtAllowedPaths already ran the generic scan; its 101st add throws first.
  // Finish all semantic failures before topology, cycle and dependency-depth work.
  if (edges.length > PACKAGE_LIMITS.referenceEdges) throwReferenceEdgesSingleton();
  diagnostics.throwIfAny();
  const ordered = stableTopologicalSort(registry, edges); // Cycle first, then depth.
  return freezePlan(ordered, descriptorsByIdentity);
}
export function resolvePlannedPackageResourceRefs(resource, resolvedIds) {
  return substituteRecordedDescriptors(cloneJson(resource.seed.desired), resource.references, resolvedIds);
}
const pkg = normalizeFullSitePackageForWrite(rawPackage);
buildReferencePlan(pkg);
// Only after both calls succeed may the existing lazy DB loader/import run.
```

Data flow: normalized package → JSON-depth guard → unique registry → package-
ordered fixed discovery plus kind-selected Page `data`/Page Template `document`
discovery (record successful Detail Page content-type targets) and route-ordered
detail/type/agreement discovery → generic ref-like scan → semantic finalizer →
stable cycle-first topology → dependency depth → frozen plan.
Errors distinguish duplicate/missing/ambiguous/cycle/bad-path with only the
static redacted diagnostics above. TASK-547-02 owns post-substitution native
`desired` validation; this leaf certifies only ref placement/resolution/order.

Core tests pin the exact frozen `REFERENCE_PATHS` rows and absence of both Page
kinds. In `full-site-package-references-page.test.ts`, four named regressions pin:
Page `data` and Page Template `document` accept/substitute root plus recursive
refs, asserting every complete descriptor array exactly with `data`/`document`
first; opposite-root ref-likes are forbidden. Every accepted ref yields one occurrence and
descriptor, never a fixed-walker duplicate. Substitution changes only recorded
leaves and hands the otherwise unchanged selected root to TASK-547-02 validation.
That suite also owns every Page table row; absent/null/non-null device/nesting
behavior, required collection content type, discriminator cross-product,
deterministic recursion and rejection of `menu.desired.document.items`.
For both `page` and `page_template`, pin accepted depth 4/rejected depth 5,
accepted 24/rejected 25 children, an unknown native slot and slots on an atom;
each rejection occurs rather than truncating a reference-bearing final branch.
Pin that a valid nested registered ref yields one edge/descriptor and zero
forbidden diagnostics, while a structurally blocked slot subtree yields exactly
its first-match Page diagnostic and no duplicate descendant ref diagnostic.
Use four independent (non-loop-collapsed) malformed-discriminator regressions:

| Source kind | Depth-4 malformed block's own `slots` | Expected graph result |
| --- | --- | --- |
| `page` | depth-5 child, no ref-like descendant | exactly one `page_tree_depth_exceeded` and no other diagnostic |
| `page` | depth-5 child containing a ref-like value | the same single structural diagnostic; no `package_ref_path_forbidden` duplicate |
| `page_template` | depth-5 child, no ref-like descendant | exactly one `page_tree_depth_exceeded` and no other diagnostic |
| `page_template` | depth-5 child containing a ref-like value | the same single structural diagnostic; no `package_ref_path_forbidden` duplicate |

For each source kind, separately pin an in-bounds malformed-discriminator branch
whose descendant is ref-like: it has no registered edge/descriptor or structural
diagnostic and receives exactly one generic `package_ref_path_forbidden`. These
fixtures prove behaviorally that only an actual bounds rejection suppresses its
descendant generic finding; `blockedReferencePrefixes` remains private and tests
must not require an exported production inspection seam or assert its internal
array cardinality directly.

Run separately named `page` and `page_template` reverse-authored malformed
multi-sibling cases (shared shape support is allowed). Author root keys in order
`zeta-private`, `safe-private`, `alpha-private`, `"10"`, `"2"`; keep arrays ≤24,
put object children after scalar/`null` sentinels at distinct nonzero indexes and
keep every descendant discriminator malformed. Canonical key order `"2"`, `"10"`,
`alpha-private`, `safe-private`, `zeta-private` must yield exact reason order
`page_tree_depth_exceeded, page_slot_children_exceeded, page_tree_depth_exceeded,
page_slot_children_exceeded, package_ref_path_forbidden`: branches 1/3 end in
depth rejection, 2/5 in child-count rejection, each with a ref-like sentinel
inside rejected nested `slots`; the in-bounds `safe-private` sibling has its one
sentinel outside every rejected prefix. Exact complete results prove continued
sibling discovery, preserved child indexes, and neither narrow nor ancestor-wide
blocked prefixes. Pin all display paths to the trusted prefix plus `[redacted]`,
the static reasons/message, and absence of supplied slot keys/ref sentinels from
every path, reason and message.
Pin exact ref keys/kind/shape; every closed reason code and condition mapping;
the fixed diagnostic-overflow singleton; and sentinel non-disclosure for
duplicate, missing, wrong-kind, malformed-key, forbidden-path, content-route,
depth, edge, cycle, resolved-ID and drift failures. Cross-product precedence
cases pin extra+wrong-kind+bad-key → shape, exact-shape wrong-kind+bad-key → kind,
depth-4 atom with slots and depth-4 layout with an unknown slot → depth, shallower
atom with any slots → atom, and a shallower slot-capable unknown key → slot-key.
Also pin that shallower valid atom+25 children → atom and valid unknown-slot+25
children → slot-key (the preflight cannot leapfrog valid-type authority), while
shallower malformed-discriminator+25 children → child-count and depth-4
malformed-discriminator+25 children → depth. Every malformed structural case
must expose one diagnostic at the block's `slots` path and no duplicate generic
descendant finding, never a discriminator/atom/slot-key diagnostic. The helper's
same-path prefix remains a private implementation invariant proven through this
observable result and the source-ordinal scope cases below.
Pin object-only, object/array, scalar and `null` terminals at exact JSON level 64
and reject the same shapes at 65 with the exact static `json_depth_exceeded`
singleton. Raw normalize→graph and forged-typed duplicate+depth inputs both pin
depth precedence. Forbidden-path and depth sentinels must be absent from complete
paths/reasons/messages, not only from reasons.
Mix bad-path, missing-target and ambiguity occurrences in both declaration
orders: the fixed top-level priority must not change, while the complete list
retains each order's frozen discovery order. Pin missing+ambiguity without a bad
path, ambiguity alone, exactly 100 mixed diagnostics, a 101st mixed diagnostic
and duplicate-identity 100/101; both 101 cases must discard the partial list. Pin
bad-path + 4,097 accepted edges → edge singleton and 101 mixed diagnostics +
edge overflow → diagnostic singleton.

Pin registered-path authority scope with two Page resources that use the same
relative segment path but different block discriminators: one discriminator
allows the registered reference and the other forbids it. Run both resource
declaration orders and assert that the forbidden occurrence is reported in both.
Separately pin blocked-prefix scope with two resources at the same relative Page
block/slot prefix: one produces a structural slot failure and therefore a blocked
prefix, while the other has a ref-like descendant that the generic scan must
report. Run both declaration orders so the blocked and scanned resources swap
ordinals explicitly; the second resource's forbidden finding must never be
suppressed. Together with the single-diagnostic/no-duplicate cases above, this
is the public behavioral proof of exact-prefix and source-ordinal isolation; do
not expose the private prefix collector solely for tests.

Pin runtime immutability of the exported fixed registry's outer array, rows and
segment arrays with mutation attempts. After the graph module has captured its
private Page snapshot, synchronously attempt to widen, narrow and reorder the
imported `pageBlockTypes` and `pageBreakpoints` arrays; mutate slot-array contents
and reassign/remap `pageBlockCapabilities[type].slots`. Graph acceptance and
traversal order must remain unchanged. Save every original descriptor/value and
restore all imported owners in `finally`.

Pin occurrence-edge count versus lexicographically deduplicated direct
dependencies; exact stable topological order; exact
`PlannedPackageResource`/`PlannedPackageReference` keys and deep freeze; and
content-route order where `detailPageId` has a descriptor, `type` adds a counted
dependency edge, and `type` remains unchanged after substitution. Pin exact
matching route/Detail Page content-type targets as accepted and mismatching
targets as exactly one `site_package_ref_bad_path` /
`content_route_detail_content_type_mismatch` at the route `detailPageId` path,
with no supplied slug/key/identity in path, reason or message. Independently pin
absent and null `detailPageId`; missing Detail Page target; invalid/missing
Detail Page `contentTypeId` target; and missing/ambiguous route type. Each keeps
only its existing first-match result and never gains the mismatch. Pin that both
matching and mismatching fully resolved rows count the same two route occurrence
edges plus the Detail Page's independent content-type edge; add mismatch+4,097
and 101st-mismatch+edge-overflow cases in the diagnostics file for the frozen
finalizer precedence. Pin exact code-unit order `a-a,a.a,a_a,aa` in dependency
sorting and a synthetic equal-
ordinal identity tie so a retained `localeCompare` cannot pass. Pin exact
base/responsive/nested descriptor substitution, missing-ID/source-drift
rejection, input/plan immutability and zero second walker/build. Except for the
Page suite's explicit immutable-snapshot regression importing the native Page
authority owners named above, this leaf's tests import only TASK-547-01 package
owners and use a local Bun-free harness to prove normalize→graph once at raw
input. They do not import planner, apply, preparer or CLI owners: exact call-count
tests are handed to 02-L01, 02-L02 and 05-L01. A
structurally normalized bad-path ref must fail in that local harness before its
injected lazy-dependency sentinel is acquired.

Core cases pair non-object, wrong-kind and bad-key `detailPageId` values with a
valid unique `type` and expect respectively `expected_package_ref`,
`package_ref_kind_mismatch` and `package_ref_key_invalid`; pair an invalid type
with a valid detail link and expect `content_route_type_invalid`. Each asserts
that single diagnostic, no mismatch, the counterpart edge/descriptor through an
edge-boundary fixture and no lazy acquisition.

Add focused, independently runnable dependency-phase cases without local copies
of chain or combined-graph builders. In
`full-site-package-references-plan.test.ts`, use the shared support builder to
assert that 65 resources joined by 64 dependency edges are accepted, use the
dependency-free source/root as the depth-0 base case and produce the identical
complete ordered plan on deterministic repeat runs; 66 resources joined by 65
dependency edges must reject on every repeat with exactly the static
`dependency_depth_exceeded` singleton. In
`full-site-package-references-core.test.ts`, use the shared combined-graph
builder to assert twice from fresh fixtures that a cycle plus a disjoint 65-edge
branch returns exactly the static `reference_cycle` singleton. A separate
semantic-plus-cycle-and-over-depth fixture must return its complete semantic
result twice and must never surface either cycle or dependency-depth output,
proving that semantic discovery/finalization prevents both later phases. These
focused cases assert whole diagnostics and whole identity order, not only error
codes.

Test ownership is physical and non-overlapping:

- `full-site-package-references-core.test.ts` owns the fixed registry, identity,
  content-route agreement, topological cycle and semantic-before-cycle phase
  cases;
- `full-site-package-references-page.test.ts` owns the four root-authority/
  substitution/handoff cases and both Page-backed recursive discriminator/slot/
  boundary cases;
- `full-site-package-references-diagnostics.test.ts` owns reason/code mapping,
  reference first-match/mixed-category precedence, mismatch/edge-overflow
  precedence, JSON-depth/edge/diagnostic limits and non-disclosure;
- `full-site-package-references-plan.test.ts` owns non-Page occurrence/dependency
  order, exact dependency-depth boundaries/repeats, freeze, generic descriptor
  resolution and drift cases; and
- `fullSitePackageReferenceTestSupport.ts` owns the single reusable
  linear/combined graph builders plus Page/depth builders, while shared
  package/error fixtures stay in L01's
  `fullSitePackageTestSupport.ts`.

Retire `full-site-package-references.test.ts` after moving every case; do not copy
cases/builders. Each four `.test.ts` files must run independently.

## Sub-Tasks

- [x] Implement closed registry/ref path table and DAG planner.
- [x] Add the original `tests/vitest/kits/full-site-package-references.test.ts`.
- [ ] Remove the forbidden `menu.desired.document.items` registry row and
  rebaseline its edge/freeze test; implement recursive Page/Page Template
  base/responsive/native-slot traversal with 4/24 reject boundaries; correct
  discriminator/nullability/ref-key coverage and static redacted diagnostics;
  freeze Page owner imports, JSON-depth counting, global mixed-diagnostic
  precedence/overflow, the exact occurrence-purpose/content-route plan,
  descriptors and substitution helper; enforce the exact 64-edge longest-path
  dependency boundary with semantic → cycle → depth phase precedence; split and
  retire the original reference suite per the ownership above; then run fresh
  gates.

## Testing Requirements

Run independently:

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-references-core.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-references-page.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-references-diagnostics.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-references-plan.test.ts`

Then run:

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-references-core.test.ts tests/vitest/kits/full-site-package-references-page.test.ts tests/vitest/kits/full-site-package-references-diagnostics.test.ts tests/vitest/kits/full-site-package-references-plan.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate`

The last command is the baseline-to-final touched production/test/support
line-count authority and must pass with every human-authored file at or below
1,000 physical lines.

## Documentation Updates Required

Send exact kind/path/order table to TASK-547-06.

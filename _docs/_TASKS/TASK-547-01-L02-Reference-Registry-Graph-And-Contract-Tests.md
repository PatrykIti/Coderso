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
allowlist and stable topological ordering.

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
| `page`, `page_template` | `document.settings.collectionLink.contentTypeId` when `collectionLink` exists | `content_type` | required ref |
| `page`, `page_template` | the same object's `listingQueryId` / `listingTemplateId` | `listing_query` / `listing_template` | nullable ref if the property is present |
| `page`, `page_template` | every recursive block's base/tablet/mobile props `contentTypeId/queryId/templateId`, only for `block.type:"collection"` | content type / listing query / listing template | each nullable ref if present |
| `page`, `page_template` | the same props surfaces' `queryId`, only for `block.type:"filters"` | `listing_query` | nullable ref if present |
| `page`, `page_template` | the same props surfaces' `formId`, only for `block.type:"form"` | `form` | nullable ref if present |
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

For both Page-backed source kinds, recursively visit each
`document.sections[*].blocks[*]` and every child under only that block type's
native allowed `slots.<slotKey>[*]`, bounded by the native tree-depth/child caps.
Traversal is root source order, native capability-registry slot order and child
array order; inspect base props, tablet props, then mobile props at every node.
Import exactly `pageBlockTypes`, `pageBlockCapabilities`, `pageBreakpoints`,
`PAGE_BLOCK_MAX_TREE_DEPTH`, `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT` and the needed
Page types from `core/services/pages/pageDocumentV2.ts`; do not duplicate its
slot-key, block-type, device or limit tables in the package graph. Treat
`pageBlockCapabilities[type].slots` as the persistence slot allowlist and native
slot order. Do not use `getPageBlockActiveSlotKeys`: that editor helper hides
non-destructively preserved `columns` slots above the current `props.count`. Do
not use an authored `document.breakpoints` array as ordering authority; traverse
the exported `pageBreakpoints` order, mapping `desktop` to base `props` and the
remaining entries to `responsive.<breakpoint>.props`.
TASK-547-04's generator still inserts only its five declared direct-root refs;
that narrower producer does not truncate the general package contract.

At module initialization derive one private `PAGE_REFERENCE_AUTHORITY` snapshot
from those imported owners: clone and freeze the block-type tuple, breakpoint
tuple, the outer slots-by-type record and every per-type slot array. Do not copy
literal values into a second table. Every Page discriminator, breakpoint and
slot decision in this module reads only that snapshot, so later mutation of an
imported mutable owner cannot widen, narrow or reorder accepted reference paths.
The fixed `REFERENCE_PATHS` registry remains exported for compatibility but is
recursively runtime-frozen: freeze the outer array, every row and every
`segments` array. Its row type is `Readonly`; neither registry authority exposes
a mutable validation boundary.

The native bounds are reject boundaries, not scan cutoffs:
`PAGE_BLOCK_MAX_TREE_DEPTH = 4` (root block is depth 1) and
`PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`. For both `page` and `page_template`,
depth 4 and 24 children are accepted and completely scanned; a depth-5 child,
any `slots` member on a depth-4 block, a 25th child, an unknown/non-native slot
key, or `slots` on a non-slot-capable block rejects the graph as
`site_package_ref_bad_path`. No branch may be clipped or ignored, even when the
invalid branch contains no reference.

Reference discovery has one authority path per occurrence. Fixed registry rows
and the Page walker register
`JSON.stringify([source.ordinal, exactRelativeSegmentArray])` in
`registeredReferencePaths` before validating a present required/nullable value;
the resource ordinal scopes the authority to exactly one source resource, and
string and numeric segments therefore cannot collide.
The Page slot validator returns either the ordered
`readonly { slotKey: PageBlockSlotKey; children: readonly JsonObject[] }[]` for a
valid node or `null` after emitting its one first-match structural diagnostic.
On `null`, add `{ sourceOrdinal: source.ordinal, path: [...path, "slots"] }` to
`blockedReferencePrefixes` and stop only that structural branch; its
already-emitted rejection prevents clipping from becoming acceptance. On
success, recurse explicitly with
`[...path, "slots", slotKey, childIndex]`.

After registered discovery, one generic ref-like scan walks the complete desired
value of each source resource. It skips an exact `registeredReferencePaths`
member and any `blockedReferencePrefixes` subtree only when that authority has
the same `source.ordinal`; an identical relative path in another resource can
never inherit the skip. Every other ref-like object gets exactly one
`package_ref_path_forbidden`. This prevents a valid nested ref from being
double-classified and prevents a structurally rejected Page branch from
producing duplicate child findings. An unknown/malformed block discriminator
registers no reference path and no blocked prefix: native validation owns the
discriminator, while any ref-like descendant remains forbidden through the
generic scan.

Absent or `null` nullable paths add no edge. Every present non-null allowed value
must be an exact ref of the frozen target kind. A discriminator-mismatched block
is not an allowed path, even if it uses the same property name. All other
ref-shaped objects/paths, including non-native slot keys and `$ref`, are invalid.
Enforce 4,096 edges, dependency/JSON depth 64 and at most 100 diagnostics before
sorting.

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
`content_route_content_type_missing|content_route_content_type_ambiguous`.
For every Page node with `slots`, validate in this first-match order: any `slots`
member at depth 4 → `page_tree_depth_exceeded`; otherwise a non-slot-capable block
→ `page_slots_forbidden`; otherwise the first unknown/non-native slot key →
`page_slot_key_forbidden`; otherwise a 25th child in one native slot →
`page_slot_children_exceeded`; 4,097th edge, dependency depth 65, 101st
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

Freeze the global graph-validation phases as JSON-depth preflight → unique
identity indexing → reference/path/target discovery → discovery finalization
→ cycle detection → dependency-depth validation. Duplicate identities
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

Reason-to-code ownership is closed: duplicate identity →
`site_package_ref_duplicate`; expected/shape/kind/key/path, content-route
container/type, Page-structure and planned-drift reasons →
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
identity. Every lexical sort/tie uses L01's
`compareFullSitePackageText`, imported from
`core/services/kits/fullSitePackage/schema.ts`; `localeCompare`, `Intl` and host-
locale ordering are forbidden. Discovery is package collection/declaration order; registry-row order;
array index order; and, for Page blocks, section/root-block order followed by
depth-first pre-order. At each Page node inspect the discriminator's applicable
properties in `contentTypeId`, `queryId`, `templateId`, `formId` order for base,
tablet and mobile, then recurse through native slot order and child order.
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
  FIXED_REFERENCE_PATH_ROWS.map(freezeReferencePath),
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

type PageReferenceVisitContext = Readonly<{
  source: RegisteredPackageResource;
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

type ValidatedPageSlot = Readonly<{
  slotKey: PageBlockSlotKey;
  children: readonly JsonObject[];
}>;

const validateSlotsFirstMatch = (
  block: JsonObject,
  path: readonly (string | number)[],
  depth: number,
  allowedSlots: readonly PageBlockSlotKey[],
  collector: GraphDiagnostics,
): readonly ValidatedPageSlot[] | null;

const collectPageBlockReferences = (
  block: JsonObject, // PackageRefs exist before native ID substitution.
  path: readonly (string | number)[],
  depth: number, // Root block = 1.
  context: PageReferenceVisitContext,
): void => {
  const type = readDiscriminator(
    block.type,
    PAGE_REFERENCE_AUTHORITY.blockTypes,
    context.collector,
  );
  if (!type) return; // The later generic scan forbids any descendant ref-like value.
  inspectAndRegisterReferenceProps(
    block,
    path,
    type,
    PAGE_REFERENCE_AUTHORITY.breakpoints,
    context,
  );
  const slots = validateSlotsFirstMatch(
    block,
    path,
    depth,
    PAGE_REFERENCE_AUTHORITY.slotsByType[type],
    context.collector,
  );
  if (slots === null) {
    context.blockedReferencePrefixes.push({
      sourceOrdinal: context.source.ordinal,
      path: [...path, "slots"],
    });
    return;
  }
  for (const { slotKey, children } of slots) {
    children.forEach((child, childIndex) =>
      collectPageBlockReferences(
        child,
        [...path, "slots", slotKey, childIndex],
        depth + 1,
        context,
      )
    );
  }
};

const collectRefsAtAllowedPaths = (registry: PackageResourceRegistry) => {
  const diagnostics = new GraphDiagnostics();
  const registeredReferencePaths = new Set<string>();
  const blockedReferencePrefixes: ReferenceAuthorityPath[] = [];
  const { edges, descriptorsByIdentity } = collectFixedAndPageOccurrences({
    registry,
    diagnostics,
    registeredReferencePaths,
    blockedReferencePrefixes,
  });
  scanRefLikeObjectsOnce({
    registry,
    diagnostics,
    registeredReferencePaths,
    blockedReferencePrefixes,
  });
  return { edges, descriptorsByIdentity, diagnostics };
};

export function buildReferencePlan(pkg: FullSitePackageV1) {
  assertReferenceGraphJsonDepth(pkg.resources);
  const registry = indexUniqueKindKeys(pkg.resources); // Bounded duplicate 100/101 finalizer.
  const { edges, descriptorsByIdentity, diagnostics } = collectRefsAtAllowedPaths(registry);
  // collectRefsAtAllowedPaths already ran the generic scan; its 101st add throws first.
  if (edges.length > PACKAGE_LIMITS.referenceEdges) throwReferenceEdgesSingleton();
  diagnostics.throwIfAny();
  return freezePlan(stableTopologicalSort(registry, edges), descriptorsByIdentity);
}

export function resolvePlannedPackageResourceRefs(resource, resolvedIds) {
  return substituteRecordedDescriptors(cloneJson(resource.seed.desired), resource.references, resolvedIds);
}

const pkg = normalizeFullSitePackageForWrite(rawPackage);
buildReferencePlan(pkg);
// Only after both calls succeed may the existing lazy DB loader/import run.
```

Data flow: normalized package → typed depth guard → unique registry →
allowlisted refs → deterministic finalizer → DAG → plan.
Errors distinguish duplicate/missing/ambiguous/cycle/bad-path with only the
static redacted diagnostics above. TASK-547-02 owns post-substitution native
`desired` validation; this leaf certifies only ref placement/resolution/order.

Regression tests: every closed-table row for both Page-backed kinds; absent/null/
non-null behavior at base/tablet/mobile/root/nested-slot surfaces; required
`collectionLink.contentTypeId`; block-discriminator cross-product; deterministic
recursive traversal; and explicit rejection of `menu.desired.document.items`.
For both `page` and `page_template`, pin accepted depth 4/rejected depth 5,
accepted 24/rejected 25 children, an unknown native slot and slots on an atom;
each rejection occurs rather than truncating a reference-bearing final branch.
Pin that a valid nested registered ref yields one edge/descriptor and zero
forbidden diagnostics, while a structurally blocked slot subtree yields exactly
its first-match Page diagnostic and no duplicate descendant ref diagnostic.
Pin exact ref keys/kind/shape; every closed reason code and condition mapping;
the fixed diagnostic-overflow singleton; and sentinel non-disclosure for
duplicate, missing, wrong-kind, malformed-key, forbidden-path, content-route,
depth, edge, cycle, resolved-ID and drift failures. Cross-product precedence
cases pin extra+wrong-kind+bad-key → shape, exact-shape wrong-kind+bad-key → kind,
depth-4 atom with slots and depth-4 layout with an unknown slot → depth, shallower
atom with any slots → atom, and a shallower slot-capable unknown key → slot-key.
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
suppressed.

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
code-unit order `a-a,a.a,a_a,aa` in dependency sorting and a synthetic equal-
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

Test ownership is physical and non-overlapping:

- `full-site-package-references-core.test.ts` owns the fixed registry, identity,
  content-route and topological core cases;
- `full-site-package-references-page.test.ts` owns both Page-backed recursive
  traversal/discriminator/slot/boundary cases;
- `full-site-package-references-diagnostics.test.ts` owns reason/code mapping,
  precedence, depth/edge/diagnostic limits and non-disclosure;
- `full-site-package-references-plan.test.ts` owns occurrence/dependency order,
  freeze, descriptor resolution and drift cases; and
- `fullSitePackageReferenceTestSupport.ts` owns only graph/Page/depth builders,
  while shared package/error fixtures stay in L01's
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
  descriptors and substitution helper; split and retire the original reference
  suite per the ownership above; then run fresh gates.

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

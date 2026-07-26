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
Import the Page domain's exported capability/breakpoint owners; do not duplicate
its slot-key, block-type or device tables in the package graph.
TASK-547-04's generator still inserts only its five declared direct-root refs;
that narrower producer does not truncate the general package contract.

The native bounds are reject boundaries, not scan cutoffs:
`PAGE_BLOCK_MAX_TREE_DEPTH = 4` (root block is depth 1) and
`PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`. For both `page` and `page_template`,
depth 4 and 24 children are accepted and completely scanned; a depth-5 child,
any `slots` member on a depth-4 block, a 25th child, an unknown/non-native slot
key, or `slots` on a non-slot-capable block rejects the graph as
`site_package_ref_bad_path`. No branch may be clipped or ignored, even when the
invalid branch contains no reference.

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
identity. Discovery is package collection/declaration order; registry-row order;
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
export function buildReferencePlan(pkg: FullSitePackageV1) {
  const registry = indexUniqueKindKeys(pkg.resources);
  const { edges, descriptorsByIdentity } = collectRefsAtAllowedPaths(registry);
  return freezePlan(stableTopologicalSort(registry, edges), descriptorsByIdentity);
}

export function resolvePlannedPackageResourceRefs(resource, resolvedIds) {
  return substituteRecordedDescriptors(cloneJson(resource.seed.desired), resource.references, resolvedIds);
}

const pkg = normalizeFullSitePackageForWrite(rawPackage);
buildReferencePlan(pkg);
// Only after both calls succeed may the existing lazy DB loader/import run.
```

Data flow: normalized package → unique registry → allowlisted refs → DAG → plan.
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
Pin exact ref keys/kind/shape; every closed reason code and condition mapping;
the fixed diagnostic-overflow singleton; and sentinel non-disclosure for
duplicate, missing, wrong-kind, malformed-key, forbidden-path, content-route,
depth, edge, cycle, resolved-ID and drift failures. Cross-product precedence
cases pin extra+wrong-kind+bad-key → shape, exact-shape wrong-kind+bad-key → kind,
depth-4 atom with slots and depth-4 layout with an unknown slot → depth, shallower
atom with any slots → atom, and a shallower slot-capable unknown key → slot-key.

Pin occurrence-edge count versus lexicographically deduplicated direct
dependencies; exact stable topological order; exact
`PlannedPackageResource`/`PlannedPackageReference` keys and deep freeze; and
content-route order where `detailPageId` has a descriptor, `type` adds a counted
dependency edge, and `type` remains unchanged after substitution. Pin exact
base/responsive/nested descriptor substitution, missing-ID/source-drift
rejection, input/plan immutability and zero second walker/build. This leaf's tests
import only TASK-547-01 package owners and use a local Bun-free harness to prove
normalize→graph once at raw input. They do not import planner, apply, preparer or
CLI owners: exact call-count tests are handed to 02-L01, 02-L02 and 05-L01. A
structurally normalized bad-path ref must fail in that local harness before its
injected lazy-dependency sentinel is acquired.

## Sub-Tasks

- [x] Implement closed registry/ref path table and DAG planner.
- [x] Add `tests/vitest/kits/full-site-package-references.test.ts`.
- [ ] Correct discriminator/nullability/ref-key coverage and static redacted
  diagnostics; implement and retain frozen substitution provenance/helper and
  run fresh gates.

## Testing Requirements

Targeted Vitest file; core lint/types; touched-file line counts.

## Documentation Updates Required

Send exact kind/path/order table to TASK-547-06.

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

Own `referenceRegistry.ts`, `referenceGraph.ts` and graph tests. Freeze resource
kinds, a discriminator-aware allowlist and stable topological ordering.

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
type; it is never rewritten to an ID.

For both Page-backed source kinds, recursively visit each
`document.sections[*].blocks[*]` and every child under only that block type's
native allowed `slots.<slotKey>[*]`, bounded by the native tree-depth/child caps.
Traversal is root source order, native capability-registry slot order and child
array order; inspect base props, tablet props, then mobile props at every node.
Import the Page domain's exported capability/breakpoint owners; do not duplicate
its slot-key, block-type or device tables in the package graph.
TASK-547-04's generator still inserts only its five declared direct-root refs;
that narrower producer does not truncate the general package contract.

Absent or `null` nullable paths add no edge. Every present non-null allowed value
must be an exact ref of the frozen target kind. A discriminator-mismatched block
is not an allowed path, even if it uses the same property name. All other
ref-shaped objects/paths, including non-native slot keys and `$ref`, are invalid.
Enforce 4,096 edges, dependency/JSON depth 64 and at most 100 diagnostics before
sorting.

Diagnostics expose a sanitized path of at most 240 characters and a static
reason code only. Duplicate/missing/ambiguous/cycle/bad-ref errors must not echo
the supplied key, setting value, arbitrary document data, raw cycle identities
or other payload text.

Every accepted ref produces one frozen `PlannedPackageReference` with a tokenized
`readonly (string | number)[]` source path and target identity. Each frozen
`PlannedPackageResource.references` array preserves discovery order after the
resource order is topologically sorted; its seed/desired is a deep-cloned frozen
snapshot, not a caller-mutable package object. Diagnostic display paths are
derived, sanitized text and never substitution authority.

This leaf also owns `resolvePlannedPackageResourceRefs(resource, resolvedIds)`.
It deep-clones `resource.seed.desired`, visits only the recorded descriptors,
requires the value at each path to remain the exact ref/target captured by the
plan, substitutes the mapped ID and rejects missing IDs or any source drift with
a static `site_package_ref_missing` or `site_package_ref_bad_path` respectively.
It performs no allowlist/ref-like scan, graph build or input/descriptor mutation.
L01 planning placeholders and L02 actual intended IDs use
this one exported resolver; neither consumer duplicates the recursive walker.

This leaf is the mandatory second half of complete package validation. Every
consumer uses the existing exports in the exact order
`normalizeFullSitePackageForWrite(rawPackage)` then `buildReferencePlan(pkg)`;
both calls finish before the consumer acquires a lazy DB-backed dependency. Do
not introduce a wrapper helper or alternate validation path.

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

Regression tests: every row of the closed table for both Page-backed source
kinds; absent/null/non-null behavior at base/tablet/mobile/root/nested-slot
surfaces; required `collectionLink.contentTypeId`; block discriminator
cross-product and deterministic recursive slot traversal;
explicit rejection of `menu.desired.document.items`; exact ref
keys/target kind/no-extra-key; deterministic order, cycles,
dangling/ambiguous refs and exact edge/depth/diagnostic limits. Reject refs at
arbitrary Page text/data paths and pin that diagnostics are static, bounded and
contain no hostile key/value sentinel. Pin frozen descriptor shape/order, exact
base/responsive/nested substitution, missing-ID/source-drift rejection, input/
plan immutability and a resolver spy proving zero second walker/build. Add a
full-consumer regression proving a
structurally normalized bad-path reference fails here before the lazy DB
dependency is acquired.

## Sub-Tasks

- [x] Implement closed registry/ref path table and DAG planner.
- [x] Add `tests/vitest/kits/full-site-package-references.test.ts`.
- [ ] Correct discriminator/nullability/ref-key coverage and static redacted
  diagnostics; retain frozen substitution provenance/helper and run fresh gates.

## Testing Requirements

Targeted Vitest file; core lint/types; touched-file line counts.

## Documentation Updates Required

Send exact kind/path/order table to TASK-547-06.

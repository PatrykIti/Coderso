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
kinds, allowlisted ref paths and stable topological ordering.

Freeze `PackageRef` exactly as `{ ref: PackageResourceKind; key: string }` and
the only accepted reference paths:

- entry/listing-query/detail → content type;
- detail → listing query;
- Page collection/filter/form bindings → content type/query/template/form;
- menu item → Page;
- homepage/menu/footer settings → Page/Menu/Page Template;
- content route → content-type slug and Detail Page ID.

All other ref-shaped objects and paths are invalid. The content-route type stays
a literal, cross-checked slug; only its Detail Page reference resolves to a DB
ID. Enforce 4,096 edges, depth 64 and at most 100 diagnostics before sorting.

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
  const edges = collectRefsAtAllowedPaths(registry);
  return stableTopologicalSort(registry, edges);
}

const pkg = normalizeFullSitePackageForWrite(rawPackage);
buildReferencePlan(pkg);
// Only after both calls succeed may the existing lazy DB loader/import run.
```

Data flow: normalized package → unique registry → allowlisted refs → DAG → plan.
Errors distinguish duplicate/missing/ambiguous/cycle/bad-path. Native strict
`desired` validators run after reference substitution and before the ledger or
any domain write.

Regression tests: every row of the closed path table, deterministic order,
cycles, dangling/ambiguous refs, exact edge/depth/diagnostic limits, and refs
rejected at arbitrary Page text/data paths or any other ref-like object. Add a
full-consumer regression proving a structurally normalized bad-path reference
fails here before the lazy DB dependency is acquired.

## Sub-Tasks

- [x] Implement closed registry/ref path table and DAG planner.
- [x] Add `tests/vitest/kits/full-site-package-references.test.ts`.

## Testing Requirements

Targeted Vitest file; core lint/types; touched-file line counts.

## Documentation Updates Required

Send exact kind/path/order table to TASK-547-06.

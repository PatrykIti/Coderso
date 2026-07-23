# TASK-547-01-L02: Reference Registry, Graph and Contract Tests
# FileName: TASK-547-01-L02-Reference-Registry-Graph-And-Contract-Tests.md

**Parent Subtask:** TASK-547-01
**Priority:** Critical
**Category:** Solution Kits / Reference Graph
**Estimated Effort:** Medium
**Dependencies:** TASK-547-01-L01
**Status:** ⏳ To Do

## Overview

Own `referenceRegistry.ts`, `referenceGraph.ts` and graph tests. Freeze resource
kinds, allowlisted ref paths and stable topological ordering.

## Security Contract

Pure Bun-free code; no endpoint. Never recursively substitute arbitrary objects
or strings. Bound edges/depth/diagnostics before sorting.

## Implementation Pseudocode

```ts
export function buildReferencePlan(pkg: FullSitePackageV1) {
  const registry = indexUniqueKindKeys(pkg.resources);
  const edges = collectRefsAtAllowedPaths(pkg.resources, REFERENCE_PATHS);
  assertResolved(edges, registry);
  return stableTopologicalSort(assertAcyclic(edges));
}
```

Data flow: normalized package → unique registry → allowlisted refs → DAG → plan.
Errors distinguish duplicate/missing/ambiguous/cycle/bad-path.

Regression tests: every resource-kind edge, deterministic order, cycles,
dangling/ambiguous refs, refs rejected at arbitrary Page text/data paths.

## Sub-Tasks

- [ ] Implement closed registry/ref path table and DAG planner.
- [ ] Add `tests/vitest/kits/full-site-package-references.test.ts`.

## Testing Requirements

Targeted Vitest file; core lint/types; touched-file line counts.

## Documentation Updates Required

Send exact kind/path/order table to TASK-547-06.

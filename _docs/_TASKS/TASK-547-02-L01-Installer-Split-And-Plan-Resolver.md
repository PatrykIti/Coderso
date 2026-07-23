# TASK-547-02-L01: Installer Split and Plan Resolver
# FileName: TASK-547-02-L01-Installer-Split-And-Plan-Resolver.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Solution Kits / Installer Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-547-01
**Status:** ⏳ To Do

## Overview

Split the 2,700+ line installer into cohesive bounded modules while preserving
current exports, then add full-site existing-resource resolution and deterministic
create/update/noop/conflict planning. Own installer facade/planner extraction only.

**Exact ownership:** this leaf alone edits legacy
`solutionKitsInstallService.ts` and `kitInstaller.ts`, creates
`fullSiteInstallPlanner.ts`, and moves the shared kind union to
`fullSiteInstallTypes.ts` with compatibility re-exports. L02 must not edit these
files. Cohesive L01-only extractions are
`legacyInstallPlanning.ts`, `legacyInstallResourceHandlers.ts`,
`legacyInstallRunPersistence.ts`, `legacyInstallRollback.ts` and a
`solutionKitsInstallService.ts` compatibility facade that must finish below 1,000
lines while preserving public exports.

## Security Contract

Service only; no route. Planner consumes only normalized packages, reports safe
IDs/keys, rejects unmanaged collisions before writes and never logs payload data.

## Implementation Pseudocode

```ts
export async function planFullSiteInstall(pkg, deps) {
  const ordered = buildReferencePlan(pkg);
  const existing = await resolveManagedIdentity(pkg.key, ordered, deps);
  return ordered.map((r) => planOne(r, existing, { unmanaged: "conflict" }));
}
```

Data flow: canonical DAG → managed markers/current snapshots → stable operations.
Errors: `site_package_conflict|not_found|invalid`; zero writes during planning
except separately requested dry-run ledger evidence.

Regression tests in `tests/vitest/kits/full-site-install-planner.test.ts`: legacy
kit facade parity, stable plan, unmanaged conflict, current managed equality=noop.

## Sub-Tasks

- [ ] Extract the exact bounded legacy modules and compatibility facade above.
- [ ] Add planner and pure/DB resolver tests.

## Testing Requirements

`tests/unit/kits/installService.test.ts` legacy parity plus the named planner
suite; core lint/types; `wc -l` on every extracted/facade production/test file.

## Documentation Updates Required

Send installer module/order notes to TASK-547-06.

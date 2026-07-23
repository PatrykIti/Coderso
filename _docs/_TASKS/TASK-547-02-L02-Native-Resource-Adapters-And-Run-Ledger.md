# TASK-547-02-L02: Native Resource Adapters and Run Ledger
# FileName: TASK-547-02-L02-Native-Resource-Adapters-And-Run-Ledger.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Solution Kits / Native Resources
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-02-L01
**Status:** ⏳ To Do

## Overview

Add cohesive adapters for Page Templates, entries, listing templates/queries,
detail pages, form actions and allowlisted settings. Extend install item kinds,
snapshots and audit summaries without using the frozen widget-template phase.

**Exact ownership:** only new
`core/services/kits/fullSiteInstall/{adapters,ledger,execute}.ts` modules and
`tests/unit/kits/fullSiteResourceAdapters.test.ts`. Consume L01 types/facade;
do not edit legacy installer, planner, or L03 rollback files.

## Security Contract

Service only. Resolve typed refs immediately before each native strict normalizer.
Settings allowlist excludes secret/auth/provider namespaces. Audit contains safe
resource keys/IDs/operations only.

## Implementation Pseudocode

```ts
for (const operation of plan.operations) {
  const resolved = resolveOperationRefs(operation, installedRegistry);
  const native = normalizeWithOwningDomain(resolved);
  const result = await adapters[operation.kind].apply(native, tx);
  await ledger.record(snapshotSafeResult(result));
  installedRegistry.set(operation.identity, result.id);
}
```

Data flow: plan → ref substitution → native normalize → adapter write → snapshot →
registry/cache/audit. Known native errors retain codes; unexpected errors redact.

Regression tests: each resource create/update/noop; form fields/actions nested;
Page/footer/menu/query/detail refs persist as IDs; settings land last.

## Sub-Tasks

- [ ] Implement an exhaustive
  `satisfies Record<FullSiteInstallResourceKind, ResourceAdapter>` map without
  editing L01's union/types file; add compile/runtime kind-coverage tests.
- [ ] Add safe snapshots/equality/run items/cache effects.
- [ ] Add targeted adapter DB tests.

## Testing Requirements

DB env + targeted kit/content/forms/pages/listings tests; strict security scan;
core lint/types; line counts.

## Documentation Updates Required

Send resource lifecycle/snapshot notes to TASK-547-06.

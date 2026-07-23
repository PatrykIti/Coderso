# TASK-547-02-L03: Failure Atomicity, Rollback and Security Tests
# FileName: TASK-547-02-L03-Failure-Atomicity-Rollback-And-Security-Tests.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Reliability / Security Testing
**Estimated Effort:** Large
**Dependencies:** TASK-547-02-L02
**Status:** ⏳ To Do

## Overview

Complete reverse rollback, failure compensation and DB-backed lifecycle/security
coverage. Own rollback modules and `tests/unit/kits/fullSiteInstallService.test.ts`.

**Exact ownership:** `core/services/kits/fullSiteInstall/rollback.ts`,
`compensation.ts`, and the named DB test only.

## Security Contract

Service only. Actor required for apply/dry-run/rollback. Never delete reused or
unmanaged rows. Dry-run may persist safe ledger evidence but writes zero domain
resources/settings.

## Implementation Pseudocode

```ts
export async function rollbackFullSiteInstall(runId, actorId) {
  const source = await requireApplyRun(runId);
  for (const item of reverse(source.items)) {
    await adapters[item.kind].rollback(item, { deleteCreatedOnly: true });
  }
}
```

Data flow: source run → reverse items → restore updates/delete created → settings
adapter restores each prior setting snapshot exactly once in the normal item order
and performs one intended batch cache invalidation → audit. There is no separate
`priorSettings` restore path. On apply failure, compensate completed items or roll back the
enclosing transaction before returning the redacted error.

Regression tests: first apply, second noop, managed update, injected failure,
explicit rollback, prior shell restoration, malicious settings, dangling refs,
each prior setting restored exactly once, one intended settings cache invalidation,
and owned fixture cleanup.

## Sub-Tasks

- [ ] Implement reverse rollback and compensation.
- [ ] Add complete DB lifecycle/security matrix.

## Testing Requirements

DB env; named Bun test rerun on failure; core lint/types; gates/security; line counts.

## Documentation Updates Required

Send rollback/dry-run evidence semantics to TASK-547-06.

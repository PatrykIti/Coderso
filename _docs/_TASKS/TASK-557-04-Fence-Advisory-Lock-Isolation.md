# TASK-557-04: Fence Advisory-Lock Isolation for Parallel Workers
# FileName: TASK-557-04-Fence-Advisory-Lock-Isolation.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Database / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-557-02 (worker env carries the offset)
**Status:** ⏳ To Do
---
## Overview
The CMS writer fence uses `pg_try_advisory_xact_lock_shared(548, 0)` on every
content/menu/settings mutation (nativeCmsWriterFence.ts:77). PostgreSQL
advisory locks are **per-database, not per-schema**: two workers on different
schemas still contend on the same (548, 0) key, and the exclusive holder
`legacyInstallRunPersistence.holder()` (legacyInstallRunPersistence.ts:808)
blocks every worker in the database while held. In-lane fence uses are
shared+shared compatible, but `tests/unit/kits/*` exercise installer/kit paths
that can take the exclusive lock, so parallelism on one database needs a
per-worker namespace.

Solution (fail-closed, additive, no behavior change when unset): introduce
`resolveFenceNamespace(env)` in `core/db/nativeCmsWriterFence.ts` that returns
`NATIVE_CMS_WRITER_FENCE_NAMESPACE` (548) by default and `548 + offset` ONLY
when `BUN_TEST_FENCE_NAMESPACE_OFFSET` is set AND `NODE_ENV === "test"`.
All fence users (nativeCmsWriterFence.ts plus `legacyInstallRunPersistence.ts`
holder/createLegacyInstallLedger) route their advisory-lock namespace through
the same resolver so shared and exclusive users of the same worker share the
worker's namespace and cannot leak across workers. Because touching
`legacyInstallRunPersistence.ts` (1,075 lines > 1,000) requires a cohesive
split, TASK-557-04-L01 also extracts the lock holder into
`core/services/kits/legacyInstallRunLocks.ts` with a backward-compatible
re-export.

## Sub-Tasks
- TASK-557-04-L01: resolveFenceNamespace seam + call-site migration
- TASK-557-04-L02: Fence isolation tests

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Existing fence tests must stay green with NO env set (byte-identical
  behavior). New tests prove: offset only honored in `NODE_ENV=test`;
  production default stays 548; two namespaces do not contend (advisory
  lock held in namespace 549 while 548 is acquirable).
- Full kits lane (`tests/unit/kits/*`, `tests/integration/kits/*` when DB is
  available) must remain green — the exclusive path now uses the worker
  namespace.

## Documentation Updates Required
- `_docs/SECURITY_SPEC.md` — document the test-only namespace offset (fail-closed).
- `_docs/TESTING_STRATEGY.md` — fence isolation model.

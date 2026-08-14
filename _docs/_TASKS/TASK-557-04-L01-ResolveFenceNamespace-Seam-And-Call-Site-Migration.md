# TASK-557-04-L01: resolveFenceNamespace Seam and Call-Site Migration
# FileName: TASK-557-04-L01-ResolveFenceNamespace-Seam-And-Call-Site-Migration.md
**Parent Subtask:** TASK-557-04
**Priority:** High
**Category:** Testing / Database / Reliability
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-14
---
## Overview
Add `resolveFenceNamespace(env?)` to `core/db/nativeCmsWriterFence.ts` and
route every advisory-lock key derivation through it. The function is a pure,
exported, dependency-free helper so it can be unit-tested without DB. It must
be fail-closed: the offset is honored only when BOTH `BUN_TEST_FENCE_NAMESPACE_OFFSET`
is a valid positive integer AND `NODE_ENV === "test"`. Any other combination
returns the production constant `548`. The runner sets the offset per worker
(TASK-557-02-L01 `resolveWorkerEnv`), so worker i uses namespace
`548 + i + 1` (i.e. `BUN_TEST_FENCE_NAMESPACE_OFFSET = i + 1`).

Call-site migration:
- `nativeCmsWriterFence.ts:77` — replace the hardcoded `548` in
  `pg_try_advisory_xact_lock_shared(NATIVE_CMS_WRITER_FENCE_NAMESPACE, ...)`
  with `resolveFenceNamespace()`.
- `core/services/kits/legacyInstallRunPersistence.ts:808` and `:969` — the
  exclusive `pg_advisory_xact_lock(548, 0)` (holder) and
  `pg_advisory_xact_lock(hashtext(sourceRunId))` must use
  `resolveFenceNamespace()` for the 548 key. The `hashtext(sourceRunId)` key is
  already per-run and needs no namespace change.
- Keep `NATIVE_CMS_WRITER_FENCE_NAMESPACE` exported as the production constant;
  add `resolveFenceNamespace` and keep both doc-commented.

Mandatory file split (line-limit gate): `legacyInstallRunPersistence.ts` is
currently 1,075 physical lines (> 1,000). Touching it here REQUIRES splitting
it by cohesive responsibility as part of this same substantive change. Extract
the full-site-install lock holder (the `withFullSiteInstallLocks` closure plus
its helpers `readLockReservation`, `mintReservationAuthority`,
`reserveOrTakeOverActualOwner`, and the `FULL_SITE_PACKAGE_LOCK_NAMESPACE`
constant, roughly lines 780-845 today) into
`core/services/kits/legacyInstallRunLocks.ts`, and re-export
`withFullSiteInstallLocks` from `legacyInstallRunPersistence.ts` for backward
compatibility (existing importers stay stable). The remaining persistence
module must end below 1,000 lines; the new locks module must stay below 1,000
lines. Do not move unrelated helpers (run creation, rollback resolution,
ledger creation stay in place); split by cohesive responsibility only.

## Implementation Pseudocode
```ts
// core/db/nativeCmsWriterFence.ts (additive)
export const NATIVE_CMS_WRITER_FENCE_NAMESPACE = 548 as const;
export const FENCE_NAMESPACE_OFFSET_ENV = "BUN_TEST_FENCE_NAMESPACE_OFFSET";

/**
 * Resolve the advisory-lock namespace for the CURRENT process.
 *
 * Production and ordinary tests: 548 (unchanged, byte-identical behavior).
 * Parallel Bun-lane workers: 548 + offset, ONLY when the offset env is set AND
 * NODE_ENV === "test". Any other combination fails closed to 548 so no
 * production or non-lane path can ever observe a different namespace.
 */
export function resolveFenceNamespace(
  env: Record<string, string | undefined> = process.env
): number {
  if (env.NODE_ENV !== "test") return NATIVE_CMS_WRITER_FENCE_NAMESPACE;
  const raw = env[FENCE_NAMESPACE_OFFSET_ENV];
  if (raw === undefined) return NATIVE_CMS_WRITER_FENCE_NAMESPACE;
  const offset = Number(raw);
  if (!Number.isInteger(offset) || offset < 1 || offset > 1000) {
    throw new Error(`fence_namespace_offset_invalid:${raw}`);
  }
  return NATIVE_CMS_WRITER_FENCE_NAMESPACE + offset;
}
```

In `nativeCmsWriterFence.ts:74-92` `acquireOrdinaryFence`, change only the
first argument:
```ts
const namespace = resolveFenceNamespace();
sql`select pg_try_advisory_xact_lock_shared(${namespace}, ${NATIVE_CMS_WRITER_FENCE_KEY}) as acquired`
```

In `legacyInstallRunLocks.ts` (new file, extracted holder):
```ts
// core/services/kits/legacyInstallRunLocks.ts
import postgres from "postgres";
import { resolveFenceNamespace, type NativeCmsWriterOwnerLease } from "../../db/nativeCmsWriterFence";
import type { FullSiteInstallLockContext, FullSiteInstallLockReservation } from "./fullSiteInstallTypes";

export const FULL_SITE_PACKAGE_LOCK_NAMESPACE = 547 as const;

export const withFullSiteInstallLocks = async <T>(
  reservation: FullSiteInstallLockReservation,
  execute: (context: FullSiteInstallLockContext) => Promise<T>
): Promise<T> => {
  assertNativeCmsWriterOwnerContextAbsent();
  const input = readLockReservation(reservation);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  let lease: NativeCmsWriterOwnerLease | null = null;
  let callbackPromise: Promise<T> | null = null;
  let signalClosed: (() => void) | null = null;
  const closed = new Promise<never>((_resolve, reject) => {
    signalClosed = () => reject(new Error("native_cms_writer_fence_lost"));
  });
  const lockClient = postgres(databaseUrl, { max: 1, prepare: false, onclose: () => { if (lease) markNativeCmsWriterOwnerLost(lease); signalClosed?.(); } });
  let primary: Error | null = null;
  let result: Readonly<{ value: T }> | null = null;
  try {
    const holder = lockClient.begin(async (lockTransaction) => {
      const namespace = resolveFenceNamespace();
      await lockTransaction`select pg_advisory_xact_lock(${namespace}, ${NATIVE_CMS_WRITER_FENCE_KEY})`;
      await lockTransaction`select pg_advisory_xact_lock(${FULL_SITE_PACKAGE_LOCK_NAMESPACE}, hashtext(${input.packageKey}))`;
      const authority = mintReservationAuthority();
      const reserved = await reserveOrTakeOverActualOwner(input, authority);
      lease = reserved.lease;
      callbackPromise = runWithNativeCmsWriterOwnerContext(lease, () => execute(reserved.context));
      const value = await callbackPromise;
      revokeNativeCmsWriterOwnerLease(lease);
      return { value };
    });
    result = await Promise.race([holder, closed]);
  } catch (error) { /* unchanged handling */ }
  /* unchanged teardown */
};
```

In `legacyInstallRunPersistence.ts`, replace the local definition with:
```ts
import { withFullSiteInstallLocks } from "./legacyInstallRunLocks";
export { withFullSiteInstallLocks } from "./legacyInstallRunLocks"; // backward-compatible re-export
```
The `:969` call site in `claimRollbackRun` keeps `pg_advisory_xact_lock(hashtext(...))`
(one-arg form, already per-run, no namespace) — no change needed there beyond
what already exists.

Error handling: invalid offset values throw `fence_namespace_offset_invalid`
(fail loud, never silently fall back — a mistyped env must not make workers
collide with production). Empty string or whitespace is treated as unset
(normalize with `.trim()`).

Regression-test shape (pure, `tests/unit/db/fenceNamespace.test.ts`):
- No env / NODE_ENV !== test / unset offset -> 548.
- NODE_ENV=test + offset "3" -> 551; offset "0"/"-1"/"1001"/"abc" throws;
  whitespace-only offset "   " -> 548 (trim before parse).
- Production fence suite (`tests/unit/kits/nativeCmsWriterFenceInventory.test.ts`
  and any DB-backed fence test) stays green with no env.
- Kits exclusive path with offset set uses the offset namespace (DB-backed
  assertion: acquiring the exclusive lock in namespace `548+offset` while
  namespace `548` is free succeeds).
- File-split gate: both `legacyInstallRunPersistence.ts` and
  `legacyInstallRunLocks.ts` are <= 1,000 physical lines each, and every
  exported symbol that `legacyInstallRunPersistence.ts` exported before the
  split is still importable from it (import-compat test).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/db/fenceNamespace.test.ts` green.
- Kits lane green (both unit and DB-backed when DB available).
- Record a proof that two worker namespaces do not contend (advisory lock
  acquired in namespace 549 while 548 held) in the handoff.

## Documentation Updates Required
- `_docs/SECURITY_SPEC.md` — test-only namespace offset, fail-closed contract.

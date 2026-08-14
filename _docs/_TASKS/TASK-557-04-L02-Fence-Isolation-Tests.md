# TASK-557-04-L02: Fence Isolation Tests
# FileName: TASK-557-04-L02-Fence-Isolation-Tests.md
**Parent Subtask:** TASK-557-04
**Priority:** Medium
**Category:** Testing / Database / Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-557-04-L01 (seam exists)
**Status:** ✅ Done
**Completed:** 2026-08-14
---
## Overview
Prove that the per-worker fence namespace actually isolates advisory locks
across workers on the same database and that production behavior is
byte-identical without the offset env. This is the concurrency proof that
makes the parallel runner safe; it must run against the real database
(`DATABASE_DIRECT_URL`) in a throwaway schema and clean up after itself.

## Implementation Pseudocode
```ts
// tests/integration/toolchain/fenceIsolation.test.ts (new)
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";
import { resolveFenceNamespace, NATIVE_CMS_WRITER_FENCE_NAMESPACE } from "../../../core/db/nativeCmsWriterFence";

const hasDb = Boolean(process.env.DATABASE_DIRECT_URL);
const testIfDb = hasDb ? test : test.skip;
let sql: postgres.Sql;

beforeAll(async () => { if (hasDb) sql = postgres(process.env.DATABASE_DIRECT_URL!, { max: 4 }); });
afterAll(async () => { if (hasDb) await sql.end(); });

test("resolveFenceNamespace is fail-closed without env", () => {
  expect(resolveFenceNamespace({ NODE_ENV: "production" })).toBe(548);
  expect(resolveFenceNamespace({ NODE_ENV: "test" })).toBe(548);
  expect(resolveFenceNamespace({ NODE_ENV: "test", BUN_TEST_FENCE_NAMESPACE_OFFSET: "   " })).toBe(548);
  expect(() => resolveFenceNamespace({ NODE_ENV: "test", BUN_TEST_FENCE_NAMESPACE_OFFSET: "0" })).toThrow();
  expect(resolveFenceNamespace({ NODE_ENV: "test", BUN_TEST_FENCE_NAMESPACE_OFFSET: "3" })).toBe(551);
});

testIfDb("two worker namespaces do not contend on one database", async () => {
  const a = resolveFenceNamespace({ NODE_ENV: "test", BUN_TEST_FENCE_NAMESPACE_OFFSET: "1" }); // 549
  const b = resolveFenceNamespace({ NODE_ENV: "test", BUN_TEST_FENCE_NAMESPACE_OFFSET: "2" }); // 550
  // IMPORTANT: every `sql.unsafe()` is its OWN implicit transaction, so a
  // xact advisory lock taken in one statement is released before the next
  // statement runs — that would prove nothing. Wrap the lock hold + assertion
  // in ONE explicit transaction per namespace so the xact lock stays held.
  const first = await sql.begin(async (tx) => {
    const row = await tx.unsafe(`select pg_try_advisory_xact_lock_shared(${a}, 0) as ok`);
    expect(row[0].ok).toBe(true);
    // Different namespace: shared lock in b must succeed while a is held.
    const other = await tx.unsafe(`select pg_try_advisory_xact_lock_shared(${b}, 0) as ok`);
    expect(other[0].ok).toBe(true);
    // Same namespace: shared+shared is compatible.
    const same = await tx.unsafe(`select pg_try_advisory_xact_lock_shared(${a}, 0) as ok`);
    expect(same[0].ok).toBe(true);
  });
  // Locks released when the transaction commits.
  expect(first).toBeUndefined();
});

testIfDb("exclusive lock in worker namespace does not block another worker namespace", async () => {
  const a = 549, b = 550;
  // Deterministic routing: take the session-level exclusive lock on a DEDICATED
  // single-connection client, so the probe connection can never be the same
  // session (a pooled `sql` call could route to the lock holder's connection
  // and re-acquire the same-session lock, making the assertion flaky).
  const lockClient = postgres(process.env.DATABASE_DIRECT_URL!, { max: 1 });
  const exclusive = await lockClient.unsafe(`select pg_try_advisory_lock(${a}, 0) as ok`);
  expect(exclusive[0].ok).toBe(true);
  try {
    await sql.begin(async (tx) => {
      const otherShared = await tx.unsafe(`select pg_try_advisory_xact_lock_shared(${b}, 0) as ok`);
      expect(otherShared[0].ok).toBe(true); // different namespace -> no contention
      const sameShared = await tx.unsafe(`select pg_try_advisory_xact_lock_shared(${a}, 0) as ok`);
      expect(sameShared[0].ok).toBe(false); // exclusive held in same namespace -> busy
    });
  } finally {
    await lockClient.unsafe(`select pg_advisory_unlock(${a}, 0)`);
    await lockClient.end();
  }
});
```

Note: the session-level `pg_try_advisory_lock` / `pg_advisory_unlock` pair is
used only in the exclusive test on a dedicated single-connection client
(released in `finally`, then the client is closed). The xact-lock probes live
inside `sql.begin()` transactions because a bare `sql.unsafe()` autocommits
and would release the lock before the assertion runs — a test that proves
nothing. The fence itself uses xact locks; this test proves the namespace
math. Never run this file against `public` concurrently with another lane;
it holds session locks only for the duration of the test and releases them.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/integration/toolchain/fenceIsolation.test.ts` green with DB;
  clean skip otherwise. All locks released in `finally`/`afterAll`.
- Existing kits + fence inventory suites green with no env (byte-identical).
- Record the two-namespace non-contention proof in the handoff.

## Documentation Updates Required
- `_docs/TESTING_STRATEGY.md` — fence namespace isolation proof is part of the
  parallel-lane gate.

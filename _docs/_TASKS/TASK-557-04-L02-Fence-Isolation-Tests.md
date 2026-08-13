# TASK-557-04-L02: Fence Isolation Tests
# FileName: TASK-557-04-L02-Fence-Isolation-Tests.md
**Parent Subtask:** TASK-557-04
**Priority:** Medium
**Category:** Testing / Database / Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-557-04-L01 (seam exists)
**Status:** ⏳ To Do
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
  // Hold shared lock in namespace a, then shared lock in b must still succeed.
  const first = await sql.unsafe(`select pg_try_advisory_xact_lock_shared(${a}, 0) as ok`);
  expect(first[0].ok).toBe(true);
  try {
    const second = await sql.unsafe(`select pg_try_advisory_xact_lock_shared(${b}, 0) as ok`);
    expect(second[0].ok).toBe(true);
    const same = await sql.unsafe(`select pg_try_advisory_xact_lock_shared(${a}, 0) as ok`);
    expect(same[0].ok).toBe(true); // shared+shared compatible within a namespace
  } finally {
    // xact locks release at commit/rollback automatically; force release to be safe.
    await sql.unsafe(`select pg_advisory_unlock_all()`);
  }
});

testIfDb("exclusive lock in worker namespace does not block another worker namespace", async () => {
  const a = 549, b = 550;
  const exclusive = await sql.unsafe(`select pg_try_advisory_lock(${a}, 0) as ok`);
  expect(exclusive[0].ok).toBe(true);
  try {
    const otherShared = await sql.unsafe(`select pg_try_advisory_xact_lock_shared(${b}, 0) as ok`);
    expect(otherShared[0].ok).toBe(true); // different namespace -> no contention
    const sameShared = await sql.unsafe(`select pg_try_advisory_xact_lock_shared(${a}, 0) as ok`);
    expect(sameShared[0].ok).toBe(false); // exclusive held in same namespace -> busy
  } finally {
    await sql.unsafe(`select pg_advisory_unlock(${a}, 0)`);
  }
});
```

Note: session-level `pg_try_advisory_lock` / `pg_advisory_unlock` are used only
inside this test (session-scoped, released in `finally`). The fence itself
uses xact locks; this test proves the namespace math. Never run this file
against `public` concurrently with another lane; it holds session locks only
for the duration of the test and releases them.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/integration/toolchain/fenceIsolation.test.ts` green with DB;
  clean skip otherwise. All locks released in `finally`/`afterAll`.
- Existing kits + fence inventory suites green with no env (byte-identical).
- Record the two-namespace non-contention proof in the handoff.

## Documentation Updates Required
- `_docs/TESTING_STRATEGY.md` — fence namespace isolation proof is part of the
  parallel-lane gate.

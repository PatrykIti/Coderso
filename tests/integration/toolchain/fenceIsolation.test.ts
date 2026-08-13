/**
 * Fence advisory-lock namespace isolation proof (TASK-557-04-L02).
 *
 * PostgreSQL advisory locks are per-database, not per-schema, so parallel Bun
 * lane workers on one database must shift the CMS writer fence namespace per
 * worker. This suite proves the resolver's fail-closed math and, against a
 * real database, that two worker namespaces never contend.
 *
 * Pure (DB-free) coverage:
 *
 * - `resolveFenceNamespace` is fail-closed without the offset env: production
 *   and test default to 548, whitespace-only offsets are treated as unset,
 *   and an invalid offset throws. The valid `3` offset lands on 551.
 *
 * DB-backed coverage (runs only when DATABASE_DIRECT_URL is set; the test
 * runner loads `.env`, this file only reads `process.env` and never sources it
 * itself, same gating pattern as the sibling suites in this directory):
 *
 * - Two worker namespaces do not contend: while a shared xact lock is held in
 *   worker namespace 549, a shared xact lock in the production namespace 548
 *   still succeeds (different namespaces are independent) and a second shared
 *   lock in 549 also succeeds (shared+shared is compatible). Both probes run
 *   inside ONE explicit `sql.begin` transaction per namespace because a bare
 *   `sql.unsafe()` autocommits and would release the xact lock before the
 *   next statement runs, proving nothing.
 * - A session-level exclusive lock on namespace 549, taken on a DEDICATED
 *   max:1 client (so the probe can never route to the lock holder's session),
 *   does not block a shared xact lock in worker namespace 550 but does make a
 *   shared xact lock in 549 fail. The session lock is released and the
 *   dedicated client closed in `finally`.
 *
 * The suite never truncates domain tables and never touches `public` or any
 * other schema; xact locks release at transaction commit and the session lock
 * is explicitly unlocked, so no locks outlive the suite.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";

import {
  FENCE_NAMESPACE_OFFSET_ENV,
  NATIVE_CMS_WRITER_FENCE_NAMESPACE,
  resolveFenceNamespace,
} from "../../../core/db/nativeCmsWriterFence";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
const FENCE_KEY = 0 as const;

let sql: postgres.Sql | undefined;

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  sql = postgres(DATABASE_DIRECT_URL, { max: 4 });
});

afterAll(async () => {
  if (!sql) return;
  await sql.end();
});

test("resolveFenceNamespace is fail-closed without env", () => {
  expect(resolveFenceNamespace({ NODE_ENV: "production" })).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(resolveFenceNamespace({ NODE_ENV: "test" })).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(
    resolveFenceNamespace({ NODE_ENV: "test", [FENCE_NAMESPACE_OFFSET_ENV]: "   " })
  ).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(() =>
    resolveFenceNamespace({ NODE_ENV: "test", [FENCE_NAMESPACE_OFFSET_ENV]: "0" })
  ).toThrow();
  expect(
    resolveFenceNamespace({ NODE_ENV: "test", [FENCE_NAMESPACE_OFFSET_ENV]: "3" })
  ).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE + 3);
});

test.skipIf(!DATABASE_DIRECT_URL)(
  "two worker namespaces do not contend on one database",
  async () => {
    const a = resolveFenceNamespace({
      NODE_ENV: "test",
      [FENCE_NAMESPACE_OFFSET_ENV]: "1",
    }); // 549
    const b = resolveFenceNamespace({ NODE_ENV: "test" }); // 548, production default
    // Every `sql.unsafe()` is its OWN implicit transaction, so a xact advisory
    // lock taken in one statement would be released before the next runs. Keep
    // the lock held and probe inside ONE explicit transaction so the xact lock
    // persists until commit.
    const first = await sql!.begin(async (tx) => {
      const held = await tx.unsafe(
        `select pg_try_advisory_xact_lock_shared(${a}, ${FENCE_KEY}) as ok`
      );
      expect(held[0].ok).toBe(true);
      // Different namespace: shared lock in the production namespace must
      // succeed while worker namespace 549 is held.
      const other = await tx.unsafe(
        `select pg_try_advisory_xact_lock_shared(${b}, ${FENCE_KEY}) as ok`
      );
      expect(other[0].ok).toBe(true);
      // Same namespace: shared+shared is compatible.
      const same = await tx.unsafe(
        `select pg_try_advisory_xact_lock_shared(${a}, ${FENCE_KEY}) as ok`
      );
      expect(same[0].ok).toBe(true);
    });
    // Locks released when the transaction commits.
    expect(first).toBeUndefined();
  }
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "exclusive lock in worker namespace does not block another worker namespace",
  async () => {
    const a = resolveFenceNamespace({
      NODE_ENV: "test",
      [FENCE_NAMESPACE_OFFSET_ENV]: "1",
    }); // 549, exclusive holder
    const b = resolveFenceNamespace({
      NODE_ENV: "test",
      [FENCE_NAMESPACE_OFFSET_ENV]: "2",
    }); // 550, probe
    // Deterministic routing: take the session-level exclusive lock on a
    // DEDICATED single-connection client, so the pooled `sql` probe can never
    // be the same session (a pooled call could route to the lock holder's
    // connection and re-acquire the same-session lock, making the assertion
    // flaky).
    const lockClient = postgres(DATABASE_DIRECT_URL!, { max: 1 });
    let acquired = false;
    try {
      const exclusive = await lockClient.unsafe(
        `select pg_try_advisory_lock(${a}, ${FENCE_KEY}) as ok`
      );
      expect(exclusive[0].ok).toBe(true);
      acquired = true;
      await sql!.begin(async (tx) => {
        const otherShared = await tx.unsafe(
          `select pg_try_advisory_xact_lock_shared(${b}, ${FENCE_KEY}) as ok`
        );
        expect(otherShared[0].ok).toBe(true); // different namespace -> no contention
        const sameShared = await tx.unsafe(
          `select pg_try_advisory_xact_lock_shared(${a}, ${FENCE_KEY}) as ok`
        );
        expect(sameShared[0].ok).toBe(false); // exclusive held in same namespace -> busy
      });
    } finally {
      // Release the session lock and close the dedicated client so no lock
      // outlives this test.
      if (acquired) {
        const released = await lockClient.unsafe(
          `select pg_advisory_unlock(${a}, ${FENCE_KEY}) as ok`
        );
        expect(released[0].ok).toBe(true);
      }
      await lockClient.end();
    }
  }
);

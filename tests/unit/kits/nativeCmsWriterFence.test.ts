import { expect, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

import {
  acquireNativeCmsWriterFence,
  assertNativeCmsWriterOwnerContextAbsent,
  beginNativeCmsWriterOwnerClosing,
  createNativeCmsWriterOwnerLease,
  lockNativeCmsWriterOwnerForUpdate,
  markNativeCmsWriterOwnerLost,
  NATIVE_CMS_WRITER_FENCE_KEY,
  NATIVE_CMS_WRITER_FENCE_NAMESPACE,
  NATIVE_CMS_WRITER_FENCE_OPTION_KEY,
  revokeNativeCmsWriterOwnerLease,
  runWithNativeCmsWriterOwnerContext,
  type NativeCmsWriterFenceExecutor,
} from "../../../core/db/nativeCmsWriterFence";

const normalizeSql = (query: unknown): string =>
  new PgDialect()
    .sqlToQuery(query as SQL)
    .sql.toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();

const createExecutor = (responses: readonly unknown[]) => {
  const queries: string[] = [];
  let responseIndex = 0;
  const executor: NativeCmsWriterFenceExecutor = {
    execute: async (query) => {
      queries.push(normalizeSql(query));
      const response = responses[responseIndex];
      responseIndex += 1;
      return response;
    },
  };
  return { executor, queries };
};

test("ordinary writer takes exact try-shared fence then bounded active-marker census", async () => {
  const { executor, queries } = createExecutor([[{ acquired: true }], []]);

  await acquireNativeCmsWriterFence(executor);

  expect(NATIVE_CMS_WRITER_FENCE_NAMESPACE).toBe(548);
  expect(NATIVE_CMS_WRITER_FENCE_KEY).toBe(0);
  expect(NATIVE_CMS_WRITER_FENCE_OPTION_KEY).toBe("nativeCmsWriterFenceV1");
  expect(queries).toHaveLength(2);
  expect(queries[0]).toBe("select pg_try_advisory_xact_lock_shared($1, $2) as acquired");
  expect(queries[1]).toContain("from solution_kit_install_runs");
  expect(queries[1]).toContain("order by created_at asc, id asc");
  expect(queries[1]).toContain("limit 2");
});

test("busy ordinary writer performs no census and preserves the exact safe code", async () => {
  const { executor, queries } = createExecutor([[{ acquired: false }]]);

  await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
    "native_cms_writer_fence_busy"
  );
  expect(queries).toHaveLength(1);
});

test("an active marker blocks ordinary writers after the successful shared lock", async () => {
  const { executor, queries } = createExecutor([
    [{ acquired: true }],
    [{ id: randomUUID(), status: "running", marker: { schemaVersion: 1 } }],
  ]);

  await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
    "native_cms_writer_recovery_required"
  );
  expect(queries).toHaveLength(2);
});

test("active owner context validates its exact generation with FOR SHARE", async () => {
  const ownerRunId = randomUUID();
  const generation = randomUUID();
  const lease = createNativeCmsWriterOwnerLease(ownerRunId, generation);
  const { executor, queries } = createExecutor([
    [
      {
        id: ownerRunId,
        status: "running",
        marker: { schemaVersion: 1, generation },
      },
    ],
  ]);

  await runWithNativeCmsWriterOwnerContext(lease, async () => {
    expect(() => assertNativeCmsWriterOwnerContextAbsent()).toThrow("site_package_lock_reentrant");
    await acquireNativeCmsWriterFence(executor);
  });

  expect(queries).toHaveLength(1);
  expect(queries[0]).toMatch(/where id = \$\d+ for share/u);
  expect(queries[0]).not.toContain("pg_try_advisory_xact_lock_shared");
});

test("owner mismatch becomes monotonically lost and inherited retries perform zero I/O", async () => {
  const ownerRunId = randomUUID();
  const generation = randomUUID();
  const lease = createNativeCmsWriterOwnerLease(ownerRunId, generation);
  const { executor, queries } = createExecutor([[]]);

  await runWithNativeCmsWriterOwnerContext(lease, async () => {
    await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
      "native_cms_writer_fence_lost"
    );
    await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
      "native_cms_writer_fence_lost"
    );
  });

  expect(queries).toHaveLength(1);
});

test("closing owner drains prior shares with exact owner FOR UPDATE and blocks later work", async () => {
  const ownerRunId = randomUUID();
  const generation = randomUUID();
  const lease = createNativeCmsWriterOwnerLease(ownerRunId, generation);
  const { executor, queries } = createExecutor([
    [
      {
        id: ownerRunId,
        status: "running",
        marker: { schemaVersion: 1, generation },
      },
    ],
  ]);

  await runWithNativeCmsWriterOwnerContext(lease, async () => {
    const captured = beginNativeCmsWriterOwnerClosing();
    expect(captured).toBe(lease);
    await expect(lockNativeCmsWriterOwnerForUpdate(executor, captured)).resolves.toEqual({
      ownerRunId,
    });
    await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
      "native_cms_writer_fence_lost"
    );
  });

  expect(queries).toHaveLength(1);
  expect(queries[0]).toMatch(/where id = \$\d+ for update/u);
});

test("revoked and lost inherited contexts never fall back to the ordinary fence", async () => {
  for (const terminalize of [revokeNativeCmsWriterOwnerLease, markNativeCmsWriterOwnerLost]) {
    const lease = createNativeCmsWriterOwnerLease(randomUUID(), randomUUID());
    const { executor, queries } = createExecutor([]);
    await runWithNativeCmsWriterOwnerContext(lease, async () => {
      terminalize(lease);
      await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
        "native_cms_writer_fence_lost"
      );
    });
    expect(queries).toEqual([]);
  }
});

test("malformed executor results and driver errors expose only the fence failure code", async () => {
  const sentinel = "postgres://secret@host/database";
  for (const response of [null, {}, [{ acquired: "true" }]]) {
    const { executor } = createExecutor([response]);
    await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
      "native_cms_writer_fence_failed"
    );
  }
  const executor: NativeCmsWriterFenceExecutor = {
    execute: async () => {
      throw new Error(sentinel);
    },
  };
  await expect(acquireNativeCmsWriterFence(executor)).rejects.toThrow(
    "native_cms_writer_fence_failed"
  );
});

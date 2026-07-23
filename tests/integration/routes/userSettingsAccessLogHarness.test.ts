import { expect, test } from "bun:test";

import {
  type AccessLogCandidate,
  type AccessLogScope,
  type ExpectedAccessLog,
  type PollDeps,
  accessLogSignature,
  drainExactAccessLogs,
  observeStableAccessLogInventory,
  trackedFetch,
  validateAndCleanupAccessLogs,
} from "./support/userSettingsAccessLogHarness";

type FakePollInspection = {
  deleted: string[][];
  elapsed: () => number;
  queryCount: () => number;
  remaining: () => readonly AccessLogCandidate[];
};

const makeCandidate = (
  id: string,
  overrides: Partial<AccessLogCandidate> = {}
): AccessLogCandidate => ({
  id,
  userAgent: "marker",
  method: "GET",
  path: "/admin/api/user-settings/key",
  status: 200,
  userId: "user-a",
  sessionId: "session-a",
  ...overrides,
});

const createFakePollDeps = (
  snapshots: readonly (readonly AccessLogCandidate[])[],
  latency: Readonly<{ queryMs?: number; deleteMs?: number }> = {}
): PollDeps & FakePollInspection => {
  let now = 0;
  let index = 0;
  let queries = 0;
  let current = [...(snapshots[0] ?? [])];
  const deleted: string[][] = [];
  return {
    deleted,
    elapsed: () => now,
    queryCount: () => queries,
    remaining: () => current,
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
    query: async () => {
      now += latency.queryMs ?? 0;
      queries += 1;
      const snapshot = snapshots[Math.min(index, snapshots.length - 1)];
      index += 1;
      if (snapshot) {
        const deletedIds = new Set(deleted.flat());
        current = snapshot.filter(({ id }) => !deletedIds.has(id));
      }
      return current;
    },
    deleteExactIds: async (ids) => {
      now += latency.deleteMs ?? 0;
      deleted.push([...ids]);
      const removed = new Set(ids);
      current = current.filter(({ id }) => !removed.has(id));
    },
  };
};

const fakeScope: AccessLogScope = {
  marker: "marker",
  userIds: new Set(["user-a"]),
  sessionIds: new Set(["session-a"]),
};

test("access-log inventory allows convergence before exact stable equality", async () => {
  const row = makeCandidate("row-1");
  const deps = createFakePollDeps([[], [row], [row], [row], [row], [row], [row]]);
  const inventory = await observeStableAccessLogInventory(deps, fakeScope, [
    accessLogSignature(row),
  ]);
  expect(inventory).toEqual({
    ids: ["row-1"],
    behaviorError: null,
    scopeInvalid: false,
  });
});

test("access-log inventory distinguishes missing, extra, late, and out-of-scope rows", async () => {
  const row = makeCandidate("row-1");
  const expected = [accessLogSignature(row)];
  const missing = await observeStableAccessLogInventory(
    createFakePollDeps([[], [], [], [], [], [], []]),
    fakeScope,
    expected
  );
  expect(missing.behaviorError).toBe("access_log_missing");

  const extraRow = makeCandidate("row-2", { status: 409 });
  const extra = await observeStableAccessLogInventory(
    createFakePollDeps([[row, extraRow]]),
    fakeScope,
    expected
  );
  expect(extra.behaviorError).toBe("access_log_extra");

  const late = await observeStableAccessLogInventory(
    createFakePollDeps([[row], [row], [row, extraRow]]),
    fakeScope,
    expected
  );
  expect(late.behaviorError).toBe("access_log_late");

  const outsider = makeCandidate("outside", {
    userAgent: "other",
    userId: "other",
    sessionId: "other",
  });
  const mixed = await observeStableAccessLogInventory(
    createFakePollDeps([[row, outsider]]),
    fakeScope,
    expected
  );
  expect(mixed.scopeInvalid).toBe(true);
  expect(mixed.ids).toEqual(["row-1"]);

  const duplicateExtraInventory = await observeStableAccessLogInventory(
    createFakePollDeps([[row, makeCandidate("row-duplicate")]]),
    fakeScope,
    expected
  );
  expect(duplicateExtraInventory.behaviorError).toBe("access_log_extra");
  const wrongPathInventory = await observeStableAccessLogInventory(
    createFakePollDeps([[makeCandidate("row-wrong-path", { path: "/wrong" })]]),
    fakeScope,
    expected
  );
  expect(wrongPathInventory.behaviorError).toBe("access_log_extra");
  const wrongIdentityInventory = await observeStableAccessLogInventory(
    createFakePollDeps([
      [makeCandidate("row-wrong-identity", { userId: "user-b", sessionId: "session-b" })],
    ]),
    fakeScope,
    expected
  );
  expect(wrongIdentityInventory.behaviorError).toBe("access_log_extra");
  const signatureChangedInventory = await observeStableAccessLogInventory(
    createFakePollDeps([[row], [row], [makeCandidate(row.id, { status: 201 })]]),
    fakeScope,
    expected
  );
  expect(signatureChangedInventory.behaviorError).toBe("access_log_late");
});

test("exact access-log cleanup drains late owned UUIDs without deleting outsiders", async () => {
  const row = makeCandidate("row-1");
  const late = makeCandidate("row-2");
  const outsider = makeCandidate("outside", {
    userAgent: "other",
    userId: "other",
    sessionId: "other",
  });
  const deps = createFakePollDeps([[late, outsider], [outsider]]);
  const drained = await drainExactAccessLogs(deps, fakeScope, [row.id]);
  expect(drained.lateAfterDelete).toBe(true);
  expect(drained.scopeInvalid).toBe(true);
  expect(deps.deleted).toEqual([["row-1"], ["row-2"]]);
  expect(deps.remaining()).toEqual([outsider]);

  const reappearing = makeCandidate("row-after-empty");
  const postEmptyReappearanceDeps = createFakePollDeps([[], [], [reappearing], []]);
  const postEmptyReappearanceDrain = await drainExactAccessLogs(
    postEmptyReappearanceDeps,
    fakeScope,
    []
  );
  expect(postEmptyReappearanceDrain.lateAfterDelete).toBe(true);
  expect(postEmptyReappearanceDrain.cleanupError).toBe(null);
  expect(postEmptyReappearanceDeps.deleted).toEqual([[reappearing.id]]);
  expect(postEmptyReappearanceDeps.remaining()).toEqual([]);
  expect(postEmptyReappearanceDeps.queryCount()).toBeGreaterThanOrEqual(9);
});

test("validateAndCleanupAccessLogs proves both quiet windows before fixture cleanup", async () => {
  const row = makeCandidate("row-quiet");
  const deps = createFakePollDeps([[row]]);
  let fixtureCleanupCalls = 0;
  await validateAndCleanupAccessLogs(deps, fakeScope, [accessLogSignature(row)], async () => {
    fixtureCleanupCalls += 1;
  });
  expect(fixtureCleanupCalls).toBe(1);
  expect(deps.deleted).toEqual([[row.id]]);
  expect(deps.remaining()).toEqual([]);
  expect(deps.elapsed()).toBeGreaterThanOrEqual(500);
  expect(deps.queryCount()).toBeGreaterThanOrEqual(12);

  const queryLatencyDeps = createFakePollDeps([[row]], { queryMs: 400 });
  const queryLatencyInventory = await observeStableAccessLogInventory(queryLatencyDeps, fakeScope, [
    accessLogSignature(row),
  ]);
  expect(queryLatencyInventory.behaviorError).toBe(null);
  expect(queryLatencyDeps.queryCount()).toBeGreaterThanOrEqual(6);
  const deleteLatencyDeps = createFakePollDeps([[]], { deleteMs: 400 });
  const deleteLatencyDrain = await drainExactAccessLogs(deleteLatencyDeps, fakeScope, [row.id]);
  expect(deleteLatencyDrain.cleanupError).toBe(null);
  expect(deleteLatencyDeps.elapsed()).toBeGreaterThanOrEqual(650);
});

test("validateAndCleanupAccessLogs preserves deterministic error ordering while draining exact IDs", async () => {
  const row = makeCandidate("row-owned");
  const late = makeCandidate("row-late", { status: 409 });
  const outsider = makeCandidate("row-outside", {
    userAgent: "other",
    userId: "other",
    sessionId: "other",
  });
  const inventorySnapshots = Array.from({ length: 6 }, () => [row, outsider]);
  const drainSnapshots = Array.from({ length: 7 }, () => [late, outsider]);
  const deps = createFakePollDeps([...inventorySnapshots, ...drainSnapshots]);
  const wrongExpected = accessLogSignature({
    ...row,
    status: 201,
  });
  let thrown: Error | null = null;
  try {
    await validateAndCleanupAccessLogs(deps, fakeScope, [wrongExpected], async () => {
      throw new Error("fixture_cleanup_failed");
    });
  } catch (error) {
    thrown = error instanceof Error ? error : new Error("unknown_error");
  }

  expect(thrown).toBeInstanceOf(AggregateError);
  expect((thrown as AggregateError).errors.map((error) => (error as Error).message)).toEqual([
    "access_log_extra",
    "access_log_scope_invalid",
    "access_log_late_after_delete",
    "fixture_cleanup_failed",
  ]);
  expect(deps.deleted).toEqual([[row.id], [late.id]]);
  expect(deps.remaining()).toEqual([outsider]);

  const compoundDeps = createFakePollDeps(
    [
      ...Array.from({ length: 6 }, () => [row, outsider]),
      ...Array.from({ length: 10 }, (_, index) => [
        makeCandidate(`compound-late-${index}`, { status: 409 }),
        outsider,
      ]),
    ],
    { queryMs: 500 }
  );
  const compoundValidationPromise = validateAndCleanupAccessLogs(
    compoundDeps,
    fakeScope,
    [wrongExpected],
    async () => undefined
  );
  await expect(compoundValidationPromise).rejects.toMatchObject({
    errors: [
      { message: "access_log_extra" },
      { message: "access_log_scope_invalid" },
      { message: "access_log_late_after_delete" },
      { message: "access_log_absence_unstable" },
    ],
  });
});

test("a post-dispatch fetch rejection remains an extra owned log and is still drained", async () => {
  const ledger: ExpectedAccessLog[] = [];
  let transportHits = 0;
  const expected: ExpectedAccessLog = {
    method: "GET",
    path: "/admin/api/user-settings/key",
    status: 200,
    identity: { userId: "user-a", sessionId: "session-a" },
  };
  await expect(
    trackedFetch(
      "http://example.test/admin/api/user-settings/key",
      { method: "GET", headers: { "User-Agent": "marker" } },
      expected,
      "marker",
      ledger,
      async () => {
        transportHits += 1;
        throw new Error("transport_rejected_after_dispatch");
      }
    )
  ).rejects.toThrow("transport_rejected_after_dispatch");
  expect(transportHits).toBe(1);
  expect(ledger).toEqual([]);

  const row = makeCandidate("post-dispatch-row");
  const deps = createFakePollDeps([[row]]);
  let fixtureCleanupCalls = 0;
  await expect(
    validateAndCleanupAccessLogs(deps, fakeScope, [], async () => {
      fixtureCleanupCalls += 1;
    })
  ).rejects.toThrow("access_log_extra");
  expect(fixtureCleanupCalls).toBe(1);
  expect(deps.deleted).toEqual([[row.id]]);
  expect(deps.remaining()).toEqual([]);
});

test("deadline-crossing cleanup makes one final exact delete and retains absence failure", async () => {
  let now = 0;
  let sequence = 0;
  const deleted: string[][] = [];
  const deps: PollDeps = {
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
    query: async () => {
      now += 51;
      sequence += 1;
      return [makeCandidate(`deadline-${sequence}`)];
    },
    deleteExactIds: async (ids) => {
      deleted.push([...ids]);
    },
  };

  const drained = await drainExactAccessLogs(deps, fakeScope, []);
  expect(drained.lateAfterDelete).toBe(true);
  expect(drained.scopeInvalid).toBe(false);
  expect(drained.cleanupError?.message).toBe("access_log_absence_unstable");
  expect(deleted.at(-1)).toEqual([`deadline-${sequence}`]);
  expect(deleted.flat()).toContain(`deadline-${sequence}`);

  const qualifyingQueryStarts = [4_500, 4_550, 4_600, 4_650, 4_700, 4_750];
  const deadlineRow = makeCandidate("deadline-crossing");
  let inventoryNow = 0;
  let inventoryQueryCount = 0;
  const inventoryQueryStarts: number[] = [];
  const inventoryObservedIds: string[] = [];
  const inventoryObservedStatuses: number[] = [];
  const inventoryDeadlineDeps: PollDeps = {
    now: () => inventoryNow,
    wait: async (ms) => {
      inventoryNow += ms;
    },
    query: async () => {
      inventoryQueryCount += 1;
      inventoryQueryStarts.push(inventoryNow);
      if (inventoryQueryCount <= 3) inventoryNow += 1_100;
      if (inventoryQueryCount === 4) inventoryNow += 1_000;
      if (inventoryQueryCount === 10) inventoryNow += 251;
      const candidate =
        inventoryQueryCount < 5
          ? makeCandidate(deadlineRow.id, { status: 400 + inventoryQueryCount })
          : deadlineRow;
      inventoryObservedIds.push(candidate.id);
      inventoryObservedStatuses.push(candidate.status);
      return [candidate];
    },
    deleteExactIds: async () => undefined,
  };
  const deadlineCrossingInventory = await observeStableAccessLogInventory(
    inventoryDeadlineDeps,
    fakeScope,
    [accessLogSignature(deadlineRow)]
  );
  expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
  expect(inventoryQueryCount).toBe(10);
  expect(inventoryQueryStarts.slice(-6)).toEqual(qualifyingQueryStarts);
  expect(inventoryObservedIds).toEqual(Array.from({ length: 10 }, () => deadlineRow.id));
  expect(inventoryObservedStatuses).toEqual([401, 402, 403, 404, 200, 200, 200, 200, 200, 200]);
  expect(inventoryNow).toBe(5_001);

  let drainNow = 0;
  let drainQueryCount = 0;
  const drainQueryStarts: number[] = [];
  const additiveDeleted: string[][] = [];
  const drainDeadlineDeps: PollDeps = {
    now: () => drainNow,
    wait: async (ms) => {
      drainNow += ms;
    },
    query: async () => {
      drainQueryCount += 1;
      drainQueryStarts.push(drainNow);
      if (drainQueryCount <= 4) drainNow += 1_100;
      if (drainQueryCount === 5) drainNow += 100;
      if (drainQueryCount === 10) drainNow += 251;
      return drainQueryCount <= 4 ? [makeCandidate(`drain-reset-${drainQueryCount}`)] : [];
    },
    deleteExactIds: async (ids) => {
      additiveDeleted.push([...ids]);
    },
  };
  const deadlineCrossingDrain = await drainExactAccessLogs(drainDeadlineDeps, fakeScope, []);
  expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
  expect(drainQueryCount).toBe(10);
  expect(drainQueryStarts.slice(-6)).toEqual([4_400, 4_550, 4_600, 4_650, 4_700, 4_750]);
  expect(drainNow).toBe(5_001);
  expect(additiveDeleted).toEqual([
    ["drain-reset-1"],
    ["drain-reset-2"],
    ["drain-reset-3"],
    ["drain-reset-4"],
  ]);
});

test("trackedFetch rejects declaration drift before transport and records wrong status", async () => {
  const ledger: ExpectedAccessLog[] = [];
  let transportHits = 0;
  const expected: ExpectedAccessLog = {
    method: "GET",
    path: "/admin/api/user-settings/key",
    status: 200,
    identity: { userId: null, sessionId: null },
  };
  const transport: typeof fetch = async () => {
    transportHits += 1;
    return new Response("", { status: 409 });
  };
  await expect(
    trackedFetch(
      "http://example.test/wrong",
      { headers: { "User-Agent": "marker" } },
      expected,
      "marker",
      ledger,
      transport
    )
  ).rejects.toThrow("access_log_request_ledger_invalid");
  expect(transportHits).toBe(0);

  await expect(
    trackedFetch(
      "http://example.test/admin/api/user-settings/key",
      { headers: { "User-Agent": "marker" } },
      expected,
      "marker",
      ledger,
      transport
    )
  ).rejects.toThrow();
  expect(ledger).toEqual([expected]);
});

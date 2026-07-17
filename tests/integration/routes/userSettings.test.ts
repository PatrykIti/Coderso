import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, sessions, userSettings, users } from "../../../core/db/schema";
import { resolveRateLimitBucket, startHttpServer } from "../../../core/server/httpServer";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { registerUserSettingsRoutes } from "../../../core/server/routes/userSettingsRoutes";
import { resolveAdminPath } from "../../../core/server/utils/adminPath";
import {
  createCsrfToken,
  createSession,
  SESSION_COOKIE_NAME,
  setCsrfToken,
} from "../../../core/services/auth/sessionService";
import { getSetting } from "../../../core/services/settings/settingsService";
import { canConnect } from "../../utils/db";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
    },
  };
};

test("registerUserSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerUserSettingsRoutes(
    router as unknown as Parameters<typeof registerUserSettingsRoutes>[0],
    {
      requireAuth: () => undefined,
      validate: () => undefined,
    } as unknown as Parameters<typeof registerUserSettingsRoutes>[1]
  );

  expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual(
    expect.arrayContaining([
      "GET /user-settings",
      "GET /user-settings/:key",
      "PATCH /user-settings/:key",
    ])
  );
});

type AccessLogIdentity = Readonly<{
  userId: string | null;
  sessionId: string | null;
}>;

type ExpectedAccessLog = Readonly<{
  method: string;
  path: string;
  status: number;
  identity: AccessLogIdentity;
}>;

type AccessLogCandidate = Readonly<{
  id: string;
  userAgent: string | null;
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}>;

type PollDeps = Readonly<{
  query: () => Promise<readonly AccessLogCandidate[]>;
  deleteExactIds: (ids: readonly string[]) => Promise<void>;
  now: () => number;
  wait: (ms: number) => Promise<void>;
}>;

type AccessLogScope = Readonly<{
  marker: string;
  userIds: ReadonlySet<string>;
  sessionIds: ReadonlySet<string>;
}>;

type StableAccessLogInventory = Readonly<{
  ids: readonly string[];
  behaviorError:
    | "access_log_missing"
    | "access_log_extra"
    | "access_log_late"
    | "access_log_unstable"
    | null;
  scopeInvalid: boolean;
}>;

const ACCESS_LOG_POLL_CADENCE_MS = 50;
const ACCESS_LOG_MIN_QUIET_MS = 250;
const ACCESS_LOG_POLL_TIMEOUT_MS = 5_000;
const ACCESS_LOG_REQUIRED_STABLE_POLLS = 3;

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isSubmultiset(actual: readonly string[], expected: readonly string[]): boolean {
  const remaining = new Map<string, number>();
  for (const value of expected) {
    remaining.set(value, (remaining.get(value) ?? 0) + 1);
  }
  for (const value of actual) {
    const count = remaining.get(value) ?? 0;
    if (count === 0) return false;
    remaining.set(value, count - 1);
  }
  return true;
}

function accessLogSignature(value: {
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}): string {
  return JSON.stringify([value.method, value.path, value.status, value.userId, value.sessionId]);
}

function expectedAccessLogSignature(value: ExpectedAccessLog): string {
  return accessLogSignature({
    method: value.method,
    path: value.path,
    status: value.status,
    userId: value.identity.userId,
    sessionId: value.identity.sessionId,
  });
}

function isOwnedAccessLogCandidate(row: AccessLogCandidate, scope: AccessLogScope): boolean {
  return (
    row.userAgent === scope.marker ||
    (row.userId !== null && scope.userIds.has(row.userId)) ||
    (row.sessionId !== null && scope.sessionIds.has(row.sessionId))
  );
}

async function observeStableAccessLogInventory(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[]
): Promise<StableAccessLogInventory> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  const expected = [...expectedSignatures].sort();
  let stableIds: readonly string[] | null = null;
  let stableSince = 0;
  let stablePolls = 0;
  let everExact = false;
  let changedAfterExact = false;
  let scopeInvalid = false;

  while (deps.now() <= deadline) {
    const rows = await deps.query();
    const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
    scopeInvalid ||= ownedRows.length !== rows.length;
    const rawIds = ownedRows.map((row) => row.id);
    scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
    const ids = [...new Set(rawIds)].sort();
    const actual = ownedRows.map(accessLogSignature).sort();
    const exact = ownedRows.length === expected.length && sameArray(actual, expected);

    if (!stableIds) {
      stableIds = ids;
      stableSince = deps.now();
      stablePolls = 1;
    } else if (!sameArray(ids, stableIds)) {
      if (everExact) changedAfterExact = true;
      stableIds = ids;
      stableSince = deps.now();
      stablePolls = 1;
    } else {
      stablePolls += 1;
    }
    if (exact) everExact = true;
    if (
      stablePolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
      deps.now() - stableSince >= ACCESS_LOG_MIN_QUIET_MS
    ) {
      return {
        ids: stableIds,
        behaviorError: changedAfterExact
          ? "access_log_late"
          : exact
            ? null
            : isSubmultiset(actual, expected)
              ? "access_log_missing"
              : "access_log_extra",
        scopeInvalid,
      };
    }
    if (deps.now() >= deadline) {
      return {
        ids: stableIds ?? [],
        behaviorError: "access_log_unstable",
        scopeInvalid,
      };
    }
    await deps.wait(Math.max(0, Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())));
  }
  return {
    ids: stableIds ?? [],
    behaviorError: "access_log_unstable",
    scopeInvalid,
  };
}

async function drainExactAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  initialIds: readonly string[]
): Promise<{
  lateAfterDelete: boolean;
  scopeInvalid: boolean;
  cleanupError: Error | null;
}> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  let pendingIds = [...initialIds];
  let quietSince = deps.now();
  let emptyPolls = 0;
  let lateAfterDelete = false;
  let scopeInvalid = false;
  const cleanupErrors: Error[] = [];
  try {
    while (deps.now() <= deadline) {
      if (pendingIds.length > 0) {
        await deps.deleteExactIds(pendingIds);
        pendingIds = [];
      }
      const rows = await deps.query();
      const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
      scopeInvalid ||= ownedRows.length !== rows.length;
      const rawIds = ownedRows.map((row) => row.id);
      scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
      const ids = [...new Set(rawIds)].sort();
      if (ids.length > 0) {
        lateAfterDelete = true;
        pendingIds = ids;
        quietSince = deps.now();
        emptyPolls = 0;
        continue;
      }
      emptyPolls += 1;
      if (
        emptyPolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
        deps.now() - quietSince >= ACCESS_LOG_MIN_QUIET_MS
      ) {
        return { lateAfterDelete, scopeInvalid, cleanupError: null };
      }
      if (deps.now() >= deadline) break;
      await deps.wait(Math.max(0, Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())));
    }
  } catch (error) {
    cleanupErrors.push(error instanceof Error ? error : new Error("access_log_drain_failed"));
  }
  if (pendingIds.length > 0) {
    try {
      await deps.deleteExactIds(pendingIds);
    } catch (error) {
      cleanupErrors.push(
        error instanceof Error ? error : new Error("access_log_exact_delete_failed")
      );
    }
  }
  cleanupErrors.push(new Error("access_log_absence_unstable"));
  return {
    lateAfterDelete,
    scopeInvalid,
    cleanupError:
      cleanupErrors.length === 1
        ? cleanupErrors[0]
        : new AggregateError(cleanupErrors, "access_log_drain_failed"),
  };
}

async function validateAndCleanupAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[],
  cleanupExactSettingsSessionsAndUsers: () => Promise<void>
): Promise<void> {
  const deferredErrors: Error[] = [];
  let initialIds: readonly string[] = [];
  try {
    const inventory = await observeStableAccessLogInventory(deps, scope, expectedSignatures);
    initialIds = inventory.ids;
    if (inventory.behaviorError) {
      deferredErrors.push(new Error(inventory.behaviorError));
    }
    if (inventory.scopeInvalid) {
      deferredErrors.push(new Error("access_log_scope_invalid"));
    }
  } catch (error) {
    deferredErrors.push(error instanceof Error ? error : new Error("access_log_inventory_failed"));
  }

  const drained = await drainExactAccessLogs(deps, scope, initialIds);
  if (
    drained.scopeInvalid &&
    !deferredErrors.some(({ message }) => message === "access_log_scope_invalid")
  ) {
    deferredErrors.push(new Error("access_log_scope_invalid"));
  }
  if (drained.lateAfterDelete) {
    deferredErrors.push(new Error("access_log_late_after_delete"));
  }
  if (drained.cleanupError) {
    deferredErrors.push(drained.cleanupError);
  } else {
    try {
      await cleanupExactSettingsSessionsAndUsers();
    } catch (error) {
      deferredErrors.push(error instanceof Error ? error : new Error("access_log_cleanup_failed"));
    }
  }

  if (deferredErrors.length === 1) throw deferredErrors[0];
  if (deferredErrors.length > 1) {
    throw new AggregateError(deferredErrors, "access_log_validation_failed");
  }
}

async function trackedFetch(
  input: string | URL,
  init: RequestInit,
  expected: ExpectedAccessLog,
  marker: string,
  ledger: ExpectedAccessLog[],
  transport: typeof fetch = fetch
): Promise<Response> {
  const request = new Request(input, init);
  if (
    request.method.toUpperCase() !== expected.method ||
    new URL(request.url).pathname !== expected.path ||
    request.headers.get("user-agent") !== marker
  ) {
    throw new Error("access_log_request_ledger_invalid");
  }
  const response = await transport(request);
  ledger.push(expected);
  expect(response.status).toBe(expected.status);
  return response;
}

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
  snapshots: readonly (readonly AccessLogCandidate[])[]
): PollDeps & {
  deleted: string[][];
  elapsed: () => number;
  queryCount: () => number;
  remaining: () => readonly AccessLogCandidate[];
} => {
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

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const configuredHost = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  try {
    return new URL(value).host;
  } catch {
    return fallback;
  }
};

const responseErrorCode = async (response: Response): Promise<string | null> => {
  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
};

testIfDb(
  "real HTTP user-settings routes preserve self-scope, CSRF, buckets, errors, and exact log ownership",
  async () => {
    resetRateLimitBuckets();
    const marker = `wf540-user-settings-${randomUUID()}`;
    const userA = randomUUID();
    const userB = randomUUID();
    const userIds = [userA, userB] as const;
    const ledger: ExpectedAccessLog[] = [];
    let server: ReturnType<typeof startHttpServer> | null = null;
    let sessionIds: readonly string[] = [];
    let behaviorError: Error | null = null;
    let validationError: Error | null = null;
    let fixturesCleaned = false;
    const fallbackCleanupErrors: Error[] = [];

    const currentScope = (): AccessLogScope => ({
      marker,
      userIds: new Set(userIds),
      sessionIds: new Set(sessionIds),
    });
    const queryCandidates = async (): Promise<readonly AccessLogCandidate[]> =>
      db
        .select({
          id: accessLogs.id,
          userAgent: accessLogs.userAgent,
          method: accessLogs.method,
          path: accessLogs.path,
          status: accessLogs.status,
          userId: accessLogs.userId,
          sessionId: accessLogs.sessionId,
        })
        .from(accessLogs)
        .where(
          or(
            eq(accessLogs.userAgent, marker),
            inArray(accessLogs.userId, [...userIds]),
            ...(sessionIds.length > 0 ? [inArray(accessLogs.sessionId, [...sessionIds])] : [])
          )
        );
    const pollDeps: PollDeps = {
      query: queryCandidates,
      deleteExactIds: async (ids) => {
        if (ids.length === 0) return;
        await db.delete(accessLogs).where(inArray(accessLogs.id, [...ids]));
      },
      now: () => Date.now(),
      wait: (ms) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        }),
    };
    const cleanupExactFixtures = async (): Promise<void> => {
      await db.delete(userSettings).where(inArray(userSettings.userId, [...userIds]));
      if (sessionIds.length > 0) {
        await db.delete(sessions).where(inArray(sessions.id, [...sessionIds]));
      }
      await db.delete(users).where(inArray(users.id, [...userIds]));
      fixturesCleaned = true;
    };

    await db.insert(users).values([
      {
        id: userA,
        email: `wf540-${userA}@example.test`,
        passwordHash: "hash",
      },
      {
        id: userB,
        email: `wf540-${userB}@example.test`,
        passwordHash: "hash",
      },
    ]);

    try {
      const [createdA, createdB] = await Promise.all([
        createSession({ userId: userA, userAgent: marker }),
        createSession({ userId: userB, userAgent: marker }),
      ]);
      sessionIds = [createdA.session.id, createdB.session.id];
      const csrfA = createCsrfToken();
      const csrfB = createCsrfToken();
      await Promise.all([
        setCsrfToken(createdA.session.id, csrfA.tokenHash),
        setCsrfToken(createdB.session.id, csrfB.tokenHash),
      ]);

      const adminPath = await resolveAdminPath();
      server = startHttpServer({ port: 0 });
      const baseUrl = `http://127.0.0.1:${server.port}`;
      const fallbackHost = `127.0.0.1:${server.port}`;
      const host = configuredHost(await getSetting("site.adminBaseUrl"), fallbackHost);
      const routePath = `${adminPath}/api/user-settings/customScreens.entry.preferences`;
      const unknownPath = `${adminPath}/api/user-settings/unknown.key`;
      const url = `${baseUrl}${routePath}`;
      const headers = (
        token?: string,
        csrf?: string,
        expectedUserId?: string
      ): Record<string, string> => ({
        Host: host,
        "User-Agent": marker,
        ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(expectedUserId ? { "X-Coderso-Expected-User-Id": expectedUserId } : {}),
      });
      const identityA = {
        userId: userA,
        sessionId: createdA.session.id,
      } as const;
      const identityB = {
        userId: userB,
        sessionId: createdB.session.id,
      } as const;
      const request = (
        requestUrl: string,
        init: RequestInit,
        status: number,
        identity: AccessLogIdentity
      ) =>
        trackedFetch(
          requestUrl,
          init,
          {
            method: (init.method ?? "GET").toUpperCase(),
            path: new URL(requestUrl).pathname,
            status,
            identity,
          },
          marker,
          ledger
        );

      try {
        expect(resolveRateLimitBucket("GET", "/user-settings/key")).toBe("admin_read");
        expect(resolveRateLimitBucket("PATCH", "/user-settings/key")).toBe("admin_write");

        const unauthenticated = await request(url, { method: "GET", headers: headers() }, 401, {
          userId: null,
          sessionId: null,
        });
        expect(await responseErrorCode(unauthenticated)).toBe("auth_required");

        const defaultA = await request(
          url,
          { method: "GET", headers: headers(createdA.token) },
          200,
          identityA
        );
        expect(await defaultA.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: false },
        });

        const writeA = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: true },
            }),
          },
          200,
          identityA
        );
        expect(await writeA.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: true },
        });

        await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdB.token, csrfB.token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
            }),
          },
          200,
          identityB
        );

        const readA = await request(
          url,
          { method: "GET", headers: headers(createdA.token) },
          200,
          identityA
        );
        expect(await readA.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: true },
        });

        const mismatch = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdB.token, csrfB.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: true },
            }),
          },
          409,
          identityB
        );
        expect(await responseErrorCode(mismatch)).toBe("user_setting_identity_changed");

        const readB = await request(
          url,
          { method: "GET", headers: headers(createdB.token) },
          200,
          identityB
        );
        expect(await readB.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: false },
        });
        const [storedA] = await db
          .select({ value: userSettings.value })
          .from(userSettings)
          .where(
            and(
              eq(userSettings.userId, userA),
              eq(userSettings.key, "customScreens.entry.preferences")
            )
          );
        expect(storedA?.value).toEqual({
          version: 1,
          showFieldMetadata: true,
        });
        const [storedB] = await db
          .select({ value: userSettings.value })
          .from(userSettings)
          .where(
            and(
              eq(userSettings.userId, userB),
              eq(userSettings.key, "customScreens.entry.preferences")
            )
          );
        expect(storedB?.value).toEqual({
          version: 1,
          showFieldMetadata: false,
        });

        const invalidKey = await request(
          `${baseUrl}${unknownPath}`,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ value: true }),
          },
          400,
          identityA
        );
        expect(await responseErrorCode(invalidKey)).toBe("user_settings_key_invalid");

        const invalidValue = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: "yes" },
            }),
          },
          400,
          identityA
        );
        expect(await responseErrorCode(invalidValue)).toBe("user_settings_value_invalid");

        const unknownEnvelope = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
              extra: true,
            }),
          },
          400,
          identityA
        );
        expect(await responseErrorCode(unknownEnvelope)).toBe("validation_error");

        const missingCsrf = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, undefined, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
            }),
          },
          403,
          identityA
        );
        expect(await responseErrorCode(missingCsrf)).toBe("csrf_invalid");

        const invalidCsrf = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, "invalid-csrf-token", userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
            }),
          },
          403,
          identityA
        );
        expect(await responseErrorCode(invalidCsrf)).toBe("csrf_invalid");
      } catch (error) {
        behaviorError = error instanceof Error ? error : new Error("user_settings_http_failed");
      }

      await server.stop(true);
      server = null;

      try {
        await validateAndCleanupAccessLogs(
          pollDeps,
          currentScope(),
          ledger.map(expectedAccessLogSignature),
          cleanupExactFixtures
        );
      } catch (error) {
        validationError =
          error instanceof Error ? error : new Error("access_log_validation_failed");
      }
    } catch (error) {
      if (!behaviorError) {
        behaviorError = error instanceof Error ? error : new Error("user_settings_http_failed");
      }
    } finally {
      if (server) {
        try {
          await server.stop(true);
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("user_settings_server_stop_failed")
          );
        }
      }
      resetRateLimitBuckets();
      if (!fixturesCleaned) {
        try {
          const scope = currentScope();
          const remaining = await queryCandidates();
          const initialIds = remaining
            .filter((row) => isOwnedAccessLogCandidate(row, scope))
            .map(({ id }) => id);
          const drained = await drainExactAccessLogs(pollDeps, scope, initialIds);
          if (drained.scopeInvalid) {
            fallbackCleanupErrors.push(new Error("access_log_scope_invalid"));
          }
          if (drained.lateAfterDelete) {
            fallbackCleanupErrors.push(new Error("access_log_late_after_delete"));
          }
          if (drained.cleanupError) {
            fallbackCleanupErrors.push(drained.cleanupError);
          } else {
            await cleanupExactFixtures();
          }
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("access_log_fallback_cleanup_failed")
          );
        }
      }
    }

    const finalErrors: Error[] = [];
    if (behaviorError) finalErrors.push(behaviorError);
    if (validationError) finalErrors.push(validationError);
    finalErrors.push(...fallbackCleanupErrors);
    if (finalErrors.length === 1) throw finalErrors[0];
    if (finalErrors.length > 1) {
      throw new AggregateError(finalErrors, "user_settings_http_and_log_validation_failed");
    }
  },
  30_000
);

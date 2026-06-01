import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, sessions, users } from "../../../core/db/schema";
import { encodeAdminCursor } from "../../../core/services/admin/adminQueryConventions";
import {
  AccessLogDomainError,
  listAccessLogs,
  logAccess,
  normalizeAccessLogQuery,
  revokeAccessLogSession,
  resolveAccessLogMatchContext,
  resolveAccessLogSessionContext,
} from "../../../core/services/access/accessLogService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

let userId: string | undefined;
let logIds: string[] = [];
let sessionIds: string[] = [];

afterAll(async () => {
  if (logIds.length > 0) {
    await db.delete(accessLogs).where(inArray(accessLogs.id, logIds));
  }
  if (sessionIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.id, sessionIds));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

test("normalizeAccessLogQuery clamps, trims, validates dates, methods, IP, and cursors", () => {
  const cursor = encodeAdminCursor({
    createdAt: "2026-06-01T12:00:00.000Z",
    id: "access-1",
  });
  const query = normalizeAccessLogQuery({
    limit: "500",
    status: "failed",
    query: "  login  ",
    userId: " user-1 ",
    method: "post",
    ip: " 127.0.0.1 ",
    from: "2026-06-01",
    to: "2026-06-02",
    cursor,
  });

  expect(query).toMatchObject({
    limit: 200,
    status: "failed",
    query: "login",
    userId: "user-1",
    method: "POST",
    ip: "127.0.0.1",
    cursor,
  });
  expect(query.from?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  expect(query.to?.toISOString()).toBe("2026-06-02T23:59:59.999Z");

  expect(() => normalizeAccessLogQuery({ method: "TRACE" })).toThrow();
  expect(() =>
    normalizeAccessLogQuery({
      from: "2026-06-03T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
    })
  ).toThrow();
  expect(() => normalizeAccessLogQuery({ cursor: "not-a-cursor" })).toThrow();
});

test("resolveAccessLogMatchContext explains hidden-field matches without values", () => {
  expect(
    resolveAccessLogMatchContext("ada@example.com", {
      path: "/admin/pages",
      ip: "127.0.0.1",
      userName: "Ada Lovelace",
      userEmail: "ada@example.com",
    })
  ).toEqual({ field: "email", label: "Matched user email" });
  expect(
    resolveAccessLogMatchContext("pages", {
      path: "/admin/pages",
      ip: "127.0.0.1",
      userName: "Ada Lovelace",
      userEmail: "ada@example.com",
    })
  ).toEqual({ field: "path", label: "Matched request path" });
});

test("resolveAccessLogSessionContext classifies availability and permissions", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");
  expect(
    resolveAccessLogSessionContext(
      {
        status: 401,
        userId: null,
        sessionId: null,
        sessionFound: false,
        sessionExpiresAt: null,
        sessionRevokedAt: null,
      },
      { now }
    )
  ).toMatchObject({
    state: "none",
    reason: "failed_attempt",
    view: { enabled: false },
    revoke: { enabled: false },
  });

  const viewable = resolveAccessLogSessionContext(
    {
      status: 200,
      userId: "user-1",
      sessionId: "session-1",
      sessionFound: true,
      sessionExpiresAt: new Date("2026-06-01T13:00:00.000Z"),
      sessionRevokedAt: null,
    },
    { now, canViewSession: true, canRevokeSession: true }
  );
  expect(viewable).toMatchObject({
    state: "active",
    sessionId: "session-1",
    userId: "user-1",
    expiresAt: new Date("2026-06-01T13:00:00.000Z"),
    view: { enabled: true },
    revoke: { enabled: true },
  });

  expect(
    resolveAccessLogSessionContext(
      {
        status: 200,
        userId: "user-1",
        sessionId: "session-1",
        sessionFound: true,
        sessionExpiresAt: new Date("2026-06-01T13:00:00.000Z"),
        sessionRevokedAt: null,
      },
      { now, currentSessionId: "session-1", canViewSession: true, canRevokeSession: true }
    )
  ).toMatchObject({
    state: "current",
    sessionId: "session-1",
    view: { enabled: true },
    revoke: { enabled: false },
  });

  const restricted = resolveAccessLogSessionContext(
    {
      status: 200,
      userId: "user-1",
      sessionId: "session-1",
      sessionFound: true,
      sessionExpiresAt: new Date("2026-06-01T13:00:00.000Z"),
      sessionRevokedAt: null,
    },
    { now, currentSessionId: "session-1", canViewSession: false, canRevokeSession: false }
  );
  expect(restricted).toMatchObject({
    state: "current",
    view: { enabled: false },
    revoke: { enabled: false },
  });
  expect("sessionId" in restricted).toBe(false);
  expect("userId" in restricted).toBe(false);
  expect("current" in restricted).toBe(false);
  expect("expiresAt" in restricted).toBe(false);
  expect("revokedAt" in restricted).toBe(false);
});

testIfDb("logAccess creates entries and listAccessLogs filters", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `access-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Access User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  userId = user.id;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash: `access-session-${randomUUID()}`,
      ip: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Macintosh)",
      expiresAt,
    })
    .returning({ id: sessions.id });
  sessionIds.push(session.id);

  const first = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    ip: "127.0.0.1",
    userId: user.id,
    sessionId: session.id,
  });

  const second = await logAccess({
    method: "POST",
    path: "/admin/api/auth/login",
    status: 401,
    ip: "127.0.0.2",
    userAgent: "Mozilla/5.0 (Macintosh)",
    userId: user.id,
  });

  logIds = [first.id, second.id];

  const all = await listAccessLogs(
    { limit: 10, userId: user.id },
    { canViewSession: true, canRevokeSession: true }
  );
  expect(all.items.length).toBeGreaterThanOrEqual(2);
  const sessionLog = all.items.find((row) => row.id === first.id);
  expect(sessionLog?.session).toMatchObject({
    state: "active",
    sessionId: session.id,
    view: { enabled: true },
    revoke: { enabled: true },
  });

  const failedOnly = await listAccessLogs({ limit: 10, status: "failed" });
  expect(failedOnly.items.every((row) => row.status >= 400)).toBe(true);

  const queryMatch = await listAccessLogs({ limit: 10, query: "auth" });
  expect(queryMatch.items.some((row) => row.path.includes("auth"))).toBe(true);

  const firstPage = await listAccessLogs({ limit: 1, userId: user.id });
  expect(firstPage.items).toHaveLength(1);
  expect(firstPage.nextCursor).toBeTruthy();

  const secondPage = await listAccessLogs({
    limit: 1,
    userId: user.id,
    cursor: firstPage.nextCursor,
  });
  expect(secondPage.items).toHaveLength(1);
  expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
  expect(secondPage.nextCursor).toBeNull();
});

testIfDb("revokeAccessLogSession resolves session from access log and guards state", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `access-revoke-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Access Revoke User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const previousUserId = userId;
  userId = user.id;
  if (previousUserId) {
    await db.delete(users).where(eq(users.id, previousUserId));
  }

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);
  const insertedSessions = await db
    .insert(sessions)
    .values([
      {
        userId: user.id,
        tokenHash: `active-${randomUUID()}`,
        expiresAt: future,
      },
      {
        userId: user.id,
        tokenHash: `current-${randomUUID()}`,
        expiresAt: future,
      },
      {
        userId: user.id,
        tokenHash: `expired-${randomUUID()}`,
        expiresAt: past,
      },
    ])
    .returning({ id: sessions.id });
  sessionIds.push(...insertedSessions.map((row) => row.id));

  const activeLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
    sessionId: insertedSessions[0].id,
  });
  const currentLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
    sessionId: insertedSessions[1].id,
  });
  const expiredLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
    sessionId: insertedSessions[2].id,
  });
  const historicalLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
  });
  logIds.push(activeLog.id, currentLog.id, expiredLog.id, historicalLog.id);

  const revoked = await revokeAccessLogSession({
    accessLogId: activeLog.id,
    currentSessionId: insertedSessions[1].id,
    reason: "admin_manual_revoke",
  });
  expect(revoked).toMatchObject({
    ok: true,
    accessLogId: activeLog.id,
    revokedSessionRef: insertedSessions[0].id,
    sessionState: "revoked",
    alreadyRevoked: false,
  });

  const idempotent = await revokeAccessLogSession({
    accessLogId: activeLog.id,
    currentSessionId: insertedSessions[1].id,
    reason: "admin_manual_revoke",
  });
  expect(idempotent.alreadyRevoked).toBe(true);

  await expect(
    revokeAccessLogSession({
      accessLogId: currentLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "admin_manual_revoke",
    })
  ).rejects.toMatchObject({ code: "access_log_current_session_revoke_blocked" });

  await expect(
    revokeAccessLogSession({
      accessLogId: expiredLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "admin_manual_revoke",
    })
  ).rejects.toMatchObject({ code: "access_log_session_expired" });

  await expect(
    revokeAccessLogSession({
      accessLogId: historicalLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "admin_manual_revoke",
    })
  ).rejects.toMatchObject({ code: "access_log_session_not_found" });

  await expect(
    revokeAccessLogSession({
      accessLogId: activeLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "invalid" as "admin_manual_revoke",
    })
  ).rejects.toBeInstanceOf(AccessLogDomainError);
});

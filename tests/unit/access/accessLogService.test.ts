import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, users } from "../../../core/db/schema";
import { encodeAdminCursor } from "../../../core/services/admin/adminQueryConventions";
import {
  listAccessLogs,
  logAccess,
  normalizeAccessLogQuery,
  resolveAccessLogMatchContext,
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

afterAll(async () => {
  if (logIds.length > 0) {
    await db.delete(accessLogs).where(inArray(accessLogs.id, logIds));
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

  const first = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    ip: "127.0.0.1",
    userId: user.id,
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

  const all = await listAccessLogs({ limit: 10, userId: user.id });
  expect(all.items.length).toBeGreaterThanOrEqual(2);

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

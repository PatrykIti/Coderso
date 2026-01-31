import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, users } from "../../../core/db/schema";
import {
  listAccessLogs,
  logAccess,
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
  expect(all.length).toBeGreaterThanOrEqual(2);

  const failedOnly = await listAccessLogs({ limit: 10, status: "failed" });
  expect(failedOnly.every((row) => row.status >= 400)).toBe(true);

  const queryMatch = await listAccessLogs({ limit: 10, query: "auth" });
  expect(queryMatch.some((row) => row.path.includes("auth"))).toBe(true);
});

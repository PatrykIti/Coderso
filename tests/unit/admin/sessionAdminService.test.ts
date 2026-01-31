import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { sessions, users } from "../../../core/db/schema";
import {
  listActiveSessions,
  revokeAllForUser,
  revokeSession,
} from "../../../core/services/admin/sessionAdminService";

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
let sessionIds: string[] = [];

afterAll(async () => {
  if (sessionIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.id, sessionIds));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

testIfDb("list and revoke sessions", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `session-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Session User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  userId = user.id;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inserted = await db
    .insert(sessions)
    .values([
      {
        userId: user.id,
        tokenHash: `token-${randomUUID()}`,
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0 (Macintosh)",
        expiresAt,
      },
      {
        userId: user.id,
        tokenHash: `token-${randomUUID()}`,
        ip: "127.0.0.2",
        userAgent: "Mozilla/5.0 (iPhone)",
        expiresAt,
      },
      {
        userId: user.id,
        tokenHash: `token-${randomUUID()}`,
        ip: "127.0.0.3",
        userAgent: "Mozilla/5.0 (Windows NT 10.0)",
        expiresAt,
      },
    ])
    .returning({ id: sessions.id });

  sessionIds = inserted.map((row) => row.id);

  const active = await listActiveSessions(user.id);
  expect(active.length).toBe(3);

  const revoked = await revokeSession(sessionIds[0]);
  expect(revoked?.revokedAt).not.toBeNull();

  const revokedCount = await revokeAllForUser(user.id, sessionIds[1]);
  expect(revokedCount).toBe(1);

  const remaining = await listActiveSessions(user.id);
  expect(remaining.length).toBe(1);
  expect(remaining[0]?.id).toBe(sessionIds[1]);
});

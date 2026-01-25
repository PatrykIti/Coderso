import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { sessions, users } from "../../../core/db/schema";
import {
  createSession,
  getSessionByToken,
  revokeSession,
} from "../../../core/services/auth/sessionService";

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
let sessionId: string | undefined;

const cleanup = async () => {
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

afterAll(async () => {
  await cleanup();
});

testIfDb("create and revoke session", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `login-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;

  const { token, session } = await createSession({
    userId: user.id,
    ip: "127.0.0.1",
    userAgent: "bun-test",
    ttlDays: 1,
  });

  sessionId = session.id;

  const found = await getSessionByToken(token);
  expect(found?.id).toBe(session.id);

  await revokeSession(session.id);

  const revoked = await getSessionByToken(token);
  expect(revoked).toBeNull();

  await cleanup();
  userId = undefined;
  sessionId = undefined;
});

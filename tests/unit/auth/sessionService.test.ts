import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { sessions, settings, users } from "../../../core/db/schema";
import {
  createSession,
  getSessionByToken,
  revokeSession,
} from "../../../core/services/auth/sessionService";
import {
  resetSecuritySettingsCache,
  setSecuritySettings,
} from "../../../core/services/settings/securitySettings";

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
  if (!hasDb) return;
  if (userId) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
  await db.delete(settings).where(eq(settings.key, "security.settings"));
  resetSecuritySettingsCache();
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

  const { token, session, ttlDays } = await createSession({
    userId: user.id,
    ip: "127.0.0.1",
    userAgent: "bun-test",
    ttlDays: 1,
  });

  sessionId = session.id;
  expect(ttlDays).toBe(1);

  const found = await getSessionByToken(token);
  expect(found?.id).toBe(session.id);

  await revokeSession(session.id);

  const revoked = await getSessionByToken(token);
  expect(revoked).toBeNull();

  await cleanup();
  userId = undefined;
  sessionId = undefined;
});

testIfDb("enforces max sessions per user by revoking oldest", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `limit-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;
  await setSecuritySettings({
    session: { ttlDays: 7, maxPerUser: 2, singleSession: false },
  });

  await createSession({ userId: user.id });
  await createSession({ userId: user.id });
  await createSession({ userId: user.id });

  const active = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))
    )
    .orderBy(asc(sessions.createdAt));

  expect(active.length).toBe(2);

  await cleanup();
  userId = undefined;
});

testIfDb("single session mode revokes previous sessions", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `single-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;
  await setSecuritySettings({
    session: { ttlDays: 7, maxPerUser: 3, singleSession: true },
  });

  const first = await createSession({ userId: user.id });
  const second = await createSession({ userId: user.id });

  const [firstRow] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, first.session.id));

  const [secondRow] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, second.session.id));

  expect(firstRow?.revokedAt).not.toBeNull();
  expect(secondRow?.revokedAt).toBeNull();

  await cleanup();
  userId = undefined;
});

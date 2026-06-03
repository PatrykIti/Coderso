import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { passwordResets, settings, users } from "../../../core/db/schema";
import {
  consumeResetTokenWithStatus,
  consumeResetToken,
  createResetToken,
  findResetToken,
  resolveResetTtlMinutesFromSetting,
} from "../../../core/services/auth/passwordResetService";
import { setSetting } from "../../../core/services/settings/settingsService";

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

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(settings).where(eq(settings.key, "auth.resetTtlMinutes"));
  if (userId) {
    await db.delete(passwordResets).where(eq(passwordResets.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
};

afterAll(async () => {
  await cleanup();
});

test("resolveResetTtlMinutesFromSetting applies bounds and default fallback", () => {
  expect(resolveResetTtlMinutesFromSetting(30)).toBe(30);
  expect(resolveResetTtlMinutesFromSetting(1)).toBe(5);
  expect(resolveResetTtlMinutesFromSetting(4000)).toBe(1440);
  expect(resolveResetTtlMinutesFromSetting("bad")).toBe(60);
});

testIfDb("create and consume reset token", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `reset-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;

  const { token, expiresAt } = await createResetToken(user.id);
  expect(expiresAt).toBeInstanceOf(Date);

  const found = await findResetToken(token);
  expect(found?.userId).toBe(user.id);

  const consumed = await consumeResetToken(token);
  expect(consumed?.usedAt).toBeInstanceOf(Date);

  const replay = await consumeResetToken(token);
  expect(replay).toBeNull();

  await cleanup();
  userId = undefined;
});

testIfDb("createResetToken invalidates previous outstanding tokens", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `reset-invalidate-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;

  const first = await createResetToken(user.id);
  const second = await createResetToken(user.id);

  const firstResult = await consumeResetTokenWithStatus(first.token);
  expect(firstResult).toEqual({ ok: false, code: "set_password_token_used" });

  const secondResult = await consumeResetTokenWithStatus(second.token);
  expect(secondResult.ok).toBe(true);

  await cleanup();
  userId = undefined;
});

testIfDb("consumeResetTokenWithStatus classifies invalid expired and used tokens", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `reset-status-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;

  const unknown = await consumeResetTokenWithStatus("unknown-token");
  expect(unknown).toEqual({ ok: false, code: "set_password_token_invalid" });

  const used = await createResetToken(user.id);
  await consumeResetTokenWithStatus(used.token);
  const replay = await consumeResetTokenWithStatus(used.token);
  expect(replay).toEqual({ ok: false, code: "set_password_token_used" });

  const expired = await createResetToken(user.id);
  await db
    .update(passwordResets)
    .set({ expiresAt: new Date(Date.now() - 60_000) })
    .where(eq(passwordResets.tokenHash, expired.tokenHash));

  const expiredResult = await consumeResetTokenWithStatus(expired.token);
  expect(expiredResult).toEqual({ ok: false, code: "set_password_token_expired" });

  await cleanup();
  userId = undefined;
});

testIfDb("createResetToken uses auth reset ttl from settings", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `reset-ttl-${randomUUID()}@example.com`,
      passwordHash: "hash",
      status: "active",
    })
    .returning();

  userId = user?.id;
  await setSetting("auth.resetTtlMinutes", 30);

  const now = Date.now();
  const { expiresAt } = await createResetToken(user.id);
  const ttlMs = expiresAt.getTime() - now;

  expect(ttlMs).toBeGreaterThan(29 * 60_000);
  expect(ttlMs).toBeLessThan(31 * 60_000);

  await cleanup();
  userId = undefined;
});

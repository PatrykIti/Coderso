import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { passwordResets, users } from "../../../core/db/schema";
import {
  consumeResetToken,
  createResetToken,
  findResetToken,
} from "../../../core/services/auth/passwordResetService";

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
  if (userId) {
    await db.delete(passwordResets).where(eq(passwordResets.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
};

afterAll(async () => {
  await cleanup();
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

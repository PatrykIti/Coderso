import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db/client";
import { passwordResets } from "../../db/schema";

export const DEFAULT_RESET_TTL_MS = 60 * 60 * 1000;

export type PasswordResetRow = typeof passwordResets.$inferSelect;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

export async function createResetToken(userId: string) {
  const token = generateToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + DEFAULT_RESET_TTL_MS);

  await db
    .insert(passwordResets)
    .values({ userId, tokenHash, expiresAt })
    .returning();

  return { token, tokenHash, expiresAt };
}

export async function findResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash));
  return row ?? null;
}

export async function consumeResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const now = new Date();

  const [row] = await db
    .update(passwordResets)
    .set({ usedAt: now, updatedAt: now })
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, now)
      )
    )
    .returning();

  return row ?? null;
}

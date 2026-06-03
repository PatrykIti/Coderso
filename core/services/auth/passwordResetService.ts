import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db/client";
import { passwordResets } from "../../db/schema";
import { getSetting } from "../settings/settingsService";

export const DEFAULT_RESET_TTL_MS = 60 * 60 * 1000;
const MIN_RESET_TTL_MINUTES = 5;
const MAX_RESET_TTL_MINUTES = 1440;

export type PasswordResetRow = typeof passwordResets.$inferSelect;
export type PasswordResetTokenErrorCode =
  | "set_password_token_invalid"
  | "set_password_token_expired"
  | "set_password_token_used";

export type ConsumeResetTokenResult =
  | { ok: true; reset: PasswordResetRow }
  | { ok: false; code: PasswordResetTokenErrorCode };

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

const toBoundedMinutes = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized <= 0) return null;
  return Math.min(MAX_RESET_TTL_MINUTES, Math.max(MIN_RESET_TTL_MINUTES, normalized));
};

export function resolveResetTtlMinutesFromSetting(value: unknown) {
  const normalized = toBoundedMinutes(value);
  if (normalized !== null) return normalized;
  return DEFAULT_RESET_TTL_MS / 60_000;
}

export async function resolveResetTtlMinutes() {
  const configured = await getSetting("auth.resetTtlMinutes");
  return resolveResetTtlMinutesFromSetting(configured);
}

export async function invalidateResetTokensForUser(userId: string, now = new Date()) {
  const rows = await db
    .update(passwordResets)
    .set({ usedAt: now, updatedAt: now })
    .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)))
    .returning({ id: passwordResets.id });

  return rows.length;
}

export async function createResetToken(
  userId: string,
  options: { invalidateExisting?: boolean } = {}
) {
  const token = generateToken();
  const tokenHash = hashResetToken(token);
  const ttlMinutes = await resolveResetTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  if (options.invalidateExisting ?? true) {
    await invalidateResetTokensForUser(userId);
  }

  await db.insert(passwordResets).values({ userId, tokenHash, expiresAt }).returning();

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

const classifyResetTokenRow = (
  row: PasswordResetRow | null,
  now: Date
): PasswordResetTokenErrorCode => {
  if (!row) return "set_password_token_invalid";
  if (row.usedAt) return "set_password_token_used";
  if (row.expiresAt.getTime() <= now.getTime()) return "set_password_token_expired";
  return "set_password_token_invalid";
};

export async function consumeResetTokenWithStatus(token: string): Promise<ConsumeResetTokenResult> {
  const tokenHash = hashResetToken(token);
  const now = new Date();

  const [existing] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash));

  if (!existing || existing.usedAt || existing.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, code: classifyResetTokenRow(existing ?? null, now) };
  }

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

  if (row) return { ok: true, reset: row };

  const [latest] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash));
  return { ok: false, code: classifyResetTokenRow(latest ?? null, new Date()) };
}

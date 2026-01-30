import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { sessions } from "../../db/schema";
import { getSecuritySettings } from "../settings/securitySettings";

export const SESSION_COOKIE_NAME = "session";
export const DEFAULT_SESSION_TTL_DAYS = 7;

export type SessionRow = typeof sessions.$inferSelect;

export type CreateSessionInput = {
  userId: string;
  ip?: string;
  userAgent?: string;
  ttlDays?: number;
};

export type SessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
};

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashSessionToken(token: string) {
  return hashToken(token);
}

export function buildSessionCookieOptions(
  ttlDays: number = DEFAULT_SESSION_TTL_DAYS
): SessionCookieOptions {
  const secureOverride = process.env.COOKIE_SECURE;
  const secure =
    secureOverride !== undefined
      ? secureOverride !== "false"
      : process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: ttlDays * 24 * 60 * 60,
  };
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

export function createCsrfToken() {
  const issuedAt = Date.now();
  const token = `${issuedAt}.${generateToken()}`;
  return { token, tokenHash: hashToken(token), issuedAt };
}

async function getSessionPolicy() {
  const settings = await getSecuritySettings();
  return settings.session;
}

async function enforceSessionLimits(userId: string, policy: {
  maxPerUser: number;
  singleSession: boolean;
}) {
  if (policy.singleSession) {
    await revokeAllSessions(userId);
    return;
  }

  const maxPerUser = policy.maxPerUser;
  if (!Number.isFinite(maxPerUser) || maxPerUser <= 0) return;

  const now = new Date();
  const active = await db
    .select({ id: sessions.id, createdAt: sessions.createdAt })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .orderBy(asc(sessions.createdAt));

  const allowedExisting = Math.max(maxPerUser - 1, 0);
  const excess = active.length - allowedExisting;
  if (excess <= 0) return;

  const revokeIds = active.slice(0, excess).map((row) => row.id);
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(inArray(sessions.id, revokeIds));
}

export async function createSession(input: CreateSessionInput) {
  const policy = await getSessionPolicy();
  const ttlDays = input.ttlDays ?? policy.ttlDays ?? DEFAULT_SESSION_TTL_DAYS;
  await enforceSessionLimits(input.userId, policy);
  const token = generateToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      tokenHash,
      ip: input.ip,
      userAgent: input.userAgent,
      expiresAt,
    })
    .returning();

  return { token, session, ttlDays };
}

export async function getSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash));

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt <= new Date()) return null;

  return session;
}

export async function revokeSession(sessionId: string) {
  const [session] = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return session ?? null;
}

export async function revokeSessionByToken(token: string) {
  const session = await getSessionByToken(token);
  if (!session) return null;
  return revokeSession(session.id);
}

export async function revokeAllSessions(userId: string) {
  const now = new Date();
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export async function setCsrfToken(sessionId: string, tokenHash: string) {
  const [row] = await db
    .update(sessions)
    .set({ csrfTokenHash: tokenHash })
    .where(eq(sessions.id, sessionId))
    .returning();

  return row ?? null;
}

export async function getCsrfTokenHash(sessionId: string) {
  const [row] = await db
    .select({ csrfTokenHash: sessions.csrfTokenHash })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  return row?.csrfTokenHash ?? null;
}

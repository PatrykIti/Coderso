import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { sessions } from "../../db/schema";

export const SESSION_COOKIE_NAME = "session";
export const DEFAULT_SESSION_TTL_DAYS = 14;

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

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionCookieOptions(
  ttlDays: number = DEFAULT_SESSION_TTL_DAYS
): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ttlDays * 24 * 60 * 60,
  };
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

export async function createSession(input: CreateSessionInput) {
  const ttlDays = input.ttlDays ?? DEFAULT_SESSION_TTL_DAYS;
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

  return { token, session };
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

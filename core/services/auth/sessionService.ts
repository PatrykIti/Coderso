import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { sessions } from "../../db/schema";
import { getSecuritySettings } from "../settings/securitySettings";
import { getSetting } from "../settings/settingsService";

export const SESSION_COOKIE_NAME = "session";
export const DEFAULT_SESSION_TTL_DAYS = 7;
const MIN_SESSION_TTL_DAYS = 1;
const MAX_SESSION_TTL_DAYS = 365;

export type SessionRow = typeof sessions.$inferSelect;

export type SessionFingerprint = {
  ip: string | null;
  userAgent: string | null;
};

export type LoginAlertFlags = {
  newDevice: boolean;
  newLocation: boolean;
};

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

export async function getLastSessionFingerprint(userId: string) {
  const [row] = await db
    .select({ ip: sessions.ip, userAgent: sessions.userAgent })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(1);

  return row ?? null;
}

export function evaluateLoginAlert(
  previous: SessionFingerprint | null,
  current: SessionFingerprint
): LoginAlertFlags {
  if (!previous) {
    return { newDevice: false, newLocation: false };
  }

  const newDevice = Boolean(
    previous.userAgent && current.userAgent && previous.userAgent !== current.userAgent
  );
  const newLocation = Boolean(previous.ip && current.ip && previous.ip !== current.ip);

  return { newDevice, newLocation };
}

async function getSessionPolicy() {
  const settings = await getSecuritySettings();
  return settings.session;
}

const toBoundedInteger = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized <= 0) return null;
  return Math.min(max, Math.max(min, normalized));
};

export function resolveSessionTtlDaysFromSources(input: {
  inputTtlDays?: number;
  authSettingTtlDays?: unknown;
  securitySettingTtlDays?: unknown;
}): number {
  const fromInput = toBoundedInteger(
    input.inputTtlDays,
    MIN_SESSION_TTL_DAYS,
    MAX_SESSION_TTL_DAYS
  );
  if (fromInput !== null) return fromInput;

  const fromAuthSettings = toBoundedInteger(
    input.authSettingTtlDays,
    MIN_SESSION_TTL_DAYS,
    MAX_SESSION_TTL_DAYS
  );
  if (fromAuthSettings !== null) return fromAuthSettings;

  const fromSecuritySettings = toBoundedInteger(
    input.securitySettingTtlDays,
    MIN_SESSION_TTL_DAYS,
    MAX_SESSION_TTL_DAYS
  );
  if (fromSecuritySettings !== null) return fromSecuritySettings;

  return DEFAULT_SESSION_TTL_DAYS;
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
  const authSessionTtlDays = await getSetting("auth.sessionTtlDays");
  const ttlDays = resolveSessionTtlDaysFromSources({
    inputTtlDays: input.ttlDays,
    authSettingTtlDays: authSessionTtlDays,
    securitySettingTtlDays: policy.ttlDays,
  });
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

import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { sessions, users } from "../../db/schema";

export type SessionSummary = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export async function listActiveSessions(userId?: string) {
  const now = new Date();
  const conditions = [isNull(sessions.revokedAt), gt(sessions.expiresAt, now)];
  if (userId) {
    conditions.push(eq(sessions.userId, userId));
  }

  const rows = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      userEmail: users.email,
      userName: users.name,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .leftJoin(users, eq(sessions.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail ?? "",
    userName: row.userName ?? null,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  }));
}

export async function revokeSession(sessionId: string) {
  const [row] = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return row ?? null;
}

export async function revokeAllForUser(userId: string, excludeSessionId?: string) {
  const now = new Date();
  const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
  if (excludeSessionId) {
    conditions.push(ne(sessions.id, excludeSessionId));
  }

  const revoked = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(...conditions))
    .returning({ id: sessions.id });

  return revoked.length;
}

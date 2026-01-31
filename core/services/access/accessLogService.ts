import { and, desc, eq, gte, ilike, lt, lte, or, type SQL } from "drizzle-orm";

import { db } from "../../db/client";
import { accessLogs, users } from "../../db/schema";

export type AccessLogInput = {
  method: string;
  path: string;
  status: number;
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  durationMs?: number | null;
};

export type AccessLogFilters = {
  limit?: number;
  status?: "success" | "failed";
  query?: string;
  userId?: string;
  from?: Date;
  to?: Date;
};

export type AccessLogRecord = {
  id: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  durationMs: number | null;
  createdAt: Date;
};

export async function logAccess(entry: AccessLogInput) {
  const [row] = await db
    .insert(accessLogs)
    .values({
      method: entry.method,
      path: entry.path,
      status: entry.status,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      userId: entry.userId ?? null,
      durationMs: entry.durationMs ?? null,
    })
    .returning();

  return row;
}

export async function listAccessLogs(filters: AccessLogFilters = {}) {
  const conditions: SQL[] = [];

  if (filters.status === "success") {
    conditions.push(lt(accessLogs.status, 400));
  }
  if (filters.status === "failed") {
    conditions.push(gte(accessLogs.status, 400));
  }
  if (filters.userId) {
    conditions.push(eq(accessLogs.userId, filters.userId));
  }
  if (filters.from) {
    conditions.push(gte(accessLogs.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(accessLogs.createdAt, filters.to));
  }

  if (filters.query) {
    const value = `%${filters.query.toLowerCase()}%`;
    const queryFilter = or(
      ilike(accessLogs.path, value),
      ilike(accessLogs.ip, value),
      ilike(users.email, value),
      ilike(users.name, value)
    );
    if (queryFilter) {
      conditions.push(queryFilter);
    }
  }

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);

  const rows = await db
    .select({
      id: accessLogs.id,
      method: accessLogs.method,
      path: accessLogs.path,
      status: accessLogs.status,
      ip: accessLogs.ip,
      userAgent: accessLogs.userAgent,
      userId: accessLogs.userId,
      userName: users.name,
      userEmail: users.email,
      durationMs: accessLogs.durationMs,
      createdAt: accessLogs.createdAt,
    })
    .from(accessLogs)
    .leftJoin(users, eq(accessLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(accessLogs.createdAt))
    .limit(limit);

  return rows as AccessLogRecord[];
}

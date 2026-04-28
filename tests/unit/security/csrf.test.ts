import { afterAll, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { sessions, users } from "../../../core/db/schema";
import {
  createCsrfToken,
  createSession,
  hashToken,
  setCsrfToken,
} from "../../../core/services/auth/sessionService";
import { enforceCsrf } from "../../../core/server/middleware/csrf";
import type { RouteContext } from "../../../core/server/router";

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

const cleanup = async (userId?: string, sessionId?: string) => {
  if (!hasDb) return;
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

const buildUser = async () => {
  const email = `csrf-${randomUUID()}@example.com`;
  const passwordHash = randomBytes(16).toString("hex");
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash, status: "active" })
    .returning();
  return row;
};

const buildContext = (sessionId: string): RouteContext => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  cookies: {},
  sessionId,
});

testIfDb("enforceCsrf rejects missing token", async () => {
  const user = await buildUser();
  const { session } = await createSession({ userId: user.id });
  try {
    const req = new Request("http://localhost/admin/api/pages", { method: "POST" });
    const ctx = buildContext(session.id);
    await expect(
      enforceCsrf(req, ctx, {
        enabled: true,
        headerName: "x-csrf-token",
        tokenTtlMinutes: 30,
      })
    ).rejects.toThrow("Invalid CSRF token");
  } finally {
    await cleanup(user.id, session.id);
  }
});

testIfDb("enforceCsrf accepts valid token", async () => {
  const user = await buildUser();
  const { session } = await createSession({ userId: user.id });
  const { token, tokenHash } = createCsrfToken();
  try {
    await setCsrfToken(session.id, tokenHash);
    const req = new Request("http://localhost/admin/api/pages", {
      method: "POST",
      headers: { "X-CSRF-Token": token },
    });
    const ctx = buildContext(session.id);
    await enforceCsrf(req, ctx, {
      enabled: true,
      headerName: "x-csrf-token",
      tokenTtlMinutes: 30,
    });
  } finally {
    await cleanup(user.id, session.id);
  }
});

testIfDb("enforceCsrf rejects expired token", async () => {
  const user = await buildUser();
  const { session } = await createSession({ userId: user.id });
  const expiredToken = `${Date.now() - 60 * 60 * 1000}.${randomBytes(16).toString("base64url")}`;
  try {
    await setCsrfToken(session.id, hashToken(expiredToken));
    const req = new Request("http://localhost/admin/api/pages", {
      method: "POST",
      headers: { "X-CSRF-Token": expiredToken },
    });
    const ctx = buildContext(session.id);
    await expect(
      enforceCsrf(req, ctx, {
        enabled: true,
        headerName: "x-csrf-token",
        tokenTtlMinutes: 30,
      })
    ).rejects.toThrow("CSRF token expired");
  } finally {
    await cleanup(user.id, session.id);
  }
});

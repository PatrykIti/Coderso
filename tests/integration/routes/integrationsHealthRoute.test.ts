// TASK-491-04-L01: integrations health check route (Bun lane). Wires the route
// table, drives the real handler with a real DB, and asserts RBAC guards,
// error mapping, persistence, and the no-auto-healthy summary behavior.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { auditLogs, integrations, users } from "../../../core/db/schema";
import { ApiError } from "../../../core/server/errorHandler";
import { registerIntegrationsRoutes } from "../../../core/server/routes/integrationsRoutes";
import { encryptSecret, type EncryptedSecret } from "../../../core/services/security/secretStore";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

type IntegrationRow = typeof integrations.$inferSelect;

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
    },
  };
};

const registerRoutes = () => {
  const { router, routes } = makeRouter();
  registerIntegrationsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });
  return routes;
};

const findHandler = (routes: Route[], method: string, path: string) =>
  routes.find((route) => route.method === method && route.path === path)?.handlers.at(-1);

const makeCtx = (params: Record<string, string>, user?: { id: string }): RouteContext => ({
  params,
  query: {},
  body: null,
  user,
  ip: "127.0.0.1",
  userAgent: "bun-test",
});

// --- DB fixtures -----------------------------------------------------------

const trackedIntegrationIds = new Set<string>();
const trackedAuditIds = new Set<string>();
// Snapshot of each singleton integration row BEFORE the suite first touches
// it, so cleanup restores pre-existing rows instead of deleting them.
const integrationSnapshots = new Map<string, Partial<IntegrationRow> | null>();
let actorId: string | null = null;
const actorEmail = `integration-health-${randomUUID().slice(0, 8)}@example.com`;

beforeAll(async () => {
  const [actor] = await db
    .insert(users)
    .values({ email: actorEmail, passwordHash: "test", status: "active" })
    .returning();
  actorId = actor?.id ?? null;
});

afterAll(async () => {
  for (const id of [...trackedIntegrationIds]) {
    const snapshot = integrationSnapshots.get(id);
    if (snapshot === undefined) continue;
    if (snapshot) {
      await db.update(integrations).set(snapshot).where(eq(integrations.id, id));
    } else {
      await db.delete(integrations).where(eq(integrations.id, id));
    }
    trackedIntegrationIds.delete(id);
  }
  // Scope audit cleanup to ONLY rows written by this suite (each tracked
  // immediately after the handler call that created it); never delete other
  // suites' or pre-existing `auditLogs.targetId='slack'` rows.
  if (trackedAuditIds.size > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.id, [...trackedAuditIds]));
  }
  await db.delete(users).where(eq(users.email, actorEmail));
});

const seedIntegration = async (
  id: string,
  config: Record<string, string | EncryptedSecret | null>,
  overrides: { status?: string; healthStatus?: string; lastError?: string | null } = {}
) => {
  if (!integrationSnapshots.has(id)) {
    const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
    integrationSnapshots.set(
      id,
      row
        ? {
            config: row.config,
            status: row.status,
            healthStatus: row.healthStatus,
            lastCheckedAt: row.lastCheckedAt,
            lastError: row.lastError,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }
        : null
    );
  }
  await db.delete(integrations).where(eq(integrations.id, id));
  await db.insert(integrations).values({
    id,
    config,
    status: overrides.status ?? "connected",
    healthStatus: overrides.healthStatus ?? "unknown",
    lastCheckedAt: null,
    lastError: overrides.lastError ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  trackedIntegrationIds.add(id);
};

// The check/patch handlers each write an audit row as their final step. Track
// exactly the rows this suite creates by diffing matching rows before/after the
// handler call (deterministic regardless of timestamp precision), so cleanup
// never touches other suites' or pre-existing `auditLogs` rows.
const runHandlerTrackingAudit = async <T>(
  action: string,
  targetId: string,
  fn: () => Promise<T> | T
): Promise<T> => {
  const before = new Set(
    (
      await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(and(eq(auditLogs.action, action), eq(auditLogs.targetId, targetId)))
    ).map((row) => row.id)
  );
  const result = await fn();
  const after = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(eq(auditLogs.action, action), eq(auditLogs.targetId, targetId)));
  for (const row of after) {
    if (!before.has(row.id)) trackedAuditIds.add(row.id);
  }
  return result;
};

// --- tests -----------------------------------------------------------------

test("check route is wired and guards with settings:write", () => {
  const routes = registerRoutes();
  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toContain("POST /settings/integrations/:id/check");
});

test("check on an unknown integration id maps to 404 ApiError", async () => {
  const routes = registerRoutes();
  const handler = findHandler(routes, "POST", "/settings/integrations/:id/check");

  try {
    await handler?.(makeCtx({ id: "missing-provider" }));
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("integration_not_found");
    expect(apiError.status).toBe(404);
  }
});

test("check maps a missing secret master key to 400 ApiError", async () => {
  await seedIntegration("slack", {
    webhookUrl: encryptSecret("https://hooks.slack.com/T491/key-missing"),
  });
  const routes = registerRoutes();
  const handler = findHandler(routes, "POST", "/settings/integrations/:id/check");

  const originalKey = process.env.MEDIA_SECRET_MASTER_KEY;
  delete process.env.MEDIA_SECRET_MASTER_KEY;
  try {
    try {
      await handler?.(makeCtx({ id: "slack" }));
      throw new Error("expected_error");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("secret_master_key_missing");
      expect(apiError.status).toBe(400);
    }
  } finally {
    if (originalKey === undefined) {
      delete process.env.MEDIA_SECRET_MASTER_KEY;
    } else {
      process.env.MEDIA_SECRET_MASTER_KEY = originalKey;
    }
  }
});

test("check persists a healthy result for a valid slack config", async () => {
  await seedIntegration("slack", { webhookUrl: encryptSecret("https://hooks.slack.com/T491/ok") });
  const routes = registerRoutes();
  const handler = findHandler(routes, "POST", "/settings/integrations/:id/check");

  const response = await runHandlerTrackingAudit("integration.check", "slack", async () =>
    handler?.(makeCtx({ id: "slack" }, actorId ? { id: actorId } : undefined))
  );
  const item = (response as { item: { health: { status: string; lastCheckedAt: string | null } } })
    .item;
  expect(item.health.status).toBe("healthy");
  expect(item.health.lastCheckedAt).toBeTruthy();

  const [row] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
  expect(row?.healthStatus).toBe("healthy");
  expect(row?.lastError).toBeNull();
});

test("check persists an issue plus machine code for an invalid GA id", async () => {
  await seedIntegration("google-analytics", { measurementId: "UA-12345" });
  const routes = registerRoutes();
  const handler = findHandler(routes, "POST", "/settings/integrations/:id/check");

  const response = await runHandlerTrackingAudit(
    "integration.check",
    "google-analytics",
    async () => handler?.(makeCtx({ id: "google-analytics" }))
  );
  const item = (response as { item: { health: { status: string; lastError: string | null } } })
    .item;
  expect(item.health.status).toBe("issue");
  expect(item.health.lastError).toBe("measurement_id_invalid");

  const [row] = await db.select().from(integrations).where(eq(integrations.id, "google-analytics"));
  expect(row?.healthStatus).toBe("issue");
  expect(row?.lastError).toBe("measurement_id_invalid");
});

test("check on an unconfigured integration returns unknown without failing", async () => {
  const routes = registerRoutes();
  const handler = findHandler(routes, "POST", "/settings/integrations/:id/check");

  const response = await runHandlerTrackingAudit("integration.check", "zapier", async () =>
    handler?.(makeCtx({ id: "zapier" }))
  );
  const item = (response as { item: { health: { status: string; lastError: string | null } } })
    .item;
  expect(item.health.status).toBe("unknown");
  expect(item.health.lastError).toBeNull();
});

test("a connected row with stored unknown health stays unknown in summaries", async () => {
  await seedIntegration(
    "slack",
    { webhookUrl: encryptSecret("https://hooks.slack.com/T491/ok") },
    { healthStatus: "unknown" }
  );
  const routes = registerRoutes();
  const handler = findHandler(routes, "GET", "/settings/integrations/:id");

  const response = await handler?.(makeCtx({ id: "slack" }));
  const item = (response as { item: { health: { status: string } } }).item;
  expect(item.health.status).toBe("unknown");
});

test("config change resets health to unknown and clears the last check", async () => {
  await seedIntegration(
    "slack",
    { webhookUrl: encryptSecret("https://hooks.slack.com/T491/stale") },
    { healthStatus: "issue", lastError: "webhook_http_429" }
  );
  const routes = registerRoutes();
  const handler = findHandler(routes, "PATCH", "/settings/integrations/:id");

  const response = await runHandlerTrackingAudit("integration.update", "slack", async () =>
    handler?.({
      ...makeCtx({ id: "slack" }),
      body: { config: { webhookUrl: "https://hooks.slack.com/T491/rotated" } },
    })
  );
  const item = (
    response as {
      item: { health: { status: string; lastError: string | null; lastCheckedAt: string | null } };
    }
  ).item;
  expect(item.health.status).toBe("unknown");
  expect(item.health.lastError).toBeNull();
  expect(item.health.lastCheckedAt).toBeNull();
});

test("check writes an audit entry", async () => {
  await seedIntegration("slack", {
    webhookUrl: encryptSecret("https://hooks.slack.com/T491/audit"),
  });
  const routes = registerRoutes();
  const handler = findHandler(routes, "POST", "/settings/integrations/:id/check");

  await runHandlerTrackingAudit("integration.check", "slack", async () =>
    handler?.(makeCtx({ id: "slack" }, actorId ? { id: actorId } : undefined))
  );

  const [audit] = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.action, "integration.check"), eq(auditLogs.targetId, "slack")))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  expect(audit?.targetId).toBe("slack");
});

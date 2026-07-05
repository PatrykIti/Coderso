import { expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { dashboardLayouts, users } from "../../../core/db/schema";
import { ApiError } from "../../../core/server/errorHandler";
import { registerDashboardRoutes } from "../../../core/server/routes/dashboardRoutes";
import type { Router } from "../../../core/server/router";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  getDashboardLayoutForUser,
  resetDashboardLayoutForUser,
  saveDashboardLayoutForUser,
} from "../../../core/services/dashboard/dashboardLayoutRepository";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function hasDashboardLayoutsTable() {
  try {
    const result = await db.execute<{ exists: boolean }>(
      sql`select to_regclass('public.dashboard_layouts') is not null as exists`
    );
    return Boolean(result[0]?.exists);
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDashboardLayoutStorage = hasDb && (await hasDashboardLayoutsTable());
const dbTest = hasDashboardLayoutStorage ? test : test.skip;

const makeRouter = () => {
  const routes: Route[] = [];
  const permissions: string[] = [];
  return {
    routes,
    permissions,
    requirePermission: (permission: string): RouteHandler => {
      permissions.push(permission);
      return async () => undefined;
    },
    // The dashboard route module only exercises get/put/post; cast the partial
    // mock to the full production Router (the test never invokes patch/delete/
    // static/routes) so registerDashboardRoutes typechecks against its real signature.
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      put: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PUT", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
    } as unknown as Router,
  };
};

test("registerDashboardRoutes wires dashboard layout and widget-data endpoints", () => {
  const { router, routes } = makeRouter();

  registerDashboardRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /dashboard",
      "GET /dashboard/layout",
      "PUT /dashboard/layout",
      "POST /dashboard/layout/reset",
      "GET /dashboard/widget-data",
      "POST /dashboard/widget-data",
    ])
  );
});

test("dashboard routes capture read and write permissions", () => {
  const { router, permissions, requirePermission } = makeRouter();

  registerDashboardRoutes(router, {
    requirePermission,
    validate: () => undefined,
  });

  expect(permissions).toEqual(expect.arrayContaining(["content:read", "dashboard:write"]));
});

test("PUT /dashboard/layout rejects unknown fields before storage access", async () => {
  const { router, routes } = makeRouter();

  registerDashboardRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = routes
    .find((route) => route.method === "PUT" && route.path === "/dashboard/layout")
    ?.handlers.at(-1);

  await expect(
    handler?.({
      params: {},
      query: {},
      user: { id: "user-1" },
      body: { version: 1, widgets: [], unknown: true },
    })
  ).rejects.toMatchObject({
    code: "dashboard_layout_invalid",
    status: 400,
  } satisfies Partial<ApiError>);
});

dbTest("dashboard layout repository saves, reads, and resets a scoped user layout", async () => {
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    email: `dashboard-${userId}@example.com`,
    passwordHash: "test-password-hash",
    name: "Dashboard Test",
  });

  try {
    const initial = await getDashboardLayoutForUser(userId);
    expect(initial.updatedAt).toBeNull();
    expect(initial.layout.widgets.length).toBeGreaterThan(0);

    const saved = await saveDashboardLayoutForUser(userId, {
      version: 1,
      widgets: [
        {
          id: "repo-storage",
          type: "storage-usage",
          title: "Storage",
          config: { kind: "storage-usage" },
          position: { x: 0, y: 0, w: 4, h: 2 },
        },
      ],
    });
    expect(saved.layout.widgets).toHaveLength(1);
    expect(typeof saved.updatedAt).toBe("string");

    const readBack = await getDashboardLayoutForUser(userId);
    expect(readBack.layout.widgets[0]?.id).toBe("repo-storage");

    const reset = await resetDashboardLayoutForUser(userId);
    expect(reset.updatedAt).toBeNull();
    expect(reset.layout.widgets.length).toBeGreaterThan(1);
  } finally {
    await db.delete(dashboardLayouts).where(eq(dashboardLayouts.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
});

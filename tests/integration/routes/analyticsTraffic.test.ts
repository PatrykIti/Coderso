import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { ApiError } from "../../../core/server/errorHandler";
import { registerAnalyticsRoutes } from "../../../core/server/routes/analyticsRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

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
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const ctx = (query: Record<string, string | undefined>): RouteContext => ({
  params: {},
  query,
  body: undefined,
});

test("registerAnalyticsRoutes wires the traffic endpoints", () => {
  const { router, routes } = makeRouter();
  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });
  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /analytics/traffic/overview",
      "GET /analytics/traffic/top-pages",
      "GET /analytics/traffic/top-pages/export",
    ])
  );
});

test("GET /analytics/traffic/overview requires content:read", () => {
  const { router, routes, permissions } = makeRouter();
  registerAnalyticsRoutes(router, {
    requirePermission: (perm) => {
      permissions.push(perm);
      return async () => undefined;
    },
    validate: () => undefined,
  });
  const route = routes.find((r) => r.path === "/analytics/traffic/overview");
  expect(route).toBeDefined();
  // The permission guard is registered as a handler before the leaf handler.
  expect(permissions).toContain("content:read");
});

test("traffic overview validates the normalized range before service access", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];
  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });
  const handler = routes.find((r) => r.path === "/analytics/traffic/overview")?.handlers.at(-1);
  // A plain Error thrown by validate is mapped by withAnalyticsErrors -> internal_error.
  await expect(handler?.(ctx({ rangeDays: "7" }))).rejects.toBeInstanceOf(ApiError);
  expect(validations[0]?.payload).toEqual({ rangeDays: 7 });
});

test("top-pages rejects unknown query keys (400 additionalProperties)", async () => {
  const { router, routes } = makeRouter();
  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes.find((r) => r.path === "/analytics/traffic/top-pages")?.handlers.at(-1);
  await expect(
    handler?.(ctx({ limit: "5", rangeDays: "30", unexpected: "1" }))
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

test("top-pages export rejects a non-csv format before service access", async () => {
  const { router, routes } = makeRouter();
  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes
    .find((r) => r.path === "/analytics/traffic/top-pages/export")
    ?.handlers.at(-1);
  await expect(
    handler?.(ctx({ limit: "50", rangeDays: "30", format: "json" }))
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

testIfDb("export returns text/csv with path,views,visitors header", async () => {
  const { router, routes } = makeRouter();
  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes
    .find((r) => r.path === "/analytics/traffic/top-pages/export")
    ?.handlers.at(-1);
  const result = (await handler?.(ctx({ limit: "10", rangeDays: "30", format: "csv" }))) as {
    contentType: string;
    content: string;
    fileName: string;
  };
  expect(result.contentType).toBe("text/csv");
  expect(result.content.split("\n")[0]).toBe("path,views,visitors");
  expect(result.fileName).toContain("coderso-traffic-top-pages-30d-");
});

test("service failure maps to analytics_query_failed (500)", async () => {
  const { router, routes } = makeRouter();
  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const handler = routes.find((r) => r.path === "/analytics/traffic/overview")?.handlers.at(-1);
  // Monkey-patch db.select (the repo bun:test type shim does not re-export
  // spyOn) so the service throws analytics_query_failed and withAnalyticsErrors
  // maps it to a 500 ApiError.
  const dbAny = db as unknown as { select: (...args: unknown[]) => unknown };
  const originalSelect = dbAny.select;
  dbAny.select = () => {
    throw new Error("boom");
  };
  try {
    await expect(handler?.(ctx({ rangeDays: "30" }))).rejects.toMatchObject({
      code: "analytics_query_failed",
      status: 500,
    } satisfies Partial<ApiError>);
  } finally {
    dbAny.select = originalSelect;
  }
});

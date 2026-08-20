// TASK-493-04-L02: SEO routes + validation assembly (Bun lane).
//
// Route/validation assembly coverage for the five new SEO routes: registration,
// RBAC gates (`content:read` on the three GETs, `settings:write` on the two
// POSTs), reject-unknown schemas, `limit` coercion in the query schema path,
// and `mapSeoError` mapping for the six new GSC/sitemap domain codes. DB-backed
// response-shape spot checks (zeroed totals on empty data, sitemap status,
// unconfigured-GSC 409s) are gated on migration-0079 table availability and
// run against the provisioned `bun_worker_*` schema. The route module calls
// the services without an injection seam, so response checks stay honest:
// registration/mapping always run; DB flows only when the 0079 tables exist.
import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { ApiError } from "../../../core/server/errorHandler";
import { mapSeoError, registerSeoRoutes } from "../../../core/server/routes/seoRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  seoSearchPerformanceQuerySchema,
  seoSitemapSubmitSchema,
  seoSyncSchema,
} from "../../../core/server/validation/seoSchemas";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasDbAndTables = hasDb && (await hasSeoTables());
const testIfDb = hasDb ? test : test.skip;
const testIfTables = hasDbAndTables ? test : test.skip;

async function canConnect(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function hasSeoTables(): Promise<boolean> {
  try {
    await db.execute(sql`select 1 from seo_search_metrics limit 1`);
    return true;
  } catch {
    return false;
  }
}

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

const FIVE_NEW_PATHS = [
  "GET /seo/overview",
  "GET /seo/search-performance",
  "POST /seo/search-performance/sync",
  "GET /seo/sitemap",
  "POST /seo/sitemap/submit",
];

const handlerOf = (routes: Route[], method: string, path: string): RouteHandler => {
  const route = routes.find((item) => item.method === method && item.path === path);
  const handler = route?.handlers.at(-1);
  if (!handler) throw new Error(`missing_route_${method}_${path}`);
  return handler;
};

test("registerSeoRoutes wires the five SEO search-performance/sitemap endpoints", () => {
  const { router, routes } = makeRouter();

  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(expect.arrayContaining(FIVE_NEW_PATHS));
});

test("registerSeoRoutes requests the expected permission per new route", () => {
  const { router, routes } = makeRouter();
  const permissions: string[] = [];

  registerSeoRoutes(router, {
    requirePermission: (permission) => {
      permissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  // requirePermission is invoked synchronously per registration, in route
  // order, so zip the recorded permissions onto the recorded routes.
  const gates = routes.map(
    (route, index) => `${route.method} ${route.path} -> ${permissions[index]}`
  );
  expect(gates).toEqual(
    expect.arrayContaining([
      "GET /seo/overview -> content:read",
      "GET /seo/search-performance -> content:read",
      "GET /seo/sitemap -> content:read",
      "POST /seo/search-performance/sync -> settings:write",
      "POST /seo/sitemap/submit -> settings:write",
    ])
  );
});

test("mapSeoError maps the six GSC sync + sitemap domain codes", () => {
  const cases: Array<{ message: string; code: string; status: number }> = [
    { message: "gsc_not_configured", code: "gsc_not_configured", status: 409 },
    { message: "gsc_credential_invalid", code: "gsc_credential_invalid", status: 400 },
    { message: "gsc_sync_window_invalid", code: "gsc_sync_window_invalid", status: 400 },
    { message: "sitemap_path_invalid", code: "sitemap_path_invalid", status: 400 },
    { message: "sitemap_submit_failed", code: "sitemap_submit_failed", status: 502 },
  ];
  for (const entry of cases) {
    const mapped = mapSeoError(new Error(entry.message));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped).toMatchObject({ code: entry.code, status: entry.status });
  }

  // `gsc_request_failed:<status>` is matched via startsWith, never an exact
  // match, so every status suffix maps to a 502 with the stable code.
  for (const status of ["429", "500", "403"]) {
    const mapped = mapSeoError(new Error(`gsc_request_failed:${status}`));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped).toMatchObject({ code: "gsc_request_failed", status: 502 });
  }
});

test("all three new schemas reject unknown properties", () => {
  expect(() =>
    validate(seoSearchPerformanceQuerySchema, { targetId: "page:1", bogus: "nope" })
  ).toThrow();
  expect(() => validate(seoSyncSchema, { startDate: "2026-01-01", extra: true })).toThrow();
  expect(() =>
    validate(seoSitemapSubmitSchema, { sitemapPath: "/sitemap.xml", other: 1 })
  ).toThrow();

  try {
    validate(seoSearchPerformanceQuerySchema, { bogus: "nope" });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "validation_error", status: 400 });
  }
});

test("seoSearchPerformanceQuerySchema accepts the documented optional keys", () => {
  expect(() =>
    validate(seoSearchPerformanceQuerySchema, {
      targetId: "page:1",
      startDate: "2026-01-01",
      endDate: "2026-01-28",
      limit: 25,
    })
  ).not.toThrow();
  expect(() => validate(seoSearchPerformanceQuerySchema, {})).not.toThrow();
  expect(() =>
    validate(seoSyncSchema, { startDate: "2026-01-01", endDate: "2026-01-28" })
  ).not.toThrow();
  expect(() => validate(seoSitemapSubmitSchema, { sitemapPath: "/sitemap.xml" })).not.toThrow();
  expect(() => validate(seoSitemapSubmitSchema, {})).not.toThrow();
});

test("search-performance route rejects unknown query keys with validation_error", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = handlerOf(routes, "GET", "/seo/search-performance");
  await expect(handler({ params: {}, query: { bogus: "1" }, body: null })).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  });
});

test("search-performance route maps invalid sync windows through mapSeoError", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = handlerOf(routes, "GET", "/seo/search-performance");
  // A malformed start date passes the string schema but is rejected by the
  // service window clamp before any outbound/DB work: gsc_sync_window_invalid.
  await expect(
    handler({ params: {}, query: { startDate: "not-a-date" }, body: null })
  ).rejects.toMatchObject({ code: "gsc_sync_window_invalid", status: 400 });
});

testIfTables("GET /seo/overview returns zeroed totals on empty data", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const result = await handlerOf(
    routes,
    "GET",
    "/seo/overview"
  )({
    params: {},
    query: {},
    body: null,
  });
  expect(result).toMatchObject({
    indexedPages: 0,
    totalPages: 0,
    notIndexedPages: 0,
    totalImpressions: 0,
    totalClicks: 0,
    averageCtr: 0,
    averagePosition: 0,
    averageScore: 0,
    sitemap: { status: null, urlCount: null, lastSubmittedAt: null },
  });
});

testIfTables("GET /seo/search-performance coerces limit and returns the zeroed shape", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const result = await handlerOf(
    routes,
    "GET",
    "/seo/search-performance"
  )({
    params: {},
    query: { limit: "25" },
    body: null,
  });
  expect(result).toMatchObject({
    range: { startDate: expect.any(String), endDate: expect.any(String) },
    totals: { totalImpressions: 0, totalClicks: 0, averageCtr: 0, averagePosition: 0 },
    series: [],
    topQueries: [],
  });
});

testIfTables("GET /seo/sitemap returns the local submission rows", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const result = await handlerOf(
    routes,
    "GET",
    "/seo/sitemap"
  )({
    params: {},
    query: {},
    body: null,
  });
  expect(Array.isArray(result)).toBe(true);
});

testIfTables("POST /seo/search-performance/sync maps unconfigured GSC to 409", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = handlerOf(routes, "POST", "/seo/search-performance/sync");
  // No GSC credential is provisioned in the test environment, so the sync
  // service rejects with gsc_not_configured before any outbound call.
  await expect(handler({ params: {}, query: {}, body: {} })).rejects.toMatchObject({
    code: "gsc_not_configured",
    status: 409,
  });
});

testIfTables("POST /seo/sitemap/submit maps unconfigured GSC to 409", async () => {
  const { router, routes } = makeRouter();
  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = handlerOf(routes, "POST", "/seo/sitemap/submit");
  await expect(handler({ params: {}, query: {}, body: {} })).rejects.toMatchObject({
    code: "gsc_not_configured",
    status: 409,
  });
});

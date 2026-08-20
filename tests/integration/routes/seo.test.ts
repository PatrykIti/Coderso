// TASK-027 routes wiring test
import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import { mapSeoError, registerSeoRoutes } from "../../../core/server/routes/seoRoutes";
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

test("registerSeoRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /seo",
      "GET /seo/:id",
      "PATCH /seo/:id",
      "POST /seo/audit",
      // TASK-493-04-L02: the search-performance + sitemap surface.
      "GET /seo/overview",
      "GET /seo/search-performance",
      "POST /seo/search-performance/sync",
      "GET /seo/sitemap",
      "POST /seo/sitemap/submit",
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

  // `gsc_request_failed:<status>` is matched via startsWith, so every status
  // suffix maps to the stable 502 code; an unknown domain error stays unmapped.
  for (const status of ["429", "500", "403"]) {
    const mapped = mapSeoError(new Error(`gsc_request_failed:${status}`));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped).toMatchObject({ code: "gsc_request_failed", status: 502 });
  }
  expect(mapSeoError(new Error("seo_unknown"))).toBeNull();
});

test("mapSeoError maps not found to a machine-readable 404", () => {
  const mapped = mapSeoError(new Error("seo_not_found"));

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped?.code).toBe("seo_not_found");
  expect(mapped?.status).toBe(404);
});

test("SEO audit route rejects mismatched target scope before service execution", async () => {
  const { router, routes } = makeRouter();

  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const auditRoute = routes.find((route) => route.method === "POST" && route.path === "/seo/audit");
  const handler = auditRoute?.handlers.at(-1);
  if (!handler) throw new Error("missing_audit_route");

  await expect(
    handler({
      params: {},
      query: {},
      body: { targetType: "page" },
    })
  ).rejects.toMatchObject({
    code: "seo_audit_target_invalid",
    status: 400,
  });
});

test("SEO audit route validation rejects unknown checks", async () => {
  const { router, routes } = makeRouter();

  registerSeoRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const auditRoute = routes.find((route) => route.method === "POST" && route.path === "/seo/audit");
  const handler = auditRoute?.handlers.at(-1);
  if (!handler) throw new Error("missing_audit_route");

  await expect(
    handler({
      params: {},
      query: {},
      body: { checks: ["meta", "performance"] },
    })
  ).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  });
});

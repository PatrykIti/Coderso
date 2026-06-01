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
    expect.arrayContaining(["GET /seo", "GET /seo/:id", "PATCH /seo/:id", "POST /seo/audit"])
  );
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

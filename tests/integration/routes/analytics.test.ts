import { expect, test } from "bun:test";
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
  return {
    routes,
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

test("registerAnalyticsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /analytics/overview",
      "GET /analytics/top-content",
      "GET /analytics/top-content/export",
    ])
  );
});

test("top content route validates normalized range query before service access", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  const route = routes.find((item) => item.path === "/analytics/top-content");
  const handler = route?.handlers.at(-1);
  await expect(
    handler?.({
      params: {},
      query: { limit: "5", rangeDays: "7", type: "page" },
      body: undefined,
    })
  ).rejects.toThrow("validation_stop");

  expect(validations[0]?.payload).toEqual({ limit: 5, rangeDays: 7, type: "page" });
});

test("analytics routes reject unknown query parameters", async () => {
  const { router, routes } = makeRouter();

  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = routes.find((item) => item.path === "/analytics/top-content");
  const handler = route?.handlers.at(-1);

  await expect(
    handler?.({
      params: {},
      query: { limit: "5", rangeDays: "30", unexpected: "1" },
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

test("analytics export route validates format before service access", async () => {
  const { router, routes } = makeRouter();

  registerAnalyticsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = routes.find((item) => item.path === "/analytics/top-content/export");
  const handler = route?.handlers.at(-1);

  await expect(
    handler?.({
      params: {},
      query: { limit: "50", rangeDays: "30", format: "json" },
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

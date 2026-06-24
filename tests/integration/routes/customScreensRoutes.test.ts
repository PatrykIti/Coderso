import { expect, test } from "bun:test";

import {
  mapCustomScreenError,
  registerCustomScreenRoutes,
} from "../../../core/server/routes/customScreenRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
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

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

const runRoute = async (route: Route, ctx: Partial<RouteContext>) => {
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      params: {},
      query: {},
      body: undefined,
      ...ctx,
    });
    if (output !== undefined) result = output;
  }
  return result;
};

test("registerCustomScreenRoutes wires custom screen endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerCustomScreenRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /custom-screens",
      "GET /custom-screens/:id",
      "POST /custom-screens",
      "PATCH /custom-screens/:id",
      "DELETE /custom-screens/:id",
      "GET /custom-screens/:screenId/entries/:entryId/overrides",
      "PATCH /custom-screens/:screenId/entries/:entryId/overrides",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
  ]);
});

test("mapCustomScreenError maps domain errors to API errors", () => {
  expect(mapCustomScreenError(new Error("custom_screen_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_status_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_definition_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_legacy_write_unsupported"))?.status).toBe(
    400
  );
  expect(mapCustomScreenError(new Error("custom_screen_override_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_override_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_override_conflict"))?.status).toBe(409);
  expect(mapCustomScreenError(new Error("other_error"))).toBeNull();
});

test("PATCH custom screen entry overrides rejects unknown envelope keys before service work", async () => {
  const { router, routes } = makeRouter();

  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = findRoute(routes, "PATCH", "/custom-screens/:screenId/entries/:entryId/overrides");

  await expect(
    runRoute(route, {
      params: { screenId: "screen-1", entryId: "entry-1" },
      body: { overrides: [], extra: true },
      user: { id: "44444444-4444-4444-8444-444444444444" },
    })
  ).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  });
});

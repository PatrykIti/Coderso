import { expect, test } from "bun:test";

import {
  mapCustomScreenError,
  registerCustomScreenRoutes,
} from "../../../core/server/routes/customScreenRoutes";

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
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:write",
    "content:write",
  ]);
});

test("mapCustomScreenError maps domain errors to API errors", () => {
  expect(mapCustomScreenError(new Error("custom_screen_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_status_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_definition_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("other_error"))).toBeNull();
});

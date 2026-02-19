import { expect, test } from "bun:test";

import {
  mapPopupError,
  registerPopupsRoutes,
} from "../../../core/server/routes/popupsRoutes";

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

test("registerPopupsRoutes wires popup endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerPopupsRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /popups",
      "GET /popups/:id",
      "POST /popups",
      "PATCH /popups/:id",
      "PATCH /popups/:id/status",
      "DELETE /popups/:id",
    ])
  );
  expect(requestedPermissions).toEqual([
    "popups:read",
    "popups:read",
    "popups:write",
    "popups:write",
    "popups:write",
    "popups:write",
  ]);
});

test("mapPopupError maps domain errors to API errors", () => {
  const notFound = mapPopupError(new Error("popup_not_found"));
  const invalid = mapPopupError(new Error("popup_trigger_invalid"));
  const unknown = mapPopupError(new Error("some_other_error"));

  expect(notFound?.status).toBe(404);
  expect(invalid?.status).toBe(400);
  expect(unknown).toBeNull();
});

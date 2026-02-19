import { expect, test } from "bun:test";

import {
  mapSolutionKitError,
  registerSolutionKitsRoutes,
} from "../../../core/server/routes/solutionKitsRoutes";

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
    },
  };
};

test("registerSolutionKitsRoutes wires solution kits endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerSolutionKitsRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /solution-kits",
      "GET /solution-kits/:id",
      "POST /solution-kits/plan",
    ])
  );
  expect(requestedPermissions).toEqual([
    "solution-kits:read",
    "solution-kits:read",
    "solution-kits:read",
  ]);
});

test("mapSolutionKitError maps domain errors", () => {
  const notFound = mapSolutionKitError(new Error("solution_kit_not_found"));
  const invalid = mapSolutionKitError(new Error("solution_kit_payload_invalid"));
  const unknown = mapSolutionKitError(new Error("other_error"));

  expect(notFound?.status).toBe(404);
  expect(invalid?.status).toBe(400);
  expect(unknown).toBeNull();
});

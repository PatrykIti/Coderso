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
      "GET /solution-kits/runs",
      "GET /solution-kits/runs/:runId",
      "GET /solution-kits/:id",
      "POST /solution-kits/plan",
      "POST /solution-kits/:id/apply",
      "POST /solution-kits/:id/rollback",
    ])
  );
  expect(paths.indexOf("GET /solution-kits/runs")).toBeLessThan(
    paths.indexOf("GET /solution-kits/:id")
  );
  expect(requestedPermissions).toEqual([
    "solution-kits:read",
    "solution-kits:read",
    "solution-kits:read",
    "solution-kits:read",
    "solution-kits:read",
    "solution-kits:write",
    "solution-kits:write",
  ]);
});

test("mapSolutionKitError maps domain errors", () => {
  const notFound = mapSolutionKitError(new Error("solution_kit_not_found"));
  const runNotFound = mapSolutionKitError(new Error("solution_kit_install_run_not_found"));
  const rollbackSourceNotFound = mapSolutionKitError(
    new Error("solution_kit_rollback_source_not_found")
  );
  const rollbackInvalidSource = mapSolutionKitError(
    new Error("solution_kit_rollback_invalid_source")
  );
  const invalid = mapSolutionKitError(new Error("solution_kit_payload_invalid"));
  const unknown = mapSolutionKitError(new Error("other_error"));

  expect(notFound?.status).toBe(404);
  expect(runNotFound?.status).toBe(404);
  expect(rollbackSourceNotFound?.status).toBe(404);
  expect(rollbackInvalidSource?.status).toBe(409);
  expect(invalid?.status).toBe(400);
  expect(unknown).toBeNull();
});

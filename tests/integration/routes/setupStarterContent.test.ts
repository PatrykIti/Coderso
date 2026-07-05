// TASK-482-06-L02: route-registration + error-mapping test for the internal
// starter-content endpoints. Bun lane (route + kit lifecycle). This suite never
// runs a real install (precedent: solutionKitsRoutes.test.ts) — it asserts the
// endpoints are wired with the correct RBAC guards and that domain errors map
// correctly at the boundary.

import { expect, test } from "bun:test";

import {
  mapSetupRouteError,
  registerSetupRoutes,
  toChoice,
} from "../../../core/server/routes/setupRoutes";
import { ApiError } from "../../../core/server/errorHandler";

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
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
    },
  };
};

test("registerSetupRoutes wires the starter-content endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerSetupRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual([
    "POST /setup/starter-content/preview",
    "POST /setup/starter-content/apply",
  ]);

  // Preview: solution-kits:write only. Apply: solution-kits:write + settings:write.
  expect(requestedPermissions).toEqual([
    "solution-kits:write",
    "solution-kits:write",
    "settings:write",
  ]);
});

test("mapSetupRouteError maps domain errors and passes ApiError through", () => {
  const unknownKit = mapSetupRouteError(new Error("starter_kit_unknown"));
  expect(unknownKit.code).toBe("starter_kit_unknown");
  expect(unknownKit.status).toBe(400);

  const badChoice = mapSetupRouteError(new Error("starter_choice_invalid"));
  expect(badChoice.code).toBe("starter_choice_invalid");
  expect(badChoice.status).toBe(400);

  const generic = mapSetupRouteError(new Error("boom"));
  expect(generic.code).toBe("setup_error");
  expect(generic.status).toBe(500);

  const passthrough = new ApiError("validation_error", "Invalid payload", 400);
  expect(mapSetupRouteError(passthrough)).toBe(passthrough);
});

test("toChoice enforces exactly one selector", () => {
  expect(toChoice({ kitId: "local-service-business" })).toEqual({
    kitId: "local-service-business",
  });
  expect(toChoice({ blueprintKey: "default" })).toEqual({ blueprintKey: "default" });

  expect(() => toChoice({ kitId: "a", blueprintKey: "default" })).toThrow("starter_choice_invalid");
  expect(() => toChoice({})).toThrow("starter_choice_invalid");
  expect(() => toChoice(undefined)).toThrow("starter_choice_invalid");
});

// TASK-482-06-L02: Bun security test for the internal starter-content endpoints.
// A NEW, additive security file (never modifies codersoSecurityGate.test.ts).
// Asserts the RBAC contract (apply requires BOTH solution-kits:write AND
// settings:write; preview requires solution-kits:write and NOT settings:write),
// fail-closed guard ordering, and blueprint-injection rejection via the strict
// schema.

import { expect, test } from "bun:test";

import { registerSetupRoutes } from "../../core/server/routes/setupRoutes";
import { starterContentSchema } from "../../core/server/validation/setupSchemas";
import { validate } from "../../core/server/validation/schemaValidator";
import { ApiError } from "../../core/server/errorHandler";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

// Build a router whose requirePermission produces guards that FAIL CLOSED (throw
// 403) for any permission in `denied`, so we can prove which permissions each
// endpoint truly requires.
const registerWithDenied = (denied: Set<string>) => {
  const routes: Route[] = [];
  const router = {
    post: (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method: "POST", path, handlers }),
  };
  registerSetupRoutes(router, {
    requirePermission: (permission) => async () => {
      if (denied.has(permission)) {
        throw new ApiError("forbidden", "Forbidden", 403);
      }
    },
    validate: () => undefined,
  });
  const byPath = (path: string) => routes.find((route) => route.path === path)!;
  return { routes, byPath };
};

const ctx: RouteContext = { params: {}, query: {}, body: {}, user: { id: "admin-1" } };

// Run only the guard middleware (all handlers except the final route handler),
// mirroring how the router chains guards before the handler.
const runGuards = async (route: Route) => {
  for (const handler of route.handlers.slice(0, -1)) {
    await handler(ctx);
  }
};

test("apply requires BOTH solution-kits:write and settings:write", async () => {
  // Missing settings:write → rejected (proves settings:write is required).
  {
    const { byPath } = registerWithDenied(new Set(["settings:write"]));
    await expect(runGuards(byPath("/setup/starter-content/apply"))).rejects.toMatchObject({
      status: 403,
    });
  }

  // Missing solution-kits:write → rejected.
  {
    const { byPath } = registerWithDenied(new Set(["solution-kits:write"]));
    await expect(runGuards(byPath("/setup/starter-content/apply"))).rejects.toMatchObject({
      status: 403,
    });
  }

  // Both granted → guards pass.
  {
    const { byPath } = registerWithDenied(new Set());
    await expect(runGuards(byPath("/setup/starter-content/apply"))).resolves.toBeUndefined();
  }
});

test("preview requires solution-kits:write and NOT settings:write", async () => {
  // Denying settings:write must not block preview (it doesn't mutate site.*).
  {
    const { byPath } = registerWithDenied(new Set(["settings:write"]));
    await expect(runGuards(byPath("/setup/starter-content/preview"))).resolves.toBeUndefined();
  }

  // Denying solution-kits:write blocks preview (dry-run persists run/items/audit).
  {
    const { byPath } = registerWithDenied(new Set(["solution-kits:write"]));
    await expect(runGuards(byPath("/setup/starter-content/preview"))).rejects.toMatchObject({
      status: 403,
    });
  }
});

test("strict schema rejects a blueprint-shaped body (anti-injection)", () => {
  // A SolutionKitDefinition-shaped body must be rejected by additionalProperties:false.
  expect(() =>
    validate(starterContentSchema, {
      kitId: "local-service-business",
      resourceBlueprint: { pages: [{ slug: "evil", title: "Evil" }] },
    })
  ).toThrow(ApiError);

  expect(() => validate(starterContentSchema, { id: "custom", pages: [] })).toThrow(ApiError);

  // A plain id-only body is accepted by the schema.
  expect(() => validate(starterContentSchema, { kitId: "local-service-business" })).not.toThrow();
  expect(() => validate(starterContentSchema, { blueprintKey: "default" })).not.toThrow();
});

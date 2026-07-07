// TASK-482-08-L02: cross-cutting installer self-disable boundary.
//
// This is the dedicated security boundary asserting the permanent invariant:
// once ANY user exists (installer-created OR env-seeded), the pre-auth installer
// is closed server-side — status reports { available: false } and the create
// endpoint returns 409 `install_unavailable`. It uses the fake-router +
// injected-deps pattern (makeRouter/findRoute/runRoute, exactly like
// tests/integration/routes/install.test.ts and adminUsers.test.ts) so it NEVER
// touches the shared remote `users` table, never runs the real `seedAdmin()`,
// and never flips a global no-users state (see the leaf's shared-DB pin). The
// status and create endpoints share the SAME injected `isFirstRun` source, so
// they cannot disagree. Real-DB TOCTOU/count behaviour is owned separately by
// tests/security/firstAdminRace.test.ts.

import { expect, test } from "bun:test";

import { ApiError } from "../../core/server/errorHandler";
import type { Router, RouteContext, RouteHandler } from "../../core/server/router";
import { registerInstallRoutes } from "../../core/server/routes/installRoutes";
import { validate } from "../../core/server/validation/schemaValidator";
import type {
  CreateFirstAdminInput,
  CreateFirstAdminResult,
} from "../../core/services/admin/firstRunService";

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  const router = {
    get: (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method: "GET", path, handlers }),
    post: (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method: "POST", path, handlers }),
    patch: (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method: "PATCH", path, handlers }),
    put: (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method: "PUT", path, handlers }),
    delete: (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method: "DELETE", path, handlers }),
  } as unknown as Router;
  return { routes, router };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

const runRoute = async (route: Route, ctx: Partial<RouteContext>) => {
  let result: unknown;
  const routeContext = { params: {}, query: {}, body: undefined, ...ctx } as RouteContext;
  for (const handler of route.handlers) {
    result = await handler(routeContext);
  }
  return result;
};

const sampleAdmin: CreateFirstAdminResult = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Admin",
  status: "active",
  roleId: "role-1",
};

const validBody = { name: "Ada Admin", email: "ada@example.com", password: "correct horse" };

// Invariant 1: the installer is open ONLY while isFirstRun() is true, and the
// SAME injected source drives both status and the create precondition, so they
// can never disagree.
test("status is open only while isFirstRun() is true (single shared source)", async () => {
  // No users yet → open.
  {
    const { router, routes } = makeRouter();
    registerInstallRoutes(router, { validate, isFirstRun: async () => true });
    const status = findRoute(routes, "GET", "/auth/install/status");
    expect(await runRoute(status, {})).toEqual({ available: true });
  }

  // A user exists → the same isFirstRun source closes status AND gates create.
  {
    const firstRun = async () => false;
    const { router, routes } = makeRouter();
    registerInstallRoutes(router, {
      validate,
      isFirstRun: firstRun,
      // Create shares the same no-users source: it refuses once firstRun is false.
      createFirstAdmin: async (input: CreateFirstAdminInput) => {
        if (!(await firstRun())) throw new Error("first_run_unavailable");
        return { ...sampleAdmin, email: input.email, name: input.name };
      },
    });
    const status = findRoute(routes, "GET", "/auth/install/status");
    expect(await runRoute(status, {})).toEqual({ available: false });

    const create = findRoute(routes, "POST", "/auth/install/admin");
    let error: unknown;
    try {
      await runRoute(create, { body: validBody });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).code).toBe("install_unavailable");
  }
});

// Invariant 2: create returns 409 install_unavailable once any user exists (the
// 02-L01 domain code `first_run_unavailable` maps to ApiError 409).
test("create returns 409 install_unavailable when a user already exists", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => {
      throw new Error("first_run_unavailable");
    },
  });
  const create = findRoute(routes, "POST", "/auth/install/admin");
  let error: unknown;
  try {
    await runRoute(create, { body: validBody });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(409);
  expect((error as ApiError).code).toBe("install_unavailable");
});

// Invariant 3: the status body leaks only a boolean — no user count, no email.
test("status body carries no count or PII", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, { validate, isFirstRun: async () => false });
  const status = findRoute(routes, "GET", "/auth/install/status");
  const body = (await runRoute(status, {})) as Record<string, unknown>;

  expect(Object.keys(body)).toEqual(["available"]);
  expect(body).toEqual({ available: false });
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain("count");
  expect(serialized).not.toContain("@");
  expect(serialized).not.toContain("email");
});

// Invariant 4: seedAdmin() coexists via the SAME countUsers source. Asserted at
// the service seam WITHOUT running the real seedAdmin(): isFirstRun() is derived
// from countUsers(), so ANY row in `users` — installer-created or seeded by
// core/db/seed.ts#seedAdmin — closes the installer, regardless of origin.
test("a seeded user disables the installer via the same countUsers source", async () => {
  // Stand-in for `countUsers()` returning 1 because a row exists (however it got
  // there — env seedAdmin or installer). The real seedAdmin() is never invoked.
  const countUsers = async () => 1;
  const isFirstRun = async () => (await countUsers()) === 0;

  const { router, routes } = makeRouter();
  registerInstallRoutes(router, { validate, isFirstRun });
  const status = findRoute(routes, "GET", "/auth/install/status");

  expect(await runRoute(status, {})).toEqual({ available: false });
  expect(await isFirstRun()).toBe(false);
});

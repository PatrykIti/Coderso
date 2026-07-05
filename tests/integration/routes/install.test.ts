import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import type { Router, RouteContext, RouteHandler } from "../../../core/server/router";
import { registerInstallRoutes } from "../../../core/server/routes/installRoutes";
import { checkRateLimit, resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { resolveRateLimitBucket } from "../../../core/server/httpServer";
import { validate } from "../../../core/server/validation/schemaValidator";
import type { CreateFirstAdminResult } from "../../../core/services/admin/firstRunService";
import type { AuditEvent, AuditRecord } from "../../../core/services/audit/auditService";

const captureAudit =
  (sink: unknown[]) =>
  async (event: AuditEvent): Promise<AuditRecord> => {
    sink.push(event);
    return {
      id: "audit-1",
      actorId: event.actorId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ?? {},
      createdAt: new Date(),
    };
  };

const sampleAdmin: CreateFirstAdminResult = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Admin",
  status: "active",
  roleId: "role-1",
};

const validBody = { name: "Ada Admin", email: "ada@example.com", password: "correct horse" };

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  // `registerInstallRoutes` takes the canonical `Router` from core/server/router
  // (production wires the real `createRouter()` output); this fake only needs the
  // `.get` recorder, so satisfy the type with a single cast.
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
  const routeContext = {
    params: {},
    query: {},
    body: undefined,
    ...ctx,
  } as RouteContext;
  for (const handler of route.handlers) {
    result = await handler(routeContext);
  }
  return result;
};

test("registerInstallRoutes wires the public status endpoint", () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, { validate: () => undefined });
  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(expect.arrayContaining(["GET /auth/install/status"]));
});

test("status reports available:true when isFirstRun stub resolves true", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate: () => undefined,
    isFirstRun: async () => true,
  });
  const route = findRoute(routes, "GET", "/auth/install/status");
  const result = await runRoute(route, {});
  expect(result).toEqual({ available: true });
});

test("status reports available:false when a user exists (stub false)", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate: () => undefined,
    isFirstRun: async () => false,
  });
  const route = findRoute(routes, "GET", "/auth/install/status");
  const result = await runRoute(route, {});
  expect(result).toEqual({ available: false });
});

test("status self-disables across calls when isFirstRun flips true -> false", async () => {
  let firstRun = true;
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate: () => undefined,
    isFirstRun: async () => firstRun,
  });
  const route = findRoute(routes, "GET", "/auth/install/status");
  expect(await runRoute(route, {})).toEqual({ available: true });
  firstRun = false; // an admin is created elsewhere
  expect(await runRoute(route, {})).toEqual({ available: false });
});

test("status is reachable without a session/user on the route context", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate: () => undefined,
    isFirstRun: async () => true,
  });
  const route = findRoute(routes, "GET", "/auth/install/status");
  // no `user`, no `sessionId`, no cookies — pre-login installer surface
  const result = await runRoute(route, { user: undefined, sessionId: undefined });
  expect(result).toEqual({ available: true });
});

test("status rejects unknown query params with 400 install_query_invalid", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate: () => undefined,
    isFirstRun: async () => true,
  });
  const route = findRoute(routes, "GET", "/auth/install/status");
  let error: unknown;
  try {
    await runRoute(route, { query: { x: "1" } });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(400);
  expect((error as ApiError).code).toBe("install_query_invalid");
});

test("status re-throws unexpected non-ApiError failures unchanged", async () => {
  const { router, routes } = makeRouter();
  const boom = new Error("db unavailable");
  registerInstallRoutes(router, {
    validate: () => undefined,
    isFirstRun: async () => {
      throw boom;
    },
  });
  const route = findRoute(routes, "GET", "/auth/install/status");
  let error: unknown;
  try {
    await runRoute(route, {});
  } catch (caught) {
    error = caught;
  }
  expect(error).toBe(boom);
});

// Rate-limit contract (unit lane): bucket selection lives in the httpServer
// pipeline, not the route module, so we assert the path prefix maps to the
// `auth` bucket and that the `auth` bucket throttles a burst.
test("/auth/install/status maps to the auth rate-limit bucket", () => {
  // Assert the REAL production bucket selection, not a bare string prefix check,
  // so a regression in httpServer's bucket routing fails this test.
  expect(resolveRateLimitBucket("GET", "/auth/install/status")).toBe("auth");
  expect(resolveRateLimitBucket("POST", "/auth/install/admin")).toBe("auth");
});

test("the auth bucket throttles a burst beyond its threshold", () => {
  resetRateLimitBuckets();
  const config = {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 5, maxRequests: 1 },
      admin_read: { windowSeconds: 10, maxRequests: 2 },
      admin_write: { windowSeconds: 10, maxRequests: 2 },
      public_read: { windowSeconds: 10, maxRequests: 5 },
      public_write: { windowSeconds: 10, maxRequests: 2 },
      assistant: { windowSeconds: 5, maxRequests: 1 },
    },
  };
  checkRateLimit("auth", { ip: "203.0.113.7" }, config);
  expect(() => checkRateLimit("auth", { ip: "203.0.113.7" }, config)).toThrow("Too many requests");
});

// ---------------------------------------------------------------------------
// POST /auth/install/admin (TASK-482-02-L02) — in-process router, injected
// deps. NEVER touches the shared users table.
// ---------------------------------------------------------------------------

test("registerInstallRoutes wires the public admin-create endpoint", () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, { validate: () => undefined });
  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(expect.arrayContaining(["POST /auth/install/admin"]));
});

test("POST create succeeds returns { ok, user } with no secrets and audits creation", async () => {
  const auditCalls: unknown[] = [];
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => sampleAdmin,
    logAudit: captureAudit(auditCalls),
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  const result = (await runRoute(route, {
    body: validBody,
    ip: "203.0.113.9",
    userAgent: "installer",
  })) as { ok: boolean; user: Record<string, unknown> };

  expect(result.ok).toBe(true);
  expect(result.user).toEqual({ id: "user-1", email: "ada@example.com", name: "Ada Admin" });
  // no secrets leaked in the response shape
  expect(JSON.stringify(result)).not.toContain("password");
  expect(result.user).not.toHaveProperty("passwordHash");
  expect(result.user).not.toHaveProperty("roleId");
  // audit emitted with the canonical action + redaction-seam email metadata
  expect(auditCalls).toHaveLength(1);
  expect(auditCalls[0]).toMatchObject({
    action: "auth.install.admin.created",
    actorId: "user-1",
    targetType: "user",
    targetId: "user-1",
    metadata: { email: "ada@example.com" },
  });
});

test("POST returns 409 install_unavailable when the service reports first_run_unavailable", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => {
      throw new Error("first_run_unavailable");
    },
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  let error: unknown;
  try {
    await runRoute(route, { body: validBody });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(409);
  expect((error as ApiError).code).toBe("install_unavailable");
});

test("POST rejects a weak/short password with 400 validation_error before creating", async () => {
  let created = false;
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => {
      created = true;
      return sampleAdmin;
    },
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  let error: unknown;
  try {
    await runRoute(route, { body: { ...validBody, password: "short" } });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(400);
  expect(created).toBe(false);
});

test("POST rejects unknown body keys with 400 (strict schema)", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => sampleAdmin,
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  let error: unknown;
  try {
    await runRoute(route, { body: { ...validBody, role: "superadmin" } });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(400);
});

test("POST re-throws unexpected non-domain errors unchanged (real 500, never throw null)", async () => {
  const boom = new Error("db exploded");
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => {
      throw boom;
    },
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  let error: unknown;
  try {
    await runRoute(route, { body: validBody });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBe(boom);
});

import { expect, test } from "bun:test";

import { ApiError } from "../../core/server/errorHandler";
import type { Router, RouteContext, RouteHandler } from "../../core/server/router";
import { registerInstallRoutes } from "../../core/server/routes/installRoutes";
import { validate } from "../../core/server/validation/schemaValidator";
import { enforceCsrf } from "../../core/server/middleware/csrf";
import { checkRateLimit, resetRateLimitBuckets } from "../../core/server/middleware/rateLimit";
import { resolveRateLimitBucket, resolveRateLimitIdentifier } from "../../core/server/httpServer";
import type { CreateFirstAdminResult } from "../../core/services/admin/firstRunService";
import type { AuditEvent, AuditRecord } from "../../core/services/audit/auditService";

const captureAudit =
  (sink: AuditEvent[]) =>
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

// ---------------------------------------------------------------------------
// In-process router harness (matching install.test.ts). Injected deps only —
// the shared remote users table is NEVER touched.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fail-closed gate + audit trail.
// ---------------------------------------------------------------------------

test("post-install create is fail-closed: 409 install_unavailable + auth.install.blocked audit", async () => {
  const auditCalls: AuditEvent[] = [];
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    // simulate a real, post-install DB state via the injected create seam
    createFirstAdmin: async () => {
      throw new Error("first_run_unavailable");
    },
    logAudit: captureAudit(auditCalls),
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");

  let error: unknown;
  try {
    await runRoute(route, { body: validBody, ip: "203.0.113.5", userAgent: "ua" });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(409);
  expect((error as ApiError).code).toBe("install_unavailable");
  // the blocked attempt is recorded, with no actor (no session existed)
  expect(auditCalls).toHaveLength(1);
  expect(auditCalls[0]).toMatchObject({ action: "auth.install.blocked", actorId: null });
});

test("successful create emits auth.install.admin.created and never logs the password", async () => {
  const auditCalls: AuditEvent[] = [];
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, {
    validate,
    createFirstAdmin: async () => sampleAdmin,
    logAudit: captureAudit(auditCalls),
  });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  const result = await runRoute(route, { body: validBody });

  expect(auditCalls).toHaveLength(1);
  expect(auditCalls[0]).toMatchObject({ action: "auth.install.admin.created" });
  // password never appears in the audit payload or the response
  expect(JSON.stringify(auditCalls[0])).not.toContain(validBody.password);
  expect(JSON.stringify(result)).not.toContain(validBody.password);
});

test("strict schema rejects extra keys with 400 (no privilege-escalation fields)", async () => {
  const { router, routes } = makeRouter();
  registerInstallRoutes(router, { validate, createFirstAdmin: async () => sampleAdmin });
  const route = findRoute(routes, "POST", "/auth/install/admin");
  let error: unknown;
  try {
    await runRoute(route, { body: { ...validBody, permissions: ["*"] } });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(400);
});

// ---------------------------------------------------------------------------
// CSRF — exempt by absence (no session ⇒ csrf.ts skips). Assert the contract,
// no code/path exemption is added.
// ---------------------------------------------------------------------------

const csrfConfig = { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 60 };

test("session-less install POST is accepted without a CSRF token (absence-based skip)", async () => {
  const req = new Request("http://coderso.test/auth/install/admin", { method: "POST" });
  const ctx = { params: {}, query: {}, body: validBody } as RouteContext; // no sessionId
  await expect(enforceCsrf(req, ctx, csrfConfig)).resolves.toBeUndefined();
});

test("a session-bound write still requires a CSRF token", async () => {
  const req = new Request("http://coderso.test/admin/api/pages", { method: "POST" });
  const ctx = { params: {}, query: {}, body: {}, sessionId: "sess-1" } as RouteContext;
  await expect(enforceCsrf(req, ctx, csrfConfig)).rejects.toBeInstanceOf(ApiError);
});

// ---------------------------------------------------------------------------
// Rate-limit — the install route must land in the `auth` bucket, and its
// identifier must NOT key off the body email (httpServer excludes /auth/install)
// so rotating emails cannot buy fresh windows. These assertions call the REAL
// exported production helpers, so reverting the /auth/install guard fails here.
// ---------------------------------------------------------------------------

const deriveAuthIdentifier = (pathname: string, body: unknown): string | undefined =>
  resolveRateLimitIdentifier("POST", pathname, body);

test("install route lands in the auth rate-limit bucket", () => {
  expect(resolveRateLimitBucket("POST", "/auth/install/admin")).toBe("auth");
  expect(resolveRateLimitBucket("GET", "/auth/install/status")).toBe("auth");
  // contrast: a normal auth route is also the auth bucket
  expect(resolveRateLimitBucket("POST", "/auth/login")).toBe("auth");
});

test("install identifier ignores body email, unlike other /auth routes", () => {
  expect(deriveAuthIdentifier("/auth/install/admin", { email: "a@x.com" })).toBeUndefined();
  expect(deriveAuthIdentifier("/auth/install/admin", { email: "b@x.com" })).toBeUndefined();
  // contrast: a normal auth route keys off the email
  expect(deriveAuthIdentifier("/auth/login", { email: "a@x.com" })).toBe("a@x.com");
});

const burstConfig = {
  enabled: true,
  buckets: {
    auth: { windowSeconds: 60, maxRequests: 3 },
    admin_read: { windowSeconds: 10, maxRequests: 2 },
    admin_write: { windowSeconds: 10, maxRequests: 2 },
    public_read: { windowSeconds: 10, maxRequests: 5 },
    public_write: { windowSeconds: 10, maxRequests: 2 },
    assistant: { windowSeconds: 5, maxRequests: 1 },
  },
};

test("install burst throttles with a FIXED email (auth bucket)", () => {
  resetRateLimitBuckets();
  const ip = "203.0.113.20";
  const ua = "installer";
  const identifier = deriveAuthIdentifier("/auth/install/admin", { email: "same@x.com" });
  for (let i = 0; i < 3; i += 1) {
    checkRateLimit("auth", { ip, userAgent: ua, identifier }, burstConfig);
  }
  expect(() => checkRateLimit("auth", { ip, userAgent: ua, identifier }, burstConfig)).toThrow(
    "Too many requests"
  );
});

test("install burst throttles with ROTATING emails (email cannot buy fresh windows)", () => {
  resetRateLimitBuckets();
  const ip = "203.0.113.21";
  const ua = "installer";
  for (let i = 0; i < 3; i += 1) {
    const identifier = deriveAuthIdentifier("/auth/install/admin", { email: `attacker${i}@x.com` });
    checkRateLimit("auth", { ip, userAgent: ua, identifier }, burstConfig);
  }
  const identifier = deriveAuthIdentifier("/auth/install/admin", { email: "attacker-final@x.com" });
  expect(() => checkRateLimit("auth", { ip, userAgent: ua, identifier }, burstConfig)).toThrow(
    "Too many requests"
  );
});

import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import type { RouteContext, RouteHandler } from "../../../core/server/router";
import { registerAdminUsersRoutes } from "../../../core/server/routes/adminUsersRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import type { UserRecord } from "../../../core/services/admin/usersService";
import type { AuditEvent, AuditRecord } from "../../../core/services/audit/auditService";

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
      put: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PUT", path, handlers }),
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

const makeAuditRecord = (event: AuditEvent): AuditRecord => ({
  id: `audit-${event.action}`,
  actorId: event.actorId ?? null,
  action: event.action,
  targetType: event.targetType,
  targetId: event.targetId,
  metadata: event.metadata ?? {},
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
});

const makeUserRecord = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: "user-1",
  email: "user@example.com",
  emailHash: null,
  emailEncrypted: null,
  passwordHash: "hash",
  name: "User",
  status: "active",
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
  updatedAt: new Date("2026-06-01T10:00:00.000Z"),
  lastLoginAt: null,
  ...overrides,
});

test("registerAdminUsersRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAdminUsersRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /admin-users",
      "POST /admin-users",
      "POST /admin-users/invite",
      "PATCH /admin-users/:id",
      "POST /admin-users/:id/disable",
      "POST /admin-users/:id/enable",
      "PUT /admin-users/:id/roles",
      "DELETE /admin-users/:id",
      "POST /admin-users/:id/password-reset",
    ])
  );
});

test("admin user create and update reject password fields", async () => {
  const { router, routes } = makeRouter();

  registerAdminUsersRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    createUser: async () => {
      throw new Error("should_not_create");
    },
    updateUser: async () => {
      throw new Error("should_not_update");
    },
  });

  for (const [method, path, body] of [
    [
      "POST",
      "/admin-users",
      { name: "User", email: "user@example.com", roleIds: [], password: "secret123" },
    ],
    ["PATCH", "/admin-users/:id", { password: "secret123" }],
  ] as const) {
    try {
      await runRoute(findRoute(routes, method, path), {
        params: { id: "user-1" },
        body,
      });
      throw new Error("Expected validation rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("validation_error");
    }
  }
});

test("admin invite sends set-password delivery and audits without token metadata", async () => {
  const { router, routes } = makeRouter();
  const permissions: string[] = [];
  const auditEvents: unknown[] = [];

  registerAdminUsersRoutes(router, {
    requirePermission: (permission) => async () => {
      permissions.push(permission);
    },
    validate,
    inviteUserWithSetPassword: async () => ({
      user: {
        id: "user-1",
        name: "Invited",
        email: "invite@example.com",
        status: "pending",
        roleIds: ["role-1"],
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        updatedAt: new Date("2026-06-01T10:00:00.000Z"),
        lastLoginAt: null,
      },
      setPassword: {
        delivery: "email",
        status: "sent",
        expiresAt: new Date("2026-06-01T11:00:00.000Z"),
      },
    }),
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  const result = await runRoute(findRoute(routes, "POST", "/admin-users/invite"), {
    user: { id: "admin-1" },
    body: {
      name: "Invited",
      email: "invite@example.com",
      roleIds: ["role-1"],
      sendSetPasswordInvite: true,
    },
  });

  expect(permissions).toEqual(["users:write"]);
  expect(result).toEqual(
    expect.objectContaining({
      user: expect.objectContaining({ id: "user-1" }),
      setPassword: expect.objectContaining({ delivery: "email", status: "sent" }),
    })
  );
  expect(JSON.stringify(result)).not.toContain("token");
  expect(JSON.stringify(auditEvents)).not.toContain("token");
  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.user.invite",
      targetId: "user-1",
    }),
  ]);
});

test("admin password reset validates delivery, maps email errors, and audits", async () => {
  const { router, routes } = makeRouter();
  const auditEvents: unknown[] = [];

  registerAdminUsersRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    requestAdminPasswordReset: async () => ({
      delivery: "email",
      status: "sent",
      expiresAt: new Date("2026-06-01T11:00:00.000Z"),
    }),
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  const result = await runRoute(findRoute(routes, "POST", "/admin-users/:id/password-reset"), {
    params: { id: "user-1" },
    user: { id: "admin-1" },
    body: { delivery: "email" },
  });

  expect(result).toEqual({
    delivery: "email",
    status: "sent",
    expiresAt: new Date("2026-06-01T11:00:00.000Z"),
  });
  expect(JSON.stringify(result)).not.toContain("token");
  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.user.password_reset",
      targetId: "user-1",
    }),
  ]);

  try {
    await runRoute(findRoute(routes, "POST", "/admin-users/:id/password-reset"), {
      params: { id: "user-1" },
      body: { delivery: "manual", token: "leak" },
    });
    throw new Error("Expected validation rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
  }
});

test("admin password reset maps delivery unavailable", async () => {
  const { router, routes } = makeRouter();

  registerAdminUsersRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    requestAdminPasswordReset: async () => {
      throw new Error("email_not_configured");
    },
  });

  try {
    await runRoute(findRoute(routes, "POST", "/admin-users/:id/password-reset"), {
      params: { id: "user-1" },
      body: { delivery: "email" },
    });
    throw new Error("Expected email_not_configured rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("email_not_configured");
    expect((error as ApiError).status).toBe(400);
  }
});

test("admin user lifecycle routes audit destructive actions", async () => {
  const { router, routes } = makeRouter();
  const auditEvents: AuditEvent[] = [];

  registerAdminUsersRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    disableUser: async (id) => makeUserRecord({ id, status: "inactive" }),
    enableUser: async (id) => makeUserRecord({ id, status: "active" }),
    deleteUser: async (id) => makeUserRecord({ id, status: "inactive" }),
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  await runRoute(findRoute(routes, "POST", "/admin-users/:id/disable"), {
    params: { id: "user-1" },
    user: { id: "admin-1" },
  });
  await runRoute(findRoute(routes, "POST", "/admin-users/:id/enable"), {
    params: { id: "user-1" },
    user: { id: "admin-1" },
  });
  await runRoute(findRoute(routes, "DELETE", "/admin-users/:id"), {
    params: { id: "user-1" },
    user: { id: "admin-1" },
  });

  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.user.disable",
      targetId: "user-1",
      metadata: { status: "inactive" },
    }),
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.user.enable",
      targetId: "user-1",
      metadata: { status: "active" },
    }),
    expect.objectContaining({
      actorId: "admin-1",
      action: "admin.user.delete",
      targetId: "user-1",
      metadata: { status: "inactive" },
    }),
  ]);
});

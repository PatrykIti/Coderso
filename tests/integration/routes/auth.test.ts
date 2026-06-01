import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import type { RouteContext, RouteHandler } from "../../../core/server/router";
import { registerAuthRoutes } from "../../../core/server/routes/authRoutes";
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
      patch: () => undefined,
      put: () => undefined,
      delete: () => undefined,
      static: () => undefined,
    },
  };
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

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
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

test("registerAuthRoutes wires auth endpoints", () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(
    router as unknown as Parameters<typeof registerAuthRoutes>[0],
    {
      requireAuth: async () => undefined,
      validate: () => undefined,
    } as unknown as Parameters<typeof registerAuthRoutes>[1]
  );

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "POST /auth/login",
      "POST /auth/logout",
      "GET /auth/me",
      "GET /auth/csrf",
      "POST /auth/verify-otp",
      "POST /auth/reset",
      "POST /auth/reset/confirm",
    ])
  );
});

test("auth/me returns redacted permission snapshot for the current user", async () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => undefined,
    validate: () => undefined,
    resolvePermissionSnapshot: async (userId) => ({
      permissions: ["content:read", "users:read"],
      roles: [{ id: "role-1", slug: "editor", name: "Editor" }],
    }),
  });

  const result = await runRoute(findRoute(routes, "GET", "/auth/me"), {
    user: { id: "user-1", email: "admin@example.com", name: "Admin" },
  });

  expect(result).toEqual({
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      permissionSnapshot: {
        permissions: ["content:read", "users:read"],
        roles: [{ id: "role-1", slug: "editor", name: "Editor" }],
      },
    },
  });
});

test("auth/me preserves unauthenticated response from auth middleware", async () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => {
      throw new ApiError("auth_required", "Not authenticated", 401);
    },
    validate: () => undefined,
    resolvePermissionSnapshot: async () => ({ permissions: ["*"], roles: [] }),
  });

  try {
    await runRoute(findRoute(routes, "GET", "/auth/me"), {});
    throw new Error("Expected auth/me unauthenticated rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("auth_required");
    expect(apiError.status).toBe(401);
  }
});

test("auth/me rejects malformed authenticated user payloads", async () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => undefined,
    validate: () => undefined,
    resolvePermissionSnapshot: async () => ({ permissions: ["*"], roles: [] }),
  });

  try {
    await runRoute(findRoute(routes, "GET", "/auth/me"), {
      user: { id: "user-1" },
    });
    throw new Error("Expected auth/me malformed user rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("auth_user_invalid");
    expect(apiError.status).toBe(500);
  }
});

test("auth/me rejects unsupported query parameters before resolving permissions", async () => {
  const { router, routes } = makeRouter();
  let resolved = false;

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => undefined,
    validate: () => undefined,
    resolvePermissionSnapshot: async () => {
      resolved = true;
      return { permissions: [], roles: [] };
    },
  });

  try {
    await runRoute(findRoute(routes, "GET", "/auth/me"), {
      query: { includeSecrets: "1" },
      user: { id: "user-1", email: "admin@example.com" },
    });
    throw new Error("Expected auth/me query rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("auth_me_query_invalid");
    expect(apiError.status).toBe(400);
    expect(resolved).toBe(false);
  }
});

test("auth/me maps forbidden permission snapshots", async () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => undefined,
    validate: () => undefined,
    resolvePermissionSnapshot: async () => {
      throw new Error("forbidden");
    },
  });

  try {
    await runRoute(findRoute(routes, "GET", "/auth/me"), {
      user: { id: "user-1", email: "admin@example.com" },
    });
    throw new Error("Expected permission snapshot rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("auth_permission_snapshot_forbidden");
    expect(apiError.status).toBe(403);
  }
});

test("auth/me maps malformed permission snapshots", async () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => undefined,
    validate: () => undefined,
    resolvePermissionSnapshot: async () =>
      ({ permissions: ["settings:read"], roles: [{ id: "role-1" }] }) as never,
  });

  try {
    await runRoute(findRoute(routes, "GET", "/auth/me"), {
      user: { id: "user-1", email: "admin@example.com" },
    });
    throw new Error("Expected malformed permission snapshot rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("auth_permission_snapshot_invalid");
    expect(apiError.status).toBe(500);
  }
});

test("auth/reset/confirm activates pending users and revokes sessions", async () => {
  const { router, routes } = makeRouter();
  const passwordUpdates: unknown[] = [];
  const revoked: string[] = [];
  const auditEvents: unknown[] = [];

  registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
    requireAuth: async () => undefined,
    validate: () => undefined,
    consumeResetTokenWithStatus: async () => ({
      ok: true,
      reset: {
        id: "reset-1",
        userId: "user-1",
        tokenHash: "hash",
        expiresAt: new Date("2026-06-01T11:00:00.000Z"),
        usedAt: new Date("2026-06-01T10:00:00.000Z"),
        createdAt: new Date("2026-06-01T09:00:00.000Z"),
        updatedAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    }),
    hashPassword: async () => "hashed-password",
    updatePassword: async (userId, options) => {
      passwordUpdates.push({ userId, options });
      return { id: userId } as never;
    },
    revokeAllSessions: async (userId) => {
      revoked.push(userId);
    },
    logAudit: async (entry) => {
      auditEvents.push(entry);
      return makeAuditRecord(entry);
    },
  });

  const result = await runRoute(findRoute(routes, "POST", "/auth/reset/confirm"), {
    body: { token: "reset-token", password: "New-password-123" },
  });

  expect(result).toEqual({ ok: true });
  expect(passwordUpdates).toEqual([
    { userId: "user-1", options: { passwordHash: "hashed-password", activatePending: true } },
  ]);
  expect(revoked).toEqual(["user-1"]);
  expect(auditEvents).toEqual([
    expect.objectContaining({
      actorId: "user-1",
      action: "auth.reset.confirm",
      targetId: "user-1",
    }),
  ]);
});

for (const code of [
  "set_password_token_invalid",
  "set_password_token_expired",
  "set_password_token_used",
] as const) {
  test(`auth/reset/confirm maps ${code}`, async () => {
    const { router, routes } = makeRouter();

    registerAuthRoutes(router as unknown as Parameters<typeof registerAuthRoutes>[0], {
      requireAuth: async () => undefined,
      validate: () => undefined,
      consumeResetTokenWithStatus: async () => ({ ok: false, code }),
    });

    try {
      await runRoute(findRoute(routes, "POST", "/auth/reset/confirm"), {
        body: { token: "reset-token", password: "New-password-123" },
      });
      throw new Error("Expected set-password token rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe(code);
      expect(apiError.status).toBe(400);
    }
  });
}

import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import type { RouteContext, RouteHandler } from "../../../core/server/router";
import { registerAuthRoutes } from "../../../core/server/routes/authRoutes";

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

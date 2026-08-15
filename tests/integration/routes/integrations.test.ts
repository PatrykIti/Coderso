import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { registerIntegrationsRoutes } from "../../../core/server/routes/integrationsRoutes";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
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
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
    },
  };
};

test("registerIntegrationsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerIntegrationsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/integrations",
      "GET /settings/integrations/:id",
      "PATCH /settings/integrations/:id",
      "POST /settings/integrations/:id/check",
      "POST /settings/integrations/requests",
    ])
  );
});

test("registerIntegrationsRoutes requests the expected permission guards", () => {
  const { router } = makeRouter();
  const requestedPermissions: string[] = [];

  registerIntegrationsRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  expect(requestedPermissions).toEqual([
    "settings:read",
    "settings:read",
    "settings:write",
    "settings:write",
    "settings:write",
  ]);
});

test("integration detail route maps unknown ids to 404 ApiError", async () => {
  const { router, routes } = makeRouter();

  registerIntegrationsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const route = routes.find(
    (item) => item.method === "GET" && item.path === "/settings/integrations/:id"
  );
  const handler = route?.handlers.at(-1);

  try {
    await handler?.({
      params: { id: "missing-provider" },
      query: {},
      body: null,
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("integration_not_found");
    expect(apiError.status).toBe(404);
  }
});

test("integration update route validates payload and maps unknown resend keys to 400 ApiError", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerIntegrationsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
    },
  });

  const route = routes.find(
    (item) => item.method === "PATCH" && item.path === "/settings/integrations/:id"
  );
  const handler = route?.handlers.at(-1);
  const payload = { config: { baseUrl: "https://evil.test" } };

  try {
    await handler?.({
      params: { id: "resend" },
      query: {},
      body: payload,
      user: { id: "user-1" },
      ip: "127.0.0.1",
      userAgent: "bun-test",
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(validations).toHaveLength(1);
    expect(validations[0]?.payload).toEqual(payload);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("integration_config_invalid");
    expect(apiError.status).toBe(400);
  }
});

test("integration request route validates payload and maps blank names to 400 ApiError", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerIntegrationsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
    },
  });

  const route = routes.find(
    (item) => item.method === "POST" && item.path === "/settings/integrations/requests"
  );
  const handler = route?.handlers.at(-1);
  const payload = { name: "   ", website: null, notes: "  " };

  try {
    await handler?.({
      params: {},
      query: {},
      body: payload,
      user: { id: "user-1" },
      ip: "127.0.0.1",
      userAgent: "bun-test",
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(validations).toHaveLength(1);
    expect(validations[0]?.payload).toEqual(payload);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("integration_request_invalid");
    expect(apiError.status).toBe(400);
  }
});

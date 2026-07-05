import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapSettingsRouteError,
  registerSettingsRoutes,
  resolveSettingsRouteKey,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/settingsRoutes";

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
    },
  };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

const runRoute = async (route: Route, ctx: RouteContext) => {
  let result: unknown;
  for (const handler of route.handlers) {
    result = await handler(ctx);
  }
  return result;
};

test("registerSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings",
      "GET /settings/storage",
      "GET /settings/security",
      "GET /settings/:key",
      "PATCH /settings/storage",
      "PATCH /settings/security",
      "PATCH /settings/:key",
      "PATCH /settings",
    ])
  );
});

test("registerSettingsRoutes keeps settings reads behind settings:read", () => {
  const { router } = makeRouter();
  const requiredPermissions: string[] = [];

  registerSettingsRoutes(router, {
    requirePermission: (permission) => {
      requiredPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  expect(requiredPermissions.slice(0, 4)).toEqual([
    "settings:read",
    "settings:read",
    "settings:read",
    "settings:read",
  ]);
  expect(requiredPermissions.slice(4)).toEqual([
    "settings:write",
    "settings:write",
    "settings:write",
    "settings:write",
  ]);
});

test("settings reads stop at the settings:read guard with a 403", async () => {
  const { router, routes } = makeRouter();

  registerSettingsRoutes(router, {
    requirePermission: (permission) => {
      return async () => {
        expect(permission).toBe("settings:read");
        throw new ApiError("permission_denied", "Forbidden", 403);
      };
    },
    validate: () => undefined,
  });

  const route = findRoute(routes, "GET", "/settings/security");
  const permissionHandler = route.handlers[0];
  const readHandler = route.handlers[1];
  if (!permissionHandler || !readHandler) {
    throw new Error("Settings read route is missing its guard or read handler");
  }

  let readHandlerReached = false;
  const guardedRoute: Route = {
    ...route,
    handlers: [
      permissionHandler,
      async (ctx) => {
        readHandlerReached = true;
        return readHandler(ctx);
      },
    ],
  };

  await expect(
    runRoute(guardedRoute, {
      params: {},
      query: {},
      body: undefined,
      user: { id: "restricted-1" },
    })
  ).rejects.toMatchObject({
    code: "permission_denied",
    status: 403,
  });
  expect(readHandlerReached).toBe(false);
});

test("resolveSettingsRouteKey maps site.baseUrl alias", () => {
  expect(resolveSettingsRouteKey("site.baseUrl")).toBe("site.publicBaseUrl");
  expect(resolveSettingsRouteKey("site.publicBaseUrl")).toBe("site.publicBaseUrl");
});

test("mapSettingsRouteError preserves known settings contract errors", () => {
  const mapped = mapSettingsRouteError(new Error("settings_key_invalid"));

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped.code).toBe("settings_key_invalid");
  expect(mapped.status).toBe(400);
  expect(mapped.message).toBe("Unknown setting key");
});

test("mapSettingsRouteError maps invalid setting values (e.g. an invalid timezone) to 400", () => {
  // TASK-482-05-L01: the `site.timezone` normalizer throws
  // `settings_value_invalid` for a non-IANA zone; the route boundary maps it to
  // a 400 ApiError.
  const mapped = mapSettingsRouteError(new Error("settings_value_invalid"));

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped.code).toBe("settings_value_invalid");
  expect(mapped.status).toBe(400);
  expect(mapped.message).toBe("Invalid setting value");
});

test("PATCH /settings/:key propagates settings_key_invalid for an unknown key as a 400", async () => {
  // TASK-482-05-L01: the PATCH handler resolves the key inside
  // `withSettingsErrors`, so an unknown key surfaces as a mapped 400 ApiError
  // (DB-free: resolveSettingKey rejects before any persistence).
  const { router, routes } = makeRouter();

  registerSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const route = findRoute(routes, "PATCH", "/settings/:key");
  const handler = route.handlers[route.handlers.length - 1];
  if (!handler) throw new Error("Missing PATCH /settings/:key handler");

  await expect(
    handler({
      params: { key: "unknown.key" },
      query: {},
      body: { value: "whatever" },
      user: { id: "admin-1" },
    })
  ).rejects.toMatchObject({
    code: "settings_key_invalid",
    status: 400,
  });
});

test("mapSettingsRouteError maps site shell reference errors to 400 responses", () => {
  const menuError = mapSettingsRouteError(new Error("site_shell_menu_not_found"));
  expect(menuError).toBeInstanceOf(ApiError);
  expect(menuError.code).toBe("site_shell_menu_not_found");
  expect(menuError.status).toBe(400);
  expect(menuError.message).toBe("Navigation menu not found");

  const templateError = mapSettingsRouteError(new Error("site_shell_template_not_found"));
  expect(templateError).toBeInstanceOf(ApiError);
  expect(templateError.code).toBe("site_shell_template_not_found");
  expect(templateError.status).toBe(400);
  expect(templateError.message).toBe("Footer template not found");
});

test("mapSettingsRouteError hides unexpected raw query errors", () => {
  const mapped = mapSettingsRouteError(
    new Error('Failed query: select "key", "value" from "settings"')
  );

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped.code).toBe("settings_error");
  expect(mapped.status).toBe(500);
  expect(mapped.message).toBe("Could not complete settings request.");
  expect(mapped.message).not.toContain("select");
  expect(mapped.message).not.toContain("Failed query");
});

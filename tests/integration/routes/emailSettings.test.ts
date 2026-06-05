import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapEmailSettingsError,
  registerEmailSettingsRoutes,
  type RouteHandler,
} from "../../../core/server/routes/emailSettingsRoutes";
import { emailSettingsSchema } from "../../../core/server/validation/emailSchemas";

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
      put: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PUT", path, handlers }),
    },
  };
};

test("registerEmailSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerEmailSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/email",
      "PUT /settings/email",
      "POST /settings/email/test",
      "GET /settings/email/logs",
    ])
  );
});

test("registerEmailSettingsRoutes requests the expected permission guards", () => {
  const { router } = makeRouter();
  const requestedPermissions: string[] = [];

  registerEmailSettingsRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  expect(requestedPermissions).toEqual([
    "settings:read",
    "settings:write",
    "settings:write",
    "settings:read",
  ]);
});

test("email settings schema is provider-aware and strict", () => {
  const schema = emailSettingsSchema as {
    additionalProperties: boolean;
    properties: { provider: { enum: string[] } };
  };

  expect(schema.additionalProperties).toBe(false);
  expect(schema.properties.provider.enum).toEqual(["smtp", "resend"]);
});

test("mapEmailSettingsError maps known service errors", () => {
  const mapped = mapEmailSettingsError(new Error("email_not_configured"));
  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped?.code).toBe("email_not_configured");
  expect(mapped?.status).toBe(400);

  const sendFailed = mapEmailSettingsError(new Error("email_send_failed"));
  expect(sendFailed?.code).toBe("email_send_failed");
  expect(sendFailed?.status).toBe(400);

  expect(mapEmailSettingsError(new Error("unexpected"))).toBeNull();
});

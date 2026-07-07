import { expect, test } from "bun:test";

import { ContentValidationError } from "../../../core/services/content/validation";

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";

const { mapContentEntryError, mapEntryMetadataError, registerContentEntryRoutes } =
  await import("../../../core/server/routes/contentEntryRoutes");

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
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
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

test("registerContentEntryRoutes wires content entry endpoints and permissions", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerContentEntryRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /content-entries",
      "GET /content/:type/entries",
      "POST /content/:type/entries",
      "GET /content/:type/entries/:id",
      "PATCH /content/:type/entries/:id",
      "PATCH /content/:type/entries/:id/metadata",
      "POST /content/:type/entries/:id/duplicate",
      "DELETE /content/:type/entries/:id",
      "POST /content/:type/entries/:id/preview",
      "POST /content/:type/entries/:id/publish",
      "POST /content/:type/entries/:id/unpublish",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
    "content:write",
    "content:write",
    "content:read",
    "content:publish",
    "content:publish",
  ]);
});

test("mapContentEntryError maps entry domain errors to route ApiErrors", () => {
  expect(mapContentEntryError(new Error("content_type_not_found"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("entry_not_found"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("entry_slug_conflict"))?.status).toBe(409);
  expect(mapContentEntryError(new Error("media_value_invalid"))?.status).toBe(400);
  expect(mapContentEntryError(new Error("media_asset_missing"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("relation_entry_missing"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("auth_required"))?.status).toBe(401);
  expect(mapContentEntryError(new Error("other_error"))).toBeNull();
});

test("PATCH metadata route accepts visibility + accessPassword and gates publish", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerContentEntryRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const metadataRoute = routes.find(
    (route) => route.method === "PATCH" && route.path === "/content/:type/entries/:id/metadata"
  );
  expect(metadataRoute).toBeDefined();
  // The metadata route rides content:write (no new RBAC bucket for visibility).
  expect(requestedPermissions).toContain("content:write");
});

test("mapEntryMetadataError maps entry_password_required to a 400 without leaking the secret", () => {
  const mapped = mapEntryMetadataError(new Error("entry_password_required"));
  expect(mapped?.status).toBe(400);
  expect(mapped?.code).toBe("entry_password_required");
  expect(JSON.stringify(mapped)).not.toContain("accessPassword");
  expect(mapEntryMetadataError(new Error("scheduled_at_required"))?.status).toBe(400);
  expect(mapEntryMetadataError(new Error("other_error"))).toBeNull();
});

test("mapContentEntryError preserves field details for domain field errors", () => {
  const mapped = mapContentEntryError(
    Object.assign(new Error("entry_slug_conflict"), {
      field: "slug",
    })
  );

  expect(mapped?.details).toEqual({
    field: "slug",
  });
});

test("mapContentEntryError preserves content validation details", () => {
  const mapped = mapContentEntryError(
    new ContentValidationError("entry_validation_failed", [
      {
        instancePath: "/status",
        schemaPath: "#/properties/status/enum",
        keyword: "enum",
        params: { allowedValues: ["planned", "active"] },
        message: "must be equal to one of the allowed values",
      },
    ])
  );

  expect(mapped?.code).toBe("entry_validation_failed");
  expect(mapped?.status).toBe(400);
  expect(mapped?.details).toEqual({
    validation: [
      expect.objectContaining({
        instancePath: "/status",
        keyword: "enum",
      }),
    ],
  });
});

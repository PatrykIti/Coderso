import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { mapBackupError, registerBackupRoutes } from "../../../core/server/routes/backupRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";

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

test("registerBackupRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /backups",
      "POST /backups",
      "POST /backups/:id/restore",
      "GET /backups/:id/download",
      "DELETE /backups/:id",
      "GET /backups/schedule",
      "PATCH /backups/schedule",
    ])
  );
});

test("backup create route validates include payload", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  const handler = routes
    .find((route) => route.method === "POST" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    handler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["database", "media"] },
    })
  ).rejects.toThrow("validation_stop");

  expect(validations[0]?.payload).toEqual({ kind: "manual", include: ["database", "media"] });
});

test("backup routes reject invalid include and unknown list query params", async () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const createHandler = routes
    .find((route) => route.method === "POST" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    createHandler?.({
      params: {},
      query: {},
      body: { kind: "manual", include: ["unknown"] },
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);

  const listHandler = routes
    .find((route) => route.method === "GET" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    listHandler?.({
      params: {},
      query: { page: "1", limit: "10", extra: "nope" },
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 } satisfies Partial<ApiError>);
});

test("backup list route validates parsed pagination before service access", async () => {
  const { router, routes } = makeRouter();
  const validations: Array<{ schema: unknown; payload: unknown }> = [];

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validations.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  const handler = routes
    .find((route) => route.method === "GET" && route.path === "/backups")
    ?.handlers.at(-1);
  await expect(
    handler?.({
      params: {},
      query: { page: "2", limit: "25", query: "queued" },
      body: undefined,
    })
  ).rejects.toThrow("validation_stop");

  expect(validations[0]?.payload).toEqual({ page: 2, limit: 25, query: "queued" });
});

test("mapBackupError returns stable API errors", () => {
  expect(mapBackupError(new Error("backup_not_found"))).toMatchObject({
    code: "backup_not_found",
    status: 404,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_not_ready"))).toMatchObject({
    code: "backup_not_ready",
    status: 409,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_restore_unsupported"))).toMatchObject({
    code: "backup_restore_unsupported",
    status: 409,
  } satisfies Partial<ApiError>);
  expect(mapBackupError(new Error("backup_artifact_invalid"))).toMatchObject({
    code: "backup_artifact_invalid",
    status: 400,
  } satisfies Partial<ApiError>);
});

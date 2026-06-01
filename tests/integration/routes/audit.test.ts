import { expect, test } from "bun:test";
import {
  AdminQueryConventionError,
  encodeAdminCursor,
} from "../../../core/services/admin/adminQueryConventions";
import { ApiError } from "../../../core/server/errorHandler";
import { mapAuditQueryError, registerAuditRoutes } from "../../../core/server/routes/auditRoutes";
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
    },
  };
};

const runRoute = async (route: Route, ctx: RouteContext) => {
  let result: unknown;
  for (const handler of route.handlers) {
    result = await handler(ctx);
  }
  return result;
};

test("registerAuditRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();
  const requiredPermissions: string[] = [];

  registerAuditRoutes(router, {
    requirePermission: (permission) => {
      requiredPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(expect.arrayContaining(["GET /audit"]));
  expect(requiredPermissions).toEqual(["audit:read"]);
});

test("mapAuditQueryError maps validation and convention failures to route errors", () => {
  const conventionError = mapAuditQueryError(
    new AdminQueryConventionError("admin_query_limit_invalid", "Invalid limit", "limit")
  );
  const validationError = mapAuditQueryError(
    new ApiError("validation_error", "Invalid payload", 400, [
      { path: "limit", message: "must match pattern" },
    ])
  );

  expect(conventionError?.code).toBe("audit_query_invalid");
  expect(conventionError?.status).toBe(400);
  expect(validationError?.code).toBe("audit_query_invalid");
  expect(validationError?.status).toBe(400);

  const cursorError = mapAuditQueryError(
    new AdminQueryConventionError("admin_query_cursor_invalid", "Invalid cursor", "cursor")
  );
  expect(cursorError?.code).toBe("audit_cursor_invalid");
  expect(cursorError?.status).toBe(400);
});

test("audit query handler rejects unknown and malformed query params before service work", async () => {
  const { router, routes } = makeRouter();

  registerAuditRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    listAudit: async () => {
      throw new Error("service_should_not_run");
    },
  });

  const handler = routes.find((route) => route.path === "/audit")?.handlers[1];
  if (!handler) throw new Error("Missing audit route handler");

  await expect(
    Promise.resolve(
      handler({
        params: {},
        query: { page: "2" },
        body: undefined,
      })
    )
  ).rejects.toMatchObject({ code: "audit_query_invalid", status: 400 });

  await expect(
    Promise.resolve(
      handler({
        params: {},
        query: { limit: "0" },
        body: undefined,
      })
    )
  ).rejects.toMatchObject({ code: "audit_query_invalid", status: 400 });

  await expect(
    Promise.resolve(
      handler({
        params: {},
        query: { cursor: "not-a-valid-cursor" },
        body: undefined,
      })
    )
  ).rejects.toMatchObject({ code: "audit_cursor_invalid", status: 400 });
});

test("audit query handler normalizes filters and returns cursor metadata", async () => {
  const { router, routes } = makeRouter();
  const queries: unknown[] = [];
  const cursor = encodeAdminCursor({
    createdAt: "2026-06-01T10:00:00.000Z",
    id: "audit-1",
  });

  registerAuditRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    listAudit: async (query) => {
      queries.push(query);
      return {
        items: [],
        nextCursor: "next-cursor",
      };
    },
  });

  const handler = routes.find((route) => route.path === "/audit")?.handlers[1];
  if (!handler) throw new Error("Missing audit route handler");

  const result = await handler({
    params: {},
    query: {
      limit: "500",
      q: " auth ",
      category: "authentication",
      severity: "warning",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
      cursor,
    },
    body: undefined,
  });

  expect(result).toEqual({ items: [], nextCursor: "next-cursor" });
  expect(queries).toEqual([
    {
      limit: 200,
      query: "auth",
      category: "authentication",
      severity: "warning",
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-02T00:00:00.000Z"),
      cursor,
    },
  ]);
});

test("audit route requires audit read before service work", async () => {
  const { router, routes } = makeRouter();
  let serviceCalls = 0;

  registerAuditRoutes(router, {
    requirePermission: () => async () => {
      throw new ApiError("permission_denied", "Forbidden", 403);
    },
    validate,
    listAudit: async () => {
      serviceCalls += 1;
      return { items: [], nextCursor: null };
    },
  });

  const route = routes.find((item) => item.path === "/audit");
  if (!route) throw new Error("Missing audit route");

  await expect(
    runRoute(route, {
      params: {},
      query: {},
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "permission_denied", status: 403 });
  expect(serviceCalls).toBe(0);
});

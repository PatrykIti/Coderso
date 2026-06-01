import { expect, test } from "bun:test";
import {
  AdminQueryConventionError,
  encodeAdminCursor,
} from "../../../core/services/admin/adminQueryConventions";
import { AuditExportError } from "../../../core/services/audit/auditExportContract";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapAuditError,
  mapAuditQueryError,
  registerAuditRoutes,
} from "../../../core/server/routes/auditRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
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

  expect(paths).toEqual(expect.arrayContaining(["GET /audit", "POST /audit/export"]));
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

test("mapAuditError maps export validation, column, limit, and forbidden failures", () => {
  const columnValidationError = mapAuditError(
    new ApiError("validation_error", "Invalid payload", 400, [
      { path: "columns.0", message: "must be equal to one of the allowed values" },
    ]),
    "export"
  );
  const unknownValidationError = mapAuditError(
    new ApiError("validation_error", "Invalid payload", 400, [
      { path: "extra", message: "must NOT have additional properties" },
    ]),
    "export"
  );
  const tooLargeError = mapAuditError(
    new AuditExportError("audit_export_too_large", "Too many rows", {
      field: "filters.limit",
    }),
    "export"
  );
  const forbiddenError = mapAuditError(
    new ApiError("permission_denied", "Forbidden", 403),
    "export"
  );

  expect(columnValidationError?.code).toBe("audit_export_invalid_columns");
  expect(columnValidationError?.status).toBe(400);
  expect(unknownValidationError?.code).toBe("audit_export_invalid");
  expect(tooLargeError?.code).toBe("audit_export_too_large");
  expect(tooLargeError?.status).toBe(413);
  expect(forbiddenError?.code).toBe("audit_export_forbidden");
  expect(forbiddenError?.status).toBe(403);
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

test("audit export handler rejects unknown body params and invalid columns before service work", async () => {
  const { router, routes } = makeRouter();
  let serviceCalls = 0;

  registerAuditRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    exportAuditLogs: async () => {
      serviceCalls += 1;
      return {
        type: "file",
        filename: "audit-logs.csv",
        mimeType: "text/csv",
        content: "",
      };
    },
  });

  const route = routes.find((item) => item.path === "/audit/export");
  if (!route) throw new Error("Missing audit export route");

  await expect(
    runRoute(route, {
      params: {},
      query: {},
      body: {
        format: "csv",
        columns: ["event"],
        filters: {},
        extra: true,
      },
      user: { id: "user-1" },
    })
  ).rejects.toMatchObject({ code: "audit_export_invalid", status: 400 });

  await expect(
    runRoute(route, {
      params: {},
      query: {},
      body: {
        format: "csv",
        columns: ["metadata.secret"],
        filters: {},
      },
      user: { id: "user-1" },
    })
  ).rejects.toMatchObject({ code: "audit_export_invalid_columns", status: 400 });

  expect(serviceCalls).toBe(0);
});

test("audit export handler passes normalized context and returns file metadata", async () => {
  const { router, routes } = makeRouter();
  const requests: unknown[] = [];
  const contexts: unknown[] = [];

  registerAuditRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    exportAuditLogs: async (request, context) => {
      requests.push(request);
      contexts.push(context);
      return {
        type: "file",
        filename: "audit-logs-2026-06-01-all.csv",
        mimeType: "text/csv",
        content: "Event\ncontent.publish",
      };
    },
  });

  const route = routes.find((item) => item.path === "/audit/export");
  if (!route) throw new Error("Missing audit export route");

  const result = await runRoute(route, {
    params: {},
    query: {},
    body: {
      format: "csv",
      columns: ["event", "timestamp"],
      filters: {
        limit: 50,
        query: "auth",
        category: "authentication",
        severity: "warning",
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-02T00:00:00.000Z",
      },
    },
    user: { id: "user-1" },
  });

  expect(result).toEqual({
    type: "file",
    filename: "audit-logs-2026-06-01-all.csv",
    mimeType: "text/csv",
    content: "Event\ncontent.publish",
  });
  expect(requests).toEqual([
    {
      format: "csv",
      columns: ["event", "timestamp"],
      filters: {
        limit: 50,
        query: "auth",
        category: "authentication",
        severity: "warning",
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-02T00:00:00.000Z",
      },
    },
  ]);
  expect(contexts).toEqual([
    {
      actorId: "user-1",
      requestId: undefined,
      ip: undefined,
      userAgent: undefined,
    },
  ]);
});

test("audit export route maps permission failures before service work", async () => {
  const { router, routes } = makeRouter();
  let serviceCalls = 0;

  registerAuditRoutes(router, {
    requirePermission: () => async () => {
      throw new ApiError("permission_denied", "Forbidden", 403);
    },
    validate,
    exportAuditLogs: async () => {
      serviceCalls += 1;
      return {
        type: "file",
        filename: "audit-logs.csv",
        mimeType: "text/csv",
        content: "",
      };
    },
  });

  const route = routes.find((item) => item.path === "/audit/export");
  if (!route) throw new Error("Missing audit export route");

  await expect(
    runRoute(route, {
      params: {},
      query: {},
      body: {
        format: "csv",
        columns: ["event"],
        filters: {},
      },
      user: { id: "user-1" },
    })
  ).rejects.toMatchObject({ code: "audit_export_forbidden", status: 403 });
  expect(serviceCalls).toBe(0);
});

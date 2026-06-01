import { expect, test } from "bun:test";
import {
  AdminQueryConventionError,
  encodeAdminCursor,
} from "../../../core/services/admin/adminQueryConventions";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapAccessLogQueryError,
  registerAccessLogRoutes,
} from "../../../core/server/routes/accessLogRoutes";
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

test("registerAccessLogRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAccessLogRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  expect(routes.map(({ method, path }) => ({ method, path }))).toEqual([
    { method: "GET", path: "/access-logs" },
  ]);
});

test("mapAccessLogQueryError maps validation and convention failures to route errors", () => {
  const conventionError = mapAccessLogQueryError(
    new AdminQueryConventionError("admin_query_date_range_invalid", "Invalid range", "dateRange")
  );
  const validationError = mapAccessLogQueryError(
    new ApiError("validation_error", "Invalid payload", 400, [
      { path: "from", message: "must match format" },
    ])
  );

  expect(conventionError?.code).toBe("access_log_query_invalid");
  expect(conventionError?.status).toBe(400);
  expect(validationError?.code).toBe("access_log_query_invalid");
  expect(validationError?.status).toBe(400);

  const cursorError = mapAccessLogQueryError(
    new AdminQueryConventionError("admin_query_cursor_invalid", "Invalid cursor", "cursor")
  );
  expect(cursorError?.code).toBe("access_log_cursor_invalid");
  expect(cursorError?.status).toBe(400);
});

test("access log query handler rejects unknown, invalid date, invalid limit, and invalid cursor params before service work", async () => {
  const { router, routes } = makeRouter();

  registerAccessLogRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = routes.find((route) => route.path === "/access-logs")?.handlers[1];
  if (!handler) throw new Error("Missing access logs route handler");

  for (const { query, code } of [
    { query: { page: "2" }, code: "access_log_query_invalid" },
    { query: { limit: "0" }, code: "access_log_query_invalid" },
    { query: { from: "2026-06-01" }, code: "access_log_query_invalid" },
    { query: { cursor: "not-a-valid-cursor" }, code: "access_log_cursor_invalid" },
    {
      query: {
        from: "2026-06-03T00:00:00.000Z",
        to: "2026-06-02T00:00:00.000Z",
      },
      code: "access_log_query_invalid",
    },
  ]) {
    await expect(
      Promise.resolve(
        handler({
          params: {},
          query,
          body: undefined,
        })
      )
    ).rejects.toMatchObject({ code, status: 400 });
  }
});

test("access log query handler normalizes filters and returns cursor metadata", async () => {
  const { router, routes } = makeRouter();
  const calls: unknown[] = [];
  const cursor = encodeAdminCursor({
    createdAt: "2026-06-01T12:00:00.000000Z",
    id: "access-1",
  });

  registerAccessLogRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    listAccessLogs: async (query) => {
      calls.push(query);
      return { items: [], nextCursor: "next-cursor" };
    },
  });

  const handler = routes.find((route) => route.path === "/access-logs")?.handlers[1];
  if (!handler) throw new Error("Missing access logs route handler");

  const result = await handler({
    params: {},
    query: {
      limit: "120",
      status: "failed",
      q: "  login  ",
      userId: "user-1",
      method: "post",
      ip: "127.0.0.1",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T23:59:59.999Z",
      cursor,
    },
    body: undefined,
  });

  expect(result).toEqual({ items: [], nextCursor: "next-cursor" });
  expect(calls[0]).toMatchObject({
    limit: 120,
    status: "failed",
    query: "login",
    userId: "user-1",
    method: "POST",
    ip: "127.0.0.1",
    cursor,
  });
  expect((calls[0] as { from?: Date }).from).toBeInstanceOf(Date);
  expect((calls[0] as { to?: Date }).to).toBeInstanceOf(Date);
});

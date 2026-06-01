import { expect, test } from "bun:test";
import {
  AdminQueryConventionError,
  encodeAdminCursor,
} from "../../../core/services/admin/adminQueryConventions";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapAccessLogQueryError,
  mapAccessLogMutationError,
  registerAccessLogRoutes,
} from "../../../core/server/routes/accessLogRoutes";
import { AccessLogDomainError } from "../../../core/services/access/accessLogService";
import { validate } from "../../../core/server/validation/schemaValidator";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  sessionId?: string;
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
    },
  };
};

test("registerAccessLogRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();
  const permissions: string[] = [];

  registerAccessLogRoutes(router, {
    requirePermission: (permission) => {
      permissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  expect(routes.map(({ method, path }) => ({ method, path }))).toEqual([
    { method: "GET", path: "/access-logs" },
    { method: "POST", path: "/access-logs/:id/revoke" },
  ]);
  expect(permissions).toEqual(["audit:read", "settings:write"]);
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

test("mapAccessLogMutationError maps domain and validation failures", () => {
  const notFound = mapAccessLogMutationError(
    new AccessLogDomainError("access_log_session_not_found", "No session")
  );
  const current = mapAccessLogMutationError(
    new AccessLogDomainError("access_log_current_session_revoke_blocked", "Current session")
  );
  const validationError = mapAccessLogMutationError(
    new ApiError("validation_error", "Invalid payload", 400, [
      { path: "reason", message: "must be equal" },
    ])
  );

  expect(notFound?.code).toBe("access_log_session_not_found");
  expect(notFound?.status).toBe(404);
  expect(current?.code).toBe("access_log_current_session_revoke_blocked");
  expect(current?.status).toBe(409);
  expect(validationError?.code).toBe("access_log_revoke_invalid");
  expect(validationError?.status).toBe(400);
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
    resolvePermissions: async () => ["audit:read", "settings:read", "settings:write"],
    listAccessLogs: async (query, options) => {
      calls.push({ query, options });
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
    user: { id: "admin-1" },
    sessionId: "session-current",
  });

  expect(result).toEqual({ items: [], nextCursor: "next-cursor" });
  expect((calls[0] as { query: unknown }).query).toMatchObject({
    limit: 120,
    status: "failed",
    query: "login",
    userId: "user-1",
    method: "POST",
    ip: "127.0.0.1",
    cursor,
  });
  expect((calls[0] as { query: { from?: Date } }).query.from).toBeInstanceOf(Date);
  expect((calls[0] as { query: { to?: Date } }).query.to).toBeInstanceOf(Date);
  expect((calls[0] as { options: unknown }).options).toMatchObject({
    currentSessionId: "session-current",
    canViewSession: true,
    canRevokeSession: true,
  });
});

test("access log revoke handler validates body, revokes by log id, and audits safe refs", async () => {
  const { router, routes } = makeRouter();
  const accessLogId = "018f1f3a-2561-7af2-8bc1-4b924c8a1220";
  const revokeCalls: unknown[] = [];
  const auditCalls: unknown[] = [];

  registerAccessLogRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
    revokeAccessLogSession: async (input) => {
      revokeCalls.push(input);
      return {
        ok: true,
        accessLogId: input.accessLogId,
        revokedSessionRef: "session-1",
        targetUserRef: "user-1",
        sessionState: "revoked",
        alreadyRevoked: false,
      };
    },
    logAudit: async (entry) => {
      auditCalls.push(entry);
      return {
        id: "audit-1",
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata ?? {},
        createdAt: new Date("2026-06-01T12:00:00.000Z"),
      };
    },
  });

  const handler = routes.find((route) => route.path === "/access-logs/:id/revoke")?.handlers[1];
  if (!handler) throw new Error("Missing access log revoke route handler");

  await expect(
    Promise.resolve(
      handler({
        params: { id: accessLogId },
        query: {},
        body: { reason: "admin_manual_revoke", extra: true },
      })
    )
  ).rejects.toMatchObject({ code: "access_log_revoke_invalid", status: 400 });
  await expect(
    Promise.resolve(
      handler({
        params: { id: "access-1" },
        query: {},
        body: { reason: "admin_manual_revoke" },
      })
    )
  ).rejects.toMatchObject({ code: "access_log_revoke_invalid", status: 400 });

  const result = await handler({
    params: { id: accessLogId },
    query: {},
    body: { reason: "admin_manual_revoke" },
    user: { id: "admin-1" },
    sessionId: "current-session",
    ip: "127.0.0.1",
    userAgent: "Vitest",
  });

  expect(result).toMatchObject({ ok: true, accessLogId });
  expect(revokeCalls[0]).toEqual({
    accessLogId,
    currentSessionId: "current-session",
    reason: "admin_manual_revoke",
  });
  expect(auditCalls[0]).toMatchObject({
    actorId: "admin-1",
    action: "access_logs.revoke_session",
    targetType: "access_log",
    targetId: accessLogId,
    metadata: {
      accessLogRef: accessLogId,
      revokedSessionRef: "session-1",
      targetUserRef: "user-1",
      reason: "admin_manual_revoke",
      result: "revoked",
    },
    ip: "127.0.0.1",
    userAgent: "Vitest",
  });
});

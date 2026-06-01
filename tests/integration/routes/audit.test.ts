import { expect, test } from "bun:test";
import { AdminQueryConventionError } from "../../../core/services/admin/adminQueryConventions";
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

test("registerAuditRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAuditRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(expect.arrayContaining(["GET /audit"]));
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
});

test("audit query handler rejects unknown and malformed query params before service work", async () => {
  const { router, routes } = makeRouter();

  registerAuditRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
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
});

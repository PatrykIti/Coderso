import { expect, test } from "bun:test";
import { AdminQueryConventionError } from "../../../core/services/admin/adminQueryConventions";
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
});

test("access log query handler rejects unknown, invalid date, and invalid limit params before service work", async () => {
  const { router, routes } = makeRouter();

  registerAccessLogRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const handler = routes.find((route) => route.path === "/access-logs")?.handlers[1];
  if (!handler) throw new Error("Missing access logs route handler");

  for (const query of [
    { page: "2" },
    { limit: "0" },
    { from: "2026-06-01" },
    {
      from: "2026-06-03T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
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
    ).rejects.toMatchObject({ code: "access_log_query_invalid", status: 400 });
  }
});

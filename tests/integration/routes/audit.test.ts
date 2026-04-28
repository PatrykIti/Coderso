import { expect, test } from "bun:test";
import { registerAuditRoutes } from "../../../core/server/routes/auditRoutes";

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
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(expect.arrayContaining(["GET /audit"]));
});

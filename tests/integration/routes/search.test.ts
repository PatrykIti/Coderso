import { expect, test } from "bun:test";
import { registerSearchRoutes } from "../../../core/server/routes/searchRoutes";

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
      post: (path: string) =>
        routes.push({ method: "POST", path, handlers: [] }),
      patch: (path: string) =>
        routes.push({ method: "PATCH", path, handlers: [] }),
      delete: (path: string) =>
        routes.push({ method: "DELETE", path, handlers: [] }),
    },
  };
};

test("registerSearchRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerSearchRoutes(router, {
    requirePermission: () => async () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /search",
      "GET /search/recent",
      "GET /search/public-preview",
    ])
  );
});

test("search route enforces minimum query length", async () => {
  const { router, routes } = makeRouter();

  registerSearchRoutes(router, {
    requirePermission: () => async () => undefined,
  });

  const route = routes.find((item) => item.path === "/search");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({ params: {}, query: { q: "a" }, body: null });

  expect(result).toEqual({ items: [], categories: [] });
});

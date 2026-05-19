import { expect, test } from "bun:test";
import { registerWidgetRoutes } from "../../../core/server/routes/widgetRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
    },
  };
};

test("registerWidgetRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerWidgetRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /widgets",
      "POST /widgets/entry-teaser/preview",
      "POST /widgets/product-compare/preview",
      "POST /widgets/product-gallery/preview",
    ])
  );
});

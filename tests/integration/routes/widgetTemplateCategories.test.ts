import { expect, test } from "bun:test";
import { registerWidgetTemplateCategoryRoutes } from "../../../core/server/routes/widgetTemplateCategoryRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
      delete: (path: string) => routes.push({ method: "DELETE", path }),
    },
  };
};

test("registerWidgetTemplateCategoryRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerWidgetTemplateCategoryRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /widget-template-categories",
      "POST /widget-template-categories",
      "PATCH /widget-template-categories/:id",
      "DELETE /widget-template-categories/:id",
    ])
  );
});

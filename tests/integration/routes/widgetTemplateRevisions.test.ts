import { expect, test } from "bun:test";
import { registerWidgetTemplateRoutes } from "../../../core/server/routes/widgetTemplateRoutes";

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

test("registerWidgetTemplateRoutes wires revision endpoints", () => {
  const { router, routes } = makeRouter();

  registerWidgetTemplateRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /widget-templates/:id/revisions",
      "POST /widget-templates/:id/revisions/:revisionId/restore",
    ])
  );
});

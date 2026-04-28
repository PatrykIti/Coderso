import { expect, test } from "bun:test";
import {
  mapWidgetTemplateError,
  registerWidgetTemplateRoutes,
} from "../../../core/server/routes/widgetTemplateRoutes";

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

test("registerWidgetTemplateRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerWidgetTemplateRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /widget-templates",
      "GET /widget-templates/:id",
      "POST /widget-templates/:id/duplicate",
      "POST /widget-templates",
      "PATCH /widget-templates/:id",
      "DELETE /widget-templates/:id",
      "GET /widgets/templates",
      "GET /widgets/templates/:id",
      "POST /widgets/templates/:id/duplicate",
      "POST /widgets/templates",
      "PATCH /widgets/templates/:id",
      "DELETE /widgets/templates/:id",
    ])
  );
});

test("mapWidgetTemplateError maps name conflicts", () => {
  const error = mapWidgetTemplateError(new Error("widget_template_name_conflict"));

  expect(error?.code).toBe("widget_template_name_conflict");
  expect(error?.status).toBe(409);
});

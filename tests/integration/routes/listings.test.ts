import { expect, test } from "bun:test";

import { registerListingsRoutes } from "../../../core/server/routes/listingsRoutes";

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

test("registerListingsRoutes wires query and template endpoints", () => {
  const { router, routes } = makeRouter();

  registerListingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /listings/queries",
      "GET /listings/queries/:id",
      "POST /listings/queries",
      "PATCH /listings/queries/:id",
      "DELETE /listings/queries/:id",
      "POST /listings/queries/preview",
      "GET /listings/templates",
      "GET /listings/templates/:id",
      "POST /listings/templates",
      "PATCH /listings/templates/:id",
      "DELETE /listings/templates/:id",
    ])
  );
});

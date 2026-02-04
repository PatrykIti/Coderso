import { expect, test } from "bun:test";
import { registerTaxonomyRoutes } from "../../../core/server/routes/taxonomyRoutes";

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

test("taxonomy routes are registered", () => {
  const { router, routes } = makeRouter();

  registerTaxonomyRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /content-types/:id/taxonomies",
      "PATCH /content-types/:id/taxonomies",
      "GET /content-types/:id/terms",
      "GET /taxonomies/:id/terms",
      "POST /taxonomies/:id/terms",
      "PATCH /terms/:id",
      "DELETE /terms/:id",
    ])
  );
});

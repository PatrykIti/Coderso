import { expect, test } from "bun:test";
import { registerMenuRoutes } from "../../../core/server/routes/menuRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
      put: (path: string) => routes.push({ method: "PUT", path }),
      delete: (path: string) => routes.push({ method: "DELETE", path }),
    },
  };
};

test("registerMenuRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerMenuRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /menus",
      "POST /menus",
      "GET /menus/:id",
      "PATCH /menus/:id",
      "PUT /menus/:id/items",
      "DELETE /menus/:id",
    ])
  );
});

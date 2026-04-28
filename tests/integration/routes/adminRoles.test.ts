import { expect, test } from "bun:test";
import { registerAdminRolesRoutes } from "../../../core/server/routes/adminRolesRoutes";

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

test("registerAdminRolesRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAdminRolesRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /admin-roles",
      "GET /admin-roles/permissions",
      "POST /admin-roles",
      "PATCH /admin-roles/:id",
      "DELETE /admin-roles/:id",
    ])
  );
});

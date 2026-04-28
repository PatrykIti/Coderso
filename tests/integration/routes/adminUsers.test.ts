import { expect, test } from "bun:test";
import { registerAdminUsersRoutes } from "../../../core/server/routes/adminUsersRoutes";

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

test("registerAdminUsersRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAdminUsersRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /admin-users",
      "POST /admin-users",
      "PATCH /admin-users/:id",
      "POST /admin-users/:id/disable",
      "POST /admin-users/:id/enable",
      "PUT /admin-users/:id/roles",
      "DELETE /admin-users/:id",
    ])
  );
});

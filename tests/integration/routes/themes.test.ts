import { expect, test } from "bun:test";

import { registerThemeRoutes } from "../../../core/server/routes/themeRoutes";

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
    },
  };
};

test("registerThemeRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerThemeRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /themes",
      "GET /theme-profiles",
      "GET /theme-profiles/:id",
      "POST /theme-profiles",
      "PATCH /theme-profiles/:id",
      "POST /theme-profiles/:id/activate",
      "PUT /theme-profiles/:id/routes",
    ])
  );
});

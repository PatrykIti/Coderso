import { expect, test } from "bun:test";

import { registerAuthRoutes } from "../../../core/server/routes/authRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      patch: () => undefined,
      put: () => undefined,
      delete: () => undefined,
      static: () => undefined,
    },
  };
};

test("registerAuthRoutes wires auth endpoints", () => {
  const { router, routes } = makeRouter();

  registerAuthRoutes(router, {
    requireAuth: async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "POST /auth/login",
      "POST /auth/logout",
      "GET /auth/me",
      "GET /auth/csrf",
      "POST /auth/verify-otp",
      "POST /auth/reset",
      "POST /auth/reset/confirm",
    ])
  );
});

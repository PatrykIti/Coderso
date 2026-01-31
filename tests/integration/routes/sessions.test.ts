import { expect, test } from "bun:test";
import { registerSessionAdminRoutes } from "../../../core/server/routes/sessionAdminRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
    },
  };
};

test("registerSessionAdminRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerSessionAdminRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /sessions",
      "POST /sessions/:id/revoke",
      "POST /sessions/revoke-all",
    ])
  );
});

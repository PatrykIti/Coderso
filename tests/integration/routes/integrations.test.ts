import { expect, test } from "bun:test";
import { registerIntegrationsRoutes } from "../../../core/server/routes/integrationsRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
    },
  };
};

test("registerIntegrationsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerIntegrationsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/integrations",
      "GET /settings/integrations/:id",
      "PATCH /settings/integrations/:id",
      "POST /settings/integrations/requests",
    ])
  );
});

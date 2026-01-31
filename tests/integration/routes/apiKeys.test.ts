import { expect, test } from "bun:test";
import { registerApiKeysRoutes } from "../../../core/server/routes/apiKeysRoutes";

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

test("registerApiKeysRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerApiKeysRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/api-keys",
      "POST /settings/api-keys",
      "POST /settings/api-keys/:id/rotate",
      "POST /settings/api-keys/:id/revoke",
    ])
  );
});


import { expect, test } from "bun:test";
import { registerSettingsRoutes } from "../../../core/server/routes/settingsRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
    },
  };
};

test("registerSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings",
      "GET /settings/storage",
      "GET /settings/:key",
      "PATCH /settings/storage",
      "PATCH /settings/:key",
      "PATCH /settings",
    ])
  );
});

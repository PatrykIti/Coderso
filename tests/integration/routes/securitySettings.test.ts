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

test("security settings endpoints are registered", () => {
  const { router, routes } = makeRouter();

  registerSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining(["GET /settings/security", "PATCH /settings/security"])
  );
});

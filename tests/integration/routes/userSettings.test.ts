import { expect, test } from "bun:test";

import { registerUserSettingsRoutes } from "../../../core/server/routes/userSettingsRoutes";

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

test("registerUserSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerUserSettingsRoutes(
    router as unknown as Parameters<typeof registerUserSettingsRoutes>[0],
    {
    requireAuth: () => async () => undefined,
    validate: () => undefined,
    } as unknown as Parameters<typeof registerUserSettingsRoutes>[1]
  );

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /user-settings",
      "GET /user-settings/:key",
      "PATCH /user-settings/:key",
    ])
  );
});

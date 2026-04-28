import { expect, test } from "bun:test";
import { registerEmailSettingsRoutes } from "../../../core/server/routes/emailSettingsRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      put: (path: string) => routes.push({ method: "PUT", path }),
    },
  };
};

test("registerEmailSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerEmailSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/email",
      "PUT /settings/email",
      "POST /settings/email/test",
      "GET /settings/email/logs",
    ])
  );
});

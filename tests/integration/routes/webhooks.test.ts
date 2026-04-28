import { expect, test } from "bun:test";
import { registerWebhooksRoutes } from "../../../core/server/routes/webhooksRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
      delete: (path: string) => routes.push({ method: "DELETE", path }),
    },
  };
};

test("registerWebhooksRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerWebhooksRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/webhooks",
      "POST /settings/webhooks",
      "PATCH /settings/webhooks/:id",
      "DELETE /settings/webhooks/:id",
      "GET /settings/webhooks/:id/deliveries",
      "POST /settings/webhooks/:id/test",
    ])
  );
});


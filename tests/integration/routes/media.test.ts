import { expect, test } from "bun:test";
import { registerMediaRoutes } from "../../../core/server/routes/mediaRoutes";

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

test("registerMediaRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerMediaRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /media",
      "POST /media",
      "GET /media/:id",
      "PATCH /media/:id",
      "DELETE /media/:id",
    ])
  );
});

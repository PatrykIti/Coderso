import { expect, test } from "bun:test";
import { registerContentEntryRoutes } from "../../../core/server/routes/contentEntryRoutes";
import { registerContentTypeRoutes } from "../../../core/server/routes/contentTypeRoutes";

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

test("content routes are registered", () => {
  const { router, routes } = makeRouter();

  registerContentTypeRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  registerContentEntryRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /content-types",
      "POST /content-types",
      "POST /content-types/:id/duplicate",
      "GET /content-types/:id",
      "PATCH /content-types/:id",
      "DELETE /content-types/:id",
      "GET /content/:type/entries",
      "POST /content/:type/entries",
      "GET /content/:type/entries/:id",
      "PATCH /content/:type/entries/:id",
      "PATCH /content/:type/entries/:id/metadata",
      "DELETE /content/:type/entries/:id",
      "POST /content/:type/entries/:id/preview",
      "POST /content/:type/entries/:id/publish",
      "POST /content/:type/entries/:id/unpublish",
    ])
  );
});

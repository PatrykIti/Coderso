import { expect, test } from "bun:test";
import { registerPageRoutes } from "../../../core/server/routes/pageRoutes";

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

test("registerPageRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /pages",
      "POST /pages",
      "GET /pages/:id",
      "PATCH /pages/:id",
      "POST /pages/:id/publish",
      "POST /pages/:id/unpublish",
      "POST /pages/:id/preview",
      "GET /pages/:id/revisions",
      "POST /pages/:id/revisions/:revisionId/restore",
    ])
  );
});

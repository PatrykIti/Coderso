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
      delete: (path: string) => routes.push({ method: "DELETE", path }),
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
      "GET /pages/template-options",
      "POST /pages",
      "GET /pages/:id",
      "PATCH /pages/:id",
      "POST /pages/:id/autosave",
      "POST /pages/:id/publish",
      "POST /pages/:id/unpublish",
      "POST /pages/:id/preview",
      "POST /pages/:id/duplicate",
      "DELETE /pages/:id",
      "GET /pages/:id/revisions",
      "POST /pages/:id/revisions/:revisionId/restore",
      "DELETE /pages/:id/revisions/:revisionId",
    ])
  );
});

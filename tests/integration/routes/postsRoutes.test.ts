import { expect, test } from "bun:test";

import { registerPostsRoutes } from "../../../core/server/routes/postsRoutes";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

test("registerPostsRoutes wires post alias endpoints", () => {
  const { router, routes } = makeRouter();

  registerPostsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /posts",
      "POST /posts",
      "GET /posts/:id",
      "PATCH /posts/:id",
      "PATCH /posts/:id/metadata",
      "POST /posts/:id/publish",
      "POST /posts/:id/unpublish",
      "POST /posts/:id/preview",
      "POST /posts/:id/duplicate",
      "POST /posts/:id/autosave",
      "GET /posts/:id/revisions",
      "POST /posts/:id/revisions/:revisionId/restore",
      "DELETE /posts/:id",
    ])
  );
});

import { expect, test } from "bun:test";

import {
  mapPostError,
  registerPostsRoutes,
} from "../../../core/server/routes/postsRoutes";

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
  const requestedPermissions: string[] = [];

  registerPostsRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /posts",
      "POST /posts",
      "POST /posts/migration/backfill",
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
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:write",
    "settings:write",
    "content:read",
    "content:write",
    "content:write",
    "content:publish",
    "content:publish",
    "content:read",
    "content:write",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
  ]);
});

test("mapPostError maps post domain errors to API responses", () => {
  expect(mapPostError(new Error("post_not_found"))?.status).toBe(404);
  expect(mapPostError(new Error("post_slug_conflict"))?.status).toBe(409);
  expect(mapPostError(new Error("post_revision_not_found"))?.status).toBe(404);
  expect(mapPostError(new Error("post_validation_failed"))?.code).toBe(
    "post_validation_failed"
  );
  expect(mapPostError(new Error("some_unknown_error"))).toBeNull();
});

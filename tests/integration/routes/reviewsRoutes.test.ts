import { expect, test } from "bun:test";

import {
  mapReviewError,
  registerReviewsRoutes,
} from "../../../core/server/routes/reviewsRoutes";

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

test("registerReviewsRoutes wires reviews endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerReviewsRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /reviews",
      "GET /reviews/:id",
      "POST /reviews",
      "PATCH /reviews/:id",
      "PATCH /reviews/:id/status",
      "DELETE /reviews/:id",
    ])
  );
  expect(requestedPermissions).toEqual([
    "reviews:read",
    "reviews:read",
    "reviews:write",
    "reviews:write",
    "reviews:write",
    "reviews:write",
  ]);
});

test("mapReviewError maps domain errors to API errors", () => {
  const notFound = mapReviewError(new Error("review_not_found"));
  const invalid = mapReviewError(new Error("review_rating_invalid"));
  const unknown = mapReviewError(new Error("some_other_error"));

  expect(notFound?.status).toBe(404);
  expect(invalid?.status).toBe(400);
  expect(unknown).toBeNull();
});

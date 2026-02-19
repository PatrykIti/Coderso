import { expect, test } from "bun:test";

import {
  mapCommerceError,
  registerCommerceRoutes,
} from "../../../core/server/routes/commerceRoutes";

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
      put: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PUT", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

test("registerCommerceRoutes wires commerce endpoints", () => {
  const { router, routes } = makeRouter();

  registerCommerceRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /commerce/products",
      "GET /commerce/products/:id",
      "POST /commerce/products",
      "PATCH /commerce/products/:id",
      "DELETE /commerce/products/:id",
      "PUT /commerce/products/:id/collections",
      "POST /commerce/products/query",
      "GET /commerce/collections",
      "GET /commerce/collections/:id",
      "POST /commerce/collections",
      "PATCH /commerce/collections/:id",
      "DELETE /commerce/collections/:id",
    ])
  );
});

test("mapCommerceError maps domain errors to API errors", () => {
  const notFound = mapCommerceError(new Error("commerce_product_not_found"));
  const conflict = mapCommerceError(new Error("commerce_product_slug_exists"));
  const invalid = mapCommerceError(new Error("commerce_query_invalid_field"));
  const unknown = mapCommerceError(new Error("some_other_error"));

  expect(notFound?.status).toBe(404);
  expect(conflict?.status).toBe(409);
  expect(invalid?.status).toBe(400);
  expect(unknown).toBeNull();
});

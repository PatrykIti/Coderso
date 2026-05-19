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

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`missing route ${method} ${path}`);
  return route;
};

const runRoute = async (
  routes: Route[],
  method: string,
  path: string,
  ctx: Partial<RouteContext> = {}
) => {
  const route = findRoute(routes, method, path);
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      params: {},
      query: {},
      body: {},
      ...ctx,
    });
    if (output !== undefined) result = output;
  }
  return result;
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
  const collectionNotFound = mapCommerceError(new Error("commerce_collection_not_found"));
  const conflict = mapCommerceError(new Error("commerce_product_slug_exists"));
  const collectionConflict = mapCommerceError(new Error("commerce_collection_slug_exists"));
  const statusInvalid = mapCommerceError(new Error("commerce_status_invalid"));
  const invalid = mapCommerceError(new Error("commerce_query_invalid_field"));
  const unknown = mapCommerceError(new Error("some_other_error"));

  expect(notFound?.status).toBe(404);
  expect(collectionNotFound?.status).toBe(404);
  expect(conflict?.status).toBe(409);
  expect(collectionConflict?.status).toBe(409);
  expect(statusInvalid?.status).toBe(400);
  expect(statusInvalid?.code).toBe("commerce_status_invalid");
  expect(invalid?.status).toBe(400);
  expect(invalid?.code).toBe("commerce_query_invalid_field");
  expect(unknown).toBeNull();
});

test("product query route validates and forwards bounded productIds", async () => {
  const { router, routes } = makeRouter();
  const validatedPayloads: unknown[] = [];
  const executeCalls: unknown[] = [];

  registerCommerceRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (_schema, payload) => {
      validatedPayloads.push(payload);
    },
    executeQuery: async (input) => {
      executeCalls.push(input);
      return {
        total: 2,
        limit: 2,
        offset: 0,
        query: {
          filters: [],
          sort: [{ field: "title", dir: "asc" }],
          pagination: { limit: 2, offset: 0 },
          productIds: ["product-3", "product-1"],
        },
        rows: [],
      };
    },
  });

  const result = await runRoute(routes, "POST", "/commerce/products/query", {
    body: {
      filters: [],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 2, offset: 0 },
      productIds: ["product-3", "product-1"],
    },
  });

  expect(validatedPayloads).toEqual([
    {
      filters: [],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 2, offset: 0 },
      productIds: ["product-3", "product-1"],
    },
  ]);
  expect(executeCalls).toEqual(validatedPayloads);
  expect(result).toEqual({
    total: 2,
    limit: 2,
    offset: 0,
    query: {
      filters: [],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 2, offset: 0 },
      productIds: ["product-3", "product-1"],
    },
    rows: [],
  });
});

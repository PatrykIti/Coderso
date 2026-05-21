import { expect, test } from "bun:test";

import {
  registerProductTablePreviewRoutes,
  type ProductTablePreviewRouteHandler,
} from "../../../core/server/routes/productTablePreviewRoutes";

type Route = { method: string; path: string; handlers: ProductTablePreviewRouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      post: (path: string, ...handlers: ProductTablePreviewRouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
    },
  };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`missing route ${method} ${path}`);
  return route;
};

const runRoute = async (routes: Route[], ctx: { body?: unknown } = {}) => {
  const route = findRoute(routes, "POST", "/widgets/product-table/preview");
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

test("product table preview route resolves through backend-owned runtime hydration", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const validatedPayloads: unknown[] = [];
  const previewCalls: Array<Record<string, unknown>> = [];

  registerProductTablePreviewRoutes(router, {
    requirePermission: (permission) => async () => {
      requestedPermissions.push(permission);
    },
    validate: (_schema, payload) => {
      validatedPayloads.push(payload);
    },
    resolvePreview: async (input) => {
      previewCalls.push(input as Record<string, unknown>);
      return {
        ...input,
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern home.",
              status: "published",
              pricing: {
                amount: 120000,
                currency: "USD",
                compareAtAmount: null,
              },
              stock: {
                state: "in_stock",
                quantity: 3,
                inStock: true,
              },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: ["collection-1"],
              productHref: "/products/starter-home",
            },
          ],
          total: 1,
          resolvedAt: "2026-05-21T12:00:00.000Z",
        },
      };
    },
  });

  const result = await runRoute(routes, {
    body: {
      data: {
        source: {
          limit: 3,
          search: "starter",
        },
      },
    },
  });

  expect(requestedPermissions).toEqual(["commerce:read"]);
  expect(validatedPayloads).toHaveLength(1);
  expect(previewCalls).toHaveLength(1);
  expect(result).toEqual({
    items: [
      {
        id: "product-1",
        title: "Starter Home",
        slug: "starter-home",
        excerpt: "Compact modern home.",
        status: "published",
        pricing: {
          amount: 120000,
          currency: "USD",
          compareAtAmount: null,
        },
        stock: {
          state: "in_stock",
          quantity: 3,
          inStock: true,
        },
        primaryMediaId: null,
        mediaIds: [],
        collectionIds: ["collection-1"],
        productHref: "/products/starter-home",
      },
    ],
    total: 1,
    resolvedAt: "2026-05-21T12:00:00.000Z",
  });
});

test("product table preview route maps known commerce query errors", async () => {
  const { router, routes } = makeRouter();

  registerProductTablePreviewRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    resolvePreview: async () => {
      throw new Error("commerce_query_invalid_filters");
    },
  });

  await expect(
    runRoute(routes, {
      body: {
        data: {
          source: {
            limit: 3,
          },
        },
      },
    })
  ).rejects.toMatchObject({
    name: "ApiError",
    code: "commerce_query_invalid_filters",
    message: "Invalid Product Table preview payload",
    status: 400,
  });
});

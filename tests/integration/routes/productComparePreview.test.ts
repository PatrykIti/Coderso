import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import {
  registerProductComparePreviewRoutes,
  type ProductComparePreviewRouteHandler,
} from "../../../core/server/routes/productComparePreviewRoutes";

type Route = { method: string; path: string; handlers: ProductComparePreviewRouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      post: (path: string, ...handlers: ProductComparePreviewRouteHandler[]) =>
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
  const route = findRoute(routes, "POST", "/widgets/product-compare/preview");
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

test("product compare preview route resolves through backend-owned runtime hydration", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const validatedPayloads: unknown[] = [];
  const previewCalls: Array<Record<string, unknown>> = [];

  registerProductComparePreviewRoutes(router, {
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
          rows: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: "Compact modern home.",
              productHref: "/products/starter-home",
              imageUrl: "/media/product-1.jpg",
              imageAlt: "Starter Home hero",
              priceAmount: 120000,
              currency: "USD",
              compareAtAmount: null,
              stockState: "in_stock",
              stockQuantity: 3,
            },
          ],
          total: 1,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      };
    },
  });

  const result = await runRoute(routes, {
    body: {
      data: {
        source: {
          limit: 3,
          productIds: ["product-1"],
        },
      },
    },
  });

  expect(requestedPermissions).toEqual(["commerce:read"]);
  expect(validatedPayloads).toHaveLength(1);
  expect(previewCalls).toHaveLength(1);
  expect(result).toEqual({
    rows: [
      {
        id: "product-1",
        title: "Starter Home",
        slug: "starter-home",
        excerpt: "Compact modern home.",
        productHref: "/products/starter-home",
        imageUrl: "/media/product-1.jpg",
        imageAlt: "Starter Home hero",
        priceAmount: 120000,
        currency: "USD",
        compareAtAmount: null,
        stockState: "in_stock",
        stockQuantity: 3,
      },
    ],
    total: 1,
    resolvedAt: "2026-05-19T12:00:00.000Z",
  });
});

test("product compare preview route maps known commerce query errors", async () => {
  const { router, routes } = makeRouter();

  registerProductComparePreviewRoutes(router, {
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
    message: "Invalid Product Compare preview payload",
    status: 400,
  });
});

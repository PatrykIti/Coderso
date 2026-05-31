import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { registerProductGalleryPreviewRoutes } from "../../../core/server/routes/productGalleryPreviewRoutes";
import type { ProductGalleryPreviewRouteHandler } from "../../../core/server/routes/productGalleryPreviewRoutes";

type Route = {
  method: string;
  path: string;
  handlers: ProductGalleryPreviewRouteHandler[];
};

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      post: (path: string, ...handlers: Route["handlers"]) => {
        routes.push({ method: "POST", path, handlers });
      },
    },
  };
};

const runRoute = async (routes: Route[], body: unknown) => {
  const route = routes.find(
    (entry) => entry.method === "POST" && entry.path === "/widgets/product-gallery/preview"
  );
  if (!route) throw new Error("missing route");
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      body,
      params: {},
      query: {},
    });
    if (output !== undefined) {
      result = output;
    }
  }
  return result;
};

test("product gallery preview route validates and resolves preview payload", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const validatedPayloads: unknown[] = [];
  const previewFlags: boolean[] = [];

  registerProductGalleryPreviewRoutes(router, {
    requirePermission: (permission) => async () => {
      requestedPermissions.push(permission);
    },
    validate: (_schema, payload) => {
      validatedPayloads.push(payload);
    },
    resolvePreview: async (_data, options) => {
      previewFlags.push(options.preview);
      return {
        resolved: {
          items: [
            {
              id: "product-1",
              title: "Starter Home",
              slug: "starter-home",
              excerpt: null,
              status: "published",
              pricing: { amount: 19900, currency: "USD", compareAtAmount: null },
              stock: { state: "in_stock", quantity: 4, inStock: true },
              primaryMediaId: null,
              mediaIds: [],
              collectionIds: [],
            },
          ],
          total: 1,
          resolvedAt: "2026-05-19T10:00:00.000Z",
        },
      };
    },
  });

  const result = await runRoute(routes, {
    data: {
      source: {
        limit: 4,
      },
    },
  });

  expect(requestedPermissions).toEqual(["widgets:read"]);
  expect(validatedPayloads).toHaveLength(1);
  expect(previewFlags).toEqual([false]);
  expect(result).toEqual({
    items: [
      {
        id: "product-1",
        title: "Starter Home",
        slug: "starter-home",
        excerpt: null,
        status: "published",
        pricing: { amount: 19900, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: 4, inStock: true },
        primaryMediaId: null,
        mediaIds: [],
        collectionIds: [],
      },
    ],
    total: 1,
    resolvedAt: "2026-05-19T10:00:00.000Z",
  });
});

test("product gallery preview route rejects malformed resolved payloads", async () => {
  const { router, routes } = makeRouter();

  registerProductGalleryPreviewRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    resolvePreview: async () => ({}) as never,
  });

  try {
    await runRoute(routes, {
      data: {
        source: {
          limit: 4,
        },
      },
    });
    throw new Error("expected preview route to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("product_gallery_preview_invalid_response");
  }
});

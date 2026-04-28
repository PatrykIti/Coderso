import {
  createCommerceCollection,
  createCommerceProduct,
  deleteCommerceCollection,
  deleteCommerceProduct,
  getCommerceCollection,
  getCommerceProduct,
  listCommerceCollections,
  listCommerceProducts,
  setCommerceProductCollections,
  updateCommerceCollection,
  updateCommerceProduct,
  type CommerceCollectionCreateInput,
  type CommerceCollectionUpdateInput,
  type CommerceProductCreateInput,
  type CommerceProductUpdateInput,
} from "../../services/commerce/commerceService";
import {
  executeCommerceQuery,
  type CommerceQueryInput,
} from "../../services/commerce/commerceQueryService";
import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  commerceCollectionCreateSchema,
  commerceCollectionUpdateSchema,
  commerceProductCreateSchema,
  commerceProductUpdateSchema,
  commerceQuerySchema,
} from "../validation/commerceSchemas";

export type CommerceRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type CommerceRouteDeps = {
  requirePermission: (permission: string) => CommerceRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: CommerceRouteHandler[]) => void;
  post: (path: string, ...handlers: CommerceRouteHandler[]) => void;
  patch: (path: string, ...handlers: CommerceRouteHandler[]) => void;
  put: (path: string, ...handlers: CommerceRouteHandler[]) => void;
  delete: (path: string, ...handlers: CommerceRouteHandler[]) => void;
};

export const mapCommerceError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "commerce_product_not_found":
      return new ApiError("commerce_product_not_found", "Commerce product not found", 404);
    case "commerce_collection_not_found":
      return new ApiError("commerce_collection_not_found", "Commerce collection not found", 404);
    case "commerce_product_slug_exists":
      return new ApiError(
        "commerce_product_slug_exists",
        "Commerce product slug already exists",
        409
      );
    case "commerce_collection_slug_exists":
      return new ApiError(
        "commerce_collection_slug_exists",
        "Commerce collection slug already exists",
        409
      );
    default:
      if (error.message.startsWith("commerce_query_")) {
        return new ApiError(error.message, "Invalid commerce query payload", 400);
      }
      if (error.message.startsWith("commerce_")) {
        return new ApiError(error.message, "Invalid commerce payload", 400);
      }
      return null;
  }
};

const withCommerceErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapCommerceError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerCommerceRoutes(router: Router, deps: CommerceRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/commerce/products", requirePermission("commerce:read"), async () => {
    return withCommerceErrors(async () => {
      const items = await listCommerceProducts();
      return { items };
    });
  });

  router.get("/commerce/products/:id", requirePermission("commerce:read"), async (ctx) => {
    return withCommerceErrors(async () => {
      const item = await getCommerceProduct(ctx.params.id);
      if (!item) throw new Error("commerce_product_not_found");
      return item;
    });
  });

  router.post("/commerce/products", requirePermission("commerce:write"), async (ctx) => {
    return withCommerceErrors(async () => {
      validate(commerceProductCreateSchema, ctx.body ?? {});
      return createCommerceProduct((ctx.body ?? {}) as CommerceProductCreateInput);
    });
  });

  router.patch("/commerce/products/:id", requirePermission("commerce:write"), async (ctx) => {
    return withCommerceErrors(async () => {
      validate(commerceProductUpdateSchema, ctx.body ?? {});
      const updated = await updateCommerceProduct(
        ctx.params.id,
        (ctx.body ?? {}) as CommerceProductUpdateInput
      );
      if (!updated) throw new Error("commerce_product_not_found");
      return updated;
    });
  });

  router.delete("/commerce/products/:id", requirePermission("commerce:write"), async (ctx) => {
    return withCommerceErrors(async () => {
      const deleted = await deleteCommerceProduct(ctx.params.id);
      if (!deleted) throw new Error("commerce_product_not_found");
      return { ok: true };
    });
  });

  router.put(
    "/commerce/products/:id/collections",
    requirePermission("commerce:write"),
    async (ctx) => {
      return withCommerceErrors(async () => {
        const payload = ctx.body ?? {};
        validate(
          {
            type: "object",
            required: ["collectionIds"],
            properties: {
              collectionIds: {
                type: "array",
                maxItems: 100,
                uniqueItems: true,
                items: {
                  type: "string",
                },
              },
            },
            additionalProperties: false,
          },
          payload
        );
        const updated = await setCommerceProductCollections(
          ctx.params.id,
          (payload as { collectionIds: string[] }).collectionIds
        );
        if (!updated) throw new Error("commerce_product_not_found");
        return updated;
      });
    }
  );

  router.post("/commerce/products/query", requirePermission("commerce:read"), async (ctx) => {
    return withCommerceErrors(async () => {
      validate(commerceQuerySchema, ctx.body ?? {});
      const result = await executeCommerceQuery((ctx.body ?? {}) as CommerceQueryInput);
      return result;
    });
  });

  router.get("/commerce/collections", requirePermission("commerce:read"), async () => {
    return withCommerceErrors(async () => {
      const items = await listCommerceCollections();
      return { items };
    });
  });

  router.get("/commerce/collections/:id", requirePermission("commerce:read"), async (ctx) => {
    return withCommerceErrors(async () => {
      const item = await getCommerceCollection(ctx.params.id);
      if (!item) throw new Error("commerce_collection_not_found");
      return item;
    });
  });

  router.post("/commerce/collections", requirePermission("commerce:write"), async (ctx) => {
    return withCommerceErrors(async () => {
      validate(commerceCollectionCreateSchema, ctx.body ?? {});
      return createCommerceCollection((ctx.body ?? {}) as CommerceCollectionCreateInput);
    });
  });

  router.patch(
    "/commerce/collections/:id",
    requirePermission("commerce:write"),
    async (ctx) => {
      return withCommerceErrors(async () => {
        validate(commerceCollectionUpdateSchema, ctx.body ?? {});
        const updated = await updateCommerceCollection(
          ctx.params.id,
          (ctx.body ?? {}) as CommerceCollectionUpdateInput
        );
        if (!updated) throw new Error("commerce_collection_not_found");
        return updated;
      });
    }
  );

  router.delete("/commerce/collections/:id", requirePermission("commerce:write"), async (ctx) => {
    return withCommerceErrors(async () => {
      const deleted = await deleteCommerceCollection(ctx.params.id);
      if (!deleted) throw new Error("commerce_collection_not_found");
      return { ok: true };
    });
  });
}

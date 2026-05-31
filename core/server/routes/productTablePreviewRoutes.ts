import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  normalizeProductTableData,
  productTableSchema,
  type ProductTableData,
} from "../../widgets/core/productTable";
import { hydrateProductTableRuntimeData } from "../../services/commerce/commerceWidgetRuntime";

export type ProductTablePreviewRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type ProductTablePreviewRouteDeps = {
  requirePermission: (permission: string) => ProductTablePreviewRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  resolvePreview?: typeof hydrateProductTableRuntimeData;
};

export type Router = {
  post: (path: string, ...handlers: ProductTablePreviewRouteHandler[]) => void;
};

const productTablePreviewSchema = {
  type: "object",
  required: ["data"],
  additionalProperties: false,
  properties: {
    data: productTableSchema,
  },
} as const;

export const mapProductTablePreviewError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  if (error.message.startsWith("commerce_query_")) {
    return new ApiError(error.message, "Invalid Product Table preview payload", 400);
  }
  return null;
};

const withProductTablePreviewErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapProductTablePreviewError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerProductTablePreviewRoutes(
  router: Router,
  deps: ProductTablePreviewRouteDeps
) {
  const { requirePermission, validate } = deps;
  const resolvePreview = deps.resolvePreview ?? hydrateProductTableRuntimeData;

  router.post("/widgets/product-table/preview", requirePermission("commerce:read"), async (ctx) =>
    withProductTablePreviewErrors(async () => {
      validate(productTablePreviewSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { data: ProductTableData };
      const resolved = await resolvePreview(body.data, { preview: true });
      return normalizeProductTableData(resolved).resolved;
    })
  );
}

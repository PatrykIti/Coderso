import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  normalizeProductCompareData,
  productCompareSchema,
  type ProductCompareData,
} from "../../widgets/core/productCompare";
import { hydrateProductCompareRuntimeData } from "../../services/commerce/commerceWidgetRuntime";

export type ProductComparePreviewRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type ProductComparePreviewRouteDeps = {
  requirePermission: (permission: string) => ProductComparePreviewRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  resolvePreview?: typeof hydrateProductCompareRuntimeData;
};

export type Router = {
  post: (path: string, ...handlers: ProductComparePreviewRouteHandler[]) => void;
};

const productComparePreviewSchema = {
  type: "object",
  required: ["data"],
  additionalProperties: false,
  properties: {
    data: productCompareSchema,
  },
} as const;

export const mapProductComparePreviewError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  if (error.message.startsWith("commerce_query_")) {
    return new ApiError(error.message, "Invalid Product Compare preview payload", 400);
  }
  return null;
};

const withProductComparePreviewErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapProductComparePreviewError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerProductComparePreviewRoutes(
  router: Router,
  deps: ProductComparePreviewRouteDeps
) {
  const { requirePermission, validate } = deps;
  const resolvePreview = deps.resolvePreview ?? hydrateProductCompareRuntimeData;

  router.post("/widgets/product-compare/preview", requirePermission("commerce:read"), async (ctx) =>
    withProductComparePreviewErrors(async () => {
      validate(productComparePreviewSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { data: ProductCompareData };
      const resolved = await resolvePreview(body.data, { preview: true });
      return normalizeProductCompareData(resolved).resolved;
    })
  );
}

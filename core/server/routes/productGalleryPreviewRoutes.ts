import type { RouteContext } from "../router";
import { ApiError } from "../errorHandler";
import { productGallerySchema, type ProductGalleryData } from "../../widgets/core/productGallery";
import { hydrateProductGalleryRuntimeData } from "../../services/commerce/commerceWidgetRuntime";

export type ProductGalleryPreviewRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type ProductGalleryPreviewRouteDeps = {
  requirePermission: (permission: string) => ProductGalleryPreviewRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  resolvePreview?: typeof hydrateProductGalleryRuntimeData;
};

export type Router = {
  post: (path: string, ...handlers: ProductGalleryPreviewRouteHandler[]) => void;
};

const productGalleryPreviewSchema = {
  type: "object",
  required: ["data"],
  additionalProperties: false,
  properties: {
    data: productGallerySchema,
  },
};

const resolveProductGalleryPreviewPayload = (value: ProductGalleryData["resolved"] | undefined) => {
  if (!value || !Array.isArray(value.items) || typeof value.total !== "number") {
    throw new Error("product_gallery_preview_invalid_response");
  }
  return value;
};

export const mapProductGalleryPreviewError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "product_gallery_preview_invalid_response":
      return new ApiError(
        "product_gallery_preview_invalid_response",
        "Invalid Product Gallery preview response",
        500
      );
    default:
      return null;
  }
};

const withProductGalleryPreviewErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapProductGalleryPreviewError(error);
    if (mapped) throw mapped;
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      throw new ApiError("product_gallery_preview_error", error.message, 500);
    }
    throw error;
  }
};

export function registerProductGalleryPreviewRoutes(
  router: Router,
  deps: ProductGalleryPreviewRouteDeps
) {
  const { requirePermission, validate } = deps;
  const resolvePreview = deps.resolvePreview ?? hydrateProductGalleryRuntimeData;

  router.post("/widgets/product-gallery/preview", requirePermission("widgets:read"), async (ctx) =>
    withProductGalleryPreviewErrors(async () => {
      validate(productGalleryPreviewSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { data: ProductGalleryData };
      const resolved = await resolvePreview(body.data, {
        // Match published-runtime semantics by default; explicit status filters can
        // still opt into draft/archived products through the widget data itself.
        preview: false,
      });
      return resolveProductGalleryPreviewPayload(resolved.resolved);
    })
  );
}

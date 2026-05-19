import { apiRequest } from "./apiClient";

import type { ProductGalleryData } from "../../widgets/core/productGallery";

export type ProductGalleryPreviewResponse = NonNullable<ProductGalleryData["resolved"]>;

export async function previewProductGallery(data: ProductGalleryData) {
  return apiRequest<ProductGalleryPreviewResponse>(
    "/widgets/product-gallery/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
    { withCsrf: true }
  );
}

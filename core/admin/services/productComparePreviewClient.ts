import { apiRequest } from "./apiClient";

import type { ProductCompareData } from "../../widgets/core/productCompare";

export type ProductComparePreviewResponse = NonNullable<ProductCompareData["resolved"]>;

export async function previewProductCompare(data: ProductCompareData) {
  return apiRequest<ProductComparePreviewResponse>(
    "/widgets/product-compare/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
    { withCsrf: true }
  );
}

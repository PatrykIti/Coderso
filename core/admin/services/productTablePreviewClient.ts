import { apiRequest } from "./apiClient";

import type { ProductTableData } from "../../widgets/core/productTable";

export type ProductTablePreviewResponse = NonNullable<ProductTableData["resolved"]>;

export async function previewProductTable(
  data: ProductTableData,
  options?: { signal?: AbortSignal }
) {
  return apiRequest<ProductTablePreviewResponse>(
    "/widgets/product-table/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      signal: options?.signal,
    },
    { withCsrf: true }
  );
}

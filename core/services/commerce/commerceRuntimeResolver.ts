import { executeCommerceQuery, type CommerceQueryInput } from "./commerceQueryService";
import type { CommerceProduct } from "./commerceTypes";

export type CommerceRuntimeCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: CommerceProduct["status"];
  pricing: CommerceProduct["pricing"];
  stock: CommerceProduct["stock"] & { inStock: boolean };
  primaryMediaId: string | null;
  mediaIds: string[];
  collectionIds: string[];
};

export type CommerceRuntimeCompareRow = {
  id: string;
  title: string;
  slug: string;
  priceAmount: number;
  currency: string;
  compareAtAmount: number | null;
  stockState: CommerceProduct["stock"]["state"];
  stockQuantity: number | null;
};

export type CommerceCompareRuntimePayload = {
  generatedAt: string;
  rows: CommerceRuntimeCompareRow[];
};

export type CommerceWishlistRuntimePayload = {
  total: number;
  items: CommerceRuntimeCard[];
};

export type CommerceRuntimeResolveInput = {
  query?: CommerceQueryInput;
  preview?: boolean;
};

type RuntimeResolverDeps = {
  executeQuery: typeof executeCommerceQuery;
};

const defaultDeps: RuntimeResolverDeps = {
  executeQuery: executeCommerceQuery,
};

export const toCommerceRuntimeCard = (product: CommerceProduct): CommerceRuntimeCard => ({
  id: product.id,
  title: product.title,
  slug: product.slug,
  excerpt: product.excerpt ?? null,
  status: product.status,
  pricing: product.pricing,
  stock: {
    ...product.stock,
    inStock:
      product.stock.state === "in_stock" ||
      (product.stock.state === "backorder" && (product.stock.quantity ?? 0) > 0),
  },
  primaryMediaId: product.mediaIds[0] ?? null,
  mediaIds: product.mediaIds,
  collectionIds: product.collectionIds,
});

export const buildCommerceComparePayload = (
  products: CommerceProduct[]
): CommerceCompareRuntimePayload => ({
  generatedAt: new Date().toISOString(),
  rows: products.map((product) => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    priceAmount: product.pricing.amount,
    currency: product.pricing.currency,
    compareAtAmount: product.pricing.compareAtAmount,
    stockState: product.stock.state,
    stockQuantity: product.stock.quantity,
  })),
});

export const buildCommerceWishlistPayload = (
  products: CommerceProduct[]
): CommerceWishlistRuntimePayload => ({
  total: products.length,
  items: products.map((product) => toCommerceRuntimeCard(product)),
});

export async function resolveCommerceRuntimeProducts(
  input: CommerceRuntimeResolveInput = {},
  deps: Partial<RuntimeResolverDeps> = {}
) {
  const runtimeDeps: RuntimeResolverDeps = {
    ...defaultDeps,
    ...deps,
  };
  const preview = Boolean(input.preview);
  const query = input.query ?? {};

  const statusFilter = Array.isArray(query.status) ? query.status : [];
  const runtimeStatus =
    preview || statusFilter.length > 0
      ? statusFilter
      : (["published"] as const);

  const result = await runtimeDeps.executeQuery({
    ...query,
    ...(runtimeStatus.length > 0 ? { status: [...runtimeStatus] } : {}),
  });

  return {
    ...result,
    cards: result.rows.map((product) => toCommerceRuntimeCard(product)),
  };
}

import { executeCommerceQuery, type CommerceQueryInput } from "./commerceQueryService";
import type { CommerceProduct } from "./commerceTypes";
import { getMediaById } from "../media/mediaService";
import {
  getSetting,
  normalizeContentRoutes,
  type ContentRouteSetting,
} from "../settings/settingsService";

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
  excerpt: string | null;
  productHref: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
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

type ComparePayloadDeps = {
  getContentRoutes: () => Promise<ContentRouteSetting[]>;
  readMedia: typeof getMediaById;
  now: () => string;
};

const loadContentRoutes = async () =>
  normalizeContentRoutes(await getSetting("site.contentRoutes"));

const defaultComparePayloadDeps: ComparePayloadDeps = {
  getContentRoutes: loadContentRoutes,
  readMedia: getMediaById,
  now: () => new Date().toISOString(),
};

const readOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildDetailHref = (pattern: string, slug: string, id: string) => {
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

export const resolveCommerceProductHref = (
  contentRoutes: ContentRouteSetting[],
  product: CommerceProduct
) => {
  const route = contentRoutes.find((entry) => entry.enabled && entry.type === "products");
  const detailPath = route?.detailPath;
  if (!detailPath) return null;
  const href = buildDetailHref(detailPath, product.slug, product.id);
  return href.startsWith("/") ? href : null;
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

export async function buildCommerceComparePayload(
  products: CommerceProduct[],
  deps: Partial<ComparePayloadDeps> = {}
): Promise<CommerceCompareRuntimePayload> {
  const compareDeps: ComparePayloadDeps = {
    ...defaultComparePayloadDeps,
    ...deps,
  };
  const contentRoutes = await compareDeps.getContentRoutes();
  const mediaCache = new Map<string, Awaited<ReturnType<typeof getMediaById>> | null>();

  const loadMedia = async (mediaId: string) => {
    if (mediaCache.has(mediaId)) return mediaCache.get(mediaId) ?? null;
    try {
      const media = await compareDeps.readMedia(mediaId);
      mediaCache.set(mediaId, media);
      return media;
    } catch {
      mediaCache.set(mediaId, null);
      return null;
    }
  };

  const rows = await Promise.all(
    products.map(async (product) => {
      const primaryMediaId = product.mediaIds[0] ?? null;
      const media = primaryMediaId ? await loadMedia(primaryMediaId) : null;
      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        excerpt: product.excerpt ?? null,
        productHref: resolveCommerceProductHref(contentRoutes, product),
        imageUrl: readOptionalText(media?.url) ?? null,
        imageAlt: readOptionalText(media?.alt) ?? readOptionalText(media?.title) ?? product.title,
        priceAmount: product.pricing.amount,
        currency: product.pricing.currency,
        compareAtAmount: product.pricing.compareAtAmount,
        stockState: product.stock.state,
        stockQuantity: product.stock.quantity,
      } satisfies CommerceRuntimeCompareRow;
    })
  );

  return {
    generatedAt: compareDeps.now(),
    rows,
  };
}

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
    preview || statusFilter.length > 0 ? statusFilter : (["published"] as const);

  const result = await runtimeDeps.executeQuery({
    ...query,
    ...(runtimeStatus.length > 0 ? { status: [...runtimeStatus] } : {}),
  });

  return {
    ...result,
    cards: result.rows.map((product) => toCommerceRuntimeCard(product)),
  };
}

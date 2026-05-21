import {
  buildProductCompareQueryInput,
  normalizeProductCompareData,
  type ProductCompareData,
} from "../../widgets/core/productCompare";
import {
  buildProductGalleryQueryInput,
  normalizeProductGalleryData,
  type ProductGalleryData,
  type ProductGalleryRuntimeItem,
} from "../../widgets/core/productGallery";
import {
  buildProductTableQueryInput,
  normalizeProductTableData,
  type ProductTableData,
} from "../../widgets/core/productTable";
import { getMediaById } from "../media/mediaService";
import { listCommerceProducts } from "./commerceService";
import {
  buildCommerceComparePayload,
  buildCommerceProductHrefMap,
  resolveCommerceRuntimeProducts,
  toCommerceRuntimeCard,
} from "./commerceRuntimeResolver";

export type CommerceRuntimeCache = Map<
  string,
  Awaited<ReturnType<typeof resolveCommerceRuntimeProducts>>
>;

type CommerceWidgetRuntimeDeps = {
  resolveRuntimeProducts: typeof resolveCommerceRuntimeProducts;
  buildComparePayload: typeof buildCommerceComparePayload;
  buildProductHrefMap: typeof buildCommerceProductHrefMap;
  getMediaById: typeof getMediaById;
  listProducts: typeof listCommerceProducts;
};

type CommerceWidgetRuntimeOptions = {
  preview: boolean;
  cache?: CommerceRuntimeCache;
};

const defaultDeps: CommerceWidgetRuntimeDeps = {
  resolveRuntimeProducts: resolveCommerceRuntimeProducts,
  buildComparePayload: buildCommerceComparePayload,
  buildProductHrefMap: buildCommerceProductHrefMap,
  getMediaById,
  listProducts: listCommerceProducts,
};

const readRuntimeErrorCode = (error: unknown) => {
  if (!(error instanceof Error)) return "commerce_runtime_error";
  return error.message.startsWith("commerce_query_") ? error.message : "commerce_runtime_error";
};

const resolveWithCache = async (
  options: CommerceWidgetRuntimeOptions,
  query: Record<string, unknown>,
  deps: CommerceWidgetRuntimeDeps
) => {
  if (!options.cache) {
    return deps.resolveRuntimeProducts({
      query,
      preview: options.preview,
    });
  }

  const key = JSON.stringify({ preview: options.preview, query });
  const hit = options.cache.get(key);
  if (hit) return hit;

  const resolved = await deps.resolveRuntimeProducts({
    query,
    preview: options.preview,
  });
  options.cache.set(key, resolved);
  return resolved;
};

const resolveManualProductGalleryItems = async (
  value: ProductGalleryData,
  options: CommerceWidgetRuntimeOptions,
  deps: CommerceWidgetRuntimeDeps
) => {
  const normalized = normalizeProductGalleryData(value);
  const productIds = normalized.curation?.productIds ?? [];
  if (productIds.length === 0) {
    return { cards: [] as ProductGalleryRuntimeItem[], total: 0 };
  }

  const statusFilter = normalized.source?.status ?? [];
  const allowedStatuses: Array<"draft" | "published" | "archived"> =
    options.preview || statusFilter.length > 0 ? [...statusFilter] : ["published"];
  const products = await deps.listProducts();
  const filteredProducts =
    allowedStatuses.length > 0
      ? products.filter((product) => allowedStatuses.includes(product.status))
      : products;
  const productMap = new Map(filteredProducts.map((product) => [product.id, product]));
  const ordered = productIds
    .map((id) => productMap.get(id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));
  const pageSize = normalized.source?.limit ?? 8;
  const cards = ordered.slice(0, pageSize).map((product) => toCommerceRuntimeCard(product));
  return {
    cards,
    total: ordered.length,
  };
};

const attachProductGalleryMedia = async (
  cards: ProductGalleryRuntimeItem[],
  deps: CommerceWidgetRuntimeDeps
) => {
  const lookupIds = Array.from(
    new Set(
      cards
        .map((card) => card.primaryMediaId ?? card.mediaIds[0] ?? null)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const mediaById = new Map<
    string,
    { url: string; alt: string | null; width: number | null; height: number | null } | null
  >();

  await Promise.all(
    lookupIds.map(async (id) => {
      try {
        const media = await deps.getMediaById(id);
        if (!media || media.type !== "image" || !media.url) {
          mediaById.set(id, null);
          return;
        }
        mediaById.set(id, {
          url: media.url,
          alt: media.alt ?? media.title ?? null,
          width: media.width ?? null,
          height: media.height ?? null,
        });
      } catch {
        mediaById.set(id, null);
      }
    })
  );

  return cards.map((card) => {
    const mediaId = card.primaryMediaId ?? card.mediaIds[0] ?? null;
    const media = mediaId ? (mediaById.get(mediaId) ?? null) : null;
    return {
      ...card,
      ...(media ? { media } : {}),
    } satisfies ProductGalleryRuntimeItem;
  });
};

const resolveProductGalleryRuntime = async (
  value: ProductGalleryData,
  options: CommerceWidgetRuntimeOptions,
  deps: CommerceWidgetRuntimeDeps
) => {
  const normalized = normalizeProductGalleryData(value);
  if (normalized.curation?.mode === "manual") {
    return resolveManualProductGalleryItems(normalized, options, deps);
  }

  const runtime = await resolveWithCache(options, buildProductGalleryQueryInput(normalized), deps);
  return {
    cards: runtime.cards,
    total: runtime.total,
  };
};

export async function hydrateProductGalleryRuntimeData(
  value: ProductGalleryData,
  options: CommerceWidgetRuntimeOptions,
  deps: Partial<CommerceWidgetRuntimeDeps> = {}
): Promise<ProductGalleryData> {
  const runtimeDeps: CommerceWidgetRuntimeDeps = {
    ...defaultDeps,
    ...deps,
  };

  const normalized = normalizeProductGalleryData(value);
  try {
    const runtime = await resolveProductGalleryRuntime(normalized, options, runtimeDeps);
    const items = await attachProductGalleryMedia(runtime.cards, runtimeDeps);

    return {
      ...normalized,
      resolved: {
        items,
        total: runtime.total,
        resolvedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      ...normalized,
      resolved: {
        items: [],
        total: 0,
        resolvedAt: new Date().toISOString(),
        error: readRuntimeErrorCode(error),
      },
    };
  }
}

export async function hydrateProductCompareRuntimeData(
  value: ProductCompareData,
  options: CommerceWidgetRuntimeOptions,
  deps: Partial<CommerceWidgetRuntimeDeps> = {}
): Promise<ProductCompareData> {
  const runtimeDeps: CommerceWidgetRuntimeDeps = {
    ...defaultDeps,
    ...deps,
  };

  const normalized = normalizeProductCompareData(value);
  try {
    const runtime = await resolveWithCache(
      options,
      buildProductCompareQueryInput(normalized),
      runtimeDeps
    );
    const payload = await runtimeDeps.buildComparePayload(runtime.rows);

    return {
      ...normalized,
      resolved: {
        rows: payload.rows,
        total: runtime.total,
        resolvedAt: payload.generatedAt,
      },
    };
  } catch (error) {
    return {
      ...normalized,
      resolved: {
        rows: [],
        total: 0,
        resolvedAt: new Date().toISOString(),
        error: readRuntimeErrorCode(error),
      },
    };
  }
}

export async function hydrateProductTableRuntimeData(
  value: ProductTableData,
  options: CommerceWidgetRuntimeOptions,
  deps: Partial<CommerceWidgetRuntimeDeps> = {}
): Promise<ProductTableData> {
  const runtimeDeps: CommerceWidgetRuntimeDeps = {
    ...defaultDeps,
    ...deps,
  };

  const normalized = normalizeProductTableData(value);
  try {
    const runtime = await resolveWithCache(
      options,
      buildProductTableQueryInput(normalized),
      runtimeDeps
    );
    const productHrefMap = await runtimeDeps.buildProductHrefMap(runtime.rows);
    const items = runtime.cards.map((card) => ({
      ...card,
      productHref: productHrefMap.get(card.id) ?? null,
    }));

    return {
      ...normalized,
      resolved: {
        items,
        total: runtime.total,
        resolvedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      ...normalized,
      resolved: {
        items: [],
        total: 0,
        resolvedAt: new Date().toISOString(),
        error: readRuntimeErrorCode(error),
      },
    };
  }
}

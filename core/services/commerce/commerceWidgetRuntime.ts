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
  buildProductTableRuntimeHref,
  buildProductTableRuntimeParamKeys,
  normalizeProductTableControls,
  normalizeProductTableData,
  resolveProductTableAuthoredPageSize,
  type ProductTableData,
  type ProductTableResolvedRuntime,
  type ProductTableRuntimeCollectionOption,
  type ProductTableRuntimeItem,
  type ProductTableRuntimeRetainedParam,
} from "../../widgets/core/productTable";
import { getMediaById } from "../media/mediaService";
import { listCommerceCollections, listCommerceProducts } from "./commerceService";
import {
  buildCommerceComparePayload,
  buildCommerceProductHrefMap,
  resolveCommerceRuntimeProducts,
  toCommerceRuntimeCard,
} from "./commerceRuntimeResolver";
import {
  commerceSortFieldLabelMap,
  commerceWidgetStatusValues,
  type CommerceWidgetSortDirection,
  type CommerceWidgetSortField,
  type CommerceWidgetStatus,
} from "../../widgets/core/commerceWidgetShared";

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
  listCollections: typeof listCommerceCollections;
};

type CommerceWidgetRuntimeOptions = {
  preview: boolean;
  cache?: CommerceRuntimeCache;
  runtimeSearchParams?: URLSearchParams;
  blockId?: string;
};

const defaultDeps: CommerceWidgetRuntimeDeps = {
  resolveRuntimeProducts: resolveCommerceRuntimeProducts,
  buildComparePayload: buildCommerceComparePayload,
  buildProductHrefMap: buildCommerceProductHrefMap,
  getMediaById,
  listProducts: listCommerceProducts,
  listCollections: listCommerceCollections,
};

const productTablePublicSearchMaxLength = 160;
const productTableLoadMoreQueryLimitMax = 100;
const productTablePagedOffsetMax = 5000;

type ProductTablePublicRuntimeState = {
  searchQuery: string;
  collectionIds: string[];
  status: CommerceWidgetStatus[];
  sortField: CommerceWidgetSortField;
  sortDir: CommerceWidgetSortDirection;
  page: number;
  rejectedTokens: string[];
};

const readRuntimeErrorCode = (error: unknown) => {
  if (!(error instanceof Error)) return "commerce_runtime_error";
  return error.message.startsWith("commerce_query_") ? error.message : "commerce_runtime_error";
};

const readOptionalText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeRuntimeValueList = (value: string[]) =>
  Array.from(new Set(value.map((entry) => entry.trim()).filter(Boolean)));

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

const attachProductTableMedia = async (
  items: ProductTableRuntimeItem[],
  deps: CommerceWidgetRuntimeDeps
): Promise<ProductTableRuntimeItem[]> => {
  const lookupIds = Array.from(
    new Set(
      items
        .map((item) => item.primaryMediaId ?? item.mediaIds[0] ?? null)
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

  return items.map((item) => {
    const mediaId = item.primaryMediaId ?? item.mediaIds[0] ?? null;
    const media = mediaId ? (mediaById.get(mediaId) ?? null) : null;
    return {
      ...item,
      media: media
        ? {
            url: media.url,
            alt: media.alt ?? item.title,
            width: media.width,
            height: media.height,
          }
        : null,
    } satisfies ProductTableRuntimeItem;
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

const resolveProductTablePublicAvailableStatuses = (
  normalized: ProductTableData,
  options: CommerceWidgetRuntimeOptions
) => {
  const sourceStatuses = normalized.source?.status ?? [];
  if (options.preview) {
    return sourceStatuses.length > 0 ? [...sourceStatuses] : [...commerceWidgetStatusValues];
  }
  if (sourceStatuses.length === 0) {
    return ["published"] as CommerceWidgetStatus[];
  }
  return sourceStatuses.filter((status): status is CommerceWidgetStatus => status === "published");
};

const resolveProductTableRuntimeRetainedParams = (
  runtimeSearchParams: URLSearchParams | undefined,
  blockId: string | undefined
): ProductTableRuntimeRetainedParam[] => {
  if (!runtimeSearchParams) return [];
  const keys = buildProductTableRuntimeParamKeys(blockId);
  const ownedNames = new Set(Object.values(keys));
  const params: ProductTableRuntimeRetainedParam[] = [];
  for (const [name, value] of runtimeSearchParams.entries()) {
    if (ownedNames.has(name)) continue;
    params.push({ name, value });
  }
  return params;
};

const resolveProductTablePublicAvailableCollections = async (
  normalized: ProductTableData,
  controls: ReturnType<typeof normalizeProductTableControls>,
  deps: CommerceWidgetRuntimeDeps
): Promise<ProductTableRuntimeCollectionOption[]> => {
  if (!controls.showCollectionFilter) return [];
  const sourceCollectionIds = normalized.source?.collectionIds ?? [];
  if (sourceCollectionIds.length <= 1) return [];
  const collections = await deps.listCollections();
  const byId = new Map(collections.map((collection) => [collection.id, collection] as const));
  return sourceCollectionIds.map((id) => {
    const match = byId.get(id);
    return {
      id,
      label: readOptionalText(match?.name) || id,
      ...(readOptionalText(match?.slug) ? { slug: readOptionalText(match?.slug) } : {}),
    } satisfies ProductTableRuntimeCollectionOption;
  });
};

const resolveProductTableMaxPage = ({
  pagination,
  pageSize,
}: {
  pagination: ReturnType<typeof normalizeProductTableControls>["pagination"];
  pageSize: number;
}) => {
  if (pagination === "load-more") {
    return Math.max(1, Math.floor(productTableLoadMoreQueryLimitMax / Math.max(1, pageSize)));
  }
  if (pagination === "paged") {
    return Math.max(1, Math.floor(productTablePagedOffsetMax / Math.max(1, pageSize)) + 1);
  }
  return 1;
};

const resolveProductTablePublicRuntimeState = ({
  normalized,
  controls,
  options,
  availableCollections,
  availableStatuses,
}: {
  normalized: ProductTableData;
  controls: ReturnType<typeof normalizeProductTableControls>;
  options: CommerceWidgetRuntimeOptions;
  availableCollections: ProductTableRuntimeCollectionOption[];
  availableStatuses: CommerceWidgetStatus[];
}): ProductTablePublicRuntimeState => {
  const runtimeSearchParams = options.runtimeSearchParams;
  const keys = buildProductTableRuntimeParamKeys(options.blockId);
  const rejectedTokens = new Set<string>();
  const baselineSortField = normalized.source?.sortField ?? "updatedAt";
  const baselineSortDir = normalized.source?.sortDir ?? "desc";
  const pageSize = resolveProductTableAuthoredPageSize(normalized);
  const allowedCollectionIds = new Set(availableCollections.map((item) => item.id));
  const allowedStatuses = new Set(availableStatuses);

  const searchValues = runtimeSearchParams?.getAll(keys.search) ?? [];
  const searchCandidate = readOptionalText(searchValues[0]);
  const searchQuery = (() => {
    if (!controls.showSearchInput) {
      if (searchValues.length > 0) rejectedTokens.add("search");
      return "";
    }
    if (searchValues.length > 1) rejectedTokens.add("search");
    if (!searchCandidate) return "";
    if (searchCandidate.length > productTablePublicSearchMaxLength) {
      rejectedTokens.add("search");
      return "";
    }
    return searchCandidate;
  })();

  const collectionValues = normalizeRuntimeValueList(
    runtimeSearchParams?.getAll(keys.collection) ?? []
  );
  const collectionIds = (() => {
    if (availableCollections.length <= 1) {
      if (collectionValues.length > 0) rejectedTokens.add("collection");
      return [] as string[];
    }
    const next = collectionValues.filter((value) => allowedCollectionIds.has(value));
    if (next.length !== collectionValues.length) rejectedTokens.add("collection");
    return next;
  })();

  const statusValues = normalizeRuntimeValueList(runtimeSearchParams?.getAll(keys.status) ?? []);
  const status = (() => {
    if (availableStatuses.length <= 1) {
      if (statusValues.length > 0) rejectedTokens.add("status");
      return [] as CommerceWidgetStatus[];
    }
    const next = statusValues.filter((value): value is CommerceWidgetStatus =>
      allowedStatuses.has(value as CommerceWidgetStatus)
    );
    if (next.length !== statusValues.length) rejectedTokens.add("status");
    return next;
  })();

  const rawSortField = readOptionalText(runtimeSearchParams?.get(keys.sort));
  const rawSortDir = readOptionalText(runtimeSearchParams?.get(keys.dir));
  const sortField = (() => {
    if (controls.sorting === "none") {
      if (rawSortField || rawSortDir) rejectedTokens.add("sort");
      return baselineSortField;
    }
    if (rawSortField && rawSortField in commerceSortFieldLabelMap) {
      return rawSortField as CommerceWidgetSortField;
    }
    if (rawSortField) rejectedTokens.add("sort");
    return baselineSortField;
  })();
  const sortDir = (() => {
    if (controls.sorting === "none") return baselineSortDir;
    if (rawSortDir === "asc" || rawSortDir === "desc") return rawSortDir;
    if (rawSortDir) rejectedTokens.add("sort");
    return baselineSortDir;
  })();

  const rawPage = Number(runtimeSearchParams?.get(keys.page) ?? "1");
  const maxPage = resolveProductTableMaxPage({
    pagination: controls.pagination,
    pageSize,
  });
  const page = (() => {
    if (controls.pagination === "none") {
      if (runtimeSearchParams?.has(keys.page)) rejectedTokens.add("page");
      return 1;
    }
    if (!Number.isFinite(rawPage)) {
      rejectedTokens.add("page");
      return 1;
    }
    const normalizedPage = Math.floor(rawPage);
    if (normalizedPage < 1) {
      rejectedTokens.add("page");
      return 1;
    }
    if (normalizedPage > maxPage) {
      rejectedTokens.add("page");
      return maxPage;
    }
    return normalizedPage;
  })();

  return {
    searchQuery,
    collectionIds,
    status,
    sortField,
    sortDir,
    page,
    rejectedTokens: [...rejectedTokens],
  };
};

const resolveProductTablePublicQueryInput = ({
  normalized,
  controls,
  state,
  options,
}: {
  normalized: ProductTableData;
  controls: ReturnType<typeof normalizeProductTableControls>;
  state: ProductTablePublicRuntimeState;
  options: CommerceWidgetRuntimeOptions;
}) => {
  const baseQuery = buildProductTableQueryInput(normalized);
  const baselinePublicStatuses = resolveProductTablePublicAvailableStatuses(normalized, options);
  const pageSize = resolveProductTableAuthoredPageSize(normalized);

  const pagination = (() => {
    if (controls.pagination === "paged") {
      return {
        limit: pageSize,
        offset: (state.page - 1) * pageSize,
      };
    }
    if (controls.pagination === "load-more") {
      return {
        limit: Math.min(productTableLoadMoreQueryLimitMax, pageSize * state.page),
        offset: 0,
      };
    }
    return baseQuery.pagination;
  })();

  const query: Record<string, unknown> = {
    ...baseQuery,
    sort: [{ field: state.sortField, dir: state.sortDir }],
    pagination,
  };

  if (state.searchQuery) {
    query.search = state.searchQuery;
  }

  const effectiveCollectionIds =
    state.collectionIds.length > 0 ? state.collectionIds : (normalized.source?.collectionIds ?? []);
  if (effectiveCollectionIds.length > 0) {
    query.collectionIds = effectiveCollectionIds;
  }

  const effectiveStatuses = state.status.length > 0 ? state.status : baselinePublicStatuses;
  if (effectiveStatuses.length > 0) {
    const publishedOnly = effectiveStatuses.length === 1 && effectiveStatuses[0] === "published";
    if (options.preview || !publishedOnly) {
      query.status = effectiveStatuses;
    } else {
      delete query.status;
    }
  } else {
    delete query.status;
  }

  return {
    query,
    effectiveStatuses,
    pageSize,
  };
};

const buildProductTableClearHref = (retainedParams: ProductTableRuntimeRetainedParam[]) => {
  const params = new URLSearchParams();
  for (const entry of retainedParams) {
    params.append(entry.name, entry.value);
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "?";
};

const buildProductTableRuntimeMeta = ({
  blockId,
  controls,
  retainedParams,
  availableCollections,
  availableStatuses,
  state,
  total,
  currentPage,
  pageSize,
}: {
  blockId?: string;
  controls: ReturnType<typeof normalizeProductTableControls>;
  retainedParams: ProductTableRuntimeRetainedParam[];
  availableCollections: ProductTableRuntimeCollectionOption[];
  availableStatuses: CommerceWidgetStatus[];
  state: ProductTablePublicRuntimeState;
  total: number;
  currentPage: number;
  pageSize: number;
}): ProductTableResolvedRuntime => {
  const totalPages =
    controls.pagination === "none"
      ? 1
      : Math.max(1, Math.ceil(Math.max(total, 0) / Math.max(1, pageSize)));
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;
  const previousPage = currentPage > 1 ? currentPage - 1 : null;

  return {
    searchQuery: state.searchQuery,
    collectionIds: state.collectionIds,
    status: state.status,
    availableCollections,
    availableStatuses,
    sortField: state.sortField,
    sortDir: state.sortDir,
    page: currentPage,
    pageSize,
    totalPages,
    previousPageHref:
      controls.pagination === "paged" && previousPage !== null
        ? buildProductTableRuntimeHref({
            blockId,
            retainedParams,
            state: {
              searchQuery: state.searchQuery,
              collectionIds: state.collectionIds,
              status: state.status,
              sortField: state.sortField,
              sortDir: state.sortDir,
              page: previousPage,
            },
          })
        : undefined,
    nextPageHref:
      controls.pagination !== "none" && nextPage !== null
        ? buildProductTableRuntimeHref({
            blockId,
            retainedParams,
            state: {
              searchQuery: state.searchQuery,
              collectionIds: state.collectionIds,
              status: state.status,
              sortField: state.sortField,
              sortDir: state.sortDir,
              page: nextPage,
            },
          })
        : undefined,
    clearHref: buildProductTableClearHref(retainedParams),
    retainedParams,
    rejectedTokens: state.rejectedTokens,
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
  const controls = normalizeProductTableControls(normalized.controls);
  const retainedParams = resolveProductTableRuntimeRetainedParams(
    options.runtimeSearchParams,
    options.blockId
  );
  const availableStatuses = controls.showStatusFilter
    ? resolveProductTablePublicAvailableStatuses(normalized, options)
    : [];
  try {
    const availableCollections = await resolveProductTablePublicAvailableCollections(
      normalized,
      controls,
      runtimeDeps
    );
    const publicState = resolveProductTablePublicRuntimeState({
      normalized,
      controls,
      options,
      availableCollections,
      availableStatuses,
    });

    const { query, effectiveStatuses, pageSize } = resolveProductTablePublicQueryInput({
      normalized,
      controls,
      state: publicState,
      options,
    });

    if (!options.preview && effectiveStatuses.length === 0) {
      return {
        ...normalized,
        resolved: {
          items: [],
          total: 0,
          resolvedAt: new Date().toISOString(),
          runtime: {
            ...buildProductTableRuntimeMeta({
              blockId: options.blockId,
              controls,
              retainedParams,
              availableCollections,
              availableStatuses,
              state: publicState,
              total: 0,
              currentPage: 1,
              pageSize,
            }),
            rejectedTokens: publicState.rejectedTokens,
          },
        },
      };
    }

    let runtime = await resolveWithCache(options, query, runtimeDeps);
    let currentPage = publicState.page;
    const totalPages =
      controls.pagination === "paged"
        ? Math.max(1, Math.ceil(Math.max(runtime.total, 0) / Math.max(1, pageSize)))
        : Math.max(1, Math.ceil(Math.max(runtime.total, 0) / Math.max(1, pageSize)));

    if (controls.pagination === "paged" && currentPage > totalPages) {
      currentPage = totalPages;
      const replay = resolveProductTablePublicQueryInput({
        normalized,
        controls,
        state: {
          ...publicState,
          page: currentPage,
        },
        options,
      });
      runtime = await resolveWithCache(options, replay.query, runtimeDeps);
    }

    const productHrefMap = await runtimeDeps.buildProductHrefMap(runtime.rows);
    const items = await attachProductTableMedia(
      runtime.cards.map((card) => ({
        ...card,
        productHref: productHrefMap.get(card.id) ?? null,
      })),
      runtimeDeps
    );

    return {
      ...normalized,
      resolved: {
        items,
        total: runtime.total,
        resolvedAt: new Date().toISOString(),
        runtime: buildProductTableRuntimeMeta({
          blockId: options.blockId,
          controls,
          retainedParams,
          availableCollections,
          availableStatuses,
          state: {
            ...publicState,
            page: currentPage,
          },
          total: runtime.total,
          currentPage,
          pageSize,
        }),
      },
    };
  } catch (error) {
    return {
      ...normalized,
      resolved: {
        items: [],
        total: 0,
        resolvedAt: new Date().toISOString(),
        runtime: {
          ...normalized.resolved?.runtime,
          retainedParams,
          rejectedTokens: normalized.resolved?.runtime?.rejectedTokens ?? [],
        },
        error: readRuntimeErrorCode(error),
      },
    };
  }
}

import {
  buildProductCompareQueryInput,
  normalizeProductCompareData,
  type ProductCompareData,
} from "../../widgets/core/productCompare";
import {
  buildProductGalleryQueryInput,
  normalizeProductGalleryData,
  type ProductGalleryData,
} from "../../widgets/core/productGallery";
import {
  buildProductTableQueryInput,
  normalizeProductTableData,
  type ProductTableData,
} from "../../widgets/core/productTable";
import {
  buildCommerceComparePayload,
  resolveCommerceRuntimeProducts,
} from "./commerceRuntimeResolver";

export type CommerceRuntimeCache = Map<
  string,
  Awaited<ReturnType<typeof resolveCommerceRuntimeProducts>>
>;

type CommerceWidgetRuntimeDeps = {
  resolveRuntimeProducts: typeof resolveCommerceRuntimeProducts;
  buildComparePayload: typeof buildCommerceComparePayload;
};

type CommerceWidgetRuntimeOptions = {
  preview: boolean;
  cache?: CommerceRuntimeCache;
};

const defaultDeps: CommerceWidgetRuntimeDeps = {
  resolveRuntimeProducts: resolveCommerceRuntimeProducts,
  buildComparePayload: buildCommerceComparePayload,
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
    const runtime = await resolveWithCache(
      options,
      buildProductGalleryQueryInput(normalized),
      runtimeDeps
    );

    return {
      ...normalized,
      resolved: {
        items: runtime.cards,
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

    return {
      ...normalized,
      resolved: {
        items: runtime.cards,
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

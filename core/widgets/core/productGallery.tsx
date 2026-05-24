import type { ComponentType, CSSProperties } from "react";

import type {
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import {
  buildCommerceWidgetQueryInput,
  commerceStockLabelMap,
  formatCommerceMoney,
  normalizeCommerceWidgetSource,
  normalizeResolvedMeta,
  type CommerceWidgetRuntimeCard,
  type CommerceWidgetSource,
} from "./commerceWidgetShared";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type ProductGalleryVariantId = "cards" | "compact";
export type ProductGalleryColumns = "2" | "3" | "4";
export type ProductGalleryLinkTarget = "same-tab" | "new-tab";
export type ProductGalleryCtaStyle = "text" | "button" | "none";
export type ProductGalleryPaginationMode = "none" | "view-all";
export type ProductGalleryCurationMode = "query" | "manual";

export type ProductGallerySource = CommerceWidgetSource & {
  minPriceMinor?: number;
  maxPriceMinor?: number;
};

export type ProductGalleryResolvedMedia = {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ProductGalleryRuntimeItem = CommerceWidgetRuntimeCard & {
  media?: ProductGalleryResolvedMedia | null;
};

export type ProductGalleryData = {
  source?: ProductGallerySource;
  link?: {
    basePath?: string;
    target?: ProductGalleryLinkTarget;
    ctaLabel?: string;
    ctaStyle?: ProductGalleryCtaStyle;
  };
  header?: {
    title?: string;
    description?: string;
  };
  pagination?: {
    mode?: ProductGalleryPaginationMode;
    viewAllHref?: string;
    viewAllLabel?: string;
  };
  curation?: {
    mode?: ProductGalleryCurationMode;
    productIds?: string[];
  };
  fields?: {
    showExcerpt?: boolean;
    showPrice?: boolean;
    showStock?: boolean;
    showStatus?: boolean;
    showMediaHint?: boolean;
  };
  emptyState?: {
    title?: string;
    description?: string;
  };
  style?: {
    columns?: ProductGalleryColumns;
    cardStyle?: "outlined" | "minimal";
    cardBackground?: string;
    cardBorderColor?: string;
    emptyBackground?: string;
    emptyBorderColor?: string;
  };
  resolved?: {
    items?: ProductGalleryRuntimeItem[];
    total?: number;
    resolvedAt?: string;
    error?: string;
  };
};

export const productGalleryDefaults: ProductGalleryData = {
  source: {
    limit: 8,
    search: "",
    collectionIds: [],
    status: [],
    sortField: "updatedAt",
    sortDir: "desc",
  },
  link: {
    target: "same-tab",
    ctaLabel: "View product",
    ctaStyle: "text",
  },
  header: {},
  pagination: {
    mode: "none",
    viewAllLabel: "View all products",
  },
  curation: {
    mode: "query",
    productIds: [],
  },
  fields: {
    showExcerpt: true,
    showPrice: true,
    showStock: true,
    showStatus: false,
    showMediaHint: false,
  },
  emptyState: {
    title: "No products found",
    description: "Adjust query filters or publish products.",
  },
  style: {
    columns: "3",
    cardStyle: "outlined",
    cardBackground: "var(--color-bg)",
    cardBorderColor: "var(--color-border)",
    emptyBackground: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    emptyBorderColor: "var(--color-border)",
  },
  resolved: {
    items: [],
    total: 0,
    resolvedAt: "",
  },
};

export const productGalleryEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "product-gallery.wizard.source-setup",
      title: "Source setup",
      role: "source",
      writablePaths: [
        "source.limit",
        "source.search",
        "source.collectionIds",
        "source.status",
        "source.sortField",
        "source.sortDir",
        "source.minPriceMinor",
        "source.maxPriceMinor",
      ],
    },
    {
      mode: "visual",
      id: "product-gallery.visual.header-cards",
      title: "Header and cards",
      role: "content",
      writablePaths: [
        "header.title",
        "header.description",
        "fields.showExcerpt",
        "fields.showPrice",
        "fields.showStock",
        "fields.showStatus",
        "fields.showMediaHint",
        "link.target",
        "link.ctaLabel",
        "link.ctaStyle",
        "pagination.mode",
        "pagination.viewAllHref",
        "pagination.viewAllLabel",
        "curation.mode",
        "curation.productIds",
        "emptyState.title",
        "emptyState.description",
      ],
    },
    {
      mode: "visual",
      id: "product-gallery.visual.presentation",
      title: "Presentation",
      role: "visual",
      writablePaths: [
        "style.columns",
        "style.cardStyle",
        "style.cardBackground",
        "style.cardBorderColor",
        "style.emptyBackground",
        "style.emptyBorderColor",
      ],
    },
    {
      mode: "advanced",
      id: "product-gallery.advanced.source-diagnostics",
      title: "Source diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "source",
        "curation",
        "link.basePath",
        "pagination",
        "resolved",
        "runtime.queryInput",
      ],
    },
    {
      mode: "advanced",
      id: "product-gallery.advanced.runtime-payload",
      title: "Runtime payload",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["runtime.normalizedData"],
    },
  ],
};

const maxManualProductIds = 48;
const maxPreviewStatusMessageLength = 160;

const text = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const optionalText = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalBlankText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  return value.trim();
};

const normalizePositiveInteger = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  if (normalized < min || normalized > max) return undefined;
  return normalized;
};

const normalizePriceMinor = (value: unknown) => normalizePositiveInteger(value, 0, 9_999_999_99);

const normalizeColumns = (value: unknown): ProductGalleryColumns => {
  if (value === "2" || value === "4") return value;
  return "3";
};

const normalizeLink = (
  value: ProductGalleryData["link"] | undefined
): NonNullable<ProductGalleryData["link"]> => ({
  basePath: normalizeWidgetSafeHref(value?.basePath, { allowRelative: true }),
  target: value?.target === "new-tab" ? "new-tab" : "same-tab",
  ctaLabel: text(value?.ctaLabel, productGalleryDefaults.link?.ctaLabel ?? "View product"),
  ctaStyle: value?.ctaStyle === "button" || value?.ctaStyle === "none" ? value.ctaStyle : "text",
});

const normalizeHeader = (value: ProductGalleryData["header"] | undefined) =>
  compactObject({
    title: optionalText(value?.title),
    description: optionalText(value?.description),
  });

const normalizePagination = (
  value: ProductGalleryData["pagination"] | undefined
): NonNullable<ProductGalleryData["pagination"]> => ({
  mode: value?.mode === "view-all" ? "view-all" : "none",
  viewAllHref: normalizeWidgetSafeHref(value?.viewAllHref, {
    allowRelative: true,
    allowHttp: true,
  }),
  viewAllLabel: text(
    value?.viewAllLabel,
    productGalleryDefaults.pagination?.viewAllLabel ?? "View all products"
  ),
});

const normalizeManualProductIds = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(
    new Set(
      value.map((entry) => optionalText(entry)).filter((entry): entry is string => Boolean(entry))
    )
  ).slice(0, maxManualProductIds);
};

const normalizeCuration = (
  value: ProductGalleryData["curation"] | undefined
): NonNullable<ProductGalleryData["curation"]> => ({
  mode: value?.mode === "manual" ? "manual" : "query",
  productIds: normalizeManualProductIds(value?.productIds),
});

const normalizeRuntimeItems = (value: unknown): ProductGalleryRuntimeItem[] => {
  if (!Array.isArray(value)) return [];
  const items: ProductGalleryRuntimeItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const payload = item as ProductGalleryRuntimeItem;
    const id = optionalText(payload.id);
    const title = optionalText(payload.title);
    const slug = optionalText(payload.slug);
    if (!id || !title || !slug) continue;

    const stockState =
      payload.stock?.state === "in_stock" ||
      payload.stock?.state === "out_of_stock" ||
      payload.stock?.state === "backorder"
        ? payload.stock.state
        : "out_of_stock";

    const amount =
      typeof payload.pricing?.amount === "number" && Number.isFinite(payload.pricing.amount)
        ? payload.pricing.amount
        : 0;
    const compareAt =
      typeof payload.pricing?.compareAtAmount === "number" &&
      Number.isFinite(payload.pricing.compareAtAmount)
        ? payload.pricing.compareAtAmount
        : null;
    const media =
      payload.media && typeof payload.media === "object" && optionalText(payload.media.url)
        ? {
            url: optionalText(payload.media.url) as string,
            alt: optionalText(payload.media.alt ?? undefined) ?? null,
            width:
              typeof payload.media.width === "number" && Number.isFinite(payload.media.width)
                ? Math.max(0, Math.floor(payload.media.width))
                : null,
            height:
              typeof payload.media.height === "number" && Number.isFinite(payload.media.height)
                ? Math.max(0, Math.floor(payload.media.height))
                : null,
          }
        : undefined;

    items.push({
      id,
      title,
      slug,
      excerpt: optionalText(payload.excerpt ?? undefined) ?? null,
      status:
        payload.status === "draft" || payload.status === "archived" ? payload.status : "published",
      pricing: {
        amount,
        currency: text(payload.pricing?.currency, "USD"),
        compareAtAmount: compareAt,
      },
      stock: {
        state: stockState,
        quantity:
          typeof payload.stock?.quantity === "number" && Number.isFinite(payload.stock.quantity)
            ? Math.floor(payload.stock.quantity)
            : null,
        inStock: payload.stock?.inStock === true,
      },
      primaryMediaId: optionalText(payload.primaryMediaId ?? undefined) ?? null,
      mediaIds: Array.isArray(payload.mediaIds)
        ? payload.mediaIds
            .map((entry) => optionalText(entry))
            .filter((entry): entry is string => Boolean(entry))
        : [],
      collectionIds: Array.isArray(payload.collectionIds)
        ? payload.collectionIds
            .map((entry) => optionalText(entry))
            .filter((entry): entry is string => Boolean(entry))
        : [],
      ...(media ? { media } : {}),
    });
  }

  return items;
};

export const productGallerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "number", minimum: 1, maximum: 48 },
        search: { type: "string" },
        collectionIds: {
          type: "array",
          maxItems: 30,
          items: { type: "string" },
        },
        status: {
          type: "array",
          maxItems: 3,
          items: { enum: ["draft", "published", "archived"] },
        },
        sortField: {
          enum: [
            "title",
            "slug",
            "status",
            "pricing.amount",
            "stock.state",
            "createdAt",
            "updatedAt",
            "publishedAt",
          ],
        },
        sortDir: { enum: ["asc", "desc"] },
        minPriceMinor: { type: "number", minimum: 0 },
        maxPriceMinor: { type: "number", minimum: 0 },
      },
    },
    link: {
      type: "object",
      additionalProperties: false,
      properties: {
        basePath: { type: "string" },
        target: { enum: ["same-tab", "new-tab"] },
        ctaLabel: { type: "string" },
        ctaStyle: { enum: ["text", "button", "none"] },
      },
    },
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    pagination: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["none", "view-all"] },
        viewAllHref: { type: "string" },
        viewAllLabel: { type: "string" },
      },
    },
    curation: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["query", "manual"] },
        productIds: {
          type: "array",
          maxItems: maxManualProductIds,
          items: { type: "string" },
        },
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showExcerpt: { type: "boolean" },
        showPrice: { type: "boolean" },
        showStock: { type: "boolean" },
        showStatus: { type: "boolean" },
        showMediaHint: { type: "boolean" },
      },
    },
    emptyState: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        columns: { enum: ["2", "3", "4"] },
        cardStyle: { enum: ["outlined", "minimal"] },
        cardBackground: { type: "string" },
        cardBorderColor: { type: "string" },
        emptyBackground: { type: "string" },
        emptyBorderColor: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              excerpt: { type: ["string", "null"] },
              status: { enum: ["draft", "published", "archived"] },
              pricing: {
                type: "object",
                additionalProperties: false,
                properties: {
                  amount: { type: "number" },
                  currency: { type: "string" },
                  compareAtAmount: { type: ["number", "null"] },
                },
              },
              stock: {
                type: "object",
                additionalProperties: false,
                properties: {
                  state: { enum: ["in_stock", "out_of_stock", "backorder"] },
                  quantity: { type: ["number", "null"] },
                  inStock: { type: "boolean" },
                },
              },
              primaryMediaId: { type: ["string", "null"] },
              mediaIds: { type: "array", items: { type: "string" } },
              collectionIds: { type: "array", items: { type: "string" } },
              media: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                  url: { type: "string" },
                  alt: { type: ["string", "null"] },
                  width: { type: ["number", "null"] },
                  height: { type: ["number", "null"] },
                },
              },
            },
          },
        },
        total: { type: "number" },
        resolvedAt: { type: "string" },
        error: { type: "string" },
      },
    },
  },
} as const;

export const normalizeProductGalleryData = (value: ProductGalleryData): ProductGalleryData => {
  const normalizedSource = normalizeCommerceWidgetSource(value.source, {
    limit: productGalleryDefaults.source?.limit ?? 8,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  const minPriceMinor = normalizePriceMinor(value.source?.minPriceMinor);
  const maxPriceMinor = normalizePriceMinor(value.source?.maxPriceMinor);
  const normalizedPriceRange =
    typeof minPriceMinor === "number" && typeof maxPriceMinor === "number"
      ? {
          minPriceMinor: Math.min(minPriceMinor, maxPriceMinor),
          maxPriceMinor: Math.max(minPriceMinor, maxPriceMinor),
        }
      : {
          ...(typeof minPriceMinor === "number" ? { minPriceMinor } : {}),
          ...(typeof maxPriceMinor === "number" ? { maxPriceMinor } : {}),
        };
  const source = {
    ...normalizedSource,
    ...normalizedPriceRange,
  };
  const resolvedMeta = normalizeResolvedMeta(value.resolved);
  const hasStyleObject = value.style !== undefined;
  const clearableStyle = hasStyleObject
    ? compactObject({
        cardBackground: resolveClearableStyleValue(value.style?.cardBackground),
        cardBorderColor: resolveClearableStyleValue(value.style?.cardBorderColor),
        emptyBackground: resolveClearableStyleValue(value.style?.emptyBackground),
        emptyBorderColor: resolveClearableStyleValue(value.style?.emptyBorderColor),
      })
    : compactObject({
        cardBackground: resolveClearableStyleValue(productGalleryDefaults.style?.cardBackground),
        cardBorderColor: resolveClearableStyleValue(productGalleryDefaults.style?.cardBorderColor),
        emptyBackground: resolveClearableStyleValue(productGalleryDefaults.style?.emptyBackground),
        emptyBorderColor: resolveClearableStyleValue(
          productGalleryDefaults.style?.emptyBorderColor
        ),
      });

  return {
    source,
    link: normalizeLink(value.link),
    header: normalizeHeader(value.header) ?? {},
    pagination: normalizePagination(value.pagination),
    curation: normalizeCuration(value.curation),
    fields: {
      showExcerpt: value.fields?.showExcerpt !== false,
      showPrice: value.fields?.showPrice !== false,
      showStock: value.fields?.showStock !== false,
      showStatus: value.fields?.showStatus === true,
      showMediaHint: value.fields?.showMediaHint === true,
    },
    emptyState: {
      title: text(
        value.emptyState?.title,
        productGalleryDefaults.emptyState?.title ?? "No products found"
      ),
      description: optionalBlankText(
        value.emptyState?.description,
        productGalleryDefaults.emptyState?.description ??
          "Adjust query filters or publish products."
      ),
    },
    style: {
      columns: normalizeColumns(value.style?.columns),
      cardStyle: value.style?.cardStyle === "minimal" ? "minimal" : "outlined",
      ...(clearableStyle ?? {}),
    },
    resolved: {
      items: normalizeRuntimeItems(value.resolved?.items),
      total: resolvedMeta.total,
      resolvedAt: resolvedMeta.resolvedAt,
      ...(resolvedMeta.error ? { error: resolvedMeta.error } : {}),
    },
  };
};

export const buildProductGalleryQueryInput = (value: ProductGalleryData) => {
  const normalized = normalizeProductGalleryData(value);
  const querySource = {
    limit: normalized.source?.limit ?? normalizedSourceFallback.limit,
    search: normalized.source?.search ?? normalizedSourceFallback.search,
    collectionIds: normalized.source?.collectionIds ?? normalizedSourceFallback.collectionIds,
    status: normalized.source?.status ?? normalizedSourceFallback.status,
    sortField: normalized.source?.sortField ?? normalizedSourceFallback.sortField,
    sortDir: normalized.source?.sortDir ?? normalizedSourceFallback.sortDir,
  };
  const filters: Array<{ field: string; op: string; value: number }> = [];
  if (typeof normalized.source?.minPriceMinor === "number") {
    filters.push({
      field: "pricing.amount",
      op: "gte",
      value: normalized.source.minPriceMinor,
    });
  }
  if (typeof normalized.source?.maxPriceMinor === "number") {
    filters.push({
      field: "pricing.amount",
      op: "lte",
      value: normalized.source.maxPriceMinor,
    });
  }

  return {
    ...buildCommerceWidgetQueryInput(querySource),
    ...(filters.length > 0 ? { filters } : {}),
  };
};

const normalizedSourceFallback = normalizeCommerceWidgetSource(productGalleryDefaults.source, {
  limit: productGalleryDefaults.source?.limit ?? 8,
  sortField: "updatedAt",
  sortDir: "desc",
});

const columnsClassMap: Record<ProductGalleryColumns, string> = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-2 xl:grid-cols-4",
};

const variantGridClassMap: Record<ProductGalleryVariantId, string> = {
  cards: "gap-4",
  compact: "gap-3",
};

const variantCardClassMap: Record<ProductGalleryVariantId, string> = {
  cards: "space-y-3 rounded-xl p-4",
  compact: "space-y-2 rounded-lg p-3",
};

const variantMediaClassMap: Record<ProductGalleryVariantId, string> = {
  cards: "aspect-[4/3]",
  compact: "aspect-[5/4]",
};

const stockClassMap: Record<ProductGalleryRuntimeItem["stock"]["state"], string> = {
  in_stock: "bg-emerald-500/15 text-emerald-800",
  out_of_stock: "bg-rose-500/15 text-rose-800",
  backorder: "bg-amber-500/15 text-amber-900",
};

const statusLabelMap: Record<ProductGalleryRuntimeItem["status"], string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

const statusClassMap: Record<ProductGalleryRuntimeItem["status"], string> = {
  published: "bg-sky-500/15 text-sky-800",
  draft: "bg-slate-500/15 text-slate-800",
  archived: "bg-zinc-500/15 text-zinc-800",
};

const resolveProductGalleryVariant = (value: string): ProductGalleryVariantId =>
  value === "compact" ? "compact" : "cards";

const joinProductGalleryProductHref = (basePath: string | undefined, slug: string) => {
  if (!basePath) return undefined;
  const normalizedSlug = slug.trim().replace(/^\/+/, "");
  if (!normalizedSlug) return undefined;
  const joined = `${basePath.replace(/\/+$/, "")}/${normalizedSlug}`;
  return normalizeWidgetSafeHref(joined, { allowRelative: true });
};

const formatResolvedTimestamp = (value: string | undefined) => {
  const normalized = optionalText(value);
  if (!normalized) return "Not resolved yet";
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return normalized;
  return new Date(timestamp).toLocaleString("en-US");
};

const previewMessage = (renderContext: WidgetRenderContext | undefined) => {
  const message = optionalText(renderContext?.previewState?.message);
  if (!message) return undefined;
  return message.slice(0, maxPreviewStatusMessageLength);
};

export function ProductGalleryBlock({
  data,
  variant,
  renderContext,
  blockId,
}: {
  data: ProductGalleryData;
  variant: string;
  renderContext?: WidgetRenderContext;
  blockId?: string;
}) {
  const normalized = normalizeProductGalleryData(data);
  const resolvedVariant = resolveProductGalleryVariant(variant);
  const items = normalized.resolved?.items ?? [];
  const hasError = Boolean(normalized.resolved?.error);
  const previewState = renderContext?.previewState ?? null;
  const previewLoading = previewState?.status === "loading";
  const previewError = previewState?.status === "error" ? previewMessage(renderContext) : undefined;
  const isEditorPreview =
    renderContext?.mode === "editor-preview" || renderContext?.mode === "admin-preview";
  const emptyStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.emptyBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.emptyBorderColor),
  });
  const cardSurfaceStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.cardBackground),
    borderColor:
      normalized.style?.cardStyle === "minimal"
        ? undefined
        : resolveClearableStyleValue(normalized.style?.cardBorderColor),
  });
  const total = normalized.resolved?.total ?? items.length;
  const canViewAll =
    normalized.pagination?.mode === "view-all" &&
    typeof normalized.pagination.viewAllHref === "string" &&
    total > items.length;
  const blockTitleIdPrefix = (optionalText(blockId) ?? "product-gallery").replace(
    /[^a-zA-Z0-9_-]/g,
    "-"
  );
  const viewAllAttrs = canViewAll
    ? resolveWidgetLinkAttrs(normalized.pagination?.viewAllHref, {
        allowRelative: true,
        allowHttp: true,
      })
    : undefined;

  return (
    <section
      className="space-y-4"
      data-widget="product-gallery"
      data-product-gallery-count={String(items.length)}
      data-product-gallery-total={String(total)}
      data-product-gallery-curation={normalized.curation?.mode ?? "query"}
      data-product-gallery-pagination={normalized.pagination?.mode ?? "none"}
    >
      {normalized.header?.title || normalized.header?.description ? (
        <div className="space-y-1">
          {normalized.header?.title ? (
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              {normalized.header.title}
            </h2>
          ) : null}
          {normalized.header?.description ? (
            <p className="text-sm text-[var(--color-text)]/75">{normalized.header.description}</p>
          ) : null}
        </div>
      ) : null}

      {previewLoading ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          Refreshing Product Gallery preview...
        </div>
      ) : null}

      {previewError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Product Gallery preview warning: {previewError}
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-4 py-6 text-center"
          style={emptyStyle}
          role={isEditorPreview ? "status" : undefined}
          aria-live={isEditorPreview ? "polite" : undefined}
        >
          <p className="text-sm font-medium text-[var(--color-text)]">
            {normalized.emptyState?.title}
          </p>
          {normalized.emptyState?.description ? (
            <p className="mt-1 text-sm text-[var(--color-text)]/70">
              {normalized.emptyState.description}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${variantGridClassMap[resolvedVariant]} ${columnsClassMap[normalized.style?.columns ?? "3"]}`}
        >
          {items.map((item) => {
            const stockState = item.stock.state;
            const stockLabel = commerceStockLabelMap[stockState] ?? "Out of stock";
            const statusLabel = statusLabelMap[item.status] ?? "Published";
            const hasCompareAt =
              typeof item.pricing.compareAtAmount === "number" &&
              item.pricing.compareAtAmount > item.pricing.amount;
            const href = joinProductGalleryProductHref(normalized.link?.basePath, item.slug);
            const linkAttrs = href
              ? resolveWidgetLinkAttrs(href, {
                  allowRelative: true,
                  openInNewTab: normalized.link?.target === "new-tab",
                })
              : undefined;
            const titleId = `${blockTitleIdPrefix}-title-${item.id}`;
            const mediaAlt = item.media?.alt?.trim() || item.title;
            const ctaStyle = normalized.link?.ctaStyle ?? "text";
            const cardClassName = [
              variantCardClassMap[resolvedVariant],
              normalized.style?.cardStyle === "minimal" ? null : "border",
            ]
              .filter(Boolean)
              .join(" ");

            const cardBody = (
              <>
                {item.media?.url ? (
                  <div
                    className={`overflow-hidden rounded-lg border border-border/40 bg-muted/10 ${variantMediaClassMap[resolvedVariant]}`}
                  >
                    <img
                      src={item.media.url}
                      alt={mediaAlt}
                      width={item.media.width ?? undefined}
                      height={item.media.height ?? undefined}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                {normalized.fields?.showMediaHint && isEditorPreview ? (
                  <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text)]/65">
                    {item.primaryMediaId
                      ? `Preview media id: ${item.primaryMediaId}`
                      : "No primary media attached"}
                  </div>
                ) : null}

                <div className="space-y-1">
                  <h3
                    id={titleId}
                    className={`font-semibold text-[var(--color-text)] ${resolvedVariant === "compact" ? "text-sm" : "text-base"}`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text)]/60">/{item.slug}</p>
                </div>

                {normalized.fields?.showExcerpt && item.excerpt ? (
                  <p className="text-sm text-[var(--color-text)]/80">{item.excerpt}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {normalized.fields?.showPrice ? (
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {formatCommerceMoney(item.pricing.amount, item.pricing.currency)}
                    </span>
                  ) : null}
                  {normalized.fields?.showPrice && hasCompareAt ? (
                    <span className="text-xs text-[var(--color-text)]/50 line-through">
                      {formatCommerceMoney(
                        item.pricing.compareAtAmount ?? 0,
                        item.pricing.currency
                      )}
                    </span>
                  ) : null}
                  {normalized.fields?.showStatus ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClassMap[item.status]}`}
                    >
                      Status: {statusLabel}
                    </span>
                  ) : null}
                  {normalized.fields?.showStock ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${stockClassMap[stockState]}`}
                    >
                      Stock: {stockLabel}
                    </span>
                  ) : null}
                </div>

                {linkAttrs && ctaStyle !== "none" ? (
                  <span
                    className={
                      ctaStyle === "button"
                        ? "inline-flex w-fit items-center rounded-md border border-border/70 px-3 py-2 text-sm font-medium"
                        : "inline-flex w-fit items-center text-sm font-medium underline-offset-4 hover:underline"
                    }
                  >
                    {normalized.link?.ctaLabel}
                  </span>
                ) : null}
              </>
            );

            return (
              <article
                key={item.id}
                className={cardClassName}
                style={cardSurfaceStyle}
                data-product-id={item.id}
                aria-labelledby={titleId}
              >
                {linkAttrs ? (
                  <a
                    {...linkAttrs}
                    className="group block space-y-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {cardBody}
                  </a>
                ) : (
                  cardBody
                )}
              </article>
            );
          })}
        </div>
      )}

      {viewAllAttrs ? (
        <div className="pt-2">
          <a
            {...viewAllAttrs}
            className="inline-flex items-center text-sm font-medium underline-offset-4 hover:underline"
          >
            {normalized.pagination?.viewAllLabel}
          </a>
        </div>
      ) : null}

      {isEditorPreview ? (
        <p className="text-xs text-[var(--color-text)]/55">
          Last resolved: {formatResolvedTimestamp(normalized.resolved?.resolvedAt)}
        </p>
      ) : null}
    </section>
  );
}

export function createProductGalleryWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ProductGalleryData>>;
  visual: ComponentType<WidgetEditorProps<ProductGalleryData>>;
  advanced: ComponentType<WidgetEditorProps<ProductGalleryData>>;
}): WidgetDefinition<ProductGalleryData> {
  return {
    type: "product-gallery",
    title: "Product Gallery",
    description: "Product cards with runtime query source and stock/price metadata.",
    category: "content",
    variants: [
      {
        id: "cards",
        label: "Cards",
        description: "Card grid for featured products.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Dense card grid with minimal spacing.",
      },
    ],
    schema: productGallerySchema,
    defaults: productGalleryDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorContract: productGalleryEditorContract,
    editorCapabilities: {
      supportsPreviewState: true,
    },
    render: ProductGalleryBlock,
  };
}

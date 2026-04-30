import type { ComponentType, CSSProperties } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
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

export type ProductGalleryVariantId = "cards" | "compact";
export type ProductGalleryColumns = "2" | "3" | "4";

export type ProductGalleryData = {
  source?: CommerceWidgetSource;
  fields?: {
    showExcerpt?: boolean;
    showPrice?: boolean;
    showStock?: boolean;
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
    items?: CommerceWidgetRuntimeCard[];
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
  fields: {
    showExcerpt: true,
    showPrice: true,
    showStock: true,
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

const normalizeRuntimeItems = (value: unknown): CommerceWidgetRuntimeCard[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const payload = item as CommerceWidgetRuntimeCard;
      const id = optionalText(payload.id);
      const title = optionalText(payload.title);
      const slug = optionalText(payload.slug);
      if (!id || !title || !slug) return null;

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

      return {
        id,
        title,
        slug,
        excerpt: optionalText(payload.excerpt ?? undefined) ?? null,
        status:
          payload.status === "draft" || payload.status === "archived"
            ? payload.status
            : "published",
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
      } satisfies CommerceWidgetRuntimeCard;
    })
    .filter((item): item is CommerceWidgetRuntimeCard => item !== null);
};

const normalizeColumns = (value: unknown): ProductGalleryColumns => {
  if (value === "2" || value === "4") return value;
  return "3";
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
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showExcerpt: { type: "boolean" },
        showPrice: { type: "boolean" },
        showStock: { type: "boolean" },
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
  const source = normalizeCommerceWidgetSource(value.source, {
    limit: productGalleryDefaults.source?.limit ?? 8,
    sortField: "updatedAt",
    sortDir: "desc",
  });

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
    fields: {
      showExcerpt: value.fields?.showExcerpt !== false,
      showPrice: value.fields?.showPrice !== false,
      showStock: value.fields?.showStock !== false,
      showMediaHint: value.fields?.showMediaHint === true,
    },
    emptyState: {
      title: text(
        value.emptyState?.title,
        productGalleryDefaults.emptyState?.title ?? "No products found"
      ),
      description: text(
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
  return buildCommerceWidgetQueryInput(
    normalizeCommerceWidgetSource(normalized.source, {
      limit: productGalleryDefaults.source?.limit ?? 8,
      sortField: "updatedAt",
      sortDir: "desc",
    })
  );
};

const columnsClassMap: Record<ProductGalleryColumns, string> = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-2 xl:grid-cols-4",
};

const stockClassMap: Record<CommerceWidgetRuntimeCard["stock"]["state"], string> = {
  in_stock: "bg-emerald-500/15 text-emerald-700",
  out_of_stock: "bg-rose-500/15 text-rose-700",
  backorder: "bg-amber-500/15 text-amber-800",
};

export function ProductGalleryBlock({ data }: { data: ProductGalleryData; variant: string }) {
  const normalized = normalizeProductGalleryData(data);
  const items = normalized.resolved?.items ?? [];
  const hasError = Boolean(normalized.resolved?.error);
  const emptyStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.emptyBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.emptyBorderColor),
  });
  const cardSurfaceStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.cardBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.cardBorderColor),
  });
  const hasStyleObject = normalized.style !== undefined;
  const legacyEmptyClass = hasStyleObject
    ? ""
    : "border-[var(--color-border)] bg-[var(--color-bg)]/70";
  const legacyCardSurfaceClass = hasStyleObject
    ? ""
    : normalized.style?.cardStyle === "minimal"
      ? "bg-[var(--color-bg)]"
      : "border-[var(--color-border)] bg-[var(--color-bg)]";

  return (
    <section
      className="space-y-4"
      data-widget="product-gallery"
      data-product-gallery-count={String(items.length)}
    >
      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div
          className={`rounded-xl border border-dashed px-4 py-6 text-center ${legacyEmptyClass}`}
          style={emptyStyle}
        >
          <p className="text-sm font-medium text-[var(--color-text)]">
            {normalized.emptyState?.title}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text)]/70">
            {normalized.emptyState?.description}
          </p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-4 ${columnsClassMap[normalized.style?.columns ?? "3"]}`}
        >
          {items.map((item) => {
            const stockState = item.stock.state;
            const stockLabel = commerceStockLabelMap[stockState] ?? "Out of stock";
            return (
              <article
                key={item.id}
                className={
                  normalized.style?.cardStyle === "minimal"
                    ? `space-y-3 rounded-xl p-4 ${legacyCardSurfaceClass}`
                    : `space-y-3 rounded-xl border p-4 ${legacyCardSurfaceClass}`
                }
                style={cardSurfaceStyle}
                data-product-id={item.id}
              >
                {normalized.fields?.showMediaHint ? (
                  <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text)]/65">
                    {item.primaryMediaId
                      ? `Primary media id: ${item.primaryMediaId}`
                      : "No primary media attached"}
                  </div>
                ) : null}

                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[var(--color-text)]">{item.title}</h3>
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
                  {normalized.fields?.showPrice &&
                  typeof item.pricing.compareAtAmount === "number" ? (
                    <span className="text-xs text-[var(--color-text)]/50 line-through">
                      {formatCommerceMoney(item.pricing.compareAtAmount, item.pricing.currency)}
                    </span>
                  ) : null}
                  {normalized.fields?.showStock ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${stockClassMap[stockState]}`}
                    >
                      {stockLabel}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
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
    render: ProductGalleryBlock,
  };
}

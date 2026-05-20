import type { ComponentType, CSSProperties } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import {
  buildCommerceWidgetQueryInput,
  commerceStockLabelMap,
  formatCommerceMoney,
  normalizeCommerceWidgetSource,
  normalizeResolvedMeta,
  type CommerceWidgetRuntimeCompareRow,
  type CommerceWidgetSource,
} from "./commerceWidgetShared";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type ProductCompareVariantId = "matrix" | "compact" | "cards";
export const PRODUCT_COMPARE_MAX_PRODUCTS = 12;
export const productCompareAttributeKeys = [
  "price",
  "compareAt",
  "stock",
  "quantity",
  "slug",
  "excerpt",
] as const;
export const productCompareMoneyLocales = ["en-US", "pl-PL", "de-DE", "fr-FR"] as const;
export const productCompareQuantityDisplayModes = ["exact", "compact"] as const;
export const productCompareCtaModes = ["none", "view_product"] as const;

export type ProductCompareSource = CommerceWidgetSource & {
  productIds?: string[];
};

export type ProductCompareAttributeKey = (typeof productCompareAttributeKeys)[number];
export type ProductCompareMoneyLocale = (typeof productCompareMoneyLocales)[number];
export type ProductCompareQuantityDisplayMode = (typeof productCompareQuantityDisplayModes)[number];
export type ProductCompareCtaMode = (typeof productCompareCtaModes)[number];

export type ProductCompareAttributeRow = {
  key: ProductCompareAttributeKey;
  visible?: boolean;
};

export type ProductCompareData = {
  source?: ProductCompareSource;
  rows?: ProductCompareAttributeRow[];
  fields?: {
    showPrice?: boolean;
    showCompareAt?: boolean;
    showStock?: boolean;
    showStockQuantity?: boolean;
    showSlug?: boolean;
    showExcerpt?: boolean;
  };
  labels?: {
    attributeHeader?: string;
    price?: string;
    compareAt?: string;
    stock?: string;
    quantity?: string;
    slug?: string;
    excerpt?: string;
    inStock?: string;
    outOfStock?: string;
    backorder?: string;
  };
  format?: {
    moneyLocale?: ProductCompareMoneyLocale;
    quantityDisplay?: ProductCompareQuantityDisplayMode;
    quantityCompactLimit?: number;
  };
  header?: {
    showImages?: boolean;
    linkTitles?: boolean;
    ctaMode?: ProductCompareCtaMode;
    ctaLabel?: string;
  };
  section?: {
    title?: string;
    description?: string;
    caption?: string;
    hideCaption?: boolean;
  };
  emptyState?: {
    title?: string;
    description?: string;
  };
  layout?: {
    featuredProductId?: string;
    stickyHeader?: boolean;
  };
  style?: {
    tableBackground?: string;
    tableBorderColor?: string;
    headerBackground?: string;
    emptyBackground?: string;
    emptyBorderColor?: string;
  };
  resolved?: {
    rows?: CommerceWidgetRuntimeCompareRow[];
    total?: number;
    resolvedAt?: string;
    error?: string;
  };
};

const productCompareRowDefaults: ProductCompareAttributeRow[] = [
  { key: "price", visible: true },
  { key: "compareAt", visible: true },
  { key: "stock", visible: true },
  { key: "quantity", visible: true },
  { key: "slug", visible: false },
  { key: "excerpt", visible: false },
];

const defaultAttributeLabel = (key: ProductCompareAttributeKey) => {
  switch (key) {
    case "price":
      return "Price";
    case "compareAt":
      return "Compare at";
    case "stock":
      return "Stock";
    case "quantity":
      return "Quantity";
    case "slug":
      return "Slug";
    case "excerpt":
      return "Excerpt";
  }
};

export const productCompareDefaults: ProductCompareData = {
  source: {
    limit: 3,
    search: "",
    collectionIds: [],
    productIds: [],
    status: [],
    sortField: "title",
    sortDir: "asc",
  },
  rows: productCompareRowDefaults,
  fields: {
    showPrice: true,
    showCompareAt: true,
    showStock: true,
    showStockQuantity: true,
    showSlug: false,
    showExcerpt: false,
  },
  labels: {
    attributeHeader: "Attribute",
    price: "Price",
    compareAt: "Compare at",
    stock: "Stock",
    quantity: "Quantity",
    slug: "Slug",
    excerpt: "Excerpt",
    inStock: "In stock",
    outOfStock: "Out of stock",
    backorder: "Backorder",
  },
  format: {
    moneyLocale: "en-US",
    quantityDisplay: "exact",
    quantityCompactLimit: 99,
  },
  header: {
    showImages: false,
    linkTitles: false,
    ctaMode: "none",
    ctaLabel: "View product",
  },
  section: {
    title: "",
    description: "",
    caption: "Product comparison",
    hideCaption: true,
  },
  emptyState: {
    title: "No products to compare",
    description: "Update source filters or publish products.",
  },
  layout: {
    featuredProductId: "",
    stickyHeader: false,
  },
  style: {
    tableBackground: "var(--color-bg)",
    tableBorderColor: "var(--color-border)",
    headerBackground: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    emptyBackground: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    emptyBorderColor: "var(--color-border)",
  },
  resolved: {
    rows: [],
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

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized < min) return min;
  if (normalized > max) return max;
  return normalized;
};

const normalizeProductCompareProductIds = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(
    new Set(
      value.map((entry) => optionalText(entry)).filter((entry): entry is string => Boolean(entry))
    )
  ).slice(0, PRODUCT_COMPARE_MAX_PRODUCTS);
};

const legacyRowVisibilityMap = (fields: ProductCompareData["fields"] | undefined) => ({
  price: fields?.showPrice !== false,
  compareAt: fields?.showCompareAt !== false,
  stock: fields?.showStock !== false,
  quantity: fields?.showStockQuantity !== false,
  slug: fields?.showSlug === true,
  excerpt: fields?.showExcerpt === true,
});

const normalizeProductCompareRows = (
  value: unknown,
  fields: ProductCompareData["fields"] | undefined
): ProductCompareAttributeRow[] => {
  const defaultsByKey = new Map(productCompareRowDefaults.map((row) => [row.key, row] as const));
  const legacyVisibility = legacyRowVisibilityMap(fields);
  const normalized: ProductCompareAttributeRow[] = [];
  const seen = new Set<ProductCompareAttributeKey>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const keyCandidate = optionalText((entry as ProductCompareAttributeRow).key);
      if (
        !keyCandidate ||
        !productCompareAttributeKeys.includes(keyCandidate as ProductCompareAttributeKey)
      ) {
        continue;
      }
      const key = keyCandidate as ProductCompareAttributeKey;
      if (seen.has(key)) continue;
      seen.add(key);
      const defaults = defaultsByKey.get(key);
      normalized.push({
        key,
        visible:
          typeof (entry as ProductCompareAttributeRow).visible === "boolean"
            ? (entry as ProductCompareAttributeRow).visible
            : (defaults?.visible ?? legacyVisibility[key]),
      });
    }
  }

  for (const row of productCompareRowDefaults) {
    if (seen.has(row.key)) continue;
    normalized.push({
      key: row.key,
      visible: legacyVisibility[row.key],
    });
  }

  return normalized;
};

const normalizeVariant = (value: string): ProductCompareVariantId =>
  value === "compact" || value === "cards" ? value : "matrix";

const resolveAttributeLabel = (
  labels: ProductCompareData["labels"] | undefined,
  key: ProductCompareAttributeKey
) => {
  switch (key) {
    case "price":
      return text(labels?.price, productCompareDefaults.labels?.price ?? "Price");
    case "compareAt":
      return text(labels?.compareAt, productCompareDefaults.labels?.compareAt ?? "Compare at");
    case "stock":
      return text(labels?.stock, productCompareDefaults.labels?.stock ?? "Stock");
    case "quantity":
      return text(labels?.quantity, productCompareDefaults.labels?.quantity ?? "Quantity");
    case "slug":
      return text(labels?.slug, productCompareDefaults.labels?.slug ?? "Slug");
    case "excerpt":
      return text(labels?.excerpt, productCompareDefaults.labels?.excerpt ?? "Excerpt");
  }
};

const normalizeRows = (value: unknown): CommerceWidgetRuntimeCompareRow[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const payload = item as CommerceWidgetRuntimeCompareRow;
      const id = optionalText(payload.id);
      const title = optionalText(payload.title);
      const slug = optionalText(payload.slug);
      if (!id || !title || !slug) return null;

      return {
        id,
        title,
        slug,
        excerpt: optionalText(payload.excerpt ?? undefined) ?? null,
        productHref:
          normalizeWidgetSafeHref(optionalText(payload.productHref ?? undefined), {
            allowRelative: true,
          }) ?? null,
        imageUrl: optionalText(payload.imageUrl ?? undefined) ?? null,
        imageAlt: optionalText(payload.imageAlt ?? undefined) ?? null,
        priceAmount:
          typeof payload.priceAmount === "number" && Number.isFinite(payload.priceAmount)
            ? payload.priceAmount
            : 0,
        currency: text(payload.currency, "USD"),
        compareAtAmount:
          typeof payload.compareAtAmount === "number" && Number.isFinite(payload.compareAtAmount)
            ? payload.compareAtAmount
            : null,
        stockState:
          payload.stockState === "in_stock" ||
          payload.stockState === "backorder" ||
          payload.stockState === "out_of_stock"
            ? payload.stockState
            : "out_of_stock",
        stockQuantity:
          typeof payload.stockQuantity === "number" && Number.isFinite(payload.stockQuantity)
            ? Math.floor(payload.stockQuantity)
            : null,
      };
    })
    .filter((item): item is CommerceWidgetRuntimeCompareRow => item !== null);
};

export const productCompareSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "number", minimum: 1, maximum: PRODUCT_COMPARE_MAX_PRODUCTS },
        search: { type: "string" },
        collectionIds: {
          type: "array",
          maxItems: 30,
          items: { type: "string" },
        },
        productIds: {
          type: "array",
          maxItems: PRODUCT_COMPARE_MAX_PRODUCTS,
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
    rows: {
      type: "array",
      maxItems: productCompareAttributeKeys.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key"],
        properties: {
          key: { enum: [...productCompareAttributeKeys] },
          visible: { type: "boolean" },
        },
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showPrice: { type: "boolean" },
        showCompareAt: { type: "boolean" },
        showStock: { type: "boolean" },
        showStockQuantity: { type: "boolean" },
        showSlug: { type: "boolean" },
        showExcerpt: { type: "boolean" },
      },
    },
    labels: {
      type: "object",
      additionalProperties: false,
      properties: {
        attributeHeader: { type: "string" },
        price: { type: "string" },
        compareAt: { type: "string" },
        stock: { type: "string" },
        quantity: { type: "string" },
        slug: { type: "string" },
        excerpt: { type: "string" },
        inStock: { type: "string" },
        outOfStock: { type: "string" },
        backorder: { type: "string" },
      },
    },
    format: {
      type: "object",
      additionalProperties: false,
      properties: {
        moneyLocale: { enum: [...productCompareMoneyLocales] },
        quantityDisplay: { enum: [...productCompareQuantityDisplayModes] },
        quantityCompactLimit: { type: "number", minimum: 1, maximum: 999 },
      },
    },
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        showImages: { type: "boolean" },
        linkTitles: { type: "boolean" },
        ctaMode: { enum: [...productCompareCtaModes] },
        ctaLabel: { type: "string" },
      },
    },
    section: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        caption: { type: "string" },
        hideCaption: { type: "boolean" },
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
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        featuredProductId: { type: "string" },
        stickyHeader: { type: "boolean" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        tableBackground: { type: "string" },
        tableBorderColor: { type: "string" },
        headerBackground: { type: "string" },
        emptyBackground: { type: "string" },
        emptyBorderColor: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              excerpt: { type: ["string", "null"] },
              productHref: { type: ["string", "null"] },
              imageUrl: { type: ["string", "null"] },
              imageAlt: { type: ["string", "null"] },
              priceAmount: { type: "number" },
              currency: { type: "string" },
              compareAtAmount: { type: ["number", "null"] },
              stockState: { enum: ["in_stock", "out_of_stock", "backorder"] },
              stockQuantity: { type: ["number", "null"] },
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

export const normalizeProductCompareData = (value: ProductCompareData): ProductCompareData => {
  const sharedSource = normalizeCommerceWidgetSource(value.source, {
    limit: productCompareDefaults.source?.limit ?? 3,
    sortField: "title",
    sortDir: "asc",
  });
  const source: ProductCompareSource = {
    ...sharedSource,
    limit: Math.min(PRODUCT_COMPARE_MAX_PRODUCTS, sharedSource.limit),
    productIds: normalizeProductCompareProductIds(value.source?.productIds),
  };
  const normalizedRows = normalizeProductCompareRows(value.rows, value.fields);
  const resolvedMeta = normalizeResolvedMeta(value.resolved);
  const hasStyleObject = value.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        tableBackground: resolveClearableStyleValue(value.style?.tableBackground),
        tableBorderColor: resolveClearableStyleValue(value.style?.tableBorderColor),
        headerBackground: resolveClearableStyleValue(value.style?.headerBackground),
        emptyBackground: resolveClearableStyleValue(value.style?.emptyBackground),
        emptyBorderColor: resolveClearableStyleValue(value.style?.emptyBorderColor),
      }) ?? {})
    : undefined;

  const visibilityByKey = Object.fromEntries(
    normalizedRows.map((row) => [row.key, row.visible !== false] as const)
  ) as Record<ProductCompareAttributeKey, boolean>;

  return {
    source,
    rows: normalizedRows,
    fields: {
      showPrice: visibilityByKey.price,
      showCompareAt: visibilityByKey.compareAt,
      showStock: visibilityByKey.stock,
      showStockQuantity: visibilityByKey.quantity,
      showSlug: visibilityByKey.slug,
      showExcerpt: visibilityByKey.excerpt,
    },
    labels: {
      attributeHeader: text(
        value.labels?.attributeHeader,
        productCompareDefaults.labels?.attributeHeader ?? "Attribute"
      ),
      price: resolveAttributeLabel(value.labels, "price"),
      compareAt: resolveAttributeLabel(value.labels, "compareAt"),
      stock: resolveAttributeLabel(value.labels, "stock"),
      quantity: resolveAttributeLabel(value.labels, "quantity"),
      slug: resolveAttributeLabel(value.labels, "slug"),
      excerpt: resolveAttributeLabel(value.labels, "excerpt"),
      inStock: text(value.labels?.inStock, productCompareDefaults.labels?.inStock ?? "In stock"),
      outOfStock: text(
        value.labels?.outOfStock,
        productCompareDefaults.labels?.outOfStock ?? "Out of stock"
      ),
      backorder: text(
        value.labels?.backorder,
        productCompareDefaults.labels?.backorder ?? "Backorder"
      ),
    },
    format: {
      moneyLocale: productCompareMoneyLocales.includes(
        value.format?.moneyLocale as ProductCompareMoneyLocale
      )
        ? (value.format?.moneyLocale as ProductCompareMoneyLocale)
        : (productCompareDefaults.format?.moneyLocale ?? "en-US"),
      quantityDisplay: productCompareQuantityDisplayModes.includes(
        value.format?.quantityDisplay as ProductCompareQuantityDisplayMode
      )
        ? (value.format?.quantityDisplay as ProductCompareQuantityDisplayMode)
        : (productCompareDefaults.format?.quantityDisplay ?? "exact"),
      quantityCompactLimit: clampInteger(
        value.format?.quantityCompactLimit,
        productCompareDefaults.format?.quantityCompactLimit ?? 99,
        1,
        999
      ),
    },
    header: {
      showImages: value.header?.showImages === true,
      linkTitles: value.header?.linkTitles === true,
      ctaMode: productCompareCtaModes.includes(value.header?.ctaMode as ProductCompareCtaMode)
        ? (value.header?.ctaMode as ProductCompareCtaMode)
        : (productCompareDefaults.header?.ctaMode ?? "none"),
      ctaLabel: text(
        value.header?.ctaLabel,
        productCompareDefaults.header?.ctaLabel ?? "View product"
      ),
    },
    section: {
      title: optionalText(value.section?.title) ?? "",
      description: optionalText(value.section?.description) ?? "",
      caption: text(
        value.section?.caption,
        optionalText(value.section?.title) ??
          productCompareDefaults.section?.caption ??
          "Product comparison"
      ),
      hideCaption: value.section?.hideCaption !== false,
    },
    emptyState: {
      title: text(
        value.emptyState?.title,
        productCompareDefaults.emptyState?.title ?? "No products to compare"
      ),
      description: text(
        value.emptyState?.description,
        productCompareDefaults.emptyState?.description ??
          "Update source filters or publish products."
      ),
    },
    layout: {
      featuredProductId: optionalText(value.layout?.featuredProductId) ?? "",
      stickyHeader: value.layout?.stickyHeader === true,
    },
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      rows: normalizeRows(value.resolved?.rows),
      total: resolvedMeta.total,
      resolvedAt: resolvedMeta.resolvedAt,
      ...(resolvedMeta.error ? { error: resolvedMeta.error } : {}),
    },
  };
};

export const buildProductCompareQueryInput = (value: ProductCompareData) => {
  const normalized = normalizeProductCompareData(value);
  const productIds = normalized.source?.productIds ?? [];
  const query = buildCommerceWidgetQueryInput(
    normalizeCommerceWidgetSource(normalized.source, {
      limit: productCompareDefaults.source?.limit ?? 3,
      sortField: "title",
      sortDir: "asc",
    })
  );

  if (productIds.length === 0) return query;

  return {
    filters: [],
    sort: query.sort,
    pagination: {
      limit: productIds.length,
      offset: 0,
    },
    productIds,
  };
};

const resolveStockStateLabel = (
  labels: NonNullable<ProductCompareData["labels"]>,
  state: CommerceWidgetRuntimeCompareRow["stockState"]
) => {
  if (state === "in_stock") return labels.inStock;
  if (state === "backorder") return labels.backorder;
  return labels.outOfStock;
};

const formatProductCompareQuantity = (
  quantity: number | null,
  format: NonNullable<ProductCompareData["format"]>
) => {
  if (typeof quantity !== "number") return "-";
  const compactLimit =
    format.quantityCompactLimit ?? productCompareDefaults.format?.quantityCompactLimit ?? 99;
  if (format.quantityDisplay === "compact" && quantity > compactLimit) {
    return `${compactLimit}+`;
  }
  return String(quantity);
};

const findAttributeRow = (
  rows: ProductCompareAttributeRow[] | undefined,
  key: ProductCompareAttributeKey
) => rows?.find((row) => row.key === key);

const resolveFeaturedProductId = (
  featuredProductId: string | undefined,
  rows: CommerceWidgetRuntimeCompareRow[]
) => {
  if (!featuredProductId) return "";
  return rows.some((row) => row.id === featuredProductId) ? featuredProductId : "";
};

const renderMatrixCellValue = (
  row: CommerceWidgetRuntimeCompareRow,
  metric: ProductCompareAttributeKey,
  normalized: ProductCompareData
) => {
  const labels = normalized.labels ?? productCompareDefaults.labels!;
  const format = normalized.format ?? productCompareDefaults.format!;

  switch (metric) {
    case "price":
      return formatCommerceMoney(row.priceAmount, row.currency, format.moneyLocale);
    case "compareAt":
      return typeof row.compareAtAmount === "number"
        ? formatCommerceMoney(row.compareAtAmount, row.currency, format.moneyLocale)
        : "-";
    case "stock":
      return resolveStockStateLabel(labels, row.stockState);
    case "quantity":
      return formatProductCompareQuantity(row.stockQuantity, format);
    case "slug":
      return row.slug;
    case "excerpt":
      return row.excerpt ?? "-";
  }
};

const renderProductTitle = (
  row: CommerceWidgetRuntimeCompareRow,
  normalized: ProductCompareData,
  className: string
) => {
  const safeHref = normalizeWidgetSafeHref(row.productHref, { allowRelative: true });
  const linkTitles = normalized.header?.linkTitles === true;

  if (linkTitles && safeHref) {
    return (
      <a href={safeHref} className={className}>
        {row.title}
      </a>
    );
  }

  return <span className={className}>{row.title}</span>;
};

const renderProductCta = (row: CommerceWidgetRuntimeCompareRow, normalized: ProductCompareData) => {
  const safeHref = normalizeWidgetSafeHref(row.productHref, { allowRelative: true });
  if (normalized.header?.ctaMode !== "view_product" || !safeHref) return null;
  return (
    <a
      href={safeHref}
      className="inline-flex items-center rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]/70"
    >
      {normalized.header?.ctaLabel}
    </a>
  );
};

const renderProductHeader = (
  row: CommerceWidgetRuntimeCompareRow,
  normalized: ProductCompareData,
  options: {
    featured: boolean;
    compact: boolean;
  }
) => {
  const showImage = normalized.header?.showImages === true && row.imageUrl;

  return (
    <div className={options.compact ? "space-y-2" : "space-y-3"}>
      {options.featured ? (
        <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Featured
        </span>
      ) : null}
      {showImage ? (
        <img
          src={row.imageUrl ?? undefined}
          alt={row.imageAlt ?? row.title}
          className={`w-full rounded-lg object-cover ${options.compact ? "max-h-28" : "max-h-40"}`}
        />
      ) : null}
      <div className="space-y-1">
        {renderProductTitle(
          row,
          normalized,
          options.compact
            ? "text-sm font-semibold text-[var(--color-text)]"
            : "text-base font-semibold text-[var(--color-text)]"
        )}
        <p className="text-xs text-[var(--color-text)]/60">/{row.slug}</p>
      </div>
      {renderProductCta(row, normalized)}
    </div>
  );
};

const renderCardsVariant = (
  normalized: ProductCompareData,
  rows: CommerceWidgetRuntimeCompareRow[],
  featuredProductId: string
) => {
  const visibleMetrics = (normalized.rows ?? []).filter((row) => row.visible !== false);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const featured = featuredProductId === row.id;
        return (
          <article
            key={row.id}
            className={`space-y-4 rounded-xl border p-4 ${
              featured
                ? "border-emerald-400 bg-emerald-50/40"
                : "border-[var(--color-border)] bg-[var(--color-bg)]"
            }`}
            data-product-id={row.id}
          >
            {renderProductHeader(row, normalized, { featured, compact: false })}
            {visibleMetrics.length > 0 ? (
              <dl className="space-y-3">
                {visibleMetrics.map((metric) => (
                  <div key={`${row.id}-${metric.key}`} className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/60">
                      {resolveAttributeLabel(normalized.labels, metric.key)}
                    </dt>
                    <dd className="text-sm text-[var(--color-text)]/85">
                      {renderMatrixCellValue(row, metric.key, normalized)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

export function ProductCompareBlock({
  data,
  variant,
  blockId,
}: {
  data: ProductCompareData;
  variant: string;
  blockId?: string;
}) {
  const normalized = normalizeProductCompareData(data);
  const resolvedRows = normalized.resolved?.rows ?? [];
  const hasError = Boolean(normalized.resolved?.error);
  const resolvedVariant = normalizeVariant(variant);
  const featuredProductId = resolveFeaturedProductId(
    normalized.layout?.featuredProductId,
    resolvedRows
  );
  const headingId =
    normalized.section?.title && blockId ? `${blockId}-product-compare-heading` : undefined;
  const captionText =
    normalized.section?.caption ||
    normalized.section?.title ||
    productCompareDefaults.section?.caption ||
    "Product comparison";
  const tableStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.tableBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.tableBorderColor),
  });
  const headerStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.headerBackground),
  });
  const emptyStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.emptyBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.emptyBorderColor),
  });
  const legacyTableClass =
    normalized.style === undefined ? "border-[var(--color-border)] bg-[var(--color-bg)]" : "";
  const legacyHeaderClass = normalized.style === undefined ? "bg-[var(--color-bg)]/80" : "";
  const legacyEmptyClass =
    normalized.style === undefined ? "border-[var(--color-border)] bg-[var(--color-bg)]/70" : "";
  const visibleMetrics = (normalized.rows ?? []).filter((metric) => metric.visible !== false);
  const compact = resolvedVariant === "compact";
  const stickyHeader = normalized.layout?.stickyHeader === true && resolvedVariant !== "cards";
  const headerPaddingClass = compact ? "px-2 py-2" : "px-3 py-2";
  const bodyPaddingClass = compact ? "px-2 py-2" : "px-3 py-2";

  return (
    <section
      className="space-y-4"
      data-widget="product-compare"
      data-product-compare-count={String(resolvedRows.length)}
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : captionText}
    >
      {normalized.section?.title ? (
        <div className="space-y-2">
          <h2 id={headingId} className="text-xl font-semibold text-[var(--color-text)]">
            {normalized.section.title}
          </h2>
          {normalized.section?.description ? (
            <p className="text-sm text-[var(--color-text)]/75">{normalized.section.description}</p>
          ) : null}
        </div>
      ) : null}

      {hasError ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      {resolvedRows.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
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
      ) : resolvedVariant === "cards" ? (
        renderCardsVariant(normalized, resolvedRows, featuredProductId)
      ) : (
        <div
          tabIndex={0}
          aria-label={captionText}
          className={`overflow-x-auto rounded-xl border ${legacyTableClass}`}
          style={tableStyle}
        >
          <table className={`min-w-full ${compact ? "text-xs" : "text-sm"}`}>
            <caption
              className={
                normalized.section?.hideCaption !== false
                  ? "sr-only"
                  : "px-3 py-2 text-left text-sm text-[var(--color-text)]/70"
              }
            >
              {captionText}
            </caption>
            <thead>
              <tr
                className={`border-b border-[var(--color-border)] ${legacyHeaderClass}`}
                style={headerStyle}
              >
                <th
                  scope="col"
                  className={`${headerPaddingClass} ${stickyHeader ? "sticky left-0 top-0 z-20" : ""} text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65`}
                  style={stickyHeader ? headerStyle : undefined}
                >
                  {normalized.labels?.attributeHeader}
                </th>
                {resolvedRows.map((row) => {
                  const featured = featuredProductId === row.id;
                  return (
                    <th
                      key={row.id}
                      scope="col"
                      className={`${headerPaddingClass} ${stickyHeader ? "sticky top-0 z-10 align-top" : "align-top"} text-left text-[var(--color-text)]/75 ${
                        featured ? "bg-emerald-50/70" : ""
                      }`}
                      style={stickyHeader ? headerStyle : undefined}
                    >
                      {renderProductHeader(row, normalized, { featured, compact })}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleMetrics.map((metric) => (
                <tr
                  key={metric.key}
                  className="border-b border-[var(--color-border)]/70 last:border-b-0"
                >
                  <td className={`${bodyPaddingClass} font-medium text-[var(--color-text)]/80`}>
                    {resolveAttributeLabel(normalized.labels, metric.key)}
                  </td>
                  {resolvedRows.map((row) => {
                    const featured = featuredProductId === row.id;
                    return (
                      <td
                        key={`${metric.key}-${row.id}`}
                        className={`${bodyPaddingClass} text-[var(--color-text)]/75 ${
                          featured ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {renderMatrixCellValue(row, metric.key, normalized)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function createProductCompareWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ProductCompareData>>;
  visual: ComponentType<WidgetEditorProps<ProductCompareData>>;
  advanced: ComponentType<WidgetEditorProps<ProductCompareData>>;
}): WidgetDefinition<ProductCompareData> {
  return {
    type: "product-compare",
    title: "Product Compare",
    description:
      "Comparison matrix with curated products, layout variants, and runtime commerce metadata.",
    category: "content",
    variants: [
      {
        id: "matrix",
        label: "Matrix",
        description: "Attribute rows with products as columns.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Dense comparison table for tighter layouts.",
      },
      {
        id: "cards",
        label: "Cards",
        description: "Product cards with stacked comparison details.",
      },
    ],
    schema: productCompareSchema,
    defaults: productCompareDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorCapabilities: {
      supportsPreviewState: true,
    },
    render: ProductCompareBlock,
  };
}

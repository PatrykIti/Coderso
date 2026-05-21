import React, { type ComponentType, type CSSProperties } from "react";

import type { WidgetDefinition, WidgetEditorProps, WidgetRenderContext } from "../types";
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

export type ProductTableVariantId = "default";
export type ProductTableColumnKey =
  | "title"
  | "slug"
  | "price"
  | "compareAt"
  | "status"
  | "stock"
  | "collections";
export type ProductTableColumnVisibilityKey =
  | "showTitle"
  | "showSlug"
  | "showPrice"
  | "showCompareAt"
  | "showStatus"
  | "showStock"
  | "showCollectionCount";
export type ProductTableLabelKey = ProductTableColumnKey;
export type ProductTableGuardGroup = "identity" | "pricing";

export type ProductTableFields = {
  showTitle?: boolean;
  showSlug?: boolean;
  showPrice?: boolean;
  showStatus?: boolean;
  showStock?: boolean;
  showStockQuantity?: boolean;
  showCompareAt?: boolean;
  showCollectionCount?: boolean;
};

export type ProductTableLabels = {
  title?: string;
  price?: string;
  compareAt?: string;
  status?: string;
  stock?: string;
  collections?: string;
  slug?: string;
};

export type ProductTableColumnDefinition = {
  key: ProductTableColumnKey;
  labelKey: ProductTableLabelKey;
  visibilityKey: ProductTableColumnVisibilityKey;
  toggleLabel: string;
  labelControlLabel: string;
  guardGroup?: ProductTableGuardGroup;
  guardDescription?: string;
};

export type ProductTableData = {
  source?: CommerceWidgetSource;
  fields?: ProductTableFields;
  labels?: ProductTableLabels;
  emptyState?: {
    title?: string;
    description?: string;
  };
  style?: {
    tableBackground?: string;
    tableBorderColor?: string;
    headerBackground?: string;
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

const productTableFieldDefaults: Required<ProductTableFields> = {
  showTitle: true,
  showSlug: true,
  showPrice: true,
  showStatus: true,
  showStock: true,
  showStockQuantity: false,
  showCompareAt: false,
  showCollectionCount: false,
};

const productTableLabelFallbacks: Required<ProductTableLabels> = {
  title: "Product",
  price: "Price",
  compareAt: "Compare at",
  status: "Status",
  stock: "Stock",
  collections: "Collections",
  slug: "Slug",
};

const productTableEmptyStateDefaults = {
  title: "No products available",
  description: "Publish products or adjust source query.",
};

const productTableStatusLabelMap: Record<CommerceWidgetRuntimeCard["status"], string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

const productTableStatusBadgeToneClassMap: Record<CommerceWidgetRuntimeCard["status"], string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-slate-200 bg-slate-100 text-slate-700",
};

const productTableRowToneClassMap: Record<CommerceWidgetRuntimeCard["status"], string> = {
  published: "",
  draft: "bg-amber-50/35",
  archived: "bg-slate-100/70",
};

const productTableStatusBadgeBaseClass =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5";

export const productTableVisibilityGuardCopy: Record<ProductTableGuardGroup, string> = {
  identity:
    "At least one identity column stays visible. Product turns back on when Slug is also hidden.",
  pricing:
    "At least one pricing column stays visible. Price turns back on when Compare at is also hidden.",
};

export const productTableColumns: ProductTableColumnDefinition[] = [
  {
    key: "title",
    labelKey: "title",
    visibilityKey: "showTitle",
    toggleLabel: "Show product",
    labelControlLabel: "Product",
    guardGroup: "identity",
    guardDescription: productTableVisibilityGuardCopy.identity,
  },
  {
    key: "slug",
    labelKey: "slug",
    visibilityKey: "showSlug",
    toggleLabel: "Show slug",
    labelControlLabel: "Slug",
    guardGroup: "identity",
  },
  {
    key: "price",
    labelKey: "price",
    visibilityKey: "showPrice",
    toggleLabel: "Show price",
    labelControlLabel: "Price",
    guardGroup: "pricing",
    guardDescription: productTableVisibilityGuardCopy.pricing,
  },
  {
    key: "compareAt",
    labelKey: "compareAt",
    visibilityKey: "showCompareAt",
    toggleLabel: "Show compare-at price",
    labelControlLabel: "Compare at",
    guardGroup: "pricing",
  },
  {
    key: "status",
    labelKey: "status",
    visibilityKey: "showStatus",
    toggleLabel: "Show status",
    labelControlLabel: "Status",
  },
  {
    key: "stock",
    labelKey: "stock",
    visibilityKey: "showStock",
    toggleLabel: "Show stock",
    labelControlLabel: "Stock",
  },
  {
    key: "collections",
    labelKey: "collections",
    visibilityKey: "showCollectionCount",
    toggleLabel: "Show collection count",
    labelControlLabel: "Collections",
  },
];

export const productTableDefaults: ProductTableData = {
  source: {
    limit: 12,
    search: "",
    collectionIds: [],
    status: [],
    sortField: "updatedAt",
    sortDir: "desc",
  },
  fields: productTableFieldDefaults,
  labels: productTableLabelFallbacks,
  emptyState: productTableEmptyStateDefaults,
  style: {
    tableBackground: "var(--color-bg)",
    tableBorderColor: "var(--color-border)",
    headerBackground: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    emptyBackground: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    emptyBorderColor: "var(--color-border)",
  },
  resolved: {
    items: [],
    total: 0,
    resolvedAt: "",
  },
};

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
          amount:
            typeof payload.pricing?.amount === "number" && Number.isFinite(payload.pricing.amount)
              ? payload.pricing.amount
              : 0,
          currency: text(payload.pricing?.currency, "USD"),
          compareAtAmount:
            typeof payload.pricing?.compareAtAmount === "number" &&
            Number.isFinite(payload.pricing.compareAtAmount)
              ? payload.pricing.compareAtAmount
              : null,
        },
        stock: {
          state:
            payload.stock?.state === "in_stock" ||
            payload.stock?.state === "backorder" ||
            payload.stock?.state === "out_of_stock"
              ? payload.stock.state
              : "out_of_stock",
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

export const normalizeProductTableFields = (
  value: ProductTableData["fields"] | undefined
): Required<ProductTableFields> => {
  const fields: Required<ProductTableFields> = {
    showTitle: value?.showTitle !== false,
    showSlug: value?.showSlug !== false,
    showPrice: value?.showPrice !== false,
    showStatus: value?.showStatus !== false,
    showStock: value?.showStock !== false,
    showStockQuantity: value?.showStockQuantity === true,
    showCompareAt: value?.showCompareAt === true,
    showCollectionCount: value?.showCollectionCount === true,
  };

  if (!fields.showTitle && !fields.showSlug) {
    fields.showTitle = true;
  }

  if (!fields.showPrice && !fields.showCompareAt) {
    fields.showPrice = true;
  }

  return fields;
};

export const normalizeProductTableLabels = (
  value: ProductTableData["labels"] | undefined
): Required<ProductTableLabels> => ({
  title: text(value?.title, productTableLabelFallbacks.title),
  price: text(value?.price, productTableLabelFallbacks.price),
  compareAt: text(value?.compareAt, productTableLabelFallbacks.compareAt),
  status: text(value?.status, productTableLabelFallbacks.status),
  stock: text(value?.stock, productTableLabelFallbacks.stock),
  collections: text(value?.collections, productTableLabelFallbacks.collections),
  slug: text(value?.slug, productTableLabelFallbacks.slug),
});

export const resolveVisibleProductTableColumns = (fields: Required<ProductTableFields>) =>
  productTableColumns.filter((column) => fields[column.visibilityKey]);

export const productTableSchema = {
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
        showTitle: { type: "boolean" },
        showSlug: { type: "boolean" },
        showPrice: { type: "boolean" },
        showStatus: { type: "boolean" },
        showStock: { type: "boolean" },
        showStockQuantity: { type: "boolean" },
        showCompareAt: { type: "boolean" },
        showCollectionCount: { type: "boolean" },
      },
    },
    labels: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        price: { type: "string" },
        compareAt: { type: "string" },
        status: { type: "string" },
        stock: { type: "string" },
        collections: { type: "string" },
        slug: { type: "string" },
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

export const normalizeProductTableData = (value: ProductTableData): ProductTableData => {
  const source = normalizeCommerceWidgetSource(value.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  const fields = normalizeProductTableFields(value.fields);
  const labels = normalizeProductTableLabels(value.labels);
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

  return {
    source,
    fields,
    labels,
    emptyState: {
      title: text(value.emptyState?.title, productTableEmptyStateDefaults.title),
      description: text(value.emptyState?.description, productTableEmptyStateDefaults.description),
    },
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      items: normalizeRuntimeItems(value.resolved?.items),
      total: resolvedMeta.total,
      resolvedAt: resolvedMeta.resolvedAt,
      ...(resolvedMeta.error ? { error: resolvedMeta.error } : {}),
    },
  };
};

export const buildProductTableQueryInput = (value: ProductTableData) => {
  const normalized = normalizeProductTableData(value);
  return buildCommerceWidgetQueryInput(
    normalizeCommerceWidgetSource(normalized.source, {
      limit: productTableDefaults.source?.limit ?? 12,
      sortField: "updatedAt",
      sortDir: "desc",
    })
  );
};

const titleWithStatus = (title: string, status: CommerceWidgetRuntimeCard["status"]) => {
  if (status === "published") return title;
  if (status === "draft") return `${title} (draft)`;
  return `${title} (archived)`;
};

const productTitleValue = (
  item: CommerceWidgetRuntimeCard,
  options: {
    showStatusColumn: boolean;
  }
) => (options.showStatusColumn ? item.title : titleWithStatus(item.title, item.status));

const formatProductTableStockValue = (
  stock: CommerceWidgetRuntimeCard["stock"],
  options: {
    showStockQuantity: boolean;
  }
) => {
  const label = commerceStockLabelMap[stock.state];
  if (!options.showStockQuantity || typeof stock.quantity !== "number") {
    return label;
  }
  return `${label} (${stock.quantity})`;
};

const previewMessage = (renderContext: WidgetRenderContext | undefined) => {
  const message = optionalText(renderContext?.previewState?.message);
  if (!message) return undefined;
  return message.slice(0, maxPreviewStatusMessageLength);
};

const renderProductTableCell = (
  column: ProductTableColumnDefinition,
  item: CommerceWidgetRuntimeCard,
  options: {
    showStatusColumn: boolean;
    showStockQuantity: boolean;
  }
) => {
  switch (column.key) {
    case "title":
      return (
        <td className="px-3 py-2 font-medium text-[var(--color-text)]/85">
          {productTitleValue(item, options)}
        </td>
      );
    case "slug":
      return <td className="px-3 py-2 text-[var(--color-text)]/65">/{item.slug}</td>;
    case "price":
      return (
        <td className="px-3 py-2 text-[var(--color-text)]/80">
          {formatCommerceMoney(item.pricing.amount, item.pricing.currency)}
        </td>
      );
    case "compareAt":
      return (
        <td className="px-3 py-2 text-[var(--color-text)]/65">
          {typeof item.pricing.compareAtAmount === "number"
            ? formatCommerceMoney(item.pricing.compareAtAmount, item.pricing.currency)
            : "-"}
        </td>
      );
    case "status":
      return (
        <td className="px-3 py-2 text-[var(--color-text)]/80">
          <span
            className={`${productTableStatusBadgeBaseClass} ${productTableStatusBadgeToneClassMap[item.status]}`}
            aria-label={`Status: ${productTableStatusLabelMap[item.status]}`}
          >
            {productTableStatusLabelMap[item.status]}
          </span>
        </td>
      );
    case "stock":
      return (
        <td className="px-3 py-2 text-[var(--color-text)]/65">
          {formatProductTableStockValue(item.stock, options)}
        </td>
      );
    case "collections":
      return <td className="px-3 py-2 text-[var(--color-text)]/65">{item.collectionIds.length}</td>;
    default:
      return null;
  }
};

export function ProductTableBlock({
  data,
  renderContext,
}: {
  data: ProductTableData;
  variant: string;
  renderContext?: WidgetRenderContext;
}) {
  const normalized = normalizeProductTableData(data);
  const items = normalized.resolved?.items ?? [];
  const fields = normalizeProductTableFields(normalized.fields);
  const visibleColumns = resolveVisibleProductTableColumns(fields);
  const showStatusColumn = visibleColumns.some((column) => column.key === "status");
  const hasError = Boolean(normalized.resolved?.error);
  const previewState = renderContext?.previewState ?? null;
  const previewLoading = previewState?.status === "loading";
  const previewError = previewState?.status === "error" ? previewMessage(renderContext) : undefined;
  const isEditorPreview =
    renderContext?.mode === "editor-preview" || renderContext?.mode === "admin-preview";
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

  return (
    <section
      className="space-y-4"
      data-widget="product-table"
      data-product-table-count={String(items.length)}
    >
      {previewLoading ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          Refreshing Product Table preview...
        </div>
      ) : null}

      {previewError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Product Table preview warning: {previewError}
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div
          className={`rounded-xl border border-dashed px-4 py-6 text-center ${legacyEmptyClass}`}
          style={emptyStyle}
          role={isEditorPreview ? "status" : undefined}
          aria-live={isEditorPreview ? "polite" : undefined}
        >
          <p className="text-sm font-medium text-[var(--color-text)]">
            {normalized.emptyState?.title}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text)]/70">
            {normalized.emptyState?.description}
          </p>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-xl border ${legacyTableClass}`} style={tableStyle}>
          <table className="min-w-full text-sm">
            <thead>
              <tr
                className={`border-b border-[var(--color-border)] ${legacyHeaderClass}`}
                style={headerStyle}
              >
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65"
                  >
                    {normalized.labels?.[column.labelKey]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-[var(--color-border)]/70 last:border-b-0 ${productTableRowToneClassMap[item.status]}`}
                  data-product-status={item.status}
                >
                  {visibleColumns.map((column) => (
                    <React.Fragment key={column.key}>
                      {renderProductTableCell(column, item, {
                        showStatusColumn,
                        showStockQuantity: fields.showStockQuantity,
                      })}
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function createProductTableWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ProductTableData>>;
  visual: ComponentType<WidgetEditorProps<ProductTableData>>;
  advanced: ComponentType<WidgetEditorProps<ProductTableData>>;
}): WidgetDefinition<ProductTableData> {
  return {
    type: "product-table",
    title: "Product Table",
    description: "Tabular product list with configurable columns.",
    category: "content",
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Standard product table for dense catalogs.",
      },
    ],
    schema: productTableSchema,
    defaults: productTableDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorCapabilities: {
      supportsPreviewState: true,
    },
    render: ProductTableBlock,
  };
}

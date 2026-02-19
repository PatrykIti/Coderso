import type { ComponentType } from "react";

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

export type ProductCompareVariantId = "matrix";

export type ProductCompareData = {
  source?: CommerceWidgetSource;
  fields?: {
    showCompareAt?: boolean;
    showStockQuantity?: boolean;
    showSlug?: boolean;
  };
  labels?: {
    price?: string;
    compareAt?: string;
    stock?: string;
    quantity?: string;
    slug?: string;
  };
  emptyState?: {
    title?: string;
    description?: string;
  };
  resolved?: {
    rows?: CommerceWidgetRuntimeCompareRow[];
    total?: number;
    resolvedAt?: string;
    error?: string;
  };
};

export const productCompareDefaults: ProductCompareData = {
  source: {
    limit: 3,
    search: "",
    collectionIds: [],
    status: [],
    sortField: "title",
    sortDir: "asc",
  },
  fields: {
    showCompareAt: true,
    showStockQuantity: true,
    showSlug: false,
  },
  labels: {
    price: "Price",
    compareAt: "Compare at",
    stock: "Stock",
    quantity: "Quantity",
    slug: "Slug",
  },
  emptyState: {
    title: "No products to compare",
    description: "Update source filters or publish products.",
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
        priceAmount:
          typeof payload.priceAmount === "number" && Number.isFinite(payload.priceAmount)
            ? payload.priceAmount
            : 0,
        currency: text(payload.currency, "USD"),
        compareAtAmount:
          typeof payload.compareAtAmount === "number" &&
          Number.isFinite(payload.compareAtAmount)
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
        limit: { type: "number", minimum: 1, maximum: 12 },
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
        showCompareAt: { type: "boolean" },
        showStockQuantity: { type: "boolean" },
        showSlug: { type: "boolean" },
      },
    },
    labels: {
      type: "object",
      additionalProperties: false,
      properties: {
        price: { type: "string" },
        compareAt: { type: "string" },
        stock: { type: "string" },
        quantity: { type: "string" },
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
  const source = normalizeCommerceWidgetSource(value.source, {
    limit: productCompareDefaults.source?.limit ?? 3,
    sortField: "title",
    sortDir: "asc",
  });
  const resolvedMeta = normalizeResolvedMeta(value.resolved);

  return {
    source,
    fields: {
      showCompareAt: value.fields?.showCompareAt !== false,
      showStockQuantity: value.fields?.showStockQuantity !== false,
      showSlug: value.fields?.showSlug === true,
    },
    labels: {
      price: text(value.labels?.price, productCompareDefaults.labels?.price ?? "Price"),
      compareAt: text(
        value.labels?.compareAt,
        productCompareDefaults.labels?.compareAt ?? "Compare at"
      ),
      stock: text(value.labels?.stock, productCompareDefaults.labels?.stock ?? "Stock"),
      quantity: text(
        value.labels?.quantity,
        productCompareDefaults.labels?.quantity ?? "Quantity"
      ),
      slug: text(value.labels?.slug, productCompareDefaults.labels?.slug ?? "Slug"),
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
  return buildCommerceWidgetQueryInput(
    normalizeCommerceWidgetSource(normalized.source, {
      limit: productCompareDefaults.source?.limit ?? 3,
      sortField: "title",
      sortDir: "asc",
    })
  );
};

export function ProductCompareBlock({ data }: { data: ProductCompareData; variant: string }) {
  const normalized = normalizeProductCompareData(data);
  const rows = normalized.resolved?.rows ?? [];
  const hasError = Boolean(normalized.resolved?.error);
  const metrics: Array<{
    id: string;
    label: string;
    render: (row: CommerceWidgetRuntimeCompareRow) => string;
    visible: boolean;
  }> = [
    {
      id: "price",
      label: normalized.labels?.price ?? "Price",
      visible: true,
      render: (row) => formatCommerceMoney(row.priceAmount, row.currency),
    },
    {
      id: "compareAt",
      label: normalized.labels?.compareAt ?? "Compare at",
      visible: normalized.fields?.showCompareAt !== false,
      render: (row) =>
        typeof row.compareAtAmount === "number"
          ? formatCommerceMoney(row.compareAtAmount, row.currency)
          : "-",
    },
    {
      id: "stock",
      label: normalized.labels?.stock ?? "Stock",
      visible: true,
      render: (row) => commerceStockLabelMap[row.stockState] ?? "Out of stock",
    },
    {
      id: "quantity",
      label: normalized.labels?.quantity ?? "Quantity",
      visible: normalized.fields?.showStockQuantity !== false,
      render: (row) =>
        typeof row.stockQuantity === "number" ? String(row.stockQuantity) : "-",
    },
    {
      id: "slug",
      label: normalized.labels?.slug ?? "Slug",
      visible: normalized.fields?.showSlug === true,
      render: (row) => row.slug,
    },
  ];

  const visibleMetrics = metrics.filter((metric) => metric.visible);

  return (
    <section
      className="space-y-4"
      data-widget="product-compare"
      data-product-compare-count={String(rows.length)}
    >
      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">
            {normalized.emptyState?.title}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text)]/70">
            {normalized.emptyState?.description}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/80">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                  Attribute
                </th>
                {rows.map((row) => (
                  <th
                    key={row.id}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/75"
                  >
                    {row.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleMetrics.map((metric) => (
                <tr key={metric.id} className="border-b border-[var(--color-border)]/70 last:border-b-0">
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]/80">{metric.label}</td>
                  {rows.map((row) => (
                    <td key={`${metric.id}-${row.id}`} className="px-3 py-2 text-[var(--color-text)]/75">
                      {metric.render(row)}
                    </td>
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

export function createProductCompareWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ProductCompareData>>;
  visual: ComponentType<WidgetEditorProps<ProductCompareData>>;
  advanced: ComponentType<WidgetEditorProps<ProductCompareData>>;
}): WidgetDefinition<ProductCompareData> {
  return {
    type: "product-compare",
    title: "Product Compare",
    description: "Comparison matrix for product attributes and pricing.",
    category: "content",
    variants: [
      {
        id: "matrix",
        label: "Matrix",
        description: "Attribute rows with products as columns.",
      },
    ],
    schema: productCompareSchema,
    defaults: productCompareDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    render: ProductCompareBlock,
  };
}

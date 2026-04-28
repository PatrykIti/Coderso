import type { ComponentType } from "react";

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

export type ProductTableVariantId = "default";

export type ProductTableData = {
  source?: CommerceWidgetSource;
  fields?: {
    showSlug?: boolean;
    showStatus?: boolean;
    showStock?: boolean;
    showCompareAt?: boolean;
    showCollectionCount?: boolean;
  };
  labels?: {
    title?: string;
    price?: string;
    compareAt?: string;
    status?: string;
    stock?: string;
    collections?: string;
    slug?: string;
  };
  emptyState?: {
    title?: string;
    description?: string;
  };
  resolved?: {
    items?: CommerceWidgetRuntimeCard[];
    total?: number;
    resolvedAt?: string;
    error?: string;
  };
};

export const productTableDefaults: ProductTableData = {
  source: {
    limit: 12,
    search: "",
    collectionIds: [],
    status: [],
    sortField: "updatedAt",
    sortDir: "desc",
  },
  fields: {
    showSlug: true,
    showStatus: true,
    showStock: true,
    showCompareAt: false,
    showCollectionCount: false,
  },
  labels: {
    title: "Product",
    price: "Price",
    compareAt: "Compare at",
    status: "Status",
    stock: "Stock",
    collections: "Collections",
    slug: "Slug",
  },
  emptyState: {
    title: "No products available",
    description: "Publish products or adjust source query.",
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

      return {
        id,
        title,
        slug,
        excerpt: optionalText(payload.excerpt ?? undefined) ?? null,
        status: payload.status === "draft" || payload.status === "archived" ? payload.status : "published",
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
        showSlug: { type: "boolean" },
        showStatus: { type: "boolean" },
        showStock: { type: "boolean" },
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
  const resolvedMeta = normalizeResolvedMeta(value.resolved);

  return {
    source,
    fields: {
      showSlug: value.fields?.showSlug !== false,
      showStatus: value.fields?.showStatus !== false,
      showStock: value.fields?.showStock !== false,
      showCompareAt: value.fields?.showCompareAt === true,
      showCollectionCount: value.fields?.showCollectionCount === true,
    },
    labels: {
      title: text(value.labels?.title, productTableDefaults.labels?.title ?? "Product"),
      price: text(value.labels?.price, productTableDefaults.labels?.price ?? "Price"),
      compareAt: text(
        value.labels?.compareAt,
        productTableDefaults.labels?.compareAt ?? "Compare at"
      ),
      status: text(value.labels?.status, productTableDefaults.labels?.status ?? "Status"),
      stock: text(value.labels?.stock, productTableDefaults.labels?.stock ?? "Stock"),
      collections: text(
        value.labels?.collections,
        productTableDefaults.labels?.collections ?? "Collections"
      ),
      slug: text(value.labels?.slug, productTableDefaults.labels?.slug ?? "Slug"),
    },
    emptyState: {
      title: text(
        value.emptyState?.title,
        productTableDefaults.emptyState?.title ?? "No products available"
      ),
      description: text(
        value.emptyState?.description,
        productTableDefaults.emptyState?.description ??
          "Publish products or adjust source query."
      ),
    },
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

export function ProductTableBlock({ data }: { data: ProductTableData; variant: string }) {
  const normalized = normalizeProductTableData(data);
  const items = normalized.resolved?.items ?? [];
  const hasError = Boolean(normalized.resolved?.error);

  return (
    <section className="space-y-4" data-widget="product-table" data-product-table-count={String(items.length)}>
      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      {items.length === 0 ? (
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
                  {normalized.labels?.title}
                </th>
                {normalized.fields?.showSlug ? (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                    {normalized.labels?.slug}
                  </th>
                ) : null}
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                  {normalized.labels?.price}
                </th>
                {normalized.fields?.showCompareAt ? (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                    {normalized.labels?.compareAt}
                  </th>
                ) : null}
                {normalized.fields?.showStatus ? (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                    {normalized.labels?.status}
                  </th>
                ) : null}
                {normalized.fields?.showStock ? (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                    {normalized.labels?.stock}
                  </th>
                ) : null}
                {normalized.fields?.showCollectionCount ? (
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
                    {normalized.labels?.collections}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]/70 last:border-b-0">
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]/85">
                    {titleWithStatus(item.title, item.status)}
                  </td>
                  {normalized.fields?.showSlug ? (
                    <td className="px-3 py-2 text-[var(--color-text)]/65">/{item.slug}</td>
                  ) : null}
                  <td className="px-3 py-2 text-[var(--color-text)]/80">
                    {formatCommerceMoney(item.pricing.amount, item.pricing.currency)}
                  </td>
                  {normalized.fields?.showCompareAt ? (
                    <td className="px-3 py-2 text-[var(--color-text)]/65">
                      {typeof item.pricing.compareAtAmount === "number"
                        ? formatCommerceMoney(
                            item.pricing.compareAtAmount,
                            item.pricing.currency
                          )
                        : "-"}
                    </td>
                  ) : null}
                  {normalized.fields?.showStatus ? (
                    <td className="px-3 py-2 text-[var(--color-text)]/65">{item.status}</td>
                  ) : null}
                  {normalized.fields?.showStock ? (
                    <td className="px-3 py-2 text-[var(--color-text)]/65">
                      {commerceStockLabelMap[item.stock.state]}
                    </td>
                  ) : null}
                  {normalized.fields?.showCollectionCount ? (
                    <td className="px-3 py-2 text-[var(--color-text)]/65">
                      {item.collectionIds.length}
                    </td>
                  ) : null}
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
    render: ProductTableBlock,
  };
}

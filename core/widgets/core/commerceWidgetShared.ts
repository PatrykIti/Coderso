export const commerceWidgetStatusValues = ["draft", "published", "archived"] as const;
export type CommerceWidgetStatus = (typeof commerceWidgetStatusValues)[number];

export const commerceWidgetSortFieldValues = [
  "title",
  "slug",
  "status",
  "pricing.amount",
  "stock.state",
  "createdAt",
  "updatedAt",
  "publishedAt",
] as const;
export type CommerceWidgetSortField = (typeof commerceWidgetSortFieldValues)[number];

export const commerceWidgetSortDirectionValues = ["asc", "desc"] as const;
export type CommerceWidgetSortDirection = (typeof commerceWidgetSortDirectionValues)[number];

export type CommerceWidgetRuntimeCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: CommerceWidgetStatus;
  pricing: {
    amount: number;
    currency: string;
    compareAtAmount: number | null;
  };
  stock: {
    state: "in_stock" | "out_of_stock" | "backorder";
    quantity: number | null;
    inStock: boolean;
  };
  primaryMediaId: string | null;
  mediaIds: string[];
  collectionIds: string[];
};

export type CommerceWidgetRuntimeCompareRow = {
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
  stockState: "in_stock" | "out_of_stock" | "backorder";
  stockQuantity: number | null;
};

export type CommerceWidgetSource = {
  limit?: number;
  search?: string;
  collectionIds?: string[];
  status?: CommerceWidgetStatus[];
  sortField?: CommerceWidgetSortField;
  sortDir?: CommerceWidgetSortDirection;
};

export type NormalizedCommerceWidgetSource = {
  limit: number;
  search: string;
  collectionIds: string[];
  status: CommerceWidgetStatus[];
  sortField: CommerceWidgetSortField;
  sortDir: CommerceWidgetSortDirection;
};

export type CommerceWidgetResolvedMeta = {
  total?: number;
  resolvedAt?: string;
  error?: string;
};

const toText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized < min) return min;
  if (normalized > max) return max;
  return normalized;
};

const normalizeCollectionIds = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(
    new Set(value.map((entry) => toText(entry)).filter((entry) => entry.length > 0))
  ).slice(0, 30);
};

const normalizeStatus = (value: unknown) => {
  if (!Array.isArray(value)) return [] as CommerceWidgetStatus[];
  return Array.from(
    new Set(
      value
        .map((entry) => toText(entry))
        .filter((entry): entry is CommerceWidgetStatus =>
          commerceWidgetStatusValues.includes(entry as CommerceWidgetStatus)
        )
    )
  );
};

export const normalizeCommerceWidgetSource = (
  value: CommerceWidgetSource | null | undefined,
  defaults: {
    limit: number;
    sortField?: CommerceWidgetSortField;
    sortDir?: CommerceWidgetSortDirection;
  }
): NormalizedCommerceWidgetSource => {
  const fallbackSortField = defaults.sortField ?? "updatedAt";
  const fallbackSortDir = defaults.sortDir ?? "desc";

  const sortFieldCandidate = toText(value?.sortField);
  const sortDirCandidate = toText(value?.sortDir);

  const sortField = commerceWidgetSortFieldValues.includes(
    sortFieldCandidate as CommerceWidgetSortField
  )
    ? (sortFieldCandidate as CommerceWidgetSortField)
    : fallbackSortField;

  const sortDir = commerceWidgetSortDirectionValues.includes(
    sortDirCandidate as CommerceWidgetSortDirection
  )
    ? (sortDirCandidate as CommerceWidgetSortDirection)
    : fallbackSortDir;

  return {
    limit: clampInteger(value?.limit, defaults.limit, 1, 48),
    search: toText(value?.search),
    collectionIds: normalizeCollectionIds(value?.collectionIds),
    status: normalizeStatus(value?.status),
    sortField,
    sortDir,
  };
};

export const buildCommerceWidgetQueryInput = (source: NormalizedCommerceWidgetSource) => ({
  pagination: {
    limit: source.limit,
    offset: 0,
  },
  sort: [{ field: source.sortField, dir: source.sortDir }],
  ...(source.search ? { search: source.search } : {}),
  ...(source.collectionIds.length > 0 ? { collectionIds: source.collectionIds } : {}),
  ...(source.status.length > 0 ? { status: source.status } : {}),
});

export const normalizeResolvedMeta = (value: CommerceWidgetResolvedMeta | undefined) => ({
  total:
    typeof value?.total === "number" && Number.isFinite(value.total)
      ? Math.max(0, Math.floor(value.total))
      : 0,
  resolvedAt: toText(value?.resolvedAt),
  error: toText(value?.error),
});

export const formatCommerceMoney = (amount: number, currency: string, locale = "en-US") => {
  if (!Number.isFinite(amount)) return "-";
  const normalizedCurrency = toText(currency).toUpperCase() || "USD";
  const normalizedAmount = amount / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalizedAmount);
  } catch {
    return `${normalizedAmount.toFixed(2)} ${normalizedCurrency}`;
  }
};

export const commerceStockLabelMap: Record<CommerceWidgetRuntimeCard["stock"]["state"], string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  backorder: "Backorder",
};

export const commerceSortFieldLabelMap: Record<CommerceWidgetSortField, string> = {
  title: "Title",
  slug: "Slug",
  status: "Status",
  "pricing.amount": "Price",
  "stock.state": "Stock",
  createdAt: "Created",
  updatedAt: "Updated",
  publishedAt: "Published",
};

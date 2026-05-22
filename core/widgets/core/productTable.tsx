import React, { type ComponentType, type CSSProperties } from "react";

import type { WidgetDefinition, WidgetEditorProps, WidgetRenderContext } from "../types";
import {
  buildCommerceWidgetQueryInput,
  commerceSortFieldLabelMap,
  commerceStockLabelMap,
  commerceWidgetStatusValues,
  formatCommerceMoney,
  normalizeCommerceWidgetSource,
  normalizeResolvedMeta,
  type CommerceWidgetRuntimeCard,
  type CommerceWidgetSortDirection,
  type CommerceWidgetSortField,
  type CommerceWidgetSource,
  type CommerceWidgetStatus,
} from "./commerceWidgetShared";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export const productTableVariantValues = ["default", "compact"] as const;
export type ProductTableVariantId = (typeof productTableVariantValues)[number];
export const productTableDensityValues = ["compact", "comfortable", "spacious"] as const;
export type ProductTableDensity = (typeof productTableDensityValues)[number];
export const productTableRowTreatmentValues = ["plain", "striped"] as const;
export type ProductTableRowTreatment = (typeof productTableRowTreatmentValues)[number];
export const productTableTypographyValues = ["compact", "balanced", "prominent"] as const;
export type ProductTableTypography = (typeof productTableTypographyValues)[number];
export const productTableMaxWidthValues = ["full", "content", "wide"] as const;
export type ProductTableMaxWidth = (typeof productTableMaxWidthValues)[number];
export const productTableAlignValues = ["left", "center"] as const;
export type ProductTableAlign = (typeof productTableAlignValues)[number];

export type ProductTableStyle = {
  density?: ProductTableDensity;
  rowTreatment?: ProductTableRowTreatment;
  hoverRows?: boolean;
  stickyHeader?: boolean;
  maxWidth?: ProductTableMaxWidth;
  align?: ProductTableAlign;
  typography?: ProductTableTypography;
  tableBackground?: string;
  tableBorderColor?: string;
  headerBackground?: string;
  emptyBackground?: string;
  emptyBorderColor?: string;
};

type ProductTableResolvedStyle = {
  density: ProductTableDensity;
  rowTreatment: ProductTableRowTreatment;
  hoverRows: boolean;
  stickyHeader: boolean;
  maxWidth: ProductTableMaxWidth;
  align: ProductTableAlign;
  typography: ProductTableTypography;
  tableBackground?: string;
  tableBorderColor?: string;
  headerBackground?: string;
  emptyBackground?: string;
  emptyBorderColor?: string;
};

export type ProductTableResolvedMedia = {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ProductTableColumnKey =
  | "image"
  | "title"
  | "excerpt"
  | "slug"
  | "price"
  | "compareAt"
  | "status"
  | "stock"
  | "collections";
export type ProductTableColumnVisibilityKey =
  | "showImage"
  | "showTitle"
  | "showExcerpt"
  | "showSlug"
  | "showPrice"
  | "showCompareAt"
  | "showStatus"
  | "showStock"
  | "showCollectionCount";
export type ProductTableLabelKey = ProductTableColumnKey;
export type ProductTableGuardGroup = "identity" | "pricing";
export const productTableLinkColumnValues = ["none", "title", "slug"] as const;
export type ProductTableLinkColumn = (typeof productTableLinkColumnValues)[number];
export const productTableSortingModeValues = ["none", "indicator", "interactive"] as const;
export type ProductTableSortingMode = (typeof productTableSortingModeValues)[number];
export const productTablePaginationModeValues = ["none", "paged", "load-more"] as const;
export type ProductTablePaginationMode = (typeof productTablePaginationModeValues)[number];
export const productTableMoneyLocaleValues = ["en-US", "pl-PL", "de-DE", "fr-FR"] as const;
export type ProductTableMoneyLocale = (typeof productTableMoneyLocaleValues)[number];
export const productTableCurrencyDisplayValues = ["symbol", "code", "name"] as const;
export type ProductTableCurrencyDisplay = (typeof productTableCurrencyDisplayValues)[number];
export const productTablePublicPageSizeMin = 1;
export const productTablePublicPageSizeMax = 24;

export type ProductTableLinks = {
  linkedColumn?: ProductTableLinkColumn;
  showAction?: boolean;
  actionLabel?: string;
  openInNewTab?: boolean;
};

export type ProductTableRuntimeCollectionOption = {
  id: string;
  label: string;
  slug?: string;
};

export type ProductTableRuntimeRetainedParam = {
  name: string;
  value: string;
};

export type ProductTableResolvedRuntime = {
  searchQuery?: string;
  status?: CommerceWidgetStatus[];
  collectionIds?: string[];
  availableStatuses?: CommerceWidgetStatus[];
  availableCollections?: ProductTableRuntimeCollectionOption[];
  sortField?: CommerceWidgetSortField;
  sortDir?: CommerceWidgetSortDirection;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  previousPageHref?: string;
  nextPageHref?: string;
  clearHref?: string;
  retainedParams?: ProductTableRuntimeRetainedParam[];
  rejectedTokens?: string[];
};

export type ProductTableRuntimeItem = CommerceWidgetRuntimeCard & {
  productHref: string | null;
  media?: ProductTableResolvedMedia | null;
};

export type ProductTableHeader = {
  eyebrow?: string;
  title?: string;
  description?: string;
};

export type ProductTableFields = {
  showImage?: boolean;
  showTitle?: boolean;
  showExcerpt?: boolean;
  showSlug?: boolean;
  showPrice?: boolean;
  showStatus?: boolean;
  showStock?: boolean;
  showStockQuantity?: boolean;
  showCompareAt?: boolean;
  showCollectionCount?: boolean;
};

export type ProductTableControls = {
  showSearchInput?: boolean;
  showCollectionFilter?: boolean;
  showStatusFilter?: boolean;
  sorting?: ProductTableSortingMode;
  pagination?: ProductTablePaginationMode;
  pageSize?: number;
};

export type ProductTableFormat = {
  moneyLocale?: ProductTableMoneyLocale;
  currencyDisplay?: ProductTableCurrencyDisplay;
};

export type ProductTableExport = {
  enabled?: boolean;
  label?: string;
};

export type ProductTableLabels = {
  image?: string;
  title?: string;
  excerpt?: string;
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
  header?: ProductTableHeader;
  fields?: ProductTableFields;
  controls?: ProductTableControls;
  format?: ProductTableFormat;
  export?: ProductTableExport;
  labels?: ProductTableLabels;
  links?: ProductTableLinks;
  emptyState?: {
    title?: string;
    description?: string;
  };
  style?: ProductTableStyle;
  resolved?: {
    items?: ProductTableRuntimeItem[];
    total?: number;
    resolvedAt?: string;
    runtime?: ProductTableResolvedRuntime;
    error?: string;
  };
};

const productTableFieldDefaults: Required<ProductTableFields> = {
  showImage: false,
  showTitle: true,
  showExcerpt: false,
  showSlug: true,
  showPrice: true,
  showStatus: true,
  showStock: true,
  showStockQuantity: false,
  showCompareAt: false,
  showCollectionCount: false,
};

const productTableControlDefaults: Required<ProductTableControls> = {
  showSearchInput: false,
  showCollectionFilter: false,
  showStatusFilter: false,
  sorting: "none",
  pagination: "none",
  pageSize: 12,
};

const productTableFormatDefaults: Required<ProductTableFormat> = {
  moneyLocale: "en-US",
  currencyDisplay: "symbol",
};

const productTableExportDefaults: Required<ProductTableExport> = {
  enabled: false,
  label: "Export CSV",
};

const productTableLabelFallbacks: Required<ProductTableLabels> = {
  image: "Image",
  title: "Product",
  excerpt: "Excerpt",
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

const productTableLinkDefaults: Required<ProductTableLinks> = {
  linkedColumn: "none",
  showAction: false,
  actionLabel: "View",
  openInNewTab: false,
};

const productTableStyleDefaults: Pick<
  ProductTableResolvedStyle,
  "density" | "rowTreatment" | "hoverRows" | "stickyHeader" | "maxWidth" | "align" | "typography"
> = {
  density: "comfortable",
  rowTreatment: "plain",
  hoverRows: false,
  stickyHeader: false,
  maxWidth: "full",
  align: "left",
  typography: "balanced",
};

const productTableVariantStylePresetMap: Record<
  ProductTableVariantId,
  Pick<
    ProductTableResolvedStyle,
    "density" | "rowTreatment" | "hoverRows" | "stickyHeader" | "maxWidth" | "align" | "typography"
  >
> = {
  default: productTableStyleDefaults,
  compact: {
    ...productTableStyleDefaults,
    density: "compact",
    maxWidth: "content",
    typography: "compact",
  },
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
  "inline-flex items-center rounded-full border px-2 py-0.5 font-medium leading-5";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const productTableDensityClassMap: Record<
  ProductTableDensity,
  {
    table: string;
    header: string;
    cell: string;
    action: string;
    imageCell: string;
    image: string;
    imageWrapper: string;
  }
> = {
  compact: {
    table: "text-xs",
    header: "px-2 py-2",
    cell: "px-2 py-1.5",
    action: "px-2 py-1.5",
    imageCell: "w-20",
    image: "h-10 w-10",
    imageWrapper: "min-h-10",
  },
  comfortable: {
    table: "text-sm",
    header: "px-3 py-2.5",
    cell: "px-3 py-2",
    action: "px-3 py-2",
    imageCell: "w-24",
    image: "h-14 w-14",
    imageWrapper: "min-h-14",
  },
  spacious: {
    table: "text-sm",
    header: "px-4 py-3",
    cell: "px-4 py-3",
    action: "px-4 py-3",
    imageCell: "w-28",
    image: "h-16 w-16",
    imageWrapper: "min-h-16",
  },
};

const productTableTypographyClassMap: Record<
  ProductTableTypography,
  {
    sectionEyebrow: string;
    sectionTitle: string;
    sectionDescription: string;
    header: string;
    title: string;
    body: string;
    support: string;
    excerpt: string;
    badge: string;
    action: string;
  }
> = {
  compact: {
    sectionEyebrow: "text-[11px]",
    sectionTitle: "text-xl",
    sectionDescription: "text-sm",
    header: "text-[11px]",
    title: "text-sm",
    body: "text-xs",
    support: "text-[11px]",
    excerpt: "text-xs leading-5",
    badge: "text-[10px]",
    action: "text-[11px]",
  },
  balanced: {
    sectionEyebrow: "text-xs",
    sectionTitle: "text-2xl",
    sectionDescription: "text-sm",
    header: "text-xs",
    title: "text-sm",
    body: "text-sm",
    support: "text-xs",
    excerpt: "text-sm leading-6",
    badge: "text-[11px]",
    action: "text-xs",
  },
  prominent: {
    sectionEyebrow: "text-sm",
    sectionTitle: "text-3xl",
    sectionDescription: "text-base",
    header: "text-sm",
    title: "text-base",
    body: "text-sm",
    support: "text-sm",
    excerpt: "text-sm leading-6",
    badge: "text-xs",
    action: "text-sm",
  },
};

const productTableMaxWidthClassMap: Record<ProductTableMaxWidth, string> = {
  full: "max-w-none",
  content: "max-w-5xl",
  wide: "max-w-7xl",
};

const productTableAlignClassMap: Record<ProductTableAlign, string> = {
  left: "mr-auto",
  center: "mx-auto",
};

const productTableHoverRowClassName = "hover:bg-slate-50/40";
const productTableStripedRowClassName = "bg-slate-50/40";

const productTableColumnSortFieldMap: Partial<
  Record<ProductTableColumnKey, CommerceWidgetSortField>
> = {
  title: "title",
  slug: "slug",
  price: "pricing.amount",
  status: "status",
  stock: "stock.state",
};

export const productTableVisibilityGuardCopy: Record<ProductTableGuardGroup, string> = {
  identity:
    "At least one identity column stays visible. Product turns back on when Slug is also hidden.",
  pricing:
    "At least one pricing column stays visible. Price turns back on when Compare at is also hidden.",
};

export const productTableColumns: ProductTableColumnDefinition[] = [
  {
    key: "image",
    labelKey: "image",
    visibilityKey: "showImage",
    toggleLabel: "Show image",
    labelControlLabel: "Image",
  },
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
    key: "excerpt",
    labelKey: "excerpt",
    visibilityKey: "showExcerpt",
    toggleLabel: "Show excerpt",
    labelControlLabel: "Excerpt",
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
  header: {},
  fields: productTableFieldDefaults,
  controls: productTableControlDefaults,
  format: productTableFormatDefaults,
  export: productTableExportDefaults,
  labels: productTableLabelFallbacks,
  links: productTableLinkDefaults,
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
    runtime: {
      searchQuery: "",
      status: [],
      collectionIds: [],
      availableStatuses: [],
      availableCollections: [],
      sortField: "updatedAt",
      sortDir: "desc",
      page: 1,
      pageSize: 12,
      totalPages: 1,
      previousPageHref: "",
      nextPageHref: "",
      clearHref: "?",
      retainedParams: [],
      rejectedTokens: [],
    },
  },
};

const maxPreviewStatusMessageLength = 160;
const productTableDefaultCaptionText = "Product table";
const productTableExcerptMaxLength = 160;

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

const positiveInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
};

const normalizeProductTableRuntimeHref = (value: unknown) => {
  const trimmed = optionalText(value);
  if (!trimmed) return undefined;
  if (trimmed.startsWith("?")) return trimmed;
  return (
    normalizeWidgetSafeHref(trimmed, {
      allowRelative: true,
      allowHttp: true,
    }) ?? undefined
  );
};

const normalizeProductTableStatusList = (value: unknown) => {
  if (!Array.isArray(value)) return [] as CommerceWidgetStatus[];
  return Array.from(
    new Set(
      value
        .map((entry) => optionalText(entry))
        .filter((entry): entry is CommerceWidgetStatus =>
          commerceWidgetStatusValues.includes(entry as CommerceWidgetStatus)
        )
    )
  );
};

const normalizeProductTableCollectionList = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(
    new Set(
      value.map((entry) => optionalText(entry)).filter((entry): entry is string => Boolean(entry))
    )
  );
};

const normalizeProductTableRuntimeRetainedParams = (
  value: unknown
): ProductTableRuntimeRetainedParam[] => {
  if (!Array.isArray(value)) return [];
  const params: ProductTableRuntimeRetainedParam[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const payload = entry as ProductTableRuntimeRetainedParam;
    const name = optionalText(payload.name);
    const paramValue = optionalText(payload.value);
    if (!name || paramValue === undefined) continue;
    params.push({ name, value: paramValue });
  }

  return params;
};

const normalizeProductTableRuntimeCollections = (
  value: unknown
): ProductTableRuntimeCollectionOption[] => {
  if (!Array.isArray(value)) return [];
  const items: ProductTableRuntimeCollectionOption[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const payload = entry as ProductTableRuntimeCollectionOption;
    const id = optionalText(payload.id);
    const label = optionalText(payload.label);
    if (!id || !label) continue;
    items.push(
      compactObject({
        id,
        label,
        slug: optionalText(payload.slug),
      }) as ProductTableRuntimeCollectionOption
    );
  }

  return items;
};

export function normalizeProductTableControls(
  value: ProductTableData["controls"] | undefined
): Required<ProductTableControls> {
  return {
    showSearchInput: value?.showSearchInput === true,
    showCollectionFilter: value?.showCollectionFilter === true,
    showStatusFilter: value?.showStatusFilter === true,
    sorting: productTableSortingModeValues.includes(value?.sorting as ProductTableSortingMode)
      ? (value?.sorting as ProductTableSortingMode)
      : productTableControlDefaults.sorting,
    pagination: productTablePaginationModeValues.includes(
      value?.pagination as ProductTablePaginationMode
    )
      ? (value?.pagination as ProductTablePaginationMode)
      : productTableControlDefaults.pagination,
    pageSize: (() => {
      const fallback = productTableControlDefaults.pageSize;
      if (typeof value?.pageSize !== "number" || !Number.isFinite(value.pageSize)) return fallback;
      return Math.min(
        productTablePublicPageSizeMax,
        Math.max(productTablePublicPageSizeMin, Math.floor(value.pageSize))
      );
    })(),
  };
}

export function resolveProductTableAuthoredPageSize(
  value: Pick<ProductTableData, "controls" | "source">
) {
  const controls = normalizeProductTableControls(value.controls);
  if (controls.pagination === "none") {
    return normalizeCommerceWidgetSource(value.source, {
      limit: productTableDefaults.source?.limit ?? 12,
      sortField: "updatedAt",
      sortDir: "desc",
    }).limit;
  }
  return controls.pageSize;
}

function normalizeProductTableResolvedRuntime(
  value: ProductTableResolvedRuntime | undefined,
  defaults: {
    source: CommerceWidgetSource | undefined;
    controls: Required<ProductTableControls>;
  }
): ProductTableResolvedRuntime {
  const normalizedSource = normalizeCommerceWidgetSource(defaults.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
  });

  return {
    searchQuery: optionalText(value?.searchQuery) ?? "",
    status: normalizeProductTableStatusList(value?.status),
    collectionIds: normalizeProductTableCollectionList(value?.collectionIds),
    availableStatuses: normalizeProductTableStatusList(value?.availableStatuses),
    availableCollections: normalizeProductTableRuntimeCollections(value?.availableCollections),
    sortField:
      optionalText(value?.sortField) &&
      commerceSortFieldLabelMap[optionalText(value?.sortField) as CommerceWidgetSortField]
        ? (optionalText(value?.sortField) as CommerceWidgetSortField)
        : normalizedSource.sortField,
    sortDir:
      value?.sortDir === "asc" || value?.sortDir === "desc"
        ? value.sortDir
        : normalizedSource.sortDir,
    page: positiveInteger(value?.page) ?? 1,
    pageSize:
      positiveInteger(value?.pageSize) ??
      resolveProductTableAuthoredPageSize({
        source: normalizedSource,
        controls: defaults.controls,
      }),
    totalPages: positiveInteger(value?.totalPages) ?? 1,
    previousPageHref: normalizeProductTableRuntimeHref(value?.previousPageHref),
    nextPageHref: normalizeProductTableRuntimeHref(value?.nextPageHref),
    clearHref: normalizeProductTableRuntimeHref(value?.clearHref) ?? "?",
    retainedParams: normalizeProductTableRuntimeRetainedParams(value?.retainedParams),
    rejectedTokens: Array.isArray(value?.rejectedTokens)
      ? value?.rejectedTokens
          .map((entry) => optionalText(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
  };
}

export type ProductTableRuntimeParamKeys = {
  page: string;
  search: string;
  collection: string;
  status: string;
  sort: string;
  dir: string;
};

export function buildProductTableRuntimeParamKeys(blockId?: string): ProductTableRuntimeParamKeys {
  const normalizedBlockId = (blockId ?? "product-table").trim() || "product-table";
  const prefix = `pt.${normalizedBlockId}`;
  return {
    page: `${prefix}.page`,
    search: `${prefix}.q`,
    collection: `${prefix}.collection`,
    status: `${prefix}.status`,
    sort: `${prefix}.sort`,
    dir: `${prefix}.dir`,
  };
}

export function buildProductTableRuntimeHref(options: {
  blockId?: string;
  retainedParams?: ProductTableRuntimeRetainedParam[];
  state: {
    searchQuery?: string;
    collectionIds?: string[];
    status?: CommerceWidgetStatus[];
    sortField?: CommerceWidgetSortField;
    sortDir?: CommerceWidgetSortDirection;
    page?: number;
  };
}) {
  const keys = buildProductTableRuntimeParamKeys(options.blockId);
  const params = new URLSearchParams();

  for (const entry of options.retainedParams ?? []) {
    params.append(entry.name, entry.value);
  }

  const searchQuery = optionalText(options.state.searchQuery);
  if (searchQuery) {
    params.set(keys.search, searchQuery);
  }

  for (const collectionId of options.state.collectionIds ?? []) {
    const normalized = optionalText(collectionId);
    if (!normalized) continue;
    params.append(keys.collection, normalized);
  }

  for (const status of options.state.status ?? []) {
    if (!commerceWidgetStatusValues.includes(status)) continue;
    params.append(keys.status, status);
  }

  if (options.state.sortField) {
    params.set(keys.sort, options.state.sortField);
  }
  if (options.state.sortDir) {
    params.set(keys.dir, options.state.sortDir);
  }

  const page = positiveInteger(options.state.page);
  if (page && page > 1) {
    params.set(keys.page, String(page));
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "?";
}

export function resolveProductTableSortableField(columnKey: ProductTableColumnKey) {
  return productTableColumnSortFieldMap[columnKey];
}

const normalizeResolvedMedia = (
  value: unknown,
  fallbackAlt: string
): ProductTableResolvedMedia | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as ProductTableResolvedMedia;
  const url = optionalText(payload.url);
  if (!url) return null;

  return {
    url,
    alt: optionalText(payload.alt ?? undefined) ?? fallbackAlt,
    width: positiveInteger(payload.width),
    height: positiveInteger(payload.height),
  };
};

const normalizeRuntimeItems = (value: unknown): ProductTableRuntimeItem[] => {
  if (!Array.isArray(value)) return [];

  const items: ProductTableRuntimeItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const payload = item as ProductTableRuntimeItem;
    const id = optionalText(payload.id);
    const title = optionalText(payload.title);
    const slug = optionalText(payload.slug);
    if (!id || !title || !slug) continue;

    const media = normalizeResolvedMedia(payload.media, title);
    items.push({
      id,
      title,
      slug,
      excerpt: optionalText(payload.excerpt ?? undefined) ?? null,
      status:
        payload.status === "draft" || payload.status === "archived" ? payload.status : "published",
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
          typeof payload.stock?.quantity === "number" &&
          Number.isFinite(payload.stock.quantity) &&
          payload.stock.quantity >= 0
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
      productHref:
        normalizeWidgetSafeHref(optionalText(payload.productHref), {
          allowRelative: true,
        }) ?? null,
      ...(media ? { media } : {}),
    });
  }

  return items;
};

const normalizeProductTableHeader = (value: ProductTableData["header"] | undefined) =>
  compactObject({
    eyebrow: optionalText(value?.eyebrow),
    title: optionalText(value?.title),
    description: optionalText(value?.description),
  });

export const normalizeProductTableFields = (
  value: ProductTableData["fields"] | undefined
): Required<ProductTableFields> => {
  const fields: Required<ProductTableFields> = {
    showImage: value?.showImage === true,
    showTitle: value?.showTitle !== false,
    showExcerpt: value?.showExcerpt === true,
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

  if (!fields.showStock) {
    fields.showStockQuantity = false;
  }

  return fields;
};

export const normalizeProductTableFormat = (
  value: ProductTableData["format"] | undefined
): Required<ProductTableFormat> => ({
  moneyLocale: productTableMoneyLocaleValues.includes(value?.moneyLocale as ProductTableMoneyLocale)
    ? (value?.moneyLocale as ProductTableMoneyLocale)
    : productTableFormatDefaults.moneyLocale,
  currencyDisplay: productTableCurrencyDisplayValues.includes(
    value?.currencyDisplay as ProductTableCurrencyDisplay
  )
    ? (value?.currencyDisplay as ProductTableCurrencyDisplay)
    : productTableFormatDefaults.currencyDisplay,
});

export const normalizeProductTableExport = (
  value: ProductTableData["export"] | undefined
): Required<ProductTableExport> => ({
  enabled: value?.enabled === true,
  label: text(value?.label, productTableExportDefaults.label),
});

export const normalizeProductTableLabels = (
  value: ProductTableData["labels"] | undefined
): Required<ProductTableLabels> => ({
  image: text(value?.image, productTableLabelFallbacks.image),
  title: text(value?.title, productTableLabelFallbacks.title),
  excerpt: text(value?.excerpt, productTableLabelFallbacks.excerpt),
  price: text(value?.price, productTableLabelFallbacks.price),
  compareAt: text(value?.compareAt, productTableLabelFallbacks.compareAt),
  status: text(value?.status, productTableLabelFallbacks.status),
  stock: text(value?.stock, productTableLabelFallbacks.stock),
  collections: text(value?.collections, productTableLabelFallbacks.collections),
  slug: text(value?.slug, productTableLabelFallbacks.slug),
});

export const normalizeProductTableLinks = (
  value: ProductTableData["links"] | undefined
): Required<ProductTableLinks> => ({
  linkedColumn: productTableLinkColumnValues.includes(value?.linkedColumn as ProductTableLinkColumn)
    ? (value?.linkedColumn as ProductTableLinkColumn)
    : productTableLinkDefaults.linkedColumn,
  showAction: value?.showAction === true,
  actionLabel: text(value?.actionLabel, productTableLinkDefaults.actionLabel),
  openInNewTab: value?.openInNewTab === true,
});

export const resolveProductTableVariant = (value: string): ProductTableVariantId =>
  productTableVariantValues.includes(value as ProductTableVariantId)
    ? (value as ProductTableVariantId)
    : "default";

export const normalizeProductTableStyle = (
  value: ProductTableStyle | undefined
): ProductTableStyle | undefined => {
  if (value === undefined) return undefined;

  const preserveClearedSurfaces = Object.keys(value).length === 0;
  const next: ProductTableStyle = {};

  if (productTableDensityValues.includes(value.density as ProductTableDensity)) {
    next.density = value.density as ProductTableDensity;
  }
  if (productTableRowTreatmentValues.includes(value.rowTreatment as ProductTableRowTreatment)) {
    next.rowTreatment = value.rowTreatment as ProductTableRowTreatment;
  }
  if (value.hoverRows === true) {
    next.hoverRows = true;
  }
  if (value.stickyHeader === true) {
    next.stickyHeader = true;
  }
  if (productTableMaxWidthValues.includes(value.maxWidth as ProductTableMaxWidth)) {
    next.maxWidth = value.maxWidth as ProductTableMaxWidth;
  }
  if (productTableAlignValues.includes(value.align as ProductTableAlign)) {
    next.align = value.align as ProductTableAlign;
  }
  if (productTableTypographyValues.includes(value.typography as ProductTableTypography)) {
    next.typography = value.typography as ProductTableTypography;
  }

  const surfaceFields = [
    "tableBackground",
    "tableBorderColor",
    "headerBackground",
    "emptyBackground",
    "emptyBorderColor",
  ] as const;

  for (const field of surfaceFields) {
    const rawValue = value[field];
    if (typeof rawValue === "string") {
      next[field] = resolveClearableStyleValue(rawValue) ?? "";
    } else if (preserveClearedSurfaces) {
      next[field] = "";
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
};

export const resolveProductTablePresentationStyle = (
  variant: string,
  value: ProductTableStyle | undefined
): ProductTableResolvedStyle => {
  const normalized = normalizeProductTableStyle(value) ?? {};
  const preset = productTableVariantStylePresetMap[resolveProductTableVariant(variant)];

  return {
    density: normalized.density ?? preset.density,
    rowTreatment: normalized.rowTreatment ?? preset.rowTreatment,
    hoverRows: normalized.hoverRows === true ? true : preset.hoverRows,
    stickyHeader: normalized.stickyHeader === true ? true : preset.stickyHeader,
    maxWidth: normalized.maxWidth ?? preset.maxWidth,
    align: normalized.align ?? preset.align,
    typography: normalized.typography ?? preset.typography,
    tableBackground: normalized.tableBackground,
    tableBorderColor: normalized.tableBorderColor,
    headerBackground: normalized.headerBackground,
    emptyBackground: normalized.emptyBackground,
    emptyBorderColor: normalized.emptyBorderColor,
  };
};

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
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        eyebrow: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showImage: { type: "boolean" },
        showTitle: { type: "boolean" },
        showExcerpt: { type: "boolean" },
        showSlug: { type: "boolean" },
        showPrice: { type: "boolean" },
        showStatus: { type: "boolean" },
        showStock: { type: "boolean" },
        showStockQuantity: { type: "boolean" },
        showCompareAt: { type: "boolean" },
        showCollectionCount: { type: "boolean" },
      },
    },
    controls: {
      type: "object",
      additionalProperties: false,
      properties: {
        showSearchInput: { type: "boolean" },
        showCollectionFilter: { type: "boolean" },
        showStatusFilter: { type: "boolean" },
        sorting: { enum: [...productTableSortingModeValues] },
        pagination: { enum: [...productTablePaginationModeValues] },
        pageSize: {
          type: "number",
          minimum: productTablePublicPageSizeMin,
          maximum: productTablePublicPageSizeMax,
        },
      },
    },
    format: {
      type: "object",
      additionalProperties: false,
      properties: {
        moneyLocale: { enum: [...productTableMoneyLocaleValues] },
        currencyDisplay: { enum: [...productTableCurrencyDisplayValues] },
      },
    },
    export: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
      },
    },
    labels: {
      type: "object",
      additionalProperties: false,
      properties: {
        image: { type: "string" },
        title: { type: "string" },
        excerpt: { type: "string" },
        price: { type: "string" },
        compareAt: { type: "string" },
        status: { type: "string" },
        stock: { type: "string" },
        collections: { type: "string" },
        slug: { type: "string" },
      },
    },
    links: {
      type: "object",
      additionalProperties: false,
      properties: {
        linkedColumn: { enum: [...productTableLinkColumnValues] },
        showAction: { type: "boolean" },
        actionLabel: { type: "string" },
        openInNewTab: { type: "boolean" },
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
        density: { enum: [...productTableDensityValues] },
        rowTreatment: { enum: [...productTableRowTreatmentValues] },
        hoverRows: { type: "boolean" },
        stickyHeader: { type: "boolean" },
        maxWidth: { enum: [...productTableMaxWidthValues] },
        align: { enum: [...productTableAlignValues] },
        typography: { enum: [...productTableTypographyValues] },
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
              productHref: { type: ["string", "null"] },
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
        runtime: {
          type: "object",
          additionalProperties: false,
          properties: {
            searchQuery: { type: "string" },
            status: {
              type: "array",
              items: { enum: ["draft", "published", "archived"] },
            },
            collectionIds: {
              type: "array",
              items: { type: "string" },
            },
            availableStatuses: {
              type: "array",
              items: { enum: ["draft", "published", "archived"] },
            },
            availableCollections: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  slug: { type: "string" },
                },
              },
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
            page: { type: "number" },
            pageSize: { type: "number" },
            totalPages: { type: "number" },
            previousPageHref: { type: "string" },
            nextPageHref: { type: "string" },
            clearHref: { type: "string" },
            retainedParams: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  value: { type: "string" },
                },
              },
            },
            rejectedTokens: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
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
  const header = normalizeProductTableHeader(value.header);
  const fields = normalizeProductTableFields(value.fields);
  const controls = normalizeProductTableControls(value.controls);
  const format = normalizeProductTableFormat(value.format);
  const exportSettings = normalizeProductTableExport(value.export);
  const labels = normalizeProductTableLabels(value.labels);
  const links = normalizeProductTableLinks(value.links);
  const resolvedMeta = normalizeResolvedMeta(value.resolved);
  const style = normalizeProductTableStyle(value.style);
  const hasStyleObject = style !== undefined;

  return {
    source,
    ...(header ? { header } : {}),
    fields,
    controls,
    format,
    export: exportSettings,
    labels,
    links,
    emptyState: {
      title: text(value.emptyState?.title, productTableEmptyStateDefaults.title),
      description: text(value.emptyState?.description, productTableEmptyStateDefaults.description),
    },
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      items: normalizeRuntimeItems(value.resolved?.items),
      total: resolvedMeta.total,
      resolvedAt: resolvedMeta.resolvedAt,
      runtime: normalizeProductTableResolvedRuntime(value.resolved?.runtime, {
        source,
        controls,
      }),
      ...(resolvedMeta.error ? { error: resolvedMeta.error } : {}),
    },
  };
};

export const buildProductTableQueryInput = (value: ProductTableData) => {
  const normalized = normalizeProductTableData(value);
  return buildCommerceWidgetQueryInput(
    normalizeCommerceWidgetSource(
      {
        ...normalized.source,
        limit: resolveProductTableAuthoredPageSize(normalized),
      },
      {
        limit: productTableDefaults.source?.limit ?? 12,
        sortField: "updatedAt",
        sortDir: "desc",
      }
    )
  );
};

const titleWithStatus = (title: string, status: CommerceWidgetRuntimeCard["status"]) => {
  if (status === "published") return title;
  if (status === "draft") return `${title} (draft)`;
  return `${title} (archived)`;
};

const clampProductTableExcerpt = (value: string | null) => {
  const excerpt = optionalText(value);
  if (!excerpt) return null;
  if (excerpt.length <= productTableExcerptMaxLength) return excerpt;
  return `${excerpt.slice(0, productTableExcerptMaxLength - 3).trimEnd()}...`;
};

const renderProductTableHeader = (
  header: ProductTableHeader | undefined,
  typography: ProductTableTypography
) => {
  if (!header?.eyebrow && !header?.title && !header?.description) {
    return null;
  }

  const typographyClasses = productTableTypographyClassMap[typography];

  return (
    <div className="space-y-2">
      {header.eyebrow ? (
        <p
          className={joinClasses(
            typographyClasses.sectionEyebrow,
            "font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/60"
          )}
        >
          {header.eyebrow}
        </p>
      ) : null}
      {header.title ? (
        <h2
          className={joinClasses(
            typographyClasses.sectionTitle,
            "font-semibold text-[var(--color-text)]"
          )}
        >
          {header.title}
        </h2>
      ) : null}
      {header.description ? (
        <p
          className={joinClasses(
            typographyClasses.sectionDescription,
            "max-w-3xl text-[var(--color-text)]/70"
          )}
        >
          {header.description}
        </p>
      ) : null}
    </div>
  );
};

const renderProductTableImage = (item: ProductTableRuntimeItem, density: ProductTableDensity) => {
  const densityClasses = productTableDensityClassMap[density];

  if (!item.media?.url) {
    return <span className="text-xs text-[var(--color-text)]/45">No image</span>;
  }

  return (
    <img
      src={item.media.url}
      alt={item.media.alt ?? item.title}
      loading="lazy"
      decoding="async"
      width={item.media.width ?? undefined}
      height={item.media.height ?? undefined}
      className={joinClasses(densityClasses.image, "rounded-md object-cover")}
    />
  );
};

const productTitleValue = (
  item: ProductTableRuntimeItem,
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
  if (!options.showStockQuantity || typeof stock.quantity !== "number" || stock.quantity < 0) {
    return label;
  }
  return `${label} (${stock.quantity})`;
};

export const formatProductTableMoney = (
  amount: number,
  currency: string,
  format: Required<ProductTableFormat>
) => formatCommerceMoney(amount, currency, format.moneyLocale, format.currencyDisplay);

const serializeProductTableCsvCell = (
  column: ProductTableColumnDefinition,
  item: ProductTableRuntimeItem,
  options: {
    showStatusColumn: boolean;
    showStockQuantity: boolean;
    format: Required<ProductTableFormat>;
  }
) => {
  switch (column.key) {
    case "image":
      return item.media?.url ?? "No image";
    case "title":
      return productTitleValue(item, { showStatusColumn: options.showStatusColumn });
    case "excerpt":
      return clampProductTableExcerpt(item.excerpt) ?? "-";
    case "slug":
      return `/${item.slug}`;
    case "price":
      return formatProductTableMoney(item.pricing.amount, item.pricing.currency, options.format);
    case "compareAt":
      return typeof item.pricing.compareAtAmount === "number"
        ? formatProductTableMoney(
            item.pricing.compareAtAmount,
            item.pricing.currency,
            options.format
          )
        : "-";
    case "status":
      return productTableStatusLabelMap[item.status];
    case "stock":
      return formatProductTableStockValue(item.stock, {
        showStockQuantity: options.showStockQuantity,
      });
    case "collections":
      return String(item.collectionIds.length);
    default:
      return "";
  }
};

const productTableCsvFormulaPattern = /^[=+\-@]/;

const escapeProductTableCsvValue = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const guarded = productTableCsvFormulaPattern.test(normalized.trimStart())
    ? `'${normalized}`
    : normalized;
  return `"${guarded.replaceAll('"', '""')}"`;
};

const buildProductTableCsvMatrix = (data: ProductTableData) => {
  const normalized = normalizeProductTableData(data);
  const fields = normalizeProductTableFields(normalized.fields);
  const format = normalizeProductTableFormat(normalized.format);
  const visibleColumns = resolveVisibleProductTableColumns(fields);
  const showStatusColumn = visibleColumns.some((column) => column.key === "status");
  const headerRow = visibleColumns.map(
    (column) => normalized.labels?.[column.labelKey] ?? column.key
  );
  const valueRows = (normalized.resolved?.items ?? []).map((item) =>
    visibleColumns.map((column) =>
      serializeProductTableCsvCell(column, item, {
        showStatusColumn,
        showStockQuantity: fields.showStockQuantity,
        format,
      })
    )
  );

  return [headerRow, ...valueRows];
};

export const buildProductTableCsvContent = (data: ProductTableData) =>
  buildProductTableCsvMatrix(data)
    .map((row) => row.map(escapeProductTableCsvValue).join(","))
    .join("\n");

export const buildProductTableCsvHref = (data: ProductTableData) =>
  `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${buildProductTableCsvContent(data)}`)}`;

export const resolveProductTableCsvFilename = (header: ProductTableHeader | undefined) => {
  const stemSource = header?.title ?? header?.eyebrow ?? productTableDefaultCaptionText;
  const normalizedStem = stemSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalizedStem || "product-table"}.csv`;
};

const productTableCellLinkClassName =
  "inline-flex rounded-sm font-medium text-[var(--color-text)] transition hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const productTableActionLinkClassName =
  "inline-flex items-center rounded-md border border-[var(--color-border)] px-3 py-1.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const productTableSortLinkClassName =
  "inline-flex items-center gap-2 rounded-sm text-left transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const productTableSortIndicatorClassName =
  "text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text)]/55";

const resolveProductTableLinkAttrs = (
  item: ProductTableRuntimeItem,
  links: Required<ProductTableLinks>
) =>
  resolveWidgetLinkAttrs(item.productHref, {
    allowRelative: true,
    openInNewTab: links.openInNewTab,
  });

const renderProductTableActionCell = (
  item: ProductTableRuntimeItem,
  links: Required<ProductTableLinks>,
  linkAttrs: ReturnType<typeof resolveWidgetLinkAttrs>,
  presentation: ProductTableResolvedStyle
) => {
  const densityClasses = productTableDensityClassMap[presentation.density];
  const typographyClasses = productTableTypographyClassMap[presentation.typography];

  return (
    <td className={joinClasses(densityClasses.action, typographyClasses.body, "text-right")}>
      {links.showAction && linkAttrs ? (
        <a
          {...linkAttrs}
          className={joinClasses(productTableActionLinkClassName, typographyClasses.action)}
        >
          {links.actionLabel}
        </a>
      ) : (
        <span className="text-[var(--color-text)]/40">-</span>
      )}
    </td>
  );
};

const previewMessage = (renderContext: WidgetRenderContext | undefined) => {
  const message = optionalText(renderContext?.previewState?.message);
  if (!message) return undefined;
  return message.slice(0, maxPreviewStatusMessageLength);
};

const renderProductTableCell = (
  column: ProductTableColumnDefinition,
  item: ProductTableRuntimeItem,
  options: {
    showStatusColumn: boolean;
    showStockQuantity: boolean;
    format: Required<ProductTableFormat>;
    links: Required<ProductTableLinks>;
    linkAttrs: ReturnType<typeof resolveWidgetLinkAttrs>;
    presentation: ProductTableResolvedStyle;
  }
) => {
  const densityClasses = productTableDensityClassMap[options.presentation.density];
  const typographyClasses = productTableTypographyClassMap[options.presentation.typography];

  switch (column.key) {
    case "image":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            densityClasses.imageCell,
            typographyClasses.support,
            "text-[var(--color-text)]/65"
          )}
        >
          <div className={joinClasses("flex items-center", densityClasses.imageWrapper)}>
            {renderProductTableImage(item, options.presentation.density)}
          </div>
        </td>
      );
    case "title": {
      const value = productTitleValue(item, options);
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.title,
            "font-medium text-[var(--color-text)]/85"
          )}
        >
          {options.links.linkedColumn === "title" && options.linkAttrs ? (
            <a {...options.linkAttrs} className={productTableCellLinkClassName}>
              {value}
            </a>
          ) : (
            value
          )}
        </td>
      );
    }
    case "excerpt":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.excerpt,
            "max-w-md text-[var(--color-text)]/70"
          )}
        >
          {clampProductTableExcerpt(item.excerpt) ?? (
            <span className="text-[var(--color-text)]/45">-</span>
          )}
        </td>
      );
    case "slug": {
      const value = `/${item.slug}`;
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.support,
            "text-[var(--color-text)]/65"
          )}
        >
          {options.links.linkedColumn === "slug" && options.linkAttrs ? (
            <a {...options.linkAttrs} className={productTableCellLinkClassName}>
              {value}
            </a>
          ) : (
            value
          )}
        </td>
      );
    }
    case "price":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.body,
            "text-[var(--color-text)]/80"
          )}
        >
          {formatProductTableMoney(item.pricing.amount, item.pricing.currency, options.format)}
        </td>
      );
    case "compareAt":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.support,
            "text-[var(--color-text)]/65"
          )}
        >
          {typeof item.pricing.compareAtAmount === "number"
            ? formatProductTableMoney(
                item.pricing.compareAtAmount,
                item.pricing.currency,
                options.format
              )
            : "-"}
        </td>
      );
    case "status":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.body,
            "text-[var(--color-text)]/80"
          )}
        >
          <span
            className={joinClasses(
              productTableStatusBadgeBaseClass,
              typographyClasses.badge,
              productTableStatusBadgeToneClassMap[item.status]
            )}
            aria-label={`Status: ${productTableStatusLabelMap[item.status]}`}
          >
            {productTableStatusLabelMap[item.status]}
          </span>
        </td>
      );
    case "stock":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.support,
            "text-[var(--color-text)]/65"
          )}
        >
          {formatProductTableStockValue(item.stock, options)}
        </td>
      );
    case "collections":
      return (
        <td
          className={joinClasses(
            densityClasses.cell,
            typographyClasses.support,
            "text-[var(--color-text)]/65"
          )}
        >
          {item.collectionIds.length}
        </td>
      );
    default:
      return null;
  }
};

const normalizePaginationHref = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("?")) return trimmed;
  return (
    normalizeWidgetSafeHref(trimmed, {
      allowRelative: true,
      allowHttp: true,
    }) ?? undefined
  );
};

const resolveProductTableSortLabel = (
  field: CommerceWidgetSortField,
  dir: CommerceWidgetSortDirection
) => {
  const fieldLabel = commerceSortFieldLabelMap[field] ?? field;
  return `${fieldLabel} ${dir === "asc" ? "ascending" : "descending"}`;
};

const resolveProductTableSortBadge = ({
  active,
  dir,
  interactive,
}: {
  active: boolean;
  dir: CommerceWidgetSortDirection;
  interactive: boolean;
}) => {
  if (active) return dir === "asc" ? "Asc" : "Desc";
  return interactive ? "Sort" : "";
};

const resolveProductTableRangeCopy = ({
  total,
  count,
  page,
  pageSize,
  pagination,
}: {
  total: number;
  count: number;
  page: number;
  pageSize: number;
  pagination: ProductTablePaginationMode;
}) => {
  if (total <= 0 || count <= 0) return "Showing 0 products";
  if (pagination === "paged") {
    const start = (Math.max(1, page) - 1) * pageSize + 1;
    const end = Math.min(total, start + count - 1);
    return `Showing ${start}-${end} of ${total} products`;
  }
  if (pagination === "load-more") {
    return `Showing ${count} of ${total} products`;
  }
  return `Showing ${count} product${count === 1 ? "" : "s"}`;
};

const resolveProductTableActiveSortHref = ({
  blockId,
  runtime,
  nextField,
  nextDir,
}: {
  blockId?: string;
  runtime: ProductTableResolvedRuntime | undefined;
  nextField: CommerceWidgetSortField;
  nextDir: CommerceWidgetSortDirection;
}) =>
  buildProductTableRuntimeHref({
    blockId,
    retainedParams: runtime?.retainedParams ?? [],
    state: {
      searchQuery: runtime?.searchQuery,
      collectionIds: runtime?.collectionIds,
      status: runtime?.status,
      sortField: nextField,
      sortDir: nextDir,
      page: 1,
    },
  });

const resolveProductTableActiveCollectionIds = (
  runtime: ProductTableResolvedRuntime | undefined
) => {
  const selected = runtime?.collectionIds ?? [];
  if (selected.length > 0) return new Set(selected);
  return new Set((runtime?.availableCollections ?? []).map((item) => item.id));
};

const resolveProductTableActiveStatuses = (runtime: ProductTableResolvedRuntime | undefined) => {
  const selected = runtime?.status ?? [];
  if (selected.length > 0) return new Set(selected);
  return new Set(runtime?.availableStatuses ?? []);
};

const hasActiveProductTableRuntimeState = (
  data: ProductTableData,
  runtime: ProductTableResolvedRuntime | undefined
) => {
  const normalized = normalizeProductTableData(data);
  const source = normalizeCommerceWidgetSource(normalized.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  return (
    (runtime?.searchQuery?.length ?? 0) > 0 ||
    (runtime?.collectionIds?.length ?? 0) > 0 ||
    (runtime?.status?.length ?? 0) > 0 ||
    (runtime?.page ?? 1) > 1 ||
    runtime?.sortField !== source.sortField ||
    runtime?.sortDir !== source.sortDir
  );
};

function ProductTablePublicControls({
  data,
  blockId,
}: {
  data: ProductTableData;
  blockId?: string;
}) {
  const normalized = normalizeProductTableData(data);
  const controls = normalizeProductTableControls(normalized.controls);
  const exportSettings = normalizeProductTableExport(normalized.export);
  const runtime = normalized.resolved?.runtime;
  const availableCollections = runtime?.availableCollections ?? [];
  const availableStatuses = runtime?.availableStatuses ?? [];
  const showCollectionFilter = controls.showCollectionFilter && availableCollections.length > 1;
  const showStatusFilter = controls.showStatusFilter && availableStatuses.length > 1;
  const showSearchInput = controls.showSearchInput;
  const hasFormControls = showSearchInput || showCollectionFilter || showStatusFilter;
  const sortingEnabled = controls.sorting !== "none";
  const paginationEnabled = controls.pagination !== "none";
  const hasRejectedTokens = (runtime?.rejectedTokens?.length ?? 0) > 0;
  const hasExportRows = (normalized.resolved?.items?.length ?? 0) > 0;
  const showExport = exportSettings.enabled && hasExportRows;
  const showShell =
    hasFormControls || sortingEnabled || paginationEnabled || hasRejectedTokens || showExport;
  if (!showShell) return null;

  const keys = buildProductTableRuntimeParamKeys(blockId);
  const searchValue = runtime?.searchQuery || normalized.source?.search || "";
  const activeCollectionIds = resolveProductTableActiveCollectionIds(runtime);
  const activeStatuses = resolveProductTableActiveStatuses(runtime);
  const rangeCopy = resolveProductTableRangeCopy({
    total: normalized.resolved?.total ?? 0,
    count: normalized.resolved?.items?.length ?? 0,
    page: runtime?.page ?? 1,
    pageSize: runtime?.pageSize ?? resolveProductTableAuthoredPageSize(normalized),
    pagination: controls.pagination,
  });
  const currentSortCopy =
    sortingEnabled && runtime?.sortField && runtime?.sortDir
      ? resolveProductTableSortLabel(runtime.sortField, runtime.sortDir)
      : null;
  const showReset = hasActiveProductTableRuntimeState(normalized, runtime) || hasRejectedTokens;
  const exportHref = showExport ? buildProductTableCsvHref(normalized) : undefined;
  const exportFilename = showExport ? resolveProductTableCsvFilename(normalized.header) : undefined;

  return (
    <div className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-bg)]/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 text-sm text-[var(--color-text)]/75">
          <p className="font-medium text-[var(--color-text)]">{rangeCopy}</p>
          {currentSortCopy ? <p>Sort: {currentSortCopy}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showExport && exportHref && exportFilename ? (
            <a
              href={exportHref}
              download={exportFilename}
              data-product-table-export="csv"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]/70"
            >
              {exportSettings.label}
            </a>
          ) : null}
          {showReset ? (
            <a
              href={runtime?.clearHref ?? "?"}
              className="text-xs font-medium underline-offset-4 hover:underline"
            >
              Reset table
            </a>
          ) : null}
        </div>
      </div>

      {hasFormControls ? (
        <form method="get" className="mt-4 space-y-4">
          {(runtime?.retainedParams ?? []).map((param, index) => (
            <input
              key={`${param.name}:${param.value}:${index}`}
              type="hidden"
              name={param.name}
              value={param.value}
            />
          ))}
          {sortingEnabled && runtime?.sortField ? (
            <input type="hidden" name={keys.sort} value={runtime.sortField} />
          ) : null}
          {sortingEnabled && runtime?.sortDir ? (
            <input type="hidden" name={keys.dir} value={runtime.sortDir} />
          ) : null}

          {showSearchInput ? (
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--color-text)]">Search products</span>
              <input
                name={keys.search}
                defaultValue={searchValue}
                placeholder="title or slug"
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              />
            </label>
          ) : null}

          {showCollectionFilter ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--color-text)]">Collections</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableCollections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-start gap-2 rounded-md border border-[var(--color-border)]/70 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      name={keys.collection}
                      value={collection.id}
                      defaultChecked={activeCollectionIds.has(collection.id)}
                    />
                    <span className="space-y-0.5">
                      <span className="block font-medium text-[var(--color-text)]">
                        {collection.label}
                      </span>
                      {collection.slug ? (
                        <span className="block text-xs text-[var(--color-text)]/60">
                          /{collection.slug}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {showStatusFilter ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--color-text)]">Status</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {availableStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 rounded-md border border-[var(--color-border)]/70 px-3 py-2 text-sm capitalize"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      name={keys.status}
                      value={status}
                      defaultChecked={activeStatuses.has(status)}
                    />
                    <span>{status.replaceAll("_", " ")}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]/70"
            >
              Apply
            </button>
            {hasRejectedTokens ? (
              <p className="text-xs text-[var(--color-text)]/60">
                Ignored invalid table parameters.
              </p>
            ) : null}
          </div>
        </form>
      ) : hasRejectedTokens ? (
        <p className="mt-4 text-xs text-[var(--color-text)]/60">
          Ignored invalid table parameters.
        </p>
      ) : null}
    </div>
  );
}

function ProductTablePaginationActions({
  controls,
  runtime,
}: {
  controls: Required<ProductTableControls>;
  runtime: ProductTableResolvedRuntime | undefined;
}) {
  const previousPageHref = normalizePaginationHref(runtime?.previousPageHref);
  const nextPageHref = normalizePaginationHref(runtime?.nextPageHref);
  const currentPage = runtime?.page ?? 1;
  const totalPages = runtime?.totalPages ?? 1;

  if (controls.pagination === "paged" && (previousPageHref || nextPageHref)) {
    return (
      <nav
        className="mt-6 flex items-center justify-between gap-3 text-sm"
        aria-label="Product table pagination"
      >
        {previousPageHref ? (
          <a href={previousPageHref} className="font-medium underline-offset-4 hover:underline">
            Previous
          </a>
        ) : (
          <span className="font-medium opacity-60">Previous</span>
        )}
        <span className="text-[var(--color-text)]/75">
          Page {currentPage} of {totalPages}
        </span>
        {nextPageHref ? (
          <a href={nextPageHref} className="font-medium underline-offset-4 hover:underline">
            Next
          </a>
        ) : (
          <span className="font-medium opacity-60">Next</span>
        )}
      </nav>
    );
  }

  if (controls.pagination === "load-more" && nextPageHref) {
    return (
      <div className="mt-6">
        <a href={nextPageHref} className="text-sm font-medium underline-offset-4 hover:underline">
          Load more
        </a>
      </div>
    );
  }

  return null;
}

export function ProductTableBlock({
  data,
  variant,
  renderContext,
  blockId,
}: {
  data: ProductTableData;
  variant: string;
  blockId?: string;
  renderContext?: WidgetRenderContext;
}) {
  const normalized = normalizeProductTableData(data);
  const resolvedVariant = resolveProductTableVariant(variant);
  const presentation = resolveProductTablePresentationStyle(resolvedVariant, normalized.style);
  const densityClasses = productTableDensityClassMap[presentation.density];
  const typographyClasses = productTableTypographyClassMap[presentation.typography];
  const items = normalized.resolved?.items ?? [];
  const fields = normalizeProductTableFields(normalized.fields);
  const controls = normalizeProductTableControls(normalized.controls);
  const format = normalizeProductTableFormat(normalized.format);
  const links = normalizeProductTableLinks(normalized.links);
  const visibleColumns = resolveVisibleProductTableColumns(fields);
  const showStatusColumn = visibleColumns.some((column) => column.key === "status");
  const showActionColumn = links.showAction;
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
  const stickyHeaderStyle: CSSProperties | undefined = presentation.stickyHeader
    ? {
        backgroundColor:
          resolveClearableStyleValue(normalized.style?.headerBackground) ??
          resolveClearableStyleValue(normalized.style?.tableBackground) ??
          "var(--color-bg)",
      }
    : undefined;
  const hasExplicitTableSurface =
    Object.prototype.hasOwnProperty.call(normalized.style ?? {}, "tableBackground") ||
    Object.prototype.hasOwnProperty.call(normalized.style ?? {}, "tableBorderColor");
  const hasExplicitHeaderSurface = Object.prototype.hasOwnProperty.call(
    normalized.style ?? {},
    "headerBackground"
  );
  const hasExplicitEmptySurface =
    Object.prototype.hasOwnProperty.call(normalized.style ?? {}, "emptyBackground") ||
    Object.prototype.hasOwnProperty.call(normalized.style ?? {}, "emptyBorderColor");
  const legacyTableClass = hasExplicitTableSurface
    ? ""
    : "border-[var(--color-border)] bg-[var(--color-bg)]";
  const legacyHeaderClass = hasExplicitHeaderSurface ? "" : "bg-[var(--color-bg)]/80";
  const legacyEmptyClass = hasExplicitEmptySurface
    ? ""
    : "border-[var(--color-border)] bg-[var(--color-bg)]/70";
  const tableCaptionText = normalized.header?.title ?? productTableDefaultCaptionText;
  const tableCaptionId = React.useId();
  const runtime = normalized.resolved?.runtime;

  return (
    <section
      className="space-y-4"
      data-widget="product-table"
      data-product-table-count={String(items.length)}
      data-product-table-page={String(runtime?.page ?? 1)}
      data-product-table-variant={resolvedVariant}
      data-product-table-density={presentation.density}
      data-product-table-row-treatment={presentation.rowTreatment}
      data-product-table-typography={presentation.typography}
      data-product-table-max-width={presentation.maxWidth}
      data-product-table-align={presentation.align}
      data-product-table-hover={String(presentation.hoverRows)}
      data-product-table-sticky={String(presentation.stickyHeader)}
      aria-label={tableCaptionText}
    >
      {previewLoading ? (
        <div
          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900"
          role="status"
          aria-live="polite"
        >
          Refreshing Product Table preview...
        </div>
      ) : null}

      {previewError ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="alert"
        >
          Product Table preview warning: {previewError}
        </div>
      ) : null}

      {hasError ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="alert"
        >
          Commerce runtime warning: {normalized.resolved?.error}
        </div>
      ) : null}

      <div className={joinClasses("w-full", productTableAlignClassMap[presentation.align])}>
        <div
          className={joinClasses(
            "w-full space-y-4",
            productTableMaxWidthClassMap[presentation.maxWidth]
          )}
        >
          {renderProductTableHeader(normalized.header, presentation.typography)}

          <ProductTablePublicControls data={normalized} blockId={blockId} />

          {items.length === 0 ? (
            <div
              className={joinClasses(
                "rounded-xl border border-dashed px-4 py-6 text-center",
                legacyEmptyClass
              )}
              style={emptyStyle}
              role={isEditorPreview ? "status" : undefined}
              aria-live={isEditorPreview ? "polite" : undefined}
            >
              <p
                className={joinClasses(
                  typographyClasses.title,
                  "font-medium text-[var(--color-text)]"
                )}
              >
                {normalized.emptyState?.title}
              </p>
              <p
                className={joinClasses(typographyClasses.body, "mt-1 text-[var(--color-text)]/70")}
              >
                {normalized.emptyState?.description}
              </p>
            </div>
          ) : (
            <div>
              <div
                className={joinClasses("overflow-x-auto rounded-xl border", legacyTableClass)}
                style={tableStyle}
                tabIndex={0}
                aria-label={tableCaptionText}
              >
                <table
                  className={joinClasses("w-full min-w-[44rem]", densityClasses.table)}
                  aria-labelledby={tableCaptionId}
                >
                  <caption id={tableCaptionId} className="sr-only">
                    {tableCaptionText}
                  </caption>
                  <thead>
                    <tr
                      className={joinClasses(
                        "border-b border-[var(--color-border)]",
                        legacyHeaderClass
                      )}
                      style={headerStyle}
                    >
                      {visibleColumns.map((column) => {
                        const sortField = resolveProductTableSortableField(column.key);
                        const sortActive =
                          sortField !== undefined && runtime?.sortField === sortField;
                        const interactiveSort =
                          controls.sorting === "interactive" && sortField !== undefined;
                        const nextSortDir: CommerceWidgetSortDirection =
                          sortActive && runtime?.sortDir === "asc" ? "desc" : "asc";
                        const sortBadge = sortField
                          ? resolveProductTableSortBadge({
                              active: sortActive,
                              dir: runtime?.sortDir ?? "desc",
                              interactive: interactiveSort,
                            })
                          : "";
                        const ariaSort = sortActive
                          ? runtime?.sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined;
                        const sortHref = interactiveSort
                          ? resolveProductTableActiveSortHref({
                              blockId,
                              runtime,
                              nextField: sortField,
                              nextDir: nextSortDir,
                            })
                          : undefined;
                        const headerCellClassName = joinClasses(
                          densityClasses.header,
                          typographyClasses.header,
                          presentation.stickyHeader ? "sticky top-0 z-10" : undefined,
                          "text-left font-semibold uppercase tracking-wide text-[var(--color-text)]/65"
                        );

                        return (
                          <th
                            key={column.key}
                            scope="col"
                            aria-sort={ariaSort}
                            className={headerCellClassName}
                            style={presentation.stickyHeader ? stickyHeaderStyle : undefined}
                          >
                            {interactiveSort && sortHref ? (
                              <a
                                href={sortHref}
                                className={productTableSortLinkClassName}
                                aria-label={`Sort by ${normalized.labels?.[column.labelKey]} ${nextSortDir === "asc" ? "ascending" : "descending"}`}
                              >
                                <span>{normalized.labels?.[column.labelKey]}</span>
                                {sortBadge ? (
                                  <span
                                    className={productTableSortIndicatorClassName}
                                    aria-hidden="true"
                                  >
                                    {sortBadge}
                                  </span>
                                ) : null}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span>{normalized.labels?.[column.labelKey]}</span>
                                {controls.sorting === "indicator" && sortField && sortBadge ? (
                                  <span
                                    className={productTableSortIndicatorClassName}
                                    aria-hidden="true"
                                  >
                                    {sortBadge}
                                  </span>
                                ) : null}
                              </span>
                            )}
                          </th>
                        );
                      })}
                      {showActionColumn ? (
                        <th
                          scope="col"
                          className={joinClasses(
                            densityClasses.header,
                            typographyClasses.header,
                            presentation.stickyHeader ? "sticky top-0 z-10" : undefined,
                            "text-right font-semibold uppercase tracking-wide text-[var(--color-text)]/65"
                          )}
                          style={presentation.stickyHeader ? stickyHeaderStyle : undefined}
                        >
                          Action
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const linkAttrs = resolveProductTableLinkAttrs(item, links);
                      const rowInteractive =
                        Boolean(linkAttrs) && (links.linkedColumn !== "none" || links.showAction);
                      const stripedRowClass =
                        presentation.rowTreatment === "striped" && index % 2 === 1
                          ? productTableStripedRowClassName
                          : undefined;

                      return (
                        <tr
                          key={item.id}
                          className={joinClasses(
                            "border-b border-[var(--color-border)]/70 last:border-b-0 transition-colors",
                            stripedRowClass,
                            productTableRowToneClassMap[item.status],
                            presentation.hoverRows ? productTableHoverRowClassName : undefined,
                            rowInteractive ? "hover:bg-slate-50/60" : undefined
                          )}
                          data-product-status={item.status}
                        >
                          {visibleColumns.map((column) => (
                            <React.Fragment key={column.key}>
                              {renderProductTableCell(column, item, {
                                showStatusColumn,
                                showStockQuantity: fields.showStockQuantity,
                                format,
                                links,
                                linkAttrs,
                                presentation,
                              })}
                            </React.Fragment>
                          ))}
                          {showActionColumn
                            ? renderProductTableActionCell(item, links, linkAttrs, presentation)
                            : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ProductTablePaginationActions controls={controls} runtime={runtime} />
            </div>
          )}
        </div>
      </div>
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
      {
        id: "compact",
        label: "Compact",
        description: "Denser preset with tighter spacing, typography, and reading width.",
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

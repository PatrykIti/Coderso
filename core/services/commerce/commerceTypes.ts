export const commerceProductStatuses = ["draft", "published", "archived"] as const;

export type CommerceProductStatus = (typeof commerceProductStatuses)[number];

export const commerceStockStates = ["in_stock", "out_of_stock", "backorder"] as const;

export type CommerceStockState = (typeof commerceStockStates)[number];

export type CommerceMoney = {
  amount: number;
  currency: string;
  compareAtAmount: number | null;
};

export type CommerceStock = {
  state: CommerceStockState;
  quantity: number | null;
};

export type CommerceVariant = {
  id?: string;
  sku: string | null;
  title: string;
  pricing: CommerceMoney;
  stock: CommerceStock;
  attributes: Record<string, string>;
  isDefault: boolean;
};

export type CommerceProduct = {
  id: string;
  title: string;
  slug: string;
  status: CommerceProductStatus;
  excerpt: string | null;
  description: string | null;
  pricing: CommerceMoney;
  stock: CommerceStock;
  collectionIds: string[];
  mediaIds: string[];
  variants: CommerceVariant[];
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CommerceCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export const commerceSortFields = [
  "title",
  "slug",
  "status",
  "pricing.amount",
  "stock.state",
  "createdAt",
  "updatedAt",
  "publishedAt",
] as const;

export type CommerceSortField = (typeof commerceSortFields)[number];

export const commerceFilterOperators = [
  "eq",
  "neq",
  "in",
  "nin",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "exists",
] as const;

export type CommerceFilterOperator = (typeof commerceFilterOperators)[number];

export type CommerceQueryFilter = {
  field: string;
  op: CommerceFilterOperator;
  value?: string | number | boolean | null | Array<string | number | boolean | null>;
};

export type CommerceQuerySort = {
  field: CommerceSortField;
  dir: "asc" | "desc";
};

export type CommerceQueryPagination = {
  limit: number;
  offset: number;
};

export type CommerceQuery = {
  filters: CommerceQueryFilter[];
  sort: CommerceQuerySort[];
  pagination: CommerceQueryPagination;
  status?: CommerceProductStatus[];
  collectionIds?: string[];
  productIds?: string[];
  search?: string | null;
};

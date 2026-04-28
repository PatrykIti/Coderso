import {
  commerceFilterOperators,
  commerceSortFields,
  type CommerceFilterOperator,
  type CommerceProduct,
  type CommerceProductStatus,
  type CommerceQuery,
  type CommerceQueryFilter,
  type CommerceQuerySort,
  type CommerceSortField,
} from "./commerceTypes";
import { normalizeCommerceProductStatus } from "./commerceValidation";
import { listCommerceProducts } from "./commerceService";

type FieldKind = "string" | "number" | "date" | "array";
type CommercePrimitive = string | number | boolean | null;

type NormalizedFilterValue = CommercePrimitive | CommercePrimitive[] | [CommercePrimitive, CommercePrimitive];

export type CommerceQueryInput = Partial<CommerceQuery> & {
  filters?: CommerceQueryFilter[];
  sort?: CommerceQuerySort[];
};

export type CommerceExecutionPlan = {
  filters: CommerceQueryFilter[];
  sort: CommerceQuerySort[];
  pagination: CommerceQuery["pagination"];
  status: CommerceProductStatus[];
  collectionIds: string[];
  search: string | null;
};

export type CommerceQueryResult = {
  total: number;
  limit: number;
  offset: number;
  query: CommerceQuery;
  rows: CommerceProduct[];
};

type CommerceQueryDeps = {
  listProducts: () => Promise<CommerceProduct[]>;
};

const defaultDeps: CommerceQueryDeps = {
  listProducts: listCommerceProducts,
};

const filterFieldKinds: Record<string, FieldKind> = {
  title: "string",
  slug: "string",
  status: "string",
  excerpt: "string",
  description: "string",
  "pricing.amount": "number",
  "pricing.compareAtAmount": "number",
  "stock.state": "string",
  "stock.quantity": "number",
  createdAt: "date",
  updatedAt: "date",
  publishedAt: "date",
  collectionIds: "array",
};

const sortFieldKinds: Record<CommerceSortField, FieldKind> = {
  title: "string",
  slug: "string",
  status: "string",
  "pricing.amount": "number",
  "stock.state": "string",
  createdAt: "date",
  updatedAt: "date",
  publishedAt: "date",
};

const allowedFilterFields = new Set(Object.keys(filterFieldKinds));
const allowedSortFields = new Set<CommerceSortField>(commerceSortFields);
const allowedOperators = new Set<CommerceFilterOperator>(commerceFilterOperators);
const reservedFieldSegments = new Set(["__proto__", "prototype", "constructor"]);
const comparableOperators = new Set<CommerceFilterOperator>([
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
]);
const listOperators = new Set<CommerceFilterOperator>(["in", "nin"]);
const noValueOperators = new Set<CommerceFilterOperator>(["exists"]);

const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizePrimitive = (value: unknown): CommercePrimitive => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return typeof value === "string" ? value.trim() : value;
  }
  throw new Error("commerce_query_invalid_filter_value");
};

const normalizeFieldPath = (value: unknown) => {
  if (typeof value !== "string") throw new Error("commerce_query_invalid_field");
  const normalized = value.trim();
  const segments = normalized.split(".");
  if (
    !normalized ||
    segments.some((segment) => segment.length === 0 || reservedFieldSegments.has(segment))
  ) {
    throw new Error("commerce_query_invalid_field");
  }
  return normalized;
};

const readFieldValue = (product: CommerceProduct, field: string): unknown => {
  switch (field) {
    case "title":
      return product.title;
    case "slug":
      return product.slug;
    case "status":
      return product.status;
    case "excerpt":
      return product.excerpt;
    case "description":
      return product.description;
    case "pricing.amount":
      return product.pricing.amount;
    case "pricing.compareAtAmount":
      return product.pricing.compareAtAmount;
    case "stock.state":
      return product.stock.state;
    case "stock.quantity":
      return product.stock.quantity;
    case "createdAt":
      return product.createdAt;
    case "updatedAt":
      return product.updatedAt;
    case "publishedAt":
      return product.publishedAt;
    case "collectionIds":
      return product.collectionIds;
    default:
      return undefined;
  }
};

const normalizeStatusFilter = (input: unknown): CommerceProductStatus[] => {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new Error("commerce_query_invalid_status");
  if (input.length > 3) throw new Error("commerce_query_invalid_status");
  const statuses = input.map((value) => normalizeCommerceProductStatus(value));
  return Array.from(new Set(statuses));
};

const normalizeCollectionIds = (input: unknown): string[] => {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new Error("commerce_query_invalid_collection_ids");
  if (input.length > 20) throw new Error("commerce_query_invalid_collection_ids");
  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
};

const normalizeSearch = (input: unknown) => {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") throw new Error("commerce_query_invalid_search");
  const normalized = input.trim();
  if (!normalized) return null;
  if (normalized.length > 160) throw new Error("commerce_query_invalid_search");
  return normalized;
};

const normalizePagination = (value: unknown) => {
  const fallback = { limit: 24, offset: 0 };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const payload = value as Record<string, unknown>;
  const limitRaw = typeof payload.limit === "number" ? payload.limit : fallback.limit;
  const offsetRaw = typeof payload.offset === "number" ? payload.offset : fallback.offset;
  const limit = Number.isFinite(limitRaw) ? Math.floor(limitRaw) : fallback.limit;
  const offset = Number.isFinite(offsetRaw) ? Math.floor(offsetRaw) : fallback.offset;
  if (limit < 1 || limit > 100 || offset < 0 || offset > 5000) {
    throw new Error("commerce_query_invalid_pagination");
  }
  return { limit, offset };
};

const normalizeSort = (value: unknown): CommerceQuerySort[] => {
  if (value === undefined || value === null) {
    return [{ field: "updatedAt", dir: "desc" }];
  }
  if (!Array.isArray(value)) throw new Error("commerce_query_invalid_sort");
  if (value.length > 3) throw new Error("commerce_query_invalid_sort");
  if (value.length === 0) return [{ field: "updatedAt", dir: "desc" }];

  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("commerce_query_invalid_sort");
    }
    const payload = entry as Record<string, unknown>;
    const field = normalizeFieldPath(payload.field);
    if (!allowedSortFields.has(field as CommerceSortField)) {
      throw new Error("commerce_query_invalid_sort");
    }
    const dir = payload.dir === "asc" || payload.dir === "desc" ? payload.dir : null;
    if (!dir) throw new Error("commerce_query_invalid_sort");
    return {
      field: field as CommerceSortField,
      dir,
    };
  });
};

const toComparable = (value: unknown, kind: FieldKind): string | number | null => {
  if (value === null || value === undefined) return null;
  if (kind === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const numeric = Number(value.trim());
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  }
  if (kind === "date") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value instanceof Date) {
      const ts = value.getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const ts = Date.parse(value);
      return Number.isNaN(ts) ? null : ts;
    }
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
};

const valuesEqual = (left: unknown, right: unknown, kind: FieldKind) => {
  const a = toComparable(left, kind);
  const b = toComparable(right, kind);
  if (a === null || b === null) return false;
  return a === b;
};

const normalizeFilterValue = (filter: CommerceQueryFilter, kind: FieldKind): NormalizedFilterValue | undefined => {
  if (noValueOperators.has(filter.op)) {
    if (filter.value === undefined) return true;
    if (typeof filter.value === "boolean") return filter.value;
    throw new Error("commerce_query_invalid_filter_value");
  }

  if (filter.value === undefined) throw new Error("commerce_query_invalid_filter_value");

  if (listOperators.has(filter.op)) {
    if (!Array.isArray(filter.value) || filter.value.length === 0 || filter.value.length > 100) {
      throw new Error("commerce_query_invalid_filter_value");
    }
    return filter.value.map((entry) => normalizePrimitive(entry));
  }

  if (filter.op === "between") {
    if (!Array.isArray(filter.value) || filter.value.length !== 2) {
      throw new Error("commerce_query_invalid_filter_value");
    }
    const start = normalizePrimitive(filter.value[0]);
    const end = normalizePrimitive(filter.value[1]);
    if (kind === "number" || kind === "date") {
      if (toComparable(start, kind) === null || toComparable(end, kind) === null) {
        throw new Error("commerce_query_invalid_filter_value");
      }
    }
    return [start, end];
  }

  const normalized = normalizePrimitive(filter.value);
  if (comparableOperators.has(filter.op)) {
    if ((kind !== "number" && kind !== "date") || toComparable(normalized, kind) === null) {
      throw new Error("commerce_query_invalid_filter_value");
    }
  }

  if (filter.op === "contains" && kind !== "string" && kind !== "array") {
    throw new Error("commerce_query_invalid_filter_operator");
  }

  return normalized;
};

const normalizeFilters = (value: unknown): CommerceQueryFilter[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("commerce_query_invalid_filters");
  if (value.length > 20) throw new Error("commerce_query_invalid_filters");

  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("commerce_query_invalid_filters");
    }
    const payload = entry as Record<string, unknown>;
    const field = normalizeFieldPath(payload.field);
    if (!allowedFilterFields.has(field)) throw new Error("commerce_query_invalid_field");

    const op = payload.op;
    if (typeof op !== "string" || !allowedOperators.has(op as CommerceFilterOperator)) {
      throw new Error("commerce_query_invalid_filter_operator");
    }

    const kind = filterFieldKinds[field] ?? "string";
    const valueNormalized = normalizeFilterValue(
      {
        field,
        op: op as CommerceFilterOperator,
        ...(hasOwn(payload, "value") ? { value: payload.value as never } : {}),
      },
      kind
    );

    return {
      field,
      op: op as CommerceFilterOperator,
      ...(valueNormalized !== undefined ? { value: valueNormalized } : {}),
    };
  });
};

const valueInArray = (source: unknown, values: CommercePrimitive[], kind: FieldKind) =>
  values.some((entry) => valuesEqual(source, entry, kind));

const matchExists = (source: unknown) => {
  if (source === null || source === undefined) return false;
  if (typeof source === "string") return source.trim().length > 0;
  if (Array.isArray(source)) return source.length > 0;
  return true;
};

const matchFilter = (product: CommerceProduct, filter: CommerceQueryFilter) => {
  const kind = filterFieldKinds[filter.field] ?? "string";
  const source = readFieldValue(product, filter.field);
  const op = filter.op;
  const value = filter.value as NormalizedFilterValue | undefined;

  if (op === "exists") {
    const expected = value === undefined || value === true;
    return matchExists(source) === expected;
  }

  if (op === "contains") {
    if (typeof source === "string" && typeof value === "string") {
      return source.toLowerCase().includes(value.toLowerCase());
    }
    if (Array.isArray(source)) {
      return source.some((entry) => valuesEqual(entry, value, "string"));
    }
    return false;
  }

  if (op === "in" || op === "nin") {
    if (!Array.isArray(value)) return false;
    const matched = Array.isArray(source)
      ? source.some((entry) => valueInArray(entry, value, kind === "array" ? "string" : kind))
      : valueInArray(source, value, kind);
    return op === "in" ? matched : !matched;
  }

  if (op === "between") {
    if (!Array.isArray(value) || value.length !== 2) return false;
    const sourceComparable = toComparable(source, kind);
    const start = toComparable(value[0], kind);
    const end = toComparable(value[1], kind);
    if (sourceComparable === null || start === null || end === null) return false;
    return sourceComparable >= start && sourceComparable <= end;
  }

  if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
    const left = toComparable(source, kind);
    const right = toComparable(value, kind);
    if (left === null || right === null) return false;
    if (op === "gt") return left > right;
    if (op === "gte") return left >= right;
    if (op === "lt") return left < right;
    return left <= right;
  }

  const equals = Array.isArray(source)
    ? source.some((entry) => valuesEqual(entry, value, kind === "array" ? "string" : kind))
    : valuesEqual(source, value, kind);
  if (op === "eq") return equals;
  if (op === "neq") return !equals;
  return false;
};

const compareForSort = (
  left: CommerceProduct,
  right: CommerceProduct,
  sort: CommerceQuerySort
) => {
  const kind = sortFieldKinds[sort.field];
  const leftValue = toComparable(readFieldValue(left, sort.field), kind);
  const rightValue = toComparable(readFieldValue(right, sort.field), kind);

  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  if (leftValue < rightValue) return sort.dir === "asc" ? -1 : 1;
  if (leftValue > rightValue) return sort.dir === "asc" ? 1 : -1;
  return 0;
};

const applySearch = (product: CommerceProduct, search: string | null) => {
  if (!search) return true;
  const haystack = [product.title, product.slug, product.excerpt, product.description]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
};

const normalizeQueryPayload = (input: CommerceQueryInput = {}): CommerceExecutionPlan => {
  const filters = normalizeFilters(input.filters);
  const sort = normalizeSort(input.sort);
  const pagination = normalizePagination(input.pagination);
  const status = normalizeStatusFilter(input.status);
  const collectionIds = normalizeCollectionIds(input.collectionIds);
  const search = normalizeSearch(input.search);

  return {
    filters,
    sort,
    pagination,
    status,
    collectionIds,
    search,
  };
};

export function buildCommerceExecutionPlan(input: CommerceQueryInput = {}): CommerceExecutionPlan {
  return normalizeQueryPayload(input);
}

export async function executeCommerceQuery(
  input: CommerceQueryInput = {},
  deps: Partial<CommerceQueryDeps> = {}
): Promise<CommerceQueryResult> {
  const plan = buildCommerceExecutionPlan(input);
  const runtimeDeps: CommerceQueryDeps = {
    ...defaultDeps,
    ...deps,
  };

  const rows = await runtimeDeps.listProducts();

  const filtered = rows.filter((product) => {
    if (plan.status.length > 0 && !plan.status.includes(product.status)) return false;
    if (
      plan.collectionIds.length > 0 &&
      !product.collectionIds.some((collectionId) => plan.collectionIds.includes(collectionId))
    ) {
      return false;
    }
    if (!applySearch(product, plan.search)) return false;
    return plan.filters.every((filter) => matchFilter(product, filter));
  });

  const sorted = [...filtered].sort((left, right) => {
    for (const sort of plan.sort) {
      const result = compareForSort(left, right, sort);
      if (result !== 0) return result;
    }
    return left.id.localeCompare(right.id);
  });

  const { limit, offset } = plan.pagination;
  const paged = sorted.slice(offset, offset + limit);

  return {
    total: filtered.length,
    limit,
    offset,
    query: {
      filters: plan.filters,
      sort: plan.sort,
      pagination: plan.pagination,
      ...(plan.status.length > 0 ? { status: plan.status } : {}),
      ...(plan.collectionIds.length > 0 ? { collectionIds: plan.collectionIds } : {}),
      ...(plan.search ? { search: plan.search } : {}),
    },
    rows: paged,
  };
}

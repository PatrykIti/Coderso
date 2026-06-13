import { ApiError } from "../../server/errorHandler";
import {
  getListingSourceDefinition,
  isListingFieldAllowed,
  type ListingSourceDefinition,
  type ListingSourceRow,
} from "./listingSourceDefinitions";

export const listingSources = ["entries", "posts", "users", "taxonomies"] as const;

export const listingFilterOperators = [
  "eq",
  "neq",
  "in",
  "nin",
  "contains",
  "startsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "exists",
] as const;

export type ListingSource = (typeof listingSources)[number];
export type ListingFilterOperator = (typeof listingFilterOperators)[number];
export type ListingPrimitive = string | number | boolean | null;
export type ListingFilterValue = ListingPrimitive | ListingPrimitive[];

export type ListingFilter = {
  field: string;
  op: ListingFilterOperator;
  value?: ListingFilterValue;
};

export type ListingSort = {
  field: string;
  dir: "asc" | "desc";
};

export type ListingPagination = {
  limit: number;
  offset: number;
};

export type ListingSourceConfig = {
  contentTypeId?: string;
  taxonomyId?: string;
  includeDrafts?: boolean;
};

export type ListingQuery = {
  source: ListingSource;
  sourceConfig: ListingSourceConfig;
  filters: ListingFilter[];
  sort: ListingSort[];
  pagination: ListingPagination;
  fields: string[];
};

export type ListingQueryCreateInput = {
  name: string;
  description: string | null;
  query: ListingQuery;
};

export type ListingQueryUpdateInput = {
  name?: string;
  description?: string | null;
  query?: ListingQuery;
};

export type ListingExecutionPlan = {
  source: ListingSourceDefinition;
  query: ListingQuery;
  fields: string[];
  sort: ListingSort[];
  limit: number;
  offset: number;
};

export type ListingExecutionResult = {
  source: ListingSource;
  total: number;
  limit: number;
  offset: number;
  rows: ListingSourceRow[];
  pushdown?: unknown;
};

export type ListingCorpusResult = {
  source: ListingSource;
  total: number;
  rows: ListingSourceRow[];
};

const reservedFieldSegments = new Set(["__proto__", "prototype", "constructor"]);
const noValueOperators = new Set<ListingFilterOperator>(["exists"]);
const arrayOperators = new Set<ListingFilterOperator>(["in", "nin"]);
const rangeOperators = new Set<ListingFilterOperator>(["between"]);
const stringOperators = new Set<ListingFilterOperator>(["contains", "startsWith"]);
const comparableOperators = new Set<ListingFilterOperator>(["gt", "gte", "lt", "lte"]);
const listingSourceSet = new Set<string>(listingSources);
const listingFilterOperatorSet = new Set<string>(listingFilterOperators);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const isPrimitive = (value: unknown): value is ListingPrimitive =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === null;

const normalizeOptionalText = (value: string | null | undefined) => {
  if (typeof value !== "string") return value ?? undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeNullableText = (value: string | null | undefined) => {
  const normalized = normalizeOptionalText(value);
  return normalized ?? null;
};

const normalizeFieldPath = (value: string, context: "field" | "sort" | "filter") => {
  const normalized = value.trim();
  const segments = normalized.split(".");
  const hasInvalidSegment = segments.some(
    (segment) => segment.length === 0 || reservedFieldSegments.has(segment)
  );

  if (normalized.length === 0 || hasInvalidSegment) {
    throw new ApiError("listing_query_invalid_field", `Invalid ${context} path "${value}"`, 400);
  }

  return normalized;
};

const normalizeFilterValue = (
  value: ListingFilterValue | undefined
): ListingFilterValue | undefined => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === "string" ? entry.trim() : entry));
  }
  return value;
};

function assertQueryShape(payload: unknown): asserts payload is {
  source: unknown;
  sourceConfig: Record<string, unknown>;
  filters: Array<Record<string, unknown>>;
  sort: Array<Record<string, unknown>>;
  pagination: Record<string, unknown>;
  fields: unknown[];
} {
  if (!isRecord(payload)) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
  if (
    typeof payload.source !== "string" ||
    !isRecord(payload.sourceConfig) ||
    !Array.isArray(payload.filters) ||
    !Array.isArray(payload.sort) ||
    !isRecord(payload.pagination) ||
    !Array.isArray(payload.fields)
  ) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
}

const assertSourceConfig = (query: ListingQuery) => {
  const hasTypeId = Boolean(query.sourceConfig.contentTypeId);
  const hasTaxonomyId = Boolean(query.sourceConfig.taxonomyId);
  const includeDrafts = query.sourceConfig.includeDrafts !== undefined;

  if (query.source === "entries" && !hasTypeId) {
    throw new ApiError(
      "listing_query_invalid_source_config",
      "Entries source requires sourceConfig.contentTypeId",
      400
    );
  }

  if (query.source !== "entries" && hasTypeId) {
    throw new ApiError(
      "listing_query_invalid_source_config",
      "contentTypeId is allowed only for entries source",
      400
    );
  }

  if (query.source === "taxonomies") {
    if (includeDrafts) {
      throw new ApiError(
        "listing_query_invalid_source_config",
        "includeDrafts is not supported for taxonomies source",
        400
      );
    }
    return;
  }

  if (hasTaxonomyId) {
    throw new ApiError(
      "listing_query_invalid_source_config",
      "taxonomyId is allowed only for taxonomies source",
      400
    );
  }

  if (query.source === "users" && includeDrafts) {
    throw new ApiError(
      "listing_query_invalid_source_config",
      "includeDrafts is not supported for users source",
      400
    );
  }
};

const assertFilterValue = (filter: ListingFilter) => {
  if (noValueOperators.has(filter.op)) {
    if (filter.value !== undefined) {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" does not accept value`,
        400
      );
    }
    return;
  }

  if (filter.value === undefined) {
    throw new ApiError(
      "listing_query_invalid_filter_value",
      `Operator "${filter.op}" requires value`,
      400
    );
  }

  if (arrayOperators.has(filter.op)) {
    if (!Array.isArray(filter.value) || filter.value.length === 0) {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" requires a non-empty array`,
        400
      );
    }
    if (!filter.value.every(isPrimitive)) {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" accepts primitive array values only`,
        400
      );
    }
    return;
  }

  if (rangeOperators.has(filter.op)) {
    if (!Array.isArray(filter.value) || filter.value.length !== 2) {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" requires exactly two values`,
        400
      );
    }
    const [start, end] = filter.value;
    const validRangeValue = (value: unknown) =>
      typeof value === "string" || typeof value === "number";
    if (!validRangeValue(start) || !validRangeValue(end)) {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" accepts number|string range only`,
        400
      );
    }
    return;
  }

  if (stringOperators.has(filter.op)) {
    if (typeof filter.value !== "string" || filter.value.length === 0) {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" requires non-empty string value`,
        400
      );
    }
    return;
  }

  if (comparableOperators.has(filter.op)) {
    if (typeof filter.value !== "number" && typeof filter.value !== "string") {
      throw new ApiError(
        "listing_query_invalid_filter_value",
        `Operator "${filter.op}" requires number|string value`,
        400
      );
    }
    return;
  }

  if (!isPrimitive(filter.value)) {
    throw new ApiError(
      "listing_query_invalid_filter_value",
      `Operator "${filter.op}" accepts primitive value`,
      400
    );
  }
};

const normalizeQuery = (query: ListingQuery): ListingQuery => {
  const sourceConfig: ListingSourceConfig = {};
  const contentTypeId = normalizeOptionalText(query.sourceConfig.contentTypeId);
  if (contentTypeId) sourceConfig.contentTypeId = contentTypeId;
  const taxonomyId = normalizeOptionalText(query.sourceConfig.taxonomyId);
  if (taxonomyId) sourceConfig.taxonomyId = taxonomyId;
  if (typeof query.sourceConfig.includeDrafts === "boolean") {
    sourceConfig.includeDrafts = query.sourceConfig.includeDrafts;
  }

  const normalized: ListingQuery = {
    source: query.source,
    sourceConfig,
    filters: query.filters.map((filter) => ({
      field: normalizeFieldPath(filter.field, "filter"),
      op: filter.op,
      value: normalizeFilterValue(filter.value),
    })),
    sort: query.sort.map((sort) => ({
      field: normalizeFieldPath(sort.field, "sort"),
      dir: sort.dir,
    })),
    pagination: {
      limit: query.pagination.limit,
      offset: query.pagination.offset,
    },
    fields: query.fields.map((field) => normalizeFieldPath(field, "field")),
  };

  assertSourceConfig(normalized);
  normalized.filters.forEach(assertFilterValue);

  return normalized;
};

const toListingFilter = (value: Record<string, unknown>): ListingFilter => {
  if (
    typeof value.field !== "string" ||
    typeof value.op !== "string" ||
    !listingFilterOperatorSet.has(value.op)
  ) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
  return {
    field: value.field,
    op: value.op as ListingFilterOperator,
    ...(hasOwn(value, "value") ? { value: value.value as ListingFilterValue } : {}),
  };
};

const toListingSort = (value: Record<string, unknown>): ListingSort => {
  if (typeof value.field !== "string" || (value.dir !== "asc" && value.dir !== "desc")) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
  return { field: value.field, dir: value.dir };
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const assertFieldAllowedForSource = (
  source: ListingSourceDefinition,
  field: string,
  context: "field" | "filter" | "sort"
) => {
  if (!isListingFieldAllowed(source, field)) {
    throw new ApiError(
      "listing_query_field_not_allowed",
      `Field "${field}" is not allowed in ${context} for source "${source.id}"`,
      400
    );
  }
};

const normalizeExecutionFields = (source: ListingSourceDefinition, fields: string[]) => {
  const selected = fields.length > 0 ? [...fields] : [...source.defaultFields];
  if (!selected.includes("id")) {
    selected.unshift("id");
  }
  const deduped = [...new Set(selected)];
  deduped.forEach((field) => assertFieldAllowedForSource(source, field, "field"));
  return deduped;
};

const normalizeExecutionSort = (source: ListingSourceDefinition, sort: ListingSort[]) => {
  const selected = sort.length > 0 ? [...sort] : [...source.defaultSort];
  selected.forEach((item) => assertFieldAllowedForSource(source, item.field, "sort"));
  if (!selected.some((item) => item.field === "id")) {
    selected.push({ field: "id", dir: "asc" });
  }
  return selected;
};

export function parseListingQuery(payload: unknown): ListingQuery {
  assertQueryShape(payload);
  if (typeof payload.source !== "string" || !listingSourceSet.has(payload.source)) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
  const limit = payload.pagination.limit;
  const offset = payload.pagination.offset;
  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit) ||
    typeof offset !== "number" ||
    !Number.isFinite(offset)
  ) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }

  return normalizeQuery({
    source: payload.source as ListingSource,
    sourceConfig: {
      contentTypeId:
        typeof payload.sourceConfig.contentTypeId === "string"
          ? payload.sourceConfig.contentTypeId
          : undefined,
      taxonomyId:
        typeof payload.sourceConfig.taxonomyId === "string"
          ? payload.sourceConfig.taxonomyId
          : undefined,
      includeDrafts:
        typeof payload.sourceConfig.includeDrafts === "boolean"
          ? payload.sourceConfig.includeDrafts
          : undefined,
    },
    filters: payload.filters.map(toListingFilter),
    sort: payload.sort.map(toListingSort),
    pagination: { limit, offset },
    fields: payload.fields.map((field) => {
      if (typeof field !== "string") {
        throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
      }
      return field;
    }),
  });
}

export function buildListingExecutionPlan(input: unknown): ListingExecutionPlan {
  const query = parseListingQuery(input);
  const source = getListingSourceDefinition(query.source);

  query.filters.forEach((filter) => {
    assertFieldAllowedForSource(source, filter.field, "filter");
  });

  const fields = normalizeExecutionFields(source, query.fields);
  const sort = normalizeExecutionSort(source, query.sort);
  const limit = clampNumber(query.pagination.limit, 1, 100);
  const offset = clampNumber(query.pagination.offset, 0, 5000);

  return {
    source,
    query,
    fields,
    sort,
    limit,
    offset,
  };
}

export function parseListingQueryCreateInput(payload: unknown): ListingQueryCreateInput {
  if (!isRecord(payload) || typeof payload.name !== "string" || !hasOwn(payload, "query")) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }

  const name = payload.name.trim();
  if (name.length === 0) {
    throw new ApiError("listing_query_invalid_name", "Listing query name must not be empty", 400);
  }

  return {
    name,
    description:
      typeof payload.description === "string" || payload.description === null
        ? normalizeNullableText(payload.description)
        : null,
    query: parseListingQuery(payload.query),
  };
}

export function parseListingQueryUpdateInput(payload: unknown): ListingQueryUpdateInput {
  if (!isRecord(payload)) {
    throw new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
  if (!hasOwn(payload, "name") && !hasOwn(payload, "description") && !hasOwn(payload, "query")) {
    throw new ApiError("listing_query_update_empty", "Listing query update payload is empty", 400);
  }

  const input: ListingQueryUpdateInput = {};
  if (hasOwn(payload, "name")) {
    const name = normalizeOptionalText(payload.name as string | null | undefined);
    if (!name) {
      throw new ApiError("listing_query_invalid_name", "Listing query name must not be empty", 400);
    }
    input.name = name;
  }

  if (hasOwn(payload, "description")) {
    input.description =
      typeof payload.description === "string" || payload.description === null
        ? normalizeNullableText(payload.description)
        : null;
  }

  if (hasOwn(payload, "query")) {
    input.query = parseListingQuery(payload.query);
  }

  return input;
}

export const parseListingQueryPreviewInput = parseListingQuery;

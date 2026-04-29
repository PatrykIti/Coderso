import { ApiError } from "../../server/errorHandler";
import {
  listingFilterOperators,
  listingQueryCreateSchema,
  listingQuerySchema,
  listingQueryUpdateSchema,
  listingSources,
} from "../../server/validation/listingSchemas";
import { validate } from "../../server/validation/schemaValidator";
import {
  fetchListingSourceRows,
  getListingSourceDefinition,
  isListingFieldAllowed,
  type ListingSourceDefinition,
  type ListingSourceRow,
} from "./listingSources";

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
};

export type ListingRowsResolver = (
  source: ListingSource,
  config: ListingSourceConfig
) => Promise<ListingSourceRow[]>;

const reservedFieldSegments = new Set(["__proto__", "prototype", "constructor"]);
const noValueOperators = new Set<ListingFilterOperator>(["exists"]);
const arrayOperators = new Set<ListingFilterOperator>(["in", "nin"]);
const rangeOperators = new Set<ListingFilterOperator>(["between"]);
const stringOperators = new Set<ListingFilterOperator>(["contains", "startsWith"]);
const comparableOperators = new Set<ListingFilterOperator>(["gt", "gte", "lt", "lte"]);

const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const isApiValidationError = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === "validation_error";

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
    throw new ApiError(
      "listing_query_invalid_field",
      `Invalid ${context} path "${value}"`,
      400
    );
  }

  return normalized;
};

const getSafeFieldSegments = (
  value: string,
  context: "field" | "sort" | "filter" | "execution"
) => {
  const normalized = value.trim();
  const segments = normalized.split(".");
  const hasInvalidSegment = segments.some(
    (segment) => segment.length === 0 || reservedFieldSegments.has(segment)
  );

  if (normalized.length === 0 || hasInvalidSegment) {
    throw new ApiError(
      "listing_query_invalid_field",
      `Invalid ${context} path "${value}"`,
      400
    );
  }

  return segments;
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

const validateSchemaOrThrow = (schema: unknown, payload: unknown) => {
  try {
    validate(schema, payload);
  } catch (error) {
    if (isApiValidationError(error)) {
      throw new ApiError(
        "listing_query_invalid",
        "Listing query payload is invalid",
        400,
        error.details
      );
    }
    throw error;
  }
};

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

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const readFieldValue = (row: ListingSourceRow, field: string): unknown => {
  const segments = getSafeFieldSegments(field, "execution");
  let current: unknown = row;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    if (!hasOwn(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const setFieldValue = (target: ListingSourceRow, field: string, value: unknown) => {
  const segments = getSafeFieldSegments(field, "execution");
  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (reservedFieldSegments.has(segment)) {
      throw new ApiError(
        "listing_query_invalid_field",
        `Invalid execution path "${field}"`,
        400
      );
    }
    const isLast = index === segments.length - 1;
    if (isLast) {
      current[segment] = value;
      return;
    }
    const existing = current[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
};

const normalizeComparableValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeComparableValue(entry));
  }
  return value;
};

const toComparableScalar = (value: unknown) => {
  const normalized = normalizeComparableValue(value);
  if (typeof normalized === "number" || typeof normalized === "string" || typeof normalized === "boolean") {
    return normalized;
  }
  if (normalized === null || normalized === undefined) return null;
  return JSON.stringify(normalized);
};

const compareScalarValues = (left: unknown, right: unknown) => {
  const a = toComparableScalar(left);
  const b = toComparableScalar(right);

  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), "en", {
    sensitivity: "base",
    numeric: true,
  });
};

const compareRangeValues = (left: unknown, right: unknown) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "en", {
    sensitivity: "base",
    numeric: true,
  });
};

const matchesContains = (candidate: unknown, expected: string) => {
  const normalizedExpected = expected.toLowerCase();
  if (Array.isArray(candidate)) {
    return candidate.some((entry) =>
      String(normalizeComparableValue(entry) ?? "")
        .toLowerCase()
        .includes(normalizedExpected)
    );
  }
  return String(normalizeComparableValue(candidate) ?? "")
    .toLowerCase()
    .includes(normalizedExpected);
};

const matchesStartsWith = (candidate: unknown, expected: string) => {
  const normalizedExpected = expected.toLowerCase();
  if (Array.isArray(candidate)) {
    return candidate.some((entry) =>
      String(normalizeComparableValue(entry) ?? "")
        .toLowerCase()
        .startsWith(normalizedExpected)
    );
  }
  return String(normalizeComparableValue(candidate) ?? "")
    .toLowerCase()
    .startsWith(normalizedExpected);
};

const matchesFilter = (row: ListingSourceRow, filter: ListingFilter): boolean => {
  const fieldValue = normalizeComparableValue(readFieldValue(row, filter.field));

  if (filter.op === "exists") {
    return fieldValue !== undefined && fieldValue !== null;
  }

  const expected = normalizeComparableValue(filter.value);

  if (filter.op === "eq") {
    if (Array.isArray(fieldValue)) {
      return fieldValue.some((entry) => compareScalarValues(entry, expected) === 0);
    }
    return compareScalarValues(fieldValue, expected) === 0;
  }

  if (filter.op === "neq") {
    return !matchesFilter(row, { ...filter, op: "eq" });
  }

  if (filter.op === "in" || filter.op === "nin") {
    const values = Array.isArray(expected) ? expected : [];
    const hasMatch = Array.isArray(fieldValue)
      ? fieldValue.some((entry) => values.some((candidate) => compareScalarValues(entry, candidate) === 0))
      : values.some((candidate) => compareScalarValues(fieldValue, candidate) === 0);
    return filter.op === "in" ? hasMatch : !hasMatch;
  }

  if (filter.op === "contains" && typeof expected === "string") {
    return matchesContains(fieldValue, expected);
  }

  if (filter.op === "startsWith" && typeof expected === "string") {
    return matchesStartsWith(fieldValue, expected);
  }

  if (
    (filter.op === "gt" ||
      filter.op === "gte" ||
      filter.op === "lt" ||
      filter.op === "lte") &&
    (typeof expected === "number" || typeof expected === "string")
  ) {
    const delta = compareRangeValues(fieldValue, expected);
    if (filter.op === "gt") return delta > 0;
    if (filter.op === "gte") return delta >= 0;
    if (filter.op === "lt") return delta < 0;
    return delta <= 0;
  }

  if (filter.op === "between" && Array.isArray(expected) && expected.length === 2) {
    const [start, end] = expected;
    if (
      (typeof start !== "number" && typeof start !== "string") ||
      (typeof end !== "number" && typeof end !== "string")
    ) {
      return false;
    }
    return (
      compareRangeValues(fieldValue, start) >= 0 &&
      compareRangeValues(fieldValue, end) <= 0
    );
  }

  return false;
};

const applyFilters = (rows: ListingSourceRow[], filters: ListingFilter[]) => {
  if (filters.length === 0) return rows;
  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter)));
};

const applySort = (rows: ListingSourceRow[], sort: ListingSort[]) => {
  if (sort.length === 0) return rows;
  const next = [...rows];
  next.sort((left, right) => {
    for (const sortItem of sort) {
      const leftValue = readFieldValue(left, sortItem.field);
      const rightValue = readFieldValue(right, sortItem.field);
      const delta = compareScalarValues(leftValue, rightValue);
      if (delta === 0) continue;
      return sortItem.dir === "asc" ? delta : -delta;
    }
    return 0;
  });
  return next;
};

const projectRows = (rows: ListingSourceRow[], fields: string[]) => {
  return rows.map((row) => {
    const projected: ListingSourceRow = {};
    for (const field of fields) {
      setFieldValue(projected, field, readFieldValue(row, field));
    }
    return projected;
  });
};

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

const normalizeExecutionFields = (
  source: ListingSourceDefinition,
  fields: string[]
) => {
  const selected = fields.length > 0 ? [...fields] : [...source.defaultFields];
  if (!selected.includes("id")) {
    selected.unshift("id");
  }
  const deduped = [...new Set(selected)];
  deduped.forEach((field) => assertFieldAllowedForSource(source, field, "field"));
  return deduped;
};

const normalizeExecutionSort = (
  source: ListingSourceDefinition,
  sort: ListingSort[]
) => {
  const selected = sort.length > 0 ? [...sort] : [...source.defaultSort];
  selected.forEach((item) => assertFieldAllowedForSource(source, item.field, "sort"));
  if (!selected.some((item) => item.field === "id")) {
    selected.push({ field: "id", dir: "asc" });
  }
  return selected;
};

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

export async function executeListingQuery(
  input: unknown,
  options?: { rowsResolver?: ListingRowsResolver }
): Promise<ListingExecutionResult> {
  const plan = buildListingExecutionPlan(input);
  const resolver = options?.rowsResolver ?? fetchListingSourceRows;
  const sourceRows = await resolver(plan.query.source, plan.query.sourceConfig);
  const filteredRows = applyFilters(sourceRows, plan.query.filters);
  const sortedRows = applySort(filteredRows, plan.sort);
  const total = sortedRows.length;
  const pageRows = sortedRows.slice(plan.offset, plan.offset + plan.limit);

  return {
    source: plan.query.source,
    total,
    limit: plan.limit,
    offset: plan.offset,
    rows: projectRows(pageRows, plan.fields),
  };
}

export function parseListingQuery(payload: unknown): ListingQuery {
  validateSchemaOrThrow(listingQuerySchema, payload);
  return normalizeQuery(payload as ListingQuery);
}

export function parseListingQueryCreateInput(
  payload: unknown
): ListingQueryCreateInput {
  validateSchemaOrThrow(listingQueryCreateSchema, payload);
  const typed = payload as {
    name: string;
    description?: string | null;
    query: ListingQuery;
  };

  const name = typed.name.trim();
  if (name.length === 0) {
    throw new ApiError(
      "listing_query_invalid_name",
      "Listing query name must not be empty",
      400
    );
  }

  return {
    name,
    description: normalizeNullableText(typed.description),
    query: parseListingQuery(typed.query),
  };
}

export function parseListingQueryUpdateInput(
  payload: unknown
): ListingQueryUpdateInput {
  validateSchemaOrThrow(listingQueryUpdateSchema, payload);
  const typed = payload as {
    name?: string;
    description?: string | null;
    query?: ListingQuery;
  };

  if (!hasOwn(typed, "name") && !hasOwn(typed, "description") && !hasOwn(typed, "query")) {
    throw new ApiError(
      "listing_query_update_empty",
      "Listing query update payload is empty",
      400
    );
  }

  const input: ListingQueryUpdateInput = {};
  if (hasOwn(typed, "name")) {
    const name = normalizeOptionalText(typed.name);
    if (!name) {
      throw new ApiError(
        "listing_query_invalid_name",
        "Listing query name must not be empty",
        400
      );
    }
    input.name = name;
  }

  if (hasOwn(typed, "description")) {
    input.description = normalizeNullableText(typed.description);
  }

  if (hasOwn(typed, "query")) {
    input.query = parseListingQuery(typed.query);
  }

  return input;
}

export const parseListingQueryPreviewInput = parseListingQuery;

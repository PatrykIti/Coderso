import {
  buildListingExecutionPlan,
  type ListingFilter,
  type ListingQuery,
  type ListingSort,
} from "../content/listingQueryContract";
import { readListingRowField } from "../content/listingRuntimeResolver";
import {
  LISTING_RUNTIME_QUERY_PREFIX,
  buildFacetSortToken,
  listingRuntimeTokens,
  normalizeListingRuntimeSearchParams,
  resolveFacetToken,
  type ListingFacetConfig,
  type ListingFacetMetric,
  type ListingFilterOperator,
  type ListingRuntimeAliasMap,
} from "./filterContract";

const runtimeSortToken = listingRuntimeTokens.sort;
const runtimePageToken = listingRuntimeTokens.page;
const runtimeSearchToken = listingRuntimeTokens.search;

const runtimeFilterOperators = new Set<ListingFilterOperator>([
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
]);

const listOperators = new Set<ListingFilterOperator>(["in", "nin"]);
const rangeOperators = new Set<ListingFilterOperator>(["between"]);
const noValueOperators = new Set<ListingFilterOperator>(["exists"]);

type ListingSortDirection = "asc" | "desc";

export type ListingRuntimeFilterDraft = {
  field: string;
  op: ListingFilterOperator;
  value?: unknown;
  token: string;
};

export type ListingRuntimeSortDraft = {
  field: string;
  dir: ListingSortDirection;
  token: string;
};

export type ListingRuntimeOverrideDraft = {
  listingQueryId: string;
  prefix: string;
  rawTokens: Record<string, string[]>;
  filters: ListingRuntimeFilterDraft[];
  sort: ListingRuntimeSortDraft | null;
  page: number | null;
  searchQuery: string | null;
  rejectedTokens: string[];
};

export type ListingRuntimeOverrides = {
  query: ListingQuery;
  appliedFilters: ListingFilter[];
  appliedSearchFilter: ListingFilter | null;
  appliedSort: ListingSort[];
  page: number | null;
  searchQuery: string | null;
  rejectedTokens: string[];
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseScalar = (input: string): string | number | boolean | null => {
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && `${numeric}` === trimmed) {
    return numeric;
  }
  return trimmed;
};

const parseListValue = (inputs: string[]) =>
  inputs
    .flatMap((entry) => entry.split(","))
    .map((entry) => parseScalar(entry))
    .filter((entry) => entry !== "");

const parseRangeValue = (inputs: string[]) => {
  const [first, second] = inputs
    .flatMap((entry) => entry.split(","))
    .map((entry) => parseScalar(entry))
    .filter((entry) => entry !== "")
    .slice(0, 2);
  if (first === undefined || second === undefined) return null;
  return [first, second] as [string | number | boolean | null, string | number | boolean | null];
};

const parseExistsValue = (inputs: string[]) => {
  const candidate = inputs[0]?.trim().toLowerCase();
  if (!candidate) return undefined;
  if (candidate === "true") return true;
  if (candidate === "false") return false;
  return undefined;
};

const parseFilterValue = (operator: ListingFilterOperator, inputs: string[]): unknown => {
  if (noValueOperators.has(operator)) {
    return parseExistsValue(inputs);
  }
  if (listOperators.has(operator)) {
    return parseListValue(inputs);
  }
  if (rangeOperators.has(operator)) {
    return parseRangeValue(inputs);
  }
  const value = parseScalar(inputs[0] ?? "");
  return value;
};

const parseSortDraft = (value: string, token: string): ListingRuntimeSortDraft | null => {
  const normalized = value.trim();
  const separatorIndex = normalized.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex === normalized.length - 1) return null;
  const field = normalized.slice(0, separatorIndex).trim();
  const dir = normalized
    .slice(separatorIndex + 1)
    .trim()
    .toLowerCase();
  if (!field) return null;
  if (dir !== "asc" && dir !== "desc") return null;
  return {
    field,
    dir,
    token,
  };
};

const parsePageDraft = (value: string) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const normalized = Math.floor(numeric);
  if (normalized < 1 || normalized > 5000) return null;
  return normalized;
};

const resolveSearchField = (query: ListingQuery) => {
  const candidates = query.source === "users" ? ["name", "email"] : ["title", "slug", "name"];
  for (const field of candidates) {
    try {
      buildListingExecutionPlan({
        ...query,
        filters: [...query.filters, { field, op: "contains", value: "probe" }],
      });
      return field;
    } catch {
      continue;
    }
  }
  return null;
};

const validateCandidateFilter = (query: ListingQuery, candidate: ListingFilter): boolean => {
  try {
    buildListingExecutionPlan({
      ...query,
      filters: [...query.filters, candidate],
    });
    return true;
  } catch {
    return false;
  }
};

const validateSort = (query: ListingQuery, sort: ListingSort[]) => {
  try {
    buildListingExecutionPlan({
      ...query,
      sort,
    });
    return true;
  } catch {
    return false;
  }
};

const toComparable = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && `${numeric}` === trimmed) return numeric;
    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) return timestamp;
    return trimmed.toLowerCase();
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
};

const valuesEqual = (left: unknown, right: unknown) => {
  const a = toComparable(left);
  const b = toComparable(right);
  if (a === null || b === null) return false;
  return a === b;
};

const rowMatchesOption = (rowValue: unknown, optionValue: string) => {
  const candidate = parseScalar(optionValue);
  if (Array.isArray(rowValue)) {
    return rowValue.some((entry) => valuesEqual(entry, candidate));
  }
  return valuesEqual(rowValue, candidate);
};

export function parseListingRuntimeOverrides(
  searchParams: URLSearchParams,
  listingQueryId: string,
  aliases?: ListingRuntimeAliasMap
): ListingRuntimeOverrideDraft {
  const normalizedListingQueryId = listingQueryId.trim();
  const prefix = `${LISTING_RUNTIME_QUERY_PREFIX}.${normalizedListingQueryId}.`;
  const normalizedSearchParams = normalizeListingRuntimeSearchParams(
    searchParams,
    normalizedListingQueryId,
    aliases
  );
  const rawTokens = new Map<string, string[]>();
  const filters: ListingRuntimeFilterDraft[] = [];
  let sort: ListingRuntimeSortDraft | null = null;
  let page: number | null = null;
  let searchQuery: string | null = null;
  const rejectedTokens: string[] = [];

  for (const [key, value] of normalizedSearchParams.entries()) {
    if (!key.startsWith(prefix)) continue;
    const token = key.slice(prefix.length).trim();
    if (!token) continue;
    const bucket = rawTokens.get(token) ?? [];
    bucket.push(value);
    rawTokens.set(token, bucket);
  }

  for (const [token, values] of rawTokens.entries()) {
    if (token === runtimeSortToken) {
      const draft = parseSortDraft(values[0] ?? "", token);
      if (!draft) {
        rejectedTokens.push(token);
      } else {
        sort = draft;
      }
      continue;
    }

    if (token === runtimePageToken) {
      const draft = parsePageDraft(values[0] ?? "");
      if (!draft) {
        rejectedTokens.push(token);
      } else {
        page = draft;
      }
      continue;
    }

    if (token === runtimeSearchToken) {
      const normalized = normalizeText(values[0]);
      if (!normalized) {
        rejectedTokens.push(token);
      } else {
        searchQuery = normalized;
      }
      continue;
    }

    const separatorIndex = token.lastIndexOf(".");
    if (separatorIndex <= 0 || separatorIndex >= token.length - 1) {
      rejectedTokens.push(token);
      continue;
    }

    const field = token.slice(0, separatorIndex).trim();
    const opRaw = token.slice(separatorIndex + 1).trim();

    if (!field || !runtimeFilterOperators.has(opRaw as ListingFilterOperator)) {
      rejectedTokens.push(token);
      continue;
    }

    const op = opRaw as ListingFilterOperator;
    const value = parseFilterValue(op, values);

    filters.push({
      field,
      op,
      ...(value !== undefined ? { value } : {}),
      token,
    });
  }

  return {
    listingQueryId: normalizedListingQueryId,
    prefix,
    rawTokens: Object.fromEntries(rawTokens),
    filters,
    sort,
    page,
    searchQuery,
    rejectedTokens,
  };
}

export function resolveListingRuntimeOverrides(
  baseQuery: ListingQuery,
  draft: ListingRuntimeOverrideDraft
): ListingRuntimeOverrides {
  const appliedFilters: ListingFilter[] = [];
  const rejectedTokens = [...draft.rejectedTokens];

  for (const candidate of draft.filters) {
    const nextFilter: ListingFilter = {
      field: candidate.field,
      op: candidate.op,
      ...(candidate.value !== undefined
        ? { value: candidate.value as ListingFilter["value"] }
        : {}),
    };

    const trialQuery: ListingQuery = {
      ...baseQuery,
      filters: [...baseQuery.filters, ...appliedFilters, nextFilter],
    };

    if (!validateCandidateFilter(trialQuery, nextFilter)) {
      rejectedTokens.push(candidate.token);
      continue;
    }

    appliedFilters.push(nextFilter);
  }

  const searchField = draft.searchQuery ? resolveSearchField(baseQuery) : null;
  let appliedSearchFilter: ListingFilter | null = null;
  if (draft.searchQuery && searchField) {
    const candidate: ListingFilter = {
      field: searchField,
      op: "contains",
      value: draft.searchQuery,
    };
    const trialQuery: ListingQuery = {
      ...baseQuery,
      filters: [...baseQuery.filters, ...appliedFilters, candidate],
    };
    if (validateCandidateFilter(trialQuery, candidate)) {
      appliedSearchFilter = candidate;
    } else {
      rejectedTokens.push(runtimeSearchToken);
    }
  } else if (draft.searchQuery) {
    rejectedTokens.push(runtimeSearchToken);
  }

  const candidateSort: ListingSort[] = draft.sort
    ? [{ field: draft.sort.field, dir: draft.sort.dir }]
    : [...baseQuery.sort];

  const hasValidSort = validateSort(baseQuery, candidateSort);
  const appliedSort = hasValidSort ? candidateSort : [...baseQuery.sort];

  if (draft.sort && !hasValidSort) {
    rejectedTokens.push(draft.sort.token);
  }

  const limit = baseQuery.pagination.limit;
  const nextOffset = draft.page
    ? Math.max(0, (draft.page - 1) * Math.max(1, Math.floor(limit)))
    : baseQuery.pagination.offset;

  const nextQuery: ListingQuery = {
    ...baseQuery,
    filters: [
      ...baseQuery.filters,
      ...appliedFilters,
      ...(appliedSearchFilter ? [appliedSearchFilter] : []),
    ],
    sort: appliedSort,
    pagination: {
      ...baseQuery.pagination,
      offset: nextOffset,
    },
  };

  try {
    buildListingExecutionPlan(nextQuery);
  } catch {
    return {
      query: baseQuery,
      appliedFilters: [],
      appliedSearchFilter: null,
      appliedSort: baseQuery.sort,
      page: null,
      searchQuery: null,
      rejectedTokens: Array.from(new Set(rejectedTokens.concat("__runtime_validation"))),
    };
  }

  return {
    query: nextQuery,
    appliedFilters,
    appliedSearchFilter,
    appliedSort,
    page: draft.page,
    searchQuery: draft.searchQuery,
    rejectedTokens: Array.from(new Set(rejectedTokens)),
  };
}

export function computeListingFacetMetrics(
  rows: Array<Record<string, unknown>>,
  facets: ListingFacetConfig[],
  draft: ListingRuntimeOverrideDraft
): ListingFacetMetric[] {
  const metrics: ListingFacetMetric[] = [];

  facets.forEach((facet) => {
    const token = resolveFacetToken(facet);
    if (!token) return;

    if (facet.kind === "sort") {
      const selected = draft.rawTokens[token]?.[0] ?? null;
      const options = (facet.sortOptions ?? []).map((option) => ({
        value: buildFacetSortToken(option.field, option.dir),
        label: option.label,
        count: rows.length,
        active:
          selected === option.value || selected === buildFacetSortToken(option.field, option.dir),
      }));
      metrics.push({
        id: facet.id,
        kind: facet.kind,
        label: facet.label,
        token,
        options,
        range: null,
      });
      return;
    }

    if (facet.kind === "range" || facet.kind === "date-range") {
      const values = rows
        .map((row) => (facet.field ? readListingRowField(row, facet.field) : undefined))
        .map((value) => toComparable(value))
        .filter((value): value is string | number => value !== null)
        .map((value) => (typeof value === "string" ? Number(value) : value))
        .filter((value): value is number => Number.isFinite(value));
      const min = values.length > 0 ? Math.min(...values) : null;
      const max = values.length > 0 ? Math.max(...values) : null;
      const activeRange = parseRangeValue(draft.rawTokens[token] ?? []);
      metrics.push({
        id: facet.id,
        kind: facet.kind,
        label: facet.label,
        token,
        options: [],
        range: {
          min,
          max,
          active: activeRange,
        },
      });
      return;
    }

    const selectedValues = new Set(
      (draft.rawTokens[token] ?? []).flatMap((entry) =>
        entry
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      )
    );
    const facetOptions = facet.options ?? [];
    const options = facetOptions.map((option) => {
      const count = rows.reduce((acc, row) => {
        const rowValue = facet.field ? readListingRowField(row, facet.field) : undefined;
        if (rowMatchesOption(rowValue, option.value)) {
          return acc + 1;
        }
        return acc;
      }, 0);
      return {
        value: option.value,
        label: option.label,
        count,
        active: selectedValues.has(option.value),
        ...(option.parentValue ? { parentValue: option.parentValue } : {}),
      };
    });

    metrics.push({
      id: facet.id,
      kind: facet.kind,
      label: facet.label,
      token,
      options,
      range: null,
    });
  });

  return metrics;
}

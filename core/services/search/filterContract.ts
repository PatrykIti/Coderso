export const LISTING_RUNTIME_QUERY_PREFIX = "lq";

const runtimeSortToken = "__sort";
const runtimePageToken = "__page";
const runtimeSearchToken = "__q";

export type ListingFilterOperator =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "exists";

export type ListingFacetKind =
  | "taxonomy"
  | "checkbox"
  | "radio"
  | "range"
  | "date-range"
  | "sort";

export type ListingFacetOption = {
  label: string;
  value: string;
};

export type ListingFacetSortOption = {
  label: string;
  value: string;
  field: string;
  dir: "asc" | "desc";
};

export type ListingFacetConfig = {
  id: string;
  kind: ListingFacetKind;
  label: string;
  field?: string;
  op?: ListingFilterOperator;
  options?: ListingFacetOption[];
  sortOptions?: ListingFacetSortOption[];
};

export type ListingFacetMetric = {
  id: string;
  kind: ListingFacetKind;
  label: string;
  token: string;
  options: Array<{
    value: string;
    label: string;
    count: number;
    active: boolean;
  }>;
  range:
    | {
        min: number | null;
        max: number | null;
        active: [string | number | boolean | null, string | number | boolean | null] | null;
      }
    | null;
};

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

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const tokenizeField = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const parseFacetKind = (value: string | null): ListingFacetKind => {
  if (
    value === "taxonomy" ||
    value === "checkbox" ||
    value === "radio" ||
    value === "range" ||
    value === "date-range" ||
    value === "sort"
  ) {
    return value;
  }
  return "checkbox";
};

const parseFacetOperator = (
  value: string | null,
  kind: ListingFacetKind
): ListingFilterOperator => {
  if (value && runtimeFilterOperators.has(value as ListingFilterOperator)) {
    return value as ListingFilterOperator;
  }
  if (kind === "radio") return "eq";
  if (kind === "range" || kind === "date-range") return "between";
  if (kind === "sort") return "exists";
  return "in";
};

export function buildListingRuntimeParamName(listingQueryId: string, token: string) {
  return `${LISTING_RUNTIME_QUERY_PREFIX}.${listingQueryId}.${token}`;
}

export function normalizeListingFacetConfigs(input: unknown): ListingFacetConfig[] {
  if (!Array.isArray(input)) return [];

  const result: ListingFacetConfig[] = [];
  const seen = new Set<string>();

  input.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const kind = parseFacetKind(normalizeText(record.kind));
    const rawId = normalizeText(record.id) ?? `facet-${index + 1}`;
    const id = tokenizeField(rawId) || `facet-${index + 1}`;
    if (seen.has(id)) return;
    seen.add(id);

    const label = normalizeText(record.label) ?? rawId;
    const field = normalizeText(record.field) ?? undefined;
    const op = parseFacetOperator(normalizeText(record.op), kind);

    if (kind !== "sort" && !field) return;

    const options = Array.isArray(record.options)
      ? record.options
          .map((option) => {
            if (!option || typeof option !== "object" || Array.isArray(option)) return null;
            const optionRecord = option as Record<string, unknown>;
            const value = normalizeText(optionRecord.value);
            if (!value) return null;
            return {
              value,
              label: normalizeText(optionRecord.label) ?? value,
            };
          })
          .filter((option): option is ListingFacetOption => Boolean(option))
      : [];

    const sortOptions = Array.isArray(record.sortOptions)
      ? record.sortOptions
          .map((option) => {
            if (!option || typeof option !== "object" || Array.isArray(option)) return null;
            const optionRecord = option as Record<string, unknown>;
            const value = normalizeText(optionRecord.value);
            const optionField = normalizeText(optionRecord.field);
            const optionDir = normalizeText(optionRecord.dir);
            if (!value || !optionField) return null;
            if (optionDir !== "asc" && optionDir !== "desc") return null;
            return {
              value,
              label: normalizeText(optionRecord.label) ?? value,
              field: optionField,
              dir: optionDir,
            } as ListingFacetSortOption;
          })
          .filter((option): option is ListingFacetSortOption => Boolean(option))
      : [];

    result.push({
      id,
      kind,
      label,
      ...(field ? { field } : {}),
      ...(kind !== "sort" ? { op } : {}),
      ...(options.length > 0 ? { options } : {}),
      ...(sortOptions.length > 0 ? { sortOptions } : {}),
    });
  });

  return result;
}

export function resolveFacetToken(facet: ListingFacetConfig) {
  if (facet.kind === "sort") return runtimeSortToken;
  const field = facet.field?.trim();
  if (!field) return "";
  const op = facet.op ?? parseFacetOperator(null, facet.kind);
  return `${field}.${op}`;
}

export function buildFacetSortToken(field: string, dir: "asc" | "desc") {
  return `${field}:${dir}`;
}

export const listingRuntimeTokens = {
  sort: runtimeSortToken,
  page: runtimePageToken,
  search: runtimeSearchToken,
};

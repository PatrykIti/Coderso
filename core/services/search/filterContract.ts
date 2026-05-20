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

export type ListingFacetKind = "taxonomy" | "checkbox" | "radio" | "range" | "date-range" | "sort";

export type ListingFacetOption = {
  label: string;
  value: string;
  parentValue?: string;
};

export type ListingFacetSortOption = {
  label: string;
  value: string;
  field: string;
  dir: "asc" | "desc";
};

export type ListingFacetControlMode = "inline" | "searchable";
export type ListingFacetRangeInputMode = "inputs" | "inputs-slider";
export type ListingFacetDateInputMode = "native-date" | "text-fallback";

export type ListingFacetPresentation = {
  controlMode?: ListingFacetControlMode;
  rangeStep?: number;
  rangeInputMode?: ListingFacetRangeInputMode;
  dateInputMode?: ListingFacetDateInputMode;
};

export type ListingFacetConfig = {
  id: string;
  kind: ListingFacetKind;
  label: string;
  field?: string;
  op?: ListingFilterOperator;
  options?: ListingFacetOption[];
  sortOptions?: ListingFacetSortOption[];
  presentation?: ListingFacetPresentation;
};

export type ListingFacetMetricOption = {
  value: string;
  label: string;
  count: number;
  active: boolean;
  parentValue?: string;
};

export type ListingFacetMetric = {
  id: string;
  kind: ListingFacetKind;
  label: string;
  token: string;
  options: ListingFacetMetricOption[];
  range: {
    min: number | null;
    max: number | null;
    active: [string | number | boolean | null, string | number | boolean | null] | null;
  } | null;
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

export const listingFilterOperatorsByKind: Record<ListingFacetKind, ListingFilterOperator[]> = {
  checkbox: ["in", "nin", "eq", "neq"],
  radio: ["eq", "neq"],
  taxonomy: ["in", "nin", "eq"],
  range: ["between", "gt", "gte", "lt", "lte"],
  "date-range": ["between", "gt", "gte", "lt", "lte"],
  sort: [],
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const tokenizeListingFacetId = (value: string) =>
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

export const getListingFacetDefaultOperator = (kind: ListingFacetKind): ListingFilterOperator => {
  if (kind === "radio") return "eq";
  if (kind === "range" || kind === "date-range") return "between";
  if (kind === "sort") return "exists";
  return "in";
};

export const getAllowedListingFilterOperators = (kind: ListingFacetKind) => [
  ...(listingFilterOperatorsByKind[kind] ?? []),
];

const parseFacetControlMode = (
  value: string | null,
  kind: ListingFacetKind
): ListingFacetControlMode | undefined => {
  if (kind !== "checkbox" && kind !== "taxonomy") return undefined;
  if (value === "inline" || value === "searchable") {
    return value;
  }
  return undefined;
};

const parseFacetRangeInputMode = (value: string | null): ListingFacetRangeInputMode | undefined => {
  if (value === "inputs" || value === "inputs-slider") {
    return value;
  }
  return undefined;
};

const parseFacetDateInputMode = (value: string | null): ListingFacetDateInputMode | undefined => {
  if (value === "native-date" || value === "text-fallback") {
    return value;
  }
  return undefined;
};

const parseFacetRangeStep = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return Math.min(100000, Math.max(0.01, numeric));
};

const normalizeFacetPresentation = (
  value: unknown,
  kind: ListingFacetKind
): ListingFacetPresentation | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const presentation: ListingFacetPresentation = {};

  const controlMode = parseFacetControlMode(normalizeText(record.controlMode), kind);
  if (controlMode) {
    presentation.controlMode = controlMode;
  }

  if (kind === "range") {
    const rangeInputMode = parseFacetRangeInputMode(normalizeText(record.rangeInputMode));
    if (rangeInputMode) {
      presentation.rangeInputMode = rangeInputMode;
    }
    const rangeStep = parseFacetRangeStep(record.rangeStep);
    if (rangeStep !== undefined) {
      presentation.rangeStep = rangeStep;
    }
  }

  if (kind === "date-range") {
    const dateInputMode = parseFacetDateInputMode(normalizeText(record.dateInputMode));
    if (dateInputMode) {
      presentation.dateInputMode = dateInputMode;
    }
  }

  return Object.keys(presentation).length > 0 ? presentation : undefined;
};

const parseFacetOperator = (
  value: string | null,
  kind: ListingFacetKind
): ListingFilterOperator => {
  if (value && runtimeFilterOperators.has(value as ListingFilterOperator)) {
    return value as ListingFilterOperator;
  }
  return getListingFacetDefaultOperator(kind);
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
    const id = tokenizeListingFacetId(rawId) || `facet-${index + 1}`;
    const label = normalizeText(record.label) ?? rawId;
    const field = normalizeText(record.field) ?? undefined;
    const op = parseFacetOperator(normalizeText(record.op), kind);

    if (kind !== "sort" && !field) return;
    if (seen.has(id)) return;
    seen.add(id);

    const presentation = normalizeFacetPresentation(record.presentation, kind);

    const options = Array.isArray(record.options)
      ? record.options
          .map((option) => {
            if (!option || typeof option !== "object" || Array.isArray(option)) return null;
            const optionRecord = option as Record<string, unknown>;
            const value = normalizeText(optionRecord.value);
            if (!value) return null;
            const parentValue =
              kind === "taxonomy" ? normalizeText(optionRecord.parentValue) : undefined;
            return {
              value,
              label: normalizeText(optionRecord.label) ?? value,
              ...(parentValue && parentValue !== value ? { parentValue } : {}),
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
      ...(presentation ? { presentation } : {}),
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

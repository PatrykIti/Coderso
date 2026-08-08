import {
  normalizeListingFacetConfigs,
  normalizeListingRuntimeAliases,
  type ListingFacetConfig,
  type ListingFacetMetric,
  type ListingRuntimeAliasMap,
} from "../../services/search/filterContract";
import { compactObject, resolveClearableStyleValue } from "./clearableStyle";

export type ListingFiltersVariantId = "default" | "horizontal" | "sidebar" | "drawer";

/**
 * Present-only visitor copy for runtime states that used to be fixed English
 * strings. Omitting the object preserves the legacy markup byte-for-byte.
 */
export type ListingFiltersCopy = {
  configurationAriaLabel?: string;
  configurationHint?: string;
  activeFilterSingular?: string;
  activeFilterPlural?: string;
  activeRangeFromLabel?: string;
  activeRangeUpToLabel?: string;
  activeSearchLabel?: string;
  clearAllLabel?: string;
  autoApplyLabel?: string;
  loadingLabel?: string;
  errorLabel?: string;
  rejectedLabel?: string;
  drawerLabel?: string;
  emptyOptionsLabel?: string;
  optionSearchTemplate?: string;
  defaultOrderLabel?: string;
  dateFromLabel?: string;
  dateToLabel?: string;
  rangeMinLabel?: string;
  rangeMaxLabel?: string;
  rangeMinSliderLabel?: string;
  rangeMaxSliderLabel?: string;
};

export type ListingFiltersData = {
  listingQueryId?: string;
  title?: string;
  description?: string;
  autoApply?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchLabel?: string;
  applyLabel?: string;
  copy?: ListingFiltersCopy;
  facets?: ListingFacetConfig[];
  aliases?: ListingRuntimeAliasMap;
  layout?: {
    maxWidth?: "narrow" | "content" | "wide" | "full";
    stickySidebar?: boolean;
    collapsibleFacets?: boolean;
    defaultCollapsed?: boolean;
  };
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
    actionBackground?: string;
  };
  resolved?: {
    listingQueryId?: string;
    metrics?: ListingFacetMetric[];
    searchQuery?: string;
    rejectedTokens?: string[];
    error?: string;
  };
};

const resolveText = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveOptionalText = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const LISTING_FILTERS_COPY_MAX_LENGTH = 240;
export const listingFiltersCopyKeys = [
  "configurationAriaLabel",
  "configurationHint",
  "activeFilterSingular",
  "activeFilterPlural",
  "activeRangeFromLabel",
  "activeRangeUpToLabel",
  "activeSearchLabel",
  "clearAllLabel",
  "autoApplyLabel",
  "loadingLabel",
  "errorLabel",
  "rejectedLabel",
  "drawerLabel",
  "emptyOptionsLabel",
  "optionSearchTemplate",
  "defaultOrderLabel",
  "dateFromLabel",
  "dateToLabel",
  "rangeMinLabel",
  "rangeMaxLabel",
  "rangeMinSliderLabel",
  "rangeMaxSliderLabel",
] as const satisfies readonly (keyof ListingFiltersCopy)[];

export const normalizeListingFiltersCopy = (
  value: ListingFiltersCopy | null | undefined
): ListingFiltersCopy | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const normalized: ListingFiltersCopy = {};
  for (const key of listingFiltersCopyKeys) {
    const text = resolveOptionalText(value[key]);
    if (text) normalized[key] = text.slice(0, LISTING_FILTERS_COPY_MAX_LENGTH);
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const sanitizeMetricOptions = (
  options: ListingFacetMetric["options"] | undefined
): ListingFacetMetric["options"] =>
  Array.isArray(options)
    ? options
        .map((option) => {
          const value = resolveOptionalText(option?.value);
          if (!value) return null;
          return {
            value,
            label: resolveText(option?.label, value),
            count:
              typeof option?.count === "number" && Number.isFinite(option.count) ? option.count : 0,
            active: option?.active === true,
            ...(resolveOptionalText(option?.parentValue)
              ? { parentValue: resolveOptionalText(option?.parentValue) }
              : {}),
          };
        })
        .filter((option): option is ListingFacetMetric["options"][number] => option !== null)
    : [];

const sanitizeMetricRange = (range: ListingFacetMetric["range"]) => {
  if (!range) return null;
  const min = typeof range.min === "number" && Number.isFinite(range.min) ? range.min : null;
  const max = typeof range.max === "number" && Number.isFinite(range.max) ? range.max : null;
  const active = Array.isArray(range.active) && range.active.length === 2 ? range.active : null;
  return { min, max, active };
};

const sanitizeMetric = (metric: ListingFacetMetric | undefined): ListingFacetMetric | null => {
  if (!metric) return null;
  const id = resolveOptionalText(metric.id);
  const label = resolveOptionalText(metric.label);
  const token = resolveOptionalText(metric.token);
  if (!id || !label || !token) return null;
  return {
    id,
    kind: metric.kind,
    label,
    token,
    options: sanitizeMetricOptions(metric.options),
    range: sanitizeMetricRange(metric.range),
  };
};

const defaultSortFacet: ListingFacetConfig = {
  id: "sort",
  kind: "sort",
  label: "Sort",
  sortOptions: [
    {
      value: "updatedAt:desc",
      label: "Newest first",
      field: "updatedAt",
      dir: "desc",
    },
    {
      value: "updatedAt:asc",
      label: "Oldest first",
      field: "updatedAt",
      dir: "asc",
    },
  ],
};

export const listingFiltersDefaults: ListingFiltersData = {
  listingQueryId: "",
  title: "Filter results",
  description: "Narrow down listing results with reusable facets.",
  autoApply: true,
  showSearch: true,
  searchPlaceholder: "Search results...",
  searchLabel: "Search",
  applyLabel: "Apply filters",
  facets: [defaultSortFacet],
  layout: {
    maxWidth: "wide",
    stickySidebar: false,
    collapsibleFacets: false,
    defaultCollapsed: false,
  },
  style: {
    frameBackground: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    frameBorderColor: "var(--color-border)",
    actionBackground: "var(--color-primary)",
  },
};

export const listingFiltersSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    listingQueryId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    autoApply: { type: "boolean" },
    showSearch: { type: "boolean" },
    searchPlaceholder: { type: "string" },
    searchLabel: { type: "string" },
    applyLabel: { type: "string" },
    copy: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        listingFiltersCopyKeys.map((key) => [
          key,
          { type: "string", maxLength: LISTING_FILTERS_COPY_MAX_LENGTH },
        ])
      ),
    },
    aliases: {
      type: "object",
      maxProperties: 24,
      additionalProperties: { type: "string" },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxWidth: { enum: ["narrow", "content", "wide", "full"] },
        stickySidebar: { type: "boolean" },
        collapsibleFacets: { type: "boolean" },
        defaultCollapsed: { type: "boolean" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        frameBackground: { type: "string" },
        frameBorderColor: { type: "string" },
        actionBackground: { type: "string" },
      },
    },
    facets: {
      type: "array",
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          kind: {
            enum: ["taxonomy", "checkbox", "radio", "range", "date-range", "sort"],
          },
          label: { type: "string" },
          field: { type: "string" },
          op: {
            enum: [
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
            ],
          },
          options: {
            type: "array",
            maxItems: 120,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                parentValue: { type: "string" },
              },
            },
          },
          presentation: {
            type: "object",
            additionalProperties: false,
            properties: {
              controlMode: {
                enum: ["inline", "searchable"],
              },
              rangeStep: { type: "number" },
              rangeInputMode: {
                enum: ["inputs", "inputs-slider"],
              },
              dateInputMode: {
                enum: ["native-date", "text-fallback"],
              },
            },
          },
          sortOptions: {
            type: "array",
            maxItems: 20,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                field: { type: "string" },
                dir: { enum: ["asc", "desc"] },
              },
            },
          },
        },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        listingQueryId: { type: "string" },
        metrics: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              kind: {
                enum: ["taxonomy", "checkbox", "radio", "range", "date-range", "sort"],
              },
              label: { type: "string" },
              token: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    value: { type: "string" },
                    label: { type: "string" },
                    count: { type: "number" },
                    active: { type: "boolean" },
                    parentValue: { type: "string" },
                  },
                },
              },
              range: {
                anyOf: [
                  { type: "null" },
                  {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      min: {
                        anyOf: [{ type: "null" }, { type: "number" }],
                      },
                      max: {
                        anyOf: [{ type: "null" }, { type: "number" }],
                      },
                      active: {
                        anyOf: [
                          { type: "null" },
                          {
                            type: "array",
                            minItems: 2,
                            maxItems: 2,
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        searchQuery: { type: "string" },
        rejectedTokens: {
          type: "array",
          items: { type: "string" },
        },
        error: { type: "string" },
      },
    },
  },
} as const;

export function normalizeListingFiltersData(data: ListingFiltersData): ListingFiltersData {
  const defaultValues = listingFiltersDefaults;
  const fallbackFacets = normalizeListingFacetConfigs(defaultValues.facets);
  const facets = normalizeListingFacetConfigs(data.facets);
  const hasStyleObject = data.style !== undefined;
  const copy = normalizeListingFiltersCopy(data.copy);
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(data.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
        actionBackground: resolveClearableStyleValue(data.style?.actionBackground),
      }) ?? {})
    : undefined;

  return {
    listingQueryId: resolveText(data.listingQueryId, ""),
    title: resolveText(data.title, defaultValues.title ?? "Filter results"),
    description: resolveText(
      data.description,
      defaultValues.description ?? "Narrow down listing results with reusable facets."
    ),
    autoApply:
      typeof data.autoApply === "boolean" ? data.autoApply : defaultValues.autoApply !== false,
    showSearch:
      typeof data.showSearch === "boolean" ? data.showSearch : defaultValues.showSearch !== false,
    searchPlaceholder: resolveText(
      data.searchPlaceholder,
      defaultValues.searchPlaceholder ?? "Search results..."
    ),
    searchLabel: resolveText(data.searchLabel, defaultValues.searchLabel ?? "Search"),
    applyLabel: resolveText(data.applyLabel, defaultValues.applyLabel ?? "Apply filters"),
    ...(copy ? { copy } : {}),
    facets: facets.length > 0 ? facets : fallbackFacets,
    aliases: normalizeListingRuntimeAliases(data.aliases),
    layout: {
      maxWidth:
        data.layout?.maxWidth === "narrow" ||
        data.layout?.maxWidth === "content" ||
        data.layout?.maxWidth === "wide" ||
        data.layout?.maxWidth === "full"
          ? data.layout.maxWidth
          : (defaultValues.layout?.maxWidth ?? "wide"),
      stickySidebar:
        typeof data.layout?.stickySidebar === "boolean"
          ? data.layout.stickySidebar
          : (defaultValues.layout?.stickySidebar ?? false),
      collapsibleFacets:
        typeof data.layout?.collapsibleFacets === "boolean"
          ? data.layout.collapsibleFacets
          : (defaultValues.layout?.collapsibleFacets ?? false),
      defaultCollapsed:
        typeof data.layout?.defaultCollapsed === "boolean"
          ? data.layout.defaultCollapsed
          : (defaultValues.layout?.defaultCollapsed ?? false),
    },
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      listingQueryId: resolveText(data.resolved?.listingQueryId, ""),
      metrics: Array.isArray(data.resolved?.metrics)
        ? data.resolved.metrics
            .map((metric) => sanitizeMetric(metric))
            .filter((metric): metric is ListingFacetMetric => metric !== null)
        : [],
      searchQuery: resolveOptionalText(data.resolved?.searchQuery),
      rejectedTokens: Array.isArray(data.resolved?.rejectedTokens)
        ? data.resolved.rejectedTokens
            .filter((token): token is string => typeof token === "string")
            .map((token) => token.trim())
            .filter(Boolean)
        : [],
      error: resolveOptionalText(data.resolved?.error),
    },
  };
}

import type { ComponentType, CSSProperties, ReactElement } from "react";

import {
  buildListingRuntimeParamName,
  listingRuntimeTokens,
  normalizeListingFacetConfigs,
  resolveFacetToken,
  type ListingFacetConfig,
  type ListingFacetMetric,
  type ListingFacetMetricOption,
} from "../../services/search/filterContract";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { getListingRuntimeClientScript } from "./listingRuntimeScript";

export type ListingFiltersVariantId = "default" | "horizontal" | "sidebar" | "drawer";

export type ListingFiltersData = {
  listingQueryId?: string;
  title?: string;
  description?: string;
  autoApply?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchLabel?: string;
  applyLabel?: string;
  facets?: ListingFacetConfig[];
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

export const listingFiltersEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "listing-filters.wizard.query-source",
      title: "Listing query source",
      role: "source",
      writablePaths: ["listingQueryId"],
    },
    {
      mode: "wizard",
      id: "listing-filters.wizard.facet-setup",
      title: "Facet setup",
      role: "setup",
      writablePaths: [
        "facets.kind",
        "facets.field",
        "facets.op",
        "facets.sortOptions.field",
        "facets.sortOptions.dir",
      ],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.variant-layout",
      title: "Variant and layout",
      role: "layout",
      writablePaths: [
        "variant",
        "layout.maxWidth",
        "layout.collapsibleFacets",
        "layout.defaultCollapsed",
        "layout.stickySidebar",
      ],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.copy-behavior",
      title: "Filter copy and behavior",
      role: "content",
      writablePaths: [
        "title",
        "description",
        "searchLabel",
        "searchPlaceholder",
        "applyLabel",
        "showSearch",
        "autoApply",
      ],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.surface",
      title: "Filter surface",
      role: "visual",
      writablePaths: ["style.frameBackground", "style.frameBorderColor", "style.actionBackground"],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.facet-presentation",
      title: "Facet presentation",
      role: "content",
      writablePaths: [
        "facets.order",
        "facets.label",
        "facets.options.label",
        "facets.sortOptions.label",
        "facets.presentation.controlMode",
        "facets.presentation.rangeInputMode",
        "facets.presentation.rangeStep",
        "facets.presentation.dateInputMode",
      ],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.source-summary",
      title: "Source and facets summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "listingQueryId",
        "facets",
        "facets.id",
        "facets.kind",
        "facets.field",
        "facets.op",
      ],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.runtime-diagnostics",
      title: "Runtime diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "resolved.listingQueryId",
        "resolved.searchQuery",
        "resolved.rejectedTokens",
        "resolved.error",
      ],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.runtime-status",
      title: "Runtime status",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["resolved.metrics"],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
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

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const listingFiltersMaxWidthClassMap = {
  narrow: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-none",
} as const;

const resolveListingFiltersVariant = (value: string): ListingFiltersVariantId => {
  if (value === "horizontal" || value === "sidebar" || value === "drawer") {
    return value;
  }
  return "default";
};

export function normalizeListingFiltersData(data: ListingFiltersData): ListingFiltersData {
  const defaultValues = listingFiltersDefaults;
  const fallbackFacets = normalizeListingFacetConfigs(defaultValues.facets);
  const facets = normalizeListingFacetConfigs(data.facets);
  const hasStyleObject = data.style !== undefined;
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
    facets: facets.length > 0 ? facets : fallbackFacets,
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

const resolveFacetControlMode = (facet: ListingFacetConfig) =>
  facet.presentation?.controlMode ?? "inline";

const resolveFacetRangeInputMode = (facet: ListingFacetConfig) =>
  facet.presentation?.rangeInputMode ?? "inputs-slider";

const resolveFacetDateInputMode = (facet: ListingFacetConfig) =>
  facet.presentation?.dateInputMode ?? "native-date";

const resolveFacetRangeStep = (facet: ListingFacetConfig) => facet.presentation?.rangeStep ?? 1;

const toCompositeBoundaryValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();

const buildCompositeRangeToken = (start: unknown, end: unknown) => {
  const left = toCompositeBoundaryValue(start);
  const right = toCompositeBoundaryValue(end);
  return left || right ? `${left},${right}` : "";
};

const formatActiveRangeLabel = (
  active: [string | number | boolean | null, string | number | boolean | null] | null
) => {
  if (!active) return "";
  const start = toCompositeBoundaryValue(active[0]);
  const end = toCompositeBoundaryValue(active[1]);
  if (start && end) return `${start} - ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Up to ${end}`;
  return "";
};

const buildActiveFilterItems = (metrics: ListingFacetMetric[], searchQuery: string) => {
  const items: Array<{ token: string; label: string; value: string }> = [];
  if (searchQuery.trim().length > 0) {
    items.push({
      token: listingRuntimeTokens.search,
      label: "Search",
      value: searchQuery.trim(),
    });
  }
  metrics.forEach((metric) => {
    if (metric.kind === "sort") return;
    metric.options
      .filter((option) => option.active)
      .forEach((option) => {
        items.push({
          token: metric.token,
          label: metric.label,
          value: option.label,
        });
      });
    const rangeValue = formatActiveRangeLabel(metric.range?.active ?? null);
    if (rangeValue) {
      items.push({
        token: metric.token,
        label: metric.label,
        value: rangeValue,
      });
    }
  });
  return items;
};

const flattenTaxonomyOptions = (options: ListingFacetMetricOption[]) => {
  const existingValues = new Set(options.map((option) => option.value));
  const childrenByParent = new Map<string, ListingFacetMetricOption[]>();
  const roots: ListingFacetMetricOption[] = [];

  options.forEach((option) => {
    const parentValue = option.parentValue?.trim();
    if (!parentValue || parentValue === option.value || !existingValues.has(parentValue)) {
      roots.push(option);
      return;
    }
    const current = childrenByParent.get(parentValue) ?? [];
    current.push(option);
    childrenByParent.set(parentValue, current);
  });

  const result: Array<{ option: ListingFacetMetricOption; depth: number }> = [];
  const visited = new Set<string>();

  const visit = (option: ListingFacetMetricOption, depth: number) => {
    if (visited.has(option.value)) return;
    visited.add(option.value);
    result.push({ option, depth });
    (childrenByParent.get(option.value) ?? []).forEach((child) => visit(child, depth + 1));
  };

  roots.forEach((option) => visit(option, 0));
  options.forEach((option) => {
    if (!visited.has(option.value)) {
      visit(option, 0);
    }
  });

  return result;
};

const buildFallbackMetric = (facet: ListingFacetConfig): ListingFacetMetric => ({
  id: facet.id,
  kind: facet.kind,
  label: facet.label,
  token: resolveFacetToken(facet),
  options:
    facet.kind === "sort"
      ? (facet.sortOptions ?? []).map((option) => ({
          value: `${option.field}:${option.dir}`,
          label: option.label,
          count: 0,
          active: false,
        }))
      : (facet.options ?? []).map((option) => ({
          value: option.value,
          label: option.label,
          count: 0,
          active: false,
          ...(option.parentValue ? { parentValue: option.parentValue } : {}),
        })),
  range:
    facet.kind === "range" || facet.kind === "date-range"
      ? {
          min: null,
          max: null,
          active: null,
        }
      : null,
});

function ListingFacetControl({
  facet,
  listingQueryId,
  metric,
  hasResolvedMetric,
  collapsible,
  defaultCollapsed,
}: {
  facet: ListingFacetConfig;
  listingQueryId: string;
  metric: ListingFacetMetric;
  hasResolvedMetric: boolean;
  collapsible: boolean;
  defaultCollapsed: boolean;
}) {
  const inputName = buildListingRuntimeParamName(listingQueryId, metric.token);
  const controlMode = resolveFacetControlMode(facet);
  const resolvedOptions =
    metric.kind === "taxonomy" ? flattenTaxonomyOptions(metric.options) : metric.options;

  const renderShell = (content: ReactElement) => {
    if (!collapsible) return content;
    return (
      <details
        className="rounded-lg border border-[var(--color-border)]/60 p-3"
        open={!defaultCollapsed}
      >
        <summary className="cursor-pointer list-none text-sm font-medium">{metric.label}</summary>
        <div className="pt-3">{content}</div>
      </details>
    );
  };

  if (metric.kind === "sort") {
    const active = metric.options.find((option) => option.active)?.value ?? "";
    return renderShell(
      <label className="grid gap-2 text-sm">
        {!collapsible ? <span className="font-medium">{metric.label}</span> : null}
        <select
          className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
          name={inputName}
          data-listing-token={metric.token}
          defaultValue={active}
        >
          <option value="">Default order</option>
          {metric.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (metric.kind === "range" || metric.kind === "date-range") {
    const activeStart = toCompositeBoundaryValue(metric.range?.active?.[0]);
    const activeEnd = toCompositeBoundaryValue(metric.range?.active?.[1]);
    const hiddenValue = buildCompositeRangeToken(activeStart, activeEnd);

    if (metric.kind === "date-range" && resolveFacetDateInputMode(facet) === "native-date") {
      return renderShell(
        <fieldset
          className="grid gap-2 text-sm"
          data-listing-composite-control="1"
          data-listing-composite-kind="date-range"
        >
          {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
          <input
            type="hidden"
            name={inputName}
            data-listing-token={metric.token}
            defaultValue={hiddenValue}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-[var(--color-text)]/65">From</span>
              <input
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                type="date"
                defaultValue={activeStart}
                data-listing-date-part="start"
                data-listing-auto-submit="1"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-[var(--color-text)]/65">To</span>
              <input
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                type="date"
                defaultValue={activeEnd}
                data-listing-date-part="end"
                data-listing-auto-submit="1"
              />
            </label>
          </div>
        </fieldset>
      );
    }

    if (metric.kind === "date-range") {
      return renderShell(
        <label className="grid gap-2 text-sm">
          {!collapsible ? <span className="font-medium">{metric.label}</span> : null}
          <input
            className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
            name={inputName}
            data-listing-token={metric.token}
            defaultValue={hiddenValue}
            placeholder="YYYY-MM-DD,YYYY-MM-DD"
          />
        </label>
      );
    }

    const rangeMode = resolveFacetRangeInputMode(facet);
    const rangeStep = String(resolveFacetRangeStep(facet));
    const sliderMin =
      metric.range?.min !== null && metric.range?.min !== undefined
        ? String(metric.range.min)
        : "0";
    const sliderMax =
      metric.range?.max !== null && metric.range?.max !== undefined
        ? String(metric.range.max)
        : "100";

    return renderShell(
      <fieldset
        className="grid gap-2 text-sm"
        data-listing-composite-control="1"
        data-listing-composite-kind="range"
      >
        {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
        <input
          type="hidden"
          name={inputName}
          data-listing-token={metric.token}
          defaultValue={hiddenValue}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-[var(--color-text)]/65">Min</span>
            <input
              className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              type="number"
              inputMode="decimal"
              defaultValue={activeStart}
              min={sliderMin}
              max={sliderMax}
              step={rangeStep}
              data-listing-range-part="min"
              data-listing-auto-submit="1"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-[var(--color-text)]/65">Max</span>
            <input
              className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              type="number"
              inputMode="decimal"
              defaultValue={activeEnd}
              min={sliderMin}
              max={sliderMax}
              step={rangeStep}
              data-listing-range-part="max"
              data-listing-auto-submit="1"
            />
          </label>
        </div>
        {rangeMode === "inputs-slider" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-[var(--color-text)]/65">Min slider</span>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={rangeStep}
                defaultValue={activeStart || sliderMin}
                data-listing-range-slider="min"
                data-listing-auto-submit="1"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-[var(--color-text)]/65">Max slider</span>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={rangeStep}
                defaultValue={activeEnd || sliderMax}
                data-listing-range-slider="max"
                data-listing-auto-submit="1"
              />
            </label>
          </div>
        ) : null}
      </fieldset>
    );
  }

  if (metric.kind === "radio") {
    return renderShell(
      <fieldset className="space-y-2 text-sm">
        {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
        <div className="grid gap-1.5">
          {metric.options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name={inputName}
                value={option.value}
                defaultChecked={option.active}
                data-listing-token={metric.token}
              />
              <span>{option.label}</span>
              {hasResolvedMetric ? (
                <span className="ml-auto text-xs text-[var(--color-text)]/60">{option.count}</span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const optionContent = (
    <div className="grid gap-1.5">
      {resolvedOptions.map((entry) => {
        const option = "option" in entry ? entry.option : entry;
        const depth = "depth" in entry ? entry.depth : 0;
        return (
          <label
            key={option.value}
            className="flex items-center gap-2"
            style={depth > 0 ? { paddingInlineStart: `${depth * 16}px` } : undefined}
            data-listing-searchable-option={controlMode === "searchable" ? "1" : undefined}
            data-listing-option-label={
              controlMode === "searchable" ? option.label.toLowerCase() : undefined
            }
          >
            <input
              type="checkbox"
              name={inputName}
              value={option.value}
              defaultChecked={option.active}
              data-listing-token={metric.token}
            />
            <span>{option.label}</span>
            {hasResolvedMetric ? (
              <span className="ml-auto text-xs text-[var(--color-text)]/60">{option.count}</span>
            ) : null}
          </label>
        );
      })}
    </div>
  );

  if (controlMode === "searchable") {
    return renderShell(
      <fieldset className="space-y-2 text-sm" data-listing-searchable-options="1">
        {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
        <input
          className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
          type="search"
          placeholder={`Search ${metric.label.toLowerCase()} options`}
          data-listing-option-search="1"
        />
        {optionContent}
      </fieldset>
    );
  }

  return renderShell(
    <fieldset className="space-y-2 text-sm">
      {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
      {optionContent}
    </fieldset>
  );
}

export function ListingFiltersBlock({
  data,
  variant,
  blockId,
}: {
  data: ListingFiltersData;
  variant: string;
  blockId?: string;
}) {
  const normalized = normalizeListingFiltersData(data);
  const resolvedVariant = resolveListingFiltersVariant(variant);
  const listingQueryId =
    resolveOptionalText(normalized.resolved?.listingQueryId) ??
    resolveOptionalText(normalized.listingQueryId);
  const facets = normalized.facets ?? [];
  const resolvedMetrics = normalized.resolved?.metrics ?? [];

  const metrics = facets.map((facet) => {
    const hit = resolvedMetrics.find((entry) => entry.id === facet.id);
    return {
      facet,
      metric: hit ?? buildFallbackMetric(facet),
      hasResolvedMetric: Boolean(hit),
    };
  });

  const title = resolveText(normalized.title, "Filter results");
  const description = resolveOptionalText(normalized.description);
  const showSearch = normalized.showSearch !== false;
  const autoApply = normalized.autoApply !== false;
  const searchValue = resolveOptionalText(normalized.resolved?.searchQuery) ?? "";
  const activeItems = buildActiveFilterItems(
    metrics.map((entry) => entry.metric),
    searchValue
  );
  const layout = normalized.layout ?? listingFiltersDefaults.layout!;
  const maxWidthClass = listingFiltersMaxWidthClassMap[layout.maxWidth ?? "wide"];
  const collapsibleFacets = layout.collapsibleFacets === true;
  const defaultCollapsed = layout.defaultCollapsed === true;
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.frameBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.frameBorderColor),
  });
  const actionStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.actionBackground),
  });
  const legacyFrameClass =
    normalized.style === undefined ? "border-[var(--color-border)] bg-[var(--color-bg)]/80" : "";
  const legacyActionClass = normalized.style === undefined ? "bg-[var(--color-primary)]" : "";

  if (!listingQueryId) {
    return (
      <section
        className={joinClasses(
          "mx-auto w-full rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6",
          maxWidthClass
        )}
        data-listing-widget="listing-filters"
        data-listing-variant={resolvedVariant}
        data-listing-block-id={blockId ?? ""}
        data-listing-query-id=""
      >
        <p className="text-sm text-[var(--color-text)]/75">
          Select a listing query in widget settings to enable runtime filters.
        </p>
      </section>
    );
  }

  const controlsGridClass =
    resolvedVariant === "horizontal"
      ? "grid gap-4 lg:grid-cols-3"
      : metrics.length > 1
        ? "grid gap-4 md:grid-cols-2"
        : "grid gap-4";
  const shellClass = joinClasses(
    "mx-auto w-full px-4 py-6",
    maxWidthClass,
    resolvedVariant === "sidebar" ? "md:mr-auto" : undefined
  );
  const frameClass = joinClasses(
    "rounded-xl border p-4",
    legacyFrameClass,
    resolvedVariant === "sidebar" ? "md:max-w-md" : undefined,
    resolvedVariant === "sidebar" && layout.stickySidebar ? "md:sticky md:top-6" : undefined
  );

  const formBody = (
    <form
      method="get"
      action=""
      className="space-y-4"
      data-listing-runtime-form
      data-listing-query-id={listingQueryId}
      data-listing-auto-apply={autoApply ? "1" : "0"}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]/75">
          {title}
        </p>
        {description ? <p className="text-sm text-[var(--color-text)]/70">{description}</p> : null}
      </div>

      {showSearch ? (
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{resolveText(normalized.searchLabel, "Search")}</span>
          <input
            className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
            name={buildListingRuntimeParamName(listingQueryId, listingRuntimeTokens.search)}
            data-listing-token={listingRuntimeTokens.search}
            defaultValue={searchValue}
            placeholder={resolveText(normalized.searchPlaceholder, "Search results...")}
          />
        </label>
      ) : null}

      {activeItems.length > 0 ? (
        <div className="space-y-2 rounded-md border border-[var(--color-border)]/70 bg-[var(--color-bg)]/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {activeItems.length} active {activeItems.length === 1 ? "filter" : "filters"}
            </p>
            <button
              type="button"
              className="text-xs font-medium underline-offset-4 hover:underline"
              data-listing-clear-all="1"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeItems.map((item, index) => (
              <span
                key={`${item.token}:${item.value}:${index}`}
                className="rounded-full border border-[var(--color-border)]/70 px-2 py-1 text-xs"
              >
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className={controlsGridClass}>
        {metrics.map(({ facet, metric, hasResolvedMetric }) => (
          <ListingFacetControl
            key={metric.id}
            facet={facet}
            listingQueryId={listingQueryId}
            metric={metric}
            hasResolvedMetric={hasResolvedMetric}
            collapsible={collapsibleFacets}
            defaultCollapsed={defaultCollapsed}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {autoApply ? (
          <span className="text-xs text-[var(--color-text)]/60">
            Updates automatically when values change.
          </span>
        ) : (
          <button
            type="submit"
            className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-[var(--color-bg)] ${legacyActionClass}`}
            style={actionStyle}
          >
            {resolveText(normalized.applyLabel, "Apply filters")}
          </button>
        )}
      </div>

      <div className="space-y-1" data-listing-runtime-status="1">
        <p className="text-xs text-[var(--color-text)]/60" hidden data-listing-runtime-loading="1">
          Updating linked results...
        </p>
        <p className="text-xs text-destructive" hidden data-listing-runtime-error="1">
          Could not refresh linked results. Try again.
        </p>
      </div>

      {normalized.resolved?.error ? (
        <p className="text-xs text-destructive">{normalized.resolved.error}</p>
      ) : null}
      {!normalized.resolved?.error &&
      Array.isArray(normalized.resolved?.rejectedTokens) &&
      normalized.resolved.rejectedTokens.length > 0 ? (
        <p className="text-xs text-[var(--color-text)]/60">Ignored invalid filter parameters.</p>
      ) : null}
    </form>
  );

  const renderedFrame =
    resolvedVariant === "drawer" ? (
      <details className={frameClass} open={!defaultCollapsed} style={frameStyle}>
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]/75">
          Filters panel
        </summary>
        <div className="pt-4">{formBody}</div>
      </details>
    ) : (
      <div className={frameClass} style={frameStyle}>
        {formBody}
      </div>
    );

  return (
    <section
      className={shellClass}
      data-listing-widget="listing-filters"
      data-listing-variant={resolvedVariant}
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id={listingQueryId}
    >
      {renderedFrame}
      <script dangerouslySetInnerHTML={{ __html: getListingRuntimeClientScript() }} />
    </section>
  );
}

export function createListingFiltersWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ListingFiltersData>>;
  visual: ComponentType<WidgetEditorProps<ListingFiltersData>>;
  advanced: ComponentType<WidgetEditorProps<ListingFiltersData>>;
}): WidgetDefinition<ListingFiltersData> {
  return {
    type: "listing-filters",
    title: "Listing Filters",
    description: "Faceted runtime filters for listing query widgets.",
    category: "content",
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Facet controls bound to URL-synced listing runtime state.",
      },
      {
        id: "horizontal",
        label: "Horizontal",
        description: "A compact filter bar for above-list placement.",
      },
      {
        id: "sidebar",
        label: "Sidebar",
        description: "A narrow aside intended for side-column placement.",
      },
      {
        id: "drawer",
        label: "Drawer",
        description: "A collapsible panel suited to mobile-heavy filter layouts.",
      },
    ],
    schema: listingFiltersSchema,
    defaults: listingFiltersDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    editorContract: listingFiltersEditorContract,
    render: ListingFiltersBlock,
  };
}

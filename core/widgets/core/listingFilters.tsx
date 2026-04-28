import type { ComponentType } from "react";

import {
  buildListingRuntimeParamName,
  listingRuntimeTokens,
  normalizeListingFacetConfigs,
  resolveFacetToken,
  type ListingFacetConfig,
  type ListingFacetMetric,
} from "../../services/search/filterContract";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getListingRuntimeClientScript } from "./listingRuntimeScript";

export type ListingFiltersVariantId = "default";

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
              typeof option?.count === "number" && Number.isFinite(option.count)
                ? option.count
                : 0,
            active: option?.active === true,
          };
        })
        .filter(
          (option): option is ListingFacetMetric["options"][number] => option !== null
        )
    : [];

const sanitizeMetricRange = (range: ListingFacetMetric["range"]) => {
  if (!range) return null;
  const min =
    typeof range.min === "number" && Number.isFinite(range.min) ? range.min : null;
  const max =
    typeof range.max === "number" && Number.isFinite(range.max) ? range.max : null;
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

export function normalizeListingFiltersData(data: ListingFiltersData): ListingFiltersData {
  const defaultValues = listingFiltersDefaults;
  const fallbackFacets = normalizeListingFacetConfigs(defaultValues.facets);
  const facets = normalizeListingFacetConfigs(data.facets);

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
  listingQueryId,
  metric,
}: {
  listingQueryId: string;
  metric: ListingFacetMetric;
}) {
  const inputName = buildListingRuntimeParamName(listingQueryId, metric.token);

  if (metric.kind === "sort") {
    const active = metric.options.find((option) => option.active)?.value ?? "";
    return (
      <label className="grid gap-2 text-sm">
        <span className="font-medium">{metric.label}</span>
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
    const active = metric.range?.active
      ? `${metric.range.active[0] ?? ""},${metric.range.active[1] ?? ""}`
      : "";
    return (
      <label className="grid gap-2 text-sm">
        <span className="font-medium">{metric.label}</span>
        <input
          className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
          name={inputName}
          data-listing-token={metric.token}
          defaultValue={active}
          placeholder={
            metric.kind === "date-range"
              ? "YYYY-MM-DD,YYYY-MM-DD"
              : "min,max"
          }
        />
      </label>
    );
  }

  if (metric.kind === "radio") {
    return (
      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium">{metric.label}</legend>
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
              <span className="ml-auto text-xs text-[var(--color-text)]/60">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-2 text-sm">
      <legend className="font-medium">{metric.label}</legend>
      <div className="grid gap-1.5">
        {metric.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              name={inputName}
              value={option.value}
              defaultChecked={option.active}
              data-listing-token={metric.token}
            />
            <span>{option.label}</span>
            <span className="ml-auto text-xs text-[var(--color-text)]/60">
              {option.count}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ListingFiltersBlock({
  data,
  blockId,
}: {
  data: ListingFiltersData;
  variant: string;
  blockId?: string;
}) {
  const normalized = normalizeListingFiltersData(data);
  const listingQueryId = resolveOptionalText(
    normalized.resolved?.listingQueryId ?? normalized.listingQueryId
  );
  const facets = normalized.facets ?? [];
  const resolvedMetrics = normalized.resolved?.metrics ?? [];

  const metrics = facets.map((facet) => {
    const hit = resolvedMetrics.find((entry) => entry.id === facet.id);
    return hit ?? buildFallbackMetric(facet);
  });

  const title = resolveText(normalized.title, "Filter results");
  const description = resolveOptionalText(normalized.description);
  const showSearch = normalized.showSearch !== false;
  const autoApply = normalized.autoApply !== false;
  const searchValue = resolveOptionalText(normalized.resolved?.searchQuery) ?? "";

  if (!listingQueryId) {
    return (
      <section
        className="mx-auto w-full max-w-4xl rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6"
        data-listing-widget="listing-filters"
        data-listing-block-id={blockId ?? ""}
        data-listing-query-id=""
      >
        <p className="text-sm text-[var(--color-text)]/75">
          Select a listing query in widget settings to enable runtime filters.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-6"
      data-listing-widget="listing-filters"
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id={listingQueryId}
    >
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 p-4">
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
            {description ? (
              <p className="text-sm text-[var(--color-text)]/70">{description}</p>
            ) : null}
          </div>

          {showSearch ? (
            <label className="grid gap-2 text-sm">
                <span className="font-medium">
                {resolveText(normalized.searchLabel, "Search")}
              </span>
              <input
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                name={buildListingRuntimeParamName(
                  listingQueryId,
                  listingRuntimeTokens.search
                )}
                data-listing-token={listingRuntimeTokens.search}
                defaultValue={searchValue}
                placeholder={resolveText(
                  normalized.searchPlaceholder,
                  "Search results..."
                )}
              />
            </label>
          ) : null}

          <div className={joinClasses("grid gap-4", metrics.length > 1 ? "md:grid-cols-2" : "")}> 
            {metrics.map((metric) => (
              <ListingFacetControl
                key={metric.id}
                listingQueryId={listingQueryId}
                metric={metric}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-bg)]"
            >
              {resolveText(normalized.applyLabel, "Apply filters")}
            </button>
            {autoApply ? (
              <span className="text-xs text-[var(--color-text)]/60">
                Updates automatically when values change.
              </span>
            ) : null}
          </div>

          {normalized.resolved?.error ? (
            <p className="text-xs text-destructive">{normalized.resolved.error}</p>
          ) : null}
          {!normalized.resolved?.error &&
          Array.isArray(normalized.resolved?.rejectedTokens) &&
          normalized.resolved.rejectedTokens.length > 0 ? (
            <p className="text-xs text-[var(--color-text)]/60">
              Ignored invalid filter parameters.
            </p>
          ) : null}
        </form>
      </div>
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
    ],
    schema: listingFiltersSchema,
    defaults: listingFiltersDefaults,
    editor: editors,
    render: ListingFiltersBlock,
  };
}

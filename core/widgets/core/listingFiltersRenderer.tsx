import type { CSSProperties, ReactElement } from "react";

import {
  listingRuntimeTokens,
  resolveFacetToken,
  resolveListingRuntimeParamName,
  type ListingFacetConfig,
  type ListingFacetMetric,
  type ListingFacetMetricOption,
  type ListingRuntimeAliasMap,
} from "../../services/search/filterContract";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { getListingRuntimeClientScript } from "./listingRuntimeScript";
import {
  listingFiltersDefaults,
  normalizeListingFiltersData,
  type ListingFiltersCopy,
  type ListingFiltersData,
  type ListingFiltersVariantId,
} from "./listingFiltersContract";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

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

type ResolvedListingFiltersCopy = Required<ListingFiltersCopy>;

const resolveListingFiltersCopy = (
  copy: ListingFiltersCopy | undefined
): ResolvedListingFiltersCopy => ({
  configurationAriaLabel: resolveText(
    copy?.configurationAriaLabel,
    "Listing filters configuration"
  ),
  configurationHint: resolveText(
    copy?.configurationHint,
    "Select a listing query in widget settings to enable runtime filters."
  ),
  activeFilterSingular: resolveText(copy?.activeFilterSingular, "active filter"),
  activeFilterPlural: resolveText(copy?.activeFilterPlural, "active filters"),
  activeRangeFromLabel: resolveText(copy?.activeRangeFromLabel, "From"),
  activeRangeUpToLabel: resolveText(copy?.activeRangeUpToLabel, "Up to"),
  activeSearchLabel: resolveText(copy?.activeSearchLabel, "Search"),
  clearAllLabel: resolveText(copy?.clearAllLabel, "Clear all"),
  autoApplyLabel: resolveText(
    copy?.autoApplyLabel,
    "Updates automatically when values change."
  ),
  loadingLabel: resolveText(copy?.loadingLabel, "Updating linked results..."),
  errorLabel: resolveText(
    copy?.errorLabel,
    "Could not refresh linked results. Try again."
  ),
  rejectedLabel: resolveText(copy?.rejectedLabel, "Ignored invalid filter parameters."),
  drawerLabel: resolveText(copy?.drawerLabel, "Filters panel"),
  emptyOptionsLabel: resolveOptionalText(copy?.emptyOptionsLabel) ?? "",
  optionSearchTemplate: resolveText(
    copy?.optionSearchTemplate,
    "Search {facet} options"
  ),
  defaultOrderLabel: resolveText(copy?.defaultOrderLabel, "Default order"),
  dateFromLabel: resolveText(copy?.dateFromLabel, "From"),
  dateToLabel: resolveText(copy?.dateToLabel, "To"),
  rangeMinLabel: resolveText(copy?.rangeMinLabel, "Min"),
  rangeMaxLabel: resolveText(copy?.rangeMaxLabel, "Max"),
  rangeMinSliderLabel: resolveText(copy?.rangeMinSliderLabel, "Min slider"),
  rangeMaxSliderLabel: resolveText(copy?.rangeMaxSliderLabel, "Max slider"),
});

const formatOptionSearchLabel = (template: string, facetLabel: string) =>
  template.replaceAll("{facet}", facetLabel.toLowerCase());

const resolveFacetControlMode = (facet: ListingFacetConfig) =>
  facet.presentation?.controlMode ?? "inline";

const resolveFacetRangeInputMode = (facet: ListingFacetConfig) =>
  facet.presentation?.rangeInputMode ?? "inputs-slider";

const resolveFacetDateInputMode = (facet: ListingFacetConfig) =>
  facet.presentation?.dateInputMode ?? "native-date";

const resolveFacetRangeStep = (facet: ListingFacetConfig) => facet.presentation?.rangeStep ?? 1;

const optionBackedFacetKinds = new Set<ListingFacetConfig["kind"]>([
  "checkbox",
  "radio",
  "taxonomy",
]);

export function resolveFacetOptionOwnership(
  facet: ListingFacetConfig,
  renderedOptionCount: number,
  hasResolvedMetric: boolean
): { mode: "configured" } | { mode: "needs_options"; reason: string } | { mode: "not_applicable" } {
  if (!optionBackedFacetKinds.has(facet.kind)) {
    return { mode: "not_applicable" };
  }

  if (renderedOptionCount > 0) {
    return { mode: "configured" };
  }

  return {
    mode: "needs_options",
    reason: hasResolvedMetric
      ? "No matching options are available from the selected listing data yet."
      : "Options will appear when listing data resolves or a safe option list is configured.",
  };
}

const toCompositeBoundaryValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();

const buildCompositeRangeToken = (start: unknown, end: unknown) => {
  const left = toCompositeBoundaryValue(start);
  const right = toCompositeBoundaryValue(end);
  return left || right ? `${left},${right}` : "";
};

const formatActiveRangeLabel = (
  active: [string | number | boolean | null, string | number | boolean | null] | null,
  copy: ResolvedListingFiltersCopy
) => {
  if (!active) return "";
  const start = toCompositeBoundaryValue(active[0]);
  const end = toCompositeBoundaryValue(active[1]);
  if (start && end) return `${start} - ${end}`;
  if (start) return `${copy.activeRangeFromLabel} ${start}`;
  if (end) return `${copy.activeRangeUpToLabel} ${end}`;
  return "";
};

const buildActiveFilterItems = (
  metrics: ListingFacetMetric[],
  searchQuery: string,
  copy: ResolvedListingFiltersCopy
) => {
  const items: Array<{ token: string; label: string; value: string }> = [];
  if (searchQuery.trim().length > 0) {
    items.push({
      token: listingRuntimeTokens.search,
      label: copy.activeSearchLabel,
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
    const rangeValue = formatActiveRangeLabel(metric.range?.active ?? null, copy);
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
  aliases,
  metric,
  hasResolvedMetric,
  collapsible,
  defaultCollapsed,
  copy,
}: {
  facet: ListingFacetConfig;
  listingQueryId: string;
  aliases?: ListingRuntimeAliasMap;
  metric: ListingFacetMetric;
  hasResolvedMetric: boolean;
  collapsible: boolean;
  defaultCollapsed: boolean;
  copy: ResolvedListingFiltersCopy;
}) {
  const inputName = resolveListingRuntimeParamName(listingQueryId, metric.token, aliases);
  const controlMode = resolveFacetControlMode(facet);
  const resolvedOptions =
    metric.kind === "taxonomy" ? flattenTaxonomyOptions(metric.options) : metric.options;
  const optionOwnership = resolveFacetOptionOwnership(
    facet,
    metric.options.length,
    hasResolvedMetric
  );
  const emptyOptionsMessage =
    optionOwnership.mode === "needs_options"
      ? copy.emptyOptionsLabel || optionOwnership.reason
      : null;
  const renderEmptyOptionsMessage = () =>
    emptyOptionsMessage ? (
      <p
        className="rounded-md border border-dashed border-[var(--color-border)]/70 bg-[var(--color-bg)]/30 px-3 py-2 text-xs text-[var(--color-text)]/65"
        data-listing-empty-options="1"
      >
        {emptyOptionsMessage}
      </p>
    ) : null;

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
          data-listing-param-name={inputName}
          defaultValue={active}
        >
          <option value="">{copy.defaultOrderLabel}</option>
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
            data-listing-param-name={inputName}
            defaultValue={hiddenValue}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-[var(--color-text)]/65">{copy.dateFromLabel}</span>
              <input
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                type="date"
                defaultValue={activeStart}
                data-listing-date-part="start"
                data-listing-auto-submit="1"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-[var(--color-text)]/65">{copy.dateToLabel}</span>
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
            data-listing-param-name={inputName}
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
          data-listing-param-name={inputName}
          defaultValue={hiddenValue}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-[var(--color-text)]/65">{copy.rangeMinLabel}</span>
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
            <span className="text-xs text-[var(--color-text)]/65">{copy.rangeMaxLabel}</span>
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
              <span className="text-xs text-[var(--color-text)]/65">
                {copy.rangeMinSliderLabel}
              </span>
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
              <span className="text-xs text-[var(--color-text)]/65">
                {copy.rangeMaxSliderLabel}
              </span>
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
      <fieldset className="space-y-2 text-sm" aria-label={collapsible ? metric.label : undefined}>
        {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
        {metric.options.length > 0 ? (
          <div className="grid gap-1.5">
            {metric.options.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={inputName}
                  value={option.value}
                  defaultChecked={option.active}
                  data-listing-token={metric.token}
                  data-listing-param-name={inputName}
                />
                <span>{option.label}</span>
                {hasResolvedMetric ? (
                  <span className="ml-auto text-xs text-[var(--color-text)]/60">
                    {option.count}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        ) : (
          renderEmptyOptionsMessage()
        )}
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
              data-listing-param-name={inputName}
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
      <fieldset
        className="space-y-2 text-sm"
        aria-label={collapsible ? metric.label : undefined}
        data-listing-searchable-options="1"
      >
        {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
        <input
          className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
          type="search"
          placeholder={formatOptionSearchLabel(copy.optionSearchTemplate, metric.label)}
          data-listing-option-search="1"
        />
        {resolvedOptions.length > 0 ? optionContent : renderEmptyOptionsMessage()}
      </fieldset>
    );
  }

  return renderShell(
    <fieldset className="space-y-2 text-sm" aria-label={collapsible ? metric.label : undefined}>
      {!collapsible ? <legend className="font-medium">{metric.label}</legend> : null}
      {resolvedOptions.length > 0 ? optionContent : renderEmptyOptionsMessage()}
    </fieldset>
  );
}

export function ListingFiltersBlock({
  data,
  variant,
  blockId,
  withRuntimeScript = true,
}: {
  data: ListingFiltersData;
  variant: string;
  blockId?: string;
  /**
   * Whether the shared listing runtime client script is inlined next to the
   * form (legacy widget default). The Page v2 pipeline passes `false` and
   * emits the script once per page through the body-script seam
   * (TASK-459-02); the markup itself stays a plain GET form either way.
   */
  withRuntimeScript?: boolean;
}) {
  const normalized = normalizeListingFiltersData(data);
  const resolvedVariant = resolveListingFiltersVariant(variant);
  const listingQueryId =
    resolveOptionalText(normalized.resolved?.listingQueryId) ??
    resolveOptionalText(normalized.listingQueryId);
  const facets = normalized.facets ?? [];
  const aliases = normalized.aliases ?? {};
  const aliasParamNames = Object.keys(aliases).join(",");
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
  const copy = resolveListingFiltersCopy(normalized.copy);
  const searchValue = resolveOptionalText(normalized.resolved?.searchQuery) ?? "";
  const activeItems = buildActiveFilterItems(
    metrics.map((entry) => entry.metric),
    searchValue,
    copy
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
  const rootInstanceId = createWidgetInstanceId(
    "listing-filters",
    blockId,
    listingQueryId ?? resolvedVariant
  );
  const titleId = scopedId(rootInstanceId, "title");
  const searchInputId = scopedId(rootInstanceId, "search");
  const searchInputName = listingQueryId
    ? resolveListingRuntimeParamName(listingQueryId, listingRuntimeTokens.search, aliases)
    : "";

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
        aria-label={copy.configurationAriaLabel}
      >
        <p className="text-sm text-[var(--color-text)]/75">{copy.configurationHint}</p>
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
      data-listing-param-aliases={aliasParamNames}
      aria-labelledby={titleId}
    >
      <div className="space-y-1">
        <p
          id={titleId}
          className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]/75"
        >
          {title}
        </p>
        {description ? <p className="text-sm text-[var(--color-text)]/70">{description}</p> : null}
      </div>

      {showSearch ? (
        <label className="grid gap-2 text-sm" htmlFor={searchInputId}>
          <span className="font-medium">{resolveText(normalized.searchLabel, "Search")}</span>
          <input
            id={searchInputId}
            className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
            type="search"
            autoComplete="off"
            name={searchInputName}
            data-listing-token={listingRuntimeTokens.search}
            data-listing-param-name={searchInputName}
            defaultValue={searchValue}
            placeholder={resolveText(normalized.searchPlaceholder, "Search results...")}
          />
        </label>
      ) : null}

      {activeItems.length > 0 ? (
        <div className="space-y-2 rounded-md border border-[var(--color-border)]/70 bg-[var(--color-bg)]/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {activeItems.length}{" "}
              {activeItems.length === 1
                ? copy.activeFilterSingular
                : copy.activeFilterPlural}
            </p>
            <button
              type="button"
              className="text-xs font-medium underline-offset-4 hover:underline"
              data-listing-clear-all="1"
            >
              {copy.clearAllLabel}
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
            aliases={aliases}
            metric={metric}
            hasResolvedMetric={hasResolvedMetric}
            collapsible={collapsibleFacets}
            defaultCollapsed={defaultCollapsed}
            copy={copy}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {autoApply ? (
          <span className="text-xs text-[var(--color-text)]/60">{copy.autoApplyLabel}</span>
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
          {copy.loadingLabel}
        </p>
        <p className="text-xs text-destructive" hidden data-listing-runtime-error="1">
          {copy.errorLabel}
        </p>
      </div>

      {normalized.resolved?.error ? (
        <p className="text-xs text-destructive">
          {normalized.copy?.errorLabel ?? normalized.resolved.error}
        </p>
      ) : null}
      {!normalized.resolved?.error &&
      Array.isArray(normalized.resolved?.rejectedTokens) &&
      normalized.resolved.rejectedTokens.length > 0 ? (
        <p className="text-xs text-[var(--color-text)]/60">{copy.rejectedLabel}</p>
      ) : null}
    </form>
  );

  const renderedFrame =
    resolvedVariant === "drawer" ? (
      <details className={frameClass} open={!defaultCollapsed} style={frameStyle}>
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]/75">
          {copy.drawerLabel}
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
      aria-labelledby={titleId}
    >
      {renderedFrame}
      {withRuntimeScript ? (
        <script dangerouslySetInnerHTML={{ __html: getListingRuntimeClientScript() }} />
      ) : null}
    </section>
  );
}

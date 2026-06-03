import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { previewProductTable } from "@/services/productTablePreviewClient";

import {
  buildProductTableQueryInput,
  normalizeProductTableControls,
  normalizeProductTableData,
  normalizeProductTableExport,
  normalizeProductTableFormat,
  productTableAlignValues,
  productTableColumns,
  productTableCurrencyDisplayValues,
  productTableDefaults,
  productTableDensityValues,
  productTableMaxWidthValues,
  productTableMoneyLocaleValues,
  productTableRowTreatmentValues,
  productTableTypographyValues,
  resolveProductTableAuthoredPageSize,
  resolveProductTablePresentationStyle,
  resolveProductTableVariant,
  type ProductTableAlign,
  type ProductTableCurrencyDisplay,
  type ProductTableData,
  type ProductTableDensity,
  type ProductTableMoneyLocale,
  type ProductTableLinkColumn,
  type ProductTableMaxWidth,
  type ProductTablePaginationMode,
  type ProductTableRowTreatment,
  type ProductTableSortingMode,
  type ProductTableTypography,
  type ProductTableVariantId,
} from "../../../../widgets/core/productTable";
import { commerceSortFieldLabelMap } from "../../../../widgets/core/commerceWidgetShared";
import type { WidgetEditorProps, WidgetPreviewState } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceNumberField,
  CommerceSourceFields,
  CommerceTextField,
  CommerceTextareaField,
  CommerceToggleField,
  normalizeSourceForEditor,
} from "./CommerceWidgetEditorShared";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow } from "./WidgetEditorControls";

const update = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<ProductTableData>
) => {
  onChange(
    normalizeProductTableData({
      ...normalizeProductTableData(value),
      ...patch,
    })
  );
};

const updateStyle = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<NonNullable<ProductTableData["style"]>>
) => {
  update(value, onChange, {
    style: {
      ...normalizeProductTableData(value).style,
      ...patch,
    },
  });
};

const clearStyle = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  key: keyof NonNullable<ProductTableData["style"]>
) => {
  const current = normalizeProductTableData(value);
  const { [key]: _removed, ...nextStyle } = current.style ?? {};
  update(value, onChange, {
    // Empty style objects intentionally preserve explicitly cleared surface overrides.
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
};

const updateHeader = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<NonNullable<ProductTableData["header"]>>
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    header: {
      ...current.header,
      ...patch,
    },
  });
};

const updateFieldVisibility = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  key: keyof NonNullable<ProductTableData["fields"]>,
  next: boolean
) => {
  const current = normalizeProductTableData(value);
  const nextFields: NonNullable<ProductTableData["fields"]> = {
    ...current.fields,
    [key]: next,
  };

  if (key === "showStock" && next === false) {
    nextFields.showStockQuantity = false;
  }

  update(value, onChange, {
    fields: nextFields,
  });
};

const updateFormat = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<NonNullable<ProductTableData["format"]>>
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    format: {
      ...normalizeProductTableFormat(current.format),
      ...patch,
    },
  });
};

const updateExport = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<NonNullable<ProductTableData["export"]>>
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    export: {
      ...normalizeProductTableExport(current.export),
      ...patch,
    },
  });
};

const updateLabel = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  key: keyof NonNullable<ProductTableData["labels"]>,
  next: string
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    labels: {
      ...current.labels,
      [key]: next,
    },
  });
};

const updateLinks = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<NonNullable<ProductTableData["links"]>>
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    links: {
      ...current.links,
      ...patch,
    },
  });
};

const updateControls = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  patch: Partial<NonNullable<ProductTableData["controls"]>>
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    controls: {
      ...normalizeProductTableControls(current.controls),
      ...patch,
    },
  });
};

const productTableLinkColumnOptions: Array<{
  value: ProductTableLinkColumn;
  label: string;
}> = [
  { value: "none", label: "No linked column" },
  { value: "title", label: "Product column" },
  { value: "slug", label: "Product URL column" },
];

const productTableSortingModeOptions: Array<{
  value: ProductTableSortingMode;
  label: string;
}> = [
  { value: "none", label: "No sorting UI" },
  { value: "indicator", label: "Indicator only" },
  { value: "interactive", label: "Interactive headers" },
];

const productTablePaginationModeOptions: Array<{
  value: ProductTablePaginationMode;
  label: string;
}> = [
  { value: "none", label: "No pagination" },
  { value: "paged", label: "Previous and next" },
  { value: "load-more", label: "Load more link" },
];

const productTableVariantOptions: Array<{
  value: ProductTableVariantId;
  label: string;
}> = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
];

const productTableDensityOptions: Array<{
  value: ProductTableDensity;
  label: string;
}> = productTableDensityValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const productTableRowTreatmentOptions: Array<{
  value: ProductTableRowTreatment;
  label: string;
}> = productTableRowTreatmentValues.map((value) => ({
  value,
  label: value === "plain" ? "Plain rows" : "Striped rows",
}));

const productTableMaxWidthOptions: Array<{
  value: ProductTableMaxWidth;
  label: string;
}> = productTableMaxWidthValues.map((value) => ({
  value,
  label: value === "full" ? "Full width" : value === "content" ? "Content width" : "Wide",
}));

const productTableAlignOptions: Array<{
  value: ProductTableAlign;
  label: string;
}> = productTableAlignValues.map((value) => ({
  value,
  label: value === "left" ? "Left aligned" : "Centered",
}));

const productTableTypographyOptions: Array<{
  value: ProductTableTypography;
  label: string;
}> = productTableTypographyValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const productTableMoneyLocaleOptions: Array<{
  value: ProductTableMoneyLocale;
  label: string;
}> = productTableMoneyLocaleValues.map((value) => ({
  value,
  label:
    value === "en-US"
      ? "English (US)"
      : value === "pl-PL"
        ? "Polish (PL)"
        : value === "de-DE"
          ? "German (DE)"
          : "French (FR)",
}));

const productTableCurrencyDisplayOptions: Array<{
  value: ProductTableCurrencyDisplay;
  label: string;
}> = productTableCurrencyDisplayValues.map((value) => ({
  value,
  label: value === "code" ? "Currency code" : value === "name" ? "Currency name" : "Symbol",
}));

const resolvePreviewErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Resolved Product Table preview could not be loaded.";
};

const resolvePreviewResolvedData = (
  normalized: ProductTableData,
  previewState: WidgetPreviewState | null | undefined
) => {
  const previewResolved = previewState?.dataPatch?.resolved;
  if (previewResolved && typeof previewResolved === "object") {
    return previewResolved as NonNullable<ProductTableData["resolved"]>;
  }
  return normalized.resolved ?? { items: [], total: 0, resolvedAt: "" };
};

const buildProductTablePreviewKey = (value: ProductTableData) => {
  const normalized = normalizeProductTableData(value);
  return JSON.stringify({
    query: buildProductTableQueryInput(normalized),
    controls: normalizeProductTableControls(normalized.controls),
  });
};

const formatResolvedTimestamp = (value: string | undefined) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "No resolved preview snapshot is available yet.";
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return normalized;
  return `Resolved at ${new Date(timestamp).toLocaleString("en-US")}`;
};

function ProductTableSelectField({
  label,
  value,
  options,
  controlId,
  controlPath,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  controlId?: string;
  controlPath?: string;
  onChange: (next: string) => void;
}) {
  return (
    <label
      data-widget-control={controlId}
      data-widget-control-path={controlPath}
      data-widget-control-ownership={controlPath ? "writable" : undefined}
      className="space-y-1 text-sm"
    >
      <span className="font-medium text-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function useProductTablePreview({
  active,
  value,
  previewState,
  setPreviewState,
  blockId,
}: {
  active: boolean;
  value: ProductTableData;
  previewState: WidgetPreviewState | null | undefined;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
  blockId?: string;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const canPreview = typeof setPreviewState === "function";
  const previewKey = `${blockId ?? "product-table"}:${buildProductTablePreviewKey(value)}`;
  const lastResolvedPatchRef = useRef<Record<string, unknown> | undefined>(previewState?.dataPatch);
  const previewDataPatchRef = useRef<Record<string, unknown> | undefined>(previewState?.dataPatch);
  const previewInputRef = useRef<ProductTableData>({
    source: normalizeProductTableData(value).source,
    controls: normalizeProductTableControls(normalizeProductTableData(value).controls),
  });
  const activeRequestKeyRef = useRef<string | undefined>(previewState?.requestKey);

  const setPreviewStateEvent = useEffectEvent((state: WidgetPreviewState | null) => {
    setPreviewState?.(state);
  });

  useEffect(() => {
    const normalized = normalizeProductTableData(value);
    previewInputRef.current = {
      source: normalized.source,
      controls: normalizeProductTableControls(normalized.controls),
    };
  }, [value]);

  useEffect(() => {
    if (previewState?.dataPatch) {
      lastResolvedPatchRef.current = previewState.dataPatch;
    }
    previewDataPatchRef.current = previewState?.dataPatch;
    activeRequestKeyRef.current = previewState?.requestKey;
  }, [previewState?.dataPatch, previewState?.requestKey]);

  useEffect(() => {
    if (!active || !canPreview) return;
    if (
      refreshToken === 0 &&
      activeRequestKeyRef.current === previewKey &&
      previewDataPatchRef.current
    ) {
      return;
    }

    const controller = new AbortController();
    const previousPatch = lastResolvedPatchRef.current;
    activeRequestKeyRef.current = previewKey;
    setPreviewStateEvent({
      status: "loading",
      requestKey: previewKey,
      ...(previousPatch ? { dataPatch: previousPatch } : {}),
    });

    previewProductTable(previewInputRef.current, { signal: controller.signal })
      .then((resolved) => {
        if (controller.signal.aborted || activeRequestKeyRef.current !== previewKey) return;
        const dataPatch = {
          resolved,
        } satisfies Record<string, unknown>;
        lastResolvedPatchRef.current = dataPatch;
        previewDataPatchRef.current = dataPatch;
        setPreviewStateEvent({
          status: "ready",
          requestKey: previewKey,
          dataPatch,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || activeRequestKeyRef.current !== previewKey) return;
        setPreviewStateEvent({
          status: "error",
          requestKey: previewKey,
          message: resolvePreviewErrorMessage(error),
          ...(previousPatch ? { dataPatch: previousPatch } : {}),
        });
      });

    return () => {
      controller.abort();
    };
  }, [active, canPreview, previewKey, refreshToken]);

  return {
    refresh: () => setRefreshToken((current) => current + 1),
    isLoading: previewState?.status === "loading",
  };
}

function PreviewStatusCard({
  value,
  context,
  onRefresh,
  disabled,
}: {
  value: ProductTableData;
  context: WidgetEditorProps<ProductTableData>["context"];
  onRefresh?: () => void;
  disabled?: boolean;
}) {
  const normalized = normalizeProductTableData(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const authoredPageSize = resolveProductTableAuthoredPageSize(normalized);
  const controls = normalizeProductTableControls(normalized.controls);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  const guidanceTone =
    context?.previewState?.status === "error"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : context?.previewState?.status === "loading"
        ? "border-sky-300 bg-sky-50 text-sky-900"
        : "border-border/70 bg-background text-muted-foreground";

  return (
    <div className={`space-y-2 rounded-md border p-3 text-xs ${guidanceTone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p>
            Resolved items: {resolved.items?.length ?? 0} · Total: {resolved.total ?? 0}
          </p>
          <p>
            Products shown: {authoredPageSize} · Sort: {commerceSortFieldLabelMap[source.sortField]}{" "}
            {source.sortDir === "asc" ? "ascending" : "descending"}
          </p>
          <p>
            Visitor sorting:{" "}
            {productTableSortingModeOptions.find((option) => option.value === controls.sorting)
              ?.label ?? "No sorting UI"}{" "}
            · Pagination:{" "}
            {productTablePaginationModeOptions.find(
              (option) => option.value === controls.pagination
            )?.label ?? "No pagination"}
          </p>
          <p>
            {context?.previewState?.status === "loading"
              ? "Refreshing the live product preview."
              : context?.previewState?.status === "error"
                ? (context.previewState.message ??
                  "Preview refresh failed. Showing the last safe preview data when available.")
                : formatResolvedTimestamp(resolved.resolvedAt)}
          </p>
          {resolved.error ? <p>Runtime warning: {resolved.error}</p> : null}
        </div>
        {typeof onRefresh === "function" ? (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onRefresh}
            disabled={disabled}
          >
            Refresh preview
          </button>
        ) : null}
      </div>
    </div>
  );
}

function summarizeProductTableSource(value: ProductTableData) {
  const normalized = normalizeProductTableData(value);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  const controls = normalizeProductTableControls(normalized.controls);
  const runtime = normalized.resolved?.runtime;
  const availableCollectionCount = runtime?.availableCollections?.length ?? 0;
  const availableStatusCount = runtime?.availableStatuses?.length ?? 0;
  const collectionControlSummary = controls.showCollectionFilter
    ? availableCollectionCount > 1
      ? "Collection filters"
      : "Collection filters saved, inactive until at least two collections resolve"
    : null;
  const statusControlSummary = controls.showStatusFilter
    ? availableStatusCount > 1
      ? "Status filter"
      : "Status filter saved, inactive until at least two statuses resolve"
    : null;

  return {
    productLimit: `${source.limit} products per page`,
    searchScope: source.search.trim() ? "Filtered by product search text" : "No search text",
    collectionScope:
      source.collectionIds.length > 0
        ? `${source.collectionIds.length} selected collection${source.collectionIds.length === 1 ? "" : "s"}`
        : "All available collections",
    statusScope:
      source.status.length > 0
        ? source.status.map((status) => status.replaceAll("_", " ")).join(", ")
        : "Published storefront default",
    sortOrder: `${commerceSortFieldLabelMap[source.sortField]} · ${
      source.sortDir === "asc" ? "Ascending" : "Descending"
    }`,
    visitorControls: [
      controls.showSearchInput ? "Search" : null,
      collectionControlSummary,
      statusControlSummary,
      controls.sorting !== "none" ? "Sorting headers" : null,
      controls.pagination !== "none" ? "Pagination" : null,
    ]
      .filter(Boolean)
      .join(", "),
    pageSize:
      controls.pagination === "none"
        ? "Pagination disabled"
        : `${controls.pageSize} products per page`,
  };
}

function PublicControlsFields({
  value,
  onChange,
}: {
  value: ProductTableData;
  onChange: (next: ProductTableData) => void;
}) {
  const normalized = normalizeProductTableData(value);
  const controls = normalizeProductTableControls(normalized.controls);
  const paginationMode = controls.pagination;

  return (
    <CommerceEditorSection
      id="product-table.visual.public-controls"
      mode="visual"
      role="content"
      title="Public controls"
      description="Expose bounded Product Table search, filters, sortable headers, and SSR pagination on published pages."
    >
      <CommerceToggleField
        label="Show search input"
        description="Front-end search is intended for authored sources without a fixed Source search term."
        controlId="product-table.visual.show-search-input"
        controlPath="controls.showSearchInput"
        checked={controls.showSearchInput}
        onChange={(next) => updateControls(normalized, onChange, { showSearchInput: next })}
      />
      <CommerceToggleField
        label="Show collection filter"
        description="Uses the authored Source collection scope. Add at least two Source collections above to surface visitor checkboxes."
        controlId="product-table.visual.show-collection-filter"
        controlPath="controls.showCollectionFilter"
        checked={controls.showCollectionFilter}
        onChange={(next) => updateControls(normalized, onChange, { showCollectionFilter: next })}
      />
      <CommerceToggleField
        label="Show status filter"
        description="Preview can show authored status options, but published pages stay public-safe and usually collapse to published only."
        controlId="product-table.visual.show-status-filter"
        controlPath="controls.showStatusFilter"
        checked={controls.showStatusFilter}
        onChange={(next) => updateControls(normalized, onChange, { showStatusFilter: next })}
      />
      <ProductTableSelectField
        label="Sorting UI"
        value={controls.sorting}
        options={productTableSortingModeOptions}
        controlId="product-table.visual.sorting"
        controlPath="controls.sorting"
        onChange={(next) =>
          updateControls(normalized, onChange, { sorting: next as ProductTableSortingMode })
        }
      />
      <ProductTableSelectField
        label="Pagination mode"
        value={paginationMode}
        options={productTablePaginationModeOptions}
        controlId="product-table.visual.pagination"
        controlPath="controls.pagination"
        onChange={(next) =>
          updateControls(normalized, onChange, { pagination: next as ProductTablePaginationMode })
        }
      />
      {paginationMode !== "none" ? (
        <CommerceNumberField
          label="Page size"
          value={controls.pageSize}
          min={1}
          max={24}
          controlId="product-table.visual.page-size"
          controlPath="controls.pageSize"
          onChange={(next) => updateControls(normalized, onChange, { pageSize: next })}
        />
      ) : null}
    </CommerceEditorSection>
  );
}

function ExportAndCurrencyFields({
  value,
  onChange,
}: {
  value: ProductTableData;
  onChange: (next: ProductTableData) => void;
}) {
  const normalized = normalizeProductTableData(value);
  const format = normalizeProductTableFormat(normalized.format);
  const exportSettings = normalizeProductTableExport(normalized.export);

  return (
    <CommerceEditorSection
      id="product-table.visual.export-format"
      mode="visual"
      role="content"
      title="Export and currency"
      description="Product Table owns explicit money formatting and optional SSR CSV export for the currently visible rows. Runtime diagnostics remain read-only in Advanced mode."
    >
      <ProductTableSelectField
        label="Money locale"
        value={format.moneyLocale}
        options={productTableMoneyLocaleOptions}
        controlId="product-table.visual.money-locale"
        controlPath="format.moneyLocale"
        onChange={(next) =>
          updateFormat(normalized, onChange, { moneyLocale: next as ProductTableMoneyLocale })
        }
      />
      <ProductTableSelectField
        label="Currency display"
        value={format.currencyDisplay}
        options={productTableCurrencyDisplayOptions}
        controlId="product-table.visual.currency-display"
        controlPath="format.currencyDisplay"
        onChange={(next) =>
          updateFormat(normalized, onChange, {
            currencyDisplay: next as ProductTableCurrencyDisplay,
          })
        }
      />
      <CommerceToggleField
        label="Show CSV export"
        description="Adds a public download button for the currently visible rows and columns only."
        controlId="product-table.visual.export-enabled"
        controlPath="export.enabled"
        checked={exportSettings.enabled}
        onChange={(next) => updateExport(normalized, onChange, { enabled: next })}
      />
      {exportSettings.enabled ? (
        <CommerceTextField
          label="Export label"
          value={exportSettings.label}
          controlId="product-table.visual.export-label"
          controlPath="export.label"
          onChange={(next) => updateExport(normalized, onChange, { label: next })}
        />
      ) : null}
    </CommerceEditorSection>
  );
}

function LayoutStyleFields({
  value,
  variant,
  onVariantChange,
  onChange,
}: {
  value: ProductTableData;
  variant: string;
  onVariantChange?: (next: string) => void;
  onChange: (next: ProductTableData) => void;
}) {
  const normalized = normalizeProductTableData(value);
  const resolvedVariant = resolveProductTableVariant(variant);
  const style = resolveProductTablePresentationStyle(resolvedVariant, normalized.style);

  return (
    <CommerceEditorSection
      id="product-table.visual.layout-style"
      mode="visual"
      role="layout"
      title="Layout and style"
      description="Variant is a preset axis. Density, striping, hover, sticky header, width, alignment, and typography stay bounded Product Table controls."
    >
      <ProductTableSelectField
        label="Table variant"
        value={resolvedVariant}
        options={productTableVariantOptions}
        controlId="product-table.visual.variant"
        controlPath="variant"
        onChange={(next) => onVariantChange?.(next as ProductTableVariantId)}
      />
      <ProductTableSelectField
        label="Row density"
        value={style.density}
        options={productTableDensityOptions}
        controlId="product-table.visual.density"
        controlPath="style.density"
        onChange={(next) =>
          updateStyle(normalized, onChange, { density: next as ProductTableDensity })
        }
      />
      <ProductTableSelectField
        label="Row treatment"
        value={style.rowTreatment}
        options={productTableRowTreatmentOptions}
        controlId="product-table.visual.row-treatment"
        controlPath="style.rowTreatment"
        onChange={(next) =>
          updateStyle(normalized, onChange, { rowTreatment: next as ProductTableRowTreatment })
        }
      />
      <CommerceToggleField
        label="Show row hover"
        description="Adds a gentle table-wide hover treatment. Linked rows still keep their stronger interaction cue."
        controlId="product-table.visual.hover-rows"
        controlPath="style.hoverRows"
        checked={style.hoverRows}
        onChange={(next) => updateStyle(normalized, onChange, { hoverRows: next })}
      />
      <CommerceToggleField
        label="Use sticky header"
        description="Keeps Product Table headers visible while long tables scroll vertically inside the page."
        controlId="product-table.visual.sticky-header"
        controlPath="style.stickyHeader"
        checked={style.stickyHeader}
        onChange={(next) => updateStyle(normalized, onChange, { stickyHeader: next })}
      />
      <ProductTableSelectField
        label="Table max width"
        value={style.maxWidth}
        options={productTableMaxWidthOptions}
        controlId="product-table.visual.max-width"
        controlPath="style.maxWidth"
        onChange={(next) =>
          updateStyle(normalized, onChange, { maxWidth: next as ProductTableMaxWidth })
        }
      />
      <ProductTableSelectField
        label="Table alignment"
        value={style.align}
        options={productTableAlignOptions}
        controlId="product-table.visual.align"
        controlPath="style.align"
        onChange={(next) => updateStyle(normalized, onChange, { align: next as ProductTableAlign })}
      />
      <ProductTableSelectField
        label="Typography"
        value={style.typography}
        options={productTableTypographyOptions}
        controlId="product-table.visual.typography"
        controlPath="style.typography"
        onChange={(next) =>
          updateStyle(normalized, onChange, { typography: next as ProductTableTypography })
        }
      />
    </CommerceEditorSection>
  );
}

function SurfaceFields({
  value,
  onChange,
}: {
  value: ProductTableData;
  onChange: (next: ProductTableData) => void;
}) {
  const normalized = normalizeProductTableData(value);

  return (
    <CommerceEditorSection
      id="product-table.visual.surfaces"
      mode="visual"
      role="visual"
      title="Surfaces"
      description="Table, header, and empty state colors."
    >
      <SharedColorControl
        label="Table background"
        value={normalized.style?.tableBackground}
        controlId="product-table.visual.table-background"
        controlPath="style.tableBackground"
        onChange={(next) => updateStyle(value, onChange, { tableBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { tableBackground: next })}
        onClear={() => clearStyle(value, onChange, "tableBackground")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
        showValueInput={false}
      />
      <SharedColorControl
        label="Table border"
        value={normalized.style?.tableBorderColor}
        controlId="product-table.visual.table-border-color"
        controlPath="style.tableBorderColor"
        onChange={(next) => updateStyle(value, onChange, { tableBorderColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { tableBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "tableBorderColor")}
        placeholder="var(--color-border)"
        pickerFallback="#d4d4d8"
        showValueInput={false}
      />
      <SharedColorControl
        label="Header background"
        value={normalized.style?.headerBackground}
        controlId="product-table.visual.header-background"
        controlPath="style.headerBackground"
        onChange={(next) => updateStyle(value, onChange, { headerBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { headerBackground: next })}
        onClear={() => clearStyle(value, onChange, "headerBackground")}
        placeholder="var(--color-bg)"
        pickerFallback="#f8fafc"
        showValueInput={false}
      />
      <SharedColorControl
        label="Empty background"
        value={normalized.style?.emptyBackground}
        controlId="product-table.visual.empty-background"
        controlPath="style.emptyBackground"
        onChange={(next) => updateStyle(value, onChange, { emptyBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { emptyBackground: next })}
        onClear={() => clearStyle(value, onChange, "emptyBackground")}
        placeholder="var(--color-bg)"
        pickerFallback="#f8fafc"
        showValueInput={false}
      />
      <SharedColorControl
        label="Empty border"
        value={normalized.style?.emptyBorderColor}
        controlId="product-table.visual.empty-border-color"
        controlPath="style.emptyBorderColor"
        onChange={(next) => updateStyle(value, onChange, { emptyBorderColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { emptyBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "emptyBorderColor")}
        placeholder="var(--color-border)"
        pickerFallback="#d4d4d8"
        showValueInput={false}
      />
    </CommerceEditorSection>
  );
}

export function ProductTableWizardEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ProductTableData>) {
  const normalized = normalizeProductTableData(value);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  const preview = useProductTablePreview({
    active: context?.editorMode === "wizard",
    value: normalized,
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
    blockId: context?.blockId,
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        id="product-table.wizard.table-source"
        mode="wizard"
        role="source"
        title="Table source"
        description="Select products visible in this tabular listing."
      >
        <CommerceSourceFields
          source={source}
          onChange={(nextSource) => update(normalized, onChange, { source: nextSource })}
          options={{
            allowCollectionFallbackInput: false,
            controlIdPrefix: "product-table.wizard.source",
          }}
        />
      </CommerceEditorSection>
      <CommerceEditorSection
        id="product-table.wizard.preview-summary"
        mode="wizard"
        role="diagnostics"
        title="Preview summary"
        description="Read-only backend preview for the selected product source."
      >
        <PreviewStatusCard
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>
    </div>
  );
}

export function ProductTableVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<ProductTableData>) {
  const normalized = normalizeProductTableData(value);
  const preview = useProductTablePreview({
    active: context?.editorMode === "visual",
    value: normalized,
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
    blockId: context?.blockId,
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        id="product-table.visual.preview-summary"
        mode="visual"
        role="diagnostics"
        title="Preview summary"
        description="Read-only product preview status for the current visual settings."
      >
        <PreviewStatusCard
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>

      <LayoutStyleFields
        value={normalized}
        variant={variant}
        onVariantChange={onVariantChange}
        onChange={onChange}
      />

      <CommerceEditorSection
        id="product-table.visual.section-header"
        mode="visual"
        role="content"
        title="Section header"
        description="Optional context above the table. Section title becomes the preferred accessible table label when present."
      >
        <CommerceTextField
          label="Section eyebrow"
          value={normalized.header?.eyebrow}
          controlId="product-table.visual.header-eyebrow"
          controlPath="header.eyebrow"
          onChange={(next) => updateHeader(normalized, onChange, { eyebrow: next })}
        />
        <CommerceTextField
          label="Section title"
          value={normalized.header?.title}
          controlId="product-table.visual.header-title"
          controlPath="header.title"
          onChange={(next) => updateHeader(normalized, onChange, { title: next })}
        />
        <CommerceTextareaField
          label="Section description"
          rows={3}
          value={normalized.header?.description}
          controlId="product-table.visual.header-description"
          controlPath="header.description"
          onChange={(next) => updateHeader(normalized, onChange, { description: next })}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-table.visual.columns"
        mode="visual"
        role="content"
        title="Columns"
        description="Choose columns visible in the table. Product and Price stay visible when their paired context column is also hidden."
      >
        {productTableColumns.map((column) => (
          <CommerceToggleField
            key={column.key}
            label={column.toggleLabel}
            description={column.guardDescription}
            checked={normalized.fields?.[column.visibilityKey] ?? false}
            controlId={`product-table.visual.${column.visibilityKey}`}
            controlPath={`fields.${column.visibilityKey}`}
            onChange={(next) =>
              updateFieldVisibility(normalized, onChange, column.visibilityKey, next)
            }
          />
        ))}
        {normalized.fields?.showStock ? (
          <CommerceToggleField
            label="Show stock quantity"
            description="Append normalized quantity to the stock label when runtime data includes it."
            checked={normalized.fields?.showStockQuantity === true}
            controlId="product-table.visual.show-stock-quantity"
            controlPath="fields.showStockQuantity"
            onChange={(next) =>
              updateFieldVisibility(normalized, onChange, "showStockQuantity", next)
            }
          />
        ) : null}
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-table.visual.column-labels"
        mode="visual"
        role="content"
        title="Column labels"
        description="Customize every Product Table header label from the shared column registry."
      >
        {productTableColumns.map((column) => (
          <CommerceTextField
            key={column.key}
            label={column.labelControlLabel}
            value={normalized.labels?.[column.labelKey]}
            controlId={`product-table.visual.label-${column.labelKey}`}
            controlPath={`labels.${column.labelKey}`}
            onChange={(next) => updateLabel(normalized, onChange, column.labelKey, next)}
          />
        ))}
      </CommerceEditorSection>

      <PublicControlsFields value={normalized} onChange={onChange} />

      <ExportAndCurrencyFields value={normalized} onChange={onChange} />

      <CommerceEditorSection
        id="product-table.visual.links-actions"
        mode="visual"
        role="content"
        title="Links and actions"
        description="Product links and actions use the enabled products detail route from Site Settings. When no route is available, runtime keeps the table text-only."
      >
        <ProductTableSelectField
          label="Linked column"
          value={normalized.links?.linkedColumn ?? "none"}
          options={productTableLinkColumnOptions}
          controlId="product-table.visual.linked-column"
          controlPath="links.linkedColumn"
          onChange={(next) =>
            updateLinks(normalized, onChange, {
              linkedColumn: next as ProductTableLinkColumn,
            })
          }
        />
        <CommerceToggleField
          label="Show action column"
          checked={normalized.links?.showAction === true}
          controlId="product-table.visual.show-action"
          controlPath="links.showAction"
          onChange={(next) => updateLinks(normalized, onChange, { showAction: next })}
        />
        {normalized.links?.showAction ? (
          <CommerceTextField
            label="Action label"
            value={normalized.links?.actionLabel}
            controlId="product-table.visual.action-label"
            controlPath="links.actionLabel"
            onChange={(next) => updateLinks(normalized, onChange, { actionLabel: next })}
          />
        ) : null}
        {normalized.links?.linkedColumn !== "none" || normalized.links?.showAction ? (
          <CommerceToggleField
            label="Open product links in new tab"
            checked={normalized.links?.openInNewTab === true}
            controlId="product-table.visual.open-in-new-tab"
            controlPath="links.openInNewTab"
            onChange={(next) => updateLinks(normalized, onChange, { openInNewTab: next })}
          />
        ) : null}
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-table.visual.empty-state"
        mode="visual"
        role="content"
        title="Empty state"
        description="Shown when no products are resolved."
      >
        <CommerceTextField
          label="Title"
          value={normalized.emptyState?.title}
          controlId="product-table.visual.empty-title"
          controlPath="emptyState.title"
          onChange={(next) =>
            update(normalized, onChange, {
              emptyState: {
                ...normalized.emptyState,
                title: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Description"
          value={normalized.emptyState?.description}
          controlId="product-table.visual.empty-description"
          controlPath="emptyState.description"
          onChange={(next) =>
            update(normalized, onChange, {
              emptyState: {
                ...normalized.emptyState,
                description: next,
              },
            })
          }
        />
      </CommerceEditorSection>
      <SurfaceFields value={normalized} onChange={onChange} />
    </div>
  );
}

export function ProductTableAdvancedEditor({
  value,
  context,
}: WidgetEditorProps<ProductTableData>) {
  const normalized = normalizeProductTableData(value);
  const sourceSummary = summarizeProductTableSource(normalized);
  const preview = useProductTablePreview({
    active: context?.editorMode === "advanced",
    value: normalized,
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
    blockId: context?.blockId,
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        id="product-table.advanced.runtime-status"
        mode="advanced"
        role="diagnostics"
        title="Runtime status"
        description="Read-only product preview status for support and QA."
      >
        <PreviewStatusCard
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-table.advanced.query-summary"
        mode="advanced"
        role="diagnostics"
        title="Query summary"
        description="Human support summary of the product source. Raw query payloads stay out of the editor."
      >
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-limit"
          label="Product limit"
          path="source.limit"
          value={sourceSummary.productLimit}
        />
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-search"
          label="Search scope"
          path="source.search"
          value={sourceSummary.searchScope}
        />
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-collections"
          label="Collection scope"
          path="source.collectionIds"
          value={sourceSummary.collectionScope}
        />
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-status"
          label="Status scope"
          path="source.status"
          value={sourceSummary.statusScope}
        />
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-sort"
          label="Sort order"
          path="source.sortField"
          value={sourceSummary.sortOrder}
        />
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-visitor-controls"
          label="Visitor controls"
          path="controls"
          value={sourceSummary.visitorControls || "No visitor controls enabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="product-table.advanced.query-page-size"
          label="Page size"
          path="controls.pageSize"
          value={sourceSummary.pageSize}
        />
      </CommerceEditorSection>
    </div>
  );
}

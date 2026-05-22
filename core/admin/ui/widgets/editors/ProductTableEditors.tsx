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
  productTableColumns,
  productTableDefaults,
  resolveProductTableAuthoredPageSize,
  type ProductTableData,
  type ProductTableLinkColumn,
  type ProductTablePaginationMode,
  type ProductTableSortingMode,
} from "../../../../widgets/core/productTable";
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
import { ClearableInputField } from "./ClearableFields";

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
  { value: "slug", label: "Slug column" },
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
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
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
            Query limit: {authoredPageSize} · Sort: {normalized.source?.sortField ?? "updatedAt"}{" "}
            {normalized.source?.sortDir ?? "desc"}
          </p>
          <p>
            Public sort UI: {normalized.controls?.sorting ?? "none"} · Pagination:{" "}
            {normalized.controls?.pagination ?? "none"}
          </p>
          <p>
            {context?.previewState?.status === "loading"
              ? "Preview refresh is running against the backend-owned commerce resolver."
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
      title="Public controls"
      description="Expose bounded Product Table search, filters, sortable headers, and SSR pagination on published pages."
    >
      <CommerceToggleField
        label="Show search input"
        description="Front-end search is intended for authored sources without a fixed Source search term."
        checked={controls.showSearchInput}
        onChange={(next) => updateControls(normalized, onChange, { showSearchInput: next })}
      />
      <CommerceToggleField
        label="Show collection filter"
        description="Uses the authored Source collection scope. Add at least two Source collections above to surface visitor checkboxes."
        checked={controls.showCollectionFilter}
        onChange={(next) => updateControls(normalized, onChange, { showCollectionFilter: next })}
      />
      <CommerceToggleField
        label="Show status filter"
        description="Preview can show authored status options, but published pages stay public-safe and usually collapse to published only."
        checked={controls.showStatusFilter}
        onChange={(next) => updateControls(normalized, onChange, { showStatusFilter: next })}
      />
      <ProductTableSelectField
        label="Sorting UI"
        value={controls.sorting}
        options={productTableSortingModeOptions}
        onChange={(next) =>
          updateControls(normalized, onChange, { sorting: next as ProductTableSortingMode })
        }
      />
      <ProductTableSelectField
        label="Pagination mode"
        value={paginationMode}
        options={productTablePaginationModeOptions}
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
          onChange={(next) => updateControls(normalized, onChange, { pageSize: next })}
        />
      ) : null}
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
    <CommerceEditorSection title="Surfaces" description="Table, header, and empty state colors.">
      <ClearableInputField
        label="Table background"
        value={normalized.style?.tableBackground}
        onChange={(next) => updateStyle(value, onChange, { tableBackground: next })}
        onClear={() => clearStyle(value, onChange, "tableBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Table border"
        value={normalized.style?.tableBorderColor}
        onChange={(next) => updateStyle(value, onChange, { tableBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "tableBorderColor")}
        placeholder="var(--color-border)"
      />
      <ClearableInputField
        label="Header background"
        value={normalized.style?.headerBackground}
        onChange={(next) => updateStyle(value, onChange, { headerBackground: next })}
        onClear={() => clearStyle(value, onChange, "headerBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Empty background"
        value={normalized.style?.emptyBackground}
        onChange={(next) => updateStyle(value, onChange, { emptyBackground: next })}
        onClear={() => clearStyle(value, onChange, "emptyBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Empty border"
        value={normalized.style?.emptyBorderColor}
        onChange={(next) => updateStyle(value, onChange, { emptyBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "emptyBorderColor")}
        placeholder="var(--color-border)"
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
        title="Table source"
        description="Select products visible in this tabular listing."
      >
        <CommerceSourceFields
          source={source}
          onChange={(nextSource) => update(normalized, onChange, { source: nextSource })}
        />
      </CommerceEditorSection>
      <PreviewStatusCard
        value={normalized}
        context={context}
        onRefresh={context?.setPreviewState ? preview.refresh : undefined}
        disabled={preview.isLoading}
      />
      <SurfaceFields value={normalized} onChange={onChange} />
    </div>
  );
}

export function ProductTableVisualEditor({
  value,
  onChange,
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
      <PreviewStatusCard
        value={normalized}
        context={context}
        onRefresh={context?.setPreviewState ? preview.refresh : undefined}
        disabled={preview.isLoading}
      />

      <CommerceEditorSection
        title="Section header"
        description="Optional context above the table. Section title becomes the preferred accessible table label when present."
      >
        <CommerceTextField
          label="Section eyebrow"
          value={normalized.header?.eyebrow}
          onChange={(next) => updateHeader(normalized, onChange, { eyebrow: next })}
        />
        <CommerceTextField
          label="Section title"
          value={normalized.header?.title}
          onChange={(next) => updateHeader(normalized, onChange, { title: next })}
        />
        <CommerceTextareaField
          label="Section description"
          rows={3}
          value={normalized.header?.description}
          onChange={(next) => updateHeader(normalized, onChange, { description: next })}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Columns"
        description="Choose columns visible in the table. Product and Price stay visible when their paired context column is also hidden."
      >
        {productTableColumns.map((column) => (
          <CommerceToggleField
            key={column.key}
            label={column.toggleLabel}
            description={column.guardDescription}
            checked={normalized.fields?.[column.visibilityKey] ?? false}
            onChange={(next) =>
              updateFieldVisibility(normalized, onChange, column.visibilityKey, next)
            }
          />
        ))}
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Column labels"
        description="Customize every Product Table header label from the shared column registry."
      >
        {productTableColumns.map((column) => (
          <CommerceTextField
            key={column.key}
            label={column.labelControlLabel}
            value={normalized.labels?.[column.labelKey]}
            onChange={(next) => updateLabel(normalized, onChange, column.labelKey, next)}
          />
        ))}
      </CommerceEditorSection>

      <PublicControlsFields value={normalized} onChange={onChange} />

      {normalized.fields?.showStock ? (
        <CommerceEditorSection
          title="Stock presentation"
          description="Append normalized quantity to the stock label when the runtime card includes it."
        >
          <CommerceToggleField
            label="Show stock quantity"
            checked={normalized.fields?.showStockQuantity === true}
            onChange={(next) =>
              updateFieldVisibility(normalized, onChange, "showStockQuantity", next)
            }
          />
        </CommerceEditorSection>
      ) : null}

      <CommerceEditorSection
        title="Links and actions"
        description="Product links and actions use the enabled products detail route from Site Settings. When no route is available, runtime keeps the table text-only."
      >
        <ProductTableSelectField
          label="Linked column"
          value={normalized.links?.linkedColumn ?? "none"}
          options={productTableLinkColumnOptions}
          onChange={(next) =>
            updateLinks(normalized, onChange, {
              linkedColumn: next as ProductTableLinkColumn,
            })
          }
        />
        <CommerceToggleField
          label="Show action column"
          checked={normalized.links?.showAction === true}
          onChange={(next) => updateLinks(normalized, onChange, { showAction: next })}
        />
        {normalized.links?.showAction ? (
          <CommerceTextField
            label="Action label"
            value={normalized.links?.actionLabel}
            onChange={(next) => updateLinks(normalized, onChange, { actionLabel: next })}
          />
        ) : null}
        {normalized.links?.linkedColumn !== "none" || normalized.links?.showAction ? (
          <CommerceToggleField
            label="Open product links in new tab"
            checked={normalized.links?.openInNewTab === true}
            onChange={(next) => updateLinks(normalized, onChange, { openInNewTab: next })}
          />
        ) : null}
      </CommerceEditorSection>

      <CommerceEditorSection title="Empty state" description="Shown when no products are resolved.">
        <CommerceTextField
          label="Title"
          value={normalized.emptyState?.title}
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
  const previewQuery = buildProductTableQueryInput(normalized);
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
        title="Runtime payload"
        description="Read-only admin preview from the commerce runtime resolver."
      >
        <PreviewStatusCard
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Query preview"
        description="Normalized query payload sent to commerce runtime resolver."
      >
        <pre className="max-h-52 overflow-auto rounded-md border border-border/70 bg-background p-2 text-xs text-muted-foreground">
          {JSON.stringify(previewQuery, null, 2)}
        </pre>
      </CommerceEditorSection>
    </div>
  );
}

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { previewProductTable } from "@/services/productTablePreviewClient";

import {
  buildProductTableQueryInput,
  normalizeProductTableData,
  productTableColumns,
  productTableDefaults,
  type ProductTableData,
} from "../../../../widgets/core/productTable";
import type { WidgetEditorProps, WidgetPreviewState } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceSourceFields,
  CommerceTextField,
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

const updateFieldVisibility = (
  value: ProductTableData,
  onChange: (next: ProductTableData) => void,
  key: keyof NonNullable<ProductTableData["fields"]>,
  next: boolean
) => {
  const current = normalizeProductTableData(value);
  update(value, onChange, {
    fields: {
      ...current.fields,
      [key]: next,
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

const buildProductTablePreviewKey = (value: ProductTableData) =>
  JSON.stringify(buildProductTableQueryInput(normalizeProductTableData(value)));

const formatResolvedTimestamp = (value: string | undefined) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "No resolved preview snapshot is available yet.";
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return normalized;
  return `Resolved at ${new Date(timestamp).toLocaleString("en-US")}`;
};

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
  });
  const activeRequestKeyRef = useRef<string | undefined>(previewState?.requestKey);

  const setPreviewStateEvent = useEffectEvent((state: WidgetPreviewState | null) => {
    setPreviewState?.(state);
  });

  useEffect(() => {
    previewInputRef.current = {
      source: normalizeProductTableData(value).source,
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
            Query limit: {normalized.source?.limit ?? 0} · Sort:{" "}
            {normalized.source?.sortField ?? "updatedAt"} {normalized.source?.sortDir ?? "desc"}
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

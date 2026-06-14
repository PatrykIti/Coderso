import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewProductGallery } from "@/services/productGalleryPreviewClient";

import {
  buildProductGalleryQueryInput,
  normalizeProductGalleryData,
  productGalleryDefaults,
  resolveProductGalleryRouteState,
  resolveProductGalleryViewAllState,
  type ProductGalleryData,
} from "../../../../widgets/core/productGallery";
import {
  commerceSortFieldLabelMap,
  type CommerceWidgetSortDirection,
  type CommerceWidgetSortField,
} from "../../../../widgets/core/commerceWidgetShared";
import type { WidgetEditorProps, WidgetPreviewState } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceProductSelectionField,
  CommerceSourceFields,
  CommerceTextField,
  CommerceToggleField,
  normalizeSourceForEditor,
} from "./CommerceWidgetEditorShared";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow } from "./WidgetEditorControls";

const variantOptions = [
  {
    id: "cards",
    label: "Cards",
    description: "Card grid for featured products.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Dense card grid with minimal spacing.",
  },
] as const;

const describeCommerceColor = (value: string | undefined) => {
  if (!value?.trim()) return "Theme default";
  if (/^#[0-9a-f]{6}$/i.test(value.trim())) return "Selected swatch";
  return "Saved custom color";
};

const summarizeCount = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const summarizeManualSelectionState = (curation: ProductGalleryData["curation"]) => {
  const count = curation?.productIds?.length ?? 0;
  const countLabel = summarizeCount(count, "product", "products");
  if (curation?.mode === "manual") return countLabel;
  if (count === 0) return "None";
  return `${countLabel} saved, inactive in query mode`;
};

const summarizeStatusFilters = (status: string[] | undefined) => {
  const count = status?.length ?? 0;
  if (count === 0) return "Public-ready default";
  return summarizeCount(count, "status filter", "status filters") + " selected";
};

const summarizeCollectionFilters = (collectionIds: string[] | undefined) => {
  const count = collectionIds?.length ?? 0;
  if (count === 0) return "No collection filter";
  return summarizeCount(count, "collection", "collections") + " selected";
};

const summarizeCommerceSort = (
  field: CommerceWidgetSortField | undefined,
  direction: CommerceWidgetSortDirection | undefined
) => {
  const resolvedField = field ?? "updatedAt";
  const resolvedDirection = direction ?? "desc";

  if (resolvedField === "pricing.amount") {
    return resolvedDirection === "asc" ? "Price, low to high" : "Price, high to low";
  }

  if (resolvedField === "updatedAt") {
    return resolvedDirection === "desc" ? "Recently updated first" : "Oldest updated first";
  }

  if (resolvedField === "createdAt") {
    return resolvedDirection === "desc" ? "Newest first" : "Oldest first";
  }

  if (resolvedField === "publishedAt") {
    return resolvedDirection === "desc" ? "Recently published first" : "Oldest published first";
  }

  const label =
    resolvedField === "slug" ? "Product URL path" : commerceSortFieldLabelMap[resolvedField];
  return `${label}, ${resolvedDirection === "asc" ? "A to Z" : "Z to A"}`;
};

const update = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<ProductGalleryData>
) => {
  onChange(
    normalizeProductGalleryData({
      ...normalizeProductGalleryData(value),
      ...patch,
    })
  );
};

const updateSource = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<NonNullable<ProductGalleryData["source"]>>
) => {
  update(value, onChange, {
    source: {
      ...normalizeProductGalleryData(value).source,
      ...patch,
    },
  });
};

const updateStyle = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<NonNullable<ProductGalleryData["style"]>>
) => {
  update(value, onChange, {
    style: {
      ...normalizeProductGalleryData(value).style,
      ...patch,
    },
  });
};

const clearStyle = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  key: keyof NonNullable<ProductGalleryData["style"]>
) => {
  const current = normalizeProductGalleryData(value);
  const { [key]: _removed, ...nextStyle } = current.style ?? {};
  update(value, onChange, {
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
};

const updateLink = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<NonNullable<ProductGalleryData["link"]>>
) => {
  update(value, onChange, {
    link: {
      ...normalizeProductGalleryData(value).link,
      ...patch,
    },
  });
};

const updateHeader = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<NonNullable<ProductGalleryData["header"]>>
) => {
  update(value, onChange, {
    header: {
      ...normalizeProductGalleryData(value).header,
      ...patch,
    },
  });
};

const updatePagination = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<NonNullable<ProductGalleryData["pagination"]>>
) => {
  update(value, onChange, {
    pagination: {
      ...normalizeProductGalleryData(value).pagination,
      ...patch,
    },
  });
};

const updateCuration = (
  value: ProductGalleryData,
  onChange: (next: ProductGalleryData) => void,
  patch: Partial<NonNullable<ProductGalleryData["curation"]>>
) => {
  update(value, onChange, {
    curation: {
      ...normalizeProductGalleryData(value).curation,
      ...patch,
    },
  });
};

function OptionalPriceField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value?: number;
  placeholder?: string;
  onChange: (next: number | undefined) => void;
}) {
  const displayValue = typeof value === "number" ? (value / 100).toFixed(2) : "";
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input
        inputMode="decimal"
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          const numeric = Number(raw.replace(",", "."));
          if (!Number.isFinite(numeric)) return;
          onChange(Math.max(0, Math.round(numeric * 100)));
        }}
      />
    </label>
  );
}

function SurfaceFields({
  value,
  onChange,
}: {
  value: ProductGalleryData;
  onChange: (next: ProductGalleryData) => void;
}) {
  const normalized = normalizeProductGalleryData(value);

  return (
    <CommerceEditorSection
      id="product-gallery.visual.surfaces"
      mode="visual"
      role="visual"
      title="Surfaces"
      description="Card and empty state styling."
    >
      <SharedColorControl
        controlId="product-gallery.visual.card-background"
        controlPath="style.cardBackground"
        label="Card background"
        value={normalized.style?.cardBackground}
        onChange={(next) => updateStyle(value, onChange, { cardBackground: next })}
        onClear={() => clearStyle(value, onChange, "cardBackground")}
        pickerFallback="#ffffff"
        showValueInput={false}
      />
      <SharedColorControl
        controlId="product-gallery.visual.card-border"
        controlPath="style.cardBorderColor"
        label="Card border"
        value={normalized.style?.cardBorderColor}
        onChange={(next) => updateStyle(value, onChange, { cardBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "cardBorderColor")}
        pickerFallback="#e2e8f0"
        showValueInput={false}
      />
      <SharedColorControl
        controlId="product-gallery.visual.empty-background"
        controlPath="style.emptyBackground"
        label="Empty background"
        value={normalized.style?.emptyBackground}
        onChange={(next) => updateStyle(value, onChange, { emptyBackground: next })}
        onClear={() => clearStyle(value, onChange, "emptyBackground")}
        pickerFallback="#ffffff"
        showValueInput={false}
      />
      <SharedColorControl
        controlId="product-gallery.visual.empty-border"
        controlPath="style.emptyBorderColor"
        label="Empty border"
        value={normalized.style?.emptyBorderColor}
        onChange={(next) => updateStyle(value, onChange, { emptyBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "emptyBorderColor")}
        pickerFallback="#e2e8f0"
        showValueInput={false}
      />
    </CommerceEditorSection>
  );
}

function ProductGalleryLayoutFields({
  value,
  onChange,
}: {
  value: ProductGalleryData;
  onChange: (next: ProductGalleryData) => void;
}) {
  const normalized = normalizeProductGalleryData(value);

  return (
    <CommerceEditorSection
      id="product-gallery.visual.presentation"
      mode="visual"
      role="visual"
      title="Presentation"
      description="Adjust the daily card density and card treatment."
    >
      <label className="space-y-1 text-sm">
        <span className="font-medium text-foreground">Columns</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={normalized.style?.columns ?? "3"}
          onChange={(event) =>
            updateStyle(value, onChange, {
              columns:
                event.target.value === "2" ||
                event.target.value === "3" ||
                event.target.value === "4"
                  ? event.target.value
                  : "3",
            })
          }
        >
          <option value="2">2 columns</option>
          <option value="3">3 columns</option>
          <option value="4">4 columns</option>
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-foreground">Card style</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={normalized.style?.cardStyle ?? "outlined"}
          onChange={(event) =>
            updateStyle(value, onChange, {
              cardStyle: event.target.value === "minimal" ? "minimal" : "outlined",
            })
          }
        >
          <option value="outlined">Outlined</option>
          <option value="minimal">Minimal</option>
        </select>
      </label>

      <ProductGalleryColumnsPreview columns={normalized.style?.columns ?? "3"} />
    </CommerceEditorSection>
  );
}

function ProductGalleryColumnsPreview({ columns }: { columns: string }) {
  const count = columns === "2" || columns === "4" ? Number(columns) : 3;
  return (
    <div
      className="rounded-lg border border-border/70 bg-muted/10 p-3"
      data-product-gallery-columns-preview={columns}
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">Columns preview</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="h-12 rounded-md border border-dashed border-border/70 bg-background/70"
          />
        ))}
      </div>
    </div>
  );
}

function resolvePreviewResolved(
  normalized: ProductGalleryData,
  previewState: WidgetPreviewState | null | undefined
) {
  const previewResolved = previewState?.dataPatch?.resolved;
  if (previewResolved && typeof previewResolved === "object") {
    return previewResolved as NonNullable<ProductGalleryData["resolved"]>;
  }
  return normalized.resolved ?? { items: [], total: 0, resolvedAt: "" };
}

function buildPreviewKey(value: ProductGalleryData) {
  const normalized = normalizeProductGalleryData(value);
  return JSON.stringify({
    source: normalized.source,
    curation: normalized.curation,
  });
}

const productGalleryPreviewStaleMessage = "Source changed. Refresh products to update preview.";

function useProductGalleryPreview({
  value,
  blockId,
  active,
  previewState,
  setPreviewState,
}: {
  value: ProductGalleryData;
  blockId?: string;
  active: boolean;
  previewState?: WidgetPreviewState | null;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
}) {
  const [refreshRequest, setRefreshRequest] = useState<{ key?: string; token: number }>({
    token: 0,
  });
  const queryKey = buildPreviewKey(value);
  const previewKey = `${blockId ?? "product-gallery"}:${queryKey}`;
  const lastResolvedPatchRef = useRef<Record<string, unknown> | undefined>(undefined);
  const previewDataPatchRef = useRef<Record<string, unknown> | undefined>(previewState?.dataPatch);
  const previewRequestKeyRef = useRef<string | undefined>(previewState?.requestKey);
  const previewStatusRef = useRef<WidgetPreviewState["status"] | undefined>(previewState?.status);
  const canPreview = Boolean(setPreviewState);
  const previewInput = useMemo(() => {
    const parsed = JSON.parse(queryKey) as {
      source?: ProductGalleryData["source"];
      curation?: ProductGalleryData["curation"];
    };
    return {
      source: parsed.source,
      curation: parsed.curation,
    } satisfies ProductGalleryData;
  }, [queryKey]);
  const setPreviewStateEvent = useEffectEvent((state: WidgetPreviewState | null) => {
    setPreviewState?.(state);
  });

  useEffect(() => {
    if (previewState?.dataPatch) {
      lastResolvedPatchRef.current = previewState.dataPatch;
    }
  }, [previewState?.dataPatch]);

  useEffect(() => {
    previewDataPatchRef.current = previewState?.dataPatch;
    previewRequestKeyRef.current = previewState?.requestKey;
    previewStatusRef.current = previewState?.status;
  }, [previewState?.dataPatch, previewState?.requestKey, previewState?.status]);

  useEffect(() => {
    if (!active || !canPreview) return;
    let activeRequest = true;
    const previousPatch = lastResolvedPatchRef.current;
    const previewIsStale =
      typeof previewRequestKeyRef.current === "string" &&
      previewRequestKeyRef.current !== previewKey;
    const manualRefreshForCurrentKey =
      refreshRequest.token > 0 && refreshRequest.key === previewKey;

    if (previewIsStale && !manualRefreshForCurrentKey) {
      setPreviewStateEvent({
        status: "idle",
        requestKey: previewKey,
        message: productGalleryPreviewStaleMessage,
        ...(previousPatch ? { dataPatch: previousPatch } : {}),
      });
      return;
    }

    if (
      !manualRefreshForCurrentKey &&
      previewRequestKeyRef.current === previewKey &&
      (previewDataPatchRef.current || previewStatusRef.current === "loading")
    ) {
      return;
    }

    setPreviewStateEvent({
      status: "loading",
      requestKey: previewKey,
      ...(previousPatch ? { dataPatch: previousPatch } : {}),
    });

    previewProductGallery(previewInput)
      .then((resolved) => {
        if (!activeRequest) return;
        lastResolvedPatchRef.current = {
          resolved,
        };
        setPreviewStateEvent({
          status: "ready",
          requestKey: previewKey,
          dataPatch: {
            resolved,
          },
        });
      })
      .catch((error) => {
        if (!activeRequest) return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Product Gallery preview could not be loaded.";
        setPreviewStateEvent({
          status: "error",
          requestKey: previewKey,
          message,
          ...(previousPatch ? { dataPatch: previousPatch } : {}),
        });
      });

    return () => {
      activeRequest = false;
    };
  }, [active, canPreview, previewInput, previewKey, refreshRequest]);

  return {
    refresh: () =>
      setRefreshRequest((current) => ({
        key: previewKey,
        token: current.token + 1,
      })),
    isLoading: previewState?.status === "loading",
  };
}

function previewStatusLabel(
  previewState: WidgetPreviewState | null | undefined,
  previewResolved: NonNullable<ProductGalleryData["resolved"]>
) {
  switch (previewState?.status) {
    case "loading":
      return previewState.dataPatch ? "Refreshing preview" : "Loading preview";
    case "ready":
      return (previewResolved.items?.length ?? 0) === 0 ? "Preview empty" : "Preview ready";
    case "error":
      return "Preview warning";
    case "idle":
      return previewState.message ? "Preview needs refresh" : "Preview idle";
    default:
      return "Preview idle";
  }
}

function ProductGalleryPreviewSummary({
  value,
  context,
  onRefresh,
  disabled,
}: {
  value: ProductGalleryData;
  context: WidgetEditorProps<ProductGalleryData>["context"];
  onRefresh?: () => void;
  disabled?: boolean;
}) {
  const normalized = normalizeProductGalleryData(value);
  const previewResolved = resolvePreviewResolved(normalized, context?.previewState);
  const previewStatus = previewStatusLabel(context?.previewState, previewResolved);
  const status = context?.previewState?.status ?? "idle";
  const tone =
    status === "error"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : status === "loading"
        ? "border-sky-300 bg-sky-50 text-sky-900"
        : "border-border/70 bg-background text-muted-foreground";

  return (
    <div
      className={`space-y-2 rounded-md border p-3 text-sm ${tone}`}
      data-product-gallery-preview-summary={status}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{previewStatus}</p>
          <p className="text-xs">
            Resolved items: {previewResolved.items?.length ?? 0} · Total:{" "}
            {previewResolved.total ?? 0}
          </p>
          <p className="text-xs">
            Last resolved: {previewResolved.resolvedAt || "Not resolved yet"}
          </p>
          {previewResolved.error ? (
            <p className="text-xs text-amber-700">Runtime warning: {previewResolved.error}</p>
          ) : null}
          {context?.previewState?.message ? (
            <p className="text-xs text-amber-700">{context.previewState.message}</p>
          ) : null}
        </div>
        {typeof onRefresh === "function" ? (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={disabled}>
            Refresh products
          </Button>
        ) : null}
      </div>
      {typeof onRefresh !== "function" ? (
        <p className="text-xs">Preview refresh is available inside the page editor.</p>
      ) : null}
    </div>
  );
}

function ProductGalleryRouteNotice({ value }: { value: ProductGalleryData }) {
  const routeState = resolveProductGalleryRouteState(value);

  if (routeState.cardLinks.mode === "ready") {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Product cards link through the configured product detail route.
      </p>
    );
  }

  return (
    <p
      className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      data-product-gallery-route-guidance="missing-route"
    >
      {routeState.cardLinks.reason}
    </p>
  );
}

function ProductGalleryViewAllNotice({
  value,
  previewState,
}: {
  value: ProductGalleryData;
  previewState?: WidgetPreviewState | null;
}) {
  const normalized = normalizeProductGalleryData(value);
  const previewResolved = resolvePreviewResolved(normalized, previewState);
  const viewAllState = resolveProductGalleryViewAllState(
    normalized,
    previewResolved.total ?? 0,
    previewResolved.items?.length ?? 0
  );

  if (viewAllState.mode === "disabled") return null;

  const message =
    viewAllState.mode === "visible"
      ? `More products link points to ${viewAllState.href}.`
      : viewAllState.reason;

  return (
    <p
      className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      data-product-gallery-view-all-guidance={viewAllState.mode}
    >
      {message}
    </p>
  );
}

export function ProductGalleryWizardEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productGalleryDefaults.source?.limit ?? 8,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  const preview = useProductGalleryPreview({
    value: normalized,
    blockId: context?.blockId,
    active: context?.editorMode === "wizard" && typeof context?.setPreviewState === "function",
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        id="product-gallery.wizard.product-source"
        mode="wizard"
        role="source"
        title="Product source"
        description="Select which products are loaded into this gallery."
      >
        <CommerceSourceFields
          source={source}
          onChange={(nextSource) =>
            updateSource(normalized, onChange, {
              limit: nextSource.limit,
              search: nextSource.search,
              collectionIds: nextSource.collectionIds,
              status: nextSource.status,
              sortField: nextSource.sortField,
              sortDir: nextSource.sortDir,
            })
          }
          options={{ allowCollectionFallbackInput: false }}
        />
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground">
          Product Gallery uses collection checkboxes when collections are available. Saved legacy
          collection selections stay active even when a collection is not listed here.
        </div>
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.wizard.price-filters"
        mode="wizard"
        role="source"
        title="Price filters"
        description="Use shopper-facing prices. The widget stores normalized commerce values."
      >
        <OptionalPriceField
          label="Minimum price"
          value={normalized.source?.minPriceMinor}
          placeholder="199.00"
          onChange={(next) => updateSource(normalized, onChange, { minPriceMinor: next })}
        />
        <OptionalPriceField
          label="Maximum price"
          value={normalized.source?.maxPriceMinor}
          placeholder="499.00"
          onChange={(next) => updateSource(normalized, onChange, { maxPriceMinor: next })}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.wizard.preview-summary"
        mode="wizard"
        role="diagnostics"
        title="Preview summary"
        description="Read-only product preview for the selected source."
      >
        <ProductGalleryPreviewSummary
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>
    </div>
  );
}

export function ProductGalleryVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);
  const resolvedVariant = variant === "compact" ? "compact" : "cards";
  const preview = useProductGalleryPreview({
    value: normalized,
    blockId: context?.blockId,
    active: context?.editorMode === "visual" && typeof context?.setPreviewState === "function",
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        id="product-gallery.visual.preview-summary"
        mode="visual"
        role="diagnostics"
        title="Preview summary"
        description="Read-only product preview for the current source and curation."
      >
        <ProductGalleryPreviewSummary
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.variant-structure"
        mode="visual"
        role="visual"
        title="Variant and structure"
        description="Choose the card layout style for this widget."
      >
        <div className="space-y-2">
          {variantOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onVariantChange?.(option.id)}
              className={
                resolvedVariant === option.id
                  ? "w-full rounded-lg border border-primary bg-primary/5 p-3 text-left"
                  : "w-full rounded-lg border bg-background p-3 text-left"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                  {resolvedVariant === option.id ? "Selected" : "Pick"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.section-header"
        mode="visual"
        role="content"
        title="Section header"
        description="Optional title and supporting copy above the gallery cards."
      >
        <CommerceTextField
          label="Title"
          value={normalized.header?.title}
          onChange={(next) => updateHeader(normalized, onChange, { title: next })}
        />
        <CommerceTextField
          label="Description"
          value={normalized.header?.description}
          onChange={(next) => updateHeader(normalized, onChange, { description: next })}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.card-content"
        mode="visual"
        role="content"
        title="Card content"
        description="Choose product metadata visible on each card."
      >
        <CommerceToggleField
          label="Show excerpt"
          checked={normalized.fields?.showExcerpt !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showExcerpt: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show price"
          checked={normalized.fields?.showPrice !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showPrice: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show stock badge"
          checked={normalized.fields?.showStock !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showStock: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show status badge"
          checked={normalized.fields?.showStatus === true}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showStatus: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.product-links"
        mode="visual"
        role="content"
        title="Product links"
        description="Control product card calls to action without typing product-route paths."
      >
        <ProductGalleryRouteNotice value={normalized} />
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Link target</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={normalized.link?.target ?? "same-tab"}
            onChange={(event) =>
              updateLink(normalized, onChange, {
                target: event.target.value === "new-tab" ? "new-tab" : "same-tab",
              })
            }
          >
            <option value="same-tab">Same tab</option>
            <option value="new-tab">New tab</option>
          </select>
        </label>
        <CommerceTextField
          label="CTA label"
          value={normalized.link?.ctaLabel}
          onChange={(next) => updateLink(normalized, onChange, { ctaLabel: next })}
        />
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">CTA style</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={normalized.link?.ctaStyle ?? "text"}
            onChange={(event) =>
              updateLink(normalized, onChange, {
                ctaStyle:
                  event.target.value === "button" || event.target.value === "none"
                    ? event.target.value
                    : "text",
              })
            }
          >
            <option value="text">Text</option>
            <option value="button">Button</option>
            <option value="none">No CTA</option>
          </select>
        </label>
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.curated-products"
        mode="visual"
        role="content"
        title="Curated products"
        description="Optionally choose exact products by name."
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Product selection</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={normalized.curation?.mode ?? "query"}
            onChange={(event) =>
              updateCuration(normalized, onChange, {
                mode: event.target.value === "manual" ? "manual" : "query",
              })
            }
          >
            <option value="query">Use source query</option>
            <option value="manual">Choose products</option>
          </select>
        </label>

        {normalized.curation?.mode === "manual" ? (
          <CommerceProductSelectionField
            label="Selected products"
            selectedIds={normalized.curation?.productIds ?? []}
            maxSelected={48}
            description="Product Gallery preserves the order shown here. Use Up and Down to reorder cards."
            onChange={(productIds) => updateCuration(normalized, onChange, { productIds })}
          />
        ) : (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            The gallery uses the Wizard source query until you switch to selected products.
          </p>
        )}
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.more-products-link"
        mode="visual"
        role="content"
        title="More products link"
        description="Send visitors to an existing page when there are more matching products."
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">More products action</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={normalized.pagination?.mode ?? "none"}
            onChange={(event) =>
              updatePagination(normalized, onChange, {
                mode: event.target.value === "view-all" ? "view-all" : "none",
              })
            }
          >
            <option value="none">No extra navigation</option>
            <option value="view-all">Show link to page</option>
          </select>
        </label>

        {normalized.pagination?.mode === "view-all" ? (
          <>
            <LinkDestinationField
              fieldId="product-gallery-view-all"
              label="Destination page"
              value={normalized.pagination?.viewAllHref}
              onChange={(next) => updatePagination(normalized, onChange, { viewAllHref: next })}
              emptyLabel="No page selected"
              helpText="Choose the page visitors should open for more products."
            />
            <CommerceTextField
              label="Link label"
              value={normalized.pagination?.viewAllLabel}
              onChange={(next) => updatePagination(normalized, onChange, { viewAllLabel: next })}
            />
            <ProductGalleryViewAllNotice value={normalized} previewState={context?.previewState} />
          </>
        ) : null}
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.visual.empty-state"
        mode="visual"
        role="content"
        title="Empty state"
        description="Shown when query returns no products."
      >
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
      <ProductGalleryLayoutFields value={normalized} onChange={onChange} />
    </div>
  );
}

export function ProductGalleryAdvancedEditor({
  value,
  context,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);
  const previewResolved = resolvePreviewResolved(normalized, context?.previewState);
  const queryInput = buildProductGalleryQueryInput(normalized);
  const routeState = resolveProductGalleryRouteState(normalized);
  const viewAllState = resolveProductGalleryViewAllState(
    normalized,
    previewResolved.total ?? 0,
    previewResolved.items?.length ?? 0
  );
  const preview = useProductGalleryPreview({
    value: normalized,
    blockId: context?.blockId,
    active:
      (context?.editorMode === "advanced" || context?.editorMode === undefined) &&
      typeof context?.setPreviewState === "function",
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Advanced mode is read-only. Use Wizard or Visual for product source, curation, links, empty
        state, and presentation changes.
      </p>

      <CommerceEditorSection
        id="product-gallery.advanced.product-behavior"
        mode="advanced"
        role="diagnostics"
        title="Product behavior"
        description="Read-only source, curation, route, and pagination diagnostics."
      >
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-source-mode"
          label="Source mode"
          path="source"
          value={normalized.curation?.mode === "manual" ? "Selected products" : "Query results"}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-selected-products"
          label={
            normalized.curation?.mode === "manual" ? "Selected products" : "Saved manual selection"
          }
          path="curation.productIds"
          value={summarizeManualSelectionState(normalized.curation)}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-card-route"
          label="Card route"
          path="link.basePath"
          value={
            routeState.cardLinks.mode === "ready"
              ? "Configured"
              : "Missing - cards and CTA are non-clickable"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-more-products"
          label="More products link"
          path="pagination"
          value={
            viewAllState.mode === "visible"
              ? "Shown"
              : viewAllState.mode === "missing_destination"
                ? "Hidden - destination missing"
                : viewAllState.mode === "all_products_visible"
                  ? "Hidden - all products shown"
                  : "Hidden"
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.advanced.source-summary"
        mode="advanced"
        role="diagnostics"
        title="Source summary"
        description="Human-readable query state. Change product source and curation in Wizard or Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-limit"
          label="Product limit"
          path="source.limit"
          value={summarizeCount(queryInput.pagination.limit, "product", "products")}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-search"
          label="Search"
          path="source.search"
          value={normalized.source?.search?.trim() ? "Configured" : "None"}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-collections"
          label="Collections"
          path="source.collectionIds"
          value={summarizeCollectionFilters(normalized.source?.collectionIds)}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-status"
          label="Status filters"
          path="source.status"
          value={summarizeStatusFilters(normalized.source?.status)}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-sort"
          label="Sort"
          path="source.sortField"
          value={summarizeCommerceSort(normalized.source?.sortField, normalized.source?.sortDir)}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.advanced.preview-status"
        mode="advanced"
        role="diagnostics"
        title="Preview status"
        description="Refresh preview data without publishing the page."
      >
        <ProductGalleryPreviewSummary
          value={normalized}
          context={context}
          onRefresh={context?.setPreviewState ? preview.refresh : undefined}
          disabled={preview.isLoading}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.advanced.surface-summary"
        mode="advanced"
        role="diagnostics"
        title="Surface summary"
        description="Read-only color state. Change card and empty-state colors in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-card-background"
          label="Card background"
          path="style.cardBackground"
          value={describeCommerceColor(normalized.style?.cardBackground)}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-card-border"
          label="Card border"
          path="style.cardBorderColor"
          value={describeCommerceColor(normalized.style?.cardBorderColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-empty-state"
          label="Empty state colors"
          path="style"
          value={`Background: ${describeCommerceColor(normalized.style?.emptyBackground)}, border: ${describeCommerceColor(normalized.style?.emptyBorderColor)}`}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        id="product-gallery.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Editor ownership split for the Product Gallery v2 contract."
      >
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-contract-wizard"
          label="Wizard owns"
          path="source"
          value="One-time product source setup and shopper-facing price filters."
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-contract-visual"
          label="Visual owns"
          path="header"
          value="Section header, card content, links, curation, more-products link, empty state, surfaces, and presentation."
        />
        <ReadonlyWidgetSummaryRow
          id="product-gallery-advanced-contract-advanced"
          label="Advanced owns"
          path="editorContract"
          value="Read-only product behavior, source summaries, preview status, surface diagnostics, and contract ownership."
        />
      </CommerceEditorSection>
    </div>
  );
}

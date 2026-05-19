import { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { previewProductCompare } from "@/services/productComparePreviewClient";

import {
  buildProductCompareQueryInput,
  normalizeProductCompareData,
  productCompareAttributeKeys,
  productCompareCtaModes,
  productCompareDefaults,
  productCompareMoneyLocales,
  productCompareQuantityDisplayModes,
  type ProductCompareAttributeKey,
  type ProductCompareData,
} from "../../../../widgets/core/productCompare";
import type { WidgetEditorProps, WidgetPreviewState } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceSourceFields,
  CommerceTextareaField,
  CommerceTextField,
  CommerceToggleField,
  normalizeSourceForEditor,
  type CommerceSourceFieldOptions,
} from "./CommerceWidgetEditorShared";
import { ClearableInputField } from "./ClearableFields";

const productCompareSourceFieldOptions: CommerceSourceFieldOptions = {
  limitMax: 12,
  copy: {
    searchPlaceholder: "product title or slug",
    searchHelpText: "Use search to narrow Product Compare candidates before final curation.",
    collectionFallbackLabel: "Collection IDs (fallback)",
    collectionHelpText:
      "Enter commerce collection IDs here when the picker is empty or unavailable.",
    statusHelpText:
      "Empty keeps the current runtime defaults. Use Published for public-ready comparisons.",
  },
};

const toProductCompareProductIdsText = (productIds: string[] | undefined) =>
  (productIds ?? []).join("\n");

const fromProductCompareProductIdsText = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

const normalizeText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

const resolvePreviewErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Resolved Product Compare preview could not be loaded.";
};

const update = (
  value: ProductCompareData,
  onChange: (next: ProductCompareData) => void,
  patch: Partial<ProductCompareData>
) => {
  onChange(
    normalizeProductCompareData({
      ...normalizeProductCompareData(value),
      ...patch,
    })
  );
};

const updateStyle = (
  value: ProductCompareData,
  onChange: (next: ProductCompareData) => void,
  patch: Partial<NonNullable<ProductCompareData["style"]>>
) => {
  update(value, onChange, {
    style: {
      ...normalizeProductCompareData(value).style,
      ...patch,
    },
  });
};

const clearStyle = (
  value: ProductCompareData,
  onChange: (next: ProductCompareData) => void,
  key: keyof NonNullable<ProductCompareData["style"]>
) => {
  const current = normalizeProductCompareData(value);
  const { [key]: _removed, ...nextStyle } = current.style ?? {};
  update(value, onChange, {
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
};

const updateRowVisibility = (
  value: ProductCompareData,
  onChange: (next: ProductCompareData) => void,
  key: ProductCompareAttributeKey,
  visible: boolean
) => {
  const current = normalizeProductCompareData(value);
  update(value, onChange, {
    rows: (current.rows ?? []).map((row) => (row.key === key ? { ...row, visible } : row)),
  });
};

const resolvePreviewResolvedData = (
  normalized: ProductCompareData,
  previewState: WidgetPreviewState | null | undefined
) => {
  const previewResolved = previewState?.dataPatch?.resolved;
  if (previewResolved && typeof previewResolved === "object") {
    return previewResolved as NonNullable<ProductCompareData["resolved"]>;
  }
  return normalized.resolved ?? { rows: [], total: 0, resolvedAt: "" };
};

function useProductComparePreviewSync({
  active,
  value,
  previewState,
  setPreviewState,
}: {
  active: boolean;
  value: ProductCompareData;
  previewState: WidgetPreviewState | null | undefined;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const latestDataPatchRef = useRef<WidgetPreviewState["dataPatch"] | undefined>(
    previewState?.dataPatch
  );

  useEffect(() => {
    latestDataPatchRef.current = previewState?.dataPatch;
  }, [previewState?.dataPatch]);

  useEffect(() => {
    if (!active || !setPreviewState) return;
    let activeRequest = true;
    const dataPatch = latestDataPatchRef.current;
    setPreviewState({
      status: "loading",
      ...(dataPatch ? { dataPatch } : {}),
    });

    previewProductCompare(value)
      .then((resolved) => {
        if (!activeRequest) return;
        setPreviewState({
          status: "ready",
          dataPatch: {
            resolved,
          },
        });
      })
      .catch((error) => {
        if (!activeRequest) return;
        setPreviewState({
          status: "error",
          message: resolvePreviewErrorMessage(error),
          ...(dataPatch ? { dataPatch } : {}),
        });
      });

    return () => {
      activeRequest = false;
    };
  }, [active, refreshToken, setPreviewState, value]);

  return {
    refresh: () => setRefreshToken((current) => current + 1),
    isLoading: previewState?.status === "loading",
  };
}

function SurfaceFields({
  value,
  onChange,
}: {
  value: ProductCompareData;
  onChange: (next: ProductCompareData) => void;
}) {
  const normalized = normalizeProductCompareData(value);

  return (
    <CommerceEditorSection title="Surfaces" description="Comparison table and empty state colors.">
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

function ProductCompareSelectField({
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

function PreviewStatusCard({
  value,
  context,
  onRefresh,
}: {
  value: ProductCompareData;
  context: WidgetEditorProps<ProductCompareData>["context"];
  onRefresh?: () => void;
}) {
  const normalized = normalizeProductCompareData(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const selectedCount = normalized.source?.productIds?.length ?? 0;
  const guidanceTone =
    context?.previewState?.status === "error"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : context?.previewState?.status === "loading"
        ? "border-sky-300 bg-sky-50 text-sky-900"
        : "border-border/70 bg-background text-muted-foreground";

  return (
    <div className={`space-y-2 rounded-md border p-3 text-xs ${guidanceTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p>
            Resolved rows: {resolved.rows?.length ?? 0} of {resolved.total ?? 0}
          </p>
          <p>
            Selected product IDs: {selectedCount || "None"} · Limit: {normalized.source?.limit ?? 0}
          </p>
          <p>
            {context?.previewState?.status === "loading"
              ? "Preview refresh is running against the backend-owned commerce resolver."
              : context?.previewState?.status === "error"
                ? (context.previewState.message ??
                  "Preview refresh failed. Showing the last safe preview data when available.")
                : resolved.resolvedAt
                  ? `Resolved at ${resolved.resolvedAt}`
                  : "No resolved preview snapshot is available yet."}
          </p>
          {resolved.error ? <p>Runtime warning: {resolved.error}</p> : null}
        </div>
        {typeof onRefresh === "function" ? (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            onClick={onRefresh}
          >
            Refresh preview
          </button>
        ) : null}
      </div>
    </div>
  );
}

function QuerySummarySection({ value }: { value: ProductCompareData }) {
  const normalized = normalizeProductCompareData(value);
  const query = buildProductCompareQueryInput(normalized);
  const selectedCount = normalized.source?.productIds?.length ?? 0;
  const summaryLines =
    selectedCount > 0
      ? [
          `Curated compare set: ${selectedCount} selected products in manual order.`,
          "Search, collection, and status filters are ignored while selected IDs are present.",
          `Runtime pagination limit: ${query.pagination.limit}`,
        ]
      : [
          `Query limit: ${query.pagination.limit}`,
          `Search: ${normalizeText(normalized.source?.search) || "None"}`,
          `Collections: ${(normalized.source?.collectionIds ?? []).join(", ") || "None"}`,
          `Status filters: ${(normalized.source?.status ?? []).join(", ") || "Runtime default"}`,
          `Sort: ${normalized.source?.sortField ?? "title"} ${normalized.source?.sortDir ?? "asc"}`,
        ];

  return (
    <CommerceEditorSection
      title="Query preview"
      description="Normalized backend query summary and optional raw payload."
    >
      <div className="space-y-1 rounded-md border border-border/70 bg-background p-3 text-xs text-muted-foreground">
        {summaryLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <details className="rounded-md border border-border/70 bg-background p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          Show raw query JSON
        </summary>
        <pre className="mt-3 max-h-52 overflow-auto">{JSON.stringify(query, null, 2)}</pre>
      </details>
    </CommerceEditorSection>
  );
}

export function ProductCompareWizardEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);
  const source = normalizeSourceForEditor(
    normalized.source,
    {
      limit: productCompareDefaults.source?.limit ?? 3,
      sortField: "title",
      sortDir: "asc",
    },
    productCompareSourceFieldOptions
  );
  const selectedProductIds = normalized.source?.productIds ?? [];
  const selectedProductIdsRef = useRef(selectedProductIds);
  useEffect(() => {
    selectedProductIdsRef.current = normalized.source?.productIds ?? [];
  }, [normalized.source?.productIds]);
  const { refresh } = useProductComparePreviewSync({
    active: context?.editorMode === "wizard" && typeof context?.setPreviewState === "function",
    value,
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
  });
  const dense = source.limit > 5 || selectedProductIds.length > 5;

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Comparison source"
        description="Select products used in the comparison matrix."
      >
        <CommerceSourceFields
          source={source}
          onChange={(nextSource) =>
            update(value, onChange, {
              source: {
                ...nextSource,
                productIds: selectedProductIdsRef.current,
              },
            })
          }
          options={productCompareSourceFieldOptions}
        />
        <CommerceTextareaField
          label="Selected product IDs"
          rows={3}
          value={toProductCompareProductIdsText(normalized.source?.productIds)}
          onChange={(next) => {
            const productIds = fromProductCompareProductIdsText(next);
            selectedProductIdsRef.current = productIds;
            update(value, onChange, {
              source: {
                ...normalizeProductCompareData(value).source,
                productIds,
              },
            });
          }}
        />
        <p className="text-xs text-muted-foreground">
          One ID per line or comma-separated. When provided, Product Compare preserves this order
          and ignores search, collection, and status filters.
        </p>
      </CommerceEditorSection>

      <PreviewStatusCard
        value={value}
        context={context}
        onRefresh={typeof context?.setPreviewState === "function" ? refresh : undefined}
      />

      <CommerceEditorSection
        title="Limit guidance"
        description="Comparison matrix is most readable with 2-5 products."
      >
        <p
          className={`rounded-md border p-2 text-xs ${
            dense
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-border/70 bg-background text-muted-foreground"
          }`}
        >
          {dense
            ? `Current compare density can be hard to read on mobile (${Math.max(source.limit, selectedProductIds.length)} products in play). Prefer 2-5 products or switch to Product Table for dense catalogs.`
            : `Current limit: ${source.limit}. A curated set of 2-5 products stays easiest to compare.`}
        </p>
      </CommerceEditorSection>
    </div>
  );
}

export function ProductCompareVisualEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);
  const { refresh } = useProductComparePreviewSync({
    active: context?.editorMode === "visual" && typeof context?.setPreviewState === "function",
    value,
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <PreviewStatusCard
        value={value}
        context={context}
        onRefresh={typeof context?.setPreviewState === "function" ? refresh : undefined}
      />

      <CommerceEditorSection
        title="Section copy"
        description="Name the comparison section and its accessible caption."
      >
        <CommerceTextField
          label="Title"
          value={normalized.section?.title}
          onChange={(next) =>
            update(value, onChange, {
              section: {
                ...normalized.section,
                title: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Description"
          value={normalized.section?.description}
          onChange={(next) =>
            update(value, onChange, {
              section: {
                ...normalized.section,
                description: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Table caption"
          value={normalized.section?.caption}
          onChange={(next) =>
            update(value, onChange, {
              section: {
                ...normalized.section,
                caption: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Hide caption visually"
          checked={normalized.section?.hideCaption !== false}
          onChange={(next) =>
            update(value, onChange, {
              section: {
                ...normalized.section,
                hideCaption: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Attribute rows"
        description="Control which comparison attributes are visible."
      >
        <CommerceToggleField
          label="Show price"
          checked={normalized.fields?.showPrice !== false}
          onChange={(next) => updateRowVisibility(value, onChange, "price", next)}
        />
        <CommerceToggleField
          label="Show compare-at price"
          checked={normalized.fields?.showCompareAt !== false}
          onChange={(next) => updateRowVisibility(value, onChange, "compareAt", next)}
        />
        <CommerceToggleField
          label="Show stock"
          checked={normalized.fields?.showStock !== false}
          onChange={(next) => updateRowVisibility(value, onChange, "stock", next)}
        />
        <CommerceToggleField
          label="Show stock quantity"
          checked={normalized.fields?.showStockQuantity !== false}
          onChange={(next) => updateRowVisibility(value, onChange, "quantity", next)}
        />
        <CommerceToggleField
          label="Show slug"
          checked={normalized.fields?.showSlug === true}
          onChange={(next) => updateRowVisibility(value, onChange, "slug", next)}
        />
        <CommerceToggleField
          label="Show excerpt"
          checked={normalized.fields?.showExcerpt === true}
          onChange={(next) => updateRowVisibility(value, onChange, "excerpt", next)}
        />
      </CommerceEditorSection>

      <CommerceEditorSection title="Labels" description="Customize labels shown in the comparison.">
        <CommerceTextField
          label="Attribute column"
          value={normalized.labels?.attributeHeader}
          onChange={(next) =>
            update(value, onChange, {
              labels: {
                ...normalized.labels,
                attributeHeader: next,
              },
            })
          }
        />
        {productCompareAttributeKeys.map((key) => (
          <CommerceTextField
            key={key}
            label={key === "compareAt" ? "Compare at" : key.charAt(0).toUpperCase() + key.slice(1)}
            value={normalized.labels?.[key]}
            onChange={(next) =>
              update(value, onChange, {
                labels: {
                  ...normalized.labels,
                  [key]: next,
                },
              })
            }
          />
        ))}
        <CommerceTextField
          label="In-stock label"
          value={normalized.labels?.inStock}
          onChange={(next) =>
            update(value, onChange, {
              labels: {
                ...normalized.labels,
                inStock: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Out-of-stock label"
          value={normalized.labels?.outOfStock}
          onChange={(next) =>
            update(value, onChange, {
              labels: {
                ...normalized.labels,
                outOfStock: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Backorder label"
          value={normalized.labels?.backorder}
          onChange={(next) =>
            update(value, onChange, {
              labels: {
                ...normalized.labels,
                backorder: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Product columns"
        description="Control images, links, and CTA output in each product header."
      >
        <p className="text-xs text-muted-foreground">
          Product links and CTAs use the enabled products detail route from Site Settings. When no
          route is available, runtime keeps the header text-only.
        </p>
        <CommerceToggleField
          label="Show product images"
          checked={normalized.header?.showImages === true}
          onChange={(next) =>
            update(value, onChange, {
              header: {
                ...normalized.header,
                showImages: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Link product titles"
          checked={normalized.header?.linkTitles === true}
          onChange={(next) =>
            update(value, onChange, {
              header: {
                ...normalized.header,
                linkTitles: next,
              },
            })
          }
        />
        <ProductCompareSelectField
          label="CTA mode"
          value={normalized.header?.ctaMode ?? "none"}
          options={productCompareCtaModes.map((mode) => ({
            value: mode,
            label: mode === "none" ? "No CTA" : "View product",
          }))}
          onChange={(next) =>
            update(value, onChange, {
              header: {
                ...normalized.header,
                ctaMode: next as NonNullable<ProductCompareData["header"]>["ctaMode"],
              },
            })
          }
        />
        {normalized.header?.ctaMode === "view_product" ? (
          <CommerceTextField
            label="CTA label"
            value={normalized.header?.ctaLabel}
            onChange={(next) =>
              update(value, onChange, {
                header: {
                  ...normalized.header,
                  ctaLabel: next,
                },
              })
            }
          />
        ) : null}
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Formatting"
        description="Use bounded formatting options for money and quantity output."
      >
        <ProductCompareSelectField
          label="Money locale"
          value={normalized.format?.moneyLocale ?? "en-US"}
          options={productCompareMoneyLocales.map((locale) => ({ value: locale, label: locale }))}
          onChange={(next) =>
            update(value, onChange, {
              format: {
                ...normalized.format,
                moneyLocale: next as NonNullable<ProductCompareData["format"]>["moneyLocale"],
              },
            })
          }
        />
        <ProductCompareSelectField
          label="Quantity display"
          value={normalized.format?.quantityDisplay ?? "exact"}
          options={productCompareQuantityDisplayModes.map((mode) => ({
            value: mode,
            label: mode === "exact" ? "Exact quantity" : "Compact threshold",
          }))}
          onChange={(next) =>
            update(value, onChange, {
              format: {
                ...normalized.format,
                quantityDisplay: next as NonNullable<
                  ProductCompareData["format"]
                >["quantityDisplay"],
              },
            })
          }
        />
        <CommerceTextField
          label="Compact quantity limit"
          value={String(normalized.format?.quantityCompactLimit ?? 99)}
          onChange={(next) =>
            update(value, onChange, {
              format: {
                ...normalized.format,
                quantityCompactLimit: Number(next),
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Layout"
        description="Highlight a product and keep table headers visible in dense tables."
      >
        <CommerceTextField
          label="Featured product ID"
          value={normalized.layout?.featuredProductId}
          onChange={(next) =>
            update(value, onChange, {
              layout: {
                ...normalized.layout,
                featuredProductId: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Sticky table header"
          checked={normalized.layout?.stickyHeader === true}
          onChange={(next) =>
            update(value, onChange, {
              layout: {
                ...normalized.layout,
                stickyHeader: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection title="Empty state" description="Shown when no products are resolved.">
        <CommerceTextField
          label="Title"
          value={normalized.emptyState?.title}
          onChange={(next) =>
            update(value, onChange, {
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
            update(value, onChange, {
              emptyState: {
                ...normalized.emptyState,
                description: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <SurfaceFields value={value} onChange={onChange} />
    </div>
  );
}

export function ProductCompareAdvancedEditor({
  value,
  context,
}: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);
  const { refresh } = useProductComparePreviewSync({
    active: context?.editorMode === "advanced" && typeof context?.setPreviewState === "function",
    value,
    previewState: context?.previewState,
    setPreviewState: context?.setPreviewState,
  });
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Runtime payload"
        description="Read-only runtime diagnostics from SSR and admin preview refreshes."
      >
        <PreviewStatusCard
          value={value}
          context={context}
          onRefresh={typeof context?.setPreviewState === "function" ? refresh : undefined}
        />
        {resolved.error ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Runtime warning: {resolved.error}
          </div>
        ) : null}
      </CommerceEditorSection>

      <QuerySummarySection value={value} />
    </div>
  );
}

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewProductGallery } from "@/services/productGalleryPreviewClient";

import {
  buildProductGalleryQueryInput,
  normalizeProductGalleryData,
  productGalleryDefaults,
  type ProductGalleryData,
} from "../../../../widgets/core/productGallery";
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

function OptionalIntegerField({
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
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input
        inputMode="numeric"
        value={typeof value === "number" ? String(value) : ""}
        placeholder={placeholder}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          const numeric = Number(raw);
          if (!Number.isFinite(numeric)) return;
          onChange(Math.max(0, Math.floor(numeric)));
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
    <CommerceEditorSection title="Surfaces" description="Card and empty state styling.">
      <ClearableInputField
        label="Card background"
        value={normalized.style?.cardBackground}
        onChange={(next) => updateStyle(value, onChange, { cardBackground: next })}
        onClear={() => clearStyle(value, onChange, "cardBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Card border"
        value={normalized.style?.cardBorderColor}
        onChange={(next) => updateStyle(value, onChange, { cardBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "cardBorderColor")}
        placeholder="var(--color-border)"
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
  const [refreshToken, setRefreshToken] = useState(0);
  const queryKey = buildPreviewKey(value);
  const previewKey = `${blockId ?? "product-gallery"}:${queryKey}`;
  const lastResolvedPatchRef = useRef<Record<string, unknown> | undefined>(undefined);
  const previewDataPatchRef = useRef<Record<string, unknown> | undefined>(previewState?.dataPatch);
  const previewRequestKeyRef = useRef<string | undefined>(previewState?.requestKey);
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
  }, [previewState?.dataPatch, previewState?.requestKey]);

  useEffect(() => {
    if (!active || !canPreview) return;
    let activeRequest = true;
    const previousPatch = lastResolvedPatchRef.current;
    const previewIsStale =
      typeof previewRequestKeyRef.current === "string" &&
      previewRequestKeyRef.current !== previewKey;

    if (refreshToken === 0) {
      if (previewIsStale) {
        setPreviewStateEvent({
          status: "idle",
          requestKey: previewKey,
          message: productGalleryPreviewStaleMessage,
          ...(previousPatch ? { dataPatch: previousPatch } : {}),
        });
        return;
      }
      if (previewDataPatchRef.current) return;
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
  }, [active, canPreview, previewInput, previewKey, refreshToken]);

  return {
    refresh: () => setRefreshToken((current) => current + 1),
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

export function ProductGalleryWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productGalleryDefaults.source?.limit ?? 8,
    sortField: "updatedAt",
    sortDir: "desc",
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
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
        />
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground">
          Product Gallery keeps the shared commerce collection picker intact. If the checkbox list
          is empty or stale, keep using the fallback IDs field and the manual collection count you
          already selected.
        </div>
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Price filters"
        description="Use commerce minor units here. Example: `19900` means `$199.00`."
      >
        <OptionalIntegerField
          label="Minimum price (minor units)"
          value={normalized.source?.minPriceMinor}
          placeholder="19900"
          onChange={(next) => updateSource(normalized, onChange, { minPriceMinor: next })}
        />
        <OptionalIntegerField
          label="Maximum price (minor units)"
          value={normalized.source?.maxPriceMinor}
          placeholder="49900"
          onChange={(next) => updateSource(normalized, onChange, { maxPriceMinor: next })}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Layout"
        description="Configure card density for this gallery section."
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Columns</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={normalized.style?.columns ?? "3"}
            onChange={(event) =>
              update(normalized, onChange, {
                style: {
                  ...normalized.style,
                  columns:
                    event.target.value === "2" ||
                    event.target.value === "3" ||
                    event.target.value === "4"
                      ? event.target.value
                      : "3",
                },
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
              update(normalized, onChange, {
                style: {
                  ...normalized.style,
                  cardStyle: event.target.value === "minimal" ? "minimal" : "outlined",
                },
              })
            }
          >
            <option value="outlined">Outlined</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>

        <ProductGalleryColumnsPreview columns={normalized.style?.columns ?? "3"} />
      </CommerceEditorSection>
    </div>
  );
}

export function ProductGalleryVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
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
        title="Product links"
        description="Link cards only when you have an explicit safe route prefix."
      >
        <CommerceTextField
          label="Route prefix"
          value={normalized.link?.basePath}
          placeholder="/catalog"
          onChange={(next) => updateLink(normalized, onChange, { basePath: next })}
        />
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
    </div>
  );
}

export function ProductGalleryAdvancedEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);
  const previewResolved = resolvePreviewResolved(normalized, context?.previewState);
  const previewStatus = previewStatusLabel(context?.previewState, previewResolved);
  const queryPreview = useMemo(() => {
    if (normalized.curation?.mode === "manual") {
      return JSON.stringify(
        {
          mode: "manual",
          productIds: normalized.curation.productIds,
          limit: normalized.source?.limit,
        },
        null,
        2
      );
    }
    return JSON.stringify(buildProductGalleryQueryInput(normalized), null, 2);
  }, [normalized]);
  const { refresh } = useProductGalleryPreview({
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
      <CommerceEditorSection
        title="Product behavior"
        description="Pagination and curated ordering stay diagnostic and bounded here."
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Curation mode</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={normalized.curation?.mode ?? "query"}
            onChange={(event) =>
              updateCuration(normalized, onChange, {
                mode: event.target.value === "manual" ? "manual" : "query",
              })
            }
          >
            <option value="query">Query results</option>
            <option value="manual">Manual ID order</option>
          </select>
        </label>

        {normalized.curation?.mode === "manual" ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">Product IDs</span>
            <textarea
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={(normalized.curation?.productIds ?? []).join("\n")}
              onChange={(event) =>
                updateCuration(normalized, onChange, {
                  productIds: event.target.value
                    .split("\n")
                    .map((entry) => entry.trim())
                    .filter((entry) => entry.length > 0),
                })
              }
            />
            <span className="block text-xs text-muted-foreground">
              One product ID per line. Order is preserved. Keep this bounded to explicit curated IDs
              only.
            </span>
          </label>
        ) : null}

        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Pagination</span>
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
            <option value="view-all">View all link</option>
          </select>
        </label>

        {normalized.pagination?.mode === "view-all" ? (
          <>
            <CommerceTextField
              label="View all href"
              value={normalized.pagination?.viewAllHref}
              placeholder="/catalog"
              onChange={(next) => updatePagination(normalized, onChange, { viewAllHref: next })}
            />
            <CommerceTextField
              label="View all label"
              value={normalized.pagination?.viewAllLabel}
              onChange={(next) => updatePagination(normalized, onChange, { viewAllLabel: next })}
            />
          </>
        ) : null}
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Diagnostics"
        description="Media IDs and preview payloads stay editor-only diagnostics."
      >
        <CommerceToggleField
          label="Show media hint"
          description="Editor-only diagnostic helper showing resolved primary media IDs in preview."
          checked={normalized.fields?.showMediaHint === true}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showMediaHint: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Preview status"
        description="Refresh preview data without publishing the page."
      >
        <div className="rounded-md border border-border/70 bg-background p-3 text-sm">
          <p className="font-medium text-foreground">{previewStatus}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Resolved items: {previewResolved.items?.length ?? 0} · Total:{" "}
            {previewResolved.total ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last resolved: {previewResolved.resolvedAt || "Not resolved yet"}
          </p>
          {previewResolved.error ? (
            <p className="mt-2 text-xs text-amber-700">Runtime warning: {previewResolved.error}</p>
          ) : null}
          {context?.previewState?.message ? (
            <p className="mt-2 text-xs text-amber-700">{context.previewState.message}</p>
          ) : null}
        </div>
        {context?.setPreviewState ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={context.previewState?.status === "loading"}
          >
            Refresh products
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Preview refresh is available inside page and widget-template editors.
          </p>
        )}
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Query preview"
        description="Normalized Product Gallery payload sent to runtime or preview."
      >
        <pre className="max-h-52 overflow-auto rounded-md border border-border/70 bg-background p-2 text-xs text-muted-foreground">
          {queryPreview}
        </pre>
      </CommerceEditorSection>
    </div>
  );
}

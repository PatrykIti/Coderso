import {
  buildProductGalleryQueryInput,
  normalizeProductGalleryData,
  productGalleryDefaults,
  type ProductGalleryData,
} from "../../../../widgets/core/productGallery";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceSourceFields,
  CommerceTextField,
  CommerceToggleField,
  normalizeSourceForEditor,
} from "./CommerceWidgetEditorShared";

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
          onChange={(nextSource) => update(normalized, onChange, { source: nextSource })}
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
                  cardStyle:
                    event.target.value === "minimal" ? "minimal" : "outlined",
                },
              })
            }
          >
            <option value="outlined">Outlined</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
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
          label="Show media hint"
          description="Technical helper showing primary media ID in cards."
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

      <CommerceEditorSection title="Empty state" description="Shown when query returns no products.">
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
    </div>
  );
}

export function ProductGalleryAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductGalleryData>) {
  const normalized = normalizeProductGalleryData(value);
  const previewQuery = buildProductGalleryQueryInput(normalized);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Runtime payload"
        description="Data is injected by runtime resolver before render."
      >
        <div className="rounded-md border border-border/70 bg-background p-2 text-xs text-muted-foreground">
          Resolved items: {normalized.resolved?.items?.length ?? 0} · Total: {normalized.resolved?.total ?? 0}
        </div>
        <CommerceTextField
          label="Runtime error flag"
          value={normalized.resolved?.error ?? ""}
          onChange={(next) =>
            update(normalized, onChange, {
              resolved: {
                ...normalized.resolved,
                error: next,
              },
            })
          }
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

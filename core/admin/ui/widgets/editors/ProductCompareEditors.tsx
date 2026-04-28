import {
  buildProductCompareQueryInput,
  normalizeProductCompareData,
  productCompareDefaults,
  type ProductCompareData,
} from "../../../../widgets/core/productCompare";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceSourceFields,
  CommerceTextField,
  CommerceToggleField,
  normalizeSourceForEditor,
} from "./CommerceWidgetEditorShared";

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

export function ProductCompareWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productCompareDefaults.source?.limit ?? 3,
    sortField: "title",
    sortDir: "asc",
  });

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Comparison source"
        description="Select products used in the comparison matrix."
      >
        <CommerceSourceFields
          source={source}
          onChange={(nextSource) => update(normalized, onChange, { source: nextSource })}
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Limit guidance"
        description="Comparison matrix is most readable with 2-5 products."
      >
        <p className="rounded-md border border-border/70 bg-background p-2 text-xs text-muted-foreground">
          Current limit: {source.limit}. For dense catalogs prefer Product Table widget.
        </p>
      </CommerceEditorSection>
    </div>
  );
}

export function ProductCompareVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Attribute rows"
        description="Control which comparison attributes are visible."
      >
        <CommerceToggleField
          label="Show compare-at price"
          checked={normalized.fields?.showCompareAt !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showCompareAt: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show stock quantity"
          checked={normalized.fields?.showStockQuantity !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showStockQuantity: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show slug"
          checked={normalized.fields?.showSlug === true}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showSlug: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Labels"
        description="Customize labels shown in the left column."
      >
        <CommerceTextField
          label="Price"
          value={normalized.labels?.price}
          onChange={(next) =>
            update(normalized, onChange, {
              labels: {
                ...normalized.labels,
                price: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Compare at"
          value={normalized.labels?.compareAt}
          onChange={(next) =>
            update(normalized, onChange, {
              labels: {
                ...normalized.labels,
                compareAt: next,
              },
            })
          }
        />
        <CommerceTextField
          label="Stock"
          value={normalized.labels?.stock}
          onChange={(next) =>
            update(normalized, onChange, {
              labels: {
                ...normalized.labels,
                stock: next,
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

export function ProductCompareAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);
  const previewQuery = buildProductCompareQueryInput(normalized);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Runtime payload"
        description="Resolved rows are set by runtime resolver."
      >
        <div className="rounded-md border border-border/70 bg-background p-2 text-xs text-muted-foreground">
          Resolved rows: {normalized.resolved?.rows?.length ?? 0} · Total: {normalized.resolved?.total ?? 0}
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

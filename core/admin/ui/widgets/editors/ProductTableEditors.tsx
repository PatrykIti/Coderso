import {
  buildProductTableQueryInput,
  normalizeProductTableData,
  productTableDefaults,
  type ProductTableData,
} from "../../../../widgets/core/productTable";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  CommerceEditorSection,
  CommerceSourceFields,
  CommerceTextField,
  CommerceToggleField,
  normalizeSourceForEditor,
} from "./CommerceWidgetEditorShared";

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

export function ProductTableWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductTableData>) {
  const normalized = normalizeProductTableData(value);
  const source = normalizeSourceForEditor(normalized.source, {
    limit: productTableDefaults.source?.limit ?? 12,
    sortField: "updatedAt",
    sortDir: "desc",
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
    </div>
  );
}

export function ProductTableVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductTableData>) {
  const normalized = normalizeProductTableData(value);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Columns"
        description="Choose columns visible in the table."
      >
        <CommerceToggleField
          label="Show slug"
          checked={normalized.fields?.showSlug !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showSlug: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show status"
          checked={normalized.fields?.showStatus !== false}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showStatus: next,
              },
            })
          }
        />
        <CommerceToggleField
          label="Show stock"
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
          label="Show compare-at price"
          checked={normalized.fields?.showCompareAt === true}
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
          label="Show collection count"
          checked={normalized.fields?.showCollectionCount === true}
          onChange={(next) =>
            update(normalized, onChange, {
              fields: {
                ...normalized.fields,
                showCollectionCount: next,
              },
            })
          }
        />
      </CommerceEditorSection>

      <CommerceEditorSection
        title="Column labels"
        description="Customize table header labels."
      >
        <CommerceTextField
          label="Product"
          value={normalized.labels?.title}
          onChange={(next) =>
            update(normalized, onChange, {
              labels: {
                ...normalized.labels,
                title: next,
              },
            })
          }
        />
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
          label="Status"
          value={normalized.labels?.status}
          onChange={(next) =>
            update(normalized, onChange, {
              labels: {
                ...normalized.labels,
                status: next,
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

export function ProductTableAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ProductTableData>) {
  const normalized = normalizeProductTableData(value);
  const previewQuery = buildProductTableQueryInput(normalized);

  return (
    <div className="space-y-4">
      <CommerceEditorSection
        title="Runtime payload"
        description="Resolved items are injected by runtime resolver."
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

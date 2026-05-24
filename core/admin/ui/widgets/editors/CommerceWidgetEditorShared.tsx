import { useEffect, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  listCommerceCollectionsCached,
  type CommerceCollectionRecord,
  listCommerceProductsCached,
  type CommerceProductRecord,
} from "@/services/commerceClient";

import {
  commerceSortFieldLabelMap,
  commerceWidgetSortDirectionValues,
  commerceWidgetSortFieldValues,
  commerceWidgetStatusValues,
  normalizeCommerceWidgetSource,
  type CommerceWidgetSource,
  type NormalizedCommerceWidgetSource,
} from "../../../../widgets/core/commerceWidgetShared";
import type { EditorMode, WidgetEditorSectionRole } from "../../../../widgets/types";
import { WidgetEditorSection } from "./WidgetEditorControls";

export type CommerceSourceFieldCopy = {
  searchPlaceholder?: string;
  searchHelpText?: string;
  collectionFallbackLabel?: string;
  collectionHelpText?: string;
  statusHelpText?: string;
};

export type CommerceSourceFieldOptions = {
  limitMax?: number;
  allowCollectionFallbackInput?: boolean;
  copy?: CommerceSourceFieldCopy;
};

type CommerceProductPickerState = {
  products: CommerceProductRecord[];
  isLoading: boolean;
  error: boolean;
};

export function CommerceEditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      mode={mode}
      role={role}
      title={title}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

export function CommerceTextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function CommerceNumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={String(value)}
        onChange={(event) => {
          const numeric = Number(event.target.value);
          if (!Number.isFinite(numeric)) {
            onChange(value);
            return;
          }
          onChange(Math.min(max, Math.max(min, Math.floor(numeric))));
        }}
      />
    </label>
  );
}

export function CommerceTextareaField({
  label,
  value,
  rows = 3,
  onChange,
}: {
  label: string;
  value?: string;
  rows?: number;
  onChange: (next: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Textarea
        rows={rows}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function useCommerceProductPickerState() {
  const [state, setState] = useState<CommerceProductPickerState>({
    products: [],
    isLoading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    listCommerceProductsCached({ force: false })
      .then((products) => {
        if (!active) return;
        setState({ products, isLoading: false, error: false });
      })
      .catch(() => {
        if (!active) return;
        setState({ products: [], isLoading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

function ProductStatusText({ status }: { status: CommerceProductRecord["status"] }) {
  return <span className="capitalize">{status.replaceAll("_", " ")}</span>;
}

const NO_FEATURED_PRODUCT_VALUE = "__commerce_product_none__";
const UNAVAILABLE_PRODUCT_VALUE = "__commerce_product_unavailable__";

export function CommerceProductSelectionField({
  label,
  selectedIds,
  onChange,
  description,
  maxSelected = 12,
}: {
  label: string;
  selectedIds: string[];
  onChange: (next: string[]) => void;
  description?: string;
  maxSelected?: number;
}) {
  const { products, isLoading, error } = useCommerceProductPickerState();
  const selectedSet = new Set(selectedIds);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const selectedProducts = selectedIds.map((id) => productsById.get(id));
  const canAddMore = selectedIds.length < maxSelected;

  const moveSelected = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        <p className="text-xs text-muted-foreground">
          Selected products: {selectedIds.length || "none"} · Limit: {maxSelected}
        </p>
      </div>

      {selectedIds.length > 0 ? (
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
          <p className="text-xs font-medium text-muted-foreground">Selected order</p>
          {selectedProducts.map((product, index) => (
            <div
              key={`${selectedIds[index]}:${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background px-2 py-1.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {product?.title ?? "Unavailable product"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {product ? (
                    <>
                      {product.slug} · <ProductStatusText status={product.status} />
                    </>
                  ) : (
                    "This saved product is not available in the picker."
                  )}
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => moveSelected(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                  disabled={index === selectedIds.length - 1}
                  onClick={() => moveSelected(index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs"
                  onClick={() => onChange(selectedIds.filter((_, current) => current !== index))}
                >
                  Remove
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {isLoading ? <p className="text-xs text-muted-foreground">Loading products...</p> : null}
      {error ? (
        <p className="text-xs text-amber-700">
          Products could not be loaded. Existing selections stay unchanged.
        </p>
      ) : null}
      {!isLoading && !error && products.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          No commerce products are available yet.
        </p>
      ) : null}

      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {products.map((product) => {
            const checked = selectedSet.has(product.id);
            const disabled = !checked && !canAddMore;
            return (
              <label
                key={product.id}
                className="flex items-start gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...selectedIds, product.id].slice(0, maxSelected));
                      return;
                    }
                    onChange(selectedIds.filter((id) => id !== product.id));
                  }}
                />
                <span className="space-y-0.5">
                  <span className="block font-medium text-foreground">{product.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.slug} · <ProductStatusText status={product.status} />
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CommerceProductSelectField({
  label,
  value,
  onChange,
  emptyLabel = "No featured product",
}: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
  emptyLabel?: string;
}) {
  const { products, isLoading, error } = useCommerceProductPickerState();
  const selectedProduct = products.find((product) => product.id === value);
  const selectedValue =
    selectedProduct?.id ?? (value ? UNAVAILABLE_PRODUCT_VALUE : NO_FEATURED_PRODUCT_VALUE);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Select
        value={selectedValue}
        onValueChange={(next) =>
          onChange(
            next === NO_FEATURED_PRODUCT_VALUE || next === UNAVAILABLE_PRODUCT_VALUE ? "" : next
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_FEATURED_PRODUCT_VALUE}>{emptyLabel}</SelectItem>
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.title}
            </SelectItem>
          ))}
          {value && !selectedProduct ? (
            <SelectItem value={UNAVAILABLE_PRODUCT_VALUE} disabled>
              Unavailable selected product
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      {isLoading ? <p className="text-xs text-muted-foreground">Loading products...</p> : null}
      {error ? (
        <p className="text-xs text-amber-700">
          Products could not be loaded. Existing selection stays unchanged.
        </p>
      ) : null}
      {!isLoading && !error && products.length === 0 ? (
        <p className="text-xs text-muted-foreground">No commerce products are available yet.</p>
      ) : null}
    </div>
  );
}

export function CommerceToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-md border border-border/70 px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="space-y-0.5">
        <span className="block font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export const toCollectionCsv = (collectionIds: string[]) => collectionIds.join(", ");

export const fromCollectionCsv = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

const resolveSourceLimitMax = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 48;
  return Math.min(48, Math.max(1, Math.floor(value)));
};

export function normalizeSourceForEditor(
  source: CommerceWidgetSource | null | undefined,
  defaults: {
    limit: number;
    sortField?: NormalizedCommerceWidgetSource["sortField"];
    sortDir?: NormalizedCommerceWidgetSource["sortDir"];
  },
  options: CommerceSourceFieldOptions = {}
) {
  const normalized = normalizeCommerceWidgetSource(source, defaults);
  const limitMax = resolveSourceLimitMax(options.limitMax);
  return {
    ...normalized,
    limit: Math.min(limitMax, normalized.limit),
  };
}

function CommerceSelectField({
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

export function CommerceSourceFields({
  source,
  onChange,
  options = {},
}: {
  source: NormalizedCommerceWidgetSource;
  onChange: (next: NormalizedCommerceWidgetSource) => void;
  options?: CommerceSourceFieldOptions;
}) {
  const [collections, setCollections] = useState<CommerceCollectionRecord[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const limitMax = resolveSourceLimitMax(options.limitMax);
  const copy = options.copy ?? {};
  const allowCollectionFallbackInput = options.allowCollectionFallbackInput === true;

  useEffect(() => {
    let active = true;
    listCommerceCollectionsCached({ force: false })
      .then((items) => {
        if (!active) return;
        setCollections(items);
      })
      .catch(() => {
        if (!active) return;
        setCollectionsError("Failed to load commerce collections.");
      })
      .finally(() => {
        if (!active) return;
        setCollectionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCollectionIds = new Set(source.collectionIds);

  return (
    <>
      <CommerceNumberField
        label="Limit"
        value={source.limit}
        min={1}
        max={limitMax}
        onChange={(next) => onChange({ ...source, limit: next })}
      />

      <CommerceTextField
        label="Search"
        value={source.search}
        placeholder={copy.searchPlaceholder ?? "title or slug"}
        onChange={(next) => onChange({ ...source, search: next })}
      />
      {copy.searchHelpText ? (
        <p className="text-xs text-muted-foreground">{copy.searchHelpText}</p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Collections</p>
        {collectionsLoading ? (
          <p className="text-xs text-muted-foreground">Loading collections...</p>
        ) : null}
        {collectionsError ? <p className="text-xs text-destructive">{collectionsError}</p> : null}
        {!collectionsLoading && !collectionsError && collections.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            No commerce collections are available yet.
          </p>
        ) : null}
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {collections.map((collection) => {
              const checked = selectedCollectionIds.has(collection.id);
              return (
                <label
                  key={collection.id}
                  className="flex items-start gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={checked}
                    onChange={(event) => {
                      const next = new Set(selectedCollectionIds);
                      if (event.target.checked) {
                        next.add(collection.id);
                      } else {
                        next.delete(collection.id);
                      }
                      onChange({ ...source, collectionIds: Array.from(next) });
                    }}
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium text-foreground">{collection.name}</span>
                    <span className="block text-xs text-muted-foreground">{collection.slug}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
        {allowCollectionFallbackInput ? (
          <CommerceTextField
            label={copy.collectionFallbackLabel ?? "Collection IDs fallback"}
            value={toCollectionCsv(source.collectionIds)}
            onChange={(next) =>
              onChange({
                ...source,
                collectionIds: fromCollectionCsv(next),
              })
            }
          />
        ) : (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Use collection checkboxes when collections are available. Raw collection IDs are hidden
            from the Wizard.
          </p>
        )}
        {copy.collectionHelpText && allowCollectionFallbackInput ? (
          <p className="text-xs text-muted-foreground">{copy.collectionHelpText}</p>
        ) : null}
      </div>

      <CommerceSelectField
        label="Sort field"
        value={source.sortField}
        options={commerceWidgetSortFieldValues.map((value) => ({
          value,
          label: commerceSortFieldLabelMap[value],
        }))}
        onChange={(next) =>
          onChange({
            ...source,
            sortField: next as NormalizedCommerceWidgetSource["sortField"],
          })
        }
      />

      <CommerceSelectField
        label="Sort direction"
        value={source.sortDir}
        options={commerceWidgetSortDirectionValues.map((value) => ({
          value,
          label: value === "asc" ? "Ascending" : "Descending",
        }))}
        onChange={(next) =>
          onChange({
            ...source,
            sortDir: next as NormalizedCommerceWidgetSource["sortDir"],
          })
        }
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Status filter</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {commerceWidgetStatusValues.map((status) => {
            const enabled = source.status.includes(status);
            return (
              <label
                key={status}
                className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={enabled}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange({
                        ...source,
                        status: Array.from(new Set([...source.status, status])),
                      });
                    } else {
                      onChange({
                        ...source,
                        status: source.status.filter((value) => value !== status),
                      });
                    }
                  }}
                />
                <span className="capitalize">{status.replaceAll("_", " ")}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {copy.statusHelpText ??
            "Empty means runtime default: public pages show published, preview can show all."}
        </p>
      </div>
    </>
  );
}

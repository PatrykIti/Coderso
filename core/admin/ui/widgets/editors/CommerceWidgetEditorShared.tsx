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
  copy?: CommerceSourceFieldCopy;
};

export function CommerceEditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
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
        {copy.collectionHelpText ? (
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

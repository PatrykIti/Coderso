import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  commerceSortFieldLabelMap,
  commerceWidgetSortDirectionValues,
  commerceWidgetSortFieldValues,
  commerceWidgetStatusValues,
  normalizeCommerceWidgetSource,
  type CommerceWidgetSource,
  type NormalizedCommerceWidgetSource,
} from "../../../../widgets/core/commerceWidgetShared";

export function CommerceEditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
      <Textarea rows={rows} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
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
        {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
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

export function normalizeSourceForEditor(
  source: CommerceWidgetSource | null | undefined,
  defaults: {
    limit: number;
    sortField?: NormalizedCommerceWidgetSource["sortField"];
    sortDir?: NormalizedCommerceWidgetSource["sortDir"];
  }
) {
  return normalizeCommerceWidgetSource(source, defaults);
}

export function CommerceSourceFields({
  source,
  onChange,
}: {
  source: NormalizedCommerceWidgetSource;
  onChange: (next: NormalizedCommerceWidgetSource) => void;
}) {
  return (
    <>
      <CommerceNumberField
        label="Limit"
        value={source.limit}
        min={1}
        max={48}
        onChange={(next) => onChange({ ...source, limit: next })}
      />

      <CommerceTextField
        label="Search"
        value={source.search}
        placeholder="title or slug"
        onChange={(next) => onChange({ ...source, search: next })}
      />

      <CommerceTextField
        label="Collection IDs (comma separated)"
        value={toCollectionCsv(source.collectionIds)}
        onChange={(next) =>
          onChange({
            ...source,
            collectionIds: fromCollectionCsv(next),
          })
        }
      />

      <label className="space-y-1 text-sm">
        <span className="font-medium text-foreground">Sort field</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={source.sortField}
          onChange={(event) =>
            onChange({
              ...source,
              sortField: event.target.value as NormalizedCommerceWidgetSource["sortField"],
            })
          }
        >
          {commerceWidgetSortFieldValues.map((value) => (
            <option key={value} value={value}>
              {commerceSortFieldLabelMap[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-foreground">Sort direction</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={source.sortDir}
          onChange={(event) =>
            onChange({
              ...source,
              sortDir: event.target.value as NormalizedCommerceWidgetSource["sortDir"],
            })
          }
        >
          {commerceWidgetSortDirectionValues.map((value) => (
            <option key={value} value={value}>
              {value === "asc" ? "Ascending" : "Descending"}
            </option>
          ))}
        </select>
      </label>

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
          Empty means runtime default: public pages show published, preview can show all.
        </p>
      </div>
    </>
  );
}

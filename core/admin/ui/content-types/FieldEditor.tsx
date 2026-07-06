import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { InfoTip } from "@/ui/shared/InfoTip";

import {
  FIELD_TYPE_LABELS,
  makeUniqueFieldName,
  slugifyFieldName,
  type ContentField,
  type FieldType,
  type SelectOption,
} from "./SchemaBuilder";

const fieldTypeOrder: FieldType[] = [
  "text",
  "richtext",
  "number",
  "boolean",
  "select",
  "media",
  "relation",
  "date",
  "slug",
];

const fieldTypeHelp: Record<FieldType, { helper: string; tooltip: string }> = {
  text: {
    helper: "Short, single-line text for titles or labels.",
    tooltip: "Use for brief strings like titles, headlines, or UI labels.",
  },
  richtext: {
    helper: "Long-form content with formatting.",
    tooltip: "Rich text is best for body copy and formatted content blocks.",
  },
  number: {
    helper: "Numeric value (use for ordering or stats).",
    tooltip: "Numbers can be sorted, aggregated, or used in calculations.",
  },
  boolean: {
    helper: "True/false toggle.",
    tooltip: "Use a boolean for on/off flags (e.g. featured, published).",
  },
  select: {
    helper: "Single choice from a predefined list.",
    tooltip: "Select fields let editors choose one option from your list.",
  },
  media: {
    helper: "Pick media assets from the library.",
    tooltip: "Media fields link entries to images/files from the Media Library.",
  },
  relation: {
    helper: "Link to entries from another content type.",
    tooltip: "Relations connect entries together (e.g. Testimonials → Projects).",
  },
  date: {
    helper: "Calendar date (optionally with time).",
    tooltip: "Stores an ISO date; enable Include time for a date + time value.",
  },
  slug: {
    helper: "URL-safe identifier, optionally derived from another field.",
    tooltip: "URL-safe string (e.g. hello-world); can be derived from a sibling field.",
  },
};

const makeUniqueOptionValue = (label: string, options: SelectOption[], currentId?: string) => {
  const base = slugifyFieldName(label) || "option";
  let candidate = base;
  let index = 2;
  while (options.some((option) => option.value === candidate && option.id !== currentId)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
};

function NumberInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value?: number;
  min?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw.trim()) {
            onChange(undefined);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? parsed : undefined);
        }}
      />
    </div>
  );
}

type FieldEditorProps = {
  field: ContentField;
  nameError?: string | null;
  defaultError?: string | null;
  relationError?: string | null;
  relationTargets?: Array<{ slug: string; name: string }>;
  existingNames?: Array<{ id: string; name: string }>;
  onChange: (next: ContentField) => void;
  onRemove: () => void;
};

export function FieldEditor({
  field,
  nameError,
  defaultError,
  relationError,
  relationTargets = [],
  existingNames = [],
  onChange,
  onRemove,
}: FieldEditorProps) {
  // Derived at render (not module top-level) to avoid a circular-import TDZ:
  // SchemaBuilder imports FieldEditor before FIELD_TYPE_LABELS is initialized.
  // Labels sourced from the canonical map so this dropdown cannot drift.
  const fieldTypes: { value: FieldType; label: string }[] = fieldTypeOrder.map((value) => ({
    value,
    label: FIELD_TYPE_LABELS[value],
  }));

  const relationOptions =
    relationTargets.length > 0
      ? relationTargets
      : field.relation?.target
        ? [{ slug: field.relation.target, name: field.relation.target }]
        : [];

  const updateLayout = (patch: Partial<NonNullable<ContentField["layout"]>>) => {
    const nextLayout = {
      ...field.layout,
      ...patch,
    };
    const hasLayout =
      nextLayout.tab || nextLayout.section || nextLayout.width || nextLayout.display;
    onChange({
      ...field,
      layout: hasLayout ? nextLayout : undefined,
    });
  };

  const handleLabelChange = (label: string) => {
    if (!field.keyAuto) {
      onChange({ ...field, label });
      return;
    }
    onChange({
      ...field,
      label,
      name: makeUniqueFieldName(label, existingNames, field.id),
    });
  };

  const createSelectOption = (): SelectOption => {
    const suffix = (field.options?.length ?? 0) + 1;
    const value = makeUniqueOptionValue(`option-${suffix}`, field.options ?? []);
    return {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `option-${Date.now()}-${suffix}`,
      label: `Option ${suffix}`,
      value,
    };
  };

  const updateSelectOptions = (options: SelectOption[]) => {
    onChange({ ...field, options });
  };

  const updateSelectOption = (
    optionId: string,
    patch: Partial<SelectOption>,
    lockValue = false
  ) => {
    updateSelectOptions(
      (field.options ?? []).map((option) => {
        if (option.id !== optionId) return option;
        const next = { ...option, ...patch };
        if (patch.label !== undefined && !option.valueLocked && !lockValue) {
          next.value = makeUniqueOptionValue(patch.label, field.options ?? [], optionId);
        }
        if (patch.value !== undefined || lockValue) {
          next.value = makeUniqueOptionValue(
            patch.value ?? next.value,
            field.options ?? [],
            optionId
          );
          next.valueLocked = true;
        }
        return next;
      })
    );
  };

  const moveSelectOption = (optionId: string, direction: -1 | 1) => {
    const options = [...(field.options ?? [])];
    const index = options.findIndex((option) => option.id === optionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= options.length) return;
    const [item] = options.splice(index, 1);
    if (!item) return;
    options.splice(nextIndex, 0, item);
    updateSelectOptions(options);
  };

  const updateNumberConfig = (patch: Partial<NonNullable<ContentField["number"]>>) => {
    const next = { ...field.number, ...patch };
    const normalized = {
      ...(next.format ? { format: next.format } : {}),
      ...(typeof next.min === "number" ? { min: next.min } : {}),
      ...(typeof next.max === "number" ? { max: next.max } : {}),
      ...(typeof next.step === "number" ? { step: next.step } : {}),
    };
    onChange({
      ...field,
      number: Object.keys(normalized).length ? normalized : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Field settings</h3>
          <p className="text-xs text-muted-foreground">
            Configure label, type, and validation rules.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRemove}>
          Remove field
        </Button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Field name (kebab-case)
        </label>
        <Input
          value={field.name}
          onChange={(event) => onChange({ ...field, name: event.target.value, keyAuto: false })}
        />
        {nameError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {nameError}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Label</label>
        <Input value={field.label} onChange={(event) => handleLabelChange(event.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Field type
          </label>
          <InfoTip content={fieldTypeHelp[field.type].tooltip} label="Field type help" />
        </div>
        <Select
          value={field.type}
          onValueChange={(value) => onChange({ ...field, type: value as FieldType })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {fieldTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{fieldTypeHelp[field.type].helper}</p>
      </div>
      {field.type === "select" ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Options</p>
              <p className="text-xs text-muted-foreground">
                Store stable values while showing readable labels.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => updateSelectOptions([...(field.options ?? []), createSelectOption()])}
            >
              <Plus className="h-3 w-3" />
              Add option
            </Button>
          </div>
          <div className="space-y-2">
            {(field.options ?? []).length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                No options yet.
              </div>
            ) : (
              (field.options ?? []).map((option, index, options) => (
                <div
                  key={option.id}
                  className="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Input
                    value={option.label}
                    placeholder="Label"
                    onChange={(event) =>
                      updateSelectOption(option.id, { label: event.target.value })
                    }
                  />
                  <Input
                    value={option.value}
                    placeholder="value"
                    onChange={(event) =>
                      updateSelectOption(option.id, { value: event.target.value }, true)
                    }
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${option.label} up`}
                      disabled={index === 0}
                      onClick={() => moveSelectOption(option.id, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${option.label} down`}
                      disabled={index === options.length - 1}
                      onClick={() => moveSelectOption(option.id, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${option.label}`}
                      onClick={() =>
                        updateSelectOptions(
                          (field.options ?? []).filter((item) => item.id !== option.id)
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-background p-3">
            <div>
              <p className="text-sm font-medium">Allow multiple selections</p>
              <p className="text-xs text-muted-foreground">
                Store this field as an array of selected values.
              </p>
            </div>
            <Switch
              checked={field.multiple ?? false}
              onCheckedChange={(checked) => onChange({ ...field, multiple: checked === true })}
            />
          </div>
        </div>
      ) : null}
      {field.type === "number" ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Number constraints
            </p>
            <p className="text-xs text-muted-foreground">
              Persist JSON Schema min/max, format, and step.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Format
              </label>
              <Select
                value={field.number?.format ?? "decimal"}
                onValueChange={(value) =>
                  updateNumberConfig({ format: value as "integer" | "decimal" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberInput
              label="Step"
              value={field.number?.step}
              min={0}
              onChange={(value) => updateNumberConfig({ step: value })}
            />
            <NumberInput
              label="Min value"
              value={field.number?.min}
              onChange={(value) => updateNumberConfig({ min: value })}
            />
            <NumberInput
              label="Max value"
              value={field.number?.max}
              onChange={(value) => updateNumberConfig({ max: value })}
            />
          </div>
        </div>
      ) : null}
      {field.type === "media" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Accepted file types
            </label>
            <Input
              value={field.media?.accept?.join(", ") ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  media: {
                    ...field.media,
                    accept: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="image/*, application/pdf"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated MIME patterns (leave empty for all types).
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Allow multiple</p>
              <p className="text-xs text-muted-foreground">Enable picking more than one asset.</p>
            </div>
            <Switch
              checked={field.media?.multiple ?? false}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  media: {
                    ...field.media,
                    multiple: checked,
                    ...(checked ? {} : { maxItems: undefined }),
                  },
                })
              }
            />
          </div>
          {field.media?.multiple ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Max items
              </label>
              <Input
                type="number"
                min={1}
                value={field.media?.maxItems ?? ""}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onChange({
                    ...field,
                    media: {
                      ...field.media,
                      maxItems: Number.isFinite(next) && next > 0 ? next : undefined,
                    },
                  });
                }}
                placeholder="Leave empty for no limit"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {field.type === "relation" ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Related content type
          </label>
          {relationOptions.length > 0 ? (
            <Select
              value={field.relation?.target ?? ""}
              onValueChange={(value) =>
                onChange({
                  ...field,
                  relation: { target: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {relationOptions.map((option) => (
                  <SelectItem key={option.slug} value={option.slug}>
                    {option.name} ({option.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={field.relation?.target ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  relation: { target: event.target.value },
                })
              }
              placeholder="Create a content type first"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Pick which content type this field should link to (e.g. Team → Projects).
          </p>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Allow multiple</p>
              <p className="text-xs text-muted-foreground">
                Enable linking to multiple entries in this relation field.
              </p>
            </div>
            <Switch
              checked={field.relation?.multiple ?? false}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  relation: {
                    target: field.relation?.target ?? "",
                    ...(checked ? { multiple: true } : {}),
                  },
                })
              }
            />
          </div>
          {relationError ? (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {relationError}
            </div>
          ) : null}
        </div>
      ) : null}
      {field.type === "date" ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between rounded-lg border bg-background p-3">
            <div>
              <p className="text-sm font-medium">Include time</p>
              <p className="text-xs text-muted-foreground">
                Capture a time alongside the date (date &amp; time).
              </p>
            </div>
            <Switch
              checked={field.date?.includeTime ?? false}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  date: checked ? { includeTime: true } : undefined,
                })
              }
            />
          </div>
        </div>
      ) : null}
      {field.type === "slug" ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Derive from
            </label>
            <Select
              value={field.slug?.source ?? "__none__"}
              onValueChange={(value) => {
                const source = value === "__none__" ? undefined : value;
                const nextSlug = {
                  ...(source ? { source } : {}),
                  ...(field.slug?.editable === false ? { editable: false } : {}),
                };
                onChange({
                  ...field,
                  slug: Object.keys(nextSlug).length ? nextSlug : undefined,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Free text" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Free text (no source)</SelectItem>
                {existingNames
                  .filter((entry) => entry.id !== field.id)
                  .map((entry) => (
                    <SelectItem key={entry.id} value={entry.name}>
                      {entry.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Declarative link to a sibling field this slug represents.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-background p-3">
            <div>
              <p className="text-sm font-medium">Editable</p>
              <p className="text-xs text-muted-foreground">
                Allow editors to override the slug value.
              </p>
            </div>
            <Switch
              checked={field.slug?.editable ?? true}
              onCheckedChange={(checked) => {
                const nextSlug = {
                  ...(field.slug?.source ? { source: field.slug.source } : {}),
                  ...(checked ? {} : { editable: false }),
                };
                onChange({
                  ...field,
                  slug: Object.keys(nextSlug).length ? nextSlug : undefined,
                });
              }}
            />
          </div>
        </div>
      ) : null}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Layout & grouping</p>
          <p className="text-xs text-muted-foreground">
            Control where this field appears in the entry editor.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Tab</label>
            <Input
              value={field.layout?.tab ?? ""}
              onChange={(event) => {
                const nextTab = event.target.value;
                updateLayout({ tab: nextTab.trim() ? nextTab : undefined });
              }}
              placeholder="Content, SEO, Sidebar"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Section</label>
            <Input
              value={field.layout?.section ?? ""}
              onChange={(event) => {
                const nextSection = event.target.value;
                updateLayout({
                  section: nextSection.trim() ? nextSection : undefined,
                });
              }}
              placeholder="Hero, Metadata"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Width</label>
            <Select
              value={field.layout?.width ?? "full"}
              onValueChange={(value) => {
                updateLayout({ width: value as "full" | "half" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose width" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full width</SelectItem>
                <SelectItem value="half">Half width</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Display density
            </label>
            <Select
              value={field.layout?.display ?? "default"}
              onValueChange={(value) => {
                updateLayout({ display: value as "default" | "compact" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose density" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Help text</label>
        <Textarea
          value={field.help ?? ""}
          onChange={(event) => onChange({ ...field, help: event.target.value })}
          rows={3}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Required</p>
          <p className="text-xs text-muted-foreground">Field must be filled in.</p>
        </div>
        <Switch
          checked={field.required}
          onCheckedChange={(checked) => onChange({ ...field, required: checked })}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Unique</p>
          <p className="text-xs text-muted-foreground">Value must be unique across entries.</p>
        </div>
        <Switch
          checked={field.unique ?? false}
          onCheckedChange={(checked) => onChange({ ...field, unique: checked || undefined })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Default value
        </label>
        <Input
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? field.date?.includeTime
                  ? "datetime-local"
                  : "date"
                : "text"
          }
          step={field.number?.step}
          min={field.number?.min}
          max={field.number?.max}
          value={field.defaultValue ?? ""}
          onChange={(event) => onChange({ ...field, defaultValue: event.target.value })}
        />
        {defaultError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {defaultError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

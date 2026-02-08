import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

import {
  normalizeStatsKpiData,
  normalizeStatsKpiItems,
  resolveStatsKpiVariant,
  statsKpiDefaults,
  statsKpiItemMax,
  type StatsKpiAlignment,
  type StatsKpiData,
  type StatsKpiItem,
  type StatsKpiSpacing,
  type StatsKpiVariantId,
} from "../../../../widgets/core/statsKpi";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: StatsKpiVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "cards",
    label: "Cards",
    description: "Grid of KPI cards with equal emphasis.",
  },
  {
    id: "inline",
    label: "Inline",
    description: "Compact metrics in one row with optional dividers.",
  },
  {
    id: "split-highlight",
    label: "Split Highlight",
    description: "Lead KPI with secondary supporting metrics.",
  },
];

const alignmentOptions: Array<{ id: StatsKpiAlignment; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

const spacingOptions: Array<{ id: StatsKpiSpacing; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const itemCountOptions = Array.from({ length: statsKpiItemMax }, (_, index) =>
  String(index + 1)
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeaderData = NonNullable<StatsKpiData["header"]>;
type StyleData = NonNullable<StatsKpiData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: StatsKpiData): StatsKpiData {
  return normalizeStatsKpiData(value);
}

function EditorSection({
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

function VariantCards({
  value,
  onChange,
}: {
  value: StatsKpiVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function updateValue(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  updater: (current: StatsKpiData) => StatsKpiData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  patch: Partial<HeaderData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    header: {
      ...current.header,
      ...patch,
    },
  }));
}

function updateStyle(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateItem(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  index: number,
  patch: Partial<StatsKpiItem>
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (!items[index]) return current;

    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      ...patch,
    };

    return {
      ...current,
      items: nextItems,
    };
  });
}

function setItemsCount(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeStatsKpiItems(current.items, count),
  }));
}

function addItem(value: StatsKpiData, onChange: (next: StatsKpiData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (items.length >= statsKpiItemMax) return current;

    return {
      ...current,
      items: normalizeStatsKpiItems(
        [
          ...items,
          {
            value: `${items.length + 1}`,
            label: `Metric ${items.length + 1}`,
            description: "",
          },
        ],
        items.length + 1
      ),
    };
  });
}

function removeItem(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (items.length <= 1) return current;

    const nextItems = items.filter((_, currentIndex) => currentIndex !== index);
    return {
      ...current,
      items: normalizeStatsKpiItems(nextItems, nextItems.length),
    };
  });
}

function moveItem(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (toIndex < 0 || toIndex >= items.length) return current;

    const nextItems = [...items];
    const [item] = nextItems.splice(fromIndex, 1);
    if (!item) return current;
    nextItems.splice(toIndex, 0, item);

    return {
      ...current,
      items: nextItems,
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: StatsKpiData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function StatsKpiWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);
  const items = normalizeStatsKpiItems(normalized.items);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Stats layout</p>
        <Select
          value={resolveStatsKpiVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {variantOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Metric count</p>
        <Select
          value={String(items.length)}
          onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select count" />
          </SelectTrigger>
          <SelectContent>
            {itemCountOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Primary metric values</p>
        {items.slice(0, 3).map((item, index) => (
          <Input
            key={item.id ?? `wizard-metric-${index + 1}`}
            value={item.value ?? ""}
            onChange={(event) =>
              updateItem(value, onChange, index, { value: event.target.value })
            }
            placeholder={`Metric ${index + 1} value`}
          />
        ))}
      </div>
    </div>
  );
}

export function StatsKpiVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);
  const items = normalizeStatsKpiItems(normalized.items);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and metric structure"
        description="Choose KPI arrangement and deterministic metric count."
      >
        <VariantCards value={resolveStatsKpiVariant(variant)} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Metrics count</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {itemCountOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Header copy"
        description="Edit section title and supporting context."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Proof in numbers"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) =>
              updateHeader(value, onChange, { description: event.target.value })
            }
            placeholder="Show key performance metrics and outcomes."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Metrics content and order"
        description="Manage value, label, description, and icon for each metric."
      >
        {items.map((item, index) => (
          <div key={item.id ?? `metric-${index + 1}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Metric {index + 1}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(value, onChange, index, index - 1)}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(value, onChange, index, index + 1)}
                  disabled={index === items.length - 1}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(value, onChange, index)}
                  disabled={items.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Value</p>
              <Input
                value={item.value ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { value: event.target.value })
                }
                placeholder="120+"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Label</p>
              <Input
                value={item.label ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { label: event.target.value })
                }
                placeholder="Projects launched"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Description</p>
              <Textarea
                value={item.description ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { description: event.target.value })
                }
                placeholder="Optional supporting context."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Icon</p>
              <Input
                value={item.icon ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { icon: event.target.value })
                }
                placeholder="🚀"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => addItem(value, onChange)}
          disabled={items.length >= statsKpiItemMax}
        >
          Add metric
        </Button>
      </EditorSection>

      <EditorSection
        title="Typography and colors"
        description="Tune value and label color styling."
      >
        <ColorField
          label="Value color"
          value={normalized.style?.valueColor}
          onChange={(next) => updateStyle(value, onChange, { valueColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Label color"
          value={normalized.style?.labelColor}
          onChange={(next) => updateStyle(value, onChange, { labelColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
      </EditorSection>

      <EditorSection
        title="Layout display options"
        description="Adjust alignment, spacing density, and inline dividers."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={normalized.style?.alignment ?? "center"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { alignment: next as StatsKpiAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as StatsKpiSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Show dividers</p>
            <p className="text-xs text-muted-foreground">
              Used mainly by inline variant to separate metric blocks.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.style?.divider)}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, { divider: Boolean(checked) })
            }
          />
        </div>
      </EditorSection>
    </div>
  );
}

export function StatsKpiAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical spacing and alignment tokens"
        description="Low-level display controls for layout behavior."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment token</p>
          <Select
            value={normalized.style?.alignment ?? "center"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { alignment: next as StatsKpiAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing token</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as StatsKpiSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Value color token</p>
          <Input
            value={normalized.style?.valueColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, { valueColor: event.target.value })
            }
            placeholder="var(--color-text)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Label color token</p>
          <Input
            value={normalized.style?.labelColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, { labelColor: event.target.value })
            }
            placeholder="var(--color-text)"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback values and structure."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(statsKpiDefaults)}>
            Reset to defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}

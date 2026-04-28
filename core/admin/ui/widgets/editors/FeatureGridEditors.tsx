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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  featureGridDefaults,
  featureGridItemMax,
  normalizeFeatureGridData,
  normalizeFeatureGridItems,
  resolveFeatureGridItemCountForVariant,
  resolveFeatureGridVariant,
  type FeatureGridBorderWidth,
  type FeatureGridColumns,
  type FeatureGridData,
  type FeatureGridGap,
  type FeatureGridItem,
  type FeatureGridRadius,
  type FeatureGridVariantId,
} from "../../../../widgets/core/featureGrid";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: FeatureGridVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "cards-3",
    label: "Cards 3",
    description: "Three balanced cards for concise feature communication.",
  },
  {
    id: "cards-4",
    label: "Cards 4",
    description: "Four cards to cover more value points in one section.",
  },
  {
    id: "highlight-first",
    label: "Highlight First",
    description: "First card is emphasized to drive attention to key value.",
  },
];

const gapOptions: Array<{ id: FeatureGridGap; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const columnsOptions: Array<{ id: FeatureGridColumns; label: string }> = [
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
  { id: "4", label: "4 columns" },
];

const borderWidthOptions: Array<{ id: FeatureGridBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: FeatureGridRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const itemCountOptions = Array.from({ length: featureGridItemMax }, (_, index) =>
  String(index + 1)
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeaderData = NonNullable<FeatureGridData["header"]>;
type StyleData = NonNullable<FeatureGridData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: FeatureGridData): FeatureGridData {
  return normalizeFeatureGridData(value);
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
  value: FeatureGridVariantId;
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  updater: (current: FeatureGridData) => FeatureGridData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  index: number,
  patch: Partial<FeatureGridItem>
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
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
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeFeatureGridItems(current.items, count),
  }));
}

function addItem(value: FeatureGridData, onChange: (next: FeatureGridData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
    if (items.length >= featureGridItemMax) return current;

    return {
      ...current,
      items: normalizeFeatureGridItems(
        [...items, { title: `Feature ${items.length + 1}` }],
        items.length + 1
      ),
    };
  });
}

function removeItem(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
    if (items.length <= 1) return current;

    const nextItems = items.filter((_, currentIndex) => currentIndex !== index);

    return {
      ...current,
      items: normalizeFeatureGridItems(nextItems, nextItems.length),
    };
  });
}

function moveItem(
  value: FeatureGridData,
  onChange: (next: FeatureGridData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFeatureGridItems(current.items);
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

function DiagnosticsSnapshot({ value }: { value: FeatureGridData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function FeatureGridWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FeatureGridData>) {
  const normalized = normalizeValue(value);
  const items = normalizeFeatureGridItems(normalized.items);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Feature grid style</p>
        <Select
          value={resolveFeatureGridVariant(variant)}
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
        <p className="text-sm font-medium">Section title</p>
        <Input
          value={normalized.header?.title ?? ""}
          onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
          placeholder="Everything your team needs"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Section description</p>
        <Textarea
          value={normalized.header?.description ?? ""}
          onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
          placeholder="Use focused cards to explain your strongest product capabilities."
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Cards count</p>
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

      <div className="space-y-3">
        <p className="text-sm font-medium">Basic card labels</p>
        {items.map((item, index) => (
          <div key={item.id ?? `wizard-item-${index + 1}`} className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Card {index + 1}
            </p>
            <Input
              value={item.title ?? ""}
              onChange={(event) => updateItem(value, onChange, index, { title: event.target.value })}
              placeholder={`Feature ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureGridVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FeatureGridData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveFeatureGridVariant(variant);
  const items = normalizeFeatureGridItems(normalized.items);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose card arrangement and baseline density for runtime preview."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns</p>
            <Select
              value={normalized.style?.columns ?? featureGridDefaults.style?.columns ?? "3"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columns: next as FeatureGridColumns })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent>
                {columnsOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Card gap</p>
            <Select
              value={normalized.style?.gap ?? featureGridDefaults.style?.gap ?? "md"}
              onValueChange={(next) => updateStyle(value, onChange, { gap: next as FeatureGridGap })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Cards count</p>
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
        description="Edit eyebrow, heading, and section description shown above cards."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={normalized.header?.eyebrow ?? ""}
            onChange={(event) => updateHeader(value, onChange, { eyebrow: event.target.value })}
            placeholder="Feature highlights"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Everything your team needs"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Use focused cards to explain your strongest product capabilities."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Feature cards and actions"
        description="Manage card content, visuals, CTA links, and ordering."
      >
        {items.map((item, index) => (
          <div key={item.id ?? `feature-item-${index + 1}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Card {index + 1}</p>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Title</p>
                <Input
                  value={item.title ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { title: event.target.value })
                  }
                  placeholder={`Feature ${index + 1}`}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Description</p>
                <Textarea
                  value={item.description ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { description: event.target.value })
                  }
                  placeholder="Describe this feature in one short paragraph."
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Icon</p>
                <Input
                  value={item.icon ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="⚡"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Image URL</p>
                <Input
                  value={item.image ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { image: event.target.value })
                  }
                  placeholder="https://cdn.example.com/feature.jpg"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">CTA label</p>
                <Input
                  value={item.ctaLabel ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { ctaLabel: event.target.value })
                  }
                  placeholder="Learn more"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">CTA URL</p>
                <Input
                  value={item.ctaHref ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { ctaHref: event.target.value })
                  }
                  placeholder="/features"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => addItem(value, onChange)}
          disabled={items.length >= featureGridItemMax}
        >
          Add card
        </Button>
      </EditorSection>

      <EditorSection
        title="Colors and borders"
        description="Customize card surface and border presentation."
      >
        <ColorField
          label="Card background"
          value={normalized.style?.surfaceColor}
          onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Card border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Border width</p>
            <Select
              value={normalized.style?.borderWidth ?? featureGridDefaults.style?.borderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { borderWidth: next as FeatureGridBorderWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Corner radius</p>
            <Select
              value={normalized.style?.radius ?? featureGridDefaults.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as FeatureGridRadius })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

export function FeatureGridAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<FeatureGridData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveFeatureGridVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Layout tokens"
        description="Technical controls for density and border tokens used by renderer."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns token</p>
            <Select
              value={normalized.style?.columns ?? featureGridDefaults.style?.columns ?? "3"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columns: next as FeatureGridColumns })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent>
                {columnsOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Gap token</p>
            <Select
              value={normalized.style?.gap ?? featureGridDefaults.style?.gap ?? "md"}
              onValueChange={(next) => updateStyle(value, onChange, { gap: next as FeatureGridGap })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Border width token</p>
            <Select
              value={normalized.style?.borderWidth ?? featureGridDefaults.style?.borderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { borderWidth: next as FeatureGridBorderWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Radius token</p>
            <Select
              value={normalized.style?.radius ?? featureGridDefaults.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as FeatureGridRadius })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic item counts and model defaults for stable runtime output."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setItemsCount(
                value,
                onChange,
                resolveFeatureGridItemCountForVariant(resolvedVariant)
              )
            }
          >
            Normalize items to variant baseline
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => updateValue(value, onChange, (current) => current)}
          >
            Normalize full payload
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot" description="Current normalized widget payload.">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}

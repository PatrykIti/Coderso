import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  accordionDefaults,
  accordionItemMax,
  accordionItemMin,
  normalizeAccordionData,
  normalizeAccordionItems,
  type AccordionData,
  type AccordionVariantId,
} from "../../../../widgets/core/accordion";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: AccordionVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "soft",
    label: "Soft",
    description: "Roomy accordion cards.",
  },
  {
    id: "bordered",
    label: "Bordered",
    description: "Structured panel styling.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Dense, space-saving layout.",
  },
];

const itemCountOptions = Array.from(
  { length: accordionItemMax - accordionItemMin + 1 },
  (_, index) => String(accordionItemMin + index)
);

function resolveVariant(variant: string): AccordionVariantId {
  if (variant === "bordered" || variant === "compact") return variant;
  return "soft";
}

function normalizeValue(value: AccordionData, desiredCount?: number): AccordionData {
  return normalizeAccordionData(value, desiredCount);
}

function updateValue(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  updater: (current: AccordionData) => AccordionData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function setCount(value: AccordionData, onChange: (next: AccordionData) => void, count: number) {
  const current = normalizeValue(value, count);
  const items = normalizeAccordionItems(current.items, count);
  const initiallyOpenId =
    current.options?.initiallyOpenId &&
    items.some((item) => item.id === current.options?.initiallyOpenId)
      ? current.options.initiallyOpenId
      : items[0]?.id;

  onChange(
    normalizeValue({
      ...current,
      items,
      options: {
        ...current.options,
        initiallyOpenId,
      },
    }, count)
  );
}

function updateItem(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  itemId: string,
  patch: { title?: string; description?: string }
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeAccordionItems(current.items).map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch,
          }
        : item
    ),
  }));
}

function updateOptions(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  patch: Partial<NonNullable<AccordionData["options"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    options: {
      ...current.options,
      ...patch,
    },
  }));
}

function updateStyle(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  patch: Partial<NonNullable<AccordionData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
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
  value: AccordionVariantId;
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

function StructureSection({
  value,
  onChange,
}: {
  value: AccordionData;
  onChange: (next: AccordionData) => void;
}) {
  const normalized = normalizeValue(value);
  const items = normalizeAccordionItems(normalized.items);

  return (
    <EditorSection title="Items" description="Set titles and helper text for each item.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Number of items</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {itemCountOptions.map((option) => (
                <SelectItem key={`accordion-count-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Initially open item</p>
          <Select
            value={normalized.options?.initiallyOpenId ?? items[0]?.id ?? "1"}
            onValueChange={(next) => updateOptions(value, onChange, { initiallyOpenId: next })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose item" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={`accordion-open-${item.id}`} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Item {index + 1} (slot id: {item.id})
            </p>
            <Input
              value={item.title}
              onChange={(event) =>
                updateItem(value, onChange, item.id, { title: event.target.value })
              }
              placeholder={`Section ${index + 1}`}
            />
            <Input
              value={item.description ?? ""}
              onChange={(event) =>
                updateItem(value, onChange, item.id, {
                  description: event.target.value,
                })
              }
              placeholder="Optional summary text"
            />
          </div>
        ))}
      </div>
    </EditorSection>
  );
}

function BehaviorSection({
  value,
  onChange,
}: {
  value: AccordionData;
  onChange: (next: AccordionData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      title="Behavior and Style"
      description="Control opening behavior and panel colors."
    >
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Allow multiple open items</p>
          <p className="text-xs text-muted-foreground">
            Disable for classic one-open-at-a-time accordion behavior.
          </p>
        </div>
        <Switch
          checked={normalized.options?.allowMultiple ?? false}
          onCheckedChange={(checked) => updateOptions(value, onChange, { allowMultiple: checked })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Surface color</p>
          <Input
            value={normalized.style?.surfaceColor ?? accordionDefaults.style?.surfaceColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, { surfaceColor: event.target.value })
            }
            placeholder="var(--color-surface)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Border color</p>
          <Input
            value={normalized.style?.borderColor ?? accordionDefaults.style?.borderColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, { borderColor: event.target.value })
            }
            placeholder="var(--color-border)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Summary text color</p>
          <Input
            value={
              normalized.style?.summaryTextColor ??
              accordionDefaults.style?.summaryTextColor ??
              ""
            }
            onChange={(event) =>
              updateStyle(value, onChange, {
                summaryTextColor: event.target.value,
              })
            }
            placeholder="var(--color-text)"
          />
        </div>
      </div>
    </EditorSection>
  );
}

function DiagnosticsSnapshot({ value }: { value: AccordionData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AccordionWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<AccordionData>) {
  return (
    <div className="space-y-4">
      <EditorSection title="Variant" description="Pick accordion visual style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <StructureSection value={value} onChange={onChange} />
    </div>
  );
}

export function AccordionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<AccordionData>) {
  return (
    <div className="space-y-4">
      <EditorSection title="Variant" description="Choose accordion style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <StructureSection value={value} onChange={onChange} />
      <BehaviorSection value={value} onChange={onChange} />
    </div>
  );
}

export function AccordionAdvancedEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<AccordionData>) {
  return (
    <div className="space-y-4">
      <EditorSection title="Variant" description="Variant and behavior tuning.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <StructureSection value={value} onChange={onChange} />
      <BehaviorSection value={value} onChange={onChange} />
      <EditorSection title="Diagnostics" description="Normalized payload preview.">
        <DiagnosticsSnapshot value={normalizeValue(value)} />
      </EditorSection>
    </div>
  );
}

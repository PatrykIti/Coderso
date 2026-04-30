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
  faqAccordionDefaults,
  faqAccordionItemMax,
  normalizeFaqAccordionData,
  normalizeFaqAccordionItems,
  resolveFaqAccordionVariant,
  type FaqAccordionData,
  type FaqAccordionItem,
  type FaqAccordionSpacing,
  type FaqAccordionVariantId,
} from "../../../../widgets/core/faqAccordion";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: FaqAccordionVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "single-column",
    label: "Single Column",
    description: "Simple vertical reading flow for FAQs.",
  },
  {
    id: "two-column",
    label: "Two Column",
    description: "Dense FAQ layout in two responsive columns.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Reduced visual density for short Q/A content.",
  },
];

const spacingOptions: Array<{ id: FaqAccordionSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const itemCountOptions = Array.from({ length: faqAccordionItemMax }, (_, index) =>
  String(index + 1)
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type HeaderData = NonNullable<FaqAccordionData["header"]>;
type OptionsData = NonNullable<FaqAccordionData["options"]>;
type StyleData = NonNullable<FaqAccordionData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: FaqAccordionData): FaqAccordionData {
  return normalizeFaqAccordionData(value);
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
  value: FaqAccordionVariantId;
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
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  updater: (current: FaqAccordionData) => FaqAccordionData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
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

function updateOptions(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  patch: Partial<OptionsData>
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
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
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
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  index: number,
  patch: Partial<FaqAccordionItem>
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFaqAccordionItems(current.items);
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

function setItemCount(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeFaqAccordionItems(current.items, count),
  }));
}

function addItem(value: FaqAccordionData, onChange: (next: FaqAccordionData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFaqAccordionItems(current.items);
    if (items.length >= faqAccordionItemMax) return current;

    return {
      ...current,
      items: normalizeFaqAccordionItems(
        [
          ...items,
          {
            question: `Question ${items.length + 1}`,
            answer: `Answer ${items.length + 1}`,
          },
        ],
        items.length + 1
      ),
    };
  });
}

function removeItem(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFaqAccordionItems(current.items);
    if (items.length <= 1) return current;

    const nextItems = items.filter((_, currentIndex) => currentIndex !== index);
    return {
      ...current,
      items: normalizeFaqAccordionItems(nextItems, nextItems.length),
    };
  });
}

function moveItem(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFaqAccordionItems(current.items);
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

function DiagnosticsSnapshot({ value }: { value: FaqAccordionData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function FaqAccordionWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FaqAccordionData>) {
  const normalized = normalizeValue(value);
  const items = normalizeFaqAccordionItems(normalized.items);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">FAQ layout</p>
        <Select
          value={resolveFaqAccordionVariant(variant)}
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
          placeholder="Frequently asked questions"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Questions count</p>
        <Select
          value={String(items.length)}
          onValueChange={(next) => setItemCount(value, onChange, Number(next))}
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
        <p className="text-sm font-medium">Questions and answers</p>
        {items.map((item, index) => (
          <div key={item.id ?? `wizard-question-${index + 1}`} className="space-y-2">
            <Input
              aria-label={`Question ${index + 1}`}
              value={item.question ?? ""}
              onChange={(event) =>
                updateItem(value, onChange, index, { question: event.target.value })
              }
              placeholder={`Question ${index + 1}`}
            />
            <Textarea
              aria-label={`Answer ${index + 1}`}
              value={item.answer ?? ""}
              onChange={(event) =>
                updateItem(value, onChange, index, { answer: event.target.value })
              }
              placeholder={`Answer ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqAccordionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FaqAccordionData>) {
  const normalized = normalizeValue(value);
  const items = normalizeFaqAccordionItems(normalized.items);
  const defaultOpenValue = String(normalized.options?.defaultOpenIndex ?? 0);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose FAQ layout and manage deterministic item count."
      >
        <VariantCards value={resolveFaqAccordionVariant(variant)} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Questions count</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setItemCount(value, onChange, Number(next))}
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
        description="Edit title and short helper description above the FAQ list."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Frequently asked questions"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Address objections with short and clear answers."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Questions and answers"
        description="Manage order and content of FAQ rows."
      >
        {items.map((item, index) => (
          <div key={item.id ?? `faq-item-${index + 1}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Item {index + 1}</p>
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
              <p className="text-sm font-medium">Question</p>
              <Input
                value={item.question ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { question: event.target.value })
                }
                placeholder={`Question ${index + 1}`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Answer</p>
              <Textarea
                value={item.answer ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { answer: event.target.value })
                }
                placeholder={`Answer ${index + 1}`}
              />
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={() => addItem(value, onChange)}>
          Add item
        </Button>
      </EditorSection>

      <EditorSection
        title="Display behavior"
        description="Control default open item and multiple-open behavior."
      >
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Allow multiple items open</p>
            <p className="text-xs text-muted-foreground">
              Keeps one deterministic default open state in preview.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.options?.allowMultipleOpen)}
            onCheckedChange={(checked) =>
              updateOptions(value, onChange, { allowMultipleOpen: Boolean(checked) })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Default open item</p>
          <Select
            value={defaultOpenValue}
            onValueChange={(next) =>
              updateOptions(value, onChange, { defaultOpenIndex: Number(next) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">None (all collapsed)</SelectItem>
              {items.map((item, index) => (
                <SelectItem key={item.id ?? `open-${index + 1}`} value={String(index)}>
                  {`Item ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Colors and spacing"
        description="Set accordion card colors and spacing density."
      >
        <ColorField
          label="Panel surface"
          value={normalized.style?.surface}
          onChange={(next) => updateStyle(value, onChange, { surface: next })}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Panel border"
          value={normalized.style?.border}
          onChange={(next) => updateStyle(value, onChange, { border: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <ColorField
          label="Divider color"
          value={normalized.style?.divider}
          onChange={(next) => updateStyle(value, onChange, { divider: next })}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                spacing: next as FaqAccordionSpacing,
              })
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
      </EditorSection>
    </div>
  );
}

export function FaqAccordionAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<FaqAccordionData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Open-state and fallback controls"
        description="Technical controls for default open item normalization."
      >
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Allow multiple items open</p>
            <p className="text-xs text-muted-foreground">
              Runtime keeps deterministic markers even when enabled.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.options?.allowMultipleOpen)}
            onCheckedChange={(checked) =>
              updateOptions(value, onChange, { allowMultipleOpen: Boolean(checked) })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Default open index</p>
          <Input
            type="number"
            value={String(normalized.options?.defaultOpenIndex ?? 0)}
            onChange={(event) =>
              updateOptions(value, onChange, {
                defaultOpenIndex: Number(event.target.value),
              })
            }
            min={-1}
            max={Math.max(0, normalizeFaqAccordionItems(normalized.items).length - 1)}
          />
          <p className="text-xs text-muted-foreground">
            Use <code>-1</code> to collapse all items by default.
          </p>
        </div>
      </EditorSection>

      <EditorSection
        title="Technical style tokens"
        description="Raw token values used by renderer for panel colors and spacing."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Panel surface token</p>
          <Input
            value={normalized.style?.surface ?? ""}
            onChange={(event) => updateStyle(value, onChange, { surface: event.target.value })}
            placeholder="var(--color-bg)"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Panel border token</p>
          <Input
            value={normalized.style?.border ?? ""}
            onChange={(event) => updateStyle(value, onChange, { border: event.target.value })}
            placeholder="var(--color-border)"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Divider token</p>
          <Input
            value={normalized.style?.divider ?? ""}
            onChange={(event) => updateStyle(value, onChange, { divider: event.target.value })}
            placeholder="var(--color-border)"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing token</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as FaqAccordionSpacing })
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
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback values for IDs and missing content."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(faqAccordionDefaults)}>
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

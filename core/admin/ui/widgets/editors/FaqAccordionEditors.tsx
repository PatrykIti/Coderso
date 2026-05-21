import { type ReactNode, useState } from "react";

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
  resolveFaqAccordionSpacing,
  normalizeFaqAccordionData,
  normalizeFaqAccordionItems,
  resolveFaqAccordionVariant,
  type FaqAccordionAnswerFormat,
  type FaqAccordionBorderWidth,
  type FaqAccordionData,
  type FaqAccordionHeaderAlign,
  type FaqAccordionHeaderTitleSize,
  type FaqAccordionItem,
  type FaqAccordionMaxWidth,
  type FaqAccordionMotion,
  type FaqAccordionPanelRadius,
  type FaqAccordionSectionPaddingX,
  type FaqAccordionSectionPaddingY,
  type FaqAccordionSpacing,
  type FaqAccordionVariantId,
} from "../../../../widgets/core/faqAccordion";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ConfirmActionDialog } from "../../shared/ConfirmActionDialog";
import { ClearableFieldHeader, SharedColorFieldInputs } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

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

const answerFormatOptions: Array<{ id: FaqAccordionAnswerFormat; label: string }> = [
  { id: "plain", label: "Plain text" },
  { id: "markdown", label: "Markdown" },
];

const maxWidthOptions: Array<{ id: FaqAccordionMaxWidth; label: string }> = [
  { id: "sm", label: "Narrow" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Wide" },
  { id: "xl", label: "Extra wide" },
  { id: "full", label: "Full width" },
];

const headerAlignOptions: Array<{ id: FaqAccordionHeaderAlign; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const paddingXOptions: Array<{ id: FaqAccordionSectionPaddingX; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Tight" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Roomy" },
];

const paddingYOptions: Array<{ id: FaqAccordionSectionPaddingY; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Tight" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Roomy" },
];

const panelRadiusOptions: Array<{ id: FaqAccordionPanelRadius; label: string }> = [
  { id: "none", label: "Square" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const borderWidthOptions: Array<{ id: FaqAccordionBorderWidth; label: string }> = [
  { id: "0", label: "0 px" },
  { id: "1", label: "1 px" },
  { id: "2", label: "2 px" },
  { id: "3", label: "3 px" },
];

const headerTitleSizeOptions: Array<{ id: FaqAccordionHeaderTitleSize; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const motionOptions: Array<{ id: FaqAccordionMotion; label: string }> = [
  { id: "none", label: "No animation" },
  { id: "smooth", label: "Smooth" },
];

const itemCountOptions = Array.from({ length: faqAccordionItemMax }, (_, index) =>
  String(index + 1)
);

type HeaderData = NonNullable<FaqAccordionData["header"]>;
type OptionsData = NonNullable<FaqAccordionData["options"]>;
type StyleData = NonNullable<FaqAccordionData["style"]>;

function normalizeValue(value: FaqAccordionData): FaqAccordionData {
  return normalizeFaqAccordionData(value);
}

function EditorSection({
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
            <div className="min-w-0 space-y-2">
              <div
                aria-hidden="true"
                className={cn(
                  "grid h-11 w-20 overflow-hidden rounded-md border bg-muted/30 p-1",
                  option.id === "two-column" ? "grid-cols-2 gap-1" : "grid-cols-1 gap-1"
                )}
              >
                <span className="rounded bg-foreground/15" />
                <span className="rounded bg-foreground/10" />
                <span
                  className={cn(
                    "rounded bg-foreground/10",
                    option.id === "compact" ? "h-2" : undefined
                  )}
                />
              </div>
              <p className="text-sm font-semibold leading-tight">{option.label}</p>
            </div>
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
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader
        label={label}
        value={value}
        onClear={onClear}
        onRestoreValue={onChange}
      />
      <SharedColorFieldInputs
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        pickerFallback={pickerFallback}
      />
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

function clearStyleField(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
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

function removeItemsById(
  value: FaqAccordionData,
  onChange: (next: FaqAccordionData) => void,
  ids: string[]
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeFaqAccordionItems(current.items);
    const blockedIds = new Set(ids);
    const nextItems = items.filter((item) => !blockedIds.has(item.id ?? ""));
    if (nextItems.length === 0) return current;

    return {
      ...current,
      items: normalizeFaqAccordionItems(nextItems, nextItems.length),
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

function getFaqItemEditorLabel(item: FaqAccordionItem, index: number): string {
  const question = (item.question ?? "").trim();
  if (question.length > 0) {
    return `Item ${index + 1}: ${question.slice(0, 56)}`;
  }
  return `Item ${index + 1}: Untitled question`;
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
        <p className="text-sm font-medium">Section description</p>
        <Textarea
          value={normalized.header?.description ?? ""}
          onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
          placeholder="Address objections with short and clear answers."
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
          <div
            key={item.id ?? `wizard-question-${index + 1}`}
            className="space-y-2 rounded-lg border p-3"
          >
            <div className="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Icon
                </p>
                <Input
                  aria-label={`Icon ${index + 1}`}
                  value={item.icon ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="⭐"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Answer mode
                </p>
                <Select
                  value={item.answerFormat ?? "plain"}
                  onValueChange={(next) =>
                    updateItem(value, onChange, index, {
                      answerFormat: next as FaqAccordionAnswerFormat,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select answer mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {answerFormatOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const normalized = normalizeValue(value);
  const items = normalizeFaqAccordionItems(normalized.items);
  const itemIds = items.map((item) => item.id ?? "");
  const selectedIds = selectedItemIds.filter((id) => itemIds.includes(id));
  const defaultOpenValue = String(normalized.options?.defaultOpenIndex ?? 0);
  const canDeleteSelection = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleDrop = (targetId: string) => {
    if (!draggedItemId || draggedItemId === targetId) return;
    const fromIndex = items.findIndex((item) => item.id === draggedItemId);
    const toIndex = items.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    moveItem(value, onChange, fromIndex, toIndex);
    setDraggedItemId(null);
  };

  const toggleSelectedItem = (id: string, checked: boolean) => {
    setSelectedItemIds((current) => {
      const next = current.filter((itemId) => itemId !== id);
      if (!checked) return next;
      return [...next, id];
    });
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose FAQ layout and manage deterministic item count."
      >
        <VariantCards value={resolveFaqAccordionVariant(variant)} onChange={onVariantChange} />

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Questions count</p>
            <p className="text-xs text-muted-foreground">
              {items.length}/{faqAccordionItemMax} items configured
            </p>
          </div>
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
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {items.length}/{faqAccordionItemMax} items configured
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem(value, onChange)}
              disabled={items.length >= faqAccordionItemMax}
            >
              Add item
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={!canDeleteSelection}
            >
              Delete selected
            </Button>
          </div>
        </div>

        {items.map((item, index) => (
          <div
            key={item.id ?? `faq-item-${index + 1}`}
            className="space-y-3 rounded-lg border p-3"
            draggable={items.length > 1}
            onDragStart={() => setDraggedItemId(item.id ?? null)}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={() => handleDrop(item.id ?? "")}
            onDragEnd={() => setDraggedItemId(null)}
            data-faq-drag-item={item.id ?? `faq-item-${index + 1}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id ?? "")}
                  onChange={(event) => toggleSelectedItem(item.id ?? "", event.target.checked)}
                  aria-label={`Select ${getFaqItemEditorLabel(item, index)}`}
                />
                <p className="truncate text-sm font-semibold">
                  {getFaqItemEditorLabel(item, index)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(value, onChange, index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move item ${index + 1} up`}
                  title="Move up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(value, onChange, index, index + 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move item ${index + 1} down`}
                  title="Move down"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingDeleteId(item.id ?? null)}
                  disabled={items.length <= 1}
                  aria-label={`Remove item ${index + 1}`}
                  title="Remove"
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <div className="space-y-2">
                <p className="text-sm font-medium">Icon</p>
                <Input
                  value={item.icon ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="⭐"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Answer mode</p>
                <Select
                  value={item.answerFormat ?? "plain"}
                  onValueChange={(next) =>
                    updateItem(value, onChange, index, {
                      answerFormat: next as FaqAccordionAnswerFormat,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select answer mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {answerFormatOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {getFaqItemEditorLabel(item, index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Layout and typography"
        description="Control FAQ width, header alignment, spacing, title scale, and motion."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Max width</p>
          <Select
            value={normalized.style?.maxWidth ?? "xl"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { maxWidth: next as FaqAccordionMaxWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select width" />
            </SelectTrigger>
            <SelectContent>
              {maxWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Header alignment</p>
            <Select
              value={normalized.style?.headerAlign ?? "center"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  headerAlign: next as FaqAccordionHeaderAlign,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                {headerAlignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Header title size</p>
            <Select
              value={normalized.style?.headerTitleSize ?? "auto"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  headerTitleSize: next as FaqAccordionHeaderTitleSize,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select title size" />
              </SelectTrigger>
              <SelectContent>
                {headerTitleSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Horizontal padding</p>
            <Select
              value={normalized.style?.sectionPaddingX ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  sectionPaddingX: next as FaqAccordionSectionPaddingX,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select horizontal padding" />
              </SelectTrigger>
              <SelectContent>
                {paddingXOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Vertical padding</p>
            <Select
              value={normalized.style?.sectionPaddingY ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  sectionPaddingY: next as FaqAccordionSectionPaddingY,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vertical padding" />
              </SelectTrigger>
              <SelectContent>
                {paddingYOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Motion</p>
          <Select
            value={normalized.style?.motion ?? "none"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { motion: next as FaqAccordionMotion })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select motion" />
            </SelectTrigger>
            <SelectContent>
              {motionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Colors and panel style"
        description="Set FAQ card colors, border style, and text emphasis."
      >
        <ColorField
          label="Panel surface"
          value={normalized.style?.surface}
          onChange={(next) => updateStyle(value, onChange, { surface: next })}
          onClear={() => clearStyleField(value, onChange, "surface")}
          placeholder="var(--color-bg)"
          pickerFallback="#ffffff"
        />

        <ColorField
          label="Panel border"
          value={normalized.style?.border}
          onChange={(next) => updateStyle(value, onChange, { border: next })}
          onClear={() => clearStyleField(value, onChange, "border")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <ColorField
          label="Divider color"
          value={normalized.style?.divider}
          onChange={(next) => updateStyle(value, onChange, { divider: next })}
          onClear={() => clearStyleField(value, onChange, "divider")}
          placeholder="var(--color-border)"
          pickerFallback="#e2e8f0"
        />

        <ColorField
          label="Question text color"
          value={normalized.style?.questionTextColor}
          onChange={(next) => updateStyle(value, onChange, { questionTextColor: next })}
          onClear={() => clearStyleField(value, onChange, "questionTextColor")}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />

        <ColorField
          label="Answer text color"
          value={normalized.style?.answerTextColor}
          onChange={(next) => updateStyle(value, onChange, { answerTextColor: next })}
          onClear={() => clearStyleField(value, onChange, "answerTextColor")}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />

        <ColorField
          label="Header title color"
          value={normalized.style?.headerTitleColor}
          onChange={(next) => updateStyle(value, onChange, { headerTitleColor: next })}
          onClear={() => clearStyleField(value, onChange, "headerTitleColor")}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />

        <ColorField
          label="Header description color"
          value={normalized.style?.headerDescriptionColor}
          onChange={(next) => updateStyle(value, onChange, { headerDescriptionColor: next })}
          onClear={() => clearStyleField(value, onChange, "headerDescriptionColor")}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />

        <div className="grid gap-3 sm:grid-cols-2">
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

          <div className="space-y-2">
            <p className="text-sm font-medium">Panel radius</p>
            <Select
              value={normalized.style?.panelRadius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  panelRadius: next as FaqAccordionPanelRadius,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select panel radius" />
              </SelectTrigger>
              <SelectContent>
                {panelRadiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Border width</p>
          <Select
            value={normalized.style?.borderWidth ?? "1"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { borderWidth: next as FaqAccordionBorderWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select border width" />
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
      </EditorSection>

      <EditorSection
        title="SEO and structured data"
        description="Optionally expose a public FAQPage schema for search engines."
      >
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Emit FAQPage JSON-LD</p>
            <p className="text-xs text-muted-foreground">
              Publishes normalized question and answer text in page source.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.seo?.emitFaqJsonLd)}
            onCheckedChange={(checked) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                seo: {
                  ...current.seo,
                  emitFaqJsonLd: Boolean(checked),
                },
              }))
            }
          />
        </div>
      </EditorSection>

      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Remove FAQ item?"
        description="Remove this question and answer from the FAQ? This keeps the minimum one-item guard."
        confirmLabel="Remove item"
        onConfirm={() => {
          const deleteIndex = items.findIndex((item) => item.id === pendingDeleteId);
          if (deleteIndex >= 0) {
            removeItem(value, onChange, deleteIndex);
          }
          setPendingDeleteId(null);
        }}
      />

      <ConfirmActionDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
        }}
        title="Delete selected FAQ items?"
        description={`Delete ${selectedIds.length} selected item${selectedIds.length === 1 ? "" : "s"}? This cannot remove the final remaining FAQ row.`}
        confirmLabel="Delete selected"
        onConfirm={() => {
          if (canDeleteSelection) {
            removeItemsById(value, onChange, selectedIds);
          }
          setSelectedItemIds([]);
          setBulkDeleteOpen(false);
        }}
      >
        {selectedIds
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is FaqAccordionItem => Boolean(item))
          .map((item, index) => getFaqItemEditorLabel(item, index))
          .join(" · ")}
      </ConfirmActionDialog>
    </div>
  );
}

export function FaqAccordionAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<FaqAccordionData>) {
  const normalized = normalizeValue(value);
  const items = normalizeFaqAccordionItems(normalized.items);

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
          <p className="text-sm font-medium">Default open item</p>
          <Select
            value={String(normalized.options?.defaultOpenIndex ?? 0)}
            onValueChange={(next) =>
              updateOptions(value, onChange, { defaultOpenIndex: Number(next) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">None - all collapsed</SelectItem>
              {items.map((item, index) => (
                <SelectItem key={item.id ?? `advanced-open-${index + 1}`} value={String(index)}>
                  {getFaqItemEditorLabel(item, index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Use the bounded selector above for normal editing, or adjust the raw index below for
            diagnostics.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Raw default open index</p>
          <Input
            type="number"
            value={String(normalized.options?.defaultOpenIndex ?? 0)}
            onChange={(event) =>
              updateOptions(value, onChange, {
                defaultOpenIndex: Number(event.target.value),
              })
            }
            min={-1}
            max={Math.max(0, items.length - 1)}
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
            value={resolveFaqAccordionSpacing(normalized.style?.spacing)}
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

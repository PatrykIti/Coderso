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
  faqAccordionItemMax,
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
import {
  hasClearableFieldValue,
  isPickerRepresentableColorValue,
  resolveColorPickerValue,
} from "./ClearableFields";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";
import type { WidgetEditorSectionRole } from "../../../../widgets/types";

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
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: "wizard" | "visual" | "advanced";
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
  id,
  label,
  value,
  onChange,
  pickerFallback,
  onClear,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  pickerFallback: string;
  onClear?: () => void;
}) {
  const hasValue = hasClearableFieldValue(value);
  const hasCustomValue = hasValue && !isPickerRepresentableColorValue(value);
  const pickerValue = resolveColorPickerValue(value, pickerFallback);

  return (
    <WidgetControlRow
      id={id}
      label={label}
      path={id.replace("faq-accordion.", "")}
      actions={
        onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!hasValue}>
            Clear
          </Button>
        ) : null
      }
    >
      {(fieldProps) => (
        <div className="space-y-3">
          <div className="grid grid-cols-[2.75rem_1fr] gap-3">
            <Input
              id={fieldProps.id}
              type="color"
              value={pickerValue}
              onChange={(event) => onChange(event.target.value)}
              className="h-10 w-11 p-1"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
            <div className="flex min-h-10 flex-wrap items-center gap-2">
              <span className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                {hasCustomValue
                  ? "Saved custom color"
                  : hasValue
                    ? "Selected color"
                    : "Theme default"}
              </span>
            </div>
          </div>
          {hasCustomValue ? (
            <p className="rounded-md border border-dashed border-border/70 bg-muted/40 p-2 text-xs text-muted-foreground">
              A saved custom color is configured. Pick a swatch to replace it, or clear the field.
            </p>
          ) : null}
        </div>
      )}
    </WidgetControlRow>
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

function findOptionLabel(options: ReadonlyArray<{ id: string; label: string }>, value: string) {
  return options.find((option) => option.id === value)?.label ?? value;
}

function describeColorValue(value: string | undefined) {
  if (!hasClearableFieldValue(value)) return "Theme default";
  return isPickerRepresentableColorValue(value) ? "Selected color" : "Saved custom color";
}

function describeFaqDefaultOpen(value: FaqAccordionData, items: FaqAccordionItem[]) {
  const index = normalizeValue(value).options?.defaultOpenIndex ?? 0;
  if (index === -1) return "All collapsed";
  const item = items[index];
  return item ? getFaqItemEditorLabel(item, index) : "Fallback to first item";
}

function describeFaqAnswerFormats(items: FaqAccordionItem[]) {
  const formats = Array.from(new Set(items.map((item) => item.answerFormat ?? "plain"))).sort();
  return formats.map((format) => findOptionLabel(answerFormatOptions, format)).join(", ");
}

function describeFaqLayout(value: FaqAccordionData) {
  const normalized = normalizeValue(value);
  return [
    findOptionLabel(maxWidthOptions, normalized.style?.maxWidth ?? "xl"),
    findOptionLabel(headerAlignOptions, normalized.style?.headerAlign ?? "center"),
    findOptionLabel(spacingOptions, normalized.style?.spacing ?? "md"),
  ].join(" · ");
}

function describeFaqPanelStyle(value: FaqAccordionData) {
  const normalized = normalizeValue(value);
  return [
    `${findOptionLabel(panelRadiusOptions, normalized.style?.panelRadius ?? "lg")} corners`,
    `${findOptionLabel(borderWidthOptions, normalized.style?.borderWidth ?? "1")} border`,
    `${findOptionLabel(headerTitleSizeOptions, normalized.style?.headerTitleSize ?? "auto")} title`,
  ].join(" · ");
}

function describeFaqSavedData(value: FaqAccordionData) {
  const sourceItems = Array.isArray(value.items) ? value.items : [];
  const normalized = normalizeValue(value);
  const normalizedItems = normalizeFaqAccordionItems(normalized.items);
  const sourceIds = sourceItems
    .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
    .filter(Boolean);
  const hasDuplicateIds = sourceIds.length !== new Set(sourceIds).size;
  const hasMissingRequiredCopy = sourceItems.some(
    (item) => !item.question?.trim() || !item.answer?.trim()
  );
  const normalizedDefaultOpen = normalized.options?.defaultOpenIndex ?? 0;
  const sourceDefaultOpen = value.options?.defaultOpenIndex;
  const hasOpenStateRepair =
    typeof sourceDefaultOpen === "number" && sourceDefaultOpen !== normalizedDefaultOpen;
  const hasCountRepair = sourceItems.length !== normalizedItems.length;
  const hasStyleRepair =
    value.style?.spacing !== undefined && value.style.spacing !== normalized.style?.spacing;

  return hasDuplicateIds ||
    hasMissingRequiredCopy ||
    hasOpenStateRepair ||
    hasCountRepair ||
    hasStyleRepair
    ? "Saved FAQ data will be repaired automatically when the page is saved."
    : "Saved FAQ data is already clean.";
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
    <WidgetEditorSection
      id="faq-accordion.wizard.starter-questions"
      mode="wizard"
      role="setup"
      title="Starter questions"
      description="Seed the FAQ layout, heading, and first question set."
    >
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
    </WidgetEditorSection>
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
          id="faq-accordion.style.surface"
          label="Panel surface"
          value={normalized.style?.surface}
          onChange={(next) => updateStyle(value, onChange, { surface: next })}
          onClear={() => clearStyleField(value, onChange, "surface")}
          pickerFallback="#ffffff"
        />

        <ColorField
          id="faq-accordion.style.border"
          label="Panel border"
          value={normalized.style?.border}
          onChange={(next) => updateStyle(value, onChange, { border: next })}
          onClear={() => clearStyleField(value, onChange, "border")}
          pickerFallback="#e2e8f0"
        />

        <ColorField
          id="faq-accordion.style.divider"
          label="Divider color"
          value={normalized.style?.divider}
          onChange={(next) => updateStyle(value, onChange, { divider: next })}
          onClear={() => clearStyleField(value, onChange, "divider")}
          pickerFallback="#e2e8f0"
        />

        <ColorField
          id="faq-accordion.style.questionTextColor"
          label="Question text color"
          value={normalized.style?.questionTextColor}
          onChange={(next) => updateStyle(value, onChange, { questionTextColor: next })}
          onClear={() => clearStyleField(value, onChange, "questionTextColor")}
          pickerFallback="#0f172a"
        />

        <ColorField
          id="faq-accordion.style.answerTextColor"
          label="Answer text color"
          value={normalized.style?.answerTextColor}
          onChange={(next) => updateStyle(value, onChange, { answerTextColor: next })}
          onClear={() => clearStyleField(value, onChange, "answerTextColor")}
          pickerFallback="#0f172a"
        />

        <ColorField
          id="faq-accordion.style.headerTitleColor"
          label="Header title color"
          value={normalized.style?.headerTitleColor}
          onChange={(next) => updateStyle(value, onChange, { headerTitleColor: next })}
          onClear={() => clearStyleField(value, onChange, "headerTitleColor")}
          pickerFallback="#0f172a"
        />

        <ColorField
          id="faq-accordion.style.headerDescriptionColor"
          label="Header description color"
          value={normalized.style?.headerDescriptionColor}
          onChange={(next) => updateStyle(value, onChange, { headerDescriptionColor: next })}
          onClear={() => clearStyleField(value, onChange, "headerDescriptionColor")}
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
        title="Search visibility"
        description="Optionally let search engines understand the published FAQ answers."
      >
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Enable FAQ search enhancement</p>
            <p className="text-xs text-muted-foreground">
              Publishes normalized question and answer text for search engines without requiring
              custom code.
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

export function FaqAccordionAdvancedEditor({ value }: WidgetEditorProps<FaqAccordionData>) {
  const normalized = normalizeValue(value);
  const items = normalizeFaqAccordionItems(normalized.items);

  return (
    <div className="space-y-4">
      <EditorSection
        id="faq-accordion.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only summary of published FAQ behavior."
      >
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-allow-multiple-open"
          label="Allow multiple items open"
          path="options.allowMultipleOpen"
          value={normalized.options?.allowMultipleOpen ? "Enabled" : "Disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-default-open-item"
          label="Default open item"
          path="options.defaultOpenIndex"
          value={describeFaqDefaultOpen(normalized, items)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-item-count"
          label="Questions"
          path="items"
          value={`${items.length}/${faqAccordionItemMax} questions configured`}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-answer-formats"
          label="Answer formats"
          path="items"
          value={describeFaqAnswerFormats(items)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-search-enhancement"
          label="Search enhancement"
          path="seo.emitFaqJsonLd"
          value={normalized.seo?.emitFaqJsonLd ? "Enabled" : "Disabled"}
        />
      </EditorSection>

      <EditorSection
        id="faq-accordion.advanced.style-summary"
        mode="advanced"
        role="summary"
        title="Style summary"
        description="Read-only summary of the visual settings. Change styling in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-surface-token"
          label="Panel surface"
          path="style.surface"
          value={describeColorValue(normalized.style?.surface)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-border-token"
          label="Panel border"
          path="style.border"
          value={describeColorValue(normalized.style?.border)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-divider-token"
          label="Divider"
          path="style.divider"
          value={describeColorValue(normalized.style?.divider)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-question-color"
          label="Question text"
          path="style.questionTextColor"
          value={describeColorValue(normalized.style?.questionTextColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-answer-color"
          label="Answer text"
          path="style.answerTextColor"
          value={describeColorValue(normalized.style?.answerTextColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-layout-summary"
          label="Layout"
          path="style"
          value={describeFaqLayout(normalized)}
        />
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-panel-style"
          label="Panel style"
          path="style"
          value={describeFaqPanelStyle(normalized)}
        />
      </EditorSection>

      <EditorSection
        id="faq-accordion.advanced.normalization-support"
        mode="advanced"
        role="diagnostics"
        title="Saved data status"
        description="Read-only compatibility summary for saved FAQ data."
      >
        <ReadonlyWidgetSummaryRow
          id="faq-advanced-saved-data-status"
          label="Saved data"
          path="items"
          value={describeFaqSavedData(value)}
        />
      </EditorSection>
    </div>
  );
}

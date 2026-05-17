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
  accordionItemMax,
  accordionItemMin,
  accordionMaxWidthTokens,
  accordionMotionTokens,
  accordionPaddingTokens,
  accordionRadiusTokens,
  accordionSummaryFontSizeTokens,
  accordionSummaryFontWeightTokens,
  accordionVariantFallbackTokenMap,
  accordionVariantFallbackClassMap,
  normalizeAccordionData,
  normalizeAccordionItems,
  type AccordionData,
  type AccordionVariantId,
} from "../../../../widgets/core/accordion";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

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

const accordionMotionOptions = accordionMotionTokens.map((id) => ({
  id,
  label: id === "none" ? "None" : id === "subtle" ? "Subtle" : "Smooth",
}));

const accordionPaddingOptions = accordionPaddingTokens.map((id) => ({
  id,
  label: id === "sm" ? "Compact" : id === "md" ? "Default" : "Spacious",
}));

const accordionRadiusOptions = accordionRadiusTokens.map((id) => ({
  id,
  label: id === "sm" ? "Small" : id === "md" ? "Medium" : id === "lg" ? "Large" : "Extra large",
}));

const accordionSummaryFontSizeOptions = accordionSummaryFontSizeTokens.map((id) => ({
  id,
  label: id === "sm" ? "Small" : id === "base" ? "Default" : "Large",
}));

const accordionSummaryFontWeightOptions = accordionSummaryFontWeightTokens.map((id) => ({
  id,
  label: id === "medium" ? "Medium" : id === "semibold" ? "Semibold" : "Bold",
}));

const accordionMaxWidthOptions = accordionMaxWidthTokens.map((id) => ({
  id,
  label: id === "sm" ? "Medium" : id === "md" ? "Wide" : id === "lg" ? "Extra wide" : "Full width",
}));

const accordionNoneOpenValue = "__none__";
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function resolveVariant(variant: string): AccordionVariantId {
  if (variant === "bordered" || variant === "compact") return variant;
  return "soft";
}

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

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
  const itemIds = new Set(items.map((item) => item.id));
  const currentDefaultOpenIds = (current.options?.defaultOpenIds ?? []).filter((id) =>
    itemIds.has(id)
  );
  const keepsAllCollapsed =
    (current.options?.collapsible ?? true) && (current.options?.defaultOpenIds?.length ?? 0) === 0;
  const nextDefaultOpenIds = keepsAllCollapsed
    ? []
    : currentDefaultOpenIds.length > 0
      ? current.options?.openMode === "multiple"
        ? currentDefaultOpenIds
        : [currentDefaultOpenIds[0]!]
      : items[0]?.id
        ? [items[0].id]
        : [];
  const initiallyOpenId = nextDefaultOpenIds[0];

  onChange(
    normalizeValue(
      {
        ...current,
        items,
        options: {
          ...current.options,
          defaultOpenIds: nextDefaultOpenIds,
          initiallyOpenId,
        },
      },
      count
    )
  );
}

function updateItem(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  itemId: string,
  patch: { title?: string; description?: string; icon?: string },
  desiredCount?: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeAccordionItems(current.items, desiredCount).map((item) =>
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

function updateLayout(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  patch: Partial<NonNullable<AccordionData["layout"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
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

function clearStyleField(
  value: AccordionData,
  onChange: (next: AccordionData) => void,
  key: keyof NonNullable<AccordionData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
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
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
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
      {typeof value === "string" && value.trim().startsWith("var(") ? (
        <p className="text-xs text-muted-foreground">
          CSS token is preserved in data; the swatch shows a safe preview color.
        </p>
      ) : null}
    </div>
  );
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function resolveAccordionSlotTargetCount(
  context: WidgetEditorProps<AccordionData>["context"] | undefined
) {
  return context?.slotTargets?.filter((target) => target.definitionId === "item").length ?? 0;
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
          <div
            className={cn(
              "mt-3 overflow-hidden border bg-muted/20",
              accordionVariantFallbackClassMap[option.id].radiusClass
            )}
          >
            <div
              className={cn(
                "border-b bg-background/80",
                accordionVariantFallbackClassMap[option.id].summaryPaddingClass
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-2 w-20 rounded bg-foreground/70" />
                <div className="h-2 w-2 rounded-full bg-foreground/40" />
              </div>
            </div>
            <div
              className={cn(
                "space-y-2 bg-background/50",
                accordionVariantFallbackClassMap[option.id].contentPaddingClass
              )}
            >
              <div className="h-2 w-full rounded bg-foreground/20" />
              <div className="h-2 w-4/5 rounded bg-foreground/10" />
            </div>
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
  context,
  includeInitialOpenControl = false,
}: {
  value: AccordionData;
  onChange: (next: AccordionData) => void;
  context?: WidgetEditorProps<AccordionData>["context"];
  includeInitialOpenControl?: boolean;
}) {
  const slotTargetCount = resolveAccordionSlotTargetCount(context);
  const desiredCount =
    !includeInitialOpenControl && slotTargetCount > 0 ? slotTargetCount : undefined;
  const normalized = normalizeValue(value, desiredCount);
  const items = normalizeAccordionItems(normalized.items, desiredCount);
  const defaultOpenIds = normalized.options?.defaultOpenIds ?? [];
  const allowsAllClosed = normalized.options?.collapsible ?? true;
  const initialOpenValue =
    defaultOpenIds[0] ?? (allowsAllClosed ? accordionNoneOpenValue : (items[0]?.id ?? "1"));

  return (
    <EditorSection
      id="accordion.items"
      title="Items"
      description="Set titles and helper text for each item."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {includeInitialOpenControl ? (
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
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Item count</p>
            <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Use the shared Structure controls in Visual mode to add or remove Accordion items.
              Advanced mode reflects the current slot-backed item count.
            </p>
          </div>
        )}

        {includeInitialOpenControl ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Initially open item</p>
            <Select
              value={initialOpenValue}
              onValueChange={(next) => {
                if (next === accordionNoneOpenValue) {
                  updateOptions(value, onChange, {
                    initiallyOpenId: undefined,
                    defaultOpenIds: [],
                  });
                  return;
                }
                updateOptions(value, onChange, {
                  initiallyOpenId: next,
                  defaultOpenIds: [next],
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose item" />
              </SelectTrigger>
              <SelectContent>
                {allowsAllClosed ? (
                  <SelectItem value={accordionNoneOpenValue}>None - start collapsed</SelectItem>
                ) : null}
                {items.map((item) => (
                  <SelectItem key={`accordion-open-${item.id}`} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {context?.slotTargets?.[index]?.label ?? `Item ${index + 1}`}
            </p>
            <Input
              value={item.title}
              onChange={(event) =>
                updateItem(value, onChange, item.id, { title: event.target.value }, items.length)
              }
              placeholder={`Section ${index + 1}`}
            />
            <Input
              value={item.description ?? ""}
              onChange={(event) =>
                updateItem(
                  value,
                  onChange,
                  item.id,
                  {
                    description: event.target.value,
                  },
                  items.length
                )
              }
              placeholder="Optional summary text"
            />
            <Input
              value={item.icon ?? ""}
              onChange={(event) =>
                updateItem(
                  value,
                  onChange,
                  item.id,
                  {
                    icon: event.target.value,
                  },
                  items.length
                )
              }
              placeholder="Optional icon or emoji"
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
  variant,
  context,
}: {
  value: AccordionData;
  onChange: (next: AccordionData) => void;
  variant: AccordionVariantId;
  context?: WidgetEditorProps<AccordionData>["context"];
}) {
  const slotTargetCount = resolveAccordionSlotTargetCount(context);
  const desiredCount = slotTargetCount > 0 ? slotTargetCount : undefined;
  const normalized = normalizeValue(value, desiredCount);
  const items = normalizeAccordionItems(normalized.items, desiredCount);
  const openMode = normalized.options?.openMode ?? "single";
  const defaultOpenIds = normalized.options?.defaultOpenIds ?? [];
  const allowsAllClosed = normalized.options?.collapsible ?? true;
  const singleOpenValue =
    defaultOpenIds[0] ?? (allowsAllClosed ? accordionNoneOpenValue : (items[0]?.id ?? "1"));
  const fallbackTokens = accordionVariantFallbackTokenMap[variant];

  return (
    <EditorSection
      id="accordion.behavior-style"
      title="Behavior and Style"
      description="Control open state, layout, styling, and motion."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Open mode</p>
          <Select
            value={openMode}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                openMode: next as "single" | "multiple",
                allowMultiple: next === "multiple",
                defaultOpenIds:
                  next === "multiple" ? defaultOpenIds : [defaultOpenIds[0] ?? items[0]?.id ?? "1"],
                initiallyOpenId: defaultOpenIds[0] ?? items[0]?.id ?? "1",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose open mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single open item</SelectItem>
              <SelectItem value="multiple">Multiple open items</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Allow all sections to close</p>
            <p className="text-xs text-muted-foreground">
              Turn this on if visitors should be able to collapse every section.
            </p>
          </div>
          <Switch
            checked={normalized.options?.collapsible ?? true}
            onCheckedChange={(checked) => updateOptions(value, onChange, { collapsible: checked })}
          />
        </div>
      </div>

      {openMode === "single" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Default open item</p>
          <Select
            value={singleOpenValue}
            onValueChange={(next) => {
              if (next === accordionNoneOpenValue) {
                updateOptions(value, onChange, {
                  defaultOpenIds: [],
                  initiallyOpenId: undefined,
                });
                return;
              }
              updateOptions(value, onChange, {
                defaultOpenIds: [next],
                initiallyOpenId: next,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose item" />
            </SelectTrigger>
            <SelectContent>
              {allowsAllClosed ? (
                <SelectItem value={accordionNoneOpenValue}>None - start collapsed</SelectItem>
              ) : null}
              {items.map((item) => (
                <SelectItem key={`accordion-default-open-${item.id}`} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Default open items</p>
          <div className="space-y-2 rounded-md border p-3">
            {items.map((item) => {
              const checked = defaultOpenIds.includes(item.id);
              return (
                <label
                  key={`accordion-default-open-checkbox-${item.id}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{item.title}</span>
                  <Switch
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      const nextIds = nextChecked
                        ? Array.from(new Set([...defaultOpenIds, item.id]))
                        : defaultOpenIds.filter((entry) => entry !== item.id);
                      const resolvedIds =
                        nextIds.length === 0 && !allowsAllClosed ? [item.id] : nextIds;
                      updateOptions(value, onChange, {
                        defaultOpenIds: resolvedIds,
                        initiallyOpenId: resolvedIds[0],
                      });
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Motion</p>
          <Select
            value={normalized.options?.motion ?? "none"}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                motion: next as NonNullable<NonNullable<AccordionData["options"]>["motion"]>,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose motion" />
            </SelectTrigger>
            <SelectContent>
              {accordionMotionOptions.map((option) => (
                <SelectItem key={`accordion-motion-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Max width</p>
          <Select
            value={normalized.layout?.maxWidth ?? "full"}
            onValueChange={(next) =>
              updateLayout(value, onChange, {
                maxWidth: next as NonNullable<NonNullable<AccordionData["layout"]>["maxWidth"]>,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose width" />
            </SelectTrigger>
            <SelectContent>
              {accordionMaxWidthOptions.map((option) => (
                <SelectItem key={`accordion-max-width-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Summary padding</p>
          <Select
            value={normalized.style?.summaryPadding ?? fallbackTokens.summaryPadding}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                summaryPadding: next as NonNullable<
                  NonNullable<AccordionData["style"]>["summaryPadding"]
                >,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose summary padding" />
            </SelectTrigger>
            <SelectContent>
              {accordionPaddingOptions.map((option) => (
                <SelectItem key={`accordion-summary-padding-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Content padding</p>
          <Select
            value={normalized.style?.contentPadding ?? fallbackTokens.contentPadding}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                contentPadding: next as NonNullable<
                  NonNullable<AccordionData["style"]>["contentPadding"]
                >,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose content padding" />
            </SelectTrigger>
            <SelectContent>
              {accordionPaddingOptions.map((option) => (
                <SelectItem key={`accordion-content-padding-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Corner radius</p>
          <Select
            value={normalized.style?.radius ?? fallbackTokens.radius}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                radius: next as NonNullable<NonNullable<AccordionData["style"]>["radius"]>,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose radius" />
            </SelectTrigger>
            <SelectContent>
              {accordionRadiusOptions.map((option) => (
                <SelectItem key={`accordion-radius-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Title size</p>
          <Select
            value={normalized.style?.summaryFontSize ?? fallbackTokens.summaryFontSize}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                summaryFontSize: next as NonNullable<
                  NonNullable<AccordionData["style"]>["summaryFontSize"]
                >,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose title size" />
            </SelectTrigger>
            <SelectContent>
              {accordionSummaryFontSizeOptions.map((option) => (
                <SelectItem key={`accordion-title-size-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Title weight</p>
          <Select
            value={normalized.style?.summaryFontWeight ?? fallbackTokens.summaryFontWeight}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                summaryFontWeight: next as NonNullable<
                  NonNullable<AccordionData["style"]>["summaryFontWeight"]
                >,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose title weight" />
            </SelectTrigger>
            <SelectContent>
              {accordionSummaryFontWeightOptions.map((option) => (
                <SelectItem key={`accordion-title-weight-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ColorField
          label="Surface color"
          value={normalized.style?.surfaceColor}
          onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          placeholder="var(--color-surface)"
          pickerFallback="#ffffff"
          onClear={() => clearStyleField(value, onChange, "surfaceColor")}
        />
        <ColorField
          label="Border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          placeholder="var(--color-border)"
          pickerFallback="#d4d4d8"
          onClear={() => clearStyleField(value, onChange, "borderColor")}
        />
        <ColorField
          label="Summary text color"
          value={normalized.style?.summaryTextColor}
          onChange={(next) => updateStyle(value, onChange, { summaryTextColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#111827"
          onClear={() => clearStyleField(value, onChange, "summaryTextColor")}
        />
        <ColorField
          label="Body text color"
          value={normalized.style?.descriptionTextColor}
          onChange={(next) => updateStyle(value, onChange, { descriptionTextColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#6b7280"
          onClear={() => clearStyleField(value, onChange, "descriptionTextColor")}
        />
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
      <EditorSection
        id="accordion.variant"
        title="Variant"
        description="Pick accordion visual style."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <StructureSection value={value} onChange={onChange} includeInitialOpenControl />
    </div>
  );
}

export function AccordionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<AccordionData>) {
  return (
    <div className="space-y-4">
      <EditorSection id="accordion.variant" title="Variant" description="Choose accordion style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <StructureSection value={value} onChange={onChange} context={context} />
      <BehaviorSection
        value={value}
        onChange={onChange}
        variant={resolveVariant(variant)}
        context={context}
      />
    </div>
  );
}

export function AccordionAdvancedEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<AccordionData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="accordion.variant"
        title="Variant"
        description="Variant and behavior tuning."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <StructureSection value={value} onChange={onChange} context={context} />
      <BehaviorSection
        value={value}
        onChange={onChange}
        variant={resolveVariant(variant)}
        context={context}
      />
      <EditorSection
        id="accordion.diagnostics"
        title="Diagnostics"
        description="Normalized payload preview."
      >
        <DiagnosticsSnapshot value={normalizeValue(value)} />
      </EditorSection>
    </div>
  );
}

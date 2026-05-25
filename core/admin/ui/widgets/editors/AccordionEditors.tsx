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
import type {
  WidgetEditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

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

function resolveColorControlValue(value: string | undefined, themeDefault?: string) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return themeDefault && normalized === themeDefault ? undefined : normalized;
}

function ColorField({
  id,
  path,
  label,
  value,
  onChange,
  pickerFallback,
  onClear,
  themeDefault,
}: {
  id: string;
  path: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  pickerFallback: string;
  onClear: () => void;
  themeDefault?: string;
}) {
  const controlValue = resolveColorControlValue(value, themeDefault);

  return (
    <WidgetControlRow id={id} label={label} path={path}>
      {() => (
        <SharedColorControl
          label={label}
          value={controlValue}
          onChange={onChange}
          onClear={controlValue ? onClear : undefined}
          pickerFallback={pickerFallback}
          showValueInput={false}
        />
      )}
    </WidgetControlRow>
  );
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: WidgetEditorMode;
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
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
  mode,
}: {
  value: AccordionData;
  onChange: (next: AccordionData) => void;
  context?: WidgetEditorProps<AccordionData>["context"];
  mode: "setup" | "presentation";
}) {
  const isSetupMode = mode === "setup";
  const slotTargetCount = resolveAccordionSlotTargetCount(context);
  const desiredCount = !isSetupMode && slotTargetCount > 0 ? slotTargetCount : undefined;
  const normalized = normalizeValue(value, desiredCount);
  const items = normalizeAccordionItems(normalized.items, desiredCount);
  const defaultOpenIds = normalized.options?.defaultOpenIds ?? [];
  const allowsAllClosed = normalized.options?.collapsible ?? true;
  const initialOpenValue =
    defaultOpenIds[0] ?? (allowsAllClosed ? accordionNoneOpenValue : (items[0]?.id ?? "1"));

  return (
    <EditorSection
      id={isSetupMode ? "accordion.wizard.starter-setup" : "accordion.visual.item-content"}
      mode={isSetupMode ? "wizard" : "visual"}
      role={isSetupMode ? "setup" : "content"}
      title={isSetupMode ? "Starter items" : "Item content"}
      description={
        isSetupMode
          ? "Set the initial item count and first open item before daily visual editing."
          : "Edit item titles, helper text, and optional decorative icons."
      }
    >
      {isSetupMode ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow
            id="accordion.wizard.item-count"
            label="Number of items"
            path="items.count"
          >
            {(fieldProps) => (
              <Select
                value={String(items.length)}
                onValueChange={(next) => setCount(value, onChange, Number(next))}
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id="accordion.wizard.default-open"
            label="Initially open item"
            path="options.defaultOpenIds"
          >
            {(fieldProps) => (
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
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {context?.slotTargets?.[index]?.label ?? `Item ${index + 1}`}
            </p>
            {isSetupMode ? (
              <>
                <ReadonlyWidgetSummaryRow
                  id={`accordion.wizard.item.${item.id}.title`}
                  label="Item title"
                  path={`items.${index}.title`}
                  value={item.title}
                  help="Visual owns daily item title edits after setup creates the item."
                />
                <ReadonlyWidgetSummaryRow
                  id={`accordion.wizard.item.${item.id}.description`}
                  label="Summary text"
                  path={`items.${index}.description`}
                  value={item.description || "Not set"}
                />
              </>
            ) : (
              <>
                <WidgetControlRow
                  id={`accordion.visual.item.${item.id}.title`}
                  label="Item title"
                  path={`items.${index}.title`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                      value={item.title}
                      onChange={(event) =>
                        updateItem(
                          value,
                          onChange,
                          item.id,
                          { title: event.target.value },
                          items.length
                        )
                      }
                      placeholder={`Section ${index + 1}`}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`accordion.visual.item.${item.id}.description`}
                  label="Summary text"
                  path={`items.${index}.description`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
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
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`accordion.visual.item.${item.id}.icon`}
                  label="Icon or emoji"
                  path={`items.${index}.icon`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
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
                  )}
                </WidgetControlRow>
              </>
            )}
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
  const defaultOpenLabels = defaultOpenIds
    .map((id) => items.find((item) => item.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  const fallbackTokens = accordionVariantFallbackTokenMap[variant];

  return (
    <EditorSection
      id="accordion.visual.behavior-style"
      mode="visual"
      role="visual"
      title="Behavior and Style"
      description="Control open state, layout, styling, and motion."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetControlRow id="accordion.visual.open-mode" label="Open mode" path="options.openMode">
          {(fieldProps) => (
            <Select
              value={openMode}
              onValueChange={(next) =>
                updateOptions(value, onChange, {
                  openMode: next as "single" | "multiple",
                  allowMultiple: next === "multiple",
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Choose open mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single open item</SelectItem>
                <SelectItem value="multiple">Multiple open items</SelectItem>
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="accordion.visual.collapsible"
          label="Allow all sections to close"
          help="Turn this on if visitors should be able to collapse every section."
          path="options.collapsible"
        >
          {() => (
            <div className="flex items-center justify-between rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Visitor collapse behavior</p>
              <Switch
                checked={normalized.options?.collapsible ?? true}
                onCheckedChange={(checked) =>
                  updateOptions(value, onChange, { collapsible: checked })
                }
              />
            </div>
          )}
        </WidgetControlRow>
      </div>

      <ReadonlyWidgetSummaryRow
        id="accordion.visual.default-open-summary"
        label="Default open setup"
        path="options.defaultOpenIds"
        value={defaultOpenLabels.length > 0 ? defaultOpenLabels.join(", ") : "All collapsed"}
        help="Wizard owns the starter default open item until the one-time Wizard lifecycle lands."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetControlRow id="accordion.visual.motion" label="Motion" path="options.motion">
          {(fieldProps) => (
            <Select
              value={normalized.options?.motion ?? "none"}
              onValueChange={(next) =>
                updateOptions(value, onChange, {
                  motion: next as NonNullable<NonNullable<AccordionData["options"]>["motion"]>,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="accordion.visual.max-width" label="Max width" path="layout.maxWidth">
          {(fieldProps) => (
            <Select
              value={normalized.layout?.maxWidth ?? "full"}
              onValueChange={(next) =>
                updateLayout(value, onChange, {
                  maxWidth: next as NonNullable<NonNullable<AccordionData["layout"]>["maxWidth"]>,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <WidgetControlRow
          id="accordion.visual.summary-padding"
          label="Summary padding"
          path="style.summaryPadding"
        >
          {(fieldProps) => (
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
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="accordion.visual.content-padding"
          label="Content padding"
          path="style.contentPadding"
        >
          {(fieldProps) => (
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
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="accordion.visual.radius" label="Corner radius" path="style.radius">
          {(fieldProps) => (
            <Select
              value={normalized.style?.radius ?? fallbackTokens.radius}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  radius: next as NonNullable<NonNullable<AccordionData["style"]>["radius"]>,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetControlRow
          id="accordion.visual.summary-font-size"
          label="Title size"
          path="style.summaryFontSize"
        >
          {(fieldProps) => (
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
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="accordion.visual.summary-font-weight"
          label="Title weight"
          path="style.summaryFontWeight"
        >
          {(fieldProps) => (
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
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ColorField
          id="accordion.visual.surface-color"
          path="style.surfaceColor"
          label="Surface color"
          value={normalized.style?.surfaceColor}
          onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          pickerFallback="#ffffff"
          onClear={() => clearStyleField(value, onChange, "surfaceColor")}
          themeDefault={accordionDefaults.style?.surfaceColor}
        />
        <ColorField
          id="accordion.visual.border-color"
          path="style.borderColor"
          label="Border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          pickerFallback="#d4d4d8"
          onClear={() => clearStyleField(value, onChange, "borderColor")}
          themeDefault={accordionDefaults.style?.borderColor}
        />
        <ColorField
          id="accordion.visual.summary-text-color"
          path="style.summaryTextColor"
          label="Summary text color"
          value={normalized.style?.summaryTextColor}
          onChange={(next) => updateStyle(value, onChange, { summaryTextColor: next })}
          pickerFallback="#111827"
          onClear={() => clearStyleField(value, onChange, "summaryTextColor")}
          themeDefault={accordionDefaults.style?.summaryTextColor}
        />
        <ColorField
          id="accordion.visual.description-text-color"
          path="style.descriptionTextColor"
          label="Body text color"
          value={normalized.style?.descriptionTextColor}
          onChange={(next) => updateStyle(value, onChange, { descriptionTextColor: next })}
          pickerFallback="#6b7280"
          onClear={() => clearStyleField(value, onChange, "descriptionTextColor")}
        />
      </div>
    </EditorSection>
  );
}

export function AccordionWizardEditor({ value, onChange }: WidgetEditorProps<AccordionData>) {
  return (
    <div className="space-y-4">
      <StructureSection value={value} onChange={onChange} mode="setup" />
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
      <EditorSection
        id="accordion.visual.variant"
        mode="visual"
        role="visual"
        title="Variant"
        description="Choose accordion style."
      >
        <WidgetControlRow id="accordion.visual.variant-picker" label="Variant" path="variant">
          {() => <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />}
        </WidgetControlRow>
      </EditorSection>
      <StructureSection value={value} onChange={onChange} context={context} mode="presentation" />
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
  variant,
  context,
}: WidgetEditorProps<AccordionData>) {
  const slotTargetCount = resolveAccordionSlotTargetCount(context);
  const desiredCount = slotTargetCount > 0 ? slotTargetCount : undefined;
  const normalized = normalizeValue(value, desiredCount);
  const items = normalizeAccordionItems(normalized.items, desiredCount);
  const defaultOpenIds = normalized.options?.defaultOpenIds ?? [];
  const openMode = normalized.options?.openMode ?? "single";
  const selectedVariant = resolveVariant(variant);
  const defaultOpenLabels = defaultOpenIds
    .map((id) => items.find((item) => item.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  const savedColorCount = [
    resolveColorControlValue(normalized.style?.surfaceColor, accordionDefaults.style?.surfaceColor),
    resolveColorControlValue(normalized.style?.borderColor, accordionDefaults.style?.borderColor),
    resolveColorControlValue(
      normalized.style?.summaryTextColor,
      accordionDefaults.style?.summaryTextColor
    ),
    resolveColorControlValue(normalized.style?.descriptionTextColor),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <EditorSection
        id="accordion.advanced.behavior-summary"
        mode="advanced"
        role="diagnostics"
        title="Behavior summary"
        description="Read-only opening behavior and visitor interaction summary."
      >
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.open-mode"
          label="Visitor opening"
          path="options.openMode"
          value={
            openMode === "multiple"
              ? "Visitors may open multiple items"
              : "One item opens at a time"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.default-open"
          label="Starts with"
          path="options.defaultOpenIds"
          value={
            defaultOpenLabels.length > 0 ? defaultOpenLabels.join(", ") : "All items collapsed"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.collapsible"
          label="All-closed behavior"
          path="options.collapsible"
          value={
            normalized.options?.collapsible === false
              ? "At least one item stays open"
              : "All items may close"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.motion"
          label="Motion"
          path="options.motion"
          value={
            accordionMotionOptions.find((option) => option.id === normalized.options?.motion)
              ?.label ?? "None"
          }
        />
      </EditorSection>
      <EditorSection
        id="accordion.advanced.item-summary"
        mode="advanced"
        role="summary"
        title="Saved items summary"
        description="Read-only overview of the saved accordion items."
      >
        {items.map((item, index) => (
          <ReadonlyWidgetSummaryRow
            key={item.id}
            id={`accordion.advanced.item.${item.id}.summary`}
            label={`Item ${index + 1}`}
            path={`items.${index}.title`}
            value={`${item.title}; ${item.description ? "summary text saved" : "no summary text"}; ${
              item.icon ? "icon saved" : "no icon"
            }`}
          />
        ))}
      </EditorSection>
      <EditorSection
        id="accordion.advanced.display-summary"
        mode="advanced"
        role="summary"
        title="Saved display summary"
        description="Read-only layout, style, and motion summary."
      >
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.variant"
          label="Style preset"
          path="variant"
          value={variantOptions.find((option) => option.id === selectedVariant)?.label ?? "Soft"}
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.width"
          label="Width"
          path="layout.maxWidth"
          value={
            accordionMaxWidthOptions.find((option) => option.id === normalized.layout?.maxWidth)
              ?.label ?? "Full width"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.spacing"
          label="Spacing"
          path="style.summaryPadding"
          value={`Heading ${
            accordionPaddingOptions.find((option) => option.id === normalized.style?.summaryPadding)
              ?.label ?? "Preset"
          }; content ${
            accordionPaddingOptions.find((option) => option.id === normalized.style?.contentPadding)
              ?.label ?? "Preset"
          }`}
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.title-style"
          label="Title style"
          path="style.summaryFontSize"
          value={`${
            accordionSummaryFontSizeOptions.find(
              (option) => option.id === normalized.style?.summaryFontSize
            )?.label ?? "Preset"
          } size; ${
            accordionSummaryFontWeightOptions.find(
              (option) => option.id === normalized.style?.summaryFontWeight
            )?.label ?? "Preset"
          } weight`}
        />
        <ReadonlyWidgetSummaryRow
          id="accordion.advanced.color-summary"
          label="Color choices"
          path="style.surfaceColor"
          value={
            savedColorCount > 0
              ? `${savedColorCount} saved color choices`
              : "Theme colors are inherited"
          }
        />
      </EditorSection>
      <EditorSection
        id="accordion.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Accordion runtime and editor ownership summary."
      >
        <p className="text-xs text-muted-foreground">
          Visual owns variant, item content, behavior, layout, and style. Advanced only summarizes
          the saved state.
        </p>
      </EditorSection>
    </div>
  );
}

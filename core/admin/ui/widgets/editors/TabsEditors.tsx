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
import { cn } from "@/lib/utils";

import {
  normalizeTabsData,
  normalizeTabsItems,
  tabsDefaults,
  tabsItemMax,
  tabsItemMin,
  type TabsData,
  type TabsMotion,
  type TabsOrientation,
  type TabsSpacing,
  type TabsTriggerFontWeight,
  type TabsTriggerOverflow,
  type TabsTriggerTextSize,
  type TabsVariantId,
} from "../../../../widgets/core/tabs";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  ClearableFieldHeader,
  SharedColorFieldInputs,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: TabsVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "pills",
    label: "Pills",
    description: "Rounded segmented triggers.",
  },
  {
    id: "underline",
    label: "Underline",
    description: "Link-style tabs with active underline.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Lightweight tab navigation style.",
  },
];

const alignmentOptions = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const;

const orientationOptions: Array<{ value: TabsOrientation; label: string }> = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

const overflowOptions: Array<{ value: TabsTriggerOverflow; label: string }> = [
  { value: "wrap", label: "Wrap" },
  { value: "scroll", label: "Scroll" },
];

const spacingOptions: Array<{ value: TabsSpacing; label: string }> = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

const textSizeOptions: Array<{ value: TabsTriggerTextSize; label: string }> = [
  { value: "xs", label: "XS" },
  { value: "sm", label: "Small" },
  { value: "base", label: "Base" },
];

const fontWeightOptions: Array<{ value: TabsTriggerFontWeight; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "medium", label: "Medium" },
  { value: "semibold", label: "Semibold" },
];

const motionOptions: Array<{ value: TabsMotion; label: string }> = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
];

const tabCountOptions = Array.from({ length: tabsItemMax - tabsItemMin + 1 }, (_, index) =>
  String(tabsItemMin + index)
);

function resolveVariant(variant: string): TabsVariantId {
  if (variant === "underline" || variant === "minimal") return variant;
  return "pills";
}

function normalizeValue(value: TabsData, desiredCount?: number): TabsData {
  return normalizeTabsData(value, desiredCount);
}

function updateValue(
  value: TabsData,
  onChange: (next: TabsData) => void,
  updater: (current: TabsData) => TabsData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function resolveRemovedTabs(value: TabsData, count: number) {
  const currentItems = normalizeTabsItems(normalizeValue(value).items);
  if (count >= currentItems.length) return [];
  return currentItems.slice(count).map((item, index) => ({
    id: item.id,
    label: item.label || `Tab ${count + index + 1}`,
  }));
}

function setCount(value: TabsData, onChange: (next: TabsData) => void, count: number) {
  const removed = resolveRemovedTabs(value, count);
  if (removed.length > 0 && typeof window !== "undefined" && typeof window.confirm === "function") {
    const confirmed = window.confirm(
      `Reduce tabs to ${count}? This removes tab/panel pairs: ${removed
        .map((item) => item.label)
        .join(", ")}. This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }
  }

  const current = normalizeValue(value, count);
  onChange(
    normalizeValue(
      {
        ...current,
        items: normalizeTabsItems(current.items, count),
      },
      count
    )
  );
}

function updateItem(
  value: TabsData,
  onChange: (next: TabsData) => void,
  itemId: string,
  patch: Partial<NonNullable<TabsData["items"]>[number]>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeTabsItems(current.items).map((item) =>
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
  value: TabsData,
  onChange: (next: TabsData) => void,
  patch: Partial<NonNullable<TabsData["options"]>>
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
  value: TabsData,
  onChange: (next: TabsData) => void,
  patch: Partial<NonNullable<TabsData["style"]>>
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
  value: TabsData,
  onChange: (next: TabsData) => void,
  key: keyof NonNullable<TabsData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
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

function TabsVariantPreview({ variant, selected }: { variant: TabsVariantId; selected: boolean }) {
  const activeClass = selected
    ? "bg-primary text-primary-foreground border-primary"
    : "border-border bg-muted/40";
  const inactiveClass = "border-border/70 bg-background text-muted-foreground";

  if (variant === "underline") {
    return (
      <span aria-hidden="true" data-tabs-variant-preview={variant} className="mt-2 flex gap-2">
        <span className={cn("flex flex-col gap-1", selected && "text-primary")}>
          <span className="text-[10px] font-medium">Tab</span>
          <span className={cn("h-0.5 w-10 rounded-full", selected ? "bg-primary" : "bg-border")} />
        </span>
        <span className="flex flex-col gap-1 text-muted-foreground">
          <span className="text-[10px] font-medium">Tab</span>
          <span className="h-0.5 w-8 rounded-full bg-border/70" />
        </span>
      </span>
    );
  }

  if (variant === "minimal") {
    return (
      <span aria-hidden="true" data-tabs-variant-preview={variant} className="mt-2 flex gap-2">
        <span className={cn("rounded-md border px-2 py-1 text-[10px]", activeClass)}>Tab</span>
        <span className={cn("rounded-md border px-2 py-1 text-[10px]", inactiveClass)}>Tab</span>
      </span>
    );
  }

  return (
    <span aria-hidden="true" data-tabs-variant-preview={variant} className="mt-2 flex gap-2">
      <span className={cn("rounded-full border px-2.5 py-1 text-[10px]", activeClass)}>Tab</span>
      <span className={cn("rounded-full border px-2.5 py-1 text-[10px]", inactiveClass)}>Tab</span>
    </span>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: TabsVariantId;
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
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{option.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              <TabsVariantPreview variant={option.id} selected={value === option.id} />
            </div>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

function TabsStructureSection({
  value,
  onChange,
  context,
  showMetadata,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
  context?: WidgetEditorProps<TabsData>["context"];
  showMetadata: boolean;
}) {
  const normalized = normalizeValue(value);
  const items = normalizeTabsItems(normalized.items);
  const defaultItemId =
    normalized.options?.defaultItemId ?? normalized.options?.activeId ?? items[0]?.id ?? "1";

  return (
    <EditorSection
      id="tabs.structure"
      title="Tabs Structure"
      description="Set tab count, labels, and panel intro copy."
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Number of tabs</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {tabCountOptions.map((option) => (
                <SelectItem key={`tab-count-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Each tab owns a matching panel slot in the builder. Reducing the count confirms which
            tab/panel pairs will be removed.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Default tab</p>
          <Select
            value={defaultItemId}
            onValueChange={(next) =>
              updateOptions(value, onChange, { defaultItemId: next, activeId: next })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose default tab" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem
                  key={`active-tab-${item.id}`}
                  value={item.id}
                  disabled={item.disabled === true}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const slotLabel = context?.slotTargets?.[index]?.label ?? `Panel ${index + 1}`;
          const isDefault = item.id === defaultItemId;
          return (
            <div key={item.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {slotLabel}
                </p>
                <div className="flex items-center gap-2">
                  {item.disabled ? <Badge variant="outline">Disabled</Badge> : null}
                  {isDefault ? <Badge>Default</Badge> : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tab label</p>
                <Input
                  value={item.label}
                  onChange={(event) =>
                    updateItem(value, onChange, item.id, { label: event.target.value })
                  }
                  placeholder={`Tab ${index + 1}`}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Panel intro text</p>
                <Input
                  value={item.panelIntro ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, item.id, { panelIntro: event.target.value })
                  }
                  placeholder="Optional panel intro text"
                />
              </div>

              {showMetadata ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Trigger subtitle</p>
                    <Input
                      value={item.triggerDescription ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, item.id, {
                          triggerDescription: event.target.value,
                        })
                      }
                      placeholder="Optional trigger subtitle"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Icon or emoji</p>
                    <Input
                      value={item.icon ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, item.id, { icon: event.target.value })
                      }
                      placeholder="e.g. ⭐"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.disabled === true}
                      onChange={(event) =>
                        updateItem(value, onChange, item.id, { disabled: event.target.checked })
                      }
                    />
                    Disable this tab
                  </label>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Each tab maps to a matching panel slot in the builder, so slot order stays aligned with the
        tab order.
      </p>
    </EditorSection>
  );
}

function TabsLayoutSection({
  value,
  onChange,
  wizardMode,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
  wizardMode: boolean;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="tabs.layout"
      title="Layout"
      description={
        wizardMode
          ? "Choose the tab direction and alignment."
          : "Control tab direction, overflow, and spacing."
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Orientation</p>
          <Select
            value={normalized.options?.orientation ?? "horizontal"}
            onValueChange={(next) =>
              updateOptions(value, onChange, { orientation: next as TabsOrientation })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose orientation" />
            </SelectTrigger>
            <SelectContent>
              {orientationOptions.map((option) => (
                <SelectItem key={`tabs-orientation-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tab alignment</p>
          <Select
            value={normalized.options?.alignment ?? "start"}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                alignment: next as NonNullable<NonNullable<TabsData["options"]>["alignment"]>,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={`tabs-align-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!wizardMode ? (
            <p className="text-xs text-muted-foreground">
              Vertical tabs align across the row with Start, Center, and End.
            </p>
          ) : null}
        </div>

        {!wizardMode ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Tab overflow</p>
              <Select
                value={normalized.options?.triggerOverflow ?? "wrap"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { triggerOverflow: next as TabsTriggerOverflow })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose overflow" />
                </SelectTrigger>
                <SelectContent>
                  {overflowOptions.map((option) => (
                    <SelectItem key={`tabs-overflow-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Container padding</p>
              <Select
                value={normalized.options?.containerPadding ?? "md"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { containerPadding: next as TabsSpacing })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose padding" />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((option) => (
                    <SelectItem key={`tabs-padding-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Tab gap</p>
              <Select
                value={normalized.options?.triggerGap ?? "md"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { triggerGap: next as TabsSpacing })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose gap" />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((option) => (
                    <SelectItem key={`tabs-trigger-gap-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Panel gap</p>
              <Select
                value={normalized.options?.panelGap ?? "md"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { panelGap: next as TabsSpacing })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose gap" />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((option) => (
                    <SelectItem key={`tabs-panel-gap-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>
    </EditorSection>
  );
}

function TabsTriggerStyleSection({
  value,
  onChange,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="tabs.trigger-style"
      title="Trigger style"
      description="Adjust trigger typography and panel motion."
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Trigger text size</p>
          <Select
            value={normalized.options?.triggerTextSize ?? "sm"}
            onValueChange={(next) =>
              updateOptions(value, onChange, { triggerTextSize: next as TabsTriggerTextSize })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose text size" />
            </SelectTrigger>
            <SelectContent>
              {textSizeOptions.map((option) => (
                <SelectItem key={`tabs-trigger-size-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Trigger weight</p>
          <Select
            value={normalized.options?.triggerFontWeight ?? "medium"}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                triggerFontWeight: next as TabsTriggerFontWeight,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose trigger weight" />
            </SelectTrigger>
            <SelectContent>
              {fontWeightOptions.map((option) => (
                <SelectItem key={`tabs-trigger-weight-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Panel motion</p>
          <Select
            value={normalized.options?.motion ?? "none"}
            onValueChange={(next) => updateOptions(value, onChange, { motion: next as TabsMotion })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose motion" />
            </SelectTrigger>
            <SelectContent>
              {motionOptions.map((option) => (
                <SelectItem key={`tabs-motion-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </EditorSection>
  );
}

function TabsColorsSection({
  value,
  onChange,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
}) {
  const normalized = normalizeValue(value);
  const activeContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.activeTextColor,
    background: normalized.style?.activeBackgroundColor,
  });
  const inactiveContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.inactiveTextColor,
    background: normalized.style?.surfaceColor,
  });

  return (
    <EditorSection
      id="tabs.colors"
      title="Colors"
      description="Tune the tab surface, trigger, and panel colors."
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Surface color"
            value={normalized.style?.surfaceColor}
            onClear={() => clearStyleField(value, onChange, "surfaceColor")}
            onRestoreValue={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          />
          <SharedColorFieldInputs
            inputId="tabs-color-surface"
            value={normalized.style?.surfaceColor}
            onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
            placeholder="var(--color-surface)"
            pickerFallback="#f8fafc"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Border color</p>
          <SharedColorFieldInputs
            inputId="tabs-color-border"
            value={normalized.style?.borderColor ?? tabsDefaults.style?.borderColor}
            onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
            placeholder="var(--color-border)"
            pickerFallback="#cbd5e1"
          />
        </div>

        <div className="space-y-2">
          <ClearableFieldHeader
            label="Active background"
            value={normalized.style?.activeBackgroundColor}
            onClear={() => clearStyleField(value, onChange, "activeBackgroundColor")}
            onRestoreValue={(next) => updateStyle(value, onChange, { activeBackgroundColor: next })}
          />
          <SharedColorFieldInputs
            inputId="tabs-color-active-background"
            value={normalized.style?.activeBackgroundColor}
            onChange={(next) => updateStyle(value, onChange, { activeBackgroundColor: next })}
            placeholder="var(--color-text)"
            pickerFallback="#0f172a"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Active text color</p>
          <SharedColorFieldInputs
            inputId="tabs-color-active-text"
            value={normalized.style?.activeTextColor ?? tabsDefaults.style?.activeTextColor}
            onChange={(next) => updateStyle(value, onChange, { activeTextColor: next })}
            placeholder="var(--color-background)"
            pickerFallback="#ffffff"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Inactive text color</p>
          <SharedColorFieldInputs
            inputId="tabs-color-inactive-text"
            value={normalized.style?.inactiveTextColor ?? tabsDefaults.style?.inactiveTextColor}
            onChange={(next) => updateStyle(value, onChange, { inactiveTextColor: next })}
            placeholder="var(--color-text)"
            pickerFallback="#0f172a"
          />
        </div>

        <div className="space-y-2">
          <ClearableFieldHeader
            label="Panel background"
            value={normalized.style?.panelBackgroundColor}
            onClear={() => clearStyleField(value, onChange, "panelBackgroundColor")}
            onRestoreValue={(next) => updateStyle(value, onChange, { panelBackgroundColor: next })}
          />
          <SharedColorFieldInputs
            inputId="tabs-color-panel-background"
            value={normalized.style?.panelBackgroundColor}
            onChange={(next) => updateStyle(value, onChange, { panelBackgroundColor: next })}
            placeholder="var(--color-surface)"
            pickerFallback="#f8fafc"
          />
        </div>
      </div>

      {activeContrast.status === "warning" && activeContrast.message ? (
        <p className="text-xs text-amber-700">Active tab: {activeContrast.message}</p>
      ) : null}
      {inactiveContrast.status === "warning" && inactiveContrast.message ? (
        <p className="text-xs text-amber-700">Inactive tab: {inactiveContrast.message}</p>
      ) : null}
    </EditorSection>
  );
}

function DiagnosticsSnapshot({ value }: { value: TabsData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function TabsWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<TabsData>) {
  return (
    <div className="space-y-4">
      <EditorSection id="tabs.variant" title="Variant" description="Pick tabs presentation style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <TabsLayoutSection value={value} onChange={onChange} wizardMode />
      <TabsStructureSection
        value={value}
        onChange={onChange}
        context={context}
        showMetadata={false}
      />
    </div>
  );
}

export function TabsVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<TabsData>) {
  return (
    <div className="space-y-4">
      <EditorSection id="tabs.variant" title="Variant" description="Choose tab presentation style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <TabsStructureSection value={value} onChange={onChange} context={context} showMetadata />
      <TabsLayoutSection value={value} onChange={onChange} wizardMode={false} />
      <TabsTriggerStyleSection value={value} onChange={onChange} />
      <TabsColorsSection value={value} onChange={onChange} />
    </div>
  );
}

export function TabsAdvancedEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<TabsData>) {
  return (
    <div className="space-y-4">
      <EditorSection
        id="tabs.variant"
        title="Variant"
        description="Variant and technical controls."
      >
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <TabsStructureSection value={value} onChange={onChange} context={context} showMetadata />
      <TabsLayoutSection value={value} onChange={onChange} wizardMode={false} />
      <TabsTriggerStyleSection value={value} onChange={onChange} />
      <TabsColorsSection value={value} onChange={onChange} />
      <EditorSection
        id="tabs.diagnostics"
        title="Diagnostics"
        description="Normalized data payload preview."
      >
        <DiagnosticsSnapshot value={normalizeValue(value)} />
      </EditorSection>
    </div>
  );
}

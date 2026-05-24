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
import type {
  WidgetEditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import {
  ClearableFieldHeader,
  SharedColorFieldInputs,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

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
  mode,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
  context?: WidgetEditorProps<TabsData>["context"];
  mode: "setup" | "presentation";
}) {
  const normalized = normalizeValue(value);
  const items = normalizeTabsItems(normalized.items);
  const defaultItemId =
    normalized.options?.defaultItemId ?? normalized.options?.activeId ?? items[0]?.id ?? "1";
  const isSetupMode = mode === "setup";

  return (
    <EditorSection
      id={isSetupMode ? "tabs.wizard.structure-setup" : "tabs.visual.item-content"}
      mode={isSetupMode ? "wizard" : "visual"}
      role={isSetupMode ? "setup" : "content"}
      title={isSetupMode ? "Starter tabs" : "Tab content"}
      description={
        isSetupMode
          ? "Set the initial tab count and default tab before daily visual editing."
          : "Edit tab labels, panel intro copy, trigger metadata, and disabled state."
      }
    >
      {isSetupMode ? (
        <div className="space-y-2">
          <WidgetControlRow id="tabs.wizard.item-count" label="Number of tabs" path="items.count">
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
                  {tabCountOptions.map((option) => (
                    <SelectItem key={`tab-count-${option}`} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
          <p className="text-xs text-muted-foreground">
            Each tab owns a matching panel slot in the builder. Reducing the count confirms which
            tab/panel pairs will be removed.
          </p>
          <WidgetControlRow
            id="tabs.wizard.default-tab"
            label="Default tab"
            path="options.defaultItemId"
          >
            {(fieldProps) => (
              <Select
                value={defaultItemId}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { defaultItemId: next, activeId: next })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        </div>
      ) : null}

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

              {isSetupMode ? (
                <ReadonlyWidgetSummaryRow
                  id={`tabs.wizard.item.${item.id}.label`}
                  label="Tab label"
                  path={`items.${index}.label`}
                  value={item.label || `Tab ${index + 1}`}
                  help="Visual owns daily label edits after setup creates the tab."
                />
              ) : (
                <WidgetControlRow
                  id={`tabs.visual.item.${item.id}.label`}
                  label="Tab label"
                  path={`items.${index}.label`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                      value={item.label}
                      onChange={(event) =>
                        updateItem(value, onChange, item.id, { label: event.target.value })
                      }
                      placeholder={`Tab ${index + 1}`}
                    />
                  )}
                </WidgetControlRow>
              )}

              {isSetupMode ? (
                <ReadonlyWidgetSummaryRow
                  id={`tabs.wizard.item.${item.id}.panel-intro`}
                  label="Panel intro text"
                  path={`items.${index}.panelIntro`}
                  value={item.panelIntro || "Not set"}
                />
              ) : (
                <WidgetControlRow
                  id={`tabs.visual.item.${item.id}.panel-intro`}
                  label="Panel intro text"
                  path={`items.${index}.panelIntro`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                      value={item.panelIntro ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, item.id, { panelIntro: event.target.value })
                      }
                      placeholder="Optional panel intro text"
                    />
                  )}
                </WidgetControlRow>
              )}

              {!isSetupMode ? (
                <>
                  <WidgetControlRow
                    id={`tabs.visual.item.${item.id}.trigger-description`}
                    label="Trigger subtitle"
                    path={`items.${index}.triggerDescription`}
                  >
                    {(fieldProps) => (
                      <Input
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                        value={item.triggerDescription ?? ""}
                        onChange={(event) =>
                          updateItem(value, onChange, item.id, {
                            triggerDescription: event.target.value,
                          })
                        }
                        placeholder="Optional trigger subtitle"
                      />
                    )}
                  </WidgetControlRow>

                  <WidgetControlRow
                    id={`tabs.visual.item.${item.id}.icon`}
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
                          updateItem(value, onChange, item.id, { icon: event.target.value })
                        }
                        placeholder="e.g. ⭐"
                      />
                    )}
                  </WidgetControlRow>

                  <WidgetControlRow
                    id={`tabs.visual.item.${item.id}.disabled`}
                    label="Disabled state"
                    path={`items.${index}.disabled`}
                  >
                    {() => (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.disabled === true}
                          onChange={(event) =>
                            updateItem(value, onChange, item.id, {
                              disabled: event.target.checked,
                            })
                          }
                        />
                        Disable this tab
                      </label>
                    )}
                  </WidgetControlRow>
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
      id="tabs.visual.layout"
      mode="visual"
      role="layout"
      title="Layout"
      description="Control tab direction, overflow, and spacing."
    >
      <div className="space-y-3">
        <div
          data-tabs-layout-controls={wizardMode ? "compact" : "stacked"}
          className={wizardMode ? "grid gap-3 md:grid-cols-2" : "space-y-3"}
        >
          <WidgetControlRow
            id="tabs.visual.orientation"
            label="Orientation"
            path="options.orientation"
          >
            {(fieldProps) => (
              <Select
                value={normalized.options?.orientation ?? "horizontal"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { orientation: next as TabsOrientation })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id="tabs.visual.alignment"
            label="Tab alignment"
            path="options.alignment"
          >
            {(fieldProps) => (
              <Select
                value={normalized.options?.alignment ?? "start"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, {
                    alignment: next as NonNullable<NonNullable<TabsData["options"]>["alignment"]>,
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        </div>

        <div className="space-y-3">
          <WidgetControlRow
            id="tabs.visual.trigger-overflow"
            label="Tab overflow"
            path="options.triggerOverflow"
          >
            {(fieldProps) => (
              <Select
                value={normalized.options?.triggerOverflow ?? "wrap"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { triggerOverflow: next as TabsTriggerOverflow })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id="tabs.visual.container-padding"
            label="Container padding"
            path="options.containerPadding"
          >
            {(fieldProps) => (
              <Select
                value={normalized.options?.containerPadding ?? "md"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { containerPadding: next as TabsSpacing })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>

          <WidgetControlRow id="tabs.visual.trigger-gap" label="Tab gap" path="options.triggerGap">
            {(fieldProps) => (
              <Select
                value={normalized.options?.triggerGap ?? "md"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { triggerGap: next as TabsSpacing })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>

          <WidgetControlRow id="tabs.visual.panel-gap" label="Panel gap" path="options.panelGap">
            {(fieldProps) => (
              <Select
                value={normalized.options?.panelGap ?? "md"}
                onValueChange={(next) =>
                  updateOptions(value, onChange, { panelGap: next as TabsSpacing })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        </div>
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
      id="tabs.visual.trigger-style"
      mode="visual"
      role="visual"
      title="Trigger style"
      description="Adjust trigger typography and panel motion."
    >
      <div className="space-y-3">
        <WidgetControlRow
          id="tabs.visual.trigger-text-size"
          label="Trigger text size"
          path="options.triggerTextSize"
        >
          {(fieldProps) => (
            <Select
              value={normalized.options?.triggerTextSize ?? "sm"}
              onValueChange={(next) =>
                updateOptions(value, onChange, { triggerTextSize: next as TabsTriggerTextSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.trigger-font-weight"
          label="Trigger weight"
          path="options.triggerFontWeight"
        >
          {(fieldProps) => (
            <Select
              value={normalized.options?.triggerFontWeight ?? "medium"}
              onValueChange={(next) =>
                updateOptions(value, onChange, {
                  triggerFontWeight: next as TabsTriggerFontWeight,
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>

        <WidgetControlRow id="tabs.visual.motion" label="Panel motion" path="options.motion">
          {(fieldProps) => (
            <Select
              value={normalized.options?.motion ?? "none"}
              onValueChange={(next) =>
                updateOptions(value, onChange, { motion: next as TabsMotion })
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
                {motionOptions.map((option) => (
                  <SelectItem key={`tabs-motion-${option.value}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
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
      id="tabs.visual.colors"
      mode="visual"
      role="visual"
      title="Colors"
      description="Tune the tab surface, trigger, and panel colors."
    >
      <div className="space-y-3">
        <WidgetControlRow
          id="tabs.visual.surface-color"
          label="Surface color"
          path="style.surfaceColor"
        >
          {(fieldProps) => (
            <div className="space-y-2">
              <ClearableFieldHeader
                label="Surface color"
                value={normalized.style?.surfaceColor}
                onClear={() => clearStyleField(value, onChange, "surfaceColor")}
                onRestoreValue={(next) => updateStyle(value, onChange, { surfaceColor: next })}
              />
              <SharedColorFieldInputs
                inputId={fieldProps.id}
                ariaLabelledby={fieldProps["aria-labelledby"]}
                ariaDescribedby={fieldProps["aria-describedby"]}
                value={normalized.style?.surfaceColor}
                onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
                placeholder="var(--color-surface)"
                pickerFallback="#f8fafc"
              />
            </div>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.border-color"
          label="Border color"
          path="style.borderColor"
        >
          {(fieldProps) => (
            <SharedColorFieldInputs
              inputId={fieldProps.id}
              ariaLabelledby={fieldProps["aria-labelledby"]}
              ariaDescribedby={fieldProps["aria-describedby"]}
              value={normalized.style?.borderColor ?? tabsDefaults.style?.borderColor}
              onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
              placeholder="var(--color-border)"
              pickerFallback="#cbd5e1"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.active-background-color"
          label="Active background"
          path="style.activeBackgroundColor"
        >
          {(fieldProps) => (
            <div className="space-y-2">
              <ClearableFieldHeader
                label="Active background"
                value={normalized.style?.activeBackgroundColor}
                onClear={() => clearStyleField(value, onChange, "activeBackgroundColor")}
                onRestoreValue={(next) =>
                  updateStyle(value, onChange, { activeBackgroundColor: next })
                }
              />
              <SharedColorFieldInputs
                inputId={fieldProps.id}
                ariaLabelledby={fieldProps["aria-labelledby"]}
                ariaDescribedby={fieldProps["aria-describedby"]}
                value={normalized.style?.activeBackgroundColor}
                onChange={(next) => updateStyle(value, onChange, { activeBackgroundColor: next })}
                placeholder="var(--color-text)"
                pickerFallback="#0f172a"
              />
            </div>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.active-text-color"
          label="Active text color"
          path="style.activeTextColor"
        >
          {(fieldProps) => (
            <SharedColorFieldInputs
              inputId={fieldProps.id}
              ariaLabelledby={fieldProps["aria-labelledby"]}
              ariaDescribedby={fieldProps["aria-describedby"]}
              value={normalized.style?.activeTextColor ?? tabsDefaults.style?.activeTextColor}
              onChange={(next) => updateStyle(value, onChange, { activeTextColor: next })}
              placeholder="var(--color-background)"
              pickerFallback="#ffffff"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.inactive-text-color"
          label="Inactive text color"
          path="style.inactiveTextColor"
        >
          {(fieldProps) => (
            <SharedColorFieldInputs
              inputId={fieldProps.id}
              ariaLabelledby={fieldProps["aria-labelledby"]}
              ariaDescribedby={fieldProps["aria-describedby"]}
              value={normalized.style?.inactiveTextColor ?? tabsDefaults.style?.inactiveTextColor}
              onChange={(next) => updateStyle(value, onChange, { inactiveTextColor: next })}
              placeholder="var(--color-text)"
              pickerFallback="#0f172a"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.panel-background-color"
          label="Panel background"
          path="style.panelBackgroundColor"
        >
          {(fieldProps) => (
            <div className="space-y-2">
              <ClearableFieldHeader
                label="Panel background"
                value={normalized.style?.panelBackgroundColor}
                onClear={() => clearStyleField(value, onChange, "panelBackgroundColor")}
                onRestoreValue={(next) =>
                  updateStyle(value, onChange, { panelBackgroundColor: next })
                }
              />
              <SharedColorFieldInputs
                inputId={fieldProps.id}
                ariaLabelledby={fieldProps["aria-labelledby"]}
                ariaDescribedby={fieldProps["aria-describedby"]}
                value={normalized.style?.panelBackgroundColor}
                onChange={(next) => updateStyle(value, onChange, { panelBackgroundColor: next })}
                placeholder="var(--color-surface)"
                pickerFallback="#f8fafc"
              />
            </div>
          )}
        </WidgetControlRow>
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

export function TabsWizardEditor({ value, onChange, context }: WidgetEditorProps<TabsData>) {
  return (
    <div className="space-y-4">
      <TabsStructureSection value={value} onChange={onChange} context={context} mode="setup" />
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
      <EditorSection
        id="tabs.visual.variant"
        mode="visual"
        role="visual"
        title="Variant"
        description="Choose tab presentation style."
      >
        <WidgetControlRow id="tabs.visual.variant-picker" label="Variant" path="variant">
          {() => <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />}
        </WidgetControlRow>
      </EditorSection>
      <TabsStructureSection
        value={value}
        onChange={onChange}
        context={context}
        mode="presentation"
      />
      <TabsLayoutSection value={value} onChange={onChange} wizardMode={false} />
      <TabsTriggerStyleSection value={value} onChange={onChange} />
      <TabsColorsSection value={value} onChange={onChange} />
    </div>
  );
}

export function TabsAdvancedEditor({ value }: WidgetEditorProps<TabsData>) {
  const normalized = normalizeValue(value);
  const items = normalizeTabsItems(normalized.items);
  const activeId = normalized.options?.activeId ?? items[0]?.id ?? "1";
  const defaultItemId = normalized.options?.defaultItemId ?? activeId;
  const disabledCount = items.filter((item) => item.disabled === true).length;

  return (
    <div className="space-y-4">
      <EditorSection
        id="tabs.advanced.runtime-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Runtime diagnostics"
        description="Read-only activation, accessibility, and runtime behavior."
      >
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.active-tab"
          label="Active tab"
          path="options.activeId"
          value={activeId}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.default-tab"
          label="Default tab"
          path="options.defaultItemId"
          value={defaultItemId}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.disabled-count"
          label="Disabled tabs"
          path="items.disabled"
          value={`${disabledCount} of ${items.length}`}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.activation-model"
          label="Activation model"
          value="Root-scoped tabs, disabled tabs skipped, active panel remains focusable."
        />
      </EditorSection>
      <EditorSection
        id="tabs.advanced.technical-ids"
        mode="advanced"
        role="technical"
        title="Technical ids"
        description="Read-only tab, trigger, and panel id summary."
      >
        {items.map((item, index) => (
          <ReadonlyWidgetSummaryRow
            key={item.id}
            id={`tabs.advanced.item.${item.id}.id`}
            label={`Tab ${index + 1}`}
            path={`items.${index}.id`}
            value={`item=${item.id}; trigger suffix=trigger-${item.id}; panel suffix=panel-${item.id}`}
          />
        ))}
      </EditorSection>
      <EditorSection
        id="tabs.advanced.runtime-payload"
        mode="advanced"
        role="diagnostics"
        title="Runtime payload"
        description="Normalized data payload preview."
      >
        <WidgetControlRow
          id="tabs.advanced.normalized-payload"
          label="Normalized payload"
          path="items"
          ownership="readonly"
          readOnly
        >
          {() => <DiagnosticsSnapshot value={normalized} />}
        </WidgetControlRow>
      </EditorSection>
      <EditorSection
        id="tabs.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Tabs runtime and editor ownership summary."
      >
        <p className="text-xs text-muted-foreground">
          Visual owns variant, tab presentation, layout, trigger style, and colors. Advanced is
          read-only diagnostics.
        </p>
      </EditorSection>
    </div>
  );
}

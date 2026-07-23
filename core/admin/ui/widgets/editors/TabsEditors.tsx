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

import { parseCssColorValue } from "../../../../services/theme/cssColorContract";
import {
  isLegacyTabsScrollOverflow,
  normalizeTabsData,
  normalizeTabsItems,
  tabsPanelSlot,
  type TabsData,
  type TabsMotion,
  type TabsOrientation,
  type TabsSpacing,
  type TabsTriggerFontWeight,
  type TabsTriggerTextSize,
  type TabsVariantId,
} from "../../../../widgets/core/tabs";
import type {
  WidgetEditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { resolveColorContrastAdvisory } from "./ClearableFields";
import { SharedColorControl } from "./SharedColorControl";
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
    description: "Rounded segmented tabs.",
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

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | undefined,
  fallback: string
) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

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
              {value === option.id ? "Current style" : "Choose"}
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
  const structurePanelCount = context?.slotTargets?.filter(
    (target) => target.definitionId === tabsPanelSlot.id && target.kind === "repeatable"
  ).length;
  const panelCountSummary =
    typeof structurePanelCount === "number"
      ? `${structurePanelCount} panels from Structure`
      : "Structure panel slots decide rendered panels";

  return (
    <EditorSection
      id={isSetupMode ? "tabs.wizard.structure-setup" : "tabs.visual.item-content"}
      mode={isSetupMode ? "wizard" : "visual"}
      role={isSetupMode ? "setup" : "content"}
      title={isSetupMode ? "Starter tabs" : "Tab content"}
      description={
        isSetupMode
          ? "Review starter labels while Structure owns rendered tab panels."
          : "Edit tab labels, content intro copy, tab notes, icons, and unavailable states."
      }
    >
      {isSetupMode ? (
        <div className="space-y-2">
          <ReadonlyWidgetSummaryRow
            id="tabs.wizard.rendered-panel-count"
            label="Rendered panels"
            path="slots.panel.count"
            value={panelCountSummary}
            help="Use Visual Structure to add, remove, or reorder rendered tab panels."
          />
          <ReadonlyWidgetSummaryRow
            id="tabs.wizard.starter-label-count"
            label="Starter tab labels"
            path="items.count"
            value={`${items.length} saved starter labels`}
          />
          <p className="text-xs text-muted-foreground">
            Structure owns rendered tab panels. Wizard only summarizes starter labels, so count
            changes happen in Visual Structure.
          </p>
          <p className="text-xs text-muted-foreground">
            Visual owns the default tab choice together with daily label and content editing.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {!isSetupMode ? (
          <WidgetControlRow
            id="tabs.visual.default-tab"
            label="Default tab"
            path="options.defaultItemId"
            help="Choose which tab opens by default for visitors."
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
        ) : null}
        {items.map((item, index) => {
          const slotLabel = context?.slotTargets?.[index]?.label ?? `Tab ${index + 1}`;
          const isDefault = item.id === defaultItemId;
          return (
            <div key={item.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {slotLabel}
                </p>
                <div className="flex items-center gap-2">
                  {item.disabled ? <Badge variant="outline">Unavailable</Badge> : null}
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
                  label="Content intro text"
                  path={`items.${index}.panelIntro`}
                  value={item.panelIntro || "Not set"}
                />
              ) : (
                <WidgetControlRow
                  id={`tabs.visual.item.${item.id}.panel-intro`}
                  label="Content intro text"
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
                      placeholder="Optional content intro text"
                    />
                  )}
                </WidgetControlRow>
              )}

              {!isSetupMode ? (
                <>
                  <WidgetControlRow
                    id={`tabs.visual.item.${item.id}.trigger-description`}
                    label="Tab subtitle"
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
                        placeholder="Optional tab subtitle"
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
                    label="Show as unavailable"
                    help="The tab remains visible, but visitors cannot open it."
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
                        Keep this tab visible but unavailable
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
        Each tab maps to a matching content area, so content order stays aligned with the tab order.
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
      description="Control tab direction, alignment, and spacing."
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

          <WidgetControlRow id="tabs.visual.panel-gap" label="Content gap" path="options.panelGap">
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
      title="Tab label style"
      description="Adjust tab label readability and content motion."
    >
      <div className="space-y-3">
        <WidgetControlRow
          id="tabs.visual.trigger-text-size"
          label="Tab label size"
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
          label="Tab label weight"
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
                <SelectValue placeholder="Choose tab label weight" />
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

        <WidgetControlRow id="tabs.visual.motion" label="Content motion" path="options.motion">
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
    colorProfile: "inherited-render",
  });
  const inactiveContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.inactiveTextColor,
    background: normalized.style?.surfaceColor,
    colorProfile: "inherited-render",
  });

  return (
    <EditorSection
      id="tabs.visual.colors"
      mode="visual"
      role="visual"
      title="Colors"
      description="Tune the tab surface, tab labels, and content area colors."
    >
      <div className="space-y-3">
        <WidgetControlRow
          id="tabs.visual.surface-color"
          label="Surface color"
          path="style.surfaceColor"
        >
          {() => (
            <SharedColorControl
              label="Surface color"
              value={normalized.style?.surfaceColor}
              onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
              onSwatchChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
              onClear={() => clearStyleField(value, onChange, "surfaceColor")}
              pickerFallback="#f8fafc"
              showValueInput={false}
              colorProfile="inherited-render"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.border-color"
          label="Border color"
          path="style.borderColor"
        >
          {() => (
            <SharedColorControl
              label="Border color"
              value={normalized.style?.borderColor}
              onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
              onSwatchChange={(next) => updateStyle(value, onChange, { borderColor: next })}
              onClear={() => clearStyleField(value, onChange, "borderColor")}
              pickerFallback="#cbd5e1"
              showValueInput={false}
              colorProfile="inherited-render"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.active-background-color"
          label="Active background"
          path="style.activeBackgroundColor"
        >
          {() => (
            <SharedColorControl
              label="Active background"
              value={normalized.style?.activeBackgroundColor}
              onChange={(next) => updateStyle(value, onChange, { activeBackgroundColor: next })}
              onSwatchChange={(next) =>
                updateStyle(value, onChange, { activeBackgroundColor: next })
              }
              onClear={() => clearStyleField(value, onChange, "activeBackgroundColor")}
              pickerFallback="#0f172a"
              showValueInput={false}
              colorProfile="inherited-render"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.active-text-color"
          label="Active text color"
          path="style.activeTextColor"
        >
          {() => (
            <SharedColorControl
              label="Active text color"
              value={normalized.style?.activeTextColor}
              onChange={(next) => updateStyle(value, onChange, { activeTextColor: next })}
              onSwatchChange={(next) => updateStyle(value, onChange, { activeTextColor: next })}
              onClear={() => clearStyleField(value, onChange, "activeTextColor")}
              pickerFallback="#ffffff"
              showValueInput={false}
              colorProfile="inherited-render"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.inactive-text-color"
          label="Inactive text color"
          path="style.inactiveTextColor"
        >
          {() => (
            <SharedColorControl
              label="Inactive text color"
              value={normalized.style?.inactiveTextColor}
              onChange={(next) => updateStyle(value, onChange, { inactiveTextColor: next })}
              onSwatchChange={(next) => updateStyle(value, onChange, { inactiveTextColor: next })}
              onClear={() => clearStyleField(value, onChange, "inactiveTextColor")}
              pickerFallback="#0f172a"
              showValueInput={false}
              colorProfile="inherited-render"
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="tabs.visual.panel-background-color"
          label="Content background"
          path="style.panelBackgroundColor"
        >
          {() => (
            <SharedColorControl
              label="Content background"
              value={normalized.style?.panelBackgroundColor}
              onChange={(next) => updateStyle(value, onChange, { panelBackgroundColor: next })}
              onSwatchChange={(next) =>
                updateStyle(value, onChange, { panelBackgroundColor: next })
              }
              onClear={() => clearStyleField(value, onChange, "panelBackgroundColor")}
              pickerFallback="#f8fafc"
              showValueInput={false}
              colorProfile="inherited-render"
            />
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
  const savedScrollOverflowIsLegacy = isLegacyTabsScrollOverflow(value.options?.triggerOverflow);
  const activeId = normalized.options?.activeId ?? items[0]?.id ?? "1";
  const defaultItemId = normalized.options?.defaultItemId ?? activeId;
  const unavailableCount = items.filter((item) => item.disabled === true).length;
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const defaultIndex = items.findIndex((item) => item.id === defaultItemId);
  const colorFieldCount = Object.values(normalized.style ?? {}).filter(
    (styleValue) => parseCssColorValue(styleValue, "inherited-render") !== undefined
  ).length;
  const activeContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.activeTextColor,
    background: normalized.style?.activeBackgroundColor,
    colorProfile: "inherited-render",
  });
  const inactiveContrast = resolveColorContrastAdvisory({
    foreground: normalized.style?.inactiveTextColor,
    background: normalized.style?.surfaceColor,
    colorProfile: "inherited-render",
  });
  const readabilitySummary =
    activeContrast.status === "warning" || inactiveContrast.status === "warning"
      ? "Review color readability in Visual before publishing."
      : "No saved color readability warnings are visible.";

  const tabChoiceLabel = (index: number) => {
    const item = items[index];
    return item ? `${item.label} (tab ${index + 1})` : "First available tab";
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="tabs.advanced.behavior-summary"
        mode="advanced"
        role="diagnostics"
        title="Behavior summary"
        description="Read-only summary of opening behavior and availability."
      >
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.active-tab"
          label="Opens on"
          path="options.activeId"
          value={tabChoiceLabel(activeIndex)}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.default-tab"
          label="Default tab"
          path="options.defaultItemId"
          value={tabChoiceLabel(defaultIndex)}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.unavailable-count"
          label="Unavailable tabs"
          path="items.*.disabled"
          value={`${unavailableCount} of ${items.length}`}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.line-behavior"
          label="Line behavior"
          path="options.triggerOverflow"
          value={
            savedScrollOverflowIsLegacy
              ? "Saved scroll overflow is legacy and renders as wrapping; tabs wrap onto extra lines when space is tight."
              : "Tabs wrap onto extra lines when space is tight."
          }
        />
      </EditorSection>
      <EditorSection
        id="tabs.advanced.item-summary"
        mode="advanced"
        role="summary"
        title="Saved tabs summary"
        description="Read-only overview of the saved tab content."
      >
        {items.map((item, index) => (
          <ReadonlyWidgetSummaryRow
            key={item.id}
            id={`tabs.advanced.item.${item.id}.summary`}
            label={`Tab ${index + 1}`}
            path={`items.${index}.label`}
            value={`${item.label}; ${
              item.panelIntro ? "intro text saved" : "no intro text"
            }; ${item.triggerDescription ? "subtitle saved" : "no subtitle"}; ${
              item.icon ? "icon saved" : "no icon"
            }; ${item.disabled ? "unavailable" : "available"}`}
          />
        ))}
      </EditorSection>
      <EditorSection
        id="tabs.advanced.display-summary"
        mode="advanced"
        role="summary"
        title="Saved display summary"
        description="Read-only layout, style, and motion summary."
      >
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.direction"
          label="Direction and alignment"
          path="options.orientation"
          value={`${optionLabel(
            orientationOptions,
            normalized.options?.orientation,
            "Horizontal"
          )}; ${optionLabel(alignmentOptions, normalized.options?.alignment, "Start")} aligned`}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.spacing"
          label="Spacing"
          path="options.containerPadding"
          value={`Container ${optionLabel(
            spacingOptions,
            normalized.options?.containerPadding,
            "Medium"
          )}; tabs ${optionLabel(
            spacingOptions,
            normalized.options?.triggerGap,
            "Medium"
          )}; content ${optionLabel(spacingOptions, normalized.options?.panelGap, "Medium")}`}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.label-style"
          label="Tab label style"
          path="options.triggerTextSize"
          value={`${optionLabel(
            textSizeOptions,
            normalized.options?.triggerTextSize,
            "Small"
          )}; ${optionLabel(
            fontWeightOptions,
            normalized.options?.triggerFontWeight,
            "Medium"
          )}; ${optionLabel(motionOptions, normalized.options?.motion, "None")} motion`}
        />
        <ReadonlyWidgetSummaryRow
          id="tabs.advanced.color-summary"
          label="Color choices"
          path="style.surfaceColor"
          value={`${colorFieldCount} saved color choices. ${readabilitySummary}`}
        />
      </EditorSection>
      <EditorSection
        id="tabs.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Tabs runtime and editor ownership summary."
      >
        <p className="text-xs text-muted-foreground">
          Visual owns variant, tab content, layout, tab label style, colors, and Structure panel
          changes. Advanced only summarizes the saved state.
        </p>
      </EditorSection>
    </div>
  );
}

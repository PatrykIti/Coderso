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
  type TabsOrientation,
  type TabsVariantId,
} from "../../../../widgets/core/tabs";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
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

const alignmentOptions = ["start", "center", "end"] as const;
const orientationOptions: TabsOrientation[] = ["horizontal", "vertical"];

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

function setCount(value: TabsData, onChange: (next: TabsData) => void, count: number) {
  const current = normalizeValue(value, count);
  const items = normalizeTabsItems(current.items, count);
  const activeId =
    current.options?.defaultItemId &&
    items.some((item) => item.id === current.options?.defaultItemId)
      ? current.options.defaultItemId
      : items[0]?.id;

  onChange(
    normalizeValue(
      {
        ...current,
        items,
        options: {
          ...current.options,
          defaultItemId: activeId,
          activeId,
        },
      },
      count
    )
  );
}

function updateItem(
  value: TabsData,
  onChange: (next: TabsData) => void,
  itemId: string,
  patch: { label?: string; description?: string }
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

function TabsStructureSection({
  value,
  onChange,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
}) {
  const normalized = normalizeValue(value);
  const items = normalizeTabsItems(normalized.items);

  return (
    <EditorSection
      id="tabs.structure"
      title="Tabs Structure"
      description="Set tab count, labels, and short descriptions."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Default tab</p>
          <Select
            value={
              normalized.options?.defaultItemId ??
              normalized.options?.activeId ??
              items[0]?.id ??
              "1"
            }
            onValueChange={(next) =>
              updateOptions(value, onChange, { defaultItemId: next, activeId: next })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose default tab" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={`active-tab-${item.id}`} value={item.id}>
                  {item.label}
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
              Tab {index + 1} (slot id: {item.id})
            </p>
            <Input
              value={item.label}
              onChange={(event) =>
                updateItem(value, onChange, item.id, { label: event.target.value })
              }
              placeholder={`Tab ${index + 1}`}
            />
            <Input
              value={item.description ?? ""}
              onChange={(event) =>
                updateItem(value, onChange, item.id, {
                  description: event.target.value,
                })
              }
              placeholder="Optional tab description"
            />
          </div>
        ))}
      </div>
    </EditorSection>
  );
}

function TabsBehaviorSection({
  value,
  onChange,
}: {
  value: TabsData;
  onChange: (next: TabsData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      id="tabs.layout"
      title="Layout"
      description="Align tab triggers and tune visual colors."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <SelectItem key={`tabs-align-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Orientation</p>
          <Select
            value={normalized.options?.orientation ?? "horizontal"}
            onValueChange={(next) =>
              updateOptions(value, onChange, {
                orientation: next as TabsOrientation,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose orientation" />
            </SelectTrigger>
            <SelectContent>
              {orientationOptions.map((option) => (
                <SelectItem key={`tabs-orientation-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Surface color"
            value={normalized.style?.surfaceColor}
            onClear={() => clearStyleField(value, onChange, "surfaceColor")}
          />
          <Input
            value={normalized.style?.surfaceColor ?? tabsDefaults.style?.surfaceColor ?? ""}
            onChange={(event) => updateStyle(value, onChange, { surfaceColor: event.target.value })}
            placeholder="var(--color-surface)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Border color</p>
          <Input
            value={normalized.style?.borderColor ?? tabsDefaults.style?.borderColor ?? ""}
            onChange={(event) => updateStyle(value, onChange, { borderColor: event.target.value })}
            placeholder="var(--color-border)"
          />
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Active background"
            value={normalized.style?.activeBackgroundColor}
            onClear={() => clearStyleField(value, onChange, "activeBackgroundColor")}
          />
          <Input
            value={
              normalized.style?.activeBackgroundColor ??
              tabsDefaults.style?.activeBackgroundColor ??
              ""
            }
            onChange={(event) =>
              updateStyle(value, onChange, {
                activeBackgroundColor: event.target.value,
              })
            }
            placeholder="var(--color-text)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Active text color</p>
          <Input
            value={normalized.style?.activeTextColor ?? tabsDefaults.style?.activeTextColor ?? ""}
            onChange={(event) =>
              updateStyle(value, onChange, {
                activeTextColor: event.target.value,
              })
            }
            placeholder="var(--color-background)"
          />
        </div>
        <div className="space-y-2">
          <ClearableFieldHeader
            label="Panel background"
            value={normalized.style?.panelBackgroundColor}
            onClear={() => clearStyleField(value, onChange, "panelBackgroundColor")}
          />
          <Input
            value={
              normalized.style?.panelBackgroundColor ??
              tabsDefaults.style?.panelBackgroundColor ??
              ""
            }
            onChange={(event) =>
              updateStyle(value, onChange, {
                panelBackgroundColor: event.target.value,
              })
            }
            placeholder="var(--color-surface)"
          />
        </div>
      </div>
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
}: WidgetEditorProps<TabsData>) {
  return (
    <div className="space-y-4">
      <EditorSection id="tabs.variant" title="Variant" description="Pick tabs presentation style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <TabsStructureSection value={value} onChange={onChange} />
    </div>
  );
}

export function TabsVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TabsData>) {
  return (
    <div className="space-y-4">
      <EditorSection id="tabs.variant" title="Variant" description="Choose tab presentation style.">
        <VariantCards value={resolveVariant(variant)} onChange={onVariantChange} />
      </EditorSection>
      <TabsStructureSection value={value} onChange={onChange} />
      <TabsBehaviorSection value={value} onChange={onChange} />
    </div>
  );
}

export function TabsAdvancedEditor({
  value,
  onChange,
  variant,
  onVariantChange,
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
      <TabsStructureSection value={value} onChange={onChange} />
      <TabsBehaviorSection value={value} onChange={onChange} />
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

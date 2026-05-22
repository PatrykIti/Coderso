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
  normalizeStatsKpiData,
  normalizeStatsKpiItems,
  resolveStatsKpiVariant,
  statsKpiDefaults,
  statsKpiItemMax,
  type StatsKpiAlignment,
  type StatsKpiData,
  type StatsKpiDividerIntensity,
  type StatsKpiIconSize,
  type StatsKpiItem,
  type StatsKpiMaxWidth,
  type StatsKpiMinHeight,
  type StatsKpiPadding,
  type StatsKpiSpacing,
  type StatsKpiTrendDirection,
  type StatsKpiValueSize,
  type StatsKpiVariantId,
} from "../../../../widgets/core/statsKpi";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { WidgetEditorSection } from "./WidgetEditorControls";
import { ClearableInputField } from "./ClearableFields";
import { SharedColorControl } from "./SharedColorControl";

const variantOptions: Array<{
  id: StatsKpiVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "cards",
    label: "Cards",
    description: "Grid of KPI cards with equal emphasis.",
  },
  {
    id: "inline",
    label: "Inline",
    description: "Compact metrics in one row with optional dividers.",
  },
  {
    id: "split-highlight",
    label: "Split Highlight",
    description: "Lead KPI with secondary supporting metrics.",
  },
];

const alignmentOptions: Array<{ id: StatsKpiAlignment; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

const spacingOptions: Array<{ id: StatsKpiSpacing; label: string; help: string }> = [
  { id: "none", label: "None", help: "0rem gap between metrics." },
  { id: "sm", label: "Compact", help: "0.5rem gap for tighter metric groups." },
  { id: "md", label: "Default", help: "1rem gap for the current default rhythm." },
  { id: "lg", label: "Spacious", help: "1.5rem gap for roomier KPI sections." },
];

const valueSizeOptions: Array<{ id: StatsKpiValueSize; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Hero" },
];

const trendDirectionOptions: Array<{ id: StatsKpiTrendDirection; label: string }> = [
  { id: "up", label: "Up" },
  { id: "down", label: "Down" },
  { id: "neutral", label: "Neutral" },
];

const maxWidthOptions: Array<{ id: StatsKpiMaxWidth; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Wide" },
  { id: "lg", label: "Default" },
  { id: "xl", label: "Extra wide" },
  { id: "full", label: "Full width" },
];

const paddingOptions: Array<{ id: StatsKpiPadding; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const minHeightOptions: Array<{ id: StatsKpiMinHeight; label: string }> = [
  { id: "none", label: "Auto" },
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
];

const iconSizeOptions: Array<{ id: StatsKpiIconSize; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

const dividerIntensityOptions: Array<{ id: StatsKpiDividerIntensity; label: string }> = [
  { id: "soft", label: "Soft" },
  { id: "default", label: "Default" },
  { id: "strong", label: "Strong" },
];

const itemCountOptions = Array.from({ length: statsKpiItemMax }, (_, index) => String(index + 1));

type HeaderData = NonNullable<StatsKpiData["header"]>;
type StyleData = NonNullable<StatsKpiData["style"]>;

function normalizeValue(value: StatsKpiData): StatsKpiData {
  return normalizeStatsKpiData(value);
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
  value: StatsKpiVariantId;
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

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium">{title}</p>
      {action}
    </div>
  );
}

function updateValue(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  updater: (current: StatsKpiData) => StatsKpiData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeader(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
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

function clearHeader(value: StatsKpiData, onChange: (next: StatsKpiData) => void) {
  updateHeader(value, onChange, {
    title: "",
    description: "",
  });
}

function updateStyle(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
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

function clearStyle(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function updateItem(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  index: number,
  patch: Partial<StatsKpiItem>
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
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

function updateItemTrend(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  index: number,
  patch: Partial<NonNullable<StatsKpiItem["trend"]>>
) {
  const current = normalizeStatsKpiItems(value.items)[index];
  updateItem(value, onChange, index, {
    trend: {
      ...current?.trend,
      ...patch,
    },
  });
}

function updateItemLink(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  index: number,
  patch: Partial<NonNullable<StatsKpiItem["link"]>>
) {
  const current = normalizeStatsKpiItems(value.items)[index];
  updateItem(value, onChange, index, {
    link: {
      ...current?.link,
      ...patch,
    },
  });
}

function setItemsCount(value: StatsKpiData, onChange: (next: StatsKpiData) => void, count: number) {
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeStatsKpiItems(current.items, count),
  }));
}

function addItem(value: StatsKpiData, onChange: (next: StatsKpiData) => void) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (items.length >= statsKpiItemMax) return current;

    return {
      ...current,
      items: normalizeStatsKpiItems(
        [
          ...items,
          {
            value: `${items.length + 1}`,
            label: `Metric ${items.length + 1}`,
            description: "",
          },
        ],
        items.length + 1
      ),
    };
  });
}

function removeItem(value: StatsKpiData, onChange: (next: StatsKpiData) => void, index: number) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (items.length <= 1) return current;

    const nextItems = items.filter((_, currentIndex) => currentIndex !== index);
    return {
      ...current,
      items: normalizeStatsKpiItems(nextItems, nextItems.length),
    };
  });
}

function confirmAndRemoveItem(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  index: number
) {
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    const confirmed = window.confirm(
      `Remove metric ${index + 1}? This action cannot be undone from the editor history.`
    );
    if (!confirmed) return;
  }

  removeItem(value, onChange, index);
}

function moveItem(
  value: StatsKpiData,
  onChange: (next: StatsKpiData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const items = normalizeStatsKpiItems(current.items);
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return current;

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

function applyVariantDataPatch(
  nextVariant: StatsKpiVariantId,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<StatsKpiData>["onBlockPatch"]
) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
    }));
    return;
  }

  onVariantChange?.(nextVariant);
}

function DiagnosticsSnapshot({ value }: { value: StatsKpiData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function SpacingHelp({ spacing }: { spacing: StatsKpiSpacing | undefined }) {
  const activeOption = spacingOptions.find((option) => option.id === spacing) ?? spacingOptions[2]!;
  return (
    <p className="text-xs text-muted-foreground">
      Active spacing: <span className="font-medium text-foreground">{activeOption.label}</span>.{" "}
      {activeOption.help}
    </p>
  );
}

function HeaderFields({
  value,
  onChange,
  clearLabel,
}: {
  value: StatsKpiData;
  onChange: (next: StatsKpiData) => void;
  clearLabel: string;
}) {
  const normalized = normalizeValue(value);

  return (
    <>
      <div className="space-y-2">
        <SectionHeader
          title="Title"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearHeader(value, onChange)}
            >
              {clearLabel}
            </Button>
          }
        />
        <Input
          value={normalized.header?.title ?? ""}
          onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
          placeholder="Proof in numbers"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Description</p>
        <Textarea
          value={normalized.header?.description ?? ""}
          onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
          placeholder="Show key performance metrics and outcomes."
        />
      </div>
    </>
  );
}

function WizardMetricFields({
  value,
  onChange,
}: {
  value: StatsKpiData;
  onChange: (next: StatsKpiData) => void;
}) {
  const items = normalizeStatsKpiItems(normalizeValue(value).items);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id ?? `wizard-metric-${index + 1}`}
          className="space-y-3 rounded-lg border p-3"
        >
          <p className="text-sm font-semibold">Metric {index + 1}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Value</p>
              <Input
                value={item.value ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { value: event.target.value })
                }
                placeholder={`Metric ${index + 1} value`}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Label</p>
              <Input
                value={item.label ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { label: event.target.value })
                }
                placeholder={`Metric ${index + 1} label`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-medium">Description</p>
              <Textarea
                value={item.description ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { description: event.target.value })
                }
                placeholder="Optional supporting context."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Icon</p>
              <Input
                value={item.icon ?? ""}
                onChange={(event) =>
                  updateItem(value, onChange, index, { icon: event.target.value })
                }
                placeholder="🚀"
              />
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Icon guidance: use emoji or short plain-text glyphs only. SVG markup and icon class names
        are not supported.
      </p>
    </div>
  );
}

function renderLinkValidation(href: string | undefined) {
  if (!href || href.trim().length === 0) return null;
  const safeHref = normalizeWidgetSafeHref(href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });

  return (
    <p className="text-xs text-muted-foreground">
      {safeHref
        ? "Accepts relative paths, hash anchors, and http(s) URLs."
        : "Only relative paths, hash anchors, and http(s) URLs render as clickable metrics."}
    </p>
  );
}

export function StatsKpiWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);
  const items = normalizeStatsKpiItems(normalized.items);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Stats layout"
        description="Pick the publishable KPI layout and the number of visible metrics."
      >
        <VariantCards
          value={resolveStatsKpiVariant(variant)}
          onChange={(next) =>
            applyVariantDataPatch(next as StatsKpiVariantId, onVariantChange, onBlockPatch)
          }
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Metric count</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
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
        description="The Wizard now covers the publishable section heading without leaving onboarding mode."
      >
        <HeaderFields value={value} onChange={onChange} clearLabel="Clear header" />
      </EditorSection>

      <EditorSection
        title="Primary metric content"
        description="Edit the visible value, label, description, and icon fields for the current metric count."
      >
        <WizardMetricFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        title="Spacing guidance"
        description="Spacing still belongs to Visual controls, but the Wizard now explains the active rhythm."
      >
        <SpacingHelp spacing={normalized.style?.spacing} />
      </EditorSection>
    </div>
  );
}

export function StatsKpiVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);
  const items = normalizeStatsKpiItems(normalized.items);
  const resolvedVariant = resolveStatsKpiVariant(variant);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleMetricDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    moveItem(value, onChange, draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and metric structure"
        description="Choose KPI arrangement and deterministic metric count."
      >
        <VariantCards
          value={resolvedVariant}
          onChange={(next) =>
            applyVariantDataPatch(next as StatsKpiVariantId, onVariantChange, onBlockPatch)
          }
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Metrics count</p>
          <Select
            value={String(items.length)}
            onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
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

      <EditorSection title="Header copy" description="Edit section title and supporting context.">
        <HeaderFields value={value} onChange={onChange} clearLabel="Clear header" />
      </EditorSection>

      <EditorSection
        title="Metrics content and links"
        description="Manage KPI copy, trends, links, and ordering. Drag for long-distance reorder, or keep using the keyboard-friendly move buttons."
      >
        {items.map((item, index) => {
          const href = item.link?.href ?? "";
          return (
            <div
              key={item.id ?? `metric-${index + 1}`}
              className={cn(
                "space-y-3 rounded-lg border p-3",
                draggedIndex === index ? "border-primary/60 bg-primary/5" : undefined
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleMetricDrop(index)}
              data-stats-kpi-drag-item={item.id ?? `metric-${index + 1}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Metric {index + 1}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    draggable={items.length > 1}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedIndex(index);
                    }}
                    onDragEnd={() => setDraggedIndex(null)}
                    data-stats-kpi-drag-handle={`metric-${index + 1}`}
                    aria-label={`Drag metric ${index + 1}`}
                    title={`Drag metric ${index + 1}`}
                  >
                    Drag
                  </Button>
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
                    onClick={() => confirmAndRemoveItem(value, onChange, index)}
                    disabled={items.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Value</p>
                  <Input
                    value={item.value ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { value: event.target.value })
                    }
                    placeholder="120"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Label</p>
                  <Input
                    value={item.label ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { label: event.target.value })
                    }
                    placeholder="Projects launched"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Prefix</p>
                  <Input
                    value={item.prefix ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { prefix: event.target.value })
                    }
                    placeholder="$"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Suffix</p>
                  <Input
                    value={item.suffix ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { suffix: event.target.value })
                    }
                    placeholder="%"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-sm font-medium">Description</p>
                  <Textarea
                    value={item.description ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { description: event.target.value })
                    }
                    placeholder="Optional supporting context."
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Icon</p>
                  <Input
                    value={item.icon ?? ""}
                    onChange={(event) =>
                      updateItem(value, onChange, index, { icon: event.target.value })
                    }
                    placeholder="🚀"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use emoji or short plain-text glyphs only. No SVG markup or icon class names.
                  </p>
                </div>
                <div className="space-y-2">
                  <SharedColorControl
                    label="Metric accent color"
                    value={item.accentColor}
                    onChange={(next) => updateItem(value, onChange, index, { accentColor: next })}
                    placeholder="var(--color-accent)"
                    pickerFallback="#0f172a"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Trend label</p>
                  <Input
                    value={item.trend?.label ?? ""}
                    onChange={(event) =>
                      updateItemTrend(value, onChange, index, { label: event.target.value })
                    }
                    placeholder="+12% MoM"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Trend direction</p>
                  <Select
                    value={item.trend?.direction ?? "neutral"}
                    onValueChange={(next) =>
                      updateItemTrend(value, onChange, index, {
                        direction: next as StatsKpiTrendDirection,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {trendDirectionOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-sm font-medium">Metric link URL</p>
                  <Input
                    value={href}
                    onChange={(event) =>
                      updateItemLink(value, onChange, index, { href: event.target.value })
                    }
                    placeholder="/work"
                  />
                  {renderLinkValidation(href)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Link label</p>
                  <Input
                    value={item.link?.label ?? ""}
                    onChange={(event) =>
                      updateItemLink(value, onChange, index, { label: event.target.value })
                    }
                    placeholder="See launch examples"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Open in new tab</p>
                    <p className="text-xs text-muted-foreground">
                      Shared safe-link handling adds `target` and `rel` only for valid URLs.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(item.link?.openInNewTab)}
                    onCheckedChange={(checked) =>
                      updateItemLink(value, onChange, index, { openInNewTab: Boolean(checked) })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => addItem(value, onChange)}
          disabled={items.length >= statsKpiItemMax}
        >
          Add metric
        </Button>
      </EditorSection>

      <EditorSection
        title="Text and value styling"
        description="Tune the KPI typography tokens without mixing in surfaces or layout."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Value size</p>
          <Select
            value={normalized.style?.valueSize ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { valueSize: next as StatsKpiValueSize })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value size" />
            </SelectTrigger>
            <SelectContent>
              {valueSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SharedColorControl
          label="Value color"
          value={normalized.style?.valueColor}
          onChange={(next) => updateStyle(value, onChange, { valueColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
        <SharedColorControl
          label="Label color"
          value={normalized.style?.labelColor}
          onChange={(next) => updateStyle(value, onChange, { labelColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
        <SharedColorControl
          label="Description color"
          value={normalized.style?.descriptionColor}
          onChange={(next) => updateStyle(value, onChange, { descriptionColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
      </EditorSection>

      <EditorSection
        title="Card and icon surfaces"
        description="Keep per-card surfaces separate from section layout and text tokens."
      >
        <ClearableInputField
          label="Card background"
          value={normalized.style?.cardBackground}
          onChange={(next) => updateStyle(value, onChange, { cardBackground: next })}
          onClear={() => clearStyle(value, onChange, "cardBackground")}
          placeholder="var(--color-bg)"
        />
        <ClearableInputField
          label="Card border"
          value={normalized.style?.cardBorderColor}
          onChange={(next) => updateStyle(value, onChange, { cardBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "cardBorderColor")}
          placeholder="var(--color-border)"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Icon size</p>
          <Select
            value={normalized.style?.iconSize ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { iconSize: next as StatsKpiIconSize })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select icon size" />
            </SelectTrigger>
            <SelectContent>
              {iconSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ClearableInputField
          label="Icon surface"
          value={normalized.style?.iconSurface}
          onChange={(next) => updateStyle(value, onChange, { iconSurface: next })}
          onClear={() => clearStyle(value, onChange, "iconSurface")}
          placeholder="var(--color-bg-muted)"
        />
        <ClearableInputField
          label="Icon border"
          value={normalized.style?.iconBorderColor}
          onChange={(next) => updateStyle(value, onChange, { iconBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "iconBorderColor")}
          placeholder="var(--color-border)"
        />
      </EditorSection>

      <EditorSection
        title="Section layout and spacing"
        description="Adjust section surfaces, width, density, and inline divider behavior."
      >
        <ClearableInputField
          label="Section background"
          value={normalized.style?.sectionBackground}
          onChange={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          onClear={() => clearStyle(value, onChange, "sectionBackground")}
          placeholder="var(--color-bg-subtle)"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Section max width</p>
          <Select
            value={normalized.style?.maxWidth ?? "lg"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { maxWidth: next as StatsKpiMaxWidth })
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Section padding</p>
          <Select
            value={normalized.style?.padding ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { padding: next as StatsKpiPadding })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select padding" />
            </SelectTrigger>
            <SelectContent>
              {paddingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Minimum height</p>
          <Select
            value={normalized.style?.minHeight ?? "none"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { minHeight: next as StatsKpiMinHeight })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select minimum height" />
            </SelectTrigger>
            <SelectContent>
              {minHeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={normalized.style?.alignment ?? "center"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { alignment: next as StatsKpiAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as StatsKpiSpacing })
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
          <SpacingHelp spacing={normalized.style?.spacing} />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Show dividers</p>
            <p className="text-xs text-muted-foreground">
              {resolvedVariant === "inline"
                ? "Inline metrics can use left dividers between items."
                : "Inline-only. Other variants ignore divider output, so this toggle stays locked."}
            </p>
          </div>
          <Switch
            disabled={resolvedVariant !== "inline"}
            checked={Boolean(normalized.style?.divider)}
            onCheckedChange={(checked) =>
              updateStyle(value, onChange, { divider: Boolean(checked) })
            }
          />
        </div>
        {resolvedVariant === "inline" && normalized.style?.divider ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Divider intensity</p>
            <Select
              value={normalized.style?.dividerIntensity ?? "default"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  dividerIntensity: next as StatsKpiDividerIntensity,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select divider intensity" />
              </SelectTrigger>
              <SelectContent>
                {dividerIntensityOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </EditorSection>
    </div>
  );
}

export function StatsKpiAdvancedEditor({ value, onChange }: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical spacing and alignment tokens"
        description="Low-level display controls for layout behavior."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment token</p>
          <Select
            value={normalized.style?.alignment ?? "center"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { alignment: next as StatsKpiAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing token</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as StatsKpiSpacing })
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
          <p className="text-sm font-medium">Value color token</p>
          <Input
            value={normalized.style?.valueColor ?? ""}
            onChange={(event) => updateStyle(value, onChange, { valueColor: event.target.value })}
            placeholder="var(--color-text)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Label color token</p>
          <Input
            value={normalized.style?.labelColor ?? ""}
            onChange={(event) => updateStyle(value, onChange, { labelColor: event.target.value })}
            placeholder="var(--color-text)"
          />
        </div>
        <ClearableInputField
          label="Card background token"
          value={normalized.style?.cardBackground}
          onChange={(next) => updateStyle(value, onChange, { cardBackground: next })}
          onClear={() => clearStyle(value, onChange, "cardBackground")}
          placeholder="var(--color-bg)"
        />
        <ClearableInputField
          label="Card border token"
          value={normalized.style?.cardBorderColor}
          onChange={(next) => updateStyle(value, onChange, { cardBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "cardBorderColor")}
          placeholder="var(--color-border)"
        />
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback values and structure."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(statsKpiDefaults)}>
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

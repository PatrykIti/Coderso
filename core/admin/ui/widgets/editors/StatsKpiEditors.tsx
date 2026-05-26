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
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow as BaseWidgetControlRow,
  WidgetEditorSection,
  type WidgetControlRowProps,
} from "./WidgetEditorControls";
import {
  hasClearableFieldValue,
  isPickerRepresentableColorValue,
  resolveColorPickerValue,
} from "./ClearableFields";

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
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: EditorMode;
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

function WidgetControlRow(props: WidgetControlRowProps) {
  const path =
    props.path ??
    (props.ownership === "action" || props.ownership === "preview"
      ? undefined
      : props.id.replace(/^stats-kpi\./, ""));
  return <BaseWidgetControlRow {...props} path={path} />;
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

function ClearActionButton({
  value,
  onClear,
}: {
  value: string | undefined;
  onClear?: () => void;
}) {
  if (!onClear) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClear}
      disabled={!hasClearableFieldValue(value)}
    >
      Clear
    </Button>
  );
}

function StatsKpiColorField({
  id,
  label,
  value,
  onChange,
  pickerFallback = "#0f172a",
  onClear,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  pickerFallback?: string;
  onClear?: () => void;
}) {
  const hasValue = hasClearableFieldValue(value);
  const hasCustomValue = hasValue && !isPickerRepresentableColorValue(value);
  const pickerValue = resolveColorPickerValue(value, pickerFallback);

  return (
    <WidgetControlRow
      id={id}
      label={label}
      actions={<ClearActionButton value={value} onClear={onClear} />}
    >
      {(fieldProps) => (
        <div className="space-y-3">
          <div className="grid grid-cols-[2.5rem_1fr] gap-2">
            <Input
              id={fieldProps.id}
              type="color"
              value={pickerValue}
              onChange={(event) => onChange(event.target.value)}
              className="h-9 w-10 p-1"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
            <div className="flex min-h-9 flex-wrap items-center gap-2">
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
              A saved custom color is configured. Pick a swatch to replace it
              {onClear ? ", or clear the field" : ""}.
            </p>
          ) : null}
        </div>
      )}
    </WidgetControlRow>
  );
}

function StatsKpiSurfaceColorField({
  id,
  label,
  value,
  onChange,
  onClear,
  pickerFallback,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  pickerFallback: string;
}) {
  return (
    <StatsKpiColorField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      pickerFallback={pickerFallback}
    />
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
  controlIdPrefix = "stats-kpi.header",
}: {
  value: StatsKpiData;
  onChange: (next: StatsKpiData) => void;
  clearLabel: string;
  controlIdPrefix?: string;
}) {
  const normalized = normalizeValue(value);

  return (
    <>
      <WidgetControlRow
        id={`${controlIdPrefix}.title`}
        label="Title"
        path="header.title"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearHeader(value, onChange)}
          >
            {clearLabel}
          </Button>
        }
      >
        {(fieldProps) => (
          <Input
            id={fieldProps.id}
            value={normalized.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Proof in numbers"
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id={`${controlIdPrefix}.description`}
        label="Description"
        path="header.description"
      >
        {(fieldProps) => (
          <Textarea
            id={fieldProps.id}
            value={normalized.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Show key performance metrics and outcomes."
            aria-labelledby={fieldProps["aria-labelledby"]}
            aria-describedby={fieldProps["aria-describedby"]}
          />
        )}
      </WidgetControlRow>
    </>
  );
}

function RepairActionRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <WidgetControlRow id={id} label={label} help={description} ownership="action">
      {() => <div className="flex flex-wrap gap-2">{children}</div>}
    </WidgetControlRow>
  );
}

function confirmStatsKpiRepair(message: string) {
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    return window.confirm(message);
  }

  return true;
}

function ReadonlyInlineList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="outline">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function formatBoolean(value: boolean | undefined) {
  return value ? "Enabled" : "Disabled";
}

function summarizeSplitHighlight(items: StatsKpiItem[], variant: StatsKpiVariantId) {
  if (variant !== "split-highlight") return "Inactive unless Split Highlight is selected.";
  const secondaryCount = Math.max(0, items.length - 1);
  const desktopColumns = secondaryCount > 1 && secondaryCount % 2 === 1 ? "3" : "2";
  return `${secondaryCount} secondary metrics, desktop grid resolves to ${desktopColumns} columns.`;
}

function summarizeSafeLinks(items: StatsKpiItem[]) {
  const safeCount = items.filter((item) =>
    normalizeWidgetSafeHref(item.link?.href, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    })
  ).length;
  const configuredCount = items.filter((item) => (item.link?.href ?? "").trim().length > 0).length;

  if (configuredCount === 0) return "No metric links configured.";
  return `${safeCount}/${configuredCount} configured metric links resolve to safe hrefs.`;
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
            <WidgetControlRow
              id={`stats-kpi.wizard.items.${index}.value`}
              label="Value"
              path={`items.${index}.value`}
            >
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={item.value ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { value: event.target.value })
                  }
                  placeholder={`Metric ${index + 1} value`}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id={`stats-kpi.wizard.items.${index}.label`}
              label="Label"
              path={`items.${index}.label`}
            >
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={item.label ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { label: event.target.value })
                  }
                  placeholder={`Metric ${index + 1} label`}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id={`stats-kpi.wizard.items.${index}.description`}
              label="Description"
              path={`items.${index}.description`}
              className="sm:col-span-2"
            >
              {(fieldProps) => (
                <Textarea
                  id={fieldProps.id}
                  value={item.description ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { description: event.target.value })
                  }
                  placeholder="Optional supporting context."
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id={`stats-kpi.wizard.items.${index}.icon`}
              label="Icon"
              path={`items.${index}.icon`}
            >
              {(fieldProps) => (
                <Input
                  id={fieldProps.id}
                  value={item.icon ?? ""}
                  onChange={(event) =>
                    updateItem(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="🚀"
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                />
              )}
            </WidgetControlRow>
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
        id="stats-kpi.wizard.layout-seed"
        mode="wizard"
        role="setup"
        title="Layout seed"
        description="Pick the publishable KPI layout and the number of visible metrics."
      >
        <WidgetControlRow id="stats-kpi.wizard.variant" label="Starter KPI layout" path="variant">
          {() => (
            <VariantCards
              value={resolveStatsKpiVariant(variant)}
              onChange={(next) =>
                applyVariantDataPatch(next as StatsKpiVariantId, onVariantChange, onBlockPatch)
              }
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="stats-kpi.wizard.items.count" label="Metric count" path="items.count">
          {(fieldProps) => (
            <Select
              value={String(items.length)}
              onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
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
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="stats-kpi.wizard.header-seed"
        mode="wizard"
        role="setup"
        title="Header seed"
        description="The Wizard now covers the publishable section heading without leaving onboarding mode."
      >
        <HeaderFields
          value={value}
          onChange={onChange}
          clearLabel="Clear header"
          controlIdPrefix="stats-kpi.wizard.header"
        />
      </EditorSection>

      <EditorSection
        id="stats-kpi.wizard.metric-seed"
        mode="wizard"
        role="setup"
        title="Metric seed"
        description="Edit the visible value, label, description, and icon fields for the current metric count."
      >
        <WizardMetricFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="stats-kpi.wizard.spacing-guidance"
        mode="wizard"
        role="summary"
        title="Spacing guidance"
        description="Spacing still belongs to Visual controls, but the Wizard now explains the active rhythm."
      >
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.wizard.style.spacing"
          label="Active spacing"
          path="style.spacing"
          value={<SpacingHelp spacing={normalized.style?.spacing} />}
        />
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
        id="stats-kpi.visual.variant-structure"
        mode="visual"
        role="setup"
        title="Variant and structure"
        description="Choose KPI arrangement and deterministic metric count."
      >
        <WidgetControlRow id="stats-kpi.variant" label="KPI layout">
          {() => (
            <VariantCards
              value={resolvedVariant}
              onChange={(next) =>
                applyVariantDataPatch(next as StatsKpiVariantId, onVariantChange, onBlockPatch)
              }
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="stats-kpi.items.count" label="Metrics count" path="items.count">
          {(fieldProps) => (
            <Select
              value={String(items.length)}
              onValueChange={(next) => setItemsCount(value, onChange, Number(next))}
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
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="stats-kpi.visual.section-header"
        mode="visual"
        role="content"
        title="Section header"
        description="Edit section title and supporting context."
      >
        <HeaderFields
          value={value}
          onChange={onChange}
          clearLabel="Clear header"
          controlIdPrefix="stats-kpi.header"
        />
      </EditorSection>

      <EditorSection
        id="stats-kpi.visual.metrics-content"
        mode="visual"
        role="content"
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
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.value`}
                  label="Value"
                  path={`items.${index}.value`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.value ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { value: event.target.value })
                      }
                      placeholder="120"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.label`}
                  label="Label"
                  path={`items.${index}.label`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.label ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { label: event.target.value })
                      }
                      placeholder="Projects launched"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.prefix`}
                  label="Prefix"
                  path={`items.${index}.prefix`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.prefix ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { prefix: event.target.value })
                      }
                      placeholder="$"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.suffix`}
                  label="Suffix"
                  path={`items.${index}.suffix`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.suffix ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { suffix: event.target.value })
                      }
                      placeholder="%"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.description`}
                  label="Description"
                  path={`items.${index}.description`}
                  className="sm:col-span-2"
                >
                  {(fieldProps) => (
                    <Textarea
                      id={fieldProps.id}
                      value={item.description ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { description: event.target.value })
                      }
                      placeholder="Optional supporting context."
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.icon`}
                  label="Icon"
                  path={`items.${index}.icon`}
                  help="Use emoji or short plain-text glyphs only. No SVG markup or icon class names."
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.icon ?? ""}
                      onChange={(event) =>
                        updateItem(value, onChange, index, { icon: event.target.value })
                      }
                      placeholder="🚀"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <StatsKpiColorField
                  id={`stats-kpi.items.${index}.accentColor`}
                  label="Metric accent color"
                  value={item.accentColor}
                  onChange={(next) => updateItem(value, onChange, index, { accentColor: next })}
                  onClear={() => updateItem(value, onChange, index, { accentColor: undefined })}
                  pickerFallback="#1d4ed8"
                />
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.trend.label`}
                  label="Trend label"
                  path={`items.${index}.trend.label`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.trend?.label ?? ""}
                      onChange={(event) =>
                        updateItemTrend(value, onChange, index, { label: event.target.value })
                      }
                      placeholder="+12% MoM"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.trend.direction`}
                  label="Trend direction"
                  path={`items.${index}.trend.direction`}
                >
                  {(fieldProps) => (
                    <Select
                      value={item.trend?.direction ?? "neutral"}
                      onValueChange={(next) =>
                        updateItemTrend(value, onChange, index, {
                          direction: next as StatsKpiTrendDirection,
                        })
                      }
                    >
                      <SelectTrigger
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                      >
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
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.link.href`}
                  label="Metric link URL"
                  path={`items.${index}.link.href`}
                  className="sm:col-span-2"
                >
                  {(fieldProps) => (
                    <>
                      <Input
                        id={fieldProps.id}
                        value={href}
                        onChange={(event) =>
                          updateItemLink(value, onChange, index, { href: event.target.value })
                        }
                        placeholder="/work"
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        aria-describedby={fieldProps["aria-describedby"]}
                      />
                      {renderLinkValidation(href)}
                    </>
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.link.label`}
                  label="Link label"
                  path={`items.${index}.link.label`}
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={item.link?.label ?? ""}
                      onChange={(event) =>
                        updateItemLink(value, onChange, index, { label: event.target.value })
                      }
                      placeholder="See launch examples"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>
                <WidgetControlRow
                  id={`stats-kpi.items.${index}.link.openInNewTab`}
                  label="Open in new tab"
                  path={`items.${index}.link.openInNewTab`}
                  help="Shared safe-link handling adds target and rel only for valid URLs."
                  className="rounded-md border px-3 py-2"
                >
                  {() => (
                    <Switch
                      checked={Boolean(item.link?.openInNewTab)}
                      onCheckedChange={(checked) =>
                        updateItemLink(value, onChange, index, { openInNewTab: Boolean(checked) })
                      }
                    />
                  )}
                </WidgetControlRow>
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
        id="stats-kpi.visual.typography"
        mode="visual"
        role="visual"
        title="Typography"
        description="Tune KPI typography and colors without mixing in surfaces or layout."
      >
        <WidgetControlRow id="stats-kpi.style.valueSize" label="Value size">
          {(fieldProps) => (
            <Select
              value={normalized.style?.valueSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { valueSize: next as StatsKpiValueSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <StatsKpiColorField
          id="stats-kpi.style.valueColor"
          label="Value color"
          value={normalized.style?.valueColor}
          onChange={(next) => updateStyle(value, onChange, { valueColor: next })}
          onClear={() => clearStyle(value, onChange, "valueColor")}
        />
        <StatsKpiColorField
          id="stats-kpi.style.labelColor"
          label="Label color"
          value={normalized.style?.labelColor}
          onChange={(next) => updateStyle(value, onChange, { labelColor: next })}
          onClear={() => clearStyle(value, onChange, "labelColor")}
        />
        <StatsKpiColorField
          id="stats-kpi.style.descriptionColor"
          label="Description color"
          value={normalized.style?.descriptionColor}
          onChange={(next) => updateStyle(value, onChange, { descriptionColor: next })}
          onClear={() => clearStyle(value, onChange, "descriptionColor")}
        />
      </EditorSection>

      <EditorSection
        id="stats-kpi.visual.card-icon-surface"
        mode="visual"
        role="visual"
        title="Card and icon surfaces"
        description="Keep per-card surfaces separate from section layout and metric text colors."
      >
        <StatsKpiSurfaceColorField
          id="stats-kpi.style.cardBackground"
          label="Card background"
          value={normalized.style?.cardBackground}
          onChange={(next) => updateStyle(value, onChange, { cardBackground: next })}
          onClear={() => clearStyle(value, onChange, "cardBackground")}
          pickerFallback="#ffffff"
        />
        <StatsKpiSurfaceColorField
          id="stats-kpi.style.cardBorderColor"
          label="Card border"
          value={normalized.style?.cardBorderColor}
          onChange={(next) => updateStyle(value, onChange, { cardBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "cardBorderColor")}
          pickerFallback="#e2e8f0"
        />
        <WidgetControlRow id="stats-kpi.style.iconSize" label="Icon size">
          {(fieldProps) => (
            <Select
              value={normalized.style?.iconSize ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { iconSize: next as StatsKpiIconSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <StatsKpiSurfaceColorField
          id="stats-kpi.style.iconSurface"
          label="Icon surface"
          value={normalized.style?.iconSurface}
          onChange={(next) => updateStyle(value, onChange, { iconSurface: next })}
          onClear={() => clearStyle(value, onChange, "iconSurface")}
          pickerFallback="#f1f5f9"
        />
        <StatsKpiSurfaceColorField
          id="stats-kpi.style.iconBorderColor"
          label="Icon border"
          value={normalized.style?.iconBorderColor}
          onChange={(next) => updateStyle(value, onChange, { iconBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "iconBorderColor")}
          pickerFallback="#e2e8f0"
        />
      </EditorSection>

      <EditorSection
        id="stats-kpi.visual.layout-spacing"
        mode="visual"
        role="layout"
        title="Section layout and spacing"
        description="Adjust section surfaces, width, density, and inline divider behavior."
      >
        <StatsKpiSurfaceColorField
          id="stats-kpi.style.sectionBackground"
          label="Section background"
          value={normalized.style?.sectionBackground}
          onChange={(next) => updateStyle(value, onChange, { sectionBackground: next })}
          onClear={() => clearStyle(value, onChange, "sectionBackground")}
          pickerFallback="#f8fafc"
        />
        <WidgetControlRow id="stats-kpi.style.maxWidth" label="Section max width">
          {(fieldProps) => (
            <Select
              value={normalized.style?.maxWidth ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { maxWidth: next as StatsKpiMaxWidth })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="stats-kpi.style.padding" label="Section padding">
          {(fieldProps) => (
            <Select
              value={normalized.style?.padding ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { padding: next as StatsKpiPadding })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="stats-kpi.style.minHeight" label="Minimum height">
          {(fieldProps) => (
            <Select
              value={normalized.style?.minHeight ?? "none"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { minHeight: next as StatsKpiMinHeight })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="stats-kpi.style.alignment" label="Alignment">
          {(fieldProps) => (
            <Select
              value={normalized.style?.alignment ?? "center"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { alignment: next as StatsKpiAlignment })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
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
          )}
        </WidgetControlRow>
        <WidgetControlRow id="stats-kpi.style.spacing" label="Spacing">
          {(fieldProps) => (
            <>
              <Select
                value={normalized.style?.spacing ?? "md"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { spacing: next as StatsKpiSpacing })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            </>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="stats-kpi.style.divider"
          label="Show dividers"
          help={
            resolvedVariant === "inline"
              ? "Inline metrics can use left dividers between items."
              : "Inline-only. Other variants ignore divider output, so this toggle stays locked."
          }
        >
          {() => (
            <Switch
              disabled={resolvedVariant !== "inline"}
              checked={Boolean(normalized.style?.divider)}
              onCheckedChange={(checked) =>
                updateStyle(value, onChange, { divider: Boolean(checked) })
              }
            />
          )}
        </WidgetControlRow>
        {resolvedVariant === "inline" && normalized.style?.divider ? (
          <WidgetControlRow id="stats-kpi.style.dividerIntensity" label="Divider intensity">
            {(fieldProps) => (
              <Select
                value={normalized.style?.dividerIntensity ?? "default"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    dividerIntensity: next as StatsKpiDividerIntensity,
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
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
            )}
          </WidgetControlRow>
        ) : null}
      </EditorSection>
    </div>
  );
}

export function StatsKpiAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeValue(value);
  const items = normalizeStatsKpiItems(normalized.items);
  const style = normalized.style ?? {};
  const resolvedVariant = resolveStatsKpiVariant(variant);
  const variantLabel =
    variantOptions.find((option) => option.id === resolvedVariant)?.label ?? resolvedVariant;

  return (
    <div className="space-y-4">
      <EditorSection
        id="stats-kpi.advanced.runtime-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Runtime diagnostics"
        description="Read-only rendering diagnostics. Daily metric, layout, and style edits belong to Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.variant"
          label="Resolved variant"
          path="variant"
          value={variantLabel}
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.items.count"
          label="Metric count"
          path="items.count"
          value={String(items.length)}
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.split-highlight"
          label="Split-highlight secondary grid"
          path="items.order"
          value={summarizeSplitHighlight(items, resolvedVariant)}
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.runtime.animationPolicy"
          label="Animation policy"
          path="runtime.animationPolicy"
          value="Static metrics only; count-up animation remains deferred for accessibility and performance."
        />
      </EditorSection>

      <EditorSection
        id="stats-kpi.advanced.style-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Style diagnostics"
        description="Read-only resolved style tokens mirrored from the Visual owner."
      >
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.style.layout"
          label="Layout tokens"
          path="style.alignment"
          value={
            <ReadonlyInlineList
              values={[
                `alignment: ${style.alignment ?? "center"}`,
                `spacing: ${style.spacing ?? "md"}`,
                `maxWidth: ${style.maxWidth ?? "lg"}`,
                `padding: ${style.padding ?? "md"}`,
                `minHeight: ${style.minHeight ?? "none"}`,
              ]}
            />
          }
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.style.typography"
          label="Typography tokens"
          path="style.valueSize"
          value={
            <ReadonlyInlineList
              values={[
                `valueSize: ${style.valueSize ?? "md"}`,
                `valueColor: ${style.valueColor ?? "var(--color-text)"}`,
                `labelColor: ${style.labelColor ?? "var(--color-text)"}`,
                `descriptionColor: ${style.descriptionColor ?? "var(--color-text)"}`,
              ]}
            />
          }
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.style.surfaces"
          label="Surface tokens"
          path="style.cardBackground"
          value={
            <ReadonlyInlineList
              values={[
                `section: ${style.sectionBackground ?? "theme default"}`,
                `card: ${style.cardBackground ?? "theme default"}`,
                `cardBorder: ${style.cardBorderColor ?? "theme default"}`,
                `iconSurface: ${style.iconSurface ?? "theme default"}`,
                `iconBorder: ${style.iconBorderColor ?? "theme default"}`,
                `iconSize: ${style.iconSize ?? "md"}`,
              ]}
            />
          }
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.style.divider"
          label="Divider policy"
          path="style.divider"
          value={`${formatBoolean(style.divider)}; ${resolvedVariant === "inline" ? `intensity ${style.dividerIntensity ?? "default"}` : "rendered by inline variant only"}`}
        />
      </EditorSection>

      <EditorSection
        id="stats-kpi.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Inspect normalized output and run explicit repair actions when payloads need deterministic fallback values."
      >
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.runtime.safeLinks"
          label="Safe link status"
          path="runtime.safeLinks"
          value={summarizeSafeLinks(items)}
        />
        <RepairActionRow
          id="stats-kpi.advanced.repair-actions"
          label="Repair actions"
          description="Actions are intentionally separated from daily editing and require confirmation."
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!confirmStatsKpiRepair("Normalize this Stats KPI payload now?")) return;
              onChange(normalizeValue(value));
            }}
          >
            Normalize now
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!confirmStatsKpiRepair("Reset this Stats KPI widget to defaults?")) return;
              onChange(statsKpiDefaults);
            }}
          >
            Reset to defaults
          </Button>
        </RepairActionRow>
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.runtime.payload"
          label="Runtime summary"
          path="items"
          value={`${items.length} KPI item${items.length === 1 ? "" : "s"} normalized; raw JSON is not shown in the editor.`}
        />
        <ReadonlyWidgetSummaryRow
          id="stats-kpi.advanced.contract"
          label="Contract summary"
          path="items"
          value="Wizard seeds the initial KPI setup, Visual owns daily metric and presentation edits, Advanced is read-only diagnostics plus explicit repair actions."
        />
      </EditorSection>
    </div>
  );
}

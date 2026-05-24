import { type ReactNode } from "react";

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
import { cn } from "@/lib/utils";

import {
  applyGridColumnsAsymmetricPreset,
  buildBalancedGridColumnsDesktopSpans,
  calculateGridColumnsSpanTotals,
  gridColumnsColumnMax,
  gridColumnsColumnMin,
  gridColumnsDefaults,
  gridColumnsGapTokens,
  gridColumnsSpanTokens,
  normalizeGridColumnsData,
  reorderGridColumnsColumnsAndSlots,
  resolveGridColumnsAsymmetricVariantState,
  resolveGridColumnsEffectiveColumns,
  resolveGridColumnsVariant,
  type GridColumnsAlign,
  type GridColumnsBorderWidth,
  type GridColumnsColumnStyle,
  type GridColumnsData,
  type GridColumnsGap,
  type GridColumnsMinHeight,
  type GridColumnsOverflow,
  type GridColumnsPadding,
  type GridColumnsRadius,
  type GridColumnsSelfAlign,
  type GridColumnsSpan,
  type GridColumnsVariantId,
} from "../../../../widgets/core/gridColumns";
import { parseRepeatableSlotId } from "../../../../widgets/slots";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";
import { SharedColorControl } from "./SharedColorControl";

const variantOptions: Array<{
  id: GridColumnsVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "equal",
    label: "Equal",
    description: "Balanced columns for predictable section structures.",
  },
  {
    id: "asymmetric",
    label: "Asymmetric",
    description: "Lead column is wider for mixed narrative and utility layouts.",
  },
  {
    id: "masonry-lite",
    label: "Masonry Lite",
    description: "Cardized column wrappers for dense compositions.",
  },
];

const spanOptions = gridColumnsSpanTokens.map((value) => ({
  id: value,
  label: `${value}/12`,
}));

const extendedSpanOptions = [{ id: "auto", label: "Match desktop" }, ...spanOptions];

const gapScaleLabels: Record<GridColumnsGap, string> = {
  none: "None - 0px",
  "1": "Gap 1 - 4px",
  "2": "Gap 2 - 8px",
  "3": "Gap 3 - 12px",
  "4": "Gap 4 - 16px",
  "5": "Gap 5 - 20px",
  "6": "Gap 6 - 24px",
  "7": "Gap 7 - 28px",
  "8": "Gap 8 - 32px",
  "10": "Gap 10 - 40px",
  "12": "Gap 12 - 48px",
};

const gapOptions = gridColumnsGapTokens.map((value) => ({
  id: value,
  label: gapScaleLabels[value],
}));

const alignOptions: Array<{ id: GridColumnsAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
];

const borderWidthOptions: Array<{ id: GridColumnsBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: GridColumnsRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "2xl", label: "2XL" },
];

const paddingOptions: Array<{ id: GridColumnsPadding; label: string }> = [
  { id: "none", label: "None" },
  { id: "2", label: "Compact" },
  { id: "3", label: "Small" },
  { id: "4", label: "Default" },
  { id: "5", label: "Large" },
  { id: "6", label: "XL" },
];

const inheritedBorderWidthOptions = [{ id: "inherit", label: "Global" }, ...borderWidthOptions];

const inheritedRadiusOptions = [{ id: "inherit", label: "Global" }, ...radiusOptions];

const inheritedPaddingOptions = [{ id: "inherit", label: "Global" }, ...paddingOptions];

const minHeightOptions: Array<{ id: GridColumnsMinHeight; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small - 4rem" },
  { id: "md", label: "Default - 6rem" },
  { id: "lg", label: "Large - 8rem" },
  { id: "xl", label: "XL - 10rem" },
];

const mobileMinHeightOptions = [{ id: "inherit", label: "Match base height" }, ...minHeightOptions];

const selfAlignOptions: Array<{ id: GridColumnsSelfAlign; label: string }> = [
  { id: "inherit", label: "Inherit global" },
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
];

const overflowOptions: Array<{ id: GridColumnsOverflow; label: string }> = [
  { id: "visible", label: "Visible" },
  { id: "hidden", label: "Hidden" },
];

type ColumnData = NonNullable<GridColumnsData["columns"]>[number];
type LayoutData = NonNullable<GridColumnsData["layout"]>;
type StyleData = NonNullable<GridColumnsData["style"]>;
type ColumnStyleData = NonNullable<GridColumnsColumnStyle>;
type OrderedGridColumnsRow = {
  column: ColumnData;
  rowIndex: number;
  instanceId: string;
  slotId: string;
  hasSavedMetadata: boolean;
};

type GridColumnsSlotDriftState = {
  orderedInstanceIds?: string[];
  slotIdByInstanceId: Map<string, string>;
  missingLiveInstanceIds: string[];
  phantomSavedInstanceIds: string[];
  hasLiveSlotDrift: boolean;
};
type GridColumnsPreset = {
  id: string;
  label: string;
  description: string;
  count: number;
  columns: Array<Pick<ColumnData, "desktopSpan" | "tabletSpan" | "mobileSpan">>;
};

const clampColumnsCount = (value: number) =>
  Math.max(gridColumnsColumnMin, Math.min(gridColumnsColumnMax, Math.floor(value)));

const buildBalancedDesktopSpans = (count: number): GridColumnsSpan[] =>
  buildBalancedGridColumnsDesktopSpans(count);

const buildPresetColumns = (desktopSpans: GridColumnsSpan[]) =>
  desktopSpans.map((desktopSpan) => ({
    desktopSpan,
    tabletSpan: "6" as GridColumnsSpan,
    mobileSpan: "12" as GridColumnsSpan,
  }));

const gridColumnsPresets: GridColumnsPreset[] = [
  {
    id: "two-equal",
    label: "50 / 50",
    description: "Balanced two-column split.",
    count: 2,
    columns: buildPresetColumns(["6", "6"]),
  },
  {
    id: "two-third-right",
    label: "33 / 67",
    description: "Narrow lead column with wider supporting content.",
    count: 2,
    columns: buildPresetColumns(["4", "8"]),
  },
  {
    id: "two-third-left",
    label: "67 / 33",
    description: "Wider lead column with narrower supporting content.",
    count: 2,
    columns: buildPresetColumns(["8", "4"]),
  },
  {
    id: "three-equal",
    label: "33 / 33 / 33",
    description: "Three equal desktop columns.",
    count: 3,
    columns: buildPresetColumns(["4", "4", "4"]),
  },
  {
    id: "three-highlight-center",
    label: "25 / 50 / 25",
    description: "Balanced side columns with a dominant center column.",
    count: 3,
    columns: buildPresetColumns(["3", "6", "3"]),
  },
  {
    id: "four-balanced",
    label: "Balanced 4",
    description: "Evenly distributed four-column desktop layout.",
    count: 4,
    columns: buildPresetColumns(buildBalancedDesktopSpans(4)),
  },
  {
    id: "five-balanced",
    label: "Balanced 5",
    description: "Weighted five-column desktop layout that stays within 12 columns.",
    count: 5,
    columns: buildPresetColumns(buildBalancedDesktopSpans(5)),
  },
  {
    id: "six-balanced",
    label: "Balanced 6",
    description: "Six compact desktop columns with even distribution.",
    count: 6,
    columns: buildPresetColumns(buildBalancedDesktopSpans(6)),
  },
];

function normalizeValue(value: GridColumnsData): GridColumnsData {
  return normalizeGridColumnsData(value);
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

function VariantCards({
  value,
  onChange,
}: {
  value: GridColumnsVariantId;
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
          <div
            aria-hidden="true"
            data-grid-columns-variant-preview={option.id}
            className="mb-3 rounded-md border bg-muted/20 p-2"
          >
            {option.id === "equal" ? (
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-4 h-8 rounded bg-foreground/15" />
                <span className="col-span-4 h-8 rounded bg-foreground/15" />
                <span className="col-span-4 h-8 rounded bg-foreground/15" />
              </div>
            ) : option.id === "asymmetric" ? (
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-8 h-8 rounded bg-foreground/15" />
                <span className="col-span-4 h-8 rounded bg-foreground/25" />
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-4 h-8 rounded border bg-background p-1">
                  <span className="block h-3 rounded bg-foreground/15" />
                </span>
                <span className="col-span-4 h-10 rounded border bg-background p-1">
                  <span className="block h-4 rounded bg-foreground/15" />
                </span>
                <span className="col-span-4 h-7 rounded border bg-background p-1">
                  <span className="block h-2 rounded bg-foreground/15" />
                </span>
              </div>
            )}
          </div>
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
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onSwatchChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
      showValueInput={false}
    />
  );
}

function updateValue(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  updater: (current: GridColumnsData) => GridColumnsData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateLayout(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  patch: Partial<LayoutData>
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
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
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
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
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

function normalizeColumnStyleData(style: ColumnStyleData | undefined): ColumnStyleData | undefined {
  const next = Object.fromEntries(
    Object.entries(style ?? {}).filter(([, entryValue]) => {
      if (entryValue === undefined || entryValue === "") return false;
      if (entryValue === "inherit" || entryValue === "visible") return false;
      return true;
    })
  ) as ColumnStyleData;
  return Object.keys(next).length > 0 ? next : undefined;
}

function isColumnSurfaceOverrideEnabled(column: ColumnData): boolean {
  const style = column.style;
  return Boolean(
    style?.surface === "on" ||
    style?.background ||
    style?.borderColor ||
    style?.borderWidth ||
    style?.radius ||
    style?.padding
  );
}

function setColumnsCount(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  requestedCount: number
) {
  const count = clampColumnsCount(requestedCount);
  updateValue(value, onChange, (current) => {
    const source = Array.isArray(current.columns) ? current.columns : [];
    const next = source.slice(0, count);

    while (next.length < count) {
      const index = next.length;
      next.push({
        id: String(index + 1),
        label: `Column ${index + 1}`,
        desktopSpan: "6",
        tabletSpan: "6",
        mobileSpan: "12",
      });
    }

    return {
      ...current,
      columns: next,
    };
  });
}

function updateColumn(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  index: number,
  patch: Partial<ColumnData>
) {
  updateValue(value, onChange, (current) => {
    const columns = Array.isArray(current.columns) ? [...current.columns] : [];
    if (!columns[index]) return current;
    columns[index] = {
      ...columns[index],
      ...patch,
    };
    return {
      ...current,
      columns,
    };
  });
}

function updateEditableGridColumnsColumns(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  variant: string,
  context: WidgetEditorProps<GridColumnsData>["context"] | undefined,
  instanceId: string,
  rowIndex: number,
  updater: (column: ColumnData) => ColumnData
) {
  updateValue(value, onChange, (current) => {
    const normalized = normalizeValue(current);
    const slotDriftState = resolveGridColumnsSlotDriftState(current, context);
    const savedColumns = Array.isArray(normalized.columns) ? [...normalized.columns] : [];

    if (!slotDriftState.hasLiveSlotDrift) {
      const savedIndex = savedColumns.findIndex(
        (column, index) => (column.id ?? String(index + 1)) === instanceId
      );
      const column = savedColumns[savedIndex];
      if (savedIndex >= 0 && column) {
        savedColumns[savedIndex] = updater({
          ...column,
          style: column.style ? { ...column.style } : undefined,
        });
        return {
          ...current,
          columns: savedColumns,
        };
      }
    }

    const columns: ColumnData[] = resolveGridColumnsEditableColumns({
      value: current,
      variant,
      context,
    }).map((column) => ({
      ...column,
      style: column.style ? { ...column.style } : undefined,
    }));
    const column = columns[rowIndex];
    if (!column) return current;
    columns[rowIndex] = updater(column);
    return {
      ...current,
      columns,
    };
  });
}

function updateEditableGridColumnsRow(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  variant: string,
  context: WidgetEditorProps<GridColumnsData>["context"] | undefined,
  instanceId: string,
  rowIndex: number,
  patch: Partial<ColumnData>
) {
  updateEditableGridColumnsColumns(
    value,
    onChange,
    variant,
    context,
    instanceId,
    rowIndex,
    (column) => ({
      ...column,
      ...patch,
    })
  );
}

function updateEditableGridColumnsRowStyle(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  variant: string,
  context: WidgetEditorProps<GridColumnsData>["context"] | undefined,
  instanceId: string,
  rowIndex: number,
  patch: Partial<ColumnStyleData>
) {
  updateEditableGridColumnsColumns(
    value,
    onChange,
    variant,
    context,
    instanceId,
    rowIndex,
    (column) => ({
      ...column,
      style: normalizeColumnStyleData({
        ...(column.style ?? {}),
        ...patch,
      }),
    })
  );
}

function clearEditableGridColumnsRowStyleField(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  variant: string,
  context: WidgetEditorProps<GridColumnsData>["context"] | undefined,
  instanceId: string,
  rowIndex: number,
  key: keyof ColumnStyleData
) {
  updateEditableGridColumnsColumns(
    value,
    onChange,
    variant,
    context,
    instanceId,
    rowIndex,
    (column) => {
      const { [key]: _removed, ...style } = column.style ?? {};
      return {
        ...column,
        style: normalizeColumnStyleData(style),
      };
    }
  );
}

function setEditableGridColumnsRowSurfaceOverride(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  variant: string,
  context: WidgetEditorProps<GridColumnsData>["context"] | undefined,
  instanceId: string,
  rowIndex: number,
  enabled: boolean
) {
  if (!enabled) {
    updateEditableGridColumnsColumns(
      value,
      onChange,
      variant,
      context,
      instanceId,
      rowIndex,
      (column) => {
        const overflow = column.style?.overflow === "hidden" ? "hidden" : undefined;
        return {
          ...column,
          style: normalizeColumnStyleData(
            overflow
              ? {
                  overflow,
                }
              : undefined
          ),
        };
      }
    );
    return;
  }

  updateEditableGridColumnsRowStyle(value, onChange, variant, context, instanceId, rowIndex, {
    surface: "on",
  });
}

function getGridColumnsPresets(count: number): GridColumnsPreset[] {
  return gridColumnsPresets.filter((preset) => preset.count === count);
}

function applyGridColumnsPreset(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  preset: GridColumnsPreset,
  variant: string,
  context?: WidgetEditorProps<GridColumnsData>["context"]
) {
  updateValue(value, onChange, (current) => {
    const slotDriftState = resolveGridColumnsSlotDriftState(current, context);
    const columns: ColumnData[] = slotDriftState.orderedInstanceIds?.length
      ? resolveGridColumnsEditableColumns({
          value: current,
          variant,
          context,
        }).map((column) => ({
          ...column,
          style: column.style ? { ...column.style } : undefined,
        }))
      : [...(current.columns ?? [])];
    if (columns.length !== preset.columns.length) {
      return current;
    }
    return {
      ...current,
      columns: columns.map((column, index) => ({
        ...column,
        ...preset.columns[index],
      })),
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: GridColumnsData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function resolveGridColumnsSlotTargets(context?: WidgetEditorProps<GridColumnsData>["context"]) {
  return (
    context?.slotTargets?.flatMap((target) => {
      if (target.definitionId !== "column") return [];
      const resolvedInstanceId =
        target.instanceId?.trim() || parseRepeatableSlotId(target.slotId)?.instanceId;
      if (!resolvedInstanceId) return [];
      return [
        {
          ...target,
          instanceId: resolvedInstanceId,
        },
      ];
    }) ?? []
  );
}

function getResolvedSlotTargetCount(
  context: WidgetEditorProps<GridColumnsData>["context"]
): number {
  const count = resolveGridColumnsSlotTargets(context).length;
  return count > 0 ? count : gridColumnsColumnMin;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

function resolveGridColumnsSlotDriftState(
  value: GridColumnsData,
  context?: WidgetEditorProps<GridColumnsData>["context"]
): GridColumnsSlotDriftState {
  const slotTargets = resolveGridColumnsSlotTargets(context);
  const slotIdByInstanceId = new Map<string, string>();
  const orderedInstanceIds: string[] = [];

  for (const target of slotTargets) {
    const instanceId = target.instanceId?.trim();
    if (!instanceId || slotIdByInstanceId.has(instanceId)) continue;
    slotIdByInstanceId.set(instanceId, target.slotId);
    orderedInstanceIds.push(instanceId);
  }

  if (orderedInstanceIds.length === 0) {
    return {
      orderedInstanceIds: undefined,
      slotIdByInstanceId,
      missingLiveInstanceIds: [],
      phantomSavedInstanceIds: [],
      hasLiveSlotDrift: false,
    };
  }

  const columns = normalizeValue(value).columns ?? [];
  const savedInstanceIds = columns.map((column, index) => column.id?.trim() || String(index + 1));
  const savedInstanceIdSet = new Set(savedInstanceIds);
  const liveInstanceIdSet = new Set(orderedInstanceIds);
  const missingLiveInstanceIds = orderedInstanceIds.filter(
    (instanceId) => !savedInstanceIdSet.has(instanceId)
  );
  const phantomSavedInstanceIds = savedInstanceIds.filter(
    (instanceId) => !liveInstanceIdSet.has(instanceId)
  );

  return {
    orderedInstanceIds,
    slotIdByInstanceId,
    missingLiveInstanceIds,
    phantomSavedInstanceIds,
    hasLiveSlotDrift: missingLiveInstanceIds.length > 0 || phantomSavedInstanceIds.length > 0,
  };
}

function resolveGridColumnsEditableColumns({
  value,
  variant,
  context,
}: {
  value: GridColumnsData;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  const slotDriftState = resolveGridColumnsSlotDriftState(value, context);
  if (slotDriftState.orderedInstanceIds?.length) {
    return resolveGridColumnsEffectiveColumns({
      data: value,
      variant: resolveGridColumnsVariant(variant),
      orderedInstanceIds: slotDriftState.orderedInstanceIds,
    });
  }

  return normalizeValue(value).columns ?? [];
}

function resolveOrderedGridColumnsRows(
  value: GridColumnsData,
  variant: string,
  context?: WidgetEditorProps<GridColumnsData>["context"]
): OrderedGridColumnsRow[] {
  const normalized = normalizeValue(value);
  const columns = normalized.columns ?? [];
  const dataIndexById = new Map(
    columns.map((column, dataIndex) => [column.id ?? String(dataIndex + 1), dataIndex] as const)
  );
  const slotDriftState = resolveGridColumnsSlotDriftState(value, context);
  const editableColumns = resolveGridColumnsEditableColumns({
    value,
    variant,
    context,
  });

  if (slotDriftState.orderedInstanceIds?.length) {
    return editableColumns.map((column, rowIndex) => {
      const instanceId =
        slotDriftState.orderedInstanceIds?.[rowIndex] ?? column.id ?? String(rowIndex + 1);
      return {
        column,
        rowIndex,
        instanceId,
        slotId: slotDriftState.slotIdByInstanceId.get(instanceId) ?? `column:${instanceId}`,
        hasSavedMetadata: dataIndexById.has(instanceId),
      };
    });
  }

  return editableColumns.map((column, rowIndex) => {
    const instanceId = column.id ?? String(rowIndex + 1);
    return {
      column,
      rowIndex,
      instanceId,
      slotId: `column:${instanceId}`,
      hasSavedMetadata: true,
    };
  });
}

function moveGridColumnsColumn(
  value: GridColumnsData,
  variant: string,
  context: WidgetEditorProps<GridColumnsData>["context"] | undefined,
  fromIndex: number,
  toIndex: number,
  onBlockPatch?: WidgetEditorProps<GridColumnsData>["onBlockPatch"]
) {
  if (!onBlockPatch) return;
  const normalized = normalizeValue(value);
  const slotDriftState = resolveGridColumnsSlotDriftState(value, context);
  const orderedIds =
    slotDriftState.orderedInstanceIds ??
    (normalized.columns ?? []).map((column, index) => column.id ?? String(index + 1));
  const movedIds = moveItem(orderedIds, fromIndex, toIndex);
  if (movedIds === orderedIds) return;
  const liveOrderedInstanceIds = slotDriftState.orderedInstanceIds;
  const resolvedVariant = resolveGridColumnsVariant(variant);

  onBlockPatch((current) => {
    const currentData = current.data as GridColumnsData;
    const materializedData =
      liveOrderedInstanceIds && liveOrderedInstanceIds.length > 0
        ? normalizeGridColumnsData({
            ...normalizeGridColumnsData(currentData),
            columns: resolveGridColumnsEffectiveColumns({
              data: currentData,
              variant: resolvedVariant,
              orderedInstanceIds: liveOrderedInstanceIds,
            }),
          })
        : currentData;
    const next = reorderGridColumnsColumnsAndSlots({
      data: materializedData,
      slots: current.slots,
      orderedInstanceIds: movedIds,
    });
    return {
      ...current,
      data: next.data,
      slots: next.slots,
    };
  });
}

function ColumnSizingGrid({
  value,
  onChange,
  variant,
  context,
  onBlockPatch,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
  onBlockPatch?: WidgetEditorProps<GridColumnsData>["onBlockPatch"];
}) {
  const rows = resolveOrderedGridColumnsRows(value, variant, context);
  const canMoveColumns = Boolean(onBlockPatch) && rows.length > 1;
  const rowDriftMessage = resolveGridColumnsLiveRowDriftMessage(
    resolveGridColumnsSlotDriftState(value, context)
  );

  return (
    <div className="space-y-3">
      {rowDriftMessage ? <p className="text-xs text-amber-700">{rowDriftMessage}</p> : null}
      {rows.map((row, index) => (
        <div key={row.instanceId} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Column {index + 1}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">slot: {row.slotId}</Badge>
                {!row.hasSavedMetadata ? <Badge variant="outline">live slot fallback</Badge> : null}
              </div>
              {!row.hasSavedMetadata ? (
                <p className="text-xs text-amber-700">
                  Saved column settings are missing for this live slot. Editing any field will
                  materialize them.
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  moveGridColumnsColumn(value, variant, context, index, index - 1, onBlockPatch)
                }
                disabled={!canMoveColumns || index === 0}
              >
                Move up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  moveGridColumnsColumn(value, variant, context, index, index + 1, onBlockPatch)
                }
                disabled={!canMoveColumns || index === rows.length - 1}
              >
                Move down
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Label
            </p>
            <Input
              value={row.column.label ?? ""}
              onChange={(event) =>
                updateEditableGridColumnsRow(
                  value,
                  onChange,
                  variant,
                  context,
                  row.instanceId,
                  row.rowIndex,
                  {
                    label: event.target.value,
                  }
                )
              }
              placeholder={`Column ${index + 1}`}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Desktop
              </p>
              <Select
                value={row.column.desktopSpan ?? "6"}
                onValueChange={(next) =>
                  updateEditableGridColumnsRow(
                    value,
                    onChange,
                    variant,
                    context,
                    row.instanceId,
                    row.rowIndex,
                    {
                      desktopSpan: next as GridColumnsSpan,
                    }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Desktop span" />
                </SelectTrigger>
                <SelectContent>
                  {spanOptions.map((option) => (
                    <SelectItem key={`desktop-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tablet
              </p>
              <Select
                value={row.column.tabletSpan ?? "6"}
                onValueChange={(next) =>
                  updateEditableGridColumnsRow(
                    value,
                    onChange,
                    variant,
                    context,
                    row.instanceId,
                    row.rowIndex,
                    {
                      tabletSpan: next as GridColumnsSpan,
                    }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tablet span" />
                </SelectTrigger>
                <SelectContent>
                  {spanOptions.map((option) => (
                    <SelectItem key={`tablet-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mobile
              </p>
              <Select
                value={row.column.mobileSpan ?? "12"}
                onValueChange={(next) =>
                  updateEditableGridColumnsRow(
                    value,
                    onChange,
                    variant,
                    context,
                    row.instanceId,
                    row.rowIndex,
                    {
                      mobileSpan: next as GridColumnsSpan,
                    }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mobile span" />
                </SelectTrigger>
                <SelectContent>
                  {spanOptions.map((option) => (
                    <SelectItem key={`mobile-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                XL
              </p>
              <Select
                value={row.column.xlSpan ?? "auto"}
                onValueChange={(next) =>
                  updateEditableGridColumnsRow(
                    value,
                    onChange,
                    variant,
                    context,
                    row.instanceId,
                    row.rowIndex,
                    {
                      xlSpan: next === "auto" ? undefined : (next as GridColumnsSpan),
                    }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="XL span" />
                </SelectTrigger>
                <SelectContent>
                  {extendedSpanOptions.map((option) => (
                    <SelectItem key={`xl-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                2XL
              </p>
              <Select
                value={row.column.twoXlSpan ?? "auto"}
                onValueChange={(next) =>
                  updateEditableGridColumnsRow(
                    value,
                    onChange,
                    variant,
                    context,
                    row.instanceId,
                    row.rowIndex,
                    {
                      twoXlSpan: next === "auto" ? undefined : (next as GridColumnsSpan),
                    }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="2XL span" />
                </SelectTrigger>
                <SelectContent>
                  {extendedSpanOptions.map((option) => (
                    <SelectItem key={`2xl-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Hide on mobile</p>
                  <p className="text-xs text-muted-foreground">Below 768px</p>
                </div>
                <Switch
                  checked={Boolean(row.column.hideOnMobile)}
                  onCheckedChange={(checked) =>
                    updateEditableGridColumnsRow(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      {
                        hideOnMobile: checked,
                      }
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Hide on tablet</p>
                  <p className="text-xs text-muted-foreground">768px to 1023px</p>
                </div>
                <Switch
                  checked={Boolean(row.column.hideOnTablet)}
                  onCheckedChange={(checked) =>
                    updateEditableGridColumnsRow(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      {
                        hideOnTablet: checked,
                      }
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Hide on desktop</p>
                  <p className="text-xs text-muted-foreground">1024px and wider</p>
                </div>
                <Switch
                  checked={Boolean(row.column.hideOnDesktop)}
                  onCheckedChange={(checked) =>
                    updateEditableGridColumnsRow(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      {
                        hideOnDesktop: checked,
                      }
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {rows.length > 0 && rows.every((row) => Boolean(row.column.hideOnMobile)) ? (
        <p className="text-xs text-amber-700">
          All columns are hidden on mobile. At least one column should stay visible below 768px.
        </p>
      ) : null}
      {rows.length > 0 && rows.every((row) => Boolean(row.column.hideOnTablet)) ? (
        <p className="text-xs text-amber-700">
          All columns are hidden on tablet. At least one column should stay visible between 768px
          and 1023px.
        </p>
      ) : null}
      {rows.length > 0 && rows.every((row) => Boolean(row.column.hideOnDesktop)) ? (
        <p className="text-xs text-amber-700">
          All columns are hidden on desktop. At least one column should stay visible at 1024px and
          wider.
        </p>
      ) : null}
    </div>
  );
}

function ColumnBehaviorGrid({
  value,
  onChange,
  variant,
  context,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  const rows = resolveOrderedGridColumnsRows(value, variant, context);
  const rowDriftMessage = resolveGridColumnsLiveRowDriftMessage(
    resolveGridColumnsSlotDriftState(value, context)
  );

  return (
    <div className="space-y-3">
      {rowDriftMessage ? <p className="text-xs text-amber-700">{rowDriftMessage}</p> : null}
      {rows.map((row, index) => {
        const surfaceOverrideEnabled = isColumnSurfaceOverrideEnabled(row.column);
        return (
          <div key={`column-behavior-${row.instanceId}`} className="rounded-md border p-3">
            <div className="mb-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Column {index + 1}</p>
                <Badge variant="outline">slot: {row.slotId}</Badge>
                {!row.hasSavedMetadata ? <Badge variant="outline">live slot fallback</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Override surface, height, and alignment only when this column needs special
                treatment.
              </p>
              {!row.hasSavedMetadata ? (
                <p className="text-xs text-amber-700">
                  Saved column settings are missing for this live slot. Editing any field will
                  materialize them.
                </p>
              ) : null}
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Highlight this column</p>
                  <p className="text-xs text-muted-foreground">
                    Apply column-only surface tokens without changing the whole grid.
                  </p>
                </div>
                <Switch
                  checked={surfaceOverrideEnabled}
                  onCheckedChange={(checked) =>
                    setEditableGridColumnsRowSurfaceOverride(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      checked
                    )
                  }
                />
              </div>
            </div>

            {surfaceOverrideEnabled ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ColorField
                    label="Column background override"
                    value={row.column.style?.background}
                    onChange={(next) =>
                      updateEditableGridColumnsRowStyle(
                        value,
                        onChange,
                        variant,
                        context,
                        row.instanceId,
                        row.rowIndex,
                        { background: next }
                      )
                    }
                    onClear={() =>
                      clearEditableGridColumnsRowStyleField(
                        value,
                        onChange,
                        variant,
                        context,
                        row.instanceId,
                        row.rowIndex,
                        "background"
                      )
                    }
                    placeholder="var(--color-surface)"
                    pickerFallback="#f8fafc"
                  />

                  <ColorField
                    label="Column border override"
                    value={row.column.style?.borderColor}
                    onChange={(next) =>
                      updateEditableGridColumnsRowStyle(
                        value,
                        onChange,
                        variant,
                        context,
                        row.instanceId,
                        row.rowIndex,
                        { borderColor: next }
                      )
                    }
                    onClear={() =>
                      clearEditableGridColumnsRowStyleField(
                        value,
                        onChange,
                        variant,
                        context,
                        row.instanceId,
                        row.rowIndex,
                        "borderColor"
                      )
                    }
                    placeholder="var(--color-border)"
                    pickerFallback="#e2e8f0"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Border width</p>
                    <Select
                      value={row.column.style?.borderWidth ?? "inherit"}
                      onValueChange={(next) =>
                        updateEditableGridColumnsRowStyle(
                          value,
                          onChange,
                          variant,
                          context,
                          row.instanceId,
                          row.rowIndex,
                          {
                            borderWidth:
                              next === "inherit" ? undefined : (next as GridColumnsBorderWidth),
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Border width" />
                      </SelectTrigger>
                      <SelectContent>
                        {inheritedBorderWidthOptions.map((option) => (
                          <SelectItem key={`column-border-width-${option.id}`} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Corner radius</p>
                    <Select
                      value={row.column.style?.radius ?? "inherit"}
                      onValueChange={(next) =>
                        updateEditableGridColumnsRowStyle(
                          value,
                          onChange,
                          variant,
                          context,
                          row.instanceId,
                          row.rowIndex,
                          {
                            radius: next === "inherit" ? undefined : (next as GridColumnsRadius),
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Radius" />
                      </SelectTrigger>
                      <SelectContent>
                        {inheritedRadiusOptions.map((option) => (
                          <SelectItem key={`column-radius-${option.id}`} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Internal padding</p>
                    <Select
                      value={row.column.style?.padding ?? "inherit"}
                      onValueChange={(next) =>
                        updateEditableGridColumnsRowStyle(
                          value,
                          onChange,
                          variant,
                          context,
                          row.instanceId,
                          row.rowIndex,
                          {
                            padding: next === "inherit" ? undefined : (next as GridColumnsPadding),
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Padding" />
                      </SelectTrigger>
                      <SelectContent>
                        {inheritedPaddingOptions.map((option) => (
                          <SelectItem key={`column-padding-${option.id}`} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Overflow</p>
                <Select
                  value={row.column.style?.overflow ?? "visible"}
                  onValueChange={(next) =>
                    updateEditableGridColumnsRowStyle(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      { overflow: next as GridColumnsOverflow }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Overflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {overflowOptions.map((option) => (
                      <SelectItem key={`column-overflow-${option.id}`} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Minimum height</p>
                <Select
                  value={row.column.minHeight ?? "md"}
                  onValueChange={(next) =>
                    updateEditableGridColumnsRow(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      {
                        minHeight: next as GridColumnsMinHeight,
                      }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Min height" />
                  </SelectTrigger>
                  <SelectContent>
                    {minHeightOptions.map((option) => (
                      <SelectItem key={`column-min-height-${option.id}`} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Mobile min height</p>
                <Select
                  value={row.column.mobileMinHeight ?? "inherit"}
                  onValueChange={(next) =>
                    updateEditableGridColumnsRow(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      {
                        mobileMinHeight:
                          next === "inherit" ? undefined : (next as GridColumnsMinHeight),
                      }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mobile min height" />
                  </SelectTrigger>
                  <SelectContent>
                    {mobileMinHeightOptions.map((option) => (
                      <SelectItem key={`column-mobile-min-height-${option.id}`} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Vertical alignment</p>
                <Select
                  value={row.column.alignSelf ?? "inherit"}
                  onValueChange={(next) =>
                    updateEditableGridColumnsRow(
                      value,
                      onChange,
                      variant,
                      context,
                      row.instanceId,
                      row.rowIndex,
                      {
                        alignSelf: next as GridColumnsSelfAlign,
                      }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Align self" />
                  </SelectTrigger>
                  <SelectContent>
                    {selfAlignOptions.map((option) => (
                      <SelectItem key={`column-self-align-${option.id}`} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ColumnsCountControl({
  value,
  onChange,
  context,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  const normalized = normalizeValue(value);
  const count = normalized.columns?.length ?? gridColumnsColumnMin;
  const hasLiveColumnSlots = Boolean(resolveGridColumnsOrderedInstanceIds(context)?.length);
  const slotTargetCount = getResolvedSlotTargetCount(context);
  const hasSlotDrift = hasLiveColumnSlots && slotTargetCount !== count;
  const countOptions = Array.from(
    { length: gridColumnsColumnMax - gridColumnsColumnMin + 1 },
    (_, index) => String(index + gridColumnsColumnMin)
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Column count</p>
      <Select
        value={String(count)}
        disabled={hasLiveColumnSlots}
        onValueChange={(next) => setColumnsCount(value, onChange, Number(next))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select number of columns" />
        </SelectTrigger>
        <SelectContent>
          {countOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {hasLiveColumnSlots
          ? `Live slot instances are controlled in the shared Structure section. Current slot instances: ${slotTargetCount}.`
          : `Column count is editing local configuration only because no live slot structure is attached yet.`}
      </p>
      {hasSlotDrift ? (
        <p className="text-xs text-amber-700">
          Column count and slot instances are out of sync. Preview uses the slot count until the
          structure is reconciled.
        </p>
      ) : null}
    </div>
  );
}

function LayoutPresetButtons({
  value,
  onChange,
  variant,
  context,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  const columns = resolveGridColumnsEditableColumns({ value, variant, context });
  const presets = getGridColumnsPresets(columns.length);
  if (presets.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Layout presets</p>
      <p className="text-xs text-muted-foreground">
        Presets stay within the current live column order and never add or remove slots.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            className="h-auto items-start justify-start whitespace-normal text-left"
            data-grid-columns-preset={preset.id}
            onClick={() => applyGridColumnsPreset(value, onChange, preset, variant, context)}
          >
            <span className="block text-sm font-medium">{preset.label}</span>
            <span className="block text-xs text-muted-foreground">{preset.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

type GridColumnsCardizeControlsState = {
  active: boolean;
  toggleLocked: boolean;
  helperCopy?: string;
};

type GridColumnsSpanTotalRowState = {
  id: "desktop" | "tablet" | "mobile";
  label: string;
  total: number;
  status: "single-row" | "underfilled" | "wraps";
  message: string;
};

function resolveGridColumnsCardizeControlsState(
  variant: GridColumnsVariantId,
  cardizeColumns: boolean
): GridColumnsCardizeControlsState {
  if (variant === "masonry-lite") {
    return {
      active: true,
      toggleLocked: true,
      helperCopy:
        "Masonry Lite always renders cardized column wrappers, so this toggle is locked on for truthful preview behavior.",
    };
  }

  if (!cardizeColumns) {
    return {
      active: false,
      toggleLocked: false,
      helperCopy:
        "Turn on Cardized columns to edit shared wrapper background, border, radius, and padding tokens.",
    };
  }

  return {
    active: true,
    toggleLocked: false,
  };
}

function resolveGridColumnsOrderedInstanceIds(
  context?: WidgetEditorProps<GridColumnsData>["context"]
): string[] | undefined {
  const orderedInstanceIds = resolveGridColumnsSlotTargets(context).map(
    (target) => target.instanceId
  );

  return orderedInstanceIds.length > 0 ? orderedInstanceIds : undefined;
}

function resolveGridColumnsEffectiveEditorColumns({
  value,
  variant,
  context,
}: {
  value: GridColumnsData;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  return resolveGridColumnsEditableColumns({ value, variant, context });
}

function resolveGridColumnsAsymmetricSlotDriftMessage(
  slotDriftState: GridColumnsSlotDriftState
): string {
  const liveCount = slotDriftState.orderedInstanceIds?.length ?? 0;
  if (
    slotDriftState.missingLiveInstanceIds.length > 0 &&
    slotDriftState.phantomSavedInstanceIds.length > 0
  ) {
    return `Current live slot structure has ${liveCount} columns, but saved column metadata is out of sync. Reapply materializes the asymmetric desktop preset for the current live columns and removes saved columns that no longer have live slots.`;
  }
  if (slotDriftState.missingLiveInstanceIds.length > 0) {
    return `Current live slot structure has ${liveCount} columns, but saved column metadata is missing some live columns. Reapply materializes the asymmetric desktop preset for the current live columns.`;
  }
  return `Saved column metadata still includes columns outside the current ${liveCount}-column live slot structure. Reapply materializes the asymmetric desktop preset for the current live columns and removes non-live saved columns.`;
}

function resolveGridColumnsLiveRowDriftMessage(
  slotDriftState: GridColumnsSlotDriftState
): string | undefined {
  if (!slotDriftState.hasLiveSlotDrift) return undefined;
  if (
    slotDriftState.missingLiveInstanceIds.length > 0 &&
    slotDriftState.phantomSavedInstanceIds.length > 0
  ) {
    return "Editor rows follow the current live slot order. Missing saved column settings use live fallback values until you edit them, and saved columns without live slots are ignored here.";
  }
  if (slotDriftState.missingLiveInstanceIds.length > 0) {
    return "Editor rows follow the current live slot order. Missing saved column settings use live fallback values until you edit them.";
  }
  return "Editor rows follow the current live slot order. Saved columns without live slots are ignored here.";
}

function handleGridColumnsVariantSelection({
  nextVariant,
  value,
  onChange,
  onVariantChange,
  context,
}: {
  nextVariant: string;
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
  onVariantChange?: (next: string) => void;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  if (!onVariantChange) return;

  const resolvedVariant = resolveGridColumnsVariant(nextVariant);
  if (resolvedVariant === "asymmetric") {
    onChange(
      applyGridColumnsAsymmetricPreset(value, resolveGridColumnsOrderedInstanceIds(context))
    );
  }
  onVariantChange(resolvedVariant);
}

function AsymmetricVariantNotice({
  value,
  onChange,
  variant,
  context,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  if (resolveGridColumnsVariant(variant) !== "asymmetric") return null;

  const slotDriftState = resolveGridColumnsSlotDriftState(value, context);
  const state = resolveGridColumnsAsymmetricVariantState(
    resolveGridColumnsEffectiveEditorColumns({ value, variant, context })
  );
  if (state.mode === "preset") {
    if (slotDriftState.hasLiveSlotDrift) {
      return (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p>
            Asymmetric desktop preset is active for the current live columns. Saved column metadata
            is still out of sync with the live slot structure. Editing these rows will materialize
            the current live layout.
          </p>
        </div>
      );
    }

    return (
      <p className="text-xs text-muted-foreground">
        Asymmetric desktop preset is active for the current columns.
      </p>
    );
  }

  const message = slotDriftState.hasLiveSlotDrift
    ? resolveGridColumnsAsymmetricSlotDriftMessage(slotDriftState)
    : state.message;

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <p>{message}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          onChange(applyGridColumnsAsymmetricPreset(value, slotDriftState.orderedInstanceIds))
        }
      >
        Reapply asymmetric desktop preset
      </Button>
    </div>
  );
}

function resolveGridColumnsSpanTotalRowState(
  id: GridColumnsSpanTotalRowState["id"],
  label: string,
  total: number
): GridColumnsSpanTotalRowState {
  if (total === 12) {
    return {
      id,
      label,
      total,
      status: "single-row",
      message: "fills one 12-column row.",
    };
  }

  if (total < 12) {
    return {
      id,
      label,
      total,
      status: "underfilled",
      message: "leaves unused width in the row.",
    };
  }

  return {
    id,
    label,
    total,
    status: "wraps",
    message: "continues onto additional rows.",
  };
}

function GridColumnsSpanTotalsNotice({
  value,
  variant,
  context,
}: {
  value: GridColumnsData;
  variant: string;
  context?: WidgetEditorProps<GridColumnsData>["context"];
}) {
  const totals = calculateGridColumnsSpanTotals(
    resolveGridColumnsEffectiveEditorColumns({ value, variant, context })
  );
  const rows = [
    resolveGridColumnsSpanTotalRowState("desktop", "Desktop", totals.desktop),
    resolveGridColumnsSpanTotalRowState("tablet", "Tablet", totals.tablet),
    resolveGridColumnsSpanTotalRowState("mobile", "Mobile", totals.mobile),
  ] satisfies GridColumnsSpanTotalRowState[];
  const hasNonSingleRowTotals = rows.some((row) => row.status !== "single-row");

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-xs">
      <p className="font-medium text-foreground">Current span totals</p>
      {rows.map((row) => (
        <p
          key={row.id}
          className={row.status === "single-row" ? "text-muted-foreground" : "text-amber-700"}
        >
          {row.label} total: {row.total} / 12 - {row.message}
        </p>
      ))}
      {hasNonSingleRowTotals ? (
        <p className="text-amber-700">
          Grid Columns keeps saved spans as authored. Totals above 12 continue onto additional rows,
          and totals below 12 leave unused width. Runtime does not auto-balance them.
        </p>
      ) : (
        <p className="text-muted-foreground">
          All current breakpoint totals fill a single 12-column row.
        </p>
      )}
    </div>
  );
}

export function GridColumnsWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<GridColumnsData>) {
  const normalized = normalizeValue(value);
  const columns = normalized.columns ?? [];
  const wizardColumns =
    columns.length > 0
      ? columns
      : Array.from(
          { length: gridColumnsColumnMin },
          (_, index) =>
            ({
              id: String(index + 1),
              label: "",
            }) satisfies ColumnData
        );

  return (
    <div className="space-y-4">
      <EditorSection
        id="grid-columns.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Grid quick start"
        description="Choose a safe starting grid. Visual owns ongoing layout and surface editing."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Grid style</p>
          <Select
            value={resolveGridColumnsVariant(variant)}
            onValueChange={(next) =>
              handleGridColumnsVariantSelection({
                nextVariant: next,
                value,
                onChange,
                onVariantChange,
                context,
              })
            }
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

        <AsymmetricVariantNotice
          value={value}
          onChange={onChange}
          variant={variant}
          context={context}
        />

        <ColumnsCountControl value={value} onChange={onChange} context={context} />

        <LayoutPresetButtons
          value={value}
          onChange={onChange}
          variant={variant}
          context={context}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {wizardColumns.map((column, index) => (
            <div key={column.id ?? `wizard-column-${index + 1}`} className="space-y-2">
              <p className="text-sm font-medium">Column {index + 1} label</p>
              <Input
                value={column.label ?? ""}
                onChange={(event) =>
                  updateColumn(value, onChange, index, { label: event.target.value })
                }
                placeholder={`Column ${index + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Horizontal gap</p>
            <Select
              value={normalized.layout?.gapX ?? gridColumnsDefaults.layout?.gapX ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapX: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Horizontal gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`wizard-gap-x-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Vertical gap</p>
            <Select
              value={normalized.layout?.gapY ?? gridColumnsDefaults.layout?.gapY ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapY: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Vertical gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`wizard-gap-y-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

export function GridColumnsVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
  onBlockPatch,
}: WidgetEditorProps<GridColumnsData>) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? gridColumnsDefaults.style!;
  const resolvedVariant = resolveGridColumnsVariant(variant);
  const cardizeControlsState = resolveGridColumnsCardizeControlsState(
    resolvedVariant,
    Boolean(style.cardizeColumns)
  );
  const hasLiveColumnSlots = Boolean(resolveGridColumnsOrderedInstanceIds(context)?.length);

  return (
    <div className="space-y-4">
      <EditorSection
        id="grid-columns.visual.variant-layout"
        mode="visual"
        role="layout"
        title="Variant and layout structure"
        description="Choose grid behavior, alignment, and column-count guidance."
      >
        <VariantCards
          value={resolvedVariant}
          onChange={(next) =>
            handleGridColumnsVariantSelection({
              nextVariant: next,
              value,
              onChange,
              onVariantChange,
              context,
            })
          }
        />

        <AsymmetricVariantNotice
          value={value}
          onChange={onChange}
          variant={variant}
          context={context}
        />

        <ColumnsCountControl value={value} onChange={onChange} context={context} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Cross-axis alignment</p>
          <Select
            value={normalized.layout?.align ?? "start"}
            onValueChange={(next) =>
              updateLayout(value, onChange, { align: next as GridColumnsAlign })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reverse on mobile</p>
              <p className="text-xs text-muted-foreground">
                Reverse visual column order only below the tablet breakpoint.
              </p>
            </div>
            <Switch
              checked={Boolean(normalized.layout?.reverseOnMobile)}
              onCheckedChange={(checked) =>
                updateLayout(value, onChange, { reverseOnMobile: checked })
              }
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="grid-columns.visual.column-sizing"
        mode="visual"
        role="layout"
        title="Column sizing and labels"
        description="Set responsive span tokens and labels for each configured column."
      >
        <LayoutPresetButtons
          value={value}
          onChange={onChange}
          variant={variant}
          context={context}
        />
        <ColumnSizingGrid
          value={value}
          onChange={onChange}
          variant={variant}
          context={context}
          onBlockPatch={onBlockPatch}
        />
        <GridColumnsSpanTotalsNotice value={value} variant={variant} context={context} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setColumnsCount(
                value,
                onChange,
                (normalized.columns?.length ?? gridColumnsColumnMin) + 1
              )
            }
            disabled={
              hasLiveColumnSlots || (normalized.columns?.length ?? 0) >= gridColumnsColumnMax
            }
          >
            Add one column
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setColumnsCount(
                value,
                onChange,
                (normalized.columns?.length ?? gridColumnsColumnMin) - 1
              )
            }
            disabled={
              hasLiveColumnSlots || (normalized.columns?.length ?? 0) <= gridColumnsColumnMin
            }
          >
            Remove one column
          </Button>
        </div>
        {hasLiveColumnSlots ? (
          <p className="text-xs text-muted-foreground">
            When live slot instances exist, add or remove columns in the shared Structure section so
            slot content and column metadata stay aligned.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        id="grid-columns.visual.column-surface"
        mode="visual"
        role="visual"
        title="Gap and column surface"
        description="Control spacing between columns and optional cardized wrappers."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Horizontal gap</p>
            <Select
              value={normalized.layout?.gapX ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapX: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Horizontal gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`gap-x-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Vertical gap</p>
            <Select
              value={normalized.layout?.gapY ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapY: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Vertical gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`gap-y-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cardized columns</p>
              <p className="text-xs text-muted-foreground">
                Wrap each column with background, border, and radius tokens.
              </p>
            </div>
            <Switch
              checked={cardizeControlsState.active}
              disabled={cardizeControlsState.toggleLocked}
              onCheckedChange={(checked) =>
                updateStyle(value, onChange, { cardizeColumns: checked })
              }
            />
          </div>
        </div>
        {cardizeControlsState.helperCopy ? (
          <p className="text-xs text-muted-foreground">{cardizeControlsState.helperCopy}</p>
        ) : null}

        {cardizeControlsState.active ? (
          <>
            <ColorField
              label="Column background"
              value={style.columnBackground}
              onChange={(next) => updateStyle(value, onChange, { columnBackground: next })}
              onClear={() => clearStyleField(value, onChange, "columnBackground")}
              placeholder="var(--color-surface)"
              pickerFallback="#f8fafc"
            />

            <ColorField
              label="Column border color"
              value={style.columnBorderColor}
              onChange={(next) => updateStyle(value, onChange, { columnBorderColor: next })}
              onClear={() => clearStyleField(value, onChange, "columnBorderColor")}
              placeholder="var(--color-border)"
              pickerFallback="#e2e8f0"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Border width</p>
                <Select
                  value={style.columnBorderWidth ?? "1"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, {
                      columnBorderWidth: next as GridColumnsBorderWidth,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Border width" />
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

              <div className="space-y-2">
                <p className="text-sm font-medium">Corner radius</p>
                <Select
                  value={style.columnRadius ?? "xl"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, { columnRadius: next as GridColumnsRadius })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Corner radius" />
                  </SelectTrigger>
                  <SelectContent>
                    {radiusOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Internal padding</p>
                <Select
                  value={style.columnPadding ?? "4"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, { columnPadding: next as GridColumnsPadding })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Padding" />
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
            </div>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        id="grid-columns.visual.column-overrides"
        mode="visual"
        role="layout"
        title="Per-column surfaces and behavior"
        description="Highlight a single column, clamp overflow, and tune per-column height or alignment."
      >
        <ColumnBehaviorGrid value={value} onChange={onChange} variant={variant} context={context} />
      </EditorSection>

      <EditorSection
        id="grid-columns.visual.slot-guidance"
        mode="visual"
        role="summary"
        title="Slots and runtime behavior"
        description="`grid-columns` uses repeatable `column` slots (`column:1`, `column:2`, ...)."
      >
        <p className="text-xs text-muted-foreground">
          Add or remove column slots in the Slots panel above tabs. This section controls styling
          and sizing tokens used when those slot instances render.
        </p>
      </EditorSection>
    </div>
  );
}

export function GridColumnsAdvancedEditor({
  value,
  onChange,
  variant,
  context,
}: WidgetEditorProps<GridColumnsData>) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? gridColumnsDefaults.style!;
  const resolvedVariant = resolveGridColumnsVariant(variant);
  const effectiveColumns = resolveGridColumnsEditableColumns({ value, variant, context });
  const totals = calculateGridColumnsSpanTotals(effectiveColumns);
  const slotDriftState = resolveGridColumnsSlotDriftState(value, context);
  const cardizeState = resolveGridColumnsCardizeControlsState(
    resolvedVariant,
    Boolean(style.cardizeColumns)
  );

  return (
    <div className="space-y-4">
      <EditorSection
        id="grid-columns.advanced.resolved-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Technical layout tokens"
        description="Visual owns grid editing. Advanced summarizes spans, slot drift, and cardized state."
      >
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.variant"
          label="Variant"
          path="variant"
          value={resolvedVariant}
        />
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.layout"
          label="Layout"
          path="layout"
          value={`Align ${normalized.layout?.align ?? "start"}, gap X ${normalized.layout?.gapX ?? "6"}, gap Y ${normalized.layout?.gapY ?? "6"}, mobile order ${normalized.layout?.reverseOnMobile ? "reversed" : "normal"}.`}
        />
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.spans"
          label="Span totals"
          path="columns"
          value={`Desktop ${totals.desktop}/12, tablet ${totals.tablet}/12, mobile ${totals.mobile}/12 across ${effectiveColumns.length} columns.`}
        />
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.cardize"
          label="Cardized columns"
          path="style"
          value={`${cardizeState.active ? "On" : "Off"}${cardizeState.helperCopy ? ` - ${cardizeState.helperCopy}` : ""}`}
        />
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.slot-drift"
          label="Slot drift"
          value={
            slotDriftState.hasLiveSlotDrift
              ? `${slotDriftState.missingLiveInstanceIds.length} live slots missing metadata, ${slotDriftState.phantomSavedInstanceIds.length} saved metadata rows without live slots.`
              : "Saved column metadata matches the live slot order."
          }
        />
        <div hidden className="hidden" aria-hidden="true">
          <div>
            <p>Align</p>
            <Select
              value={normalized.layout?.align ?? "start"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { align: next as GridColumnsAlign })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Align" />
              </SelectTrigger>
              <SelectContent>
                {alignOptions.map((option) => (
                  <SelectItem key={`advanced-align-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p>Gap X</p>
            <Select
              value={normalized.layout?.gapX ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapX: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap X" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`advanced-gap-x-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p>Gap Y</p>
            <Select
              value={normalized.layout?.gapY ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapY: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap Y" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`advanced-gap-y-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p>Cardized columns</p>
            <Switch
              checked={cardizeState.active}
              disabled={cardizeState.toggleLocked}
              onCheckedChange={(checked) =>
                updateStyle(value, onChange, { cardizeColumns: checked })
              }
            />
          </div>
          <div>
            <p>Border width</p>
            <Select
              value={style.columnBorderWidth ?? "1"}
              disabled={!cardizeState.active}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  columnBorderWidth: next as GridColumnsBorderWidth,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={`advanced-border-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p>Column padding</p>
            <Select
              value={style.columnPadding ?? "4"}
              disabled={!cardizeState.active}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columnPadding: next as GridColumnsPadding })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Column padding" />
              </SelectTrigger>
              <SelectContent>
                {paddingOptions.map((option) => (
                  <SelectItem key={`advanced-padding-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ColumnBehaviorGrid
            value={value}
            onChange={onChange}
            variant={variant}
            context={context}
          />
        </div>
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.normalized-payload"
          label="Normalized payload"
          value={<DiagnosticsSnapshot value={normalized} />}
        />
      </EditorSection>
      <EditorSection
        id="grid-columns.advanced.column-overrides"
        mode="advanced"
        role="diagnostics"
        title="Per-column override tokens"
        description="Visual owns column override editing. Advanced keeps the resolved override state inspectable."
      >
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.column-overrides-summary"
          label="Column overrides"
          path="columns[].style"
          value={`${effectiveColumns.filter((column) => isColumnSurfaceOverrideEnabled(column)).length} of ${effectiveColumns.length} columns use per-column surface overrides.`}
        />
        <div hidden className="hidden" aria-hidden="true">
          <ColumnBehaviorGrid
            value={value}
            onChange={onChange}
            variant={variant}
            context={context}
          />
        </div>
      </EditorSection>
      <EditorSection
        id="grid-columns.advanced.payload"
        mode="advanced"
        role="diagnostics"
        title="Raw payload snapshot"
        description="Normalized read-only payload for debugging migrations and saved data."
      >
        <ReadonlyWidgetSummaryRow
          id="grid-columns.advanced.raw-payload"
          label="Normalized payload"
          value={<DiagnosticsSnapshot value={normalized} />}
        />
      </EditorSection>
    </div>
  );
}

import type { ComponentType, CSSProperties } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import { parseRepeatableSlotId, resolveWidgetSlotTargets } from "../slots";
import type { DeviceTarget, WidgetBlock, WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export const gridColumnsSpanTokens = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;
export const gridColumnsGapTokens = ["none", "2", "3", "4", "6", "8"] as const;
export const gridColumnsBorderWidthTokens = ["0", "1", "2", "3"] as const;
export const gridColumnsRadiusTokens = ["none", "lg", "xl", "2xl"] as const;
export const gridColumnsPaddingTokens = ["none", "2", "3", "4", "5", "6"] as const;

export type GridColumnsVariantId = "equal" | "asymmetric" | "masonry-lite";
export type GridColumnsSpan = (typeof gridColumnsSpanTokens)[number];
export type GridColumnsGap = (typeof gridColumnsGapTokens)[number];
export type GridColumnsBorderWidth = (typeof gridColumnsBorderWidthTokens)[number];
export type GridColumnsRadius = (typeof gridColumnsRadiusTokens)[number];
export type GridColumnsPadding = (typeof gridColumnsPaddingTokens)[number];
export type GridColumnsAlign = "start" | "center" | "end" | "stretch";

export type GridColumnsColumn = {
  id?: string;
  label?: string;
  desktopSpan?: GridColumnsSpan;
  tabletSpan?: GridColumnsSpan;
  mobileSpan?: GridColumnsSpan;
};

export type GridColumnsData = {
  columns?: GridColumnsColumn[];
  layout?: {
    gapX?: GridColumnsGap;
    gapY?: GridColumnsGap;
    align?: GridColumnsAlign;
  };
  style?: {
    cardizeColumns?: boolean;
    columnBackground?: string;
    columnBorderColor?: string;
    columnBorderWidth?: GridColumnsBorderWidth;
    columnRadius?: GridColumnsRadius;
    columnPadding?: GridColumnsPadding;
  };
};

export const gridColumnsColumnMin = 2;
export const gridColumnsColumnMax = 6;

export const gridColumnsSlot = {
  id: "column",
  label: "Column",
  kind: "repeatable" as const,
  minItems: gridColumnsColumnMin,
  maxItems: gridColumnsColumnMax,
};

export const gridColumnsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    columns: {
      type: "array",
      minItems: gridColumnsColumnMin,
      maxItems: gridColumnsColumnMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          desktopSpan: { enum: [...gridColumnsSpanTokens] },
          tabletSpan: { enum: [...gridColumnsSpanTokens] },
          mobileSpan: { enum: [...gridColumnsSpanTokens] },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        gapX: { enum: [...gridColumnsGapTokens] },
        gapY: { enum: [...gridColumnsGapTokens] },
        align: { enum: ["start", "center", "end", "stretch"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        cardizeColumns: { type: "boolean" },
        columnBackground: { type: "string" },
        columnBorderColor: { type: "string" },
        columnBorderWidth: { enum: [...gridColumnsBorderWidthTokens] },
        columnRadius: { enum: [...gridColumnsRadiusTokens] },
        columnPadding: { enum: [...gridColumnsPaddingTokens] },
      },
    },
  },
};

export const gridColumnsDefaults: GridColumnsData = {
  columns: [
    { id: "1", label: "Column 1", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
    { id: "2", label: "Column 2", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
  ],
  layout: {
    gapX: "6",
    gapY: "6",
    align: "start",
  },
  style: {
    cardizeColumns: false,
    columnBackground: "var(--color-surface)",
    columnBorderColor: "var(--color-border)",
    columnBorderWidth: "1",
    columnRadius: "xl",
    columnPadding: "4",
  },
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const spanClassMap: Record<GridColumnsSpan, string> = {
  "1": "col-span-1",
  "2": "col-span-2",
  "3": "col-span-3",
  "4": "col-span-4",
  "5": "col-span-5",
  "6": "col-span-6",
  "7": "col-span-7",
  "8": "col-span-8",
  "9": "col-span-9",
  "10": "col-span-10",
  "11": "col-span-11",
  "12": "col-span-12",
};

const tabletSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "md:col-span-1",
  "2": "md:col-span-2",
  "3": "md:col-span-3",
  "4": "md:col-span-4",
  "5": "md:col-span-5",
  "6": "md:col-span-6",
  "7": "md:col-span-7",
  "8": "md:col-span-8",
  "9": "md:col-span-9",
  "10": "md:col-span-10",
  "11": "md:col-span-11",
  "12": "md:col-span-12",
};

const desktopSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "lg:col-span-1",
  "2": "lg:col-span-2",
  "3": "lg:col-span-3",
  "4": "lg:col-span-4",
  "5": "lg:col-span-5",
  "6": "lg:col-span-6",
  "7": "lg:col-span-7",
  "8": "lg:col-span-8",
  "9": "lg:col-span-9",
  "10": "lg:col-span-10",
  "11": "lg:col-span-11",
  "12": "lg:col-span-12",
};

const gapXClassMap: Record<GridColumnsGap, string> = {
  none: "gap-x-0",
  "2": "gap-x-2",
  "3": "gap-x-3",
  "4": "gap-x-4",
  "6": "gap-x-6",
  "8": "gap-x-8",
};

const gapYClassMap: Record<GridColumnsGap, string> = {
  none: "gap-y-0",
  "2": "gap-y-2",
  "3": "gap-y-3",
  "4": "gap-y-4",
  "6": "gap-y-6",
  "8": "gap-y-8",
};

const alignClassMap: Record<GridColumnsAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const borderWidthValueMap: Record<GridColumnsBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

const radiusClassMap: Record<GridColumnsRadius, string> = {
  none: "",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const paddingClassMap: Record<GridColumnsPadding, string> = {
  none: "p-0",
  "2": "p-2",
  "3": "p-3",
  "4": "p-4",
  "5": "p-5",
  "6": "p-6",
};

const resolveGapToken = (value: string | undefined, fallback: GridColumnsGap): GridColumnsGap =>
  gridColumnsGapTokens.includes(value as GridColumnsGap) ? (value as GridColumnsGap) : fallback;

const resolveAlignToken = (value: string | undefined): GridColumnsAlign => {
  if (value === "center" || value === "end" || value === "stretch") return value;
  return "start";
};

const resolveBorderWidthToken = (value: string | undefined): GridColumnsBorderWidth => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const resolveRadiusToken = (value: string | undefined): GridColumnsRadius => {
  if (value === "none" || value === "lg" || value === "2xl") return value;
  return "xl";
};

const resolvePaddingToken = (value: string | undefined): GridColumnsPadding => {
  if (value === "none" || value === "2" || value === "3" || value === "5" || value === "6")
    return value;
  return "4";
};

const resolveSpanToken = (value: string | undefined, fallback: GridColumnsSpan): GridColumnsSpan =>
  gridColumnsSpanTokens.includes(value as GridColumnsSpan) ? (value as GridColumnsSpan) : fallback;

const clampColumnsCount = (value: number) => {
  if (!Number.isFinite(value)) return gridColumnsColumnMin;
  return Math.max(gridColumnsColumnMin, Math.min(gridColumnsColumnMax, Math.floor(value)));
};

const resolveColumnId = (value: string | undefined, index: number, used: Set<string>) => {
  const base = value?.trim() || String(index + 1);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let next = index + 1;
  while (used.has(String(next))) {
    next += 1;
  }
  const resolved = String(next);
  used.add(resolved);
  return resolved;
};

const fallbackSpanForVariant = (
  variant: GridColumnsVariantId,
  breakpoint: "desktop" | "tablet" | "mobile",
  index: number,
  columnsCount: number
): GridColumnsSpan => {
  if (breakpoint === "mobile") return "12";

  const count = Math.max(1, columnsCount);

  if (variant === "asymmetric") {
    if (breakpoint === "tablet") {
      if (count >= 3) return "6";
      return index === 0 ? "7" : "5";
    }
    if (count === 1) return "12";
    if (count === 2) return index === 0 ? "8" : "4";
    if (count === 3) return index === 0 ? "6" : "3";
    return index === 0 ? "6" : "3";
  }

  if (variant === "masonry-lite") {
    if (breakpoint === "tablet") return count >= 3 ? "6" : "6";
    if (count <= 1) return "12";
    if (count === 2) return "6";
    if (count === 3) return "4";
    if (count === 4) return "3";
    return "2";
  }

  if (breakpoint === "tablet" && count >= 3) return "6";
  if (count <= 1) return "12";
  if (count === 2) return "6";
  if (count === 3) return "4";
  if (count === 4) return "3";
  return "2";
};

export function resolveGridColumnsVariant(variant: string): GridColumnsVariantId {
  if (variant === "asymmetric" || variant === "masonry-lite") return variant;
  return "equal";
}

export function normalizeGridColumnsData(data: GridColumnsData): GridColumnsData {
  const source = Array.isArray(data.columns) ? data.columns : [];
  const targetCount = clampColumnsCount(
    source.length > 0 ? source.length : (gridColumnsDefaults.columns?.length ?? 2)
  );
  const normalized: GridColumnsColumn[] = [];
  const usedIds = new Set<string>();
  const hasStyleObject = data.style !== undefined;

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    const id = resolveColumnId(base.id, index, usedIds);
    const label = base.label?.trim() || `Column ${index + 1}`;
    normalized.push({
      id,
      label,
      desktopSpan: resolveSpanToken(base.desktopSpan, "6"),
      tabletSpan: resolveSpanToken(base.tabletSpan, "6"),
      mobileSpan: resolveSpanToken(base.mobileSpan, "12"),
    });
  }

  return {
    columns: normalized,
    layout: {
      gapX: resolveGapToken(data.layout?.gapX, "6"),
      gapY: resolveGapToken(data.layout?.gapY, "6"),
      align: resolveAlignToken(data.layout?.align),
    },
    style: {
      cardizeColumns:
        typeof data.style?.cardizeColumns === "boolean" ? data.style.cardizeColumns : false,
      columnBackground: hasStyleObject
        ? resolveClearableStyleValue(data.style?.columnBackground)
        : "var(--color-surface)",
      columnBorderColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.columnBorderColor)
        : "var(--color-border)",
      columnBorderWidth: resolveBorderWidthToken(data.style?.columnBorderWidth),
      columnRadius: resolveRadiusToken(data.style?.columnRadius),
      columnPadding: resolvePaddingToken(data.style?.columnPadding),
    },
  };
}

type ResolvedGridColumn = {
  slotId: string;
  instanceId: string;
  label: string;
  desktopSpan: GridColumnsSpan;
  tabletSpan: GridColumnsSpan;
  mobileSpan: GridColumnsSpan;
  blocks: WidgetBlock[];
};

const resolveGridColumnsForSlots = ({
  data,
  variant,
  slotMap,
}: {
  data: GridColumnsData;
  variant: GridColumnsVariantId;
  slotMap: Record<string, WidgetBlock[]>;
}): ResolvedGridColumn[] => {
  const normalized = normalizeGridColumnsData(data);
  const columns = Array.isArray(normalized.columns) ? normalized.columns : [];
  const byId = new Map(columns.map((column) => [column.id ?? "", column]));

  const slotTargets = resolveWidgetSlotTargets([gridColumnsSlot], slotMap).filter(
    (target) => target.definitionId === gridColumnsSlot.id
  );

  return slotTargets.map((target, index) => {
    const parsed = parseRepeatableSlotId(target.slotId);
    const instanceId = parsed?.instanceId ?? String(index + 1);
    const source = byId.get(instanceId) ?? columns[index];
    const columnsCount = slotTargets.length;
    return {
      slotId: target.slotId,
      instanceId,
      label: source?.label?.trim() || `Column ${index + 1}`,
      desktopSpan: resolveSpanToken(
        source?.desktopSpan,
        fallbackSpanForVariant(variant, "desktop", index, columnsCount)
      ),
      tabletSpan: resolveSpanToken(
        source?.tabletSpan,
        fallbackSpanForVariant(variant, "tablet", index, columnsCount)
      ),
      mobileSpan: resolveSpanToken(
        source?.mobileSpan,
        fallbackSpanForVariant(variant, "mobile", index, columnsCount)
      ),
      blocks: Array.isArray(slotMap[target.slotId]) ? slotMap[target.slotId]! : [],
    };
  });
};

export function GridColumnsBlock({
  data,
  variant,
  slots,
  previewDevice,
}: {
  data: GridColumnsData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
}) {
  const resolvedVariant = resolveGridColumnsVariant(variant);
  const normalized = normalizeGridColumnsData(data);
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const columns = resolveGridColumnsForSlots({
    data: normalized,
    variant: resolvedVariant,
    slotMap,
  });
  const layout = normalized.layout ?? gridColumnsDefaults.layout!;
  const style = normalized.style ?? gridColumnsDefaults.style!;
  const cardized = style.cardizeColumns || resolvedVariant === "masonry-lite";

  const columnStyle: CSSProperties | undefined = cardized
    ? compactStyle({
        backgroundColor: resolveClearableStyleValue(style.columnBackground),
        borderColor: resolveClearableStyleValue(style.columnBorderColor),
        borderStyle: "solid",
        borderWidth: borderWidthValueMap[style.columnBorderWidth ?? "1"] ?? "1px",
      })
    : undefined;

  return (
    <div
      className="mx-auto w-full"
      data-grid-columns-variant={resolvedVariant}
      data-grid-columns-count={String(columns.length)}
      data-grid-columns-align={layout.align ?? "start"}
      data-grid-columns-gap-x={layout.gapX ?? "6"}
      data-grid-columns-gap-y={layout.gapY ?? "6"}
    >
      <div
        className={joinClasses(
          "grid grid-cols-12",
          gapXClassMap[layout.gapX ?? "6"] ?? "gap-x-6",
          gapYClassMap[layout.gapY ?? "6"] ?? "gap-y-6",
          alignClassMap[layout.align ?? "start"] ?? "items-start"
        )}
      >
        {columns.map((column) => (
          <div
            key={column.slotId}
            className={joinClasses(
              "min-w-0",
              spanClassMap[column.mobileSpan],
              tabletSpanClassMap[column.tabletSpan],
              desktopSpanClassMap[column.desktopSpan]
            )}
            data-grid-column={column.slotId}
            data-grid-column-instance={column.instanceId}
          >
            <div
              className={joinClasses(
                "h-full min-h-[6rem]",
                cardized ? "border" : "",
                cardized ? (paddingClassMap[style.columnPadding ?? "4"] ?? "p-4") : "",
                cardized ? (radiusClassMap[style.columnRadius ?? "xl"] ?? "rounded-xl") : ""
              )}
              style={columnStyle}
            >
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text)]/65">
                {column.label}
              </div>
              {column.blocks.length > 0 ? (
                <div className="space-y-4">
                  {column.blocks.map((block) => (
                    <WidgetRenderer key={block.id} block={block} previewDevice={previewDevice} />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[var(--color-border)]/70 bg-[var(--color-bg)]/50 px-3 py-2 text-xs text-[var(--color-text)]/70">
                  Empty column.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function createGridColumnsWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<GridColumnsData>>;
  visual: ComponentType<WidgetEditorProps<GridColumnsData>>;
  advanced: ComponentType<WidgetEditorProps<GridColumnsData>>;
}): WidgetDefinition<GridColumnsData> {
  return {
    type: "grid-columns",
    title: "Grid Columns",
    description: "Responsive multi-column layout with repeatable column slots.",
    category: "layout",
    slots: [gridColumnsSlot],
    variants: [
      {
        id: "equal",
        label: "Equal",
        description: "Balanced columns with equal visual weight.",
      },
      {
        id: "asymmetric",
        label: "Asymmetric",
        description: "First column is emphasized with wider desktop span.",
      },
      {
        id: "masonry-lite",
        label: "Masonry Lite",
        description: "Cardized columns for denser mixed-height compositions.",
      },
    ],
    schema: gridColumnsSchema,
    defaults: gridColumnsDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: GridColumnsBlock,
  };
}

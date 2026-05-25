import type { ComponentType, CSSProperties, ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import {
  buildRepeatableSlotId,
  getRepeatableSlotIds,
  parseRepeatableSlotId,
  reorderRepeatableSlotMap,
  resolveWidgetSlotTargets,
} from "../slots";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

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
export const gridColumnsGapTokens = [
  "none",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "10",
  "12",
] as const;
export const gridColumnsBorderWidthTokens = ["0", "1", "2", "3"] as const;
export const gridColumnsRadiusTokens = ["none", "lg", "xl", "2xl"] as const;
export const gridColumnsPaddingTokens = ["none", "2", "3", "4", "5", "6"] as const;
export const gridColumnsMinHeightTokens = ["none", "sm", "md", "lg", "xl"] as const;
export const gridColumnsOverflowTokens = ["visible", "hidden"] as const;
export const gridColumnsSelfAlignTokens = ["inherit", "start", "center", "end", "stretch"] as const;

const gridColumnsColorValueSchemaPattern =
  "^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|var\\(--color-[a-z0-9-]+\\))$";
const gridColumnsColorValuePattern = new RegExp(gridColumnsColorValueSchemaPattern);

export type GridColumnsVariantId = "equal" | "asymmetric" | "masonry-lite";
export type GridColumnsSpan = (typeof gridColumnsSpanTokens)[number];
export type GridColumnsGap = (typeof gridColumnsGapTokens)[number];
export type GridColumnsBorderWidth = (typeof gridColumnsBorderWidthTokens)[number];
export type GridColumnsRadius = (typeof gridColumnsRadiusTokens)[number];
export type GridColumnsPadding = (typeof gridColumnsPaddingTokens)[number];
export type GridColumnsMinHeight = (typeof gridColumnsMinHeightTokens)[number];
export type GridColumnsOverflow = (typeof gridColumnsOverflowTokens)[number];
export type GridColumnsSelfAlign = (typeof gridColumnsSelfAlignTokens)[number];
export type GridColumnsAlign = "start" | "center" | "end" | "stretch";
export type GridColumnsColorValue = string;
export type GridColumnsColumnStyle = {
  surface?: "inherit" | "on";
  background?: GridColumnsColorValue;
  borderColor?: GridColumnsColorValue;
  borderWidth?: GridColumnsBorderWidth;
  radius?: GridColumnsRadius;
  padding?: GridColumnsPadding;
  overflow?: GridColumnsOverflow;
};

export type GridColumnsColumn = {
  id?: string;
  label?: string;
  desktopSpan?: GridColumnsSpan;
  tabletSpan?: GridColumnsSpan;
  mobileSpan?: GridColumnsSpan;
  xlSpan?: GridColumnsSpan;
  twoXlSpan?: GridColumnsSpan;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  minHeight?: GridColumnsMinHeight;
  mobileMinHeight?: GridColumnsMinHeight;
  alignSelf?: GridColumnsSelfAlign;
  style?: GridColumnsColumnStyle;
};

export type GridColumnsData = {
  columns?: GridColumnsColumn[];
  layout?: {
    gapX?: GridColumnsGap;
    gapY?: GridColumnsGap;
    align?: GridColumnsAlign;
    reverseOnMobile?: boolean;
  };
  style?: {
    cardizeColumns?: boolean;
    columnBackground?: GridColumnsColorValue;
    columnBorderColor?: GridColumnsColorValue;
    columnBorderWidth?: GridColumnsBorderWidth;
    columnRadius?: GridColumnsRadius;
    columnPadding?: GridColumnsPadding;
  };
};

export const gridColumnsEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "grid-columns.wizard.quick-start",
      title: "Grid quick start",
      role: "setup",
      writablePaths: ["variant"],
      allowedDuplicateWritablePaths: [
        {
          path: "variant",
          reason:
            "Wizard seeds the one-time Grid Columns starter variant; Visual remains the daily variant owner after setup.",
          expiresWithTask: "TASK-336",
        },
      ],
    },
    {
      mode: "visual",
      id: "grid-columns.visual.variant-layout",
      title: "Variant and layout structure",
      role: "layout",
      writablePaths: ["variant", "layout.align", "layout.reverseOnMobile"],
      allowedDuplicateWritablePaths: [
        {
          path: "variant",
          reason:
            "Wizard seeds the one-time Grid Columns starter variant; Visual remains the daily variant owner after setup.",
          expiresWithTask: "TASK-336",
        },
      ],
    },
    {
      mode: "visual",
      id: "grid-columns.visual.column-sizing",
      title: "Column sizing and labels",
      role: "layout",
      writablePaths: [
        "columns",
        "columns.label",
        "columns.desktopSpan",
        "columns.tabletSpan",
        "columns.mobileSpan",
        "columns.xlSpan",
        "columns.twoXlSpan",
        "columns.hideOnMobile",
        "columns.hideOnTablet",
        "columns.hideOnDesktop",
      ],
    },
    {
      mode: "visual",
      id: "grid-columns.visual.column-surface",
      title: "Gap and column surface",
      role: "visual",
      writablePaths: [
        "layout.gapX",
        "layout.gapY",
        "style.cardizeColumns",
        "style.columnBackground",
        "style.columnBorderColor",
        "style.columnBorderWidth",
        "style.columnRadius",
        "style.columnPadding",
      ],
    },
    {
      mode: "visual",
      id: "grid-columns.visual.column-overrides",
      title: "Per-column surfaces and behavior",
      role: "layout",
      writablePaths: [
        "columns.style",
        "columns.style.surface",
        "columns.style.background",
        "columns.style.borderColor",
        "columns.style.borderWidth",
        "columns.style.radius",
        "columns.style.padding",
        "columns.style.overflow",
        "columns.minHeight",
        "columns.mobileMinHeight",
        "columns.alignSelf",
      ],
    },
    {
      mode: "visual",
      id: "grid-columns.visual.slot-guidance",
      title: "Content areas and rendering",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["columns", "slots.column"],
    },
    {
      mode: "advanced",
      id: "grid-columns.advanced.resolved-diagnostics",
      title: "Layout summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "columns", "layout", "style"],
    },
    {
      mode: "advanced",
      id: "grid-columns.advanced.column-overrides",
      title: "Column override summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["columns.style", "columns.minHeight", "columns.alignSelf"],
    },
    {
      mode: "advanced",
      id: "grid-columns.advanced.slot-support",
      title: "Content area diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["slots.column"],
    },
  ],
};

export type GridColumnsSpanTotals = {
  desktop: number;
  tablet: number;
  mobile: number;
};

export type GridColumnsAsymmetricVariantState =
  | { mode: "preset" }
  | { mode: "custom"; message: string }
  | { mode: "equal"; message: string };

export type GridColumnsOverflowDecision = "no-runtime-guard";

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
          xlSpan: { enum: [...gridColumnsSpanTokens] },
          twoXlSpan: { enum: [...gridColumnsSpanTokens] },
          hideOnMobile: { type: "boolean" },
          hideOnTablet: { type: "boolean" },
          hideOnDesktop: { type: "boolean" },
          minHeight: { enum: [...gridColumnsMinHeightTokens] },
          mobileMinHeight: { enum: [...gridColumnsMinHeightTokens] },
          alignSelf: { enum: [...gridColumnsSelfAlignTokens] },
          style: {
            type: "object",
            additionalProperties: false,
            properties: {
              surface: { enum: ["inherit", "on"] },
              background: {
                type: "string",
                pattern: gridColumnsColorValueSchemaPattern,
              },
              borderColor: {
                type: "string",
                pattern: gridColumnsColorValueSchemaPattern,
              },
              borderWidth: { enum: [...gridColumnsBorderWidthTokens] },
              radius: { enum: [...gridColumnsRadiusTokens] },
              padding: { enum: [...gridColumnsPaddingTokens] },
              overflow: { enum: [...gridColumnsOverflowTokens] },
            },
          },
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
        reverseOnMobile: { type: "boolean" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        cardizeColumns: { type: "boolean" },
        columnBackground: { type: "string", pattern: gridColumnsColorValueSchemaPattern },
        columnBorderColor: { type: "string", pattern: gridColumnsColorValueSchemaPattern },
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
    reverseOnMobile: false,
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

export const gridColumnsOverflowDecision: GridColumnsOverflowDecision = "no-runtime-guard";

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

const xlSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "xl:col-span-1",
  "2": "xl:col-span-2",
  "3": "xl:col-span-3",
  "4": "xl:col-span-4",
  "5": "xl:col-span-5",
  "6": "xl:col-span-6",
  "7": "xl:col-span-7",
  "8": "xl:col-span-8",
  "9": "xl:col-span-9",
  "10": "xl:col-span-10",
  "11": "xl:col-span-11",
  "12": "xl:col-span-12",
};

const twoXlSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "2xl:col-span-1",
  "2": "2xl:col-span-2",
  "3": "2xl:col-span-3",
  "4": "2xl:col-span-4",
  "5": "2xl:col-span-5",
  "6": "2xl:col-span-6",
  "7": "2xl:col-span-7",
  "8": "2xl:col-span-8",
  "9": "2xl:col-span-9",
  "10": "2xl:col-span-10",
  "11": "2xl:col-span-11",
  "12": "2xl:col-span-12",
};

const gapXClassMap: Record<GridColumnsGap, string> = {
  none: "gap-x-0",
  "1": "gap-x-1",
  "2": "gap-x-2",
  "3": "gap-x-3",
  "4": "gap-x-4",
  "5": "gap-x-5",
  "6": "gap-x-6",
  "7": "gap-x-7",
  "8": "gap-x-8",
  "10": "gap-x-10",
  "12": "gap-x-12",
};

const gapYClassMap: Record<GridColumnsGap, string> = {
  none: "gap-y-0",
  "1": "gap-y-1",
  "2": "gap-y-2",
  "3": "gap-y-3",
  "4": "gap-y-4",
  "5": "gap-y-5",
  "6": "gap-y-6",
  "7": "gap-y-7",
  "8": "gap-y-8",
  "10": "gap-y-10",
  "12": "gap-y-12",
};

const alignClassMap: Record<GridColumnsAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const mobileReverseOrderClassMap: Record<number, string> = {
  1: "order-1 md:order-none",
  2: "order-2 md:order-none",
  3: "order-3 md:order-none",
  4: "order-4 md:order-none",
  5: "order-5 md:order-none",
  6: "order-6 md:order-none",
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

const minHeightClassMap: Record<GridColumnsMinHeight, string> = {
  none: "min-h-0",
  sm: "min-h-[4rem]",
  md: "min-h-[6rem]",
  lg: "min-h-[8rem]",
  xl: "min-h-[10rem]",
};

const tabletMinHeightClassMap: Record<GridColumnsMinHeight, string> = {
  none: "md:min-h-0",
  sm: "md:min-h-[4rem]",
  md: "md:min-h-[6rem]",
  lg: "md:min-h-[8rem]",
  xl: "md:min-h-[10rem]",
};

const selfAlignClassMap: Record<Exclude<GridColumnsSelfAlign, "inherit">, string> = {
  start: "self-start",
  center: "self-center",
  end: "self-end",
  stretch: "self-stretch",
};

const resolveGapToken = (value: string | undefined, fallback: GridColumnsGap): GridColumnsGap =>
  gridColumnsGapTokens.includes(value as GridColumnsGap) ? (value as GridColumnsGap) : fallback;

const resolveAlignToken = (value: string | undefined): GridColumnsAlign => {
  if (value === "center" || value === "end" || value === "stretch") return value;
  return "start";
};

const normalizeColumnVisibility = (
  column: Pick<GridColumnsColumn, "hideOnMobile" | "hideOnTablet" | "hideOnDesktop">
) => {
  const hideOnMobile = typeof column.hideOnMobile === "boolean" ? column.hideOnMobile : false;
  const hideOnTablet = typeof column.hideOnTablet === "boolean" ? column.hideOnTablet : false;
  const hideOnDesktop = typeof column.hideOnDesktop === "boolean" ? column.hideOnDesktop : false;

  if (hideOnMobile && hideOnTablet && hideOnDesktop) {
    return {
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
    };
  }

  return {
    hideOnMobile,
    hideOnTablet,
    hideOnDesktop,
  };
};

const resolveColumnVisibilityClasses = (
  column: Pick<ResolvedGridColumn, "hideOnMobile" | "hideOnTablet" | "hideOnDesktop">
) => {
  if (column.hideOnMobile && column.hideOnTablet) return "hidden lg:block";
  if (column.hideOnMobile && column.hideOnDesktop) return "hidden md:block lg:hidden";
  if (column.hideOnTablet && column.hideOnDesktop) return "md:hidden";
  if (column.hideOnMobile) return "hidden md:block";
  if (column.hideOnTablet) return "md:hidden lg:block";
  if (column.hideOnDesktop) return "lg:hidden";
  return undefined;
};

const resolveBorderWidthToken = (value: string | undefined): GridColumnsBorderWidth => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const resolveOptionalBorderWidthToken = (
  value: string | undefined
): GridColumnsBorderWidth | undefined =>
  value === "0" || value === "1" || value === "2" || value === "3" ? value : undefined;

const resolveRadiusToken = (value: string | undefined): GridColumnsRadius => {
  if (value === "none" || value === "lg" || value === "2xl") return value;
  return "xl";
};

const resolveOptionalRadiusToken = (value: string | undefined): GridColumnsRadius | undefined =>
  value === "none" || value === "lg" || value === "xl" || value === "2xl" ? value : undefined;

const resolvePaddingToken = (value: string | undefined): GridColumnsPadding => {
  if (value === "none" || value === "2" || value === "3" || value === "5" || value === "6")
    return value;
  return "4";
};

const resolveOptionalPaddingToken = (value: string | undefined): GridColumnsPadding | undefined =>
  value === "none" ||
  value === "2" ||
  value === "3" ||
  value === "4" ||
  value === "5" ||
  value === "6"
    ? value
    : undefined;

const resolveSpanToken = (value: string | undefined, fallback: GridColumnsSpan): GridColumnsSpan =>
  gridColumnsSpanTokens.includes(value as GridColumnsSpan) ? (value as GridColumnsSpan) : fallback;

const resolveOptionalMinHeightToken = (
  value: string | undefined
): GridColumnsMinHeight | undefined =>
  gridColumnsMinHeightTokens.includes(value as GridColumnsMinHeight)
    ? (value as GridColumnsMinHeight)
    : undefined;

const resolveOptionalOverflowToken = (
  value: string | undefined
): GridColumnsOverflow | undefined =>
  value === "visible" || value === "hidden" ? value : undefined;

const resolveOptionalSelfAlignToken = (
  value: string | undefined
): GridColumnsSelfAlign | undefined =>
  value === "start" || value === "center" || value === "end" || value === "stretch"
    ? value
    : undefined;

const clampColumnsCount = (value: number) => {
  if (!Number.isFinite(value)) return gridColumnsColumnMin;
  return Math.max(gridColumnsColumnMin, Math.min(gridColumnsColumnMax, Math.floor(value)));
};

export function buildDefaultGridColumnsColumn(
  instanceId: string,
  index: number
): GridColumnsColumn {
  return {
    id: instanceId,
    label: `Column ${index + 1}`,
    desktopSpan: "6",
    tabletSpan: "6",
    mobileSpan: "12",
  };
}

const parseGridColumnsSpan = (value: GridColumnsSpan) => Number.parseInt(value, 10);

function buildDistributedGridColumnsSpans(total: number, count: number): GridColumnsSpan[] {
  const clampedCount = Math.max(1, Math.min(gridColumnsColumnMax, Math.floor(count)));
  const clampedTotal = Math.max(clampedCount, Math.floor(total));
  const base = Math.floor(clampedTotal / clampedCount);
  const remainder = clampedTotal - base * clampedCount;
  return Array.from(
    { length: clampedCount },
    (_, index) => String(base + (index < remainder ? 1 : 0)) as GridColumnsSpan
  );
}

export function buildBalancedGridColumnsDesktopSpans(count: number): GridColumnsSpan[] {
  return buildDistributedGridColumnsSpans(12, count);
}

export function buildAsymmetricGridColumnsDesktopSpans(count: number): GridColumnsSpan[] {
  const clamped = Math.max(1, Math.min(gridColumnsColumnMax, Math.floor(count)));
  if (clamped <= 1) return ["12"];
  if (clamped === 2) return ["8", "4"];
  if (clamped === 3) return ["6", "3", "3"];

  const leadSpan = Math.min(6, Math.max(3, Math.ceil(12 / clamped) + 1));
  const trailingSpans = buildDistributedGridColumnsSpans(12 - leadSpan, clamped - 1);
  return [String(leadSpan) as GridColumnsSpan, ...trailingSpans];
}

export function calculateGridColumnsSpanTotals(
  columns: GridColumnsColumn[] | undefined
): GridColumnsSpanTotals {
  const source = Array.isArray(columns) ? columns : [];
  return source.reduce<GridColumnsSpanTotals>(
    (totals, column) => {
      const visibility = normalizeColumnVisibility(column);
      return {
        desktop:
          totals.desktop +
          (visibility.hideOnDesktop
            ? 0
            : parseGridColumnsSpan(resolveSpanToken(column.desktopSpan, "6"))),
        tablet:
          totals.tablet +
          (visibility.hideOnTablet
            ? 0
            : parseGridColumnsSpan(resolveSpanToken(column.tabletSpan, "6"))),
        mobile:
          totals.mobile +
          (visibility.hideOnMobile
            ? 0
            : parseGridColumnsSpan(resolveSpanToken(column.mobileSpan, "12"))),
      };
    },
    {
      desktop: 0,
      tablet: 0,
      mobile: 0,
    }
  );
}

export function resolveGridColumnsAsymmetricVariantState(
  columns: GridColumnsColumn[] | undefined
): GridColumnsAsymmetricVariantState {
  const source = Array.isArray(columns) ? columns : [];
  if (source.length === 0) {
    return {
      mode: "equal",
      message:
        "This saved layout still uses matching desktop spans. Reapply Asymmetric to widen the lead column.",
    };
  }

  const currentDesktopSpans = source.map((column) => resolveSpanToken(column.desktopSpan, "6"));
  const presetSpans = buildAsymmetricGridColumnsDesktopSpans(source.length);
  if (currentDesktopSpans.every((span, index) => span === presetSpans[index])) {
    return { mode: "preset" };
  }

  if (new Set(currentDesktopSpans).size === 1) {
    return {
      mode: "equal",
      message:
        "This saved layout still uses matching desktop spans. Reapply Asymmetric to widen the lead column.",
    };
  }

  return {
    mode: "custom",
    message: "Custom desktop spans override the asymmetric preset until you reapply it.",
  };
}

export function applyGridColumnsAsymmetricPreset(
  data: GridColumnsData,
  orderedInstanceIds?: string[]
): GridColumnsData {
  const current = normalizeGridColumnsData(data);
  const columns =
    orderedInstanceIds && orderedInstanceIds.length > 0
      ? resolveGridColumnsEffectiveColumns({
          data: current,
          variant: "asymmetric",
          orderedInstanceIds,
        })
      : (current.columns ?? []);
  if (columns.length === 0) return current;
  const presetSpans = buildAsymmetricGridColumnsDesktopSpans(columns.length);
  return normalizeGridColumnsData({
    ...current,
    columns: columns.map((column, index) => ({
      ...column,
      desktopSpan: presetSpans[index] ?? column.desktopSpan,
    })),
  });
}

export function resolveGridColumnsEffectiveColumns({
  data,
  variant,
  orderedInstanceIds,
}: {
  data: GridColumnsData;
  variant: GridColumnsVariantId;
  orderedInstanceIds?: string[];
}): GridColumnsColumn[] {
  const normalized = normalizeGridColumnsData(data);
  const columns = normalized.columns ?? [];
  const byId = new Map(columns.map((column) => [column.id ?? "", column] as const));
  const effectiveInstanceIds =
    orderedInstanceIds && orderedInstanceIds.length > 0
      ? orderedInstanceIds
      : columns.map((column, index) => column.id?.trim() || String(index + 1));

  return effectiveInstanceIds.map((instanceId, index) => {
    const source = byId.get(instanceId);
    const columnsCount = effectiveInstanceIds.length;
    const base = buildDefaultGridColumnsColumn(instanceId, index);

    return {
      ...base,
      ...source,
      id: instanceId,
      label: source?.label?.trim() || base.label,
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
      xlSpan: gridColumnsSpanTokens.includes(source?.xlSpan as GridColumnsSpan)
        ? (source?.xlSpan as GridColumnsSpan)
        : undefined,
      twoXlSpan: gridColumnsSpanTokens.includes(source?.twoXlSpan as GridColumnsSpan)
        ? (source?.twoXlSpan as GridColumnsSpan)
        : undefined,
      ...normalizeColumnVisibility(source ?? {}),
      minHeight: resolveOptionalMinHeightToken(source?.minHeight),
      mobileMinHeight: resolveOptionalMinHeightToken(source?.mobileMinHeight),
      alignSelf: resolveOptionalSelfAlignToken(source?.alignSelf),
      style: normalizeGridColumnsColumnStyle(source?.style),
    };
  });
}

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

export function normalizeGridColumnsColorValue(value: unknown): GridColumnsColorValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return gridColumnsColorValuePattern.test(trimmed) ? trimmed : undefined;
}

function resolveOptionalGridColumnsColorValue(value: unknown): GridColumnsColorValue | undefined {
  if (value === "") return undefined;
  return normalizeGridColumnsColorValue(value);
}

function normalizeGridColumnsColumnStyle(
  style: GridColumnsColumnStyle | undefined
): GridColumnsColumnStyle | undefined {
  return compactObject({
    surface: style?.surface === "on" ? "on" : undefined,
    background: normalizeGridColumnsColorValue(style?.background),
    borderColor: normalizeGridColumnsColorValue(style?.borderColor),
    borderWidth: resolveOptionalBorderWidthToken(style?.borderWidth),
    radius: resolveOptionalRadiusToken(style?.radius),
    padding: resolveOptionalPaddingToken(style?.padding),
    overflow: resolveOptionalOverflowToken(style?.overflow) === "hidden" ? "hidden" : undefined,
  });
}

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
    return buildAsymmetricGridColumnsDesktopSpans(count)[index] ?? "3";
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
    const label = base.label?.trim() || buildDefaultGridColumnsColumn(id, index).label;
    const minHeight = resolveOptionalMinHeightToken(base.minHeight);
    const mobileMinHeight = resolveOptionalMinHeightToken(base.mobileMinHeight);
    const effectiveMinHeight = minHeight ?? "md";
    normalized.push({
      ...buildDefaultGridColumnsColumn(id, index),
      label,
      desktopSpan: resolveSpanToken(base.desktopSpan, "6"),
      tabletSpan: resolveSpanToken(base.tabletSpan, "6"),
      mobileSpan: resolveSpanToken(base.mobileSpan, "12"),
      xlSpan: gridColumnsSpanTokens.includes(base.xlSpan as GridColumnsSpan)
        ? (base.xlSpan as GridColumnsSpan)
        : undefined,
      twoXlSpan: gridColumnsSpanTokens.includes(base.twoXlSpan as GridColumnsSpan)
        ? (base.twoXlSpan as GridColumnsSpan)
        : undefined,
      ...normalizeColumnVisibility(base),
      minHeight: minHeight === "md" ? undefined : minHeight,
      mobileMinHeight:
        mobileMinHeight && mobileMinHeight !== effectiveMinHeight ? mobileMinHeight : undefined,
      alignSelf: resolveOptionalSelfAlignToken(base.alignSelf),
      style: normalizeGridColumnsColumnStyle(base.style),
    });
  }

  return {
    columns: normalized,
    layout: {
      gapX: resolveGapToken(data.layout?.gapX, "6"),
      gapY: resolveGapToken(data.layout?.gapY, "6"),
      align: resolveAlignToken(data.layout?.align),
      reverseOnMobile:
        typeof data.layout?.reverseOnMobile === "boolean" ? data.layout.reverseOnMobile : false,
    },
    style: {
      cardizeColumns:
        typeof data.style?.cardizeColumns === "boolean" ? data.style.cardizeColumns : false,
      columnBackground: hasStyleObject
        ? resolveOptionalGridColumnsColorValue(data.style?.columnBackground)
        : "var(--color-surface)",
      columnBorderColor: hasStyleObject
        ? resolveOptionalGridColumnsColorValue(data.style?.columnBorderColor)
        : "var(--color-border)",
      columnBorderWidth: resolveBorderWidthToken(data.style?.columnBorderWidth),
      columnRadius: resolveRadiusToken(data.style?.columnRadius),
      columnPadding: resolvePaddingToken(data.style?.columnPadding),
    },
  };
}

export function reorderGridColumnsDataByInstanceIds(
  data: GridColumnsData,
  orderedInstanceIds: string[]
): GridColumnsData {
  const current = normalizeGridColumnsData(data);
  const columns = current.columns ?? [];
  const byId = new Map(columns.map((column) => [column.id ?? "", column] as const));
  const used = new Set<string>();
  const reordered: GridColumnsColumn[] = [];

  for (const instanceId of orderedInstanceIds) {
    if (used.has(instanceId)) continue;
    const column = byId.get(instanceId);
    if (!column) continue;
    reordered.push(column);
    used.add(instanceId);
  }

  for (const column of columns) {
    const columnId = column.id ?? "";
    if (!used.has(columnId)) {
      reordered.push(column);
    }
  }

  return normalizeGridColumnsData({
    ...current,
    columns: reordered,
  });
}

function appendGridColumnsDataItem(
  data: GridColumnsData,
  nextItem: GridColumnsColumn
): GridColumnsData {
  const current = normalizeGridColumnsData(data);
  const currentColumns = current.columns ?? [];
  const uniqueColumns =
    reorderGridColumnsDataByInstanceIds(
      current,
      currentColumns.map((column) => column.id ?? "")
    ).columns ?? [];
  const nextId = String(nextItem.id ?? "");
  const hasExistingColumn = uniqueColumns.some((column) => column.id === nextId);
  const reconciledColumns = hasExistingColumn ? uniqueColumns : [...uniqueColumns, nextItem];

  return reorderGridColumnsDataByInstanceIds(
    {
      ...current,
      columns: reconciledColumns,
    },
    reconciledColumns.map((column) => column.id ?? "")
  );
}

export function reorderGridColumnsColumnsAndSlots({
  data,
  slots,
  orderedInstanceIds,
}: {
  data: GridColumnsData;
  slots?: Record<string, WidgetBlock[]>;
  orderedInstanceIds: string[];
}): {
  data: GridColumnsData;
  slots?: Record<string, WidgetBlock[]>;
} {
  if (!slots) {
    return {
      data: reorderGridColumnsDataByInstanceIds(data, orderedInstanceIds),
      slots,
    };
  }

  return {
    data: reorderGridColumnsDataByInstanceIds(data, orderedInstanceIds),
    slots: reorderRepeatableSlotMap(slots, gridColumnsSlot.id, orderedInstanceIds),
  };
}

type ResolvedGridColumn = {
  slotId: string;
  instanceId: string;
  label: string;
  desktopSpan: GridColumnsSpan;
  tabletSpan: GridColumnsSpan;
  mobileSpan: GridColumnsSpan;
  xlSpan?: GridColumnsSpan;
  twoXlSpan?: GridColumnsSpan;
  hideOnMobile: boolean;
  hideOnTablet: boolean;
  hideOnDesktop: boolean;
  minHeight?: GridColumnsMinHeight;
  mobileMinHeight?: GridColumnsMinHeight;
  alignSelf?: GridColumnsSelfAlign;
  style?: GridColumnsColumnStyle;
  blocks: WidgetBlock[];
};

function buildConfiguredGridColumnsTargets(columns: GridColumnsColumn[]) {
  return columns.map((column, index) => {
    const instanceId = column.id?.trim() || String(index + 1);
    return {
      definitionId: gridColumnsSlot.id,
      slotId: buildRepeatableSlotId(gridColumnsSlot.id, instanceId),
      label: `${gridColumnsSlot.label} ${index + 1}`,
      kind: "repeatable" as const,
      instanceId,
    };
  });
}

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
  const hasLiveColumnSlots = getRepeatableSlotIds(gridColumnsSlot, slotMap).length > 0;
  const slotTargets = hasLiveColumnSlots
    ? resolveWidgetSlotTargets([gridColumnsSlot], slotMap).filter(
        (target) => target.definitionId === gridColumnsSlot.id
      )
    : buildConfiguredGridColumnsTargets(columns);
  const effectiveColumns = resolveGridColumnsEffectiveColumns({
    data,
    variant,
    orderedInstanceIds: slotTargets.map((target, index) => {
      const parsed = parseRepeatableSlotId(target.slotId);
      return parsed?.instanceId ?? String(index + 1);
    }),
  });

  return slotTargets.map((target, index) => {
    const parsed = parseRepeatableSlotId(target.slotId);
    const instanceId = parsed?.instanceId ?? String(index + 1);
    const source = effectiveColumns[index] ?? buildDefaultGridColumnsColumn(instanceId, index);
    return {
      slotId: target.slotId,
      instanceId,
      label: source.label?.trim() || `Column ${index + 1}`,
      desktopSpan: resolveSpanToken(source.desktopSpan, "6"),
      xlSpan: gridColumnsSpanTokens.includes(source.xlSpan as GridColumnsSpan)
        ? (source.xlSpan as GridColumnsSpan)
        : undefined,
      twoXlSpan: gridColumnsSpanTokens.includes(source.twoXlSpan as GridColumnsSpan)
        ? (source.twoXlSpan as GridColumnsSpan)
        : undefined,
      ...normalizeColumnVisibility(source),
      minHeight: resolveOptionalMinHeightToken(source.minHeight),
      mobileMinHeight: resolveOptionalMinHeightToken(source.mobileMinHeight),
      alignSelf: resolveOptionalSelfAlignToken(source.alignSelf),
      style: normalizeGridColumnsColumnStyle(source.style),
      tabletSpan: resolveSpanToken(source.tabletSpan, "6"),
      mobileSpan: resolveSpanToken(source.mobileSpan, "12"),
      blocks: Array.isArray(slotMap[target.slotId]) ? slotMap[target.slotId]! : [],
    };
  });
};

function hasGridColumnsColumnSurfaceOverrides(style: GridColumnsColumnStyle | undefined): boolean {
  if (!style) return false;
  return Boolean(
    style.surface === "on" ||
    style.background ||
    style.borderColor ||
    style.borderWidth ||
    style.radius ||
    style.padding
  );
}

function resolveGridColumnsColumnSurface(
  globalStyle: NonNullable<GridColumnsData["style"]>,
  column: ResolvedGridColumn,
  resolvedVariant: GridColumnsVariantId
) {
  const override = column.style;
  const forcedCardized = resolvedVariant === "masonry-lite";
  const cardized =
    forcedCardized ||
    Boolean(globalStyle.cardizeColumns) ||
    hasGridColumnsColumnSurfaceOverrides(override);
  return {
    cardized,
    overflow: override?.overflow ?? "visible",
    backgroundColor: resolveClearableStyleValue(
      override?.background ?? globalStyle.columnBackground
    ),
    borderColor: resolveClearableStyleValue(override?.borderColor ?? globalStyle.columnBorderColor),
    borderWidth: override?.borderWidth ?? globalStyle.columnBorderWidth ?? "1",
    radius: override?.radius ?? globalStyle.columnRadius ?? "xl",
    padding: override?.padding ?? globalStyle.columnPadding ?? "4",
  };
}

function resolveGridColumnsColumnMinHeightClasses(column: ResolvedGridColumn) {
  const minHeight = column.minHeight ?? "md";
  const mobileMinHeight = column.mobileMinHeight;
  if (!mobileMinHeight || mobileMinHeight === minHeight) {
    return minHeightClassMap[minHeight];
  }
  return joinClasses(minHeightClassMap[mobileMinHeight], tabletMinHeightClassMap[minHeight]);
}

function resolveGridColumnsColumnAlignSelfClass(column: ResolvedGridColumn) {
  if (!column.alignSelf || column.alignSelf === "inherit") return undefined;
  return selfAlignClassMap[column.alignSelf];
}

export function GridColumnsBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
  renderBlock,
}: {
  data: GridColumnsData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
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
  const reverseOnMobile = Boolean(layout.reverseOnMobile);

  return (
    <div
      className="mx-auto w-full"
      data-grid-columns-variant={resolvedVariant}
      data-grid-columns-count={String(columns.length)}
      data-grid-columns-align={layout.align ?? "start"}
      data-grid-columns-gap-x={layout.gapX ?? "6"}
      data-grid-columns-gap-y={layout.gapY ?? "6"}
      data-grid-columns-reverse-mobile={reverseOnMobile ? "true" : "false"}
    >
      <div
        className={joinClasses(
          "grid grid-cols-12",
          gapXClassMap[layout.gapX ?? "6"] ?? "gap-x-6",
          gapYClassMap[layout.gapY ?? "6"] ?? "gap-y-6",
          alignClassMap[layout.align ?? "start"] ?? "items-start"
        )}
      >
        {columns.map((column, index) =>
          (() => {
            const columnSurface = resolveGridColumnsColumnSurface(style, column, resolvedVariant);
            const columnStyle: CSSProperties | undefined = columnSurface.cardized
              ? compactStyle({
                  backgroundColor: columnSurface.backgroundColor,
                  borderColor: columnSurface.borderColor,
                  borderStyle: "solid",
                  borderWidth: borderWidthValueMap[columnSurface.borderWidth] ?? "1px",
                })
              : undefined;

            return (
              <div
                key={column.slotId}
                className={joinClasses(
                  "min-w-0",
                  reverseOnMobile
                    ? mobileReverseOrderClassMap[
                        Math.max(
                          1,
                          Math.min(columns.length - index, 6)
                        ) as keyof typeof mobileReverseOrderClassMap
                      ]
                    : undefined,
                  resolveColumnVisibilityClasses(column),
                  resolveGridColumnsColumnAlignSelfClass(column),
                  spanClassMap[column.mobileSpan],
                  tabletSpanClassMap[column.tabletSpan],
                  desktopSpanClassMap[column.desktopSpan],
                  column.xlSpan ? xlSpanClassMap[column.xlSpan] : undefined,
                  column.twoXlSpan ? twoXlSpanClassMap[column.twoXlSpan] : undefined
                )}
                data-grid-column={column.slotId}
                data-grid-column-instance={column.instanceId}
              >
                <div
                  className={joinClasses(
                    "h-full",
                    resolveGridColumnsColumnMinHeightClasses(column),
                    columnSurface.cardized ? "border" : "",
                    columnSurface.cardized ? (paddingClassMap[columnSurface.padding] ?? "p-4") : "",
                    columnSurface.cardized
                      ? (radiusClassMap[columnSurface.radius] ?? "rounded-xl")
                      : "",
                    columnSurface.overflow === "hidden" ? "overflow-hidden" : undefined
                  )}
                  style={columnStyle}
                >
                  {renderContext?.mode === "editor-preview" ||
                  renderContext?.mode === "admin-preview" ? (
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text)]/65">
                      {column.label}
                    </div>
                  ) : null}
                  {column.blocks.length > 0 ? (
                    <div className="space-y-4">
                      {column.blocks.map((block) =>
                        renderBlock ? (
                          <div key={block.id}>{renderBlock(block, renderContext)}</div>
                        ) : (
                          <WidgetRenderer
                            key={block.id}
                            block={block}
                            previewDevice={previewDevice}
                            renderContext={renderContext}
                          />
                        )
                      )}
                    </div>
                  ) : (
                    renderEditorPlaceholder("Empty column.", renderContext)
                  )}
                </div>
              </div>
            );
          })()
        )}
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
    editorContract: gridColumnsEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    repeatableSlotSync: [
      {
        definitionId: gridColumnsSlot.id,
        buildDefaultItem: (instanceId, nextIndex) =>
          buildDefaultGridColumnsColumn(instanceId, nextIndex),
        appendItem: (data, nextItem) =>
          appendGridColumnsDataItem(data as GridColumnsData, nextItem as GridColumnsColumn),
        removeItemByInstanceId: (data, instanceId) =>
          normalizeGridColumnsData({
            ...(data as GridColumnsData),
            columns: (normalizeGridColumnsData(data as GridColumnsData).columns ?? []).filter(
              (column) => column.id !== instanceId
            ),
          }),
        reorderItemsByInstanceIds: (data, orderedInstanceIds) =>
          reorderGridColumnsDataByInstanceIds(data as GridColumnsData, orderedInstanceIds),
      },
    ],
    render: GridColumnsBlock,
  };
}

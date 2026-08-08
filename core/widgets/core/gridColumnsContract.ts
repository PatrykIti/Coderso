import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../services/theme/cssColorContract";
import type { WidgetEditorContract } from "../types";

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

const gridColumnsColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS.authoring,
    },
  ],
} as const;

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
      writablePaths: [],
      readOnlyPaths: ["variant"],
    },
    {
      mode: "visual",
      id: "grid-columns.visual.variant-layout",
      title: "Variant and layout structure",
      role: "layout",
      writablePaths: ["variant", "layout.align", "layout.reverseOnMobile"],
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
  { mode: "preset" } | { mode: "custom"; message: string } | { mode: "equal"; message: string };

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
              background: gridColumnsColorValueSchema,
              borderColor: gridColumnsColorValueSchema,
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
        columnBackground: gridColumnsColorValueSchema,
        columnBorderColor: gridColumnsColorValueSchema,
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

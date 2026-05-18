import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export const dividerSpaceTokens = [
  "none",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "16",
  "20",
  "24",
] as const;

export const dividerContainerWidthTokens = ["sm", "md", "lg"] as const;
export const dividerAlignmentTokens = ["left", "center", "right"] as const;
export const dividerLabelSizeTokens = ["xs", "sm", "base"] as const;
export const dividerLabelWeightTokens = ["medium", "semibold", "bold"] as const;
export const dividerLabelTransformTokens = ["none", "uppercase"] as const;
export const dividerLabelLetterSpacingTokens = ["normal", "wide"] as const;
export const dividerLabelGapTokens = ["2", "3", "4", "6"] as const;
export const dividerLineStyleTokens = ["solid", "dashed", "dotted"] as const;
export const dividerOpacityTokens = ["100", "75", "50", "25"] as const;
export const dividerDashPatternTokens = ["browser", "short", "wide"] as const;
export const dividerVisibilityTokens = ["line", "spacer-only"] as const;

export type DividerVariantId = "line" | "dashed" | "label-center";
export type DividerWidthMode = "full" | "container" | "custom";
export type DividerSpaceToken = (typeof dividerSpaceTokens)[number];
export type DividerContainerWidth = (typeof dividerContainerWidthTokens)[number];
export type DividerAlignment = (typeof dividerAlignmentTokens)[number];
export type DividerLabelSize = (typeof dividerLabelSizeTokens)[number];
export type DividerLabelWeight = (typeof dividerLabelWeightTokens)[number];
export type DividerLabelTransform = (typeof dividerLabelTransformTokens)[number];
export type DividerLabelLetterSpacing = (typeof dividerLabelLetterSpacingTokens)[number];
export type DividerLabelGap = (typeof dividerLabelGapTokens)[number];
export type DividerLineStyle = (typeof dividerLineStyleTokens)[number];
export type DividerOpacity = (typeof dividerOpacityTokens)[number];
export type DividerDashPattern = (typeof dividerDashPatternTokens)[number];
export type DividerVisibility = (typeof dividerVisibilityTokens)[number];

export type DividerData = {
  label?: string;
  labelColor?: string;
  labelSize?: DividerLabelSize;
  labelWeight?: DividerLabelWeight;
  labelTransform?: DividerLabelTransform;
  labelLetterSpacing?: DividerLabelLetterSpacing;
  labelGap?: DividerLabelGap;
  thickness?: number;
  color?: string;
  width?: DividerWidthMode;
  containerWidth?: DividerContainerWidth;
  customWidth?: string;
  align?: DividerAlignment;
  lineStyle?: DividerLineStyle;
  opacity?: DividerOpacity;
  dashPattern?: DividerDashPattern;
  visibility?: DividerVisibility;
  marginTop?: string;
  marginBottom?: string;
};

export const dividerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    labelColor: { type: "string" },
    labelSize: { enum: dividerLabelSizeTokens },
    labelWeight: { enum: dividerLabelWeightTokens },
    labelTransform: { enum: dividerLabelTransformTokens },
    labelLetterSpacing: { enum: dividerLabelLetterSpacingTokens },
    labelGap: { enum: dividerLabelGapTokens },
    thickness: { type: "number" },
    color: { type: "string" },
    width: { enum: ["full", "container", "custom"] },
    containerWidth: { enum: dividerContainerWidthTokens },
    customWidth: { type: "string" },
    align: { enum: dividerAlignmentTokens },
    lineStyle: { enum: dividerLineStyleTokens },
    opacity: { enum: dividerOpacityTokens },
    dashPattern: { enum: dividerDashPatternTokens },
    visibility: { enum: dividerVisibilityTokens },
    marginTop: { type: "string" },
    marginBottom: { type: "string" },
  },
};

export const dividerDefaults: DividerData = {
  label: "",
  labelColor: "var(--color-border)",
  labelSize: "xs",
  labelWeight: "medium",
  labelTransform: "uppercase",
  labelLetterSpacing: "wide",
  labelGap: "3",
  thickness: 1,
  color: "var(--color-border)",
  width: "full",
  containerWidth: "md",
  customWidth: "320px",
  align: "center",
  lineStyle: "solid",
  opacity: "100",
  dashPattern: "browser",
  visibility: "line",
  marginTop: "6",
  marginBottom: "6",
};

export const dividerSpaceCssValueMap: Record<DividerSpaceToken, string> = {
  none: "0rem",
  "0": "0rem",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
};

export const dividerContainerWidthCssValueMap: Record<DividerContainerWidth, string> = {
  sm: "min(100%, 40rem)",
  md: "min(100%, 48rem)",
  lg: "min(100%, 64rem)",
};

export const dividerLabelGapClassMap: Record<DividerLabelGap, string> = {
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "6": "gap-6",
};

export const dividerLabelSizeClassMap: Record<DividerLabelSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
};

export const dividerLabelWeightClassMap: Record<DividerLabelWeight, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export const dividerLabelTransformClassMap: Record<DividerLabelTransform, string> = {
  none: "normal-case",
  uppercase: "uppercase",
};

export const dividerLabelLetterSpacingClassMap: Record<DividerLabelLetterSpacing, string> = {
  normal: "tracking-normal",
  wide: "tracking-wider",
};

const dividerAlignmentClassMap: Record<DividerAlignment, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

const dividerOpacityValueMap: Record<DividerOpacity, number> = {
  "100": 1,
  "75": 0.75,
  "50": 0.5,
  "25": 0.25,
};

const dividerDashPatternValueMap: Record<DividerDashPattern, { dash: number; gap: number }> = {
  browser: { dash: 8, gap: 4 },
  short: { dash: 6, gap: 3 },
  wide: { dash: 14, gap: 8 },
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const pxPattern = /^\d+(?:\.\d+)?px$/i;
const numberPattern = /^\d+(?:\.\d+)?$/;
const cssLengthPattern = /^\d+(?:\.\d+)?(?:px|rem|em|%)$/i;

const isDividerSpaceToken = (value: string): value is DividerSpaceToken =>
  dividerSpaceTokens.includes(value as DividerSpaceToken);

const resolveTokenOrPx = (value: string | undefined, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (isDividerSpaceToken(trimmed)) return trimmed;
  if (pxPattern.test(trimmed)) return trimmed.toLowerCase();
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  return fallback;
};

const resolveCustomWidth = (value: string | undefined, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (cssLengthPattern.test(trimmed)) return trimmed.toLowerCase();
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  return fallback;
};

const clampThickness = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(8, Math.round(value ?? 1)));
};

const resolveEnumToken = <T extends readonly string[]>(
  value: string | undefined,
  tokens: T,
  fallback: T[number]
): T[number] => (tokens.includes(value as T[number]) ? (value as T[number]) : fallback);

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

export function resolveDividerVariant(variant: string): DividerVariantId {
  if (variant === "dashed" || variant === "label-center") return variant;
  return "line";
}

const resolveDividerWidthMode = (value: string | undefined): DividerWidthMode => {
  if (value === "container" || value === "custom") return value;
  return "full";
};

const resolveDividerLineStyle = (
  value: string | undefined,
  variant: DividerVariantId
): DividerLineStyle => {
  if (dividerLineStyleTokens.includes(value as DividerLineStyle)) {
    return value as DividerLineStyle;
  }
  return variant === "dashed" ? "dashed" : "solid";
};

export const resolveDividerDefaultLineStyle = (variant: string): DividerLineStyle =>
  resolveDividerLineStyle(undefined, resolveDividerVariant(variant));

const resolveDividerColorKind = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("var(")) return "token";
  if (hexColorPattern.test(trimmed)) return "hex";
  return "custom";
};

const resolveDividerSpacingKind = (value: string) => {
  if (value === "none" || value === "0") return "none";
  if (isDividerSpaceToken(value)) return "token";
  return "custom";
};

const resolveDividerWidthKind = (
  width: DividerWidthMode,
  containerWidth: DividerContainerWidth
) => {
  if (width === "full") return "full";
  if (width === "container") return `container-${containerWidth}`;
  return "custom";
};

export const resolveDividerSpaceCss = (value: string): string =>
  isDividerSpaceToken(value) ? dividerSpaceCssValueMap[value] : value;

function resolveDividerWidthCss(
  width: DividerWidthMode,
  containerWidth: DividerContainerWidth,
  customWidth: string | undefined
) {
  if (width === "container") return dividerContainerWidthCssValueMap[containerWidth];
  if (width === "custom") {
    return resolveCustomWidth(customWidth, dividerDefaults.customWidth ?? "320px");
  }
  return "100%";
}

export function normalizeDividerData(data: DividerData, variant: string = "line"): DividerData {
  const resolvedVariant = resolveDividerVariant(variant);
  const color = resolveString(data.color, dividerDefaults.color ?? "var(--color-border)");

  return {
    label: typeof data.label === "string" ? data.label : (dividerDefaults.label ?? ""),
    labelColor: resolveString(data.labelColor, color),
    labelSize: resolveEnumToken(data.labelSize, dividerLabelSizeTokens, "xs"),
    labelWeight: resolveEnumToken(data.labelWeight, dividerLabelWeightTokens, "medium"),
    labelTransform: resolveEnumToken(data.labelTransform, dividerLabelTransformTokens, "uppercase"),
    labelLetterSpacing: resolveEnumToken(
      data.labelLetterSpacing,
      dividerLabelLetterSpacingTokens,
      "wide"
    ),
    labelGap: resolveEnumToken(data.labelGap, dividerLabelGapTokens, "3"),
    thickness: clampThickness(data.thickness),
    color,
    width: resolveDividerWidthMode(data.width),
    containerWidth: resolveEnumToken(data.containerWidth, dividerContainerWidthTokens, "md"),
    customWidth: resolveCustomWidth(data.customWidth, dividerDefaults.customWidth ?? "320px"),
    align: resolveEnumToken(data.align, dividerAlignmentTokens, "center"),
    lineStyle: resolveDividerLineStyle(data.lineStyle, resolvedVariant),
    opacity: resolveEnumToken(data.opacity, dividerOpacityTokens, "100"),
    dashPattern: resolveEnumToken(data.dashPattern, dividerDashPatternTokens, "browser"),
    visibility: resolveEnumToken(data.visibility, dividerVisibilityTokens, "line"),
    marginTop: resolveTokenOrPx(data.marginTop, dividerDefaults.marginTop ?? "6"),
    marginBottom: resolveTokenOrPx(data.marginBottom, dividerDefaults.marginBottom ?? "6"),
  };
}

function buildDividerLineFillStyle({
  color,
  thickness,
  lineStyle,
  opacity,
  dashPattern,
}: {
  color: string;
  thickness: number;
  lineStyle: DividerLineStyle;
  opacity: DividerOpacity;
  dashPattern: DividerDashPattern;
}): CSSProperties {
  const height = `${thickness}px`;
  const opacityValue = dividerOpacityValueMap[opacity] ?? 1;

  if (lineStyle === "solid") {
    return {
      height,
      backgroundColor: color,
      opacity: opacityValue,
    };
  }

  if (lineStyle === "dotted") {
    const dotSpacing = Math.max(thickness * 2, 6);
    return {
      height,
      backgroundImage: `radial-gradient(circle, ${color} 58%, transparent 60%)`,
      backgroundPosition: "left center",
      backgroundRepeat: "repeat-x",
      backgroundSize: `${dotSpacing}px ${height}`,
      opacity: opacityValue,
    };
  }

  const pattern = dividerDashPatternValueMap[dashPattern] ?? dividerDashPatternValueMap.browser;
  return {
    height,
    backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 ${pattern.dash}px, transparent ${pattern.dash}px ${pattern.dash + pattern.gap}px)`,
    backgroundPosition: "left center",
    backgroundRepeat: "repeat-x",
    opacity: opacityValue,
  };
}

function renderDividerLine(fillStyle: CSSProperties) {
  return <span aria-hidden="true" className="block flex-1" style={fillStyle} />;
}

export function DividerBlock({ data, variant }: { data: DividerData; variant: string }) {
  const resolvedVariant = resolveDividerVariant(variant);
  const normalized = normalizeDividerData(data, variant);
  const label = (normalized.label ?? "").trim();
  const thickness = normalized.thickness ?? 1;
  const color = normalized.color ?? "var(--color-border)";
  const widthMode = normalized.width ?? "full";
  const containerWidth = normalized.containerWidth ?? "md";
  const widthCss = resolveDividerWidthCss(widthMode, containerWidth, normalized.customWidth);
  const align = normalized.align ?? "center";
  const lineStyle = resolveDividerLineStyle(data.lineStyle, resolvedVariant);
  const opacity = normalized.opacity ?? "100";
  const dashPattern = normalized.dashPattern ?? "browser";
  const visibility = normalized.visibility ?? "line";
  const marginTop = normalized.marginTop ?? "6";
  const marginBottom = normalized.marginBottom ?? "6";
  const hasLabel = visibility === "line" && resolvedVariant === "label-center" && label.length > 0;
  const labelColor = normalized.labelColor ?? color;
  const labelGap = normalized.labelGap ?? "3";
  const constrainedWidthClass = widthMode === "full" ? "w-full" : dividerAlignmentClassMap[align];
  const constrainedWidthStyle =
    widthMode === "full"
      ? undefined
      : {
          width: widthCss,
        };
  const lineFillStyle = buildDividerLineFillStyle({
    color,
    thickness,
    lineStyle,
    opacity,
    dashPattern,
  });

  return (
    <div
      className="w-full"
      style={{
        marginTop: resolveDividerSpaceCss(marginTop),
        marginBottom: resolveDividerSpaceCss(marginBottom),
      }}
      data-divider="true"
      data-divider-variant={resolvedVariant}
      data-divider-thickness={String(thickness)}
      data-divider-color-kind={resolveDividerColorKind(color)}
      data-divider-width-mode={widthMode}
      data-divider-width-kind={resolveDividerWidthKind(widthMode, containerWidth)}
      data-divider-margin-top-kind={resolveDividerSpacingKind(marginTop)}
      data-divider-margin-bottom-kind={resolveDividerSpacingKind(marginBottom)}
      data-divider-has-label={hasLabel ? "true" : "false"}
      data-divider-line-style={lineStyle}
      data-divider-visibility={visibility}
    >
      {visibility === "spacer-only" ? null : hasLabel ? (
        <div
          className={joinClasses(
            constrainedWidthClass,
            "flex items-center",
            dividerLabelGapClassMap[labelGap] ?? dividerLabelGapClassMap["3"]
          )}
          style={constrainedWidthStyle}
        >
          {renderDividerLine(lineFillStyle)}
          <span
            className={joinClasses(
              "shrink-0 whitespace-nowrap px-1",
              dividerLabelSizeClassMap[normalized.labelSize ?? "xs"],
              dividerLabelWeightClassMap[normalized.labelWeight ?? "medium"],
              dividerLabelTransformClassMap[normalized.labelTransform ?? "uppercase"],
              dividerLabelLetterSpacingClassMap[normalized.labelLetterSpacing ?? "wide"]
            )}
            style={{ color: labelColor, opacity: dividerOpacityValueMap[opacity] ?? 1 }}
          >
            {label}
          </span>
          {renderDividerLine(lineFillStyle)}
        </div>
      ) : (
        <div
          role="separator"
          aria-orientation="horizontal"
          className={constrainedWidthClass}
          style={constrainedWidthStyle}
        >
          <div className="w-full" style={lineFillStyle} />
        </div>
      )}
    </div>
  );
}

export function createDividerWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<DividerData>>;
  visual: ComponentType<WidgetEditorProps<DividerData>>;
  advanced: ComponentType<WidgetEditorProps<DividerData>>;
}): WidgetDefinition<DividerData> {
  return {
    type: "divider",
    title: "Divider",
    description: "Visual separator with optional centered label and spacing controls.",
    category: "layout",
    variants: [
      {
        id: "line",
        label: "Line",
        description: "Standard horizontal line separator.",
      },
      {
        id: "dashed",
        label: "Dashed",
        description: "Separator that starts with a dashed line style.",
      },
      {
        id: "label-center",
        label: "Label Center",
        description: "Horizontal line with an optional centered label.",
      },
    ],
    schema: dividerSchema,
    defaults: dividerDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: DividerBlock,
  };
}

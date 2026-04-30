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

export type DividerVariantId = "line" | "dashed" | "label-center";
export type DividerWidthMode = "full" | "container" | "custom";
export type DividerSpaceToken = (typeof dividerSpaceTokens)[number];

export type DividerData = {
  label?: string;
  thickness?: number;
  color?: string;
  width?: DividerWidthMode;
  customWidth?: string;
  marginTop?: string;
  marginBottom?: string;
};

export const dividerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    thickness: { type: "number" },
    color: { type: "string" },
    width: { enum: ["full", "container", "custom"] },
    customWidth: { type: "string" },
    marginTop: { type: "string" },
    marginBottom: { type: "string" },
  },
};

export const dividerDefaults: DividerData = {
  label: "",
  thickness: 1,
  color: "var(--color-border)",
  width: "full",
  customWidth: "320px",
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

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

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

export function resolveDividerVariant(variant: string): DividerVariantId {
  if (variant === "dashed" || variant === "label-center") return variant;
  return "line";
}

const resolveDividerWidthMode = (value: string | undefined): DividerWidthMode => {
  if (value === "container" || value === "custom") return value;
  return "full";
};

export const resolveDividerSpaceCss = (value: string): string =>
  isDividerSpaceToken(value) ? dividerSpaceCssValueMap[value] : value;

const resolveDividerWidthCss = (mode: DividerWidthMode, customWidth: string | undefined) => {
  if (mode === "container") return "min(100%, 48rem)";
  if (mode === "custom") {
    return resolveCustomWidth(customWidth, dividerDefaults.customWidth ?? "320px");
  }
  return "100%";
};

export function normalizeDividerData(data: DividerData): DividerData {
  return {
    label: typeof data.label === "string" ? data.label : (dividerDefaults.label ?? ""),
    thickness: clampThickness(data.thickness),
    color:
      typeof data.color === "string"
        ? data.color
        : (dividerDefaults.color ?? "var(--color-border)"),
    width: resolveDividerWidthMode(data.width),
    customWidth: resolveCustomWidth(data.customWidth, dividerDefaults.customWidth ?? "320px"),
    marginTop: resolveTokenOrPx(data.marginTop, dividerDefaults.marginTop ?? "6"),
    marginBottom: resolveTokenOrPx(data.marginBottom, dividerDefaults.marginBottom ?? "6"),
  };
}

export function DividerBlock({ data, variant }: { data: DividerData; variant: string }) {
  const resolvedVariant = resolveDividerVariant(variant);
  const normalized = normalizeDividerData(data);
  const label = (normalized.label ?? "").trim();
  const thickness = normalized.thickness ?? 1;
  const color = normalized.color ?? "var(--color-border)";
  const widthMode = normalized.width ?? "full";
  const widthCss = resolveDividerWidthCss(widthMode, normalized.customWidth);
  const marginTop = normalized.marginTop ?? "6";
  const marginBottom = normalized.marginBottom ?? "6";
  const hasLabel = resolvedVariant === "label-center" && label.length > 0;

  const lineStyle: CSSProperties = {
    borderTopWidth: `${thickness}px`,
    borderTopColor: color,
    borderTopStyle: resolvedVariant === "dashed" ? "dashed" : "solid",
  };

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
      data-divider-color={color}
      data-divider-width-mode={widthMode}
      data-divider-width-resolved={widthCss}
      data-divider-custom-width={normalized.customWidth ?? "320px"}
      data-divider-margin-top={marginTop}
      data-divider-margin-bottom={marginBottom}
      data-divider-has-label={hasLabel ? "true" : "false"}
    >
      {hasLabel ? (
        <div className="mx-auto flex w-full items-center gap-3" style={{ width: widthCss }}>
          <span aria-hidden="true" className="block flex-1 border-t" style={lineStyle} />
          <span
            className="shrink-0 px-1 text-xs font-medium uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </span>
          <span aria-hidden="true" className="block flex-1 border-t" style={lineStyle} />
        </div>
      ) : (
        <div
          className={joinClasses("mx-auto border-t")}
          style={{ ...lineStyle, width: widthCss }}
        />
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
        description: "Dashed separator for softer visual grouping.",
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

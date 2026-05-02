import type { ComponentType, CSSProperties, ReactNode } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetLayoutDefaults,
} from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type ScreenTwoColumnVariantId = "balanced" | "aside";
export type ScreenTwoColumnGap = "none" | "sm" | "md" | "lg";

export type ScreenTwoColumnData = {
  leftTitle?: string;
  rightTitle?: string;
  gap?: ScreenTwoColumnGap;
  style?: {
    columnBackground?: string;
    columnBorderColor?: string;
  };
};

export const screenTwoColumnSlots = [
  { id: "left", label: "Left column", kind: "fixed" as const },
  { id: "right", label: "Right column", kind: "fixed" as const },
];

export const screenTwoColumnSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    leftTitle: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    rightTitle: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    gap: { enum: ["none", "sm", "md", "lg"] },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        columnBackground: { type: "string" },
        columnBorderColor: { type: "string" },
      },
    },
  },
} as const;

export const screenTwoColumnDefaults: ScreenTwoColumnData = {
  leftTitle: "Primary column",
  rightTitle: "Secondary column",
  gap: "md",
  style: {
    columnBackground: "color-mix(in srgb, var(--color-bg) 60%, transparent)",
    columnBorderColor: "color-mix(in srgb, var(--color-border) 60%, transparent)",
  },
};

const gapClassMap: Record<ScreenTwoColumnGap, string> = {
  none: "gap-0",
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

export function resolveScreenTwoColumnVariant(value: string): ScreenTwoColumnVariantId {
  if (value === "aside") return value;
  return "balanced";
}

export function normalizeScreenTwoColumnData(value: ScreenTwoColumnData): ScreenTwoColumnData {
  const hasStyleObject = value.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        columnBackground: resolveClearableStyleValue(value.style?.columnBackground),
        columnBorderColor: resolveClearableStyleValue(value.style?.columnBorderColor),
      }) ?? {})
    : undefined;

  return {
    leftTitle:
      typeof value.leftTitle === "string"
        ? value.leftTitle
        : (screenTwoColumnDefaults.leftTitle ?? ""),
    rightTitle:
      typeof value.rightTitle === "string"
        ? value.rightTitle
        : (screenTwoColumnDefaults.rightTitle ?? ""),
    gap: value.gap === "none" || value.gap === "sm" || value.gap === "lg" ? value.gap : "md",
    ...(hasStyleObject ? { style } : {}),
  };
}

export function ScreenTwoColumnBlock({
  data,
  variant,
  slots,
  previewDevice,
  pageDefaults,
  renderBlock,
}: {
  data: ScreenTwoColumnData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  pageDefaults?: WidgetLayoutDefaults;
  renderBlock?: (block: WidgetBlock) => ReactNode;
}) {
  const normalized = normalizeScreenTwoColumnData(data);
  const resolvedVariant = resolveScreenTwoColumnVariant(variant);
  const gap = normalized.gap ?? "md";
  const left = slots?.left ?? [];
  const right = slots?.right ?? [];
  const hasStyleObject = normalized.style !== undefined;
  const columnStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.columnBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.columnBorderColor),
  });
  const legacyColumnSurfaceClass = hasStyleObject ? "" : "border-border/60 bg-background/60";
  const gridClassName =
    resolvedVariant === "aside"
      ? `grid items-start ${gapClassMap[gap]} lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]`
      : `grid items-start ${gapClassMap[gap]} lg:grid-cols-2`;

  const renderColumn = (title: string | undefined, items: WidgetBlock[], column: string) => (
    <div
      className={`space-y-4 rounded-3xl border p-4 ${legacyColumnSurfaceClass}`}
      style={columnStyle}
      data-screen-widget-column={column}
    >
      {title?.trim() ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      ) : null}
      {items.length > 0 ? (
        items.map((block) => (
          <div key={block.id}>
            {renderBlock ? (
              renderBlock(block)
            ) : (
              <WidgetRenderer
                block={block}
                previewDevice={previewDevice}
                pageDefaults={pageDefaults}
              />
            )}
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
          Drop screen widgets into this column.
        </div>
      )}
    </div>
  );

  return (
    <div
      className={gridClassName}
      data-screen-widget="two-column"
      data-screen-widget-variant={resolvedVariant}
    >
      {renderColumn(normalized.leftTitle, left, "left")}
      {renderColumn(normalized.rightTitle, right, "right")}
    </div>
  );
}

export function createScreenTwoColumnWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ScreenTwoColumnData>>;
  visual: ComponentType<WidgetEditorProps<ScreenTwoColumnData>>;
  advanced: ComponentType<WidgetEditorProps<ScreenTwoColumnData>>;
}): WidgetDefinition<ScreenTwoColumnData> {
  return {
    type: "screen-two-column",
    title: "Screen Two Column",
    description: "Two-column admin layout for primary content and supporting panels.",
    category: "layout",
    variants: [
      { id: "balanced", label: "Balanced" },
      { id: "aside", label: "Aside" },
    ],
    schema: screenTwoColumnSchema,
    defaults: screenTwoColumnDefaults,
    slots: screenTwoColumnSlots,
    editor: editors,
    render: ScreenTwoColumnBlock,
  };
}

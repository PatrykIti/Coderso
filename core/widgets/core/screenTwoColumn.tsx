import type { ComponentType } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetLayoutDefaults,
} from "../types";

export type ScreenTwoColumnVariantId = "balanced" | "aside";
export type ScreenTwoColumnGap = "sm" | "md" | "lg";

export type ScreenTwoColumnData = {
  leftTitle?: string;
  rightTitle?: string;
  gap?: ScreenTwoColumnGap;
};

export const screenTwoColumnSlots = [
  { id: "left", label: "Left column", kind: "fixed" as const },
  { id: "right", label: "Right column", kind: "fixed" as const },
];

export const screenTwoColumnSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    leftTitle: { type: "string" },
    rightTitle: { type: "string" },
    gap: { enum: ["sm", "md", "lg"] },
  },
} as const;

export const screenTwoColumnDefaults: ScreenTwoColumnData = {
  leftTitle: "Primary column",
  rightTitle: "Secondary column",
  gap: "md",
};

const gapClassMap: Record<ScreenTwoColumnGap, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

export function resolveScreenTwoColumnVariant(
  value: string
): ScreenTwoColumnVariantId {
  if (value === "aside") return value;
  return "balanced";
}

export function normalizeScreenTwoColumnData(
  value: ScreenTwoColumnData
): ScreenTwoColumnData {
  return {
    leftTitle:
      typeof value.leftTitle === "string"
        ? value.leftTitle
        : (screenTwoColumnDefaults.leftTitle ?? ""),
    rightTitle:
      typeof value.rightTitle === "string"
        ? value.rightTitle
        : (screenTwoColumnDefaults.rightTitle ?? ""),
    gap: value.gap === "sm" || value.gap === "lg" ? value.gap : "md",
  };
}

export function ScreenTwoColumnBlock({
  data,
  variant,
  slots,
  previewDevice,
  pageDefaults,
}: {
  data: ScreenTwoColumnData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  pageDefaults?: WidgetLayoutDefaults;
}) {
  const normalized = normalizeScreenTwoColumnData(data);
  const resolvedVariant = resolveScreenTwoColumnVariant(variant);
  const gap = normalized.gap ?? "md";
  const left = slots?.left ?? [];
  const right = slots?.right ?? [];
  const gridClassName =
    resolvedVariant === "aside"
      ? `grid items-start ${gapClassMap[gap]} lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]`
      : `grid items-start ${gapClassMap[gap]} lg:grid-cols-2`;

  const renderColumn = (title: string | undefined, items: WidgetBlock[], column: string) => (
    <div
      className="space-y-4 rounded-3xl border border-border/60 bg-background/60 p-4"
      data-screen-widget-column={column}
    >
      {title?.trim() ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      ) : null}
      {items.length > 0 ? (
        items.map((block) => (
          <WidgetRenderer
            key={block.id}
            block={block}
            previewDevice={previewDevice}
            pageDefaults={pageDefaults}
          />
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

import type { ComponentType } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
} from "../types";

export const stackGapTokens = [
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
] as const;

export type StackVariantId = "vertical" | "horizontal" | "responsive";
export type StackDirection = "row" | "column";
export type StackGap = (typeof stackGapTokens)[number];
export type StackAlign = "start" | "center" | "end" | "stretch";
export type StackJustify = "start" | "center" | "end" | "between";

export type StackData = {
  direction?: {
    desktop?: StackDirection;
    tablet?: StackDirection;
    mobile?: StackDirection;
  };
  gap?: {
    desktop?: StackGap;
    tablet?: StackGap;
    mobile?: StackGap;
  };
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
};

export const stackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    direction: {
      type: "object",
      additionalProperties: false,
      properties: {
        desktop: { enum: ["row", "column"] },
        tablet: { enum: ["row", "column"] },
        mobile: { enum: ["row", "column"] },
      },
    },
    gap: {
      type: "object",
      additionalProperties: false,
      properties: {
        desktop: { enum: [...stackGapTokens] },
        tablet: { enum: [...stackGapTokens] },
        mobile: { enum: [...stackGapTokens] },
      },
    },
    align: { enum: ["start", "center", "end", "stretch"] },
    justify: { enum: ["start", "center", "end", "between"] },
    wrap: { type: "boolean" },
  },
};

export const stackDefaults: StackData = {
  direction: {
    desktop: "column",
    tablet: "column",
    mobile: "column",
  },
  gap: {
    desktop: "6",
    tablet: "6",
    mobile: "4",
  },
  align: "stretch",
  justify: "start",
  wrap: false,
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const directionClassMap: Record<StackDirection, string> = {
  row: "flex-row",
  column: "flex-col",
};

const tabletDirectionClassMap: Record<StackDirection, string> = {
  row: "md:flex-row",
  column: "md:flex-col",
};

const desktopDirectionClassMap: Record<StackDirection, string> = {
  row: "lg:flex-row",
  column: "lg:flex-col",
};

const gapClassMap: Record<StackGap, string> = {
  "0": "gap-0",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8",
  "10": "gap-10",
  "12": "gap-12",
};

const tabletGapClassMap: Record<StackGap, string> = {
  "0": "md:gap-0",
  "1": "md:gap-1",
  "2": "md:gap-2",
  "3": "md:gap-3",
  "4": "md:gap-4",
  "5": "md:gap-5",
  "6": "md:gap-6",
  "8": "md:gap-8",
  "10": "md:gap-10",
  "12": "md:gap-12",
};

const desktopGapClassMap: Record<StackGap, string> = {
  "0": "lg:gap-0",
  "1": "lg:gap-1",
  "2": "lg:gap-2",
  "3": "lg:gap-3",
  "4": "lg:gap-4",
  "5": "lg:gap-5",
  "6": "lg:gap-6",
  "8": "lg:gap-8",
  "10": "lg:gap-10",
  "12": "lg:gap-12",
};

const alignClassMap: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyClassMap: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

const resolveDirection = (
  value: string | undefined,
  fallback: StackDirection
): StackDirection => (value === "row" || value === "column" ? value : fallback);

const resolveGap = (value: string | undefined, fallback: StackGap): StackGap =>
  stackGapTokens.includes(value as StackGap) ? (value as StackGap) : fallback;

const resolveAlign = (value: string | undefined): StackAlign => {
  if (value === "start" || value === "center" || value === "end") return value;
  return "stretch";
};

const resolveJustify = (value: string | undefined): StackJustify => {
  if (value === "center" || value === "end" || value === "between") return value;
  return "start";
};

const resolveVariantDirectionDefaults = (
  variant: StackVariantId
): Required<NonNullable<StackData["direction"]>> => {
  if (variant === "horizontal") {
    return {
      desktop: "row",
      tablet: "row",
      mobile: "row",
    };
  }
  if (variant === "responsive") {
    return {
      desktop: "row",
      tablet: "row",
      mobile: "column",
    };
  }
  return {
    desktop: "column",
    tablet: "column",
    mobile: "column",
  };
};

export function resolveStackVariant(variant: string): StackVariantId {
  if (variant === "horizontal" || variant === "responsive") return variant;
  return "vertical";
}

export function normalizeStackData(data: StackData, variant: string = "vertical"): StackData {
  const resolvedVariant = resolveStackVariant(variant);
  const directionDefaults = resolveVariantDirectionDefaults(resolvedVariant);
  const gapDefaults = stackDefaults.gap ?? {
    desktop: "6",
    tablet: "6",
    mobile: "4",
  };

  return {
    direction: {
      desktop: resolveDirection(data.direction?.desktop, directionDefaults.desktop),
      tablet: resolveDirection(data.direction?.tablet, directionDefaults.tablet),
      mobile: resolveDirection(data.direction?.mobile, directionDefaults.mobile),
    },
    gap: {
      desktop: resolveGap(data.gap?.desktop, gapDefaults.desktop ?? "6"),
      tablet: resolveGap(data.gap?.tablet, gapDefaults.tablet ?? "6"),
      mobile: resolveGap(data.gap?.mobile, gapDefaults.mobile ?? "4"),
    },
    align: resolveAlign(data.align),
    justify: resolveJustify(data.justify),
    wrap: typeof data.wrap === "boolean" ? data.wrap : false,
  };
}

export function StackBlock({
  data,
  variant,
  slots,
  previewDevice,
}: {
  data: StackData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
}) {
  const resolvedVariant = resolveStackVariant(variant);
  const normalized = normalizeStackData(data, resolvedVariant);
  const slotMap =
    slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const contentBlocks = Array.isArray(slotMap.content) ? slotMap.content : [];
  const direction = normalized.direction ?? stackDefaults.direction!;
  const gap = normalized.gap ?? stackDefaults.gap!;

  return (
    <div
      className={joinClasses(
        "flex w-full min-w-0",
        directionClassMap[direction.mobile ?? "column"],
        tabletDirectionClassMap[direction.tablet ?? "column"],
        desktopDirectionClassMap[direction.desktop ?? "column"],
        gapClassMap[gap.mobile ?? "4"],
        tabletGapClassMap[gap.tablet ?? "6"],
        desktopGapClassMap[gap.desktop ?? "6"],
        alignClassMap[normalized.align ?? "stretch"],
        justifyClassMap[normalized.justify ?? "start"],
        normalized.wrap ? "flex-wrap" : "flex-nowrap"
      )}
      data-stack-variant={resolvedVariant}
      data-stack-direction-desktop={direction.desktop ?? "column"}
      data-stack-direction-tablet={direction.tablet ?? "column"}
      data-stack-direction-mobile={direction.mobile ?? "column"}
      data-stack-gap-desktop={gap.desktop ?? "6"}
      data-stack-gap-tablet={gap.tablet ?? "6"}
      data-stack-gap-mobile={gap.mobile ?? "4"}
      data-stack-align={normalized.align ?? "stretch"}
      data-stack-justify={normalized.justify ?? "start"}
      data-stack-wrap={normalized.wrap ? "true" : "false"}
      data-stack-items={String(contentBlocks.length)}
    >
      {contentBlocks.length > 0 ? (
        contentBlocks.map((block) => (
          <WidgetRenderer key={block.id} block={block} previewDevice={previewDevice} />
        ))
      ) : (
        <div className="w-full rounded-md border border-dashed border-[var(--color-border)]/70 bg-[var(--color-bg)]/50 px-3 py-2 text-xs text-[var(--color-text)]/70">
          Empty stack.
        </div>
      )}
    </div>
  );
}

export function createStackWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<StackData>>;
  visual: ComponentType<WidgetEditorProps<StackData>>;
  advanced: ComponentType<WidgetEditorProps<StackData>>;
}): WidgetDefinition<StackData> {
  return {
    type: "stack",
    title: "Stack",
    description: "Flow layout wrapper with responsive direction and spacing.",
    category: "layout",
    slots: [{ id: "content", label: "Content" }],
    variants: [
      {
        id: "vertical",
        label: "Vertical",
        description: "Column flow for long-form page sections.",
      },
      {
        id: "horizontal",
        label: "Horizontal",
        description: "Row flow for compact action groups.",
      },
      {
        id: "responsive",
        label: "Responsive",
        description: "Column on mobile, row on tablet/desktop.",
      },
    ],
    schema: stackSchema,
    defaults: stackDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: StackBlock,
  };
}

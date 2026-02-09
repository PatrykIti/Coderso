import type { ComponentType } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
} from "../types";

export const splitLayoutRatioTokens = ["50-50", "40-60", "60-40"] as const;
export const splitLayoutCollapseTokens = ["stack", "keep"] as const;
export const splitLayoutGapTokens = [
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

export type SplitLayoutVariantId = (typeof splitLayoutRatioTokens)[number];
export type SplitLayoutRatio = (typeof splitLayoutRatioTokens)[number];
export type SplitLayoutCollapseMobile = (typeof splitLayoutCollapseTokens)[number];
export type SplitLayoutGap = (typeof splitLayoutGapTokens)[number];
export type SplitLayoutVerticalAlign = "start" | "center" | "end" | "stretch";

export type SplitLayoutData = {
  ratio?: {
    desktop?: SplitLayoutRatio;
    tablet?: SplitLayoutRatio;
  };
  collapseMobile?: SplitLayoutCollapseMobile;
  reverseOnMobile?: boolean;
  gap?: SplitLayoutGap;
  verticalAlign?: SplitLayoutVerticalAlign;
};

export const splitLayoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ratio: {
      type: "object",
      additionalProperties: false,
      properties: {
        desktop: { enum: [...splitLayoutRatioTokens] },
        tablet: { enum: [...splitLayoutRatioTokens] },
      },
    },
    collapseMobile: { enum: [...splitLayoutCollapseTokens] },
    reverseOnMobile: { type: "boolean" },
    gap: { enum: [...splitLayoutGapTokens] },
    verticalAlign: { enum: ["start", "center", "end", "stretch"] },
  },
};

export const splitLayoutDefaults: SplitLayoutData = {
  ratio: {
    desktop: "50-50",
    tablet: "50-50",
  },
  collapseMobile: "stack",
  reverseOnMobile: false,
  gap: "6",
  verticalAlign: "stretch",
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const ratioSpanMap: Record<SplitLayoutRatio, { left: string; right: string }> = {
  "50-50": { left: "6", right: "6" },
  "40-60": { left: "5", right: "7" },
  "60-40": { left: "7", right: "5" },
};

const mobileKeepLeftSpanMap: Record<SplitLayoutRatio, string> = {
  "50-50": "col-span-6",
  "40-60": "col-span-5",
  "60-40": "col-span-7",
};

const mobileKeepRightSpanMap: Record<SplitLayoutRatio, string> = {
  "50-50": "col-span-6",
  "40-60": "col-span-7",
  "60-40": "col-span-5",
};

const tabletLeftSpanMap: Record<SplitLayoutRatio, string> = {
  "50-50": "md:col-span-6",
  "40-60": "md:col-span-5",
  "60-40": "md:col-span-7",
};

const tabletRightSpanMap: Record<SplitLayoutRatio, string> = {
  "50-50": "md:col-span-6",
  "40-60": "md:col-span-7",
  "60-40": "md:col-span-5",
};

const desktopLeftSpanMap: Record<SplitLayoutRatio, string> = {
  "50-50": "lg:col-span-6",
  "40-60": "lg:col-span-5",
  "60-40": "lg:col-span-7",
};

const desktopRightSpanMap: Record<SplitLayoutRatio, string> = {
  "50-50": "lg:col-span-6",
  "40-60": "lg:col-span-7",
  "60-40": "lg:col-span-5",
};

const gapClassMap: Record<SplitLayoutGap, string> = {
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

const alignClassMap: Record<SplitLayoutVerticalAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const resolveSplitLayoutRatio = (
  value: string | undefined,
  fallback: SplitLayoutRatio
): SplitLayoutRatio =>
  splitLayoutRatioTokens.includes(value as SplitLayoutRatio)
    ? (value as SplitLayoutRatio)
    : fallback;

const resolveSplitLayoutCollapse = (
  value: string | undefined
): SplitLayoutCollapseMobile => (value === "keep" ? "keep" : "stack");

const resolveSplitLayoutGap = (
  value: string | undefined,
  fallback: SplitLayoutGap
): SplitLayoutGap =>
  splitLayoutGapTokens.includes(value as SplitLayoutGap)
    ? (value as SplitLayoutGap)
    : fallback;

const resolveSplitLayoutVerticalAlign = (
  value: string | undefined
): SplitLayoutVerticalAlign => {
  if (value === "start" || value === "center" || value === "end") return value;
  return "stretch";
};

export function resolveSplitLayoutVariant(variant: string): SplitLayoutVariantId {
  if (variant === "40-60" || variant === "60-40") return variant;
  return "50-50";
}

export function normalizeSplitLayoutData(
  data: SplitLayoutData,
  variant: string = "50-50"
): SplitLayoutData {
  const resolvedVariant = resolveSplitLayoutVariant(variant);
  const defaultRatio = splitLayoutDefaults.ratio ?? {
    desktop: resolvedVariant,
    tablet: resolvedVariant,
  };

  return {
    ratio: {
      desktop: resolveSplitLayoutRatio(data.ratio?.desktop, resolvedVariant),
      tablet: resolveSplitLayoutRatio(
        data.ratio?.tablet,
        defaultRatio.tablet ?? resolvedVariant
      ),
    },
    collapseMobile: resolveSplitLayoutCollapse(data.collapseMobile),
    reverseOnMobile:
      typeof data.reverseOnMobile === "boolean" ? data.reverseOnMobile : false,
    gap: resolveSplitLayoutGap(data.gap, splitLayoutDefaults.gap ?? "6"),
    verticalAlign: resolveSplitLayoutVerticalAlign(data.verticalAlign),
  };
}

export function SplitLayoutBlock({
  data,
  variant,
  slots,
  previewDevice,
}: {
  data: SplitLayoutData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
}) {
  const resolvedVariant = resolveSplitLayoutVariant(variant);
  const normalized = normalizeSplitLayoutData(data, resolvedVariant);
  const ratio = normalized.ratio ?? {
    desktop: resolvedVariant,
    tablet: resolvedVariant,
  };
  const collapseMobile = normalized.collapseMobile ?? "stack";
  const reverseOnMobile = Boolean(normalized.reverseOnMobile);
  const gap = normalized.gap ?? "6";
  const verticalAlign = normalized.verticalAlign ?? "stretch";

  const slotMap =
    slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const leftBlocks = Array.isArray(slotMap.left) ? slotMap.left : [];
  const rightBlocks = Array.isArray(slotMap.right) ? slotMap.right : [];

  const mobileStack = collapseMobile === "stack";

  const leftClassName = joinClasses(
    "min-w-0",
    mobileStack ? "col-span-1" : mobileKeepLeftSpanMap[ratio.tablet ?? "50-50"],
    tabletLeftSpanMap[ratio.tablet ?? "50-50"],
    desktopLeftSpanMap[ratio.desktop ?? "50-50"],
    reverseOnMobile ? "order-2 md:order-1" : undefined
  );

  const rightClassName = joinClasses(
    "min-w-0",
    mobileStack ? "col-span-1" : mobileKeepRightSpanMap[ratio.tablet ?? "50-50"],
    tabletRightSpanMap[ratio.tablet ?? "50-50"],
    desktopRightSpanMap[ratio.desktop ?? "50-50"],
    reverseOnMobile ? "order-1 md:order-2" : undefined
  );

  return (
    <div
      className={joinClasses(
        "grid w-full min-w-0",
        mobileStack ? "grid-cols-1" : "grid-cols-12",
        "md:grid-cols-12",
        gapClassMap[gap],
        alignClassMap[verticalAlign]
      )}
      data-split-layout-variant={resolvedVariant}
      data-split-ratio-desktop={ratio.desktop ?? "50-50"}
      data-split-ratio-tablet={ratio.tablet ?? "50-50"}
      data-split-collapse-mobile={collapseMobile}
      data-split-reverse-mobile={reverseOnMobile ? "true" : "false"}
      data-split-gap={gap}
      data-split-vertical-align={verticalAlign}
      data-split-items-left={String(leftBlocks.length)}
      data-split-items-right={String(rightBlocks.length)}
    >
      <div className={leftClassName} data-split-side="left">
        {leftBlocks.length > 0 ? (
          <div className="space-y-4">
            {leftBlocks.map((block) => (
              <WidgetRenderer
                key={block.id}
                block={block}
                previewDevice={previewDevice}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-border)]/70 bg-[var(--color-bg)]/50 px-3 py-2 text-xs text-[var(--color-text)]/70">
            Empty left pane.
          </div>
        )}
      </div>

      <div className={rightClassName} data-split-side="right">
        {rightBlocks.length > 0 ? (
          <div className="space-y-4">
            {rightBlocks.map((block) => (
              <WidgetRenderer
                key={block.id}
                block={block}
                previewDevice={previewDevice}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-border)]/70 bg-[var(--color-bg)]/50 px-3 py-2 text-xs text-[var(--color-text)]/70">
            Empty right pane.
          </div>
        )}
      </div>
    </div>
  );
}

export function createSplitLayoutWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<SplitLayoutData>>;
  visual: ComponentType<WidgetEditorProps<SplitLayoutData>>;
  advanced: ComponentType<WidgetEditorProps<SplitLayoutData>>;
}): WidgetDefinition<SplitLayoutData> {
  return {
    type: "split-layout",
    title: "Split Layout",
    description: "Two-pane layout wrapper with ratio and mobile behavior controls.",
    category: "layout",
    slots: [
      { id: "left", label: "Left" },
      { id: "right", label: "Right" },
    ],
    variants: [
      {
        id: "50-50",
        label: "50 / 50",
        description: "Balanced two-pane split.",
      },
      {
        id: "40-60",
        label: "40 / 60",
        description: "Narrow left pane and wider right pane.",
      },
      {
        id: "60-40",
        label: "60 / 40",
        description: "Wider left pane and narrow right pane.",
      },
    ],
    schema: splitLayoutSchema,
    defaults: splitLayoutDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: SplitLayoutBlock,
  };
}

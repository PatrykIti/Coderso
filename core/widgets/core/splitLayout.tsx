import type { ComponentType, ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";

export const splitLayoutRatioTokens = ["50-50", "40-60", "60-40"] as const;
export const splitLayoutCollapseTokens = ["stack", "keep"] as const;
export const splitLayoutGapTokens = [
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
] as const;

export type SplitLayoutVariantId = (typeof splitLayoutRatioTokens)[number];
export type SplitLayoutRatio = (typeof splitLayoutRatioTokens)[number];
export type SplitLayoutCollapseMobile = (typeof splitLayoutCollapseTokens)[number];
export type SplitLayoutGap = (typeof splitLayoutGapTokens)[number];
export type SplitLayoutGapControlValue = Exclude<SplitLayoutGap, "0">;
export type SplitLayoutVerticalAlign = "start" | "center" | "end" | "stretch";

export type SplitLayoutData = {
  ratio?: {
    desktop?: SplitLayoutRatio;
    tablet?: SplitLayoutRatio;
    mobile?: SplitLayoutRatio;
  };
  collapseMobile?: SplitLayoutCollapseMobile;
  reverseOnMobile?: boolean;
  gap?: SplitLayoutGap;
  verticalAlign?: SplitLayoutVerticalAlign;
};

export type SplitLayoutResolvedRatios = {
  desktop: SplitLayoutRatio;
  tablet: SplitLayoutRatio;
  mobile: SplitLayoutRatio;
};

export type SplitLayoutGapOption = {
  value: SplitLayoutGapControlValue;
  label: string;
  description: string;
};

export type SplitLayoutRatioDisclosure = {
  variant: SplitLayoutVariantId;
  desktop: SplitLayoutRatio;
  tablet: SplitLayoutRatio;
  mobile: SplitLayoutRatio;
  hasExplicitMobile: boolean;
  hasOverride: boolean;
};

export type SplitLayoutDiagnostics = {
  variant: SplitLayoutVariantId;
  ratios: SplitLayoutResolvedRatios;
  desktop: { leftSpan: number; rightSpan: number };
  tablet: { leftSpan: number; rightSpan: number };
  mobile: {
    mode: SplitLayoutCollapseMobile;
    ratio: SplitLayoutRatio | null;
    leftSpan: number;
    rightSpan: number;
    reversed: boolean;
  };
  gap: {
    value: SplitLayoutGap;
    controlValue: SplitLayoutGapControlValue;
    label: string;
    description: string;
    className: string;
  };
  verticalAlign: {
    value: SplitLayoutVerticalAlign;
    label: string;
    className: string;
  };
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
        mobile: { enum: [...splitLayoutRatioTokens] },
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

const ratioSpanMap: Record<SplitLayoutRatio, { left: number; right: number }> = {
  "50-50": { left: 6, right: 6 },
  "40-60": { left: 5, right: 7 },
  "60-40": { left: 7, right: 5 },
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
  none: "gap-0",
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

const gapOptionMap: Record<SplitLayoutGapControlValue, SplitLayoutGapOption> = {
  none: {
    value: "none",
    label: "None (0px)",
    description: "No space between the left and right panes.",
  },
  "1": {
    value: "1",
    label: "Gap 1 (0.25rem / 4px)",
    description: "Tight space between the left and right panes.",
  },
  "2": {
    value: "2",
    label: "Gap 2 (0.5rem / 8px)",
    description: "Compact space between the left and right panes.",
  },
  "3": {
    value: "3",
    label: "Gap 3 (0.75rem / 12px)",
    description: "Small separation between the left and right panes.",
  },
  "4": {
    value: "4",
    label: "Gap 4 (1rem / 16px)",
    description: "Balanced space between the left and right panes.",
  },
  "5": {
    value: "5",
    label: "Gap 5 (1.25rem / 20px)",
    description: "Roomier spacing between the left and right panes.",
  },
  "6": {
    value: "6",
    label: "Gap 6 (1.5rem / 24px)",
    description: "Default spacing between the left and right panes.",
  },
  "8": {
    value: "8",
    label: "Gap 8 (2rem / 32px)",
    description: "Large space between the left and right panes.",
  },
  "10": {
    value: "10",
    label: "Gap 10 (2.5rem / 40px)",
    description: "Extra-large space between the left and right panes.",
  },
  "12": {
    value: "12",
    label: "Gap 12 (3rem / 48px)",
    description: "Maximum preset space between the left and right panes.",
  },
};

const alignClassMap: Record<SplitLayoutVerticalAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const verticalAlignLabelMap: Record<SplitLayoutVerticalAlign, string> = {
  start: "Start",
  center: "Center",
  end: "End",
  stretch: "Stretch",
};

const resolveSplitLayoutRatio = (
  value: string | undefined,
  fallback: SplitLayoutRatio
): SplitLayoutRatio =>
  splitLayoutRatioTokens.includes(value as SplitLayoutRatio)
    ? (value as SplitLayoutRatio)
    : fallback;

const resolveSplitLayoutCollapse = (value: string | undefined): SplitLayoutCollapseMobile =>
  value === "keep" ? "keep" : "stack";

const resolveSplitLayoutGap = (
  value: string | undefined,
  fallback: SplitLayoutGap
): SplitLayoutGap =>
  splitLayoutGapTokens.includes(value as SplitLayoutGap) ? (value as SplitLayoutGap) : fallback;

const resolveSplitLayoutVerticalAlign = (value: string | undefined): SplitLayoutVerticalAlign => {
  if (value === "start" || value === "center" || value === "end") return value;
  return "stretch";
};

export function resolveSplitLayoutVariant(variant: string): SplitLayoutVariantId {
  if (variant === "40-60" || variant === "60-40") return variant;
  return "50-50";
}

export function formatSplitLayoutRatioLabel(ratio: SplitLayoutRatio): string {
  switch (ratio) {
    case "40-60":
      return "40 / 60";
    case "60-40":
      return "60 / 40";
    default:
      return "50 / 50";
  }
}

export function getSplitLayoutRatioSpans(ratio: SplitLayoutRatio): { left: number; right: number } {
  return ratioSpanMap[ratio];
}

export function getSplitLayoutGapControlValue(
  value: SplitLayoutGap | undefined
): SplitLayoutGapControlValue {
  if (value === "0") {
    return "none";
  }
  return value ?? "6";
}

export function getSplitLayoutGapOptions(): SplitLayoutGapOption[] {
  return [
    gapOptionMap.none,
    gapOptionMap["1"],
    gapOptionMap["2"],
    gapOptionMap["3"],
    gapOptionMap["4"],
    gapOptionMap["5"],
    gapOptionMap["6"],
    gapOptionMap["8"],
    gapOptionMap["10"],
    gapOptionMap["12"],
  ];
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
  const desktop = resolveSplitLayoutRatio(data.ratio?.desktop, resolvedVariant);
  const tablet = resolveSplitLayoutRatio(
    data.ratio?.tablet,
    defaultRatio.tablet ?? resolvedVariant
  );

  return {
    ratio: {
      desktop,
      tablet,
      mobile: resolveSplitLayoutRatio(data.ratio?.mobile, tablet),
    },
    collapseMobile: resolveSplitLayoutCollapse(data.collapseMobile),
    reverseOnMobile: typeof data.reverseOnMobile === "boolean" ? data.reverseOnMobile : false,
    gap: resolveSplitLayoutGap(data.gap, splitLayoutDefaults.gap ?? "6"),
    verticalAlign: resolveSplitLayoutVerticalAlign(data.verticalAlign),
  };
}

export function getSplitLayoutRatioDisclosure(
  data: SplitLayoutData,
  variant: string
): SplitLayoutRatioDisclosure {
  const resolvedVariant = resolveSplitLayoutVariant(variant);
  const normalized = normalizeSplitLayoutData(data, resolvedVariant);
  const ratios = normalized.ratio ?? {
    desktop: resolvedVariant,
    tablet: resolvedVariant,
    mobile: resolvedVariant,
  };
  const hasExplicitMobile = typeof data.ratio?.mobile !== "undefined";

  return {
    variant: resolvedVariant,
    desktop: ratios.desktop ?? resolvedVariant,
    tablet: ratios.tablet ?? resolvedVariant,
    mobile: ratios.mobile ?? ratios.tablet ?? resolvedVariant,
    hasExplicitMobile,
    hasOverride:
      ratios.desktop !== resolvedVariant ||
      ratios.tablet !== resolvedVariant ||
      ratios.mobile !== ratios.tablet ||
      (hasExplicitMobile && ratios.mobile !== resolvedVariant),
  };
}

export function getSplitLayoutDiagnostics(
  data: SplitLayoutData,
  variant: string
): SplitLayoutDiagnostics {
  const disclosure = getSplitLayoutRatioDisclosure(data, variant);
  const normalized = normalizeSplitLayoutData(data, disclosure.variant);
  const gapValue = normalized.gap ?? splitLayoutDefaults.gap ?? "6";
  const gapControlValue = getSplitLayoutGapControlValue(gapValue);
  const gapOption = gapOptionMap[gapControlValue];
  const desktop = getSplitLayoutRatioSpans(disclosure.desktop);
  const tablet = getSplitLayoutRatioSpans(disclosure.tablet);
  const mobileMode = normalized.collapseMobile ?? "stack";
  const mobileRatio = mobileMode === "keep" ? disclosure.mobile : null;
  const mobileSpans = mobileRatio ? getSplitLayoutRatioSpans(mobileRatio) : { left: 1, right: 1 };
  const verticalAlign = normalized.verticalAlign ?? "stretch";

  return {
    variant: disclosure.variant,
    ratios: {
      desktop: disclosure.desktop,
      tablet: disclosure.tablet,
      mobile: disclosure.mobile,
    },
    desktop: {
      leftSpan: desktop.left,
      rightSpan: desktop.right,
    },
    tablet: {
      leftSpan: tablet.left,
      rightSpan: tablet.right,
    },
    mobile: {
      mode: mobileMode,
      ratio: mobileRatio,
      leftSpan: mobileSpans.left,
      rightSpan: mobileSpans.right,
      reversed: Boolean(normalized.reverseOnMobile),
    },
    gap: {
      value: gapValue,
      controlValue: gapControlValue,
      label: gapOption.label,
      description:
        gapValue === "0"
          ? `${gapOption.description} Legacy \`Gap 0\` values resolve here.`
          : gapOption.description,
      className: gapClassMap[gapValue],
    },
    verticalAlign: {
      value: verticalAlign,
      label: verticalAlignLabelMap[verticalAlign],
      className: alignClassMap[verticalAlign],
    },
  };
}

function renderSplitLayoutEmptyPane(
  side: "left" | "right",
  renderContext?: WidgetRenderContext
): ReactNode {
  const placeholder = renderEditorPlaceholder(
    side === "left"
      ? "Left pane is empty. Add a widget from Structure or the insert controls."
      : "Right pane is empty. Add a widget from Structure or the insert controls.",
    renderContext
  );

  if (!placeholder) {
    return null;
  }

  return <div data-split-empty-pane={side}>{placeholder}</div>;
}

export function SplitLayoutBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
  renderBlock,
}: {
  data: SplitLayoutData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
}) {
  const resolvedVariant = resolveSplitLayoutVariant(variant);
  const normalized = normalizeSplitLayoutData(data, resolvedVariant);
  const ratio = normalized.ratio ?? {
    desktop: resolvedVariant,
    tablet: resolvedVariant,
    mobile: resolvedVariant,
  };
  const collapseMobile = normalized.collapseMobile ?? "stack";
  const reverseOnMobile = Boolean(normalized.reverseOnMobile);
  const gap = normalized.gap ?? "6";
  const verticalAlign = normalized.verticalAlign ?? "stretch";

  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const leftBlocks = Array.isArray(slotMap.left) ? slotMap.left : [];
  const rightBlocks = Array.isArray(slotMap.right) ? slotMap.right : [];

  const mobileStack = collapseMobile === "stack";

  const leftClassName = joinClasses(
    "min-w-0",
    mobileStack ? "col-span-1" : mobileKeepLeftSpanMap[ratio.mobile ?? ratio.tablet ?? "50-50"],
    tabletLeftSpanMap[ratio.tablet ?? "50-50"],
    desktopLeftSpanMap[ratio.desktop ?? "50-50"],
    reverseOnMobile ? "order-2 md:order-1" : undefined
  );

  const rightClassName = joinClasses(
    "min-w-0",
    mobileStack ? "col-span-1" : mobileKeepRightSpanMap[ratio.mobile ?? ratio.tablet ?? "50-50"],
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
      data-split-ratio-mobile={ratio.mobile ?? ratio.tablet ?? "50-50"}
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
            {leftBlocks.map((block) =>
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
          renderSplitLayoutEmptyPane("left", renderContext)
        )}
      </div>

      <div className={rightClassName} data-split-side="right">
        {rightBlocks.length > 0 ? (
          <div className="space-y-4">
            {rightBlocks.map((block) =>
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
          renderSplitLayoutEmptyPane("right", renderContext)
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

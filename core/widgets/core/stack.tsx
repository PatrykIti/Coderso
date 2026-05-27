import type { ComponentType } from "react";

import { createNestedRowFlowRenderContext, WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";

export const stackBreakpoints = ["desktop", "tablet", "mobile"] as const;
export const stackGapTokens = ["none", "0", "1", "2", "3", "4", "5", "6", "8", "10", "12"] as const;
export const stackAlignTokens = ["start", "center", "end", "stretch", "baseline"] as const;
export const stackJustifyTokens = [
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly",
] as const;

export type StackBreakpoint = (typeof stackBreakpoints)[number];
export type StackVariantId = "vertical" | "horizontal" | "responsive";
export type StackDirection = "row" | "column";
export type StackGap = (typeof stackGapTokens)[number];
export type StackAlign = (typeof stackAlignTokens)[number];
export type StackJustify = (typeof stackJustifyTokens)[number];
export type StackResponsiveValue<T> = T | Partial<Record<StackBreakpoint, T>>;
export type StackResolvedResponsiveValue<T> = Record<StackBreakpoint, T>;

export type StackData = {
  direction?: Partial<Record<StackBreakpoint, StackDirection>>;
  gap?: Partial<Record<StackBreakpoint, StackGap>>;
  align?: StackResponsiveValue<StackAlign>;
  justify?: StackResponsiveValue<StackJustify>;
  wrap?: StackResponsiveValue<boolean>;
};

const stackPresetDirectionDuplicateAllowances = stackBreakpoints.map((breakpoint) => ({
  path: `direction.${breakpoint}`,
  reason:
    "Stack preset selection seeds a starting flow direction; Visual remains the daily per-breakpoint flow owner after setup.",
  expiresWithTask: "TASK-336",
})) satisfies NonNullable<
  WidgetEditorContract["sections"][number]["allowedDuplicateWritablePaths"]
>;

export const stackEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "stack.wizard.quick-start",
      title: "Stack quick start",
      role: "setup",
      writablePaths: [],
    },
    {
      mode: "visual",
      id: "stack.visual.variant-flow",
      title: "Variant and flow",
      role: "layout",
      writablePaths: ["variant", "direction.desktop", "direction.tablet", "direction.mobile"],
      allowedDuplicateWritablePaths: stackPresetDirectionDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "stack.visual.responsive-direction",
      title: "Responsive direction",
      role: "layout",
      writablePaths: [
        "direction.desktop",
        "direction.tablet",
        "direction.mobile",
        "gap.desktop",
        "gap.tablet",
        "gap.mobile",
      ],
      allowedDuplicateWritablePaths: stackPresetDirectionDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "stack.visual.responsive-axis-wrap",
      title: "Responsive alignment and wrap",
      role: "layout",
      writablePaths: [
        "align.desktop",
        "align.tablet",
        "align.mobile",
        "justify.desktop",
        "justify.tablet",
        "justify.mobile",
        "wrap.desktop",
        "wrap.tablet",
        "wrap.mobile",
      ],
    },
    {
      mode: "visual",
      id: "stack.visual.slot-guidance",
      title: "Slot guidance",
      role: "summary",
      writablePaths: [],
    },
    {
      mode: "advanced",
      id: "stack.advanced.responsive-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["direction", "gap", "align", "justify", "wrap"],
    },
    {
      mode: "advanced",
      id: "stack.advanced.support-summary",
      title: "Support summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["direction", "gap", "align", "justify", "wrap"],
    },
  ],
};

export type NormalizedStackData = {
  direction: StackResolvedResponsiveValue<StackDirection>;
  gap: StackResolvedResponsiveValue<StackGap>;
  align: StackResolvedResponsiveValue<StackAlign>;
  justify: StackResolvedResponsiveValue<StackJustify>;
  wrap: StackResolvedResponsiveValue<boolean>;
};

const createBreakpointEnumObjectSchema = (values: readonly string[]) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    desktop: { enum: [...values] },
    tablet: { enum: [...values] },
    mobile: { enum: [...values] },
  },
});

const createResponsiveEnumSchema = (values: readonly string[]) => ({
  anyOf: [{ enum: [...values] }, createBreakpointEnumObjectSchema(values)],
});

const createResponsiveBooleanSchema = () => ({
  anyOf: [
    { type: "boolean" },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        desktop: { type: "boolean" },
        tablet: { type: "boolean" },
        mobile: { type: "boolean" },
      },
    },
  ],
});

export const stackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    direction: createBreakpointEnumObjectSchema(["row", "column"]),
    gap: createBreakpointEnumObjectSchema(stackGapTokens),
    align: createResponsiveEnumSchema(stackAlignTokens),
    justify: createResponsiveEnumSchema(stackJustifyTokens),
    wrap: createResponsiveBooleanSchema(),
  },
};

export const stackGapDefaults: StackResolvedResponsiveValue<StackGap> = {
  desktop: "6",
  tablet: "6",
  mobile: "4",
};

export const stackAlignDefaults: StackResolvedResponsiveValue<StackAlign> = {
  desktop: "stretch",
  tablet: "stretch",
  mobile: "stretch",
};

export const stackJustifyDefaults: StackResolvedResponsiveValue<StackJustify> = {
  desktop: "start",
  tablet: "start",
  mobile: "start",
};

export const stackWrapDefaults: StackResolvedResponsiveValue<boolean> = {
  desktop: false,
  tablet: false,
  mobile: false,
};

export const stackDefaults: StackData = {
  direction: {
    desktop: "column",
    tablet: "column",
    mobile: "column",
  },
  gap: stackGapDefaults,
  align: stackAlignDefaults,
  justify: stackJustifyDefaults,
  wrap: stackWrapDefaults,
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const prefixClassMap = <T extends string>(
  classMap: Record<T, string>,
  prefix: string
): Record<T, string> =>
  Object.fromEntries(
    Object.entries(classMap).map(([token, className]) => [token, `${prefix}${className}`])
  ) as Record<T, string>;

const directionClassMap: Record<StackDirection, string> = {
  row: "flex-row",
  column: "flex-col",
};

const tabletDirectionClassMap = prefixClassMap(directionClassMap, "md:");
const desktopDirectionClassMap = prefixClassMap(directionClassMap, "lg:");

const gapClassMap: Record<StackGap, string> = {
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

const tabletGapClassMap = prefixClassMap(gapClassMap, "md:");
const desktopGapClassMap = prefixClassMap(gapClassMap, "lg:");

const alignClassMap: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const tabletAlignClassMap = prefixClassMap(alignClassMap, "md:");
const desktopAlignClassMap = prefixClassMap(alignClassMap, "lg:");

const justifyClassMap: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const tabletJustifyClassMap = prefixClassMap(justifyClassMap, "md:");
const desktopJustifyClassMap = prefixClassMap(justifyClassMap, "lg:");

const wrapClassMap = {
  false: "flex-nowrap",
  true: "flex-wrap",
} as const;

const tabletWrapClassMap = prefixClassMap(wrapClassMap, "md:");
const desktopWrapClassMap = prefixClassMap(wrapClassMap, "lg:");

const isStackDirection = (candidate: unknown): candidate is StackDirection =>
  candidate === "row" || candidate === "column";

const isStackGap = (candidate: unknown): candidate is StackGap =>
  typeof candidate === "string" && stackGapTokens.includes(candidate as StackGap);

const isStackAlign = (candidate: unknown): candidate is StackAlign =>
  typeof candidate === "string" && stackAlignTokens.includes(candidate as StackAlign);

const isStackJustify = (candidate: unknown): candidate is StackJustify =>
  typeof candidate === "string" && stackJustifyTokens.includes(candidate as StackJustify);

const isBoolean = (candidate: unknown): candidate is boolean => typeof candidate === "boolean";

const normalizeBreakpointObject = <T extends string>(
  value: unknown,
  fallback: StackResolvedResponsiveValue<T>,
  isAllowed: (candidate: unknown) => candidate is T
): StackResolvedResponsiveValue<T> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Partial<Record<StackBreakpoint, unknown>>;
    return {
      desktop: isAllowed(record.desktop) ? record.desktop : fallback.desktop,
      tablet: isAllowed(record.tablet) ? record.tablet : fallback.tablet,
      mobile: isAllowed(record.mobile) ? record.mobile : fallback.mobile,
    };
  }

  return { ...fallback };
};

const normalizeResponsiveValue = <T extends string | boolean>(
  value: unknown,
  fallback: StackResolvedResponsiveValue<T>,
  isAllowed: (candidate: unknown) => candidate is T
): StackResolvedResponsiveValue<T> => {
  if (isAllowed(value)) {
    return {
      desktop: value,
      tablet: value,
      mobile: value,
    };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Partial<Record<StackBreakpoint, unknown>>;
    return {
      desktop: isAllowed(record.desktop) ? record.desktop : fallback.desktop,
      tablet: isAllowed(record.tablet) ? record.tablet : fallback.tablet,
      mobile: isAllowed(record.mobile) ? record.mobile : fallback.mobile,
    };
  }

  return { ...fallback };
};

export function resolveStackVariantDirectionDefaults(
  variant: StackVariantId
): StackResolvedResponsiveValue<StackDirection> {
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
}

export function resolveStackVariant(variant: string): StackVariantId {
  if (variant === "horizontal" || variant === "responsive") return variant;
  return "vertical";
}

export function normalizeStackData(
  data: StackData = {},
  variant: string = "vertical"
): NormalizedStackData {
  const source = data && typeof data === "object" ? data : {};
  const resolvedVariant = resolveStackVariant(variant);
  const directionDefaults = resolveStackVariantDirectionDefaults(resolvedVariant);

  return {
    direction: normalizeBreakpointObject(source.direction, directionDefaults, isStackDirection),
    gap: normalizeBreakpointObject(source.gap, stackGapDefaults, isStackGap),
    align: normalizeResponsiveValue(source.align, stackAlignDefaults, isStackAlign),
    justify: normalizeResponsiveValue(source.justify, stackJustifyDefaults, isStackJustify),
    wrap: normalizeResponsiveValue(source.wrap, stackWrapDefaults, isBoolean),
  };
}

export function StackBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
}: {
  data: StackData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
}) {
  const resolvedVariant = resolveStackVariant(variant);
  const normalized = normalizeStackData(data, resolvedVariant);
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const contentBlocks = Array.isArray(slotMap.content) ? slotMap.content : [];
  const mobileWrap = normalized.wrap.mobile ? "true" : "false";
  const tabletWrap = normalized.wrap.tablet ? "true" : "false";
  const desktopWrap = normalized.wrap.desktop ? "true" : "false";
  const childRenderContext = createNestedRowFlowRenderContext(renderContext, previewDevice);

  return (
    <div
      className={joinClasses(
        "flex w-full min-w-0",
        directionClassMap[normalized.direction.mobile],
        tabletDirectionClassMap[normalized.direction.tablet],
        desktopDirectionClassMap[normalized.direction.desktop],
        gapClassMap[normalized.gap.mobile],
        tabletGapClassMap[normalized.gap.tablet],
        desktopGapClassMap[normalized.gap.desktop],
        alignClassMap[normalized.align.mobile],
        tabletAlignClassMap[normalized.align.tablet],
        desktopAlignClassMap[normalized.align.desktop],
        justifyClassMap[normalized.justify.mobile],
        tabletJustifyClassMap[normalized.justify.tablet],
        desktopJustifyClassMap[normalized.justify.desktop],
        wrapClassMap[mobileWrap],
        tabletWrapClassMap[tabletWrap],
        desktopWrapClassMap[desktopWrap]
      )}
      data-stack-variant={resolvedVariant}
      data-stack-direction-desktop={normalized.direction.desktop}
      data-stack-direction-tablet={normalized.direction.tablet}
      data-stack-direction-mobile={normalized.direction.mobile}
      data-stack-gap-desktop={normalized.gap.desktop}
      data-stack-gap-tablet={normalized.gap.tablet}
      data-stack-gap-mobile={normalized.gap.mobile}
      data-stack-align={normalized.align.mobile}
      data-stack-align-desktop={normalized.align.desktop}
      data-stack-align-tablet={normalized.align.tablet}
      data-stack-align-mobile={normalized.align.mobile}
      data-stack-justify={normalized.justify.mobile}
      data-stack-justify-desktop={normalized.justify.desktop}
      data-stack-justify-tablet={normalized.justify.tablet}
      data-stack-justify-mobile={normalized.justify.mobile}
      data-stack-wrap={mobileWrap}
      data-stack-wrap-desktop={desktopWrap}
      data-stack-wrap-tablet={tabletWrap}
      data-stack-wrap-mobile={mobileWrap}
      data-stack-items={String(contentBlocks.length)}
    >
      {contentBlocks.length > 0 ? (
        contentBlocks.map((block) => (
          <WidgetRenderer
            key={block.id}
            block={block}
            previewDevice={previewDevice}
            renderContext={childRenderContext}
          />
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
    description: "Flow layout wrapper with responsive direction, spacing, and axis control.",
    category: "layout",
    slots: [{ id: "content", label: "Content" }],
    variants: [
      {
        id: "vertical",
        label: "Vertical",
        description: "Items start stacked vertically on every screen size.",
      },
      {
        id: "horizontal",
        label: "Horizontal",
        description: "Items start side by side on every screen size.",
      },
      {
        id: "responsive",
        label: "Responsive",
        description: "Items stack on small screens and sit side by side on larger screens.",
      },
    ],
    schema: stackSchema,
    defaults: stackDefaults,
    editor: editors,
    editorContract: stackEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: StackBlock,
  };
}

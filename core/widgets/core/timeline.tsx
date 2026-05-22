import type { CSSProperties, ComponentType, ReactNode } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type TimelineVariantId = "milestones" | "cards" | "compact";
export type TimelineMode = "process" | "axis" | "chronology" | "alternating";
export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineAlign = "start" | "center" | "end";
export type TimelineLabelPosition = "top" | "bottom";
export type TimelineSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type TimelineGuideStyle = "solid" | "dashed";
export type TimelineLineStyle = "solid" | "dashed";
export type TimelineMarkerSize = "sm" | "md" | "lg";
export type TimelineThickness = "1" | "2" | "3" | "4";
export type TimelineTitleSize = "none" | "sm" | "base" | "lg" | "xl";
export type TimelineDescriptionSize = "none" | "xs" | "sm" | "base" | "lg";
export type TimelineTitleWeight = "normal" | "medium" | "semibold" | "bold";
export type TimelineStatus = "upcoming" | "current" | "complete";
export type TimelineMarkerDisplay = "dot" | "number" | "icon";
export type TimelinePadding = "sm" | "md" | "lg";
export type TimelineSectionSpacing = "none" | "sm" | "md" | "lg";
export type TimelineMaxWidth = "none" | "4xl" | "5xl" | "6xl" | "7xl" | "full";

export type TimelineStepCta = {
  label: string;
  href: string;
};

export type TimelineStepLink = {
  href?: string;
  label?: string;
};

export type TimelineStep = {
  id?: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
  date?: string;
  dateLabel?: string;
  status?: TimelineStatus;
  markerIcon?: string;
  markerIconColor?: string;
  markerBackgroundColor?: string;
  cta?: TimelineStepCta;
  link?: TimelineStepLink;
};

export type TimelineData = {
  header?: {
    title?: string;
    description?: string;
  };
  mode?: TimelineMode;
  steps: TimelineStep[];
  layout?: {
    orientation?: TimelineOrientation;
    align?: TimelineAlign;
    spacing?: TimelineSpacing;
    labelPosition?: TimelineLabelPosition;
    padding?: TimelinePadding;
    sectionSpacing?: TimelineSectionSpacing;
    maxWidth?: TimelineMaxWidth;
  };
  guides?: {
    enabled?: boolean;
    style?: TimelineGuideStyle;
  };
  style?: {
    lineStyle?: TimelineLineStyle;
    thickness?: TimelineThickness;
    markerSize?: TimelineMarkerSize;
    markerDisplay?: TimelineMarkerDisplay;
    lineColor?: string;
    markerColor?: string;
    titleColor?: string;
    descriptionColor?: string;
    titleSize?: TimelineTitleSize;
    descriptionSize?: TimelineDescriptionSize;
    titleWeight?: TimelineTitleWeight;
  };
  background?: {
    color?: string;
  };
};

export const timelineStepMin = 3;
export const timelineStepMax = 8;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const widgetHrefOptions = {
  allowRelative: true,
  allowHash: true,
  allowHttp: true,
} as const;

const timelineOrientationOptions = ["horizontal", "vertical"] as const;
const timelineAlignOptions = ["start", "center", "end"] as const;
const timelineLabelPositionOptions = ["top", "bottom"] as const;
const timelineSpacingOptions = ["none", "sm", "md", "lg", "xl"] as const;
const timelineGuideStyleOptions = ["solid", "dashed"] as const;
const timelineLineStyleOptions = ["solid", "dashed"] as const;
const timelineMarkerSizeOptions = ["sm", "md", "lg"] as const;
const timelineThicknessOptions = ["1", "2", "3", "4"] as const;
const timelineTitleSizeOptions = ["none", "sm", "base", "lg", "xl"] as const;
const timelineDescriptionSizeOptions = ["none", "xs", "sm", "base", "lg"] as const;
const timelineStatusOptions = ["upcoming", "current", "complete"] as const;
const timelinePaddingOptions = ["sm", "md", "lg"] as const;
const timelineSectionSpacingOptions = ["none", "sm", "md", "lg"] as const;
const timelineMaxWidthOptions = ["none", "4xl", "5xl", "6xl", "7xl", "full"] as const;
const timelineTitleWeightOptions = ["normal", "medium", "semibold", "bold"] as const;
const timelineMarkerDisplayOptions = ["dot", "number", "icon"] as const;

const spacingClassMap = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
  xl: "gap-9",
} as const;

const paddingClassMap = {
  sm: "px-4 py-6",
  md: "px-4 py-8",
  lg: "px-6 py-10",
} as const;

const sectionSpacingClassMap = {
  none: "my-0",
  sm: "my-4",
  md: "my-8",
  lg: "my-12",
} as const;

const maxWidthClassMap = {
  none: "max-w-none",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
} as const;

const markerDotSizeClassMap = {
  sm: "h-2.5 w-2.5",
  md: "h-3.5 w-3.5",
  lg: "h-5 w-5",
} as const;

const markerFilledSizeClassMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

const markerContentSizeClassMap = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

const titleSizeClassMap = {
  none: "",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
} as const;

const descriptionSizeClassMap = {
  none: "",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
} as const;

const titleWeightClassMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

const timelineStatusLabelMap: Record<TimelineStatus, string> = {
  upcoming: "Upcoming",
  current: "Current",
  complete: "Complete",
};

const timelineStatusClassMap: Record<TimelineStatus, string> = {
  upcoming: "border-border/70 bg-muted/50 text-[var(--color-text)]/75",
  current: "border-transparent bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  complete: "border-transparent bg-emerald-500/15 text-emerald-700",
};

const textAlignClassMap = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

const itemAlignClassMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

const justifyClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

const thicknessValueMap = {
  "1": "1px",
  "2": "2px",
  "3": "3px",
  "4": "4px",
} as const;

const connectorWidthMap = {
  none: "1rem",
  sm: "2rem",
  md: "3rem",
  lg: "4rem",
  xl: "5rem",
} as const;

const compactConnectorWidthMap = {
  none: "0.75rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "2.5rem",
} as const;

const isEnumValue = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && options.includes(value as T);

const resolveTrimmedOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const resolveTimelineIcon = (value: unknown) => {
  const trimmed = resolveTrimmedOptionalString(value);
  return trimmed ? trimmed.slice(0, 16) : undefined;
};

const createStepId = (index: number) => `step-${index + 1}`;

const resolveHeadingId = (title: string | undefined) => {
  const normalized = title
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized ? `timeline-heading-${normalized.slice(0, 48)}` : undefined;
};

function normalizeTimelineStepCta(value: TimelineStep["cta"]): TimelineStep["cta"] {
  if (!value || typeof value.label !== "string" || typeof value.href !== "string") return undefined;
  const label = value.label.trim();
  const href = normalizeWidgetSafeHref(value.href, widgetHrefOptions);
  if (!label || !href) return undefined;
  return { label, href };
}

function normalizeTimelineStepLink(value: TimelineStep["link"]): TimelineStep["link"] {
  if (!value || typeof value.href !== "string") return undefined;
  const href = normalizeWidgetSafeHref(value.href, widgetHrefOptions);
  if (!href) return undefined;
  return compactObject({
    href,
    label: resolveTrimmedOptionalString(value.label),
  }) as TimelineStepLink;
}

export const timelineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    mode: {
      enum: ["process", "axis", "chronology", "alternating"],
    },
    steps: {
      type: "array",
      minItems: timelineStepMin,
      maxItems: timelineStepMax,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          icon: { type: "string" },
          accent: { type: "string" },
          date: { type: "string" },
          dateLabel: { type: "string" },
          status: { enum: [...timelineStatusOptions] },
          markerIcon: { type: "string" },
          markerIconColor: { type: "string" },
          markerBackgroundColor: { type: "string" },
          cta: {
            type: "object",
            additionalProperties: false,
            required: ["label", "href"],
            properties: {
              label: { type: "string" },
              href: { type: "string" },
            },
          },
          link: {
            type: "object",
            additionalProperties: false,
            properties: {
              href: { type: "string" },
              label: { type: "string" },
            },
          },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        orientation: { enum: [...timelineOrientationOptions] },
        align: { enum: [...timelineAlignOptions] },
        spacing: { enum: [...timelineSpacingOptions] },
        labelPosition: { enum: [...timelineLabelPositionOptions] },
        padding: { enum: [...timelinePaddingOptions] },
        sectionSpacing: { enum: [...timelineSectionSpacingOptions] },
        maxWidth: { enum: [...timelineMaxWidthOptions] },
      },
    },
    guides: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        style: { enum: [...timelineGuideStyleOptions] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        lineStyle: { enum: [...timelineLineStyleOptions] },
        thickness: { enum: [...timelineThicknessOptions] },
        markerSize: { enum: [...timelineMarkerSizeOptions] },
        markerDisplay: { enum: [...timelineMarkerDisplayOptions] },
        lineColor: { type: "string" },
        markerColor: { type: "string" },
        titleColor: { type: "string" },
        descriptionColor: { type: "string" },
        titleSize: { enum: [...timelineTitleSizeOptions] },
        descriptionSize: { enum: [...timelineDescriptionSizeOptions] },
        titleWeight: { enum: [...timelineTitleWeightOptions] },
      },
    },
    background: {
      type: "object",
      additionalProperties: false,
      properties: {
        color: { type: "string" },
      },
    },
  },
};

export const normalizeTimelineStepCount = (value: number) => {
  if (!Number.isFinite(value)) return timelineStepMin;
  return Math.min(timelineStepMax, Math.max(timelineStepMin, Math.floor(value)));
};

export function normalizeTimelineSteps(
  steps: TimelineStep[] | undefined,
  desiredCount?: number
): TimelineStep[] {
  const source = Array.isArray(steps) ? steps : [];
  const fallbackTitles = ["Discovery", "Planning", "Build", "Launch"];
  const targetCount =
    typeof desiredCount === "number"
      ? normalizeTimelineStepCount(desiredCount)
      : normalizeTimelineStepCount(source.length > 0 ? source.length : timelineStepMin);

  const normalized: TimelineStep[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createStepId(index);
    if (usedIds.has(id)) {
      let candidateIndex = 1;
      while (usedIds.has(`step-${candidateIndex}`)) {
        candidateIndex += 1;
      }
      id = `step-${candidateIndex}`;
    }
    usedIds.add(id);

    const title =
      typeof base.title === "string" && base.title.trim().length > 0
        ? base.title.trim()
        : (fallbackTitles[index] ?? `Step ${index + 1}`);

    normalized.push({
      id,
      title,
      description: resolveTrimmedOptionalString(base.description),
      icon: resolveTimelineIcon(base.icon),
      accent: resolveTrimmedOptionalString(base.accent),
      date: resolveTrimmedOptionalString(base.date),
      dateLabel: resolveTrimmedOptionalString(base.dateLabel),
      status: isEnumValue(base.status, timelineStatusOptions) ? base.status : undefined,
      markerIcon: resolveTimelineIcon(base.markerIcon),
      markerIconColor: resolveTrimmedOptionalString(base.markerIconColor),
      markerBackgroundColor: resolveTrimmedOptionalString(base.markerBackgroundColor),
      cta: normalizeTimelineStepCta(base.cta),
      link: normalizeTimelineStepLink(base.link),
    });
  }

  return normalized;
}

export const timelineDefaults: TimelineData = {
  mode: "axis",
  steps: normalizeTimelineSteps([
    { id: "step-1", title: "Discovery", description: "Define goals and context." },
    { id: "step-2", title: "Planning", description: "Align scope and milestones." },
    { id: "step-3", title: "Build", description: "Deliver and iterate." },
  ]),
  layout: {
    orientation: "horizontal",
    align: "center",
    spacing: "md",
    labelPosition: "top",
    padding: "md",
    sectionSpacing: "none",
    maxWidth: "6xl",
  },
  guides: { enabled: true, style: "dashed" },
  style: {
    lineStyle: "solid",
    thickness: "2",
    markerSize: "md",
    markerDisplay: "dot",
    titleSize: "base",
    descriptionSize: "xs",
    titleWeight: "semibold",
  },
  background: { color: "transparent" },
};

export const resolveTimelineVariant = (variant: string): TimelineVariantId => {
  if (variant === "cards" || variant === "compact") return variant;
  return "milestones";
};

export const resolveTimelineMode = (mode: TimelineData["mode"], variant: string): TimelineMode => {
  if (mode === "process" || mode === "axis" || mode === "chronology" || mode === "alternating") {
    return mode;
  }
  const resolvedVariant = resolveTimelineVariant(variant);
  if (resolvedVariant === "cards") return "chronology";
  if (resolvedVariant === "compact") return "process";
  return "axis";
};

export function normalizeTimelineData(data: TimelineData, variant = "milestones"): TimelineData {
  const normalizedSteps = normalizeTimelineSteps(data.steps);
  const layoutDefaults = timelineDefaults.layout ?? {};
  const styleDefaults = timelineDefaults.style ?? {};
  const guidesDefaults = timelineDefaults.guides ?? {};

  return {
    header: compactObject({
      title: resolveTrimmedOptionalString(data.header?.title),
      description: resolveTrimmedOptionalString(data.header?.description),
    }) as TimelineData["header"],
    mode: resolveTimelineMode(data.mode, variant),
    steps: normalizedSteps,
    layout: {
      orientation: isEnumValue(data.layout?.orientation, timelineOrientationOptions)
        ? data.layout?.orientation
        : layoutDefaults.orientation,
      align: isEnumValue(data.layout?.align, timelineAlignOptions)
        ? data.layout?.align
        : layoutDefaults.align,
      spacing: isEnumValue(data.layout?.spacing, timelineSpacingOptions)
        ? data.layout?.spacing
        : layoutDefaults.spacing,
      labelPosition: isEnumValue(data.layout?.labelPosition, timelineLabelPositionOptions)
        ? data.layout?.labelPosition
        : layoutDefaults.labelPosition,
      padding: isEnumValue(data.layout?.padding, timelinePaddingOptions)
        ? data.layout?.padding
        : layoutDefaults.padding,
      sectionSpacing: isEnumValue(data.layout?.sectionSpacing, timelineSectionSpacingOptions)
        ? data.layout?.sectionSpacing
        : layoutDefaults.sectionSpacing,
      maxWidth: isEnumValue(data.layout?.maxWidth, timelineMaxWidthOptions)
        ? data.layout?.maxWidth
        : layoutDefaults.maxWidth,
    },
    guides: {
      enabled:
        typeof data.guides?.enabled === "boolean" ? data.guides.enabled : guidesDefaults.enabled,
      style: isEnumValue(data.guides?.style, timelineGuideStyleOptions)
        ? data.guides?.style
        : guidesDefaults.style,
    },
    style: {
      lineStyle: isEnumValue(data.style?.lineStyle, timelineLineStyleOptions)
        ? data.style?.lineStyle
        : styleDefaults.lineStyle,
      thickness: isEnumValue(data.style?.thickness, timelineThicknessOptions)
        ? data.style?.thickness
        : styleDefaults.thickness,
      markerSize: isEnumValue(data.style?.markerSize, timelineMarkerSizeOptions)
        ? data.style?.markerSize
        : styleDefaults.markerSize,
      markerDisplay: isEnumValue(data.style?.markerDisplay, timelineMarkerDisplayOptions)
        ? data.style?.markerDisplay
        : styleDefaults.markerDisplay,
      lineColor: resolveTrimmedOptionalString(data.style?.lineColor),
      markerColor: resolveTrimmedOptionalString(data.style?.markerColor),
      titleColor: resolveTrimmedOptionalString(data.style?.titleColor),
      descriptionColor: resolveTrimmedOptionalString(data.style?.descriptionColor),
      titleSize: isEnumValue(data.style?.titleSize, timelineTitleSizeOptions)
        ? data.style?.titleSize
        : styleDefaults.titleSize,
      descriptionSize: isEnumValue(data.style?.descriptionSize, timelineDescriptionSizeOptions)
        ? data.style?.descriptionSize
        : styleDefaults.descriptionSize,
      titleWeight: isEnumValue(data.style?.titleWeight, timelineTitleWeightOptions)
        ? data.style?.titleWeight
        : styleDefaults.titleWeight,
    },
    background:
      data.background !== undefined
        ? compactObject({
            color: resolveTrimmedOptionalString(data.background?.color) ?? data.background?.color,
          })
        : timelineDefaults.background,
  };
}

export const resolveTimelineLayout = (
  layout: TimelineData["layout"]
): Required<NonNullable<TimelineData["layout"]>> => ({
  orientation: isEnumValue(layout?.orientation, timelineOrientationOptions)
    ? layout.orientation
    : "horizontal",
  align: isEnumValue(layout?.align, timelineAlignOptions) ? layout.align : "center",
  spacing: isEnumValue(layout?.spacing, timelineSpacingOptions) ? layout.spacing : "md",
  labelPosition: isEnumValue(layout?.labelPosition, timelineLabelPositionOptions)
    ? layout.labelPosition
    : "top",
  padding: isEnumValue(layout?.padding, timelinePaddingOptions) ? layout.padding : "md",
  sectionSpacing: isEnumValue(layout?.sectionSpacing, timelineSectionSpacingOptions)
    ? layout.sectionSpacing
    : "none",
  maxWidth: isEnumValue(layout?.maxWidth, timelineMaxWidthOptions) ? layout.maxWidth : "6xl",
});

export const resolveTimelineGuides = (
  guides: TimelineData["guides"]
): Required<NonNullable<TimelineData["guides"]>> => ({
  enabled: typeof guides?.enabled === "boolean" ? guides.enabled : true,
  style: isEnumValue(guides?.style, timelineGuideStyleOptions) ? guides.style : "dashed",
});

export const resolveTimelineStyle = (
  style: TimelineData["style"]
): Required<
  Pick<
    NonNullable<TimelineData["style"]>,
    "lineStyle" | "thickness" | "markerSize" | "markerDisplay" | "titleWeight"
  >
> &
  Pick<
    NonNullable<TimelineData["style"]>,
    | "lineColor"
    | "markerColor"
    | "titleColor"
    | "descriptionColor"
    | "titleSize"
    | "descriptionSize"
  > => ({
  lineStyle: isEnumValue(style?.lineStyle, timelineLineStyleOptions) ? style.lineStyle : "solid",
  thickness: isEnumValue(style?.thickness, timelineThicknessOptions) ? style.thickness : "2",
  markerSize: isEnumValue(style?.markerSize, timelineMarkerSizeOptions) ? style.markerSize : "md",
  markerDisplay: isEnumValue(style?.markerDisplay, timelineMarkerDisplayOptions)
    ? style.markerDisplay
    : "dot",
  lineColor: resolveTrimmedOptionalString(style?.lineColor),
  markerColor: resolveTrimmedOptionalString(style?.markerColor),
  titleColor: resolveTrimmedOptionalString(style?.titleColor),
  descriptionColor: resolveTrimmedOptionalString(style?.descriptionColor),
  titleSize: isEnumValue(style?.titleSize, timelineTitleSizeOptions) ? style.titleSize : "base",
  descriptionSize: isEnumValue(style?.descriptionSize, timelineDescriptionSizeOptions)
    ? style.descriptionSize
    : "xs",
  titleWeight: isEnumValue(style?.titleWeight, timelineTitleWeightOptions)
    ? style.titleWeight
    : "semibold",
});

type ResolvedTimelineLink = {
  href: string;
  rel?: string;
  ariaLabel: string;
};

function resolveStepLink(step: TimelineStep): ResolvedTimelineLink | undefined {
  if (step.cta || !step.link?.href) return undefined;
  return {
    href: step.link.href,
    rel:
      step.link.href.startsWith("http://") || step.link.href.startsWith("https://")
        ? "noopener noreferrer"
        : undefined,
    ariaLabel: step.link.label ?? step.title,
  };
}

function renderDateNode(step: TimelineStep) {
  if (step.date) {
    return <time dateTime={step.date}>{step.dateLabel ?? step.date}</time>;
  }
  if (step.dateLabel) {
    return <span>{step.dateLabel}</span>;
  }
  return null;
}

function renderMarker(
  step: TimelineStep,
  index: number,
  style: ReturnType<typeof resolveTimelineStyle>,
  lineThickness: string
) {
  const markerAccent =
    step.markerBackgroundColor ?? step.accent ?? style.markerColor ?? "var(--color-primary)";
  const markerDisplay =
    style.markerDisplay === "icon" && !(step.markerIcon ?? step.icon) ? "dot" : style.markerDisplay;

  if (markerDisplay === "dot") {
    return (
      <span
        className={joinClasses(
          "inline-flex shrink-0 rounded-full border",
          markerDotSizeClassMap[style.markerSize]
        )}
        style={{
          backgroundColor: markerAccent,
          borderColor: markerAccent,
          borderWidth: lineThickness,
          borderStyle: style.lineStyle,
        }}
      />
    );
  }

  const markerText =
    markerDisplay === "number" ? String(index + 1) : (step.markerIcon ?? step.icon ?? "");
  const markerIconColor = step.markerIconColor ?? "var(--color-background)";

  return (
    <span
      className={joinClasses(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold leading-none",
        markerFilledSizeClassMap[style.markerSize],
        markerContentSizeClassMap[style.markerSize]
      )}
      style={{
        backgroundColor: markerAccent,
        borderColor: markerAccent,
        borderWidth: lineThickness,
        borderStyle: style.lineStyle,
        color: markerIconColor,
      }}
    >
      <span aria-hidden="true">{markerText}</span>
    </span>
  );
}

function renderStepText({
  step,
  align,
  titleColor,
  descriptionColor,
  titleSize,
  descriptionSize,
  titleWeight,
  compact = false,
  showDateMeta = true,
}: {
  step: TimelineStep;
  align: TimelineAlign;
  titleColor: string;
  descriptionColor: string;
  titleSize: TimelineTitleSize;
  descriptionSize: TimelineDescriptionSize;
  titleWeight: TimelineTitleWeight;
  compact?: boolean;
  showDateMeta?: boolean;
}) {
  const titleSizeClass =
    titleSize === "none"
      ? undefined
      : compact
        ? "text-sm"
        : (titleSizeClassMap[titleSize] ?? "text-base");
  const titleWeightClass = titleWeightClassMap[titleWeight] ?? "font-semibold";

  return (
    <div className={joinClasses("space-y-1", textAlignClassMap[align] ?? "text-center")}>
      {step.status || (showDateMeta && (step.date || step.dateLabel)) ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {step.status ? (
            <span
              className={joinClasses(
                "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
                timelineStatusClassMap[step.status]
              )}
              data-timeline-status={step.status}
            >
              {timelineStatusLabelMap[step.status]}
            </span>
          ) : null}
          {showDateMeta ? renderDateNode(step) : null}
        </div>
      ) : null}
      {titleSizeClass || step.icon ? (
        <div className="flex items-center gap-2">
          {step.icon ? (
            <span className="text-sm leading-none" aria-hidden="true">
              {step.icon}
            </span>
          ) : null}
          {titleSizeClass ? (
            <span
              className={joinClasses(titleSizeClass, titleWeightClass)}
              style={compactStyle({ color: titleColor })}
            >
              {step.title}
            </span>
          ) : null}
        </div>
      ) : null}
      {!compact && step.description ? (
        <p
          className={descriptionSizeClassMap[descriptionSize] ?? "text-xs"}
          style={compactStyle({ color: descriptionColor })}
        >
          {step.description}
        </p>
      ) : null}
      {!compact && step.cta ? (
        <a
          className="inline-flex text-xs font-medium underline underline-offset-2"
          href={step.cta.href}
          rel={
            step.cta.href.startsWith("http://") || step.cta.href.startsWith("https://")
              ? "noopener noreferrer"
              : undefined
          }
        >
          {step.cta.label}
        </a>
      ) : null}
    </div>
  );
}

function TimelineStepSurface({
  step,
  className,
  children,
}: {
  step: TimelineStep;
  className: string;
  children: ReactNode;
}) {
  const link = resolveStepLink(step);
  if (!link) return <div className={className}>{children}</div>;
  return (
    <a
      className={joinClasses(
        className,
        "transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      )}
      href={link.href}
      rel={link.rel}
      aria-label={link.ariaLabel}
    >
      {children}
    </a>
  );
}

function TimelineMilestonesLayout({
  steps,
  layout,
  guides,
  style,
  listLabel,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
  listLabel: string;
}) {
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";
  const connectorWidth = connectorWidthMap[layout.spacing] ?? "3rem";
  const connectorStyle = {
    backgroundColor: lineColor,
    borderStyle: guides.style,
  } satisfies CSSProperties;

  if (layout.orientation === "vertical") {
    return (
      <ol
        aria-label={listLabel}
        className={joinClasses("flex flex-col", spacingClassMap[layout.spacing] ?? "gap-5")}
      >
        {steps.map((step, index) => {
          const textNode = renderStepText({
            step,
            align: layout.align,
            titleColor,
            descriptionColor,
            titleSize: style.titleSize ?? "base",
            descriptionSize: style.descriptionSize ?? "xs",
            titleWeight: style.titleWeight,
          });

          return (
            <li
              key={step.id ?? `${step.title}-${index}`}
              aria-current={step.status === "current" ? "step" : undefined}
              data-timeline-step={step.id ?? index}
            >
              <TimelineStepSurface
                step={step}
                className={joinClasses(
                  "flex w-full gap-4 rounded-xl p-1",
                  layout.labelPosition === "top" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={joinClasses("min-w-0 flex-1", itemAlignClassMap[layout.align])}>
                  {textNode}
                </div>
                <div className="flex flex-col items-center">
                  {renderMarker(step, index, style, lineThickness)}
                  {guides.enabled && index < steps.length - 1 ? (
                    <span
                      className="mt-1 h-8"
                      style={{
                        ...connectorStyle,
                        width: lineThickness,
                      }}
                    />
                  ) : null}
                </div>
              </TimelineStepSurface>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <ol
        aria-label={listLabel}
        className={joinClasses(
          "flex min-w-full flex-nowrap",
          justifyClassMap[layout.align] ?? "justify-center"
        )}
      >
        {steps.map((step, index) => {
          const textNode = renderStepText({
            step,
            align: layout.align,
            titleColor,
            descriptionColor,
            titleSize: style.titleSize ?? "base",
            descriptionSize: style.descriptionSize ?? "xs",
            titleWeight: style.titleWeight,
          });

          return (
            <li
              key={step.id ?? `${step.title}-${index}`}
              className={joinClasses("min-w-[11rem]", itemAlignClassMap[layout.align])}
              style={{ marginRight: index < steps.length - 1 ? connectorWidth : undefined }}
              aria-current={step.status === "current" ? "step" : undefined}
              data-timeline-step={step.id ?? index}
            >
              <TimelineStepSurface step={step} className="block rounded-xl p-1">
                {layout.labelPosition === "top" ? textNode : null}
                <div
                  className={joinClasses(
                    "my-2 flex items-center",
                    layout.align === "end"
                      ? "justify-end"
                      : layout.align === "center"
                        ? "justify-center"
                        : "justify-start"
                  )}
                >
                  {renderMarker(step, index, style, lineThickness)}
                  {guides.enabled && index < steps.length - 1 ? (
                    <span
                      className="ml-2 block min-w-4 flex-1"
                      style={{
                        ...connectorStyle,
                        width: connectorWidth,
                        height: lineThickness,
                      }}
                    />
                  ) : null}
                </div>
                {layout.labelPosition === "bottom" ? textNode : null}
              </TimelineStepSurface>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TimelineCardsLayout({
  steps,
  layout,
  guides,
  style,
  listLabel,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
  listLabel: string;
}) {
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";

  return (
    <ol
      aria-label={listLabel}
      className={joinClasses(
        "grid w-full",
        spacingClassMap[layout.spacing] ?? "gap-5",
        layout.orientation === "vertical"
          ? "grid-cols-1"
          : steps.length > 3
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-3"
      )}
    >
      {steps.map((step, index) => (
        <li
          key={step.id ?? `${step.title}-${index}`}
          aria-current={step.status === "current" ? "step" : undefined}
          data-timeline-step={step.id ?? index}
        >
          <TimelineStepSurface
            step={step}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          >
            <div className="flex items-start gap-3">
              {renderMarker(step, index, style, lineThickness)}
              <div className="min-w-0 flex-1">
                {renderStepText({
                  step,
                  align: layout.align,
                  titleColor,
                  descriptionColor,
                  titleSize: style.titleSize ?? "base",
                  descriptionSize: style.descriptionSize ?? "xs",
                  titleWeight: style.titleWeight,
                })}
              </div>
            </div>
            {guides.enabled ? (
              <div
                className="mt-3"
                style={{
                  borderTopStyle: style.lineStyle,
                  borderTopWidth: lineThickness,
                  borderTopColor: lineColor,
                }}
              />
            ) : null}
          </TimelineStepSurface>
        </li>
      ))}
    </ol>
  );
}

function TimelineChronologyLayout({
  steps,
  layout,
  guides,
  style,
  listLabel,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
  listLabel: string;
}) {
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";

  return (
    <ol
      aria-label={listLabel}
      className={joinClasses("flex flex-col", spacingClassMap[layout.spacing] ?? "gap-5")}
    >
      {steps.map((step, index) => (
        <li
          key={step.id ?? `${step.title}-${index}`}
          className="grid gap-3 md:grid-cols-[minmax(0,clamp(8rem,24vw,14rem))_minmax(0,1fr)]"
          aria-current={step.status === "current" ? "step" : undefined}
          data-timeline-step={step.id ?? index}
        >
          <div className="break-words text-xs text-muted-foreground">
            {renderDateNode(step) ?? "Timeline step"}
          </div>
          <TimelineStepSurface
            step={step}
            className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          >
            <div className="flex flex-col items-center">
              {renderMarker(step, index, style, lineThickness)}
              {guides.enabled && index < steps.length - 1 ? (
                <span
                  className="mt-1 h-full min-h-8"
                  style={{
                    width: lineThickness,
                    backgroundColor: lineColor,
                    borderStyle: guides.style,
                  }}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              {renderStepText({
                step,
                align: layout.align,
                titleColor,
                descriptionColor,
                titleSize: style.titleSize ?? "base",
                descriptionSize: style.descriptionSize ?? "xs",
                titleWeight: style.titleWeight,
                showDateMeta: false,
              })}
            </div>
          </TimelineStepSurface>
        </li>
      ))}
    </ol>
  );
}

function TimelineAlternatingLayout({
  steps,
  layout,
  guides,
  style,
  listLabel,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
  listLabel: string;
}) {
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";

  return (
    <ol
      aria-label={listLabel}
      className={joinClasses("flex flex-col", spacingClassMap[layout.spacing] ?? "gap-5")}
    >
      {steps.map((step, index) => {
        const reverse = index % 2 === 1;

        return (
          <li
            key={step.id ?? `${step.title}-${index}`}
            className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]"
            aria-current={step.status === "current" ? "step" : undefined}
            data-timeline-step={step.id ?? index}
          >
            <TimelineStepSurface
              step={step}
              className={joinClasses(
                "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4",
                reverse ? "md:col-start-3 md:text-left" : "md:col-start-1 md:text-right"
              )}
            >
              <div className="mb-3 text-xs text-muted-foreground md:hidden">
                {renderDateNode(step)}
              </div>
              {renderStepText({
                step,
                align: reverse ? "start" : "end",
                titleColor,
                descriptionColor,
                titleSize: style.titleSize ?? "base",
                descriptionSize: style.descriptionSize ?? "xs",
                titleWeight: style.titleWeight,
                showDateMeta: false,
              })}
            </TimelineStepSurface>
            <div className="flex flex-col items-center md:col-start-2">
              {renderMarker(step, index, style, lineThickness)}
              {guides.enabled && index < steps.length - 1 ? (
                <span
                  className="mt-1 h-full min-h-10"
                  style={{
                    width: lineThickness,
                    backgroundColor: lineColor,
                    borderStyle: guides.style,
                  }}
                />
              ) : null}
            </div>
            <div
              className={joinClasses(
                "hidden break-words text-xs text-muted-foreground md:block",
                reverse ? "md:col-start-1 md:text-right" : "md:col-start-3 md:text-left"
              )}
            >
              {renderDateNode(step)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineCompactLayout({
  steps,
  layout,
  guides,
  style,
  listLabel,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
  listLabel: string;
}) {
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";
  const connectorWidth = compactConnectorWidthMap[layout.spacing] ?? "1.5rem";

  const list = (
    <ol
      aria-label={listLabel}
      className={joinClasses(
        "flex",
        layout.orientation === "vertical" ? "flex-col" : "w-max min-w-full flex-nowrap",
        spacingClassMap[layout.spacing] ?? "gap-5",
        layout.orientation === "horizontal"
          ? (justifyClassMap[layout.align] ?? "justify-center")
          : undefined
      )}
    >
      {steps.map((step, index) => (
        <li
          key={step.id ?? `${step.title}-${index}`}
          className={joinClasses(
            "flex items-center",
            layout.orientation === "vertical" ? "gap-3" : "gap-2"
          )}
          aria-current={step.status === "current" ? "step" : undefined}
          data-timeline-step={step.id ?? index}
        >
          <TimelineStepSurface step={step} className="flex items-center gap-2 rounded-xl p-1">
            {renderMarker(step, index, style, lineThickness)}
            {renderStepText({
              step,
              align: layout.align,
              titleColor,
              descriptionColor,
              titleSize: style.titleSize ?? "base",
              descriptionSize: style.descriptionSize ?? "xs",
              titleWeight: style.titleWeight,
              compact: true,
            })}
          </TimelineStepSurface>
          {guides.enabled && layout.orientation === "horizontal" && index < steps.length - 1 ? (
            <span
              className="mx-1 block"
              style={{
                width: connectorWidth,
                height: lineThickness,
                backgroundColor: lineColor,
                borderStyle: guides.style,
              }}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );

  if (layout.orientation === "horizontal") {
    return <div className="overflow-x-auto pb-1">{list}</div>;
  }

  return list;
}

export function TimelineBlock({ data, variant }: { data: TimelineData; variant: string }) {
  const resolvedVariant = resolveTimelineVariant(variant);
  const normalizedData = normalizeTimelineData(data, variant);
  const steps = normalizedData.steps;
  const mode = resolveTimelineMode(normalizedData.mode, variant);
  const layout = resolveTimelineLayout(normalizedData.layout);
  const guides = resolveTimelineGuides(normalizedData.guides);
  const style = resolveTimelineStyle(normalizedData.style);
  const backgroundStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalizedData.background?.color),
  });
  const sectionTitle = normalizedData.header?.title?.trim();
  const sectionDescription = normalizedData.header?.description?.trim();
  const sectionHeadingId = resolveHeadingId(sectionTitle);
  const listLabel = sectionTitle ? `${sectionTitle} steps` : "Timeline steps";
  const resolvedMaxWidth = steps.length <= 3 && layout.maxWidth === "6xl" ? "5xl" : layout.maxWidth;

  return (
    <section
      className={joinClasses(
        paddingClassMap[layout.padding] ?? "px-4 py-8",
        sectionSpacingClassMap[layout.sectionSpacing] ?? "my-0"
      )}
      style={backgroundStyle}
      aria-labelledby={sectionHeadingId}
      aria-label={sectionHeadingId ? undefined : "Timeline"}
    >
      <div
        className={joinClasses(
          "mx-auto w-full space-y-4",
          maxWidthClassMap[resolvedMaxWidth] ?? "max-w-6xl"
        )}
      >
        <div
          data-timeline-variant={resolvedVariant}
          data-timeline-mode={mode}
          data-timeline-orientation={layout.orientation}
          data-timeline-label-position={layout.labelPosition}
          data-timeline-padding={layout.padding}
          data-timeline-section-spacing={layout.sectionSpacing}
          data-timeline-max-width={layout.maxWidth}
          data-timeline-marker-display={style.markerDisplay}
          data-timeline-title-weight={style.titleWeight}
        >
          {sectionTitle || sectionDescription ? (
            <div className="space-y-2">
              {sectionTitle ? (
                <h2 id={sectionHeadingId} className="text-2xl font-semibold text-foreground">
                  {sectionTitle}
                </h2>
              ) : null}
              {sectionDescription ? (
                <p className="max-w-3xl text-sm text-foreground/80">{sectionDescription}</p>
              ) : null}
            </div>
          ) : null}

          {mode === "chronology" ? (
            <TimelineChronologyLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
              listLabel={listLabel}
            />
          ) : mode === "alternating" ? (
            <TimelineAlternatingLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
              listLabel={listLabel}
            />
          ) : mode === "process" || resolvedVariant === "compact" ? (
            <TimelineCompactLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
              listLabel={listLabel}
            />
          ) : resolvedVariant === "cards" ? (
            <TimelineCardsLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
              listLabel={listLabel}
            />
          ) : (
            <TimelineMilestonesLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
              listLabel={listLabel}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function createTimelineWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<TimelineData>>;
  visual: ComponentType<WidgetEditorProps<TimelineData>>;
  advanced: ComponentType<WidgetEditorProps<TimelineData>>;
}): WidgetDefinition<TimelineData> {
  return {
    type: "timeline",
    title: "Timeline",
    description: "Timeline of steps or milestones.",
    category: "content",
    variants: [
      {
        id: "milestones",
        label: "Milestones",
        description: "Markers with labels along a process line.",
      },
      {
        id: "cards",
        label: "Cards",
        description: "Step cards with stronger separation.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Minimal line with concise labels.",
      },
    ],
    schema: timelineSchema,
    defaults: timelineDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TimelineBlock,
  };
}

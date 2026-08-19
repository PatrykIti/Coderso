import type { CSSProperties, ComponentType, ReactNode } from "react";
import {
  Calendar,
  Check,
  Circle,
  CircleDot,
  Clock,
  Flag,
  Heart,
  Lightbulb,
  MapPin,
  Package,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideProps,
} from "lucide-react";
import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../services/theme/cssColorContract";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorBundle } from "../types";
import { compactObject, compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

// Presets are the block variants (one source of truth, no separate mode field).
export type TimelineVariantId =
  "vertical-right" | "vertical-left" | "alternating" | "alternating-opposite" | "cards" | "compact";
export type TimelineAxisPosition = "left" | "right" | "alternate" | "alternate-reverse";
export type TimelineDotVariant = "filled" | "outlined";
export type TimelineDotTone =
  "primary" | "secondary" | "success" | "error" | "warning" | "info" | "grey";
export type TimelineDotSize = "sm" | "md" | "lg";
// Any lucide icon name (kebab-case), or "none" for a plain dot.
export type TimelineDotIcon = string;
export type TimelineConnectorStyle = "solid" | "dashed";
export type TimelineThickness = "1" | "2" | "3" | "4";
export type TimelineTitleSize = "none" | "sm" | "base" | "lg" | "xl";
export type TimelineDescriptionSize = "none" | "xs" | "sm" | "base" | "lg";
export type TimelineTitleWeight = "normal" | "medium" | "semibold" | "bold";
export type TimelineStatus = "upcoming" | "current" | "complete";
export type TimelineSpacing = "none" | "sm" | "md" | "lg" | "xl";
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
  // MUI TimelineOppositeContent: editorial text and an optional machine-readable date.
  oppositeContent?: string;
  oppositeDate?: string;
  status?: TimelineStatus;
  // Per-step lucide icon rendered inside the dot (overrides the global dot icon).
  markerIcon?: TimelineDotIcon;
  markerIconColor?: string;
  // Per-step overrides for the MUI dot variant/tone.
  dotVariant?: TimelineDotVariant;
  dotTone?: TimelineDotTone;
  cta?: TimelineStepCta;
  link?: TimelineStepLink;
};

export type TimelineData = {
  header?: {
    title?: string;
    description?: string;
  };
  steps: TimelineStep[];
  axis?: {
    position?: TimelineAxisPosition;
  };
  dot?: {
    variant?: TimelineDotVariant;
    tone?: TimelineDotTone;
    size?: TimelineDotSize;
    icon?: TimelineDotIcon;
  };
  connector?: {
    show?: boolean;
    style?: TimelineConnectorStyle;
    thickness?: TimelineThickness;
  };
  typography?: {
    titleSize?: TimelineTitleSize;
    titleWeight?: TimelineTitleWeight;
    descriptionSize?: TimelineDescriptionSize;
  };
  spacing?: {
    gap?: TimelineSpacing;
    padding?: TimelinePadding;
    sectionSpacing?: TimelineSectionSpacing;
    maxWidth?: TimelineMaxWidth;
  };
  background?: {
    color?: string;
  };
};

// Editor-visible field groups, gated per preset by the capability table.
export type TimelineFieldKey =
  | "axisPosition"
  | "oppositeContent"
  | "dotVariant"
  | "dotTone"
  | "dotSize"
  | "dotIcon"
  | "connector"
  | "stepStatus"
  | "stepCta"
  | "stepLink"
  | "typography"
  | "spacing"
  | "background"
  | "header";

export type TimelineVariantCapability = {
  id: TimelineVariantId;
  label: string;
  description: string;
  orientation: "vertical" | "horizontal";
  surface: "plain" | "cards";
  visibleFields: ReadonlySet<TimelineFieldKey>;
  allowedAxisPositions: readonly TimelineAxisPosition[];
  fixedAxisPosition?: TimelineAxisPosition;
  steps: { min: number; max: number; recommended: number };
};

export const timelineStepMin = 3;
export const timelineStepMax = 8;

const timelineAxisPositionOptions = ["left", "right", "alternate", "alternate-reverse"] as const;
const timelineDotVariantOptions = ["filled", "outlined"] as const;
const timelineDotToneOptions = [
  "primary",
  "secondary",
  "success",
  "error",
  "warning",
  "info",
  "grey",
] as const;
const timelineDotSizeOptions = ["sm", "md", "lg"] as const;
// Curated quick-pick icons surfaced directly in the editor grid (all valid lucide names).
export const timelineDotQuickIconNames = [
  "check",
  "circle",
  "circle-dot",
  "star",
  "rocket",
  "flag",
  "calendar",
  "clock",
  "map-pin",
  "sparkles",
  "zap",
  "trophy",
  "heart",
  "lightbulb",
  "package",
  "target",
] as const;
const timelineConnectorStyleOptions = ["solid", "dashed"] as const;
const timelineThicknessOptions = ["1", "2", "3", "4"] as const;
const timelineTitleSizeOptions = ["none", "sm", "base", "lg", "xl"] as const;
const timelineDescriptionSizeOptions = ["none", "xs", "sm", "base", "lg"] as const;
const timelineTitleWeightOptions = ["normal", "medium", "semibold", "bold"] as const;
const timelineStatusOptions = ["upcoming", "current", "complete"] as const;
const timelineSpacingOptions = ["none", "sm", "md", "lg", "xl"] as const;
const timelinePaddingOptions = ["sm", "md", "lg"] as const;
const timelineSectionSpacingOptions = ["none", "sm", "md", "lg"] as const;
const timelineMaxWidthOptions = ["none", "4xl", "5xl", "6xl", "7xl", "full"] as const;

export const timelineVariantIds: readonly TimelineVariantId[] = [
  "vertical-right",
  "vertical-left",
  "alternating",
  "alternating-opposite",
  "cards",
  "compact",
];

// Quick-pick icons are statically imported (tree-shaken) so the common set renders
// synchronously without pulling the full lucide library into the admin initial bundle.
export const timelineQuickIconComponents: Record<string, ComponentType<LucideProps>> = {
  check: Check,
  circle: Circle,
  "circle-dot": CircleDot,
  star: Star,
  rocket: Rocket,
  flag: Flag,
  calendar: Calendar,
  clock: Clock,
  "map-pin": MapPin,
  sparkles: Sparkles,
  zap: Zap,
  trophy: Trophy,
  heart: Heart,
  lightbulb: Lightbulb,
  package: Package,
  target: Target,
};

// The full lucide set lives in a dynamically-imported module so it is code-split out
// of the admin initial static graph. resolveLucideIcon returns quick icons
// synchronously and full icons once loaded; unknown/unloaded names fall back to a dot.
let fullIconComponents: Record<string, ComponentType<LucideProps>> | null = null;
let fullTimelineIconsPromise: Promise<{
  components: Record<string, ComponentType<LucideProps>>;
  names: string[];
}> | null = null;

export function loadFullTimelineIcons() {
  if (!fullTimelineIconsPromise) {
    fullTimelineIconsPromise = import("./timelineLucideIcons").then((module) => {
      fullIconComponents = module.lucideKebabIconComponents;
      return { components: module.lucideKebabIconComponents, names: module.lucideIconNames };
    });
  }
  return fullTimelineIconsPromise;
}

export function resolveLucideIcon(
  name: string | undefined
): ComponentType<LucideProps> | undefined {
  if (!name || name === "none") return undefined;
  return timelineQuickIconComponents[name] ?? fullIconComponents?.[name];
}

// Preload the full set off the initial graph: eagerly on the server (so SSR resolves
// arbitrary icons), lazily in the browser (the admin editor triggers it on demand).
if (typeof window === "undefined") {
  void loadFullTimelineIcons();
}

// Semantic dot tones mapped to theme tokens. The front theme has no native
// success/warning/info tokens, so they alias the closest available token.
export const dotToneToken: Record<TimelineDotTone, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  success: "var(--color-primary)",
  error: "var(--color-destructive, var(--color-text))",
  warning: "var(--color-accent)",
  info: "var(--color-secondary)",
  grey: "var(--color-border)",
};

// Single source of truth: editor option visibility, render decisions, and
// normalize coercion all read from this table so "shown ⇒ rendered" holds.
const sharedStepFields: TimelineFieldKey[] = [
  "dotVariant",
  "dotTone",
  "dotSize",
  "dotIcon",
  "stepStatus",
  "stepCta",
  "stepLink",
  "typography",
  "spacing",
  "background",
  "header",
];

export const timelineVariantCapabilities: Record<TimelineVariantId, TimelineVariantCapability> = {
  "vertical-right": {
    id: "vertical-right",
    label: "Vertical — content right",
    description: "Single column with the axis on the left and content on the right.",
    orientation: "vertical",
    surface: "plain",
    visibleFields: new Set<TimelineFieldKey>([...sharedStepFields, "connector"]),
    allowedAxisPositions: [],
    fixedAxisPosition: "right",
    steps: { min: timelineStepMin, max: timelineStepMax, recommended: 4 },
  },
  "vertical-left": {
    id: "vertical-left",
    label: "Vertical — content left",
    description: "Single column with the axis on the right and content on the left.",
    orientation: "vertical",
    surface: "plain",
    visibleFields: new Set<TimelineFieldKey>([...sharedStepFields, "connector"]),
    allowedAxisPositions: [],
    fixedAxisPosition: "left",
    steps: { min: timelineStepMin, max: timelineStepMax, recommended: 4 },
  },
  alternating: {
    id: "alternating",
    label: "Alternating",
    description: "Zigzag layout with a centered axis and content alternating sides.",
    orientation: "vertical",
    surface: "plain",
    visibleFields: new Set<TimelineFieldKey>([...sharedStepFields, "connector", "axisPosition"]),
    allowedAxisPositions: ["alternate", "alternate-reverse"],
    steps: { min: timelineStepMin, max: timelineStepMax, recommended: 5 },
  },
  "alternating-opposite": {
    id: "alternating-opposite",
    label: "Alternating + opposite content",
    description: "Zigzag layout with secondary content on the opposite side of the axis.",
    orientation: "vertical",
    surface: "plain",
    visibleFields: new Set<TimelineFieldKey>([
      ...sharedStepFields,
      "connector",
      "axisPosition",
      "oppositeContent",
    ]),
    allowedAxisPositions: ["alternate", "alternate-reverse"],
    steps: { min: timelineStepMin, max: timelineStepMax, recommended: 5 },
  },
  cards: {
    id: "cards",
    label: "Cards",
    description: "Standalone cards in a responsive grid with a dot per card.",
    orientation: "vertical",
    surface: "cards",
    visibleFields: new Set<TimelineFieldKey>(sharedStepFields),
    allowedAxisPositions: [],
    steps: { min: timelineStepMin, max: timelineStepMax, recommended: 6 },
  },
  compact: {
    id: "compact",
    label: "Compact / horizontal",
    description: "Minimal horizontal process strip for short, sequential steps.",
    orientation: "horizontal",
    surface: "plain",
    visibleFields: new Set<TimelineFieldKey>([
      "dotVariant",
      "dotTone",
      "dotSize",
      "dotIcon",
      "connector",
      "stepStatus",
      "stepCta",
      "typography",
      "spacing",
      "background",
      "header",
    ]),
    allowedAxisPositions: [],
    steps: { min: timelineStepMin, max: timelineStepMax, recommended: 4 },
  },
};

export function resolveTimelineCapability(variant: string): TimelineVariantCapability {
  return (
    timelineVariantCapabilities[variant as TimelineVariantId] ??
    timelineVariantCapabilities["vertical-right"]
  );
}

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const widgetHrefOptions = {
  allowRelative: true,
  allowHash: true,
  allowHttp: true,
} as const;

const gapClassMap: Record<TimelineSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
  xl: "gap-9",
};

const compactConnectorWidthMap: Record<TimelineSpacing, string> = {
  none: "0.75rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "2.5rem",
};

const paddingClassMap: Record<TimelinePadding, string> = {
  sm: "px-4 py-6",
  md: "px-4 py-8",
  lg: "px-6 py-10",
};

const sectionSpacingClassMap: Record<TimelineSectionSpacing, string> = {
  none: "my-0",
  sm: "my-4",
  md: "my-8",
  lg: "my-12",
};

const maxWidthClassMap: Record<TimelineMaxWidth, string> = {
  none: "max-w-none",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

const dotPlainSizeMap: Record<TimelineDotSize, string> = {
  sm: "h-2.5 w-2.5",
  md: "h-3.5 w-3.5",
  lg: "h-5 w-5",
};

const dotIconWrapperSizeMap: Record<TimelineDotSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const dotIconSvgSizeMap: Record<TimelineDotSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const titleSizeClassMap: Record<TimelineTitleSize, string> = {
  none: "",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const descriptionSizeClassMap: Record<TimelineDescriptionSize, string | undefined> = {
  none: undefined,
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const titleWeightClassMap: Record<TimelineTitleWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const thicknessValueMap: Record<TimelineThickness, string> = {
  "1": "1px",
  "2": "2px",
  "3": "3px",
  "4": "4px",
};

const timelineStatusLabelMap: Record<TimelineStatus, string> = {
  upcoming: "Upcoming",
  current: "Current",
  complete: "Complete",
};

const timelineStatusClassMap: Record<TimelineStatus, string> = {
  upcoming: "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]/70",
  current: "border-transparent bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  complete: "border-transparent bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
};

const isEnumValue = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && options.includes(value as T);

const enumOr = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  isEnumValue(value, options) ? value : fallback;

const resolveTrimmedOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

// Accept any kebab-case icon name (validated by shape, not by membership, so the full
// lucide set need not be loaded to persist a choice). Unknown names render as a plain
// dot via resolveLucideIcon's fallback.
const timelineIconNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const resolveTimelineDotIconValue = (value: unknown): TimelineDotIcon | undefined => {
  if (value === "none") return "none";
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 && trimmed.length <= 64 && timelineIconNamePattern.test(trimmed)
    ? trimmed
    : undefined;
};

const resolveRenderableDotIcon = (value: TimelineDotIcon | undefined): string | undefined =>
  value && value !== "none" ? value : undefined;

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

const timelineColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS.authoring,
    },
  ],
} as const;

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
          oppositeContent: { type: "string" },
          oppositeDate: { type: "string" },
          status: { enum: [...timelineStatusOptions] },
          markerIcon: { type: "string" },
          markerIconColor: timelineColorValueSchema,
          dotVariant: { enum: [...timelineDotVariantOptions] },
          dotTone: { enum: [...timelineDotToneOptions] },
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
    axis: {
      type: "object",
      additionalProperties: false,
      properties: {
        position: { enum: [...timelineAxisPositionOptions] },
      },
    },
    dot: {
      type: "object",
      additionalProperties: false,
      properties: {
        variant: { enum: [...timelineDotVariantOptions] },
        tone: { enum: [...timelineDotToneOptions] },
        size: { enum: [...timelineDotSizeOptions] },
        icon: { type: "string" },
      },
    },
    connector: {
      type: "object",
      additionalProperties: false,
      properties: {
        show: { type: "boolean" },
        style: { enum: [...timelineConnectorStyleOptions] },
        thickness: { enum: [...timelineThicknessOptions] },
      },
    },
    typography: {
      type: "object",
      additionalProperties: false,
      properties: {
        titleSize: { enum: [...timelineTitleSizeOptions] },
        titleWeight: { enum: [...timelineTitleWeightOptions] },
        descriptionSize: { enum: [...timelineDescriptionSizeOptions] },
      },
    },
    spacing: {
      type: "object",
      additionalProperties: false,
      properties: {
        gap: { enum: [...timelineSpacingOptions] },
        padding: { enum: [...timelinePaddingOptions] },
        sectionSpacing: { enum: [...timelineSectionSpacingOptions] },
        maxWidth: { enum: [...timelineMaxWidthOptions] },
      },
    },
    background: {
      type: "object",
      additionalProperties: false,
      properties: {
        color: timelineColorValueSchema,
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
    const base = source[index] ?? ({} as TimelineStep);
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
      oppositeContent: resolveTrimmedOptionalString(base.oppositeContent),
      oppositeDate: resolveTrimmedOptionalString(base.oppositeDate),
      status: isEnumValue(base.status, timelineStatusOptions) ? base.status : undefined,
      markerIcon: resolveTimelineDotIconValue(base.markerIcon),
      markerIconColor: resolveClearableCssColorValue(base.markerIconColor, "authoring"),
      dotVariant: isEnumValue(base.dotVariant, timelineDotVariantOptions)
        ? base.dotVariant
        : undefined,
      dotTone: isEnumValue(base.dotTone, timelineDotToneOptions) ? base.dotTone : undefined,
      cta: normalizeTimelineStepCta(base.cta),
      link: normalizeTimelineStepLink(base.link),
    });
  }

  return normalized;
}

export const timelineDefaults: TimelineData = {
  steps: normalizeTimelineSteps([
    { id: "step-1", title: "Discovery", description: "Define goals and context." },
    { id: "step-2", title: "Planning", description: "Align scope and milestones." },
    { id: "step-3", title: "Build", description: "Deliver and iterate." },
  ]),
  axis: { position: "right" },
  dot: { variant: "filled", tone: "primary", size: "md", icon: "none" },
  connector: { show: true, style: "solid", thickness: "2" },
  typography: { titleSize: "base", titleWeight: "semibold", descriptionSize: "sm" },
  spacing: { gap: "md", padding: "md", sectionSpacing: "none", maxWidth: "5xl" },
  background: { color: "transparent" },
};

function coerceAxisPosition(
  value: unknown,
  capability: TimelineVariantCapability
): TimelineAxisPosition {
  if (capability.fixedAxisPosition) return capability.fixedAxisPosition;
  const allowed = capability.allowedAxisPositions;
  if (allowed.length === 0) return "left";
  if (isEnumValue(value, timelineAxisPositionOptions) && allowed.includes(value)) {
    return value;
  }
  return allowed[0]!;
}

export function normalizeTimelineData(
  data: TimelineData,
  variant = "vertical-right"
): TimelineData {
  const capability = resolveTimelineCapability(variant);
  const steps = normalizeTimelineSteps(data.steps);
  const dotDefaults = timelineDefaults.dot!;
  const connectorDefaults = timelineDefaults.connector!;
  const typographyDefaults = timelineDefaults.typography!;
  const spacingDefaults = timelineDefaults.spacing!;

  return {
    header: compactObject({
      title: resolveTrimmedOptionalString(data.header?.title),
      description: resolveTrimmedOptionalString(data.header?.description),
    }) as TimelineData["header"],
    steps,
    axis: { position: coerceAxisPosition(data.axis?.position, capability) },
    dot: {
      variant: enumOr(data.dot?.variant, timelineDotVariantOptions, dotDefaults.variant!),
      tone: enumOr(data.dot?.tone, timelineDotToneOptions, dotDefaults.tone!),
      size: enumOr(data.dot?.size, timelineDotSizeOptions, dotDefaults.size!),
      icon: resolveTimelineDotIconValue(data.dot?.icon) ?? dotDefaults.icon!,
    },
    connector: {
      show:
        typeof data.connector?.show === "boolean" ? data.connector.show : connectorDefaults.show!,
      style: enumOr(data.connector?.style, timelineConnectorStyleOptions, connectorDefaults.style!),
      thickness: enumOr(
        data.connector?.thickness,
        timelineThicknessOptions,
        connectorDefaults.thickness!
      ),
    },
    typography: {
      titleSize: enumOr(
        data.typography?.titleSize,
        timelineTitleSizeOptions,
        typographyDefaults.titleSize!
      ),
      titleWeight: enumOr(
        data.typography?.titleWeight,
        timelineTitleWeightOptions,
        typographyDefaults.titleWeight!
      ),
      descriptionSize: enumOr(
        data.typography?.descriptionSize,
        timelineDescriptionSizeOptions,
        typographyDefaults.descriptionSize!
      ),
    },
    spacing: {
      gap: enumOr(data.spacing?.gap, timelineSpacingOptions, spacingDefaults.gap!),
      padding: enumOr(data.spacing?.padding, timelinePaddingOptions, spacingDefaults.padding!),
      sectionSpacing: enumOr(
        data.spacing?.sectionSpacing,
        timelineSectionSpacingOptions,
        spacingDefaults.sectionSpacing!
      ),
      maxWidth: enumOr(data.spacing?.maxWidth, timelineMaxWidthOptions, spacingDefaults.maxWidth!),
    },
    background:
      data.background !== undefined
        ? (compactObject({
            color: resolveClearableCssColorValue(data.background?.color, "authoring"),
          }) ?? {})
        : timelineDefaults.background,
  };
}

type ResolvedTimelineDot = Required<NonNullable<TimelineData["dot"]>>;
type ResolvedTimelineConnector = Required<NonNullable<TimelineData["connector"]>>;
type ResolvedTimelineTypography = Required<NonNullable<TimelineData["typography"]>>;
type ResolvedTimelineSpacing = Required<NonNullable<TimelineData["spacing"]>>;

function resolveContentSide(position: TimelineAxisPosition, index: number): "left" | "right" {
  if (position === "left") return "left";
  if (position === "right") return "right";
  if (position === "alternate") return index % 2 === 0 ? "right" : "left";
  return index % 2 === 0 ? "left" : "right";
}

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
        "transition-colors hover:border-[var(--color-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
      )}
      href={link.href}
      rel={link.rel}
      aria-label={link.ariaLabel}
    >
      {children}
    </a>
  );
}

function renderOppositeNode(step: TimelineStep) {
  if (step.oppositeDate) {
    return <time dateTime={step.oppositeDate}>{step.oppositeContent ?? step.oppositeDate}</time>;
  }
  if (step.oppositeContent) {
    return <span>{step.oppositeContent}</span>;
  }
  return null;
}

function renderTimelineDot(step: TimelineStep, dot: ResolvedTimelineDot) {
  const tone = step.dotTone ?? dot.tone;
  const variant = step.dotVariant ?? dot.variant;
  const color = dotToneToken[tone];
  const iconName = resolveRenderableDotIcon(step.markerIcon) ?? resolveRenderableDotIcon(dot.icon);
  const IconComponent = iconName ? resolveLucideIcon(iconName) : undefined;
  const display = IconComponent ? "icon" : "dot";
  const wrapperSizeClass = IconComponent
    ? dotIconWrapperSizeMap[dot.size]
    : dotPlainSizeMap[dot.size];
  const markerIconColor = resolveClearableCssColorValue(step.markerIconColor, "authoring");
  const iconColor =
    variant === "filled" ? (markerIconColor ?? "var(--color-bg)") : (markerIconColor ?? color);

  const style: CSSProperties = {
    backgroundColor: variant === "filled" ? color : "transparent",
    borderColor: color,
    borderStyle: "solid",
    borderWidth: variant === "outlined" ? "2px" : "1px",
    color: iconColor,
  };

  return (
    <span
      aria-hidden="true"
      data-timeline-dot-variant={variant}
      data-timeline-dot-tone={tone}
      data-timeline-dot-icon={iconName ?? "none"}
      data-timeline-marker-effective-display={display}
      className={joinClasses(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        wrapperSizeClass
      )}
      style={style}
    >
      {IconComponent ? (
        <IconComponent aria-hidden="true" className={dotIconSvgSizeMap[dot.size]} />
      ) : null}
    </span>
  );
}

function renderVerticalConnector(connector: ResolvedTimelineConnector) {
  return (
    <span
      aria-hidden="true"
      className="mt-1 w-0 flex-1"
      style={{
        minHeight: "1.5rem",
        borderLeftWidth: thicknessValueMap[connector.thickness],
        borderLeftStyle: connector.style,
        borderColor: "var(--color-border)",
      }}
    />
  );
}

function renderHorizontalConnector(connector: ResolvedTimelineConnector, width: string) {
  return (
    <span
      aria-hidden="true"
      className="mx-1 block"
      style={{
        width,
        borderTopWidth: thicknessValueMap[connector.thickness],
        borderTopStyle: connector.style,
        borderColor: "var(--color-border)",
      }}
    />
  );
}

function renderStepText({
  step,
  align,
  typography,
  compact = false,
}: {
  step: TimelineStep;
  align: "start" | "end";
  typography: ResolvedTimelineTypography;
  compact?: boolean;
}) {
  const alignClass = align === "end" ? "text-right" : "text-left";
  const titleSizeClass = compact
    ? "text-sm"
    : typography.titleSize === "none"
      ? undefined
      : titleSizeClassMap[typography.titleSize];
  const titleWeightClass = titleWeightClassMap[typography.titleWeight];
  const descriptionSizeClass =
    typography.descriptionSize === "none"
      ? undefined
      : descriptionSizeClassMap[typography.descriptionSize];

  return (
    <div className={joinClasses("space-y-1", alignClass)}>
      {step.status ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={joinClasses(
              "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
              timelineStatusClassMap[step.status]
            )}
            data-timeline-status={step.status}
          >
            {timelineStatusLabelMap[step.status]}
          </span>
        </div>
      ) : null}
      {titleSizeClass ? (
        <span
          className={joinClasses("block", titleSizeClass, titleWeightClass)}
          style={{ color: "var(--color-text)" }}
        >
          {step.title}
        </span>
      ) : null}
      {!compact && step.description ? (
        <p className={descriptionSizeClass} style={{ color: "var(--color-text)" }}>
          {step.description}
        </p>
      ) : null}
      {step.cta ? (
        <a
          className={joinClasses(
            "inline-flex text-xs font-medium underline underline-offset-2",
            compact ? "mt-1" : undefined
          )}
          href={step.cta.href}
          rel={
            step.cta.href.startsWith("http://") || step.cta.href.startsWith("https://")
              ? "noopener noreferrer"
              : undefined
          }
          data-timeline-step-cta={compact ? "compact" : "default"}
        >
          {step.cta.label}
        </a>
      ) : null}
    </div>
  );
}

function TimelineSingleSideLayout({
  steps,
  position,
  dot,
  connector,
  typography,
  gap,
  listLabel,
}: {
  steps: TimelineStep[];
  position: TimelineAxisPosition;
  dot: ResolvedTimelineDot;
  connector: ResolvedTimelineConnector;
  typography: ResolvedTimelineTypography;
  gap: TimelineSpacing;
  listLabel: string;
}) {
  const side: "left" | "right" = position === "left" ? "left" : "right";

  return (
    <ol aria-label={listLabel} className={joinClasses("flex flex-col", gapClassMap[gap])}>
      {steps.map((step, index) => (
        <li
          key={step.id ?? `${step.title}-${index}`}
          aria-current={step.status === "current" ? "step" : undefined}
          data-timeline-step={step.id ?? index}
        >
          <TimelineStepSurface
            step={step}
            className={joinClasses(
              "flex gap-4 rounded-xl p-1",
              side === "left" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className="flex flex-col items-center">
              {renderTimelineDot(step, dot)}
              {connector.show && index < steps.length - 1
                ? renderVerticalConnector(connector)
                : null}
            </div>
            <div className="min-w-0 flex-1">
              {renderStepText({
                step,
                align: side === "left" ? "end" : "start",
                typography,
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
  position,
  dot,
  connector,
  typography,
  gap,
  listLabel,
  showOpposite,
}: {
  steps: TimelineStep[];
  position: TimelineAxisPosition;
  dot: ResolvedTimelineDot;
  connector: ResolvedTimelineConnector;
  typography: ResolvedTimelineTypography;
  gap: TimelineSpacing;
  listLabel: string;
  showOpposite: boolean;
}) {
  return (
    <ol aria-label={listLabel} className={joinClasses("flex flex-col", gapClassMap[gap])}>
      {steps.map((step, index) => {
        const side = resolveContentSide(position, index);
        return (
          <li
            key={step.id ?? `${step.title}-${index}`}
            className="grid grid-cols-[auto_1fr] items-start gap-4 md:grid-cols-[1fr_auto_1fr]"
            aria-current={step.status === "current" ? "step" : undefined}
            data-timeline-step={step.id ?? index}
          >
            <TimelineStepSurface
              step={step}
              className={joinClasses(
                "col-start-2 rounded-xl p-1",
                side === "right" ? "md:col-start-3 md:text-left" : "md:col-start-1 md:text-right"
              )}
            >
              {showOpposite && (step.oppositeContent || step.oppositeDate) ? (
                <div className="mb-2 text-xs text-[var(--color-text)]/70 md:hidden">
                  {renderOppositeNode(step)}
                </div>
              ) : null}
              {renderStepText({
                step,
                align: side === "right" ? "start" : "end",
                typography,
              })}
            </TimelineStepSurface>
            <div className="col-start-1 row-start-1 flex flex-col items-center md:col-start-2 md:row-start-auto">
              {renderTimelineDot(step, dot)}
              {connector.show && index < steps.length - 1
                ? renderVerticalConnector(connector)
                : null}
            </div>
            {showOpposite ? (
              <div
                className={joinClasses(
                  "hidden text-xs text-[var(--color-text)]/70 md:block",
                  side === "right" ? "md:col-start-1 md:text-right" : "md:col-start-3 md:text-left"
                )}
              >
                {renderOppositeNode(step)}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function TimelineCardsLayout({
  steps,
  dot,
  typography,
  gap,
  listLabel,
}: {
  steps: TimelineStep[];
  dot: ResolvedTimelineDot;
  typography: ResolvedTimelineTypography;
  gap: TimelineSpacing;
  listLabel: string;
}) {
  return (
    <ol
      aria-label={listLabel}
      className={joinClasses("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3", gapClassMap[gap])}
    >
      {steps.map((step, index) => (
        <li
          key={step.id ?? `${step.title}-${index}`}
          aria-current={step.status === "current" ? "step" : undefined}
          data-timeline-step={step.id ?? index}
        >
          <TimelineStepSurface
            step={step}
            className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          >
            <div className="flex items-start gap-3">
              {renderTimelineDot(step, dot)}
              <div className="min-w-0 flex-1">
                {renderStepText({ step, align: "start", typography })}
              </div>
            </div>
          </TimelineStepSurface>
        </li>
      ))}
    </ol>
  );
}

function TimelineCompactLayout({
  steps,
  dot,
  connector,
  typography,
  gap,
  listLabel,
}: {
  steps: TimelineStep[];
  dot: ResolvedTimelineDot;
  connector: ResolvedTimelineConnector;
  typography: ResolvedTimelineTypography;
  gap: TimelineSpacing;
  listLabel: string;
}) {
  const connectorWidth = compactConnectorWidthMap[gap];
  return (
    <div className="overflow-x-auto pb-1">
      <ol
        aria-label={listLabel}
        className={joinClasses("flex w-max min-w-full flex-nowrap items-center", gapClassMap[gap])}
      >
        {steps.map((step, index) => (
          <li
            key={step.id ?? `${step.title}-${index}`}
            className="flex items-center gap-2"
            aria-current={step.status === "current" ? "step" : undefined}
            data-timeline-step={step.id ?? index}
          >
            <TimelineStepSurface step={step} className="flex items-center gap-2 rounded-xl p-1">
              {renderTimelineDot(step, dot)}
              {renderStepText({ step, align: "start", typography, compact: true })}
            </TimelineStepSurface>
            {connector.show && index < steps.length - 1
              ? renderHorizontalConnector(connector, connectorWidth)
              : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TimelineBlock({ data, variant }: { data: TimelineData; variant: string }) {
  const capability = resolveTimelineCapability(variant);
  const normalized = normalizeTimelineData(data, capability.id);
  const steps = normalized.steps;
  const dot = normalized.dot as ResolvedTimelineDot;
  const connector = normalized.connector as ResolvedTimelineConnector;
  const typography = normalized.typography as ResolvedTimelineTypography;
  const spacing = normalized.spacing as ResolvedTimelineSpacing;
  const position = normalized.axis?.position ?? "right";

  const backgroundStyle = compactStyle({
    backgroundColor: resolveClearableCssColorValue(normalized.background?.color, "authoring"),
  });

  const sectionTitle = normalized.header?.title?.trim();
  const sectionDescription = normalized.header?.description?.trim();
  const sectionHeadingId = resolveHeadingId(sectionTitle);
  const listLabel = sectionTitle ? `${sectionTitle} steps` : "Timeline steps";

  return (
    <section
      className={joinClasses(
        paddingClassMap[spacing.padding],
        sectionSpacingClassMap[spacing.sectionSpacing]
      )}
      style={backgroundStyle}
      aria-labelledby={sectionHeadingId}
      aria-label={sectionHeadingId ? undefined : "Timeline"}
    >
      <div className={joinClasses("mx-auto w-full space-y-4", maxWidthClassMap[spacing.maxWidth])}>
        <div
          data-timeline-variant={capability.id}
          data-timeline-orientation={capability.orientation}
          data-timeline-surface={capability.surface}
          data-timeline-axis-position={position}
          data-timeline-dot-variant={dot.variant}
          data-timeline-dot-tone={dot.tone}
          data-timeline-dot-size={dot.size}
          data-timeline-dot-icon={dot.icon}
        >
          {sectionTitle || sectionDescription ? (
            <div className="space-y-2">
              {sectionTitle ? (
                <h2
                  id={sectionHeadingId}
                  className="text-2xl font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  {sectionTitle}
                </h2>
              ) : null}
              {sectionDescription ? (
                <p className="max-w-3xl text-sm" style={{ color: "var(--color-text)" }}>
                  {sectionDescription}
                </p>
              ) : null}
            </div>
          ) : null}

          {capability.surface === "cards" ? (
            <TimelineCardsLayout
              steps={steps}
              dot={dot}
              typography={typography}
              gap={spacing.gap}
              listLabel={listLabel}
            />
          ) : capability.orientation === "horizontal" ? (
            <TimelineCompactLayout
              steps={steps}
              dot={dot}
              connector={connector}
              typography={typography}
              gap={spacing.gap}
              listLabel={listLabel}
            />
          ) : capability.fixedAxisPosition ? (
            <TimelineSingleSideLayout
              steps={steps}
              position={position}
              dot={dot}
              connector={connector}
              typography={typography}
              gap={spacing.gap}
              listLabel={listLabel}
            />
          ) : (
            <TimelineAlternatingLayout
              steps={steps}
              position={position}
              dot={dot}
              connector={connector}
              typography={typography}
              gap={spacing.gap}
              listLabel={listLabel}
              showOpposite={capability.visibleFields.has("oppositeContent")}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export const timelineEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "timeline.setup.gallery",
      title: "Choose a timeline preset",
      role: "setup",
      writablePaths: ["variant"],
      readOnlyPaths: [
        "header.title",
        "header.description",
        "steps.count",
        "steps.title",
        "steps.description",
      ],
      allowedDuplicateWritablePaths: [
        {
          path: "variant",
          reason: "Preset gallery is the one-shot wizard setup and stays re-selectable in Visual.",
          expiresWithTask: "TASK-416",
        },
      ],
    },
    {
      mode: "visual",
      id: "timeline.visual.preset-structure",
      title: "Preset and structure",
      role: "visual",
      writablePaths: ["variant", "axis.position", "steps.count"],
      allowedDuplicateWritablePaths: [
        {
          path: "variant",
          reason: "Preset gallery is the one-shot wizard setup and stays re-selectable in Visual.",
          expiresWithTask: "TASK-416",
        },
      ],
    },
    {
      mode: "visual",
      id: "timeline.visual.step-content",
      title: "Steps content and order",
      role: "content",
      writablePaths: [
        "steps.title",
        "steps.description",
        "steps.oppositeContent",
        "steps.oppositeDate",
        "steps.status",
        "steps.markerIcon",
        "steps.markerIconColor",
        "steps.dotVariant",
        "steps.dotTone",
        "steps.cta.label",
        "steps.cta.href",
        "steps.link.label",
        "steps.link.href",
      ],
    },
    {
      mode: "visual",
      id: "timeline.visual.dots-connector",
      title: "Dots and connector",
      role: "visual",
      writablePaths: [
        "dot.variant",
        "dot.tone",
        "dot.size",
        "dot.icon",
        "connector.show",
        "connector.style",
        "connector.thickness",
      ],
    },
    {
      mode: "visual",
      id: "timeline.visual.appearance",
      title: "Typography, spacing and background",
      role: "visual",
      writablePaths: [
        "header.title",
        "header.description",
        "typography.titleSize",
        "typography.titleWeight",
        "typography.descriptionSize",
        "spacing.gap",
        "spacing.padding",
        "spacing.sectionSpacing",
        "spacing.maxWidth",
        "background.color",
      ],
    },
    {
      mode: "advanced",
      id: "timeline.advanced.runtime",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "axis.position", "steps"],
    },
    {
      mode: "advanced",
      id: "timeline.advanced.appearance",
      title: "Appearance diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["dot", "connector", "typography", "spacing", "background"],
    },
    {
      mode: "advanced",
      id: "timeline.advanced.normalization",
      title: "Data normalization",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["editorContract", "steps"],
    },
  ],
};

export function createTimelineWidget(
  editors: WidgetEditorBundle<TimelineData>
): WidgetDefinition<TimelineData> {
  return {
    type: "timeline",
    title: "Timeline",
    description: "Timeline of steps, milestones, or dated events.",
    category: "content",
    presets: timelineVariantIds.map((id) => ({
      id,
      label: timelineVariantCapabilities[id].label,
      description: timelineVariantCapabilities[id].description,
    })),
    variants: timelineVariantIds.map((id) => ({
      id,
      label: timelineVariantCapabilities[id].label,
      description: timelineVariantCapabilities[id].description,
    })),
    schema: timelineSchema,
    defaults: timelineDefaults,
    editor: editors,
    editorContract: timelineEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TimelineBlock,
  };
}

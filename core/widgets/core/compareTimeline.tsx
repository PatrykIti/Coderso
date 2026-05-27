import type { CSSProperties, ComponentType, ReactNode } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactObject, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type CompareTimelineVariantId = "dual-track" | "dual-track-highlight";
export type CompareTimelineGuideStyle = "solid" | "dashed";
export type CompareTimelineTrackSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type CompareTimelineLabelPosition = "top" | "bottom";
export type CompareTimelineMaxWidth = "none" | "4xl" | "5xl" | "6xl" | "7xl";
export type CompareTimelinePadding = "sm" | "md" | "lg";
export type CompareTimelineTrackOrder = "a-first" | "b-first";
export type CompareTimelineMotion = "none" | "fade" | "slide";
export type CompareTimelineHighlightLabelStyle = "solid" | "outline" | "subtle";
export type CompareTimelineTrackLabelSize = "none" | "sm" | "base" | "lg";
export type CompareTimelineStepLabelSize = "none" | "xs" | "sm" | "base";
export type CompareTimelineSegmentLabelSize = "none" | "xs" | "sm" | "base";
export type CompareTimelineFontWeight = "normal" | "medium" | "semibold" | "bold";
export type CompareTimelineMarkerShape = "rounded" | "circle" | "numbered" | "check";

export type CompareAxisStep = {
  id?: string;
  label: string;
  description?: string;
  icon?: string;
  href?: string;
};

export type CompareTrackSegment = {
  from: number;
  to: number;
  label?: string;
  href?: string;
};

export type CompareTrack = {
  id: string;
  label: string;
  markers: number[];
  segments?: CompareTrackSegment[];
};

export type CompareTimelineData = {
  header?: {
    title?: string;
    subtitle?: string;
  };
  axis: { steps: CompareAxisStep[] };
  tracks: CompareTrack[];
  guides?: { enabled?: boolean; style?: CompareTimelineGuideStyle };
  layout?: {
    trackSpacing?: CompareTimelineTrackSpacing;
    labelPosition?: CompareTimelineLabelPosition;
    maxWidth?: CompareTimelineMaxWidth;
    padding?: CompareTimelinePadding;
    trackOrder?: CompareTimelineTrackOrder;
    motion?: CompareTimelineMotion;
  };
  highlight?: {
    targetTrackId?: string;
    targetTrackIds?: string[];
  };
  style?: {
    highlightColor?: string;
    highlightLabelStyle?: CompareTimelineHighlightLabelStyle;
    markerColor?: string;
    trackLabelColor?: string;
    stepLabelColor?: string;
    mutedStepColor?: string;
    guideColor?: string;
    trackBackgroundColor?: string;
    trackLabelSize?: CompareTimelineTrackLabelSize;
    stepLabelSize?: CompareTimelineStepLabelSize;
    segmentLabelSize?: CompareTimelineSegmentLabelSize;
    trackLabelFontWeight?: CompareTimelineFontWeight;
    stepLabelFontWeight?: CompareTimelineFontWeight;
    segmentLabelFontWeight?: CompareTimelineFontWeight;
    markerShape?: CompareTimelineMarkerShape;
  };
};

export const compareAxisStepMin = 3;
export const compareAxisStepMax = 10;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const compareMaxWidthOptions = ["none", "4xl", "5xl", "6xl", "7xl"] as const;
const comparePaddingOptions = ["sm", "md", "lg"] as const;
const compareTrackOrderOptions = ["a-first", "b-first"] as const;
const compareMotionOptions = ["none", "fade", "slide"] as const;
const compareFontWeightOptions = ["normal", "medium", "semibold", "bold"] as const;
const compareMarkerShapeOptions = ["rounded", "circle", "numbered", "check"] as const;
const widgetHrefOptions = {
  allowRelative: true,
  allowHash: true,
  allowHttp: true,
} as const;

const trackSpacingClassMap = {
  none: "space-y-0",
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
} as const;

const maxWidthClassMap = {
  none: "max-w-none",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

const paddingClassMap = {
  sm: "px-4 py-6",
  md: "px-4 py-8",
  lg: "px-6 py-10",
} as const;

const motionClassMap = {
  none: undefined,
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none",
  slide:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none",
} as const;

const trackLabelSizeClassMap = {
  none: "",
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
} as const;

const stepLabelSizeClassMap = {
  none: "",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const;

const segmentLabelSizeClassMap = {
  none: "",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const;

const fontWeightClassMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

const labelIdFallback = (index: number) => `step-${index + 1}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isEnumValue = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && options.includes(value as T);

const resolveTrimmedOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const resolveCompareIcon = (value: unknown) => {
  const trimmed = resolveTrimmedOptionalString(value);
  return trimmed ? trimmed.slice(0, 16) : undefined;
};

const resolveCompareHighlightFallback = (value: string) => {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
    return trimmed;
  }
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.18)`;
};

const resolveCompareStepLink = (href: string | undefined) => {
  if (!href) return undefined;
  const normalized = normalizeWidgetSafeHref(href, widgetHrefOptions);
  if (!normalized) return undefined;
  return {
    href: normalized,
    rel:
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? "noopener noreferrer"
        : undefined,
  };
};

export const compareTimelineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["axis", "tracks"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
      },
    },
    axis: {
      type: "object",
      additionalProperties: false,
      required: ["steps"],
      properties: {
        steps: {
          type: "array",
          minItems: compareAxisStepMin,
          maxItems: compareAxisStepMax,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" },
              href: { type: "string" },
            },
          },
        },
      },
    },
    tracks: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "markers"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          markers: {
            type: "array",
            uniqueItems: true,
            items: { type: "integer" },
          },
          segments: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["from", "to"],
              properties: {
                from: { type: "integer" },
                to: { type: "integer" },
                label: { type: "string" },
                href: { type: "string" },
              },
            },
          },
        },
      },
    },
    guides: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        style: { enum: ["solid", "dashed"] },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        trackSpacing: { enum: ["none", "sm", "md", "lg", "xl"] },
        labelPosition: { enum: ["top", "bottom"] },
        maxWidth: { enum: [...compareMaxWidthOptions] },
        padding: { enum: [...comparePaddingOptions] },
        trackOrder: { enum: [...compareTrackOrderOptions] },
        motion: { enum: [...compareMotionOptions] },
      },
    },
    highlight: {
      type: "object",
      additionalProperties: false,
      properties: {
        targetTrackId: { type: "string" },
        targetTrackIds: {
          type: "array",
          uniqueItems: true,
          items: { type: "string" },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        highlightColor: { type: "string" },
        highlightLabelStyle: { enum: ["solid", "outline", "subtle"] },
        markerColor: { type: "string" },
        trackLabelColor: { type: "string" },
        stepLabelColor: { type: "string" },
        mutedStepColor: { type: "string" },
        guideColor: { type: "string" },
        trackBackgroundColor: { type: "string" },
        trackLabelSize: { enum: ["none", "sm", "base", "lg"] },
        stepLabelSize: { enum: ["none", "xs", "sm", "base"] },
        segmentLabelSize: { enum: ["none", "xs", "sm", "base"] },
        trackLabelFontWeight: { enum: [...compareFontWeightOptions] },
        stepLabelFontWeight: { enum: [...compareFontWeightOptions] },
        segmentLabelFontWeight: { enum: [...compareFontWeightOptions] },
        markerShape: { enum: [...compareMarkerShapeOptions] },
      },
    },
  },
};

export const compareTimelineDefaults: CompareTimelineData = {
  axis: {
    steps: [{ label: "Plan" }, { label: "Build" }, { label: "Deliver" }],
  },
  tracks: [
    {
      id: "a",
      label: "Traditional",
      markers: [0, 1, 2],
      segments: [{ from: 0, to: 1, label: "Long approvals" }],
    },
    {
      id: "b",
      label: "With us",
      markers: [0, 2],
      segments: [{ from: 1, to: 2, label: "Accelerated execution" }],
    },
  ],
  guides: { enabled: true, style: "dashed" },
  layout: {
    trackSpacing: "md",
    labelPosition: "top",
    maxWidth: "6xl",
    padding: "md",
    trackOrder: "a-first",
    motion: "none",
  },
  highlight: { targetTrackId: "b", targetTrackIds: ["b"] },
  style: {
    highlightColor: "#f59e0b",
    highlightLabelStyle: "solid",
    markerColor: "#1d4ed8",
    trackLabelColor: "#0f172a",
    stepLabelColor: "#0f172a",
    mutedStepColor: "#334155",
    guideColor: "#e2e8f0",
    trackLabelSize: "base",
    stepLabelSize: "xs",
    segmentLabelSize: "xs",
    trackLabelFontWeight: "semibold",
    stepLabelFontWeight: "semibold",
    segmentLabelFontWeight: "normal",
    markerShape: "rounded",
  },
};

export const compareTimelineEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "compare-timeline.wizard.starter-comparison",
      title: "Starter comparison",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant", "axis.steps.count"],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.variant",
      title: "Variant and compare structure",
      role: "setup",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.section-heading",
      title: "Section heading",
      role: "content",
      writablePaths: ["header.title", "header.subtitle"],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.axis-tracks",
      title: "Axis steps and track labels",
      role: "content",
      writablePaths: [
        "axis.steps.count",
        "axis.steps.*.label",
        "axis.steps.*.description",
        "axis.steps.*.icon",
        "axis.steps.*.href",
        "tracks.*.label",
      ],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.markers-segments",
      title: "Markers and segment mapping",
      role: "visual",
      writablePaths: [
        "tracks.*.markers",
        "tracks.*.segments",
        "highlight.targetTrackId",
        "highlight.targetTrackIds",
      ],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.highlight-guides",
      title: "Highlight and guide styles",
      role: "visual",
      writablePaths: ["guides.enabled", "guides.style", "style.highlightLabelStyle"],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.colors-typography",
      title: "Colors and typography",
      role: "visual",
      writablePaths: [
        "style.highlightColor",
        "style.markerColor",
        "style.trackLabelColor",
        "style.stepLabelColor",
        "style.mutedStepColor",
        "style.guideColor",
        "style.trackBackgroundColor",
        "style.trackLabelSize",
        "style.stepLabelSize",
        "style.segmentLabelSize",
        "style.trackLabelFontWeight",
        "style.stepLabelFontWeight",
        "style.segmentLabelFontWeight",
        "style.markerShape",
      ],
    },
    {
      mode: "visual",
      id: "compare-timeline.visual.spacing-layout",
      title: "Spacing and layout preview hints",
      role: "layout",
      writablePaths: [
        "layout.trackSpacing",
        "layout.labelPosition",
        "layout.maxWidth",
        "layout.padding",
        "layout.trackOrder",
        "layout.motion",
      ],
    },
    {
      mode: "advanced",
      id: "compare-timeline.advanced.runtime-layout",
      title: "Runtime layout diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["guides", "layout", "highlight", "style"],
    },
    {
      mode: "advanced",
      id: "compare-timeline.advanced.metadata",
      title: "Metadata diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["axis", "tracks"],
    },
    {
      mode: "advanced",
      id: "compare-timeline.advanced.normalization",
      title: "Normalization support",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["axis", "tracks", "guides", "layout", "highlight"],
    },
  ],
};

const resolveStepFallbackLabel = (index: number) => {
  const defaults = [
    "Plan",
    "Build",
    "Deliver",
    "Optimize",
    "Scale",
    "Review",
    "Approve",
    "Launch",
    "Measure",
    "Iterate",
  ];
  return defaults[index] ?? `Step ${index + 1}`;
};

const normalizeCompareHeader = (header: CompareTimelineData["header"]) =>
  compactObject({
    title: resolveTrimmedOptionalString(header?.title),
    subtitle: resolveTrimmedOptionalString(header?.subtitle),
  });

const normalizeCompareSafeHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, widgetHrefOptions);

const normalizeCompareLayout = (
  layout: CompareTimelineData["layout"]
): NonNullable<CompareTimelineData["layout"]> => ({
  trackSpacing: layout?.trackSpacing ?? compareTimelineDefaults.layout?.trackSpacing,
  labelPosition: layout?.labelPosition ?? compareTimelineDefaults.layout?.labelPosition,
  maxWidth: isEnumValue(layout?.maxWidth, compareMaxWidthOptions)
    ? layout.maxWidth
    : (compareTimelineDefaults.layout?.maxWidth ?? "6xl"),
  padding: isEnumValue(layout?.padding, comparePaddingOptions)
    ? layout.padding
    : (compareTimelineDefaults.layout?.padding ?? "md"),
  trackOrder: isEnumValue(layout?.trackOrder, compareTrackOrderOptions)
    ? layout.trackOrder
    : (compareTimelineDefaults.layout?.trackOrder ?? "a-first"),
  motion: isEnumValue(layout?.motion, compareMotionOptions)
    ? layout.motion
    : (compareTimelineDefaults.layout?.motion ?? "none"),
});

const normalizeCompareHighlight = (
  highlight: CompareTimelineData["highlight"],
  tracks: CompareTrack[]
): NonNullable<CompareTimelineData["highlight"]> => {
  const ids = tracks.map((track) => track.id);
  const legacyTarget =
    typeof highlight?.targetTrackId === "string" && ids.includes(highlight.targetTrackId)
      ? highlight.targetTrackId
      : (tracks[1]?.id ?? tracks[0]?.id ?? "a");
  const requestedIds = Array.isArray(highlight?.targetTrackIds)
    ? highlight.targetTrackIds.filter((id): id is string => ids.includes(id))
    : [];
  const uniqueTargetIds = requestedIds.filter((id, index) => requestedIds.indexOf(id) === index);
  const targetTrackIds = uniqueTargetIds.length > 0 ? uniqueTargetIds : [legacyTarget];

  return {
    targetTrackId: targetTrackIds.includes(legacyTarget)
      ? legacyTarget
      : (targetTrackIds[0] ?? legacyTarget),
    targetTrackIds,
  };
};

const normalizeCompareStyle = (
  style: CompareTimelineData["style"]
): NonNullable<CompareTimelineData["style"]> => {
  const hasStyleObject = style !== undefined;
  const clearableStyle = hasStyleObject
    ? compactObject({
        highlightColor: resolveClearableStyleValue(style?.highlightColor),
        markerColor: resolveClearableStyleValue(style?.markerColor),
        trackLabelColor: resolveClearableStyleValue(style?.trackLabelColor),
        stepLabelColor: resolveClearableStyleValue(style?.stepLabelColor),
        mutedStepColor: resolveClearableStyleValue(style?.mutedStepColor),
        guideColor: resolveClearableStyleValue(style?.guideColor),
        trackBackgroundColor: resolveClearableStyleValue(style?.trackBackgroundColor),
      })
    : compactObject({
        highlightColor: resolveClearableStyleValue(compareTimelineDefaults.style?.highlightColor),
        markerColor: resolveClearableStyleValue(compareTimelineDefaults.style?.markerColor),
        trackLabelColor: resolveClearableStyleValue(compareTimelineDefaults.style?.trackLabelColor),
        stepLabelColor: resolveClearableStyleValue(compareTimelineDefaults.style?.stepLabelColor),
        mutedStepColor: resolveClearableStyleValue(compareTimelineDefaults.style?.mutedStepColor),
        guideColor: resolveClearableStyleValue(compareTimelineDefaults.style?.guideColor),
        trackBackgroundColor: resolveClearableStyleValue(
          compareTimelineDefaults.style?.trackBackgroundColor
        ),
      });

  return {
    highlightLabelStyle:
      style?.highlightLabelStyle ?? compareTimelineDefaults.style?.highlightLabelStyle,
    trackLabelSize: style?.trackLabelSize ?? compareTimelineDefaults.style?.trackLabelSize,
    stepLabelSize: style?.stepLabelSize ?? compareTimelineDefaults.style?.stepLabelSize,
    segmentLabelSize: style?.segmentLabelSize ?? compareTimelineDefaults.style?.segmentLabelSize,
    trackLabelFontWeight: isEnumValue(style?.trackLabelFontWeight, compareFontWeightOptions)
      ? style.trackLabelFontWeight
      : (compareTimelineDefaults.style?.trackLabelFontWeight ?? "semibold"),
    stepLabelFontWeight: isEnumValue(style?.stepLabelFontWeight, compareFontWeightOptions)
      ? style.stepLabelFontWeight
      : (compareTimelineDefaults.style?.stepLabelFontWeight ?? "semibold"),
    segmentLabelFontWeight: isEnumValue(style?.segmentLabelFontWeight, compareFontWeightOptions)
      ? style.segmentLabelFontWeight
      : (compareTimelineDefaults.style?.segmentLabelFontWeight ?? "normal"),
    markerShape: isEnumValue(style?.markerShape, compareMarkerShapeOptions)
      ? style.markerShape
      : (compareTimelineDefaults.style?.markerShape ?? "rounded"),
    ...(clearableStyle ?? {}),
  };
};

export const normalizeCompareStepCount = (value: number) => {
  if (!Number.isFinite(value)) return compareAxisStepMin;
  return Math.min(compareAxisStepMax, Math.max(compareAxisStepMin, Math.floor(value)));
};

export function normalizeCompareAxisSteps(
  steps: CompareAxisStep[] | undefined,
  desiredCount?: number
): CompareAxisStep[] {
  const source = Array.isArray(steps) ? steps : [];
  const count =
    typeof desiredCount === "number"
      ? normalizeCompareStepCount(desiredCount)
      : normalizeCompareStepCount(source.length > 0 ? source.length : compareAxisStepMin);

  const normalized: CompareAxisStep[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : labelIdFallback(index);
    if (usedIds.has(id)) {
      let cursor = 1;
      while (usedIds.has(`step-${cursor}`)) {
        cursor += 1;
      }
      id = `step-${cursor}`;
    }
    usedIds.add(id);

    const label =
      typeof base.label === "string" && base.label.trim().length > 0
        ? base.label.trim()
        : resolveStepFallbackLabel(index);

    normalized.push({
      id,
      label,
      description: resolveTrimmedOptionalString(base.description),
      icon: resolveCompareIcon(base.icon),
      href: normalizeCompareSafeHref(base.href),
    });
  }

  return normalized;
}

export function normalizeCompareTrackMarkers(
  markers: number[] | undefined,
  stepCount: number
): number[] {
  const maxIndex = Math.max(0, stepCount - 1);
  const values = Array.isArray(markers) ? markers : [];
  const normalized = new Set<number>();

  for (const marker of values) {
    if (!Number.isInteger(marker)) continue;
    normalized.add(clamp(marker, 0, maxIndex));
  }

  return [...normalized].sort((left, right) => left - right);
}

export function normalizeCompareTrackSegments(
  segments: CompareTrackSegment[] | undefined,
  stepCount: number
): CompareTrackSegment[] {
  const maxIndex = Math.max(0, stepCount - 1);
  const values = Array.isArray(segments) ? segments : [];
  const seen = new Set<string>();
  const normalized: CompareTrackSegment[] = [];

  for (const segment of values) {
    if (!Number.isInteger(segment.from) || !Number.isInteger(segment.to)) continue;
    const fromClamped = clamp(segment.from, 0, maxIndex);
    const toClamped = clamp(segment.to, 0, maxIndex);
    const from = Math.min(fromClamped, toClamped);
    const to = Math.max(fromClamped, toClamped);
    const label =
      typeof segment.label === "string" && segment.label.trim().length > 0
        ? segment.label.trim()
        : undefined;
    const href = normalizeCompareSafeHref(segment.href);

    const signature = `${from}:${to}:${label ?? ""}:${href ?? ""}`;
    if (seen.has(signature)) continue;
    seen.add(signature);

    normalized.push({ from, to, label, href });
  }

  return normalized.sort((left, right) => {
    if (left.from !== right.from) return left.from - right.from;
    return left.to - right.to;
  });
}

export function normalizeCompareTracks(
  tracks: CompareTrack[] | undefined,
  stepCount: number
): CompareTrack[] {
  const source = Array.isArray(tracks) ? tracks : [];
  const fallbackTracks = compareTimelineDefaults.tracks;
  const ids = ["a", "b"] as const;

  return ids.map((id, index) => {
    const base = source[index] ??
      fallbackTracks[index] ?? {
        id,
        label: `Track ${index + 1}`,
        markers: [],
        segments: [],
      };

    const label =
      typeof base.label === "string" && base.label.trim().length > 0
        ? base.label.trim()
        : (fallbackTracks[index]?.label ?? `Track ${index + 1}`);

    return {
      id,
      label,
      markers: normalizeCompareTrackMarkers(base.markers, stepCount),
      segments: normalizeCompareTrackSegments(base.segments, stepCount),
    };
  });
}

export function normalizeCompareTimelineData(data: CompareTimelineData): CompareTimelineData {
  const axisSteps = normalizeCompareAxisSteps(data.axis?.steps);
  const stepCount = axisSteps.length;
  const tracks = normalizeCompareTracks(data.tracks, stepCount);
  const normalizedHeader = normalizeCompareHeader(data.header);

  return {
    ...data,
    header: normalizedHeader ?? undefined,
    axis: {
      steps: axisSteps,
    },
    tracks,
    guides: {
      enabled: data.guides?.enabled ?? compareTimelineDefaults.guides?.enabled,
      style: data.guides?.style ?? compareTimelineDefaults.guides?.style,
    },
    layout: normalizeCompareLayout(data.layout),
    highlight: normalizeCompareHighlight(data.highlight, tracks),
    style: normalizeCompareStyle(data.style),
  };
}

export const resolveCompareTimelineVariant = (variant: string): CompareTimelineVariantId =>
  variant === "dual-track-highlight" ? "dual-track-highlight" : "dual-track";

const stepIsWithinSegment = (segments: CompareTrackSegment[] | undefined, index: number) => {
  if (!Array.isArray(segments)) return false;
  return segments.some((segment) => index >= segment.from && index <= segment.to);
};

const resolveCompareGridStyle = (stepCount: number) =>
  ({
    "--compare-grid-columns": `repeat(${Math.max(compareAxisStepMin, stepCount)}, minmax(0, 1fr))`,
  }) as CSSProperties;

const resolveCompareTracksForRender = (
  tracks: CompareTrack[],
  trackOrder: CompareTimelineTrackOrder | undefined
) => {
  if (trackOrder !== "b-first") return tracks;
  return [...tracks].reverse();
};

const resolveMarkerBadgeContent = (
  markerShape: CompareTimelineMarkerShape,
  markerActive: boolean,
  index: number
) => {
  if (markerShape === "numbered") return String(index + 1);
  if (markerShape === "check") return markerActive ? "✓" : "○";
  return "•";
};

const renderLinkedCompareContent = (
  attrs: { href: string; rel?: string } | undefined,
  ariaLabel: string | undefined,
  className: string,
  children: ReactNode
) => {
  if (!attrs) return <div className={className}>{children}</div>;
  return (
    <a href={attrs.href} rel={attrs.rel} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  );
};

function CompareAxisRow({
  steps,
  stepLabelColor,
  stepLabelWeightClass,
}: {
  steps: CompareAxisStep[];
  stepLabelColor: string;
  stepLabelWeightClass: string;
}) {
  const gridStyle = resolveCompareGridStyle(steps.length);

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:[grid-template-columns:var(--compare-grid-columns)]"
      data-compare-axis="true"
      style={gridStyle}
    >
      {steps.map((step, index) => (
        <div
          key={step.id ?? `${step.label}-${index}`}
          className="min-h-[5rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        >
          {renderLinkedCompareContent(
            resolveCompareStepLink(step.href),
            step.href ? `Open step ${step.label}` : undefined,
            "block space-y-1 no-underline",
            <>
              <div className="flex items-start gap-2">
                {step.icon ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-[var(--color-border)] px-2 text-xs"
                  >
                    {step.icon}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <p
                    className={joinClasses("break-words text-xs", stepLabelWeightClass)}
                    style={{ color: stepLabelColor }}
                  >
                    {step.label}
                  </p>
                  {step.description ? (
                    <p
                      className="mt-1 break-words text-xs opacity-80"
                      style={{ color: stepLabelColor }}
                    >
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function CompareTrackRow({
  track,
  steps,
  variant,
  targetTrackIds,
  guides,
  style,
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  variant: CompareTimelineVariantId;
  targetTrackIds: string[];
  guides: Required<NonNullable<CompareTimelineData["guides"]>>;
  style: Required<NonNullable<CompareTimelineData["style"]>>;
}) {
  const trackIsHighlighted =
    variant === "dual-track-highlight" && targetTrackIds.includes(track.id);
  const markerColor = style.markerColor ?? "var(--color-primary)";
  const highlightColor = style.highlightColor ?? "#f59e0b";
  const stepLabelColor = style.stepLabelColor ?? "var(--color-text)";
  const mutedStepColor = style.mutedStepColor ?? "var(--color-text)";
  const trackLabelColor = style.trackLabelColor ?? "var(--color-text)";
  const guideColor = style.guideColor ?? "var(--color-border)";
  const trackBackgroundColor = style.trackBackgroundColor ?? "transparent";
  const trackLabelSizeClass = trackLabelSizeClassMap[style.trackLabelSize ?? "base"];
  const stepLabelSizeClass = stepLabelSizeClassMap[style.stepLabelSize ?? "xs"];
  const segmentLabelSizeClass = segmentLabelSizeClassMap[style.segmentLabelSize ?? "xs"];
  const trackLabelWeightClass = fontWeightClassMap[style.trackLabelFontWeight ?? "semibold"];
  const stepLabelWeightClass = fontWeightClassMap[style.stepLabelFontWeight ?? "semibold"];
  const segmentLabelWeightClass = fontWeightClassMap[style.segmentLabelFontWeight ?? "normal"];
  const markerShape = style.markerShape ?? "rounded";
  const trackGridStyle = resolveCompareGridStyle(steps.length);

  const segmentLabelBaseClass = joinClasses(
    "rounded-full border px-2 py-1 text-xs",
    segmentLabelWeightClass
  );
  const segmentLabelStyle: CSSProperties =
    style.highlightLabelStyle === "outline"
      ? {
          backgroundColor: "transparent",
          borderColor: highlightColor,
          color: highlightColor,
        }
      : style.highlightLabelStyle === "subtle"
        ? {
            backgroundColor: highlightColor,
            borderColor: highlightColor,
            color: "var(--color-bg)",
            opacity: 0.82,
          }
        : {
            backgroundColor: highlightColor,
            borderColor: highlightColor,
            color: "var(--color-bg)",
          };

  return (
    <div
      className="overflow-hidden rounded-lg border p-4"
      data-compare-track={track.id}
      aria-label={`${track.label} track`}
      style={{
        borderStyle: guides.enabled ? guides.style : "none",
        borderColor: guides.enabled ? guideColor : "transparent",
        backgroundColor: trackBackgroundColor,
      }}
    >
      <p
        className={joinClasses("break-words", trackLabelSizeClass, trackLabelWeightClass)}
        style={{ color: trackLabelColor }}
      >
        {track.label}
      </p>

      <div
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:[grid-template-columns:var(--compare-grid-columns)]"
        style={trackGridStyle}
      >
        {steps.map((step, index) => {
          const markerActive = track.markers.includes(index);
          const inHighlightSegment =
            trackIsHighlighted && stepIsWithinSegment(track.segments, index);
          const stepLink = resolveCompareStepLink(step.href);
          const markerBadgeClass =
            markerShape === "circle" || markerShape === "numbered" || markerShape === "check"
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[0.7rem]"
              : "inline-flex min-w-6 items-center justify-center rounded-md border px-2 py-0.5 text-[0.7rem]";

          return (
            <div
              key={`${track.id}-${step.id ?? index}`}
              className={joinClasses(
                "min-h-[5rem] overflow-hidden border px-3 py-2",
                markerShape === "circle" ? "rounded-[1.5rem]" : "rounded-md"
              )}
              aria-label={`${track.label}: ${step.label}, ${markerActive ? "active marker" : "inactive marker"}${inHighlightSegment ? ", highlighted segment" : ""}`}
              style={{
                borderColor: inHighlightSegment ? highlightColor : "var(--color-border)",
                backgroundColor: markerActive
                  ? markerColor
                  : inHighlightSegment
                    ? resolveCompareHighlightFallback(highlightColor)
                    : "transparent",
                backgroundImage:
                  !markerActive && inHighlightSegment
                    ? `linear-gradient(color-mix(in oklab, ${highlightColor} 18%, transparent), color-mix(in oklab, ${highlightColor} 18%, transparent))`
                    : undefined,
                color: markerActive ? "var(--color-bg)" : stepLabelColor,
              }}
            >
              {renderLinkedCompareContent(
                stepLink,
                stepLink ? `Open ${step.label} for ${track.label}` : undefined,
                "block no-underline",
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    data-compare-marker-shape={markerShape}
                    className={markerBadgeClass}
                    style={{
                      borderColor: markerActive ? "var(--color-bg)" : "var(--color-border)",
                      color: markerActive ? "var(--color-bg)" : stepLabelColor,
                      backgroundColor:
                        markerShape === "circle" && !markerActive
                          ? "transparent"
                          : markerActive
                            ? "transparent"
                            : "var(--color-bg)",
                    }}
                  >
                    {resolveMarkerBadgeContent(markerShape, markerActive, index)}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={joinClasses(
                        "break-words",
                        stepLabelSizeClass,
                        stepLabelWeightClass
                      )}
                    >
                      {step.label}
                    </p>
                    {step.description ? (
                      <p
                        className="mt-1 break-words text-xs"
                        style={{ color: markerActive ? "var(--color-bg)" : mutedStepColor }}
                      >
                        {step.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {trackIsHighlighted && (track.segments?.length ?? 0) > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" data-compare-segments="true">
          {track.segments?.map((segment, index) => (
            <div
              key={`${track.id}-${segment.from}-${segment.to}-${index}`}
              data-compare-segment={`${segment.from}-${segment.to}`}
            >
              {renderLinkedCompareContent(
                resolveCompareStepLink(segment.href),
                `Open ${track.label} segment ${segment.label ?? `Steps ${segment.from + 1}-${segment.to + 1}`}`,
                joinClasses(
                  "inline-flex max-w-full break-words no-underline",
                  segmentLabelBaseClass,
                  segmentLabelSizeClass
                ),
                <span
                  aria-label={`${track.label} segment ${segment.label ?? `Steps ${segment.from + 1}-${segment.to + 1}`}`}
                  style={segmentLabelStyle}
                >
                  {segment.label ?? `Steps ${segment.from + 1}-${segment.to + 1}`}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CompareTimelineBlock({
  data,
  variant,
}: {
  data: CompareTimelineData;
  variant: string;
}) {
  const normalizedData = normalizeCompareTimelineData(data);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const steps = normalizedData.axis.steps;
  const tracks = normalizedData.tracks;
  const guides: Required<NonNullable<CompareTimelineData["guides"]>> = {
    enabled: normalizedData.guides?.enabled ?? true,
    style: normalizedData.guides?.style ?? "dashed",
  };
  const layout: Required<NonNullable<CompareTimelineData["layout"]>> = {
    trackSpacing: normalizedData.layout?.trackSpacing ?? "md",
    labelPosition: normalizedData.layout?.labelPosition ?? "top",
    maxWidth: normalizedData.layout?.maxWidth ?? "6xl",
    padding: normalizedData.layout?.padding ?? "md",
    trackOrder: normalizedData.layout?.trackOrder ?? "a-first",
    motion: normalizedData.layout?.motion ?? "none",
  };
  const style: Required<NonNullable<CompareTimelineData["style"]>> = {
    highlightColor: normalizedData.style?.highlightColor ?? "#f59e0b",
    highlightLabelStyle: normalizedData.style?.highlightLabelStyle ?? "solid",
    markerColor: normalizedData.style?.markerColor ?? "var(--color-primary)",
    trackLabelColor: normalizedData.style?.trackLabelColor ?? "var(--color-text)",
    stepLabelColor: normalizedData.style?.stepLabelColor ?? "var(--color-text)",
    mutedStepColor: normalizedData.style?.mutedStepColor ?? "var(--color-text)",
    guideColor: normalizedData.style?.guideColor ?? "var(--color-border)",
    trackBackgroundColor: normalizedData.style?.trackBackgroundColor ?? "transparent",
    trackLabelSize: normalizedData.style?.trackLabelSize ?? "base",
    stepLabelSize: normalizedData.style?.stepLabelSize ?? "xs",
    segmentLabelSize: normalizedData.style?.segmentLabelSize ?? "xs",
    trackLabelFontWeight: normalizedData.style?.trackLabelFontWeight ?? "semibold",
    stepLabelFontWeight: normalizedData.style?.stepLabelFontWeight ?? "semibold",
    segmentLabelFontWeight: normalizedData.style?.segmentLabelFontWeight ?? "normal",
    markerShape: normalizedData.style?.markerShape ?? "rounded",
  };
  const targetTrackId = normalizedData.highlight?.targetTrackId ?? tracks[1]?.id ?? tracks[0]?.id;
  const targetTrackIds = normalizedData.highlight?.targetTrackIds ?? [targetTrackId];
  const renderedTracks = resolveCompareTracksForRender(tracks, layout.trackOrder);
  const sectionTitle = normalizedData.header?.title?.trim();
  const sectionSubtitle = normalizedData.header?.subtitle?.trim();
  const sectionHeadingId = sectionTitle ? "compare-timeline-heading" : undefined;
  const stepLabelWeightClass = fontWeightClassMap[style.stepLabelFontWeight ?? "semibold"];

  return (
    <section
      className={paddingClassMap[layout.padding ?? "md"]}
      aria-labelledby={sectionHeadingId}
      aria-label={sectionHeadingId ? undefined : "Compare Timeline"}
    >
      <div
        className={joinClasses(
          "mx-auto w-full space-y-4",
          maxWidthClassMap[layout.maxWidth ?? "6xl"]
        )}
        data-compare-variant={resolvedVariant}
        data-compare-label-position={layout.labelPosition}
        data-compare-target-track={targetTrackId}
        data-compare-target-tracks={targetTrackIds.join(",")}
        data-compare-max-width={layout.maxWidth}
        data-compare-padding={layout.padding}
        data-compare-track-order={layout.trackOrder}
        data-compare-motion={layout.motion}
        data-compare-marker-shape={style.markerShape}
      >
        {sectionTitle || sectionSubtitle ? (
          <div className="space-y-2">
            {sectionTitle ? (
              <h2 id={sectionHeadingId} className="text-2xl font-semibold text-foreground">
                {sectionTitle}
              </h2>
            ) : null}
            {sectionSubtitle ? (
              <p className="max-w-3xl text-sm text-foreground/80">{sectionSubtitle}</p>
            ) : null}
          </div>
        ) : null}

        {layout.labelPosition === "top" ? (
          <CompareAxisRow
            steps={steps}
            stepLabelColor={style.stepLabelColor ?? "var(--color-text)"}
            stepLabelWeightClass={stepLabelWeightClass}
          />
        ) : null}

        <div
          className={joinClasses(
            "flex flex-col",
            trackSpacingClassMap[layout.trackSpacing ?? "md"],
            motionClassMap[layout.motion ?? "none"]
          )}
        >
          {renderedTracks.map((track) => (
            <CompareTrackRow
              key={track.id}
              track={track}
              steps={steps}
              variant={resolvedVariant}
              targetTrackIds={targetTrackIds}
              guides={guides}
              style={style}
            />
          ))}
        </div>

        {layout.labelPosition === "bottom" ? (
          <CompareAxisRow
            steps={steps}
            stepLabelColor={style.stepLabelColor ?? "var(--color-text)"}
            stepLabelWeightClass={stepLabelWeightClass}
          />
        ) : null}
      </div>
    </section>
  );
}

export function createCompareTimelineWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<CompareTimelineData>>;
  visual: ComponentType<WidgetEditorProps<CompareTimelineData>>;
  advanced: ComponentType<WidgetEditorProps<CompareTimelineData>>;
}): WidgetDefinition<CompareTimelineData> {
  return {
    type: "compare-timeline",
    title: "Compare Timeline",
    description: "Two-track process comparison.",
    category: "content",
    variants: [
      {
        id: "dual-track",
        label: "Dual Track",
        description: "Compare two processes against the same step axis.",
      },
      {
        id: "dual-track-highlight",
        label: "Highlight",
        description: "Emphasize key segments on one or both tracks.",
      },
    ],
    schema: compareTimelineSchema,
    defaults: compareTimelineDefaults,
    editor: editors,
    editorContract: compareTimelineEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: CompareTimelineBlock,
  };
}

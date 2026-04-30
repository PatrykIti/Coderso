import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactObject, resolveClearableStyleValue } from "./clearableStyle";

export type CompareTimelineVariantId = "dual-track" | "dual-track-highlight";
export type CompareTimelineGuideStyle = "solid" | "dashed";
export type CompareTimelineTrackSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type CompareTimelineLabelPosition = "top" | "bottom";
export type CompareTimelineHighlightLabelStyle = "solid" | "outline" | "subtle";
export type CompareTimelineTrackLabelSize = "none" | "sm" | "base" | "lg";
export type CompareTimelineStepLabelSize = "none" | "xs" | "sm" | "base";
export type CompareTimelineSegmentLabelSize = "none" | "xs" | "sm" | "base";

export type CompareAxisStep = {
  id?: string;
  label: string;
  description?: string;
};

export type CompareTrackSegment = {
  from: number;
  to: number;
  label?: string;
};

export type CompareTrack = {
  id: string;
  label: string;
  markers: number[];
  segments?: CompareTrackSegment[];
};

export type CompareTimelineData = {
  axis: { steps: CompareAxisStep[] };
  tracks: CompareTrack[];
  guides?: { enabled?: boolean; style?: CompareTimelineGuideStyle };
  layout?: {
    trackSpacing?: CompareTimelineTrackSpacing;
    labelPosition?: CompareTimelineLabelPosition;
  };
  highlight?: {
    targetTrackId?: string;
  };
  style?: {
    highlightColor?: string;
    highlightLabelStyle?: CompareTimelineHighlightLabelStyle;
    markerColor?: string;
    trackLabelColor?: string;
    stepLabelColor?: string;
    mutedStepColor?: string;
    guideColor?: string;
    trackLabelSize?: CompareTimelineTrackLabelSize;
    stepLabelSize?: CompareTimelineStepLabelSize;
    segmentLabelSize?: CompareTimelineSegmentLabelSize;
  };
};

export const compareAxisStepMin = 3;
export const compareAxisStepMax = 6;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const trackSpacingClassMap = {
  none: "space-y-0",
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
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

const labelIdFallback = (index: number) => `step-${index + 1}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const compareTimelineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["axis", "tracks"],
  properties: {
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
      },
    },
    highlight: {
      type: "object",
      additionalProperties: false,
      properties: {
        targetTrackId: { type: "string" },
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
        trackLabelSize: { enum: ["none", "sm", "base", "lg"] },
        stepLabelSize: { enum: ["none", "xs", "sm", "base"] },
        segmentLabelSize: { enum: ["none", "xs", "sm", "base"] },
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
  layout: { trackSpacing: "md", labelPosition: "top" },
  highlight: { targetTrackId: "b" },
  style: {
    highlightColor: "#f59e0b",
    highlightLabelStyle: "solid",
    markerColor: "var(--color-primary)",
    trackLabelColor: "var(--color-text)",
    stepLabelColor: "var(--color-text)",
    mutedStepColor: "var(--color-text)",
    guideColor: "var(--color-border)",
    trackLabelSize: "base",
    stepLabelSize: "xs",
    segmentLabelSize: "xs",
  },
};

const resolveStepFallbackLabel = (index: number) => {
  const defaults = ["Plan", "Build", "Deliver", "Optimize", "Scale", "Review"];
  return defaults[index] ?? `Step ${index + 1}`;
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
      description:
        typeof base.description === "string" && base.description.trim().length > 0
          ? base.description
          : undefined,
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

    const signature = `${from}:${to}:${label ?? ""}`;
    if (seen.has(signature)) continue;
    seen.add(signature);

    normalized.push({ from, to, label });
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
  const targetTrackId = data.highlight?.targetTrackId;
  const resolvedTargetTrackId = tracks.some((track) => track.id === targetTrackId)
    ? targetTrackId
    : (tracks[1]?.id ?? tracks[0]?.id);
  const hasStyleObject = data.style !== undefined;
  const clearableStyle = hasStyleObject
    ? compactObject({
        highlightColor: resolveClearableStyleValue(data.style?.highlightColor),
        markerColor: resolveClearableStyleValue(data.style?.markerColor),
        trackLabelColor: resolveClearableStyleValue(data.style?.trackLabelColor),
        stepLabelColor: resolveClearableStyleValue(data.style?.stepLabelColor),
        mutedStepColor: resolveClearableStyleValue(data.style?.mutedStepColor),
        guideColor: resolveClearableStyleValue(data.style?.guideColor),
      })
    : compactObject({
        highlightColor: resolveClearableStyleValue(compareTimelineDefaults.style?.highlightColor),
        markerColor: resolveClearableStyleValue(compareTimelineDefaults.style?.markerColor),
        trackLabelColor: resolveClearableStyleValue(compareTimelineDefaults.style?.trackLabelColor),
        stepLabelColor: resolveClearableStyleValue(compareTimelineDefaults.style?.stepLabelColor),
        mutedStepColor: resolveClearableStyleValue(compareTimelineDefaults.style?.mutedStepColor),
        guideColor: resolveClearableStyleValue(compareTimelineDefaults.style?.guideColor),
      });

  return {
    ...data,
    axis: {
      steps: axisSteps,
    },
    tracks,
    guides: {
      enabled: data.guides?.enabled ?? compareTimelineDefaults.guides?.enabled,
      style: data.guides?.style ?? compareTimelineDefaults.guides?.style,
    },
    layout: {
      trackSpacing: data.layout?.trackSpacing ?? compareTimelineDefaults.layout?.trackSpacing,
      labelPosition: data.layout?.labelPosition ?? compareTimelineDefaults.layout?.labelPosition,
    },
    highlight: {
      targetTrackId: resolvedTargetTrackId,
    },
    style: {
      highlightLabelStyle:
        data.style?.highlightLabelStyle ?? compareTimelineDefaults.style?.highlightLabelStyle,
      trackLabelSize: data.style?.trackLabelSize ?? compareTimelineDefaults.style?.trackLabelSize,
      stepLabelSize: data.style?.stepLabelSize ?? compareTimelineDefaults.style?.stepLabelSize,
      segmentLabelSize:
        data.style?.segmentLabelSize ?? compareTimelineDefaults.style?.segmentLabelSize,
      ...(clearableStyle ?? {}),
    },
  };
}

export const resolveCompareTimelineVariant = (variant: string): CompareTimelineVariantId =>
  variant === "dual-track-highlight" ? "dual-track-highlight" : "dual-track";

const stepIsWithinSegment = (segments: CompareTrackSegment[] | undefined, index: number) => {
  if (!Array.isArray(segments)) return false;
  return segments.some((segment) => index >= segment.from && index <= segment.to);
};

function CompareAxisRow({
  steps,
  stepLabelColor,
}: {
  steps: CompareAxisStep[];
  stepLabelColor: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-compare-axis="true">
      {steps.map((step, index) => (
        <div
          key={step.id ?? `${step.label}-${index}`}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        >
          <p className="text-xs font-semibold" style={{ color: stepLabelColor }}>
            {step.label}
          </p>
          {step.description ? (
            <p className="mt-1 text-xs opacity-80" style={{ color: stepLabelColor }}>
              {step.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CompareTrackRow({
  track,
  steps,
  variant,
  targetTrackId,
  guides,
  style,
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  variant: CompareTimelineVariantId;
  targetTrackId: string;
  guides: Required<NonNullable<CompareTimelineData["guides"]>>;
  style: Required<NonNullable<CompareTimelineData["style"]>>;
}) {
  const trackIsHighlighted = variant === "dual-track-highlight" && track.id === targetTrackId;
  const markerColor = style.markerColor ?? "var(--color-primary)";
  const highlightColor = style.highlightColor ?? "#f59e0b";
  const stepLabelColor = style.stepLabelColor ?? "var(--color-text)";
  const mutedStepColor = style.mutedStepColor ?? "var(--color-text)";
  const trackLabelColor = style.trackLabelColor ?? "var(--color-text)";
  const guideColor = style.guideColor ?? "var(--color-border)";
  const trackLabelSizeClass = trackLabelSizeClassMap[style.trackLabelSize ?? "base"];
  const stepLabelSizeClass = stepLabelSizeClassMap[style.stepLabelSize ?? "xs"];
  const segmentLabelSizeClass = segmentLabelSizeClassMap[style.segmentLabelSize ?? "xs"];

  const segmentLabelBaseClass = "rounded-full border px-2 py-1 text-xs";
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
      className="rounded-lg border p-4"
      style={{
        borderStyle: guides.enabled ? guides.style : "solid",
        borderColor: guideColor,
      }}
    >
      <p
        className={joinClasses("font-semibold", trackLabelSizeClass)}
        style={{ color: trackLabelColor }}
      >
        {track.label}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const markerActive = track.markers.includes(index);
          const inHighlightSegment =
            trackIsHighlighted && stepIsWithinSegment(track.segments, index);
          return (
            <div
              key={`${track.id}-${step.id ?? index}`}
              className="rounded-md border px-3 py-2"
              style={{
                borderColor: inHighlightSegment ? highlightColor : "var(--color-border)",
                backgroundColor: markerActive
                  ? markerColor
                  : inHighlightSegment
                    ? `color-mix(in oklab, ${highlightColor} 18%, transparent)`
                    : "transparent",
                color: markerActive ? "var(--color-bg)" : stepLabelColor,
              }}
            >
              <p className={joinClasses("font-semibold", stepLabelSizeClass)}>{step.label}</p>
              {step.description ? (
                <p
                  className="mt-1 text-xs"
                  style={{ color: markerActive ? "var(--color-bg)" : mutedStepColor }}
                >
                  {step.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {trackIsHighlighted && (track.segments?.length ?? 0) > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" data-compare-segments="true">
          {track.segments?.map((segment, index) => (
            <span
              key={`${track.id}-${segment.from}-${segment.to}-${index}`}
              data-compare-segment={`${segment.from}-${segment.to}`}
              className={joinClasses(segmentLabelBaseClass, segmentLabelSizeClass)}
              style={segmentLabelStyle}
            >
              {segment.label ?? `Steps ${segment.from + 1}-${segment.to + 1}`}
            </span>
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
  };
  const style: Required<NonNullable<CompareTimelineData["style"]>> = {
    highlightColor: normalizedData.style?.highlightColor ?? "#f59e0b",
    highlightLabelStyle: normalizedData.style?.highlightLabelStyle ?? "solid",
    markerColor: normalizedData.style?.markerColor ?? "var(--color-primary)",
    trackLabelColor: normalizedData.style?.trackLabelColor ?? "var(--color-text)",
    stepLabelColor: normalizedData.style?.stepLabelColor ?? "var(--color-text)",
    mutedStepColor: normalizedData.style?.mutedStepColor ?? "var(--color-text)",
    guideColor: normalizedData.style?.guideColor ?? "var(--color-border)",
    trackLabelSize: normalizedData.style?.trackLabelSize ?? "base",
    stepLabelSize: normalizedData.style?.stepLabelSize ?? "xs",
    segmentLabelSize: normalizedData.style?.segmentLabelSize ?? "xs",
  };
  const targetTrackId = normalizedData.highlight?.targetTrackId ?? tracks[1]?.id ?? tracks[0]?.id;

  return (
    <section className="px-4 py-8">
      <div
        className="mx-auto w-full max-w-6xl space-y-4"
        data-compare-variant={resolvedVariant}
        data-compare-label-position={layout.labelPosition}
        data-compare-target-track={targetTrackId}
      >
        {layout.labelPosition === "top" ? (
          <CompareAxisRow
            steps={steps}
            stepLabelColor={style.stepLabelColor ?? "var(--color-text)"}
          />
        ) : null}

        <div
          className={joinClasses(
            "flex flex-col",
            trackSpacingClassMap[layout.trackSpacing ?? "md"]
          )}
        >
          {tracks.map((track) => (
            <CompareTrackRow
              key={track.id}
              track={track}
              steps={steps}
              variant={resolvedVariant}
              targetTrackId={targetTrackId}
              guides={guides}
              style={style}
            />
          ))}
        </div>

        {layout.labelPosition === "bottom" ? (
          <CompareAxisRow
            steps={steps}
            stepLabelColor={style.stepLabelColor ?? "var(--color-text)"}
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
        description: "Emphasize key segments on the selected track.",
      },
    ],
    schema: compareTimelineSchema,
    defaults: compareTimelineDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: CompareTimelineBlock,
  };
}

import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type CompareAxisStep = {
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
  guides?: { enabled?: boolean; style?: "solid" | "dashed" };
  style?: { highlightColor?: string };
};

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
          minItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label"],
            properties: {
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
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "markers"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          markers: { type: "array", items: { type: "integer" } },
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
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        highlightColor: { type: "string" },
      },
    },
  },
};

export const compareTimelineDefaults: CompareTimelineData = {
  axis: {
    steps: [{ label: "Plan" }, { label: "Build" }, { label: "Deliver" }],
  },
  tracks: [
    { id: "a", label: "Traditional", markers: [0, 1, 2] },
    { id: "b", label: "With us", markers: [0, 2] },
  ],
  guides: { enabled: true, style: "dashed" },
  style: { highlightColor: "amber" },
};

export function CompareTimelineBlock({
  data,
}: {
  data: CompareTimelineData;
  variant: string;
}) {
  return (
    <section className="px-4 py-8">
      <div className="space-y-4">
        {data.tracks.map((track) => (
          <div key={track.id} className="rounded-lg border p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {track.label}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text)]/70">
              {data.axis.steps.map((step, index) => (
                <span
                  key={`${track.id}-${index}`}
                  className={
                    track.markers.includes(index)
                      ? "rounded-full bg-[var(--color-primary)] px-2 py-1 text-[var(--color-bg)]"
                      : "rounded-full border px-2 py-1"
                  }
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        ))}
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
      { id: "dual-track", label: "Dual Track" },
      { id: "dual-track-highlight", label: "Highlight" },
    ],
    schema: compareTimelineSchema,
    defaults: compareTimelineDefaults,
    editor: editors,
    render: CompareTimelineBlock,
  };
}

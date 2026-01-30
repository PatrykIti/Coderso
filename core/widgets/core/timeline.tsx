import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type TimelineStep = {
  title: string;
  description?: string;
  icon?: string;
};

export type TimelineData = {
  steps: TimelineStep[];
  layout?: {
    orientation?: "horizontal" | "vertical";
    align?: "start" | "center" | "end";
    labelPosition?: "top" | "bottom";
  };
  guides?: {
    enabled?: boolean;
    style?: "solid" | "dashed";
  };
  style?: {
    lineStyle?: "solid" | "dashed";
    markerSize?: "sm" | "md" | "lg";
  };
};

export const timelineSchema = {
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
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          icon: { type: "string" },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        orientation: { enum: ["horizontal", "vertical"] },
        align: { enum: ["start", "center", "end"] },
        labelPosition: { enum: ["top", "bottom"] },
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
        lineStyle: { enum: ["solid", "dashed"] },
        markerSize: { enum: ["sm", "md", "lg"] },
      },
    },
  },
};

export const timelineDefaults: TimelineData = {
  steps: [
    { title: "Discovery" },
    { title: "Planning" },
    { title: "Build" },
  ],
  layout: { orientation: "horizontal", align: "center", labelPosition: "top" },
  guides: { enabled: true, style: "dashed" },
  style: { lineStyle: "solid", markerSize: "md" },
};

export function TimelineBlock({ data }: { data: TimelineData; variant: string }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-6 px-4 py-8">
      {data.steps.map((step, index) => (
        <li key={`${step.title}-${index}`} className="flex flex-col items-center">
          <span className="h-3 w-3 rounded-full bg-[var(--color-primary)]" />
          <span className="mt-2 text-sm font-semibold text-[var(--color-text)]">
            {step.title}
          </span>
          {step.description ? (
            <span className="text-xs text-[var(--color-text)]/60">
              {step.description}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
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
      { id: "milestones", label: "Milestones" },
      { id: "cards", label: "Cards" },
      { id: "compact", label: "Compact" },
    ],
    schema: timelineSchema,
    defaults: timelineDefaults,
    editor: editors,
    render: TimelineBlock,
  };
}

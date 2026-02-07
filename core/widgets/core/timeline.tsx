import type { CSSProperties, ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type TimelineVariantId = "milestones" | "cards" | "compact";
export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineAlign = "start" | "center" | "end";
export type TimelineLabelPosition = "top" | "bottom";
export type TimelineSpacing = "sm" | "md" | "lg" | "xl";
export type TimelineGuideStyle = "solid" | "dashed";
export type TimelineLineStyle = "solid" | "dashed";
export type TimelineMarkerSize = "sm" | "md" | "lg";
export type TimelineThickness = "1" | "2" | "3" | "4";

export type TimelineStep = {
  id?: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
};

export type TimelineData = {
  steps: TimelineStep[];
  layout?: {
    orientation?: TimelineOrientation;
    align?: TimelineAlign;
    spacing?: TimelineSpacing;
    labelPosition?: TimelineLabelPosition;
  };
  guides?: {
    enabled?: boolean;
    style?: TimelineGuideStyle;
  };
  style?: {
    lineStyle?: TimelineLineStyle;
    thickness?: TimelineThickness;
    markerSize?: TimelineMarkerSize;
    lineColor?: string;
    markerColor?: string;
    titleColor?: string;
    descriptionColor?: string;
  };
  background?: {
    color?: string;
  };
};

export const timelineStepMin = 3;
export const timelineStepMax = 8;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const spacingClassMap = {
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
  xl: "gap-9",
} as const;

const markerSizeClassMap = {
  sm: "h-2.5 w-2.5",
  md: "h-3.5 w-3.5",
  lg: "h-5 w-5",
} as const;

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

export const timelineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
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
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        orientation: { enum: ["horizontal", "vertical"] },
        align: { enum: ["start", "center", "end"] },
        spacing: { enum: ["sm", "md", "lg", "xl"] },
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
        thickness: { enum: ["1", "2", "3", "4"] },
        markerSize: { enum: ["sm", "md", "lg"] },
        lineColor: { type: "string" },
        markerColor: { type: "string" },
        titleColor: { type: "string" },
        descriptionColor: { type: "string" },
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

const createStepId = (index: number) => `step-${index + 1}`;

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
        : fallbackTitles[index] ?? `Step ${index + 1}`;

    normalized.push({
      id,
      title,
      description: typeof base.description === "string" ? base.description : undefined,
      icon: typeof base.icon === "string" ? base.icon : undefined,
      accent: typeof base.accent === "string" ? base.accent : undefined,
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
  layout: {
    orientation: "horizontal",
    align: "center",
    spacing: "md",
    labelPosition: "top",
  },
  guides: { enabled: true, style: "dashed" },
  style: {
    lineStyle: "solid",
    thickness: "2",
    markerSize: "md",
  },
  background: { color: "transparent" },
};

export const resolveTimelineVariant = (variant: string): TimelineVariantId => {
  if (variant === "cards" || variant === "compact") return variant;
  return "milestones";
};

export const resolveTimelineLayout = (
  layout: TimelineData["layout"]
): Required<NonNullable<TimelineData["layout"]>> => ({
  orientation: layout?.orientation ?? "horizontal",
  align: layout?.align ?? "center",
  spacing: layout?.spacing ?? "md",
  labelPosition: layout?.labelPosition ?? "top",
});

export const resolveTimelineGuides = (
  guides: TimelineData["guides"]
): Required<NonNullable<TimelineData["guides"]>> => ({
  enabled: guides?.enabled ?? true,
  style: guides?.style ?? "dashed",
});

export const resolveTimelineStyle = (
  style: TimelineData["style"]
): Required<Pick<NonNullable<TimelineData["style"]>, "lineStyle" | "thickness" | "markerSize">> &
  Pick<
    NonNullable<TimelineData["style"]>,
    "lineColor" | "markerColor" | "titleColor" | "descriptionColor"
  > => ({
  lineStyle: style?.lineStyle ?? "solid",
  thickness: style?.thickness ?? "2",
  markerSize: style?.markerSize ?? "md",
  lineColor: style?.lineColor,
  markerColor: style?.markerColor,
  titleColor: style?.titleColor,
  descriptionColor: style?.descriptionColor,
});

const renderStepText = (
  step: TimelineStep,
  align: TimelineAlign,
  titleColor: string,
  descriptionColor: string,
  compact?: boolean
) => (
  <div className={joinClasses("space-y-1", textAlignClassMap[align] ?? "text-center")}>
    <div className="flex items-center gap-2">
      {step.icon ? <span className="text-sm leading-none">{step.icon}</span> : null}
      <span className={joinClasses("font-semibold", compact ? "text-sm" : "text-base")} style={{ color: titleColor }}>
        {step.title}
      </span>
    </div>
    {!compact && step.description ? (
      <p className="text-xs" style={{ color: descriptionColor }}>
        {step.description}
      </p>
    ) : null}
  </div>
);

function TimelineMilestonesLayout({
  steps,
  layout,
  guides,
  style,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
}) {
  const markerColor = style.markerColor ?? "var(--color-primary)";
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";
  const markerSize = markerSizeClassMap[style.markerSize] ?? "h-3.5 w-3.5";
  const connectorStyle = {
    backgroundColor: lineColor,
    borderStyle: guides.style,
  } satisfies CSSProperties;

  if (layout.orientation === "vertical") {
    return (
      <ol className={joinClasses("flex flex-col", spacingClassMap[layout.spacing] ?? "gap-5")}>
        {steps.map((step, index) => {
          const markerAccent = step.accent ?? markerColor;
          const textNode = renderStepText(
            step,
            layout.align,
            titleColor,
            descriptionColor
          );
          return (
            <li
              key={step.id ?? `${step.title}-${index}`}
              className={joinClasses(
                "flex w-full gap-4",
                layout.labelPosition === "top" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={joinClasses("min-w-0 flex-1", itemAlignClassMap[layout.align])}>
                {textNode}
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={joinClasses("rounded-full border", markerSize)}
                  style={{
                    backgroundColor: markerAccent,
                    borderColor: markerAccent,
                    borderWidth: lineThickness,
                    borderStyle: style.lineStyle,
                  }}
                />
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
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol
      className={joinClasses(
        "flex w-full flex-wrap",
        spacingClassMap[layout.spacing] ?? "gap-5",
        justifyClassMap[layout.align] ?? "justify-center"
      )}
    >
      {steps.map((step, index) => {
        const markerAccent = step.accent ?? markerColor;
        const textNode = renderStepText(step, layout.align, titleColor, descriptionColor);
        return (
          <li
            key={step.id ?? `${step.title}-${index}`}
            className={joinClasses("min-w-[10rem]", itemAlignClassMap[layout.align])}
          >
            {layout.labelPosition === "top" ? textNode : null}
            <div className={joinClasses("my-2 flex items-center", layout.align === "end" ? "justify-end" : "justify-start")}>
              <span
                className={joinClasses("rounded-full border", markerSize)}
                style={{
                  backgroundColor: markerAccent,
                  borderColor: markerAccent,
                  borderWidth: lineThickness,
                  borderStyle: style.lineStyle,
                }}
              />
              {guides.enabled && index < steps.length - 1 ? (
                <span
                  className="ml-2 block"
                  style={{
                    ...connectorStyle,
                    width: "4rem",
                    height: lineThickness,
                  }}
                />
              ) : null}
            </div>
            {layout.labelPosition === "bottom" ? textNode : null}
          </li>
        );
      })}
    </ol>
  );
}

function TimelineCardsLayout({
  steps,
  layout,
  guides,
  style,
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
}) {
  const markerColor = style.markerColor ?? "var(--color-primary)";
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";
  const markerSize = markerSizeClassMap[style.markerSize] ?? "h-3.5 w-3.5";

  return (
    <ol
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
      {steps.map((step, index) => {
        const markerAccent = step.accent ?? markerColor;
        return (
          <li
            key={step.id ?? `${step.title}-${index}`}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            style={{
              borderStyle: style.lineStyle,
              borderWidth: lineThickness,
              borderColor: lineColor,
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className={joinClasses("mt-1 rounded-full", markerSize)}
                style={{ backgroundColor: markerAccent }}
              />
              <div className="min-w-0 flex-1">
                {renderStepText(step, layout.align, titleColor, descriptionColor)}
              </div>
            </div>
            {guides.enabled ? (
              <div
                className="mt-3"
                style={{
                  borderTopStyle: guides.style,
                  borderTopWidth: lineThickness,
                  borderTopColor: lineColor,
                }}
              />
            ) : null}
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
}: {
  steps: TimelineStep[];
  layout: Required<NonNullable<TimelineData["layout"]>>;
  guides: Required<NonNullable<TimelineData["guides"]>>;
  style: ReturnType<typeof resolveTimelineStyle>;
}) {
  const markerColor = style.markerColor ?? "var(--color-primary)";
  const lineColor = style.lineColor ?? "var(--color-border)";
  const titleColor = style.titleColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const lineThickness = thicknessValueMap[style.thickness] ?? "2px";
  const markerSize = markerSizeClassMap[style.markerSize] ?? "h-3.5 w-3.5";

  return (
    <ol
      className={joinClasses(
        "flex",
        layout.orientation === "vertical" ? "flex-col" : "flex-wrap",
        spacingClassMap[layout.spacing] ?? "gap-5",
        layout.orientation === "horizontal"
          ? justifyClassMap[layout.align] ?? "justify-center"
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
        >
          <span
            className={joinClasses("rounded-full", markerSize)}
            style={{ backgroundColor: step.accent ?? markerColor }}
          />
          {renderStepText(step, layout.align, titleColor, descriptionColor, true)}
          {guides.enabled && layout.orientation === "horizontal" && index < steps.length - 1 ? (
            <span
              className="mx-1 block"
              style={{
                width: "1.5rem",
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
}

export function TimelineBlock({ data, variant }: { data: TimelineData; variant: string }) {
  const resolvedVariant = resolveTimelineVariant(variant);
  const steps = normalizeTimelineSteps(data.steps);
  const layout = resolveTimelineLayout(data.layout);
  const guides = resolveTimelineGuides(data.guides);
  const style = resolveTimelineStyle(data.style);
  const backgroundColor = data.background?.color ?? "transparent";

  return (
    <section className="px-4 py-8" style={{ backgroundColor }}>
      <div className="mx-auto w-full max-w-6xl">
        <div
          data-timeline-variant={resolvedVariant}
          data-timeline-orientation={layout.orientation}
          data-timeline-label-position={layout.labelPosition}
        >
          {resolvedVariant === "cards" ? (
            <TimelineCardsLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
            />
          ) : resolvedVariant === "compact" ? (
            <TimelineCompactLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
            />
          ) : (
            <TimelineMilestonesLayout
              steps={steps}
              layout={layout}
              guides={guides}
              style={style}
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
    render: TimelineBlock,
  };
}

import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  TimelineAdvancedEditor,
  TimelineVisualEditor,
  TimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TimelineEditors";
import {
  TimelineBlock,
  createTimelineWidget,
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
  timelineDefaults,
  timelineStepMax,
  type TimelineData,
} from "../../../core/widgets/core/timeline";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TimelineData>> = () => null;

test("timeline renders defaults", () => {
  const html = renderToString(<TimelineBlock data={timelineDefaults} variant="milestones" />);
  expect(html).toContain(timelineDefaults.steps[0]?.title ?? "");
  expect(html).toContain('data-timeline-variant="milestones"');
  expect(html).toContain('data-timeline-orientation="horizontal"');
  expect(html).toContain('data-timeline-label-position="top"');
});

test("timeline normalizes step count and keeps IDs unique", () => {
  const steps = normalizeTimelineSteps(
    [
      { id: "step-1", title: "One" },
      { id: "step-1", title: "Two" },
    ],
    4
  );

  expect(steps).toHaveLength(4);
  expect(steps[0]?.id).toBe("step-1");
  expect(steps[1]?.id).not.toBe("step-1");
  expect(new Set(steps.map((step) => step.id)).size).toBe(4);
  expect(steps[3]?.title).toBe("Launch");
});

test("timeline step count clamp respects min and max", () => {
  expect(normalizeTimelineStepCount(0)).toBe(3);
  expect(normalizeTimelineStepCount(99)).toBe(timelineStepMax);
});

test("timeline validator accepts extended model fields", () => {
  clearWidgets();
  registerWidget(
    createTimelineWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const normalized = normalizeWidgetBlock({
    id: "timeline-extended",
    type: "timeline",
    variant: "cards",
    data: {
      ...timelineDefaults,
      steps: normalizeTimelineSteps(timelineDefaults.steps, 4).map((step, index) => ({
        ...step,
        accent: index === 0 ? "#1d4ed8" : undefined,
      })),
      layout: {
        orientation: "vertical",
        align: "start",
        spacing: "lg",
        labelPosition: "bottom",
      },
      guides: {
        enabled: true,
        style: "solid",
      },
      style: {
        lineStyle: "dashed",
        thickness: "3",
        markerSize: "lg",
        lineColor: "#cbd5e1",
        markerColor: "#1d4ed8",
        titleSize: "lg",
        descriptionSize: "sm",
      },
      background: {
        color: "#f8fafc",
      },
    },
  });

  expect(normalized.variant).toBe("cards");
  const data = normalized.data as TimelineData;
  expect(data.layout?.spacing).toBe("lg");
  expect(data.style?.thickness).toBe("3");
  expect(data.style?.titleSize).toBe("lg");
  expect(data.background?.color).toBe("#f8fafc");
});

test("timeline cleared background omits section style while semantic markers remain readable", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        background: {},
        style: {
          ...timelineDefaults.style,
          lineColor: undefined,
          markerColor: undefined,
        },
      }}
      variant="milestones"
    />
  );

  expect(html).toContain('data-timeline-variant="milestones"');
  expect(html).not.toContain("background-color:transparent");
  expect(html).toContain("var(--color-primary)");
  expect(html).toContain("var(--color-border)");
});

test("timeline validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createTimelineWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "timeline-1",
      type: "timeline",
      variant: "bad",
      data: timelineDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("timeline widget uses visual-owned variant controls", () => {
  const widget = createTimelineWidget({
    wizard: TimelineWizardEditor,
    visual: TimelineVisualEditor,
    advanced: TimelineAdvancedEditor,
  });

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("timeline visual editor renders section-based IA", () => {
  const html = renderToString(
    <TimelineVisualEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="milestones"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and timeline structure");
  expect(html).toContain("Steps content and order");
  expect(html).toContain("Guides and axis line");
  expect(html).toContain("Markers and accents");
  expect(html).toContain("Colors and background");
  expect(html).toContain("Typography and spacing");
});

test("timeline advanced editor keeps technical-only scope", () => {
  const html = renderToString(
    <TimelineAdvancedEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="milestones"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout tokens");
  expect(html).toContain("Data normalization");
  expect(html).not.toContain("Steps content and order");
  expect(html).not.toContain("Colors and background");
});

test("timeline renderer falls back to milestones for unknown variant", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        layout: {
          ...timelineDefaults.layout,
          orientation: "vertical",
          labelPosition: "bottom",
        },
      }}
      variant="unknown"
    />
  );

  expect(html).toContain('data-timeline-variant="milestones"');
  expect(html).toContain('data-timeline-orientation="vertical"');
  expect(html).toContain('data-timeline-label-position="bottom"');
});

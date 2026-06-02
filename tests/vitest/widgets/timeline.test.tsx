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
  normalizeTimelineData,
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
  resolveTimelineMode,
  timelineDefaults,
  timelineStepMax,
  type TimelineData,
} from "../../../core/widgets/core/timeline";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TimelineData>> = () => null;

test("timeline renders defaults with container metadata", () => {
  const html = renderToString(<TimelineBlock data={timelineDefaults} variant="milestones" />);
  expect(html).toContain(timelineDefaults.steps[0]?.title ?? "");
  expect(html).toContain('data-timeline-variant="milestones"');
  expect(html).toContain('data-timeline-mode="axis"');
  expect(html).toContain('data-timeline-orientation="horizontal"');
  expect(html).toContain('data-timeline-label-position="top"');
  expect(html).toContain('data-timeline-padding="md"');
  expect(html).toContain('data-timeline-max-width="6xl"');
  expect(html).toContain('data-timeline-effective-max-width="5xl"');
  expect(html).toContain('data-timeline-max-width-narrowed="true"');
  expect(html).toContain('data-timeline-marker-display="dot"');
  expect(html).toContain('data-timeline-marker-icon-fallback-count="0"');
  expect(html).toContain('data-timeline-description-size="xs"');
  expect(html).toContain('data-timeline-title-weight="semibold"');
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

test("timeline validator accepts extended model fields and normalizes safe links", () => {
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
      header: {
        title: "Roadmap",
        description: "Quarterly milestones",
      },
      mode: "alternating",
      steps: normalizeTimelineSteps(timelineDefaults.steps, 4).map((step, index) => ({
        ...step,
        accent: index === 0 ? "#1d4ed8" : undefined,
        markerIcon: index === 0 ? "rocket" : undefined,
        markerIconColor: index === 0 ? "#ffffff" : undefined,
        markerBackgroundColor: index === 0 ? "#0f172a" : undefined,
        date: `2026-05-0${index + 1}`,
        dateLabel: `May ${index + 1}, 2026`,
        status: index === 1 ? "current" : undefined,
        cta:
          index === 0
            ? { label: "Read step", href: "/timeline-step" }
            : index === 1
              ? { label: "Blocked", href: "javascript:alert(1)" }
              : undefined,
        link:
          index === 2
            ? { href: "/whole-step", label: "Open whole step" }
            : index === 3
              ? { href: "javascript:alert(1)", label: "Bad" }
              : undefined,
      })),
      layout: {
        orientation: "vertical",
        align: "start",
        spacing: "lg",
        labelPosition: "bottom",
        padding: "lg",
        sectionSpacing: "md",
        maxWidth: "7xl",
      },
      guides: {
        enabled: true,
        style: "solid",
      },
      style: {
        lineStyle: "dashed",
        thickness: "3",
        markerSize: "lg",
        markerDisplay: "icon",
        lineColor: "#cbd5e1",
        markerColor: "#1d4ed8",
        titleColor: "#0f172a",
        descriptionColor: "#334155",
        titleSize: "lg",
        descriptionSize: "sm",
        titleWeight: "bold",
      },
      background: {
        color: "#f8fafc",
      },
    },
  });

  expect(normalized.variant).toBe("cards");
  const data = normalized.data as TimelineData;
  const normalizedData = normalizeTimelineData(data, normalized.variant);
  expect(normalizedData.header).toEqual({ title: "Roadmap", description: "Quarterly milestones" });
  expect(normalizedData.mode).toBe("alternating");
  expect(normalizedData.layout).toEqual(
    expect.objectContaining({
      spacing: "lg",
      padding: "lg",
      sectionSpacing: "md",
      maxWidth: "7xl",
    })
  );
  expect(normalizedData.style).toEqual(
    expect.objectContaining({
      thickness: "3",
      markerDisplay: "icon",
      titleSize: "lg",
      titleWeight: "bold",
    })
  );
  expect(normalizedData.background?.color).toBe("#f8fafc");
  expect(normalizedData.steps[0]?.cta).toEqual({ label: "Read step", href: "/timeline-step" });
  expect(normalizedData.steps[1]?.cta).toBeUndefined();
  expect(normalizedData.steps[2]?.link).toEqual({ href: "/whole-step", label: "Open whole step" });
  expect(normalizedData.steps[3]?.link).toBeUndefined();
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
  expect(html).toContain('data-widget-editor-section="timeline.mode-layout"');
  expect(html).toContain('data-widget-editor-section="timeline.items-dates"');
  expect(html).toContain('data-widget-editor-section="timeline.axis-markers"');
  expect(html).toContain('data-widget-editor-section="timeline.markers-accents"');
  expect(html).toContain('data-widget-editor-section="timeline.colors"');
  expect(html).toContain('data-widget-editor-section="timeline.typography-spacing"');
});

test("timeline advanced editor keeps read-only diagnostics scope", () => {
  const html = renderToString(
    <TimelineAdvancedEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="milestones"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Runtime summary");
  expect(html).toContain("Layout diagnostics");
  expect(html).toContain("Data normalization");
  expect(html).toContain("Advanced mode is read-only.");
  expect(html).toContain("Normalization scope");
  expect(html).toContain("Wizard owns");
  expect(html).toContain("Visual owns");
  expect(html).toContain("Advanced owns");
  expect(html).toContain('data-widget-editor-section="timeline.runtime-summary"');
  expect(html).toContain('data-widget-editor-section="timeline.layout-diagnostics"');
  expect(html).toContain('data-widget-editor-section="timeline.data-normalization"');
  expect(html).toContain('data-widget-control-ownership="readonly"');
  expect(html).not.toContain("Steps content and order");
  expect(html).not.toContain("Colors and background");
  expect(html).not.toContain("Review normalization");
  expect(html).not.toContain("Confirm normalization");
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
  expect(html).toContain('data-timeline-mode="axis"');
  expect(html).toContain('data-timeline-orientation="vertical"');
  expect(html).toContain('data-timeline-label-position="bottom"');
});

test("timeline resolves legacy variants to compatibility modes", () => {
  expect(resolveTimelineMode(undefined, "milestones")).toBe("axis");
  expect(resolveTimelineMode(undefined, "cards")).toBe("chronology");
  expect(resolveTimelineMode(undefined, "compact")).toBe("process");
});

test("timeline renderer adds section labels, list labels, current-step semantics, and hides decorative icons", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        header: {
          title: "Roadmap",
          description: "Shared milestones",
        },
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Discover",
            icon: "compass",
            status: "current",
            link: { href: "/discover", label: "Open discovery" },
          },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ]),
      }}
      variant="milestones"
    />
  );

  expect(html).toContain('aria-labelledby="timeline-heading-roadmap"');
  expect(html).toContain('aria-label="Roadmap steps"');
  expect(html).toContain('aria-current="step"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('href="/discover"');
  expect(html).toContain('aria-label="Open discovery"');
});

test("timeline chronology, alternating, and cards layouts reflect runtime bug fixes", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        mode: "chronology",
        style: {
          ...timelineDefaults.style,
          lineStyle: "dashed",
        },
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Launch",
            description: "Roll out the release.",
            date: "2026-05-11",
            dateLabel: "May 11, 2026",
            status: "current",
          },
          {
            id: "step-2",
            title: "Iterate",
            dateLabel: "Next week",
          },
          {
            id: "step-3",
            title: "Scale",
          },
        ]),
      }}
      variant="cards"
    />
  );

  expect(html).toContain("md:grid-cols-[minmax(0,clamp(8rem,24vw,14rem))_minmax(0,1fr)]");
  expect(html).not.toContain("md:grid-cols-[10rem_1fr]");
  expect(html).toContain('dateTime="2026-05-11"');

  const alternatingHtml = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        mode: "alternating",
        steps: normalizeTimelineSteps([
          { id: "step-1", title: "Discover", dateLabel: "Week 1" },
          { id: "step-2", title: "Plan", dateLabel: "Week 2" },
          { id: "step-3", title: "Ship", dateLabel: "Week 3" },
        ]),
      }}
      variant="cards"
    />
  );

  expect(alternatingHtml).toContain("md:hidden");
  expect(alternatingHtml).not.toContain("hidden md:block");

  const cardsHtml = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        style: {
          ...timelineDefaults.style,
          lineStyle: "dashed",
        },
      }}
      variant="cards"
    />
  );

  expect(cardsHtml).toContain("border-top-style:dashed");
  expect(cardsHtml).toContain(
    "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
  );

  const milestonesHtml = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        steps: normalizeTimelineSteps(timelineDefaults.steps, 4),
      }}
      variant="milestones"
    />
  );

  expect(milestonesHtml).toContain("overflow-x-auto");
  expect(milestonesHtml).not.toContain("width:4rem");
});

test("timeline whole-step links stay safe and do not nest with CTA links", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        style: {
          ...timelineDefaults.style,
          markerDisplay: "icon",
        },
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Discover",
            markerIcon: "rocket",
            markerBackgroundColor: "#0f172a",
            markerIconColor: "#ffffff",
            link: { href: "/whole-step", label: "Open discovery" },
          },
          {
            id: "step-2",
            title: "Plan",
            cta: { label: "Read details", href: "/cta-step" },
            link: { href: "/suppressed-whole-step", label: "Should not render" },
          },
          {
            id: "step-3",
            title: "Ship",
          },
        ]),
      }}
      variant="milestones"
    />
  );

  expect(html).toContain('href="/whole-step"');
  expect(html).toContain('href="/cta-step"');
  expect(html).not.toContain("/suppressed-whole-step");
  expect(html).toContain('data-timeline-marker-display="icon"');
});

test("timeline process layout renders step CTAs without nesting whole-step links", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        mode: "process",
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Discover",
            cta: { label: "Read details", href: "/cta-step" },
            link: { href: "/suppressed-whole-step", label: "Should not render" },
          },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ]),
      }}
      variant="compact"
    />
  );

  expect(html).toContain('data-timeline-mode="process"');
  expect(html).toContain('data-timeline-step-cta="compact"');
  expect(html).toContain('href="/cta-step"');
  expect(html).toContain(">Read details</a>");
  expect(html).not.toContain("/suppressed-whole-step");
});

test("timeline exposes truthful marker fallback, description-size, and effective-width diagnostics", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        steps: normalizeTimelineSteps([
          { id: "step-1", title: "Discover", description: "Visible description" },
          { id: "step-2", title: "Plan", description: "Also visible", markerIcon: "star" },
          { id: "step-3", title: "Ship", description: "Still visible" },
        ]),
        layout: {
          ...timelineDefaults.layout,
          maxWidth: "6xl",
        },
        style: {
          ...timelineDefaults.style,
          markerDisplay: "icon",
          descriptionSize: "none",
        },
      }}
      variant="milestones"
    />
  );

  expect(html).toContain('data-timeline-max-width="6xl"');
  expect(html).toContain('data-timeline-effective-max-width="5xl"');
  expect(html).toContain('data-timeline-max-width-narrowed="true"');
  expect(html).toContain('data-timeline-marker-display="icon"');
  expect(html).toContain('data-timeline-marker-icon-fallback-count="2"');
  expect(html).toContain('data-timeline-marker-requested-display="icon"');
  expect(html).toContain('data-timeline-marker-effective-display="dot"');
  expect(html).toContain('data-timeline-marker-effective-display="icon"');
  expect(html).toContain('data-timeline-description-size="none"');
  expect(html).toContain(">Visible description</p>");
  expect(html).toContain(">Also visible</p>");
  expect(html).not.toContain('class="text-xs" style="color:var(--color-text)">Visible description');

  const widerHtml = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        steps: normalizeTimelineSteps(timelineDefaults.steps, 4),
        layout: {
          ...timelineDefaults.layout,
          maxWidth: "6xl",
        },
      }}
      variant="milestones"
    />
  );

  expect(widerHtml).toContain('data-timeline-effective-max-width="6xl"');
  expect(widerHtml).toContain('data-timeline-max-width-narrowed="false"');
  expect(widerHtml).toContain("max-w-6xl");
});

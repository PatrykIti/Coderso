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
  dotToneToken,
  normalizeTimelineData,
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
  resolveTimelineCapability,
  timelineDefaults,
  timelineStepMax,
  timelineVariantCapabilities,
  timelineVariantIds,
  type TimelineData,
} from "../../../core/widgets/core/timeline";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";

const StubEditor: ComponentType<WidgetEditorProps<TimelineData>> = () => null;

function registerTimeline() {
  clearWidgets();
  registerWidget(
    createTimelineWidget({ wizard: StubEditor, visual: StubEditor, advanced: StubEditor })
  );
}

const threeSteps = (extra?: Partial<TimelineData["steps"][number]>) =>
  normalizeTimelineSteps([
    { id: "step-1", title: "Discover", ...extra },
    { id: "step-2", title: "Plan" },
    { id: "step-3", title: "Ship" },
  ]);

test("timeline drops rejected authoring colors without raw marker/background fallback", () => {
  const normalized = normalizeTimelineData({
    ...timelineDefaults,
    steps: threeSteps({ markerIconColor: " currentColor " }),
    background: { color: "\u00a0#123456" },
  });
  expect(normalized.steps.every((step) => step.markerIconColor === undefined)).toBe(true);
  expect(normalized.background?.color).toBeUndefined();

  const html = renderToString(<TimelineBlock data={normalized} variant="alternating" />);
  expect(html).not.toContain("currentColor");
  expect(html).not.toContain("#123456");
  expect(html).not.toContain("\u00a0");
});

test("timeline reuses one authoring-color table across schema, normalize, and concrete render sinks", () => {
  const terminal = "#abc";
  const exactCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;
  const colorConsumers = [
    {
      id: "marker",
      build: (raw: string): TimelineData => ({
        ...timelineDefaults,
        steps: [
          { id: "step-1", title: "Discover", markerIconColor: raw },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ],
      }),
      read: (data: TimelineData) => data.steps[0]?.markerIconColor,
      renderedStyle: (html: string) =>
        html.match(/<span\b(?=[^>]*data-timeline-dot-variant=)[^>]*style="([^"]*)"/)?.[1],
    },
    {
      id: "background",
      build: (raw: string): TimelineData => ({
        ...timelineDefaults,
        background: { color: raw },
      }),
      read: (data: TimelineData) => data.background?.color,
      renderedStyle: (html: string) => html.match(/<section\b[^>]*style="([^"]*)"/)?.[1],
    },
  ] as const;
  const rejected = [
    ` ${exactCap}`,
    "#fff\u001f",
    "#fff\u0085",
    "\u00a0#fff",
    "\u2003#fff",
    "currentColor",
    "inherit",
  ];

  expect(exactCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
  registerTimeline();
  for (const consumer of colorConsumers) {
    const validData = consumer.build(exactCap);
    expect(() =>
      normalizeWidgetBlock({
        id: `timeline-${consumer.id}-valid`,
        type: "timeline",
        variant: "alternating",
        data: validData,
      })
    ).not.toThrow();
    const normalized = normalizeTimelineData(validData, "alternating");
    expect(consumer.read(normalized)).toBe(terminal);
    expect(
      consumer.renderedStyle(
        renderToString(<TimelineBlock data={validData} variant="alternating" />)
      )
    ).toContain(consumer.id === "marker" ? "color:#abc" : "background-color:#abc");

    for (const raw of rejected) {
      const rejectedData = consumer.build(raw);
      expect(() =>
        normalizeWidgetBlock({
          id: `timeline-${consumer.id}-reject-${raw.length}-${raw.charCodeAt(0)}`,
          type: "timeline",
          variant: "alternating",
          data: rejectedData,
        })
      ).toThrow("widget_schema_invalid");
      expect(consumer.read(normalizeTimelineData(rejectedData, "alternating"))).toBeUndefined();
      expect(
        consumer.renderedStyle(
          renderToString(<TimelineBlock data={rejectedData} variant="alternating" />)
        ) ?? ""
      ).not.toContain(raw);
    }
  }
});

test("timeline registers and validates defaults", () => {
  registerTimeline();
  const normalized = normalizeWidgetBlock({
    id: "timeline-defaults",
    type: "timeline",
    variant: "vertical-right",
    data: timelineDefaults,
  });
  expect(normalized.variant).toBe("vertical-right");
});

test("timeline validator rejects invalid variant and unknown keys", () => {
  registerTimeline();
  expect(() =>
    normalizeWidgetBlock({
      id: "bad-variant",
      type: "timeline",
      variant: "bad",
      data: timelineDefaults,
    })
  ).toThrow("widget_invalid_variant");

  expect(() =>
    normalizeWidgetBlock({
      id: "bad-key",
      type: "timeline",
      variant: "cards",
      data: { ...timelineDefaults, bogus: true } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("timeline render falls back to the first preset for unknown variants", () => {
  const html = renderToString(<TimelineBlock data={timelineDefaults} variant="unknown" />);
  expect(html).toContain('data-timeline-variant="vertical-right"');
});

test("timeline normalize resolves partial nested groups from defaults", () => {
  const data = normalizeTimelineData(
    { steps: threeSteps(), dot: { tone: "secondary" }, spacing: { gap: "lg" } } as TimelineData,
    "vertical-right"
  );
  expect(data.dot).toEqual({ variant: "filled", tone: "secondary", size: "md", icon: "none" });
  expect(data.connector).toEqual({ show: true, style: "solid", thickness: "2" });
  expect(data.typography).toEqual({
    titleSize: "base",
    titleWeight: "semibold",
    descriptionSize: "sm",
  });
  expect(data.spacing?.gap).toBe("lg");
  expect(data.spacing?.padding).toBe("md");
});

test("timeline normalize clamps step count and keeps IDs unique", () => {
  const steps = normalizeTimelineSteps(
    [
      { id: "step-1", title: "One" },
      { id: "step-1", title: "Two" },
    ],
    4
  );
  expect(steps).toHaveLength(4);
  expect(new Set(steps.map((step) => step.id)).size).toBe(4);
  expect(normalizeTimelineStepCount(0)).toBe(3);
  expect(normalizeTimelineStepCount(99)).toBe(timelineStepMax);
});

test("timeline normalize sanitizes unsafe CTA and link destinations", () => {
  const data = normalizeTimelineData(
    {
      steps: normalizeTimelineSteps([
        { id: "step-1", title: "A", cta: { label: "Go", href: "/ok" } },
        { id: "step-2", title: "B", cta: { label: "Bad", href: "javascript:alert(1)" } },
        { id: "step-3", title: "C", link: { href: "data:text/html,evil" } },
      ]),
    } as TimelineData,
    "vertical-right"
  );
  expect(data.steps[0]?.cta).toEqual({ label: "Go", href: "/ok" });
  expect(data.steps[1]?.cta).toBeUndefined();
  expect(data.steps[2]?.link).toBeUndefined();
});

test("timeline applies and clears the section background color", () => {
  const withBackground = renderToString(
    <TimelineBlock
      data={{ ...timelineDefaults, background: { color: "#123456" } }}
      variant="vertical-right"
    />
  );
  expect(withBackground).toContain("background-color:#123456");

  const cleared = renderToString(
    <TimelineBlock data={{ ...timelineDefaults, background: {} }} variant="vertical-right" />
  );
  expect(cleared).not.toContain("#123456");
});

test("timeline renders contract metadata for every preset", () => {
  for (const id of timelineVariantIds) {
    const cap = timelineVariantCapabilities[id];
    const html = renderToString(<TimelineBlock data={timelineDefaults} variant={id} />);
    expect(html).toContain(`data-timeline-variant="${id}"`);
    expect(html).toContain(`data-timeline-orientation="${cap.orientation}"`);
    expect(html).toContain(`data-timeline-surface="${cap.surface}"`);
  }
});

test("timeline vertical presets place content on the configured side", () => {
  const right = renderToString(<TimelineBlock data={timelineDefaults} variant="vertical-right" />);
  expect(right).toContain('data-timeline-axis-position="right"');
  expect(right).toContain("flex-row");

  const left = renderToString(<TimelineBlock data={timelineDefaults} variant="vertical-left" />);
  expect(left).toContain('data-timeline-axis-position="left"');
  expect(left).toContain("flex-row-reverse");
});

test("timeline alternating presets use the centered three-column axis", () => {
  const alt = renderToString(<TimelineBlock data={timelineDefaults} variant="alternating" />);
  expect(alt).toContain('data-timeline-axis-position="alternate"');
  expect(alt).toContain("md:grid-cols-[1fr_auto_1fr]");
});

test("timeline alternating-opposite renders opposite content with a time element", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Discover",
            oppositeContent: "Q1 2026",
            oppositeDate: "2026-01-01",
          },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ]),
      }}
      variant="alternating-opposite"
    />
  );
  expect(html).toContain('dateTime="2026-01-01"');
  expect(html).toContain("Q1 2026");
});

test("timeline cards preset wraps each step in a bordered surface", () => {
  const html = renderToString(<TimelineBlock data={timelineDefaults} variant="cards" />);
  expect(html).toContain("border border-[var(--color-border)] bg-[var(--color-bg)]");
});

test("timeline compact preset uses an overflow-safe horizontal strip", () => {
  const html = renderToString(<TimelineBlock data={timelineDefaults} variant="compact" />);
  expect(html).toContain("overflow-x-auto");
});

test("timeline dots render filled and outlined variants through theme tokens", () => {
  const filled = renderToString(
    <TimelineBlock
      data={{ ...timelineDefaults, dot: { variant: "filled", tone: "primary", size: "md" } }}
      variant="vertical-right"
    />
  );
  expect(filled).toContain('data-timeline-dot-variant="filled"');
  expect(filled).toContain(dotToneToken.primary);
  expect(filled).not.toMatch(/emerald/);

  const outlined = renderToString(
    <TimelineBlock
      data={{ ...timelineDefaults, dot: { variant: "outlined", tone: "secondary", size: "md" } }}
      variant="vertical-right"
    />
  );
  expect(outlined).toContain('data-timeline-dot-variant="outlined"');
  expect(outlined).toContain(dotToneToken.secondary);
});

test("timeline per-step dot tone and variant override the global default", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        dot: { variant: "filled", tone: "primary", size: "md" },
        steps: normalizeTimelineSteps([
          { id: "step-1", title: "Discover", dotTone: "warning", dotVariant: "outlined" },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ]),
      }}
      variant="vertical-right"
    />
  );
  expect(html).toContain('data-timeline-dot-tone="warning"');
  expect(html).toContain(dotToneToken.warning);
});

test("timeline renders lucide dot icons globally and per step", () => {
  const global = renderToString(
    <TimelineBlock
      data={{ ...timelineDefaults, dot: { ...timelineDefaults.dot, icon: "rocket" } }}
      variant="vertical-right"
    />
  );
  expect(global).toContain('data-timeline-dot-icon="rocket"');
  expect(global).toContain("<svg");
  expect(global).toContain("lucide");

  const perStep = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        dot: { ...timelineDefaults.dot, icon: "none" },
        steps: normalizeTimelineSteps([
          { id: "step-1", title: "A", markerIcon: "trophy" },
          { id: "step-2", title: "B" },
          { id: "step-3", title: "C" },
        ]),
      }}
      variant="vertical-right"
    />
  );
  expect(perStep).toContain('data-timeline-dot-icon="trophy"');
  expect(perStep).toContain('data-timeline-dot-icon="none"');
});

test("timeline status badges stay token-based with no hardcoded palette", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        steps: normalizeTimelineSteps([
          { id: "step-1", title: "A", status: "complete" },
          { id: "step-2", title: "B", status: "current" },
          { id: "step-3", title: "C", status: "upcoming" },
        ]),
      }}
      variant="vertical-right"
    />
  );
  expect(html).not.toMatch(/emerald/);
  expect(html).toContain('aria-current="step"');
});

test("timeline only renders fields the active preset exposes", () => {
  const baseSteps = threeSteps();
  const withOpposite = normalizeTimelineSteps([
    { id: "step-1", title: "Discover", oppositeContent: "OPPO-MARKER", oppositeDate: "2026-01-01" },
    { id: "step-2", title: "Plan" },
    { id: "step-3", title: "Ship" },
  ]);

  for (const id of timelineVariantIds) {
    const cap = timelineVariantCapabilities[id];
    const base = renderToString(
      <TimelineBlock data={{ ...timelineDefaults, steps: baseSteps }} variant={id} />
    );
    const mutated = renderToString(
      <TimelineBlock data={{ ...timelineDefaults, steps: withOpposite }} variant={id} />
    );
    if (cap.visibleFields.has("oppositeContent")) {
      expect(mutated).toContain("OPPO-MARKER");
      expect(mutated).not.toBe(base);
    } else {
      expect(mutated).not.toContain("OPPO-MARKER");
      expect(mutated).toBe(base);
    }
  }
});

test("timeline keeps semantic markup and safe link nesting", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        header: { title: "Roadmap", description: "Shared milestones" },
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Discover",
            markerIcon: "rocket",
            status: "current",
            link: { href: "/discover", label: "Open discovery" },
          },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ]),
      }}
      variant="vertical-right"
    />
  );
  expect(html).toContain('aria-labelledby="timeline-heading-roadmap"');
  expect(html).toContain('aria-label="Roadmap steps"');
  expect(html).toContain('aria-current="step"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('href="/discover"');
  expect(html).toContain('aria-label="Open discovery"');
});

test("timeline suppresses whole-step links when a CTA is present", () => {
  const html = renderToString(
    <TimelineBlock
      data={{
        ...timelineDefaults,
        steps: normalizeTimelineSteps([
          {
            id: "step-1",
            title: "Discover",
            cta: { label: "Read", href: "/cta" },
            link: { href: "/whole-step", label: "Should not render" },
          },
          { id: "step-2", title: "Plan" },
          { id: "step-3", title: "Ship" },
        ]),
      }}
      variant="vertical-right"
    />
  );
  expect(html).toContain('href="/cta"');
  expect(html).not.toContain("/whole-step");
});

test("timeline editor contract is valid", () => {
  const widget = createTimelineWidget({
    wizard: TimelineWizardEditor,
    visual: TimelineVisualEditor,
    advanced: TimelineAdvancedEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });
  expect(validation.errors).toEqual([]);
  expect(validation.valid).toBe(true);
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("timeline renders identically through the public and editor-preview surfaces", () => {
  registerTimeline();
  const block = {
    id: "timeline-parity",
    type: "timeline",
    variant: "alternating-opposite",
    data: {
      ...timelineDefaults,
      header: { title: "Roadmap" },
      steps: normalizeTimelineSteps([
        { id: "step-1", title: "Discover", oppositeContent: "Q1", oppositeDate: "2026-01-01" },
        { id: "step-2", title: "Plan" },
        { id: "step-3", title: "Ship" },
      ]),
    },
  } as const;

  const publicHtml = renderToString(
    <WidgetRenderer block={{ ...block }} renderContext={{ mode: "public" }} />
  );
  const editorHtml = renderToString(
    <WidgetRenderer block={{ ...block }} renderContext={{ mode: "editor-preview" }} />
  );

  for (const html of [publicHtml, editorHtml]) {
    expect(html).not.toContain("Invalid widget data");
    expect(html).toContain('data-timeline-variant="alternating-opposite"');
    expect(html).toContain('data-timeline-orientation="vertical"');
    expect(html).toContain('dateTime="2026-01-01"');
    expect(html).toContain('aria-label="Roadmap steps"');
  }
});

test("timeline visual editor gates options by preset", () => {
  const verticalHtml = renderToString(
    <TimelineVisualEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="vertical-right"
      onVariantChange={() => undefined}
    />
  );
  expect(verticalHtml).toContain('data-widget-editor-section="timeline.visual.preset-structure"');
  expect(verticalHtml).toContain('data-widget-editor-section="timeline.visual.step-content"');
  expect(verticalHtml).toContain('data-widget-editor-section="timeline.visual.dots-connector"');
  expect(verticalHtml).toContain('data-widget-editor-section="timeline.visual.appearance"');
  expect(verticalHtml).not.toContain('data-widget-control="timeline.visual.axis-position"');
  expect(verticalHtml).not.toContain("opposite-content");

  const oppositeHtml = renderToString(
    <TimelineVisualEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="alternating-opposite"
      onVariantChange={() => undefined}
    />
  );
  expect(oppositeHtml).toContain('data-widget-control="timeline.visual.axis-position"');
  expect(oppositeHtml).toContain("opposite-content");

  const compactHtml = renderToString(
    <TimelineVisualEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="compact"
      onVariantChange={() => undefined}
    />
  );
  expect(compactHtml).not.toContain('data-widget-control="timeline.visual.axis-position"');
  expect(compactHtml).not.toContain("opposite-content");
});

test("timeline wizard renders the preset gallery", () => {
  const html = renderToString(
    <TimelineWizardEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="vertical-right"
      onVariantChange={() => undefined}
    />
  );
  expect(html).toContain('data-widget-editor-section="timeline.setup.gallery"');
  expect(html).toContain("Choose a timeline preset");
});

test("timeline advanced editor stays read-only", () => {
  const html = renderToString(
    <TimelineAdvancedEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="vertical-right"
      onVariantChange={() => undefined}
    />
  );
  expect(html).toContain("Advanced mode is read-only.");
  expect(html).toContain('data-widget-editor-section="timeline.advanced.runtime"');
  expect(html).toContain('data-widget-editor-section="timeline.advanced.appearance"');
  expect(html).toContain('data-widget-editor-section="timeline.advanced.normalization"');
  expect(html).toContain('data-widget-control-ownership="readonly"');
  expect(html).toContain(resolveTimelineCapability("vertical-right").label);
});

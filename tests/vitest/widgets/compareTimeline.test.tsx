import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  CompareTimelineAdvancedEditor,
  CompareTimelineVisualEditor,
  CompareTimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/CompareTimelineEditors";
import {
  CompareTimelineBlock,
  compareTimelineEditorContract,
  compareTimelineDefaults,
  createCompareTimelineWidget,
  normalizeCompareTimelineData,
  type CompareTimelineData,
} from "../../../core/widgets/core/compareTimeline";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<CompareTimelineData>> = () => null;

test("compare timeline renders defaults", () => {
  const html = renderToString(
    <CompareTimelineBlock data={compareTimelineDefaults} variant="dual-track" />
  );

  expect(html).toContain(compareTimelineDefaults.tracks[0]?.label ?? "");
  expect(html).toContain('data-compare-variant="dual-track"');
  expect(html).toContain('data-compare-label-position="top"');
  expect(html).toContain('data-compare-motion="none"');
});

test("compare timeline normalizes markers and segments safely", () => {
  const normalized = normalizeCompareTimelineData({
    axis: {
      steps: [{ label: "Plan" }, { label: "Build" }, { label: "Deliver" }],
    },
    tracks: [
      {
        id: "x",
        label: "Track A",
        markers: [-1, 0, 0, 10],
        segments: [
          { from: 2, to: 0, label: "Reverse" },
          { from: 10, to: 1 },
        ],
      },
      {
        id: "y",
        label: "Track B",
        markers: [1, 2],
        segments: [{ from: 2, to: 2, label: "Single" }],
      },
    ],
  });

  expect(normalized.tracks[0]?.id).toBe("a");
  expect(normalized.tracks[1]?.id).toBe("b");
  expect(normalized.tracks[0]?.markers).toEqual([0, 2]);
  expect(normalized.tracks[0]?.segments?.[0]).toEqual({
    from: 0,
    to: 2,
    label: "Reverse",
  });
  expect(normalized.tracks[0]?.segments?.[1]).toEqual({
    from: 1,
    to: 2,
    label: undefined,
  });
});

test("compare timeline validator accepts extended fields", () => {
  clearWidgets();
  const widget = createCompareTimelineWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "compare-extended",
      type: "compare-timeline",
      variant: "dual-track-highlight",
      data: {
        ...compareTimelineDefaults,
        header: {
          title: "Compare rollout paths",
          subtitle: "Show the contrast before and after adopting the platform.",
        },
        axis: {
          steps: [
            { label: "Plan", icon: "🧭", href: "/plan" },
            { label: "Build", description: "Align owners", href: "https://example.com/build" },
            { label: "Launch", description: "Ship fast" },
          ],
        },
        layout: {
          trackSpacing: "lg",
          labelPosition: "bottom",
          maxWidth: "7xl",
          padding: "lg",
          trackOrder: "b-first",
          motion: "fade",
        },
        highlight: {
          targetTrackId: "b",
          targetTrackIds: ["a", "b"],
        },
        style: {
          highlightColor: "#f59e0b",
          highlightLabelStyle: "outline",
          markerColor: "#1d4ed8",
          trackLabelColor: "#0f172a",
          stepLabelColor: "#0f172a",
          mutedStepColor: "#334155",
          guideColor: "#e2e8f0",
          trackBackgroundColor: "#ffffff",
          trackLabelSize: "lg",
          stepLabelSize: "sm",
          segmentLabelSize: "base",
          trackLabelFontWeight: "bold",
          stepLabelFontWeight: "medium",
          segmentLabelFontWeight: "semibold",
          markerShape: "numbered",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("compare timeline cleared style colors omit normalized keys while runtime keeps readable fallbacks", () => {
  const normalized = normalizeCompareTimelineData({
    ...compareTimelineDefaults,
    style: {},
  });
  const html = renderToString(
    <CompareTimelineBlock data={normalized} variant="dual-track-highlight" />
  );

  expect(normalized.style?.highlightColor).toBeUndefined();
  expect(normalized.style?.markerColor).toBeUndefined();
  expect(normalized.style?.guideColor).toBeUndefined();
  expect(normalized.style?.trackBackgroundColor).toBeUndefined();
  expect(html).toContain('data-compare-variant="dual-track-highlight"');
  expect(html).toContain("var(--color-primary)");
  expect(html).toContain("var(--color-border)");
  expect(html).toContain("rgba(245, 158, 11, 0.18)");
});

test("compare timeline renders motion-safe classes when a motion preset is configured", () => {
  const html = renderToString(
    <CompareTimelineBlock
      data={normalizeCompareTimelineData({
        ...compareTimelineDefaults,
        layout: {
          ...compareTimelineDefaults.layout,
          motion: "slide",
        },
      })}
      variant="dual-track-highlight"
    />
  );

  expect(html).toContain('data-compare-motion="slide"');
  expect(html).toContain("motion-safe:slide-in-from-bottom-2");
  expect(html).toContain("motion-reduce:animate-none");
});

test("compare timeline validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createCompareTimelineWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "compare-1",
      type: "compare-timeline",
      variant: "nope",
      data: compareTimelineDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("compare timeline wizard renders minimal onboarding fields", () => {
  const html = renderToString(
    <CompareTimelineWizardEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Quick setup");
  expect(html).toContain("Highlight mode");
  expect(html).toContain("Axis step count");
  expect(html).toContain('data-widget-control-readonly="true"');
  expect(html).toContain("Visual owns axis wording, track labels, marker mapping");
  expect(html).not.toContain("Axis copy");
  expect(html).not.toContain("Track labels");
  expect(html).not.toContain("Marker baseline");
});

test("compare timeline visual renders section-based IA", () => {
  const html = renderToString(
    <CompareTimelineVisualEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track-highlight"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and compare structure");
  expect(html).toContain("Axis steps and track labels");
  expect(html).toContain("Markers and segment mapping");
  expect(html).toContain("Highlight and guide styles");
  expect(html).toContain("Colors and typography");
  expect(html).toContain("Spacing and layout preview hints");
});

test("compare timeline exposes the strict v2 section contract for setup vs mapping ownership", () => {
  const widget = createCompareTimelineWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.editorContract).toBe(compareTimelineEditorContract);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "compare-timeline.wizard.starter-comparison",
    "compare-timeline.visual.variant",
    "compare-timeline.visual.section-heading",
    "compare-timeline.visual.axis-tracks",
    "compare-timeline.visual.markers-segments",
    "compare-timeline.visual.highlight-guides",
    "compare-timeline.visual.colors-typography",
    "compare-timeline.visual.spacing-layout",
    "compare-timeline.advanced.runtime-layout",
    "compare-timeline.advanced.metadata",
    "compare-timeline.advanced.normalization",
  ]);
});

test("compare timeline visual hides segment editor for non-highlight variant", () => {
  const html = renderToString(
    <CompareTimelineVisualEditor
      value={{
        ...compareTimelineDefaults,
        tracks: [
          compareTimelineDefaults.tracks[0] ?? { id: "a", label: "Traditional", markers: [] },
          compareTimelineDefaults.tracks[1] ?? { id: "b", label: "With us", markers: [] },
        ],
      }}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Segment mapping is hidden in Dual Track");
  expect(html).not.toContain("Highlight targets");
});

test("compare timeline renderer applies typography size tokens", () => {
  const html = renderToString(
    <CompareTimelineBlock
      variant="dual-track-highlight"
      data={{
        ...compareTimelineDefaults,
        style: {
          ...compareTimelineDefaults.style,
          trackLabelSize: "lg",
          stepLabelSize: "base",
          segmentLabelSize: "base",
          trackLabelFontWeight: "bold",
          stepLabelFontWeight: "medium",
          segmentLabelFontWeight: "semibold",
        },
      }}
    />
  );

  expect(html).toContain("text-base font-bold");
  expect(html).toContain("text-base font-medium");
  expect(html).toContain("font-semibold");
});

test("compare timeline renderer supports both-track highlight, track order, and safe step links", () => {
  const html = renderToString(
    <CompareTimelineBlock
      variant="dual-track-highlight"
      data={{
        ...compareTimelineDefaults,
        axis: {
          steps: [
            { label: "Plan", href: "/plan" },
            { label: "Build", href: "javascript:alert(1)" },
            { label: "Ship", icon: "🚀", href: "https://example.com/ship" },
          ],
        },
        highlight: {
          targetTrackId: "b",
          targetTrackIds: ["a", "b"],
        },
        layout: {
          ...compareTimelineDefaults.layout,
          trackOrder: "b-first",
        },
      }}
    />
  );

  expect(html).toContain('data-compare-target-tracks="a,b"');
  expect(html).toContain('data-compare-track-order="b-first"');
  expect(html).toContain('href="/plan"');
  expect(html).toContain('href="https://example.com/ship"');
  expect(html).not.toContain("javascript:alert");
});

test("compare timeline advanced keeps technical diagnostics read-only", () => {
  const html = renderToString(
    <CompareTimelineAdvancedEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Runtime layout diagnostics");
  expect(html).toContain("Metadata diagnostics");
  expect(html).toContain("Normalization support");
  expect(html).not.toContain("Colors and typography");
  expect(html).not.toContain("Track spacing token");
  expect(html).not.toContain("Raw metadata fields");
  expect(html).not.toContain("Add step");
  expect(html).toContain("Visual owns guide, highlight, spacing, label, motion, and style changes");
});

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
        layout: {
          trackSpacing: "lg",
          labelPosition: "bottom",
        },
        highlight: {
          targetTrackId: "b",
        },
        style: {
          highlightColor: "#f59e0b",
          highlightLabelStyle: "outline",
          markerColor: "#1d4ed8",
          trackLabelColor: "#0f172a",
          stepLabelColor: "#0f172a",
          mutedStepColor: "#334155",
          guideColor: "#e2e8f0",
          trackLabelSize: "lg",
          stepLabelSize: "sm",
          segmentLabelSize: "base",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
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
  expect(html).toContain("Track labels");
  expect(html).toContain("Marker baseline");
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

test("compare timeline visual hides segment editor for non-highlight variant", () => {
  const html = renderToString(
    <CompareTimelineVisualEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Segment mapping is available only");
  expect(html).not.toContain("Highlight target track");
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
        },
      }}
    />
  );

  expect(html).toContain("font-semibold text-base");
});

test("compare timeline advanced keeps technical-only controls", () => {
  const html = renderToString(
    <CompareTimelineAdvancedEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout tokens");
  expect(html).toContain("Raw metadata fields");
  expect(html).toContain("Data normalization");
  expect(html).not.toContain("Colors and typography");
});

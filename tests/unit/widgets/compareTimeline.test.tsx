import type { ComponentType } from "react";
import { expect, test } from "bun:test";
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
  registerWidget(
    createCompareTimelineWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

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
        },
      },
    })
  ).not.toThrow();
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

test("compare timeline wizard renders full quick setup fields", () => {
  const html = renderToString(
    <CompareTimelineWizardEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Track A markers");
  expect(html).toContain("Track B markers");
  expect(html).toContain("Highlight segments");
});

test("compare timeline visual renders marker and highlight controls", () => {
  const html = renderToString(
    <CompareTimelineVisualEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track-highlight"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Markers mapping");
  expect(html).toContain("Highlight target and segments");
  expect(html).toContain("Highlight label style");
});

test("compare timeline advanced renders full axis and track editors", () => {
  const html = renderToString(
    <CompareTimelineAdvancedEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Axis editor");
  expect(html).toContain("Tracks and segments");
  expect(html).toContain("Guides and layout");
});

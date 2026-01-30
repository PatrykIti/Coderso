import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  CompareTimelineBlock,
  compareTimelineDefaults,
  createCompareTimelineWidget,
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

import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  TimelineBlock,
  createTimelineWidget,
  timelineDefaults,
  type TimelineData,
} from "../../../core/widgets/core/timeline";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TimelineData>> = () => null;

test("timeline renders defaults", () => {
  const html = renderToString(
    <TimelineBlock data={timelineDefaults} variant="milestones" />
  );
  expect(html).toContain(timelineDefaults.steps[0]?.title ?? "");
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

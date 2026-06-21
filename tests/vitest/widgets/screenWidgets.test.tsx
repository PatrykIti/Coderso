import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { CustomScreenPreview } from "../../../core/admin/ui/custom-screens/CustomScreenPreview";
import { ScreenWidgetReadOnlyBlock } from "../../../core/admin/ui/custom-screens/screenWidgetRenderBridge";

import { ScreenFieldValueBlock } from "../../../core/widgets/core/screenFieldValue";
import { ScreenRecordHeaderBlock } from "../../../core/widgets/core/screenRecordHeader";
import { ScreenFieldGroupBlock } from "../../../core/widgets/core/screenFieldGroup";
import { ScreenTwoColumnBlock } from "../../../core/widgets/core/screenTwoColumn";

ensureRuntimeWidgetsRegistered();

test("ScreenFieldValueBlock stringifies primitive bound values", () => {
  const html = renderAdminUi(
    <ScreenFieldValueBlock
      variant="stacked"
      data={{
        label: "Area",
        value: 148 as unknown as string,
        helper: true as unknown as string,
        tone: "strong",
      }}
    />
  );

  expect(html).toContain("148");
  expect(html).toContain("true");
});

test("ScreenRecordHeaderBlock stringifies primitive bound metadata", () => {
  const html = renderAdminUi(
    <ScreenRecordHeaderBlock
      variant="card"
      data={{
        eyebrow: "Projects",
        title: 42 as unknown as string,
        subtitle: "Overview",
        description: false as unknown as string,
        badge: 3 as unknown as string,
        align: "start",
      }}
    />
  );

  expect(html).toContain("42");
  expect(html).toContain("false");
  expect(html).toContain("3");
});

test("screen widget cleared frame styles omit forced surface classes", () => {
  const header = renderAdminUi(
    <ScreenRecordHeaderBlock
      variant="card"
      data={{
        title: "Record",
        style: {},
      }}
    />
  );
  expect(header).not.toContain("bg-gradient-to-br");
  expect(header).not.toContain("bg-background/70");

  const field = renderAdminUi(
    <ScreenFieldValueBlock
      variant="stacked"
      data={{
        label: "Status",
        value: "Open",
        style: {},
      }}
    />
  );
  expect(field).not.toContain("bg-background/70");

  const group = renderAdminUi(
    <ScreenFieldGroupBlock variant="card" data={{ title: "Group", style: {} }} />
  );
  expect(group).not.toContain("bg-background/80");

  const columns = renderAdminUi(
    <ScreenTwoColumnBlock
      variant="balanced"
      data={{ leftTitle: "Left", rightTitle: "Right", style: {} }}
    />
  );
  expect(columns).not.toContain("bg-background/60");
});

test("screen widgets render through WidgetRenderer without invalid widget data for primitive bound values", () => {
  const header = renderAdminUi(
    <WidgetRenderer
      block={{
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: 42,
          subtitle: true,
          badge: 3,
        },
      }}
    />
  );
  expect(header).toContain("42");
  expect(header).toContain("true");
  expect(header).toContain("3");
  expect(header).not.toContain("Invalid widget data");

  const field = renderAdminUi(
    <WidgetRenderer
      block={{
        id: "field-1",
        type: "screen-field-value",
        data: {
          label: "Area",
          value: [148, 212] as unknown as string,
          helper: true as unknown as string,
        },
      }}
    />
  );
  expect(field).toContain("148");
  expect(field).toContain("148, 212");
  expect(field).toContain("true");
  expect(field).not.toContain("Invalid widget data");
});

test("CustomScreenPreview renders V4 screen bindings without WidgetRenderer", () => {
  const html = renderAdminUi(
    <CustomScreenPreview
      document={{
        schemaVersion: 1,
        sections: [
          {
            id: "header-1",
            type: "record-header",
            data: {
              title: "Untitled record",
              subtitle: "Preview subtitle",
            },
          },
        ],
      }}
      bindings={[
        {
          id: "binding-title",
          blockId: "header-1",
          propPath: "title",
          source: "entry",
          field: "title",
          mode: "readwrite",
        },
        {
          id: "binding-subtitle",
          blockId: "header-1",
          propPath: "subtitle",
          source: "entry",
          field: "projectTitle",
          mode: "readwrite",
        },
      ]}
      data={{
        title: "Project title",
        projectTitle: "Villa Aurora",
      }}
    />
  );

  expect(html).toContain("Project title");
  expect(html).toContain("Villa Aurora");
  expect(html).not.toContain("Untitled record");
  expect(html).not.toContain("Invalid widget data");
});

test("ScreenWidgetReadOnlyBlock reuses WidgetRenderer visibility rules for screen widgets", () => {
  const html = renderAdminUi(
    <ScreenWidgetReadOnlyBlock
      block={{
        id: "header-hidden",
        type: "screen-record-header",
        data: {
          title: "Hidden header",
        },
        visibility: {
          enabled: false,
          devices: ["desktop"],
        },
      }}
    />
  );

  expect(html).toBe("");
});

test("ScreenWidgetReadOnlyBlock preserves nested override rendering for slotted screen layouts", () => {
  const html = renderAdminUi(
    <ScreenWidgetReadOnlyBlock
      block={{
        id: "group-1",
        type: "screen-field-group",
        variant: "card",
        data: {
          title: "Details",
        },
        slots: {
          content: [
            {
              id: "field-1",
              type: "screen-field-value",
              variant: "stacked",
              data: {
                label: "Headline",
                value: "Project Aurora",
              },
            },
          ],
        },
      }}
      renderNestedBlock={(child) => <div data-nested-id={child.id}>nested:{child.id}</div>}
    />
  );

  expect(html).toContain('data-nested-id="field-1"');
  expect(html).toContain("nested:");
  expect(html).toContain("field-1");
});

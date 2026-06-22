import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";
import { getWidget } from "../../../core/widgets/registry";
import { CustomScreenPreview } from "../../../core/admin/ui/custom-screens/CustomScreenPreview";

ensureRuntimeWidgetsRegistered();

test("screen-only widgets are retired from the active widget registry", () => {
  expect(getWidget("screen-record-header")).toBeNull();
  expect(getWidget("screen-field-value")).toBeNull();
  expect(getWidget("screen-field-group")).toBeNull();
  expect(getWidget("screen-two-column")).toBeNull();
});

test("CustomScreenPreview renders V4 screen bindings without WidgetRenderer", () => {
  const html = renderAdminUi(
    <CustomScreenPreview
      document={{
        schemaVersion: 1,
        sections: [
          {
            id: "section-1",
            type: "section",
            data: { title: "Details" },
            blocks: [
              {
                id: "header-1",
                type: "record-header",
                data: {
                  title: "Untitled record",
                  subtitle: "Preview subtitle",
                },
              },
              {
                id: "field-1",
                type: "field",
                data: {
                  label: "Area",
                  value: "Empty",
                },
              },
            ],
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
        {
          id: "binding-area",
          blockId: "field-1",
          propPath: "value",
          source: "entry",
          field: "areaM2",
          mode: "readwrite",
        },
      ]}
      data={{
        title: "Project title",
        projectTitle: "Villa Aurora",
        areaM2: 148,
      }}
    />
  );

  expect(html).toContain("Project title");
  expect(html).toContain("Villa Aurora");
  expect(html).toContain("148");
  expect(html).not.toContain("Untitled record");
  expect(html).not.toContain("Invalid widget data");
});

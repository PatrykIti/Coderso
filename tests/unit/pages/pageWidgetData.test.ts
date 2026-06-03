import { afterEach, expect, test } from "bun:test";

import { normalizePageWidgetData } from "../../../core/services/pages/pageWidgetData";
import { clearWidgets } from "../../../core/widgets/registry";
import { clearWidgetValidators } from "../../../core/widgets/validator";

afterEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

test("normalizePageWidgetData rejects invalid Section widget data before persistence", () => {
  expect(() =>
    normalizePageWidgetData({
      blocks: [
        {
          id: "section-invalid",
          type: "section",
          variant: "default",
          data: {
            heading: {
              level: "h8",
            },
            style: {
              borderWidth: "9",
              radius: "circle",
            },
          },
        },
      ],
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizePageWidgetData preserves valid Section widget blocks and slots", () => {
  const normalized = normalizePageWidgetData({
    blocks: [
      {
        id: "section-valid",
        type: "section",
        variant: "default",
        data: {
          heading: {
            title: "Valid section",
          },
        },
        slots: {
          "region:1": [],
        },
      },
    ],
  });

  expect(normalized.blocks).toEqual([
    expect.objectContaining({
      id: "section-valid",
      type: "section",
      variant: "default",
      data: expect.objectContaining({
        heading: expect.objectContaining({
          title: "Valid section",
        }),
      }),
      slots: {
        "region:1": [],
      },
    }),
  ]);
});

test("normalizePageWidgetData rejects invalid Template Section references before persistence", () => {
  expect(() =>
    normalizePageWidgetData({
      blocks: [
        {
          id: "template-section-invalid",
          type: "template-section",
          variant: "default",
          data: {
            templateId: "missing-template-31-05",
          },
        },
      ],
    })
  ).toThrow("widget_schema_invalid");
});

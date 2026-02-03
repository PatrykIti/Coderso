import { expect, test } from "bun:test";

import { mapWidgetBlockOptions } from "../../../core/admin/ui/widgets/widgetInsertUtils";

test("mapWidgetBlockOptions filters invalid blocks and empty ids", () => {
  const options = mapWidgetBlockOptions(
    [
      { id: "", type: "hero" },
      { id: "block-1", type: "hero" },
      { id: "block-2", type: "", extra: true },
      { id: "block-3", type: "gallery" },
      { id: 123, type: "hero" },
      null,
    ],
    (type) => `Label:${type}`,
    (type) => type === "hero"
  );

  expect(options).toEqual([
    {
      id: "block-1",
      type: "hero",
      depth: 0,
      supportsChildren: true,
      label: "Label:hero",
    },
    {
      id: "block-3",
      type: "gallery",
      depth: 0,
      supportsChildren: false,
      label: "Label:gallery",
    },
  ]);
});

test("mapWidgetBlockOptions flattens nested blocks", () => {
  const options = mapWidgetBlockOptions(
    [
      {
        id: "parent",
        type: "hero",
        children: [{ id: "child", type: "timeline" }],
      },
    ],
    (type) => type.toUpperCase(),
    (type) => type === "hero"
  );

  expect(options).toEqual([
    {
      id: "parent",
      type: "hero",
      depth: 0,
      supportsChildren: true,
      label: "HERO",
    },
    {
      id: "child",
      type: "timeline",
      depth: 1,
      supportsChildren: false,
      label: "-- TIMELINE",
    },
  ]);
});

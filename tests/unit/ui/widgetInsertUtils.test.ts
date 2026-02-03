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
    (type) => `Label:${type}`
  );

  expect(options).toEqual([
    { id: "block-1", label: "Label:hero" },
    { id: "block-3", label: "Label:gallery" },
  ]);
});

import { expect, test } from "vitest";

import {
  buildSlotOptions,
  mapWidgetBlockOptions,
} from "../../../core/admin/ui/widgets/widgetInsertUtils";

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
    {
      id: "block-1",
      type: "hero",
      depth: 0,
      label: "Label:hero",
    },
    {
      id: "block-3",
      type: "gallery",
      depth: 0,
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
        slots: {
          main: [{ id: "child", type: "timeline" }],
        },
      },
    ],
    (type) => type.toUpperCase()
  );

  expect(options).toEqual([
    {
      id: "parent",
      type: "hero",
      depth: 0,
      label: "HERO",
    },
    {
      id: "child",
      type: "timeline",
      depth: 1,
      label: "-- TIMELINE",
    },
  ]);
});

test("buildSlotOptions marks full or disallowed slots", () => {
  const slots = [
    { id: "main", label: "Main", maxItems: 1, allowedTypes: ["hero"] },
    { id: "sidebar", label: "Sidebar" },
  ];
  const block = {
    id: "container",
    type: "layout",
    slots: {
      main: [{ id: "child", type: "hero" }],
      sidebar: [],
    },
  };
  const options = buildSlotOptions(slots, block, "hero");

  expect(options[0]).toMatchObject({
    id: "main",
    count: 1,
    disabled: true,
    reason: "Slot is full",
  });
  expect(options[1].disabled).toBe(false);
});

test("buildSlotOptions expands repeatable slots into concrete targets", () => {
  const slots = [
    {
      id: "column",
      label: "Column",
      kind: "repeatable" as const,
      allowedTypes: ["hero"],
    },
  ];
  const block = {
    id: "container",
    type: "layout",
    slots: {
      "column:1": [{ id: "hero-1", type: "hero" }],
      "column:2": [],
    },
  };
  const options = buildSlotOptions(slots, block, "hero");

  expect(options).toHaveLength(2);
  expect(options[0]).toMatchObject({
    id: "column:1",
    definitionId: "column",
    kind: "repeatable",
    label: "Column 1",
    count: 1,
    disabled: false,
  });
  expect(options[1]).toMatchObject({
    id: "column:2",
    definitionId: "column",
    kind: "repeatable",
    label: "Column 2",
    count: 0,
    disabled: false,
  });
});

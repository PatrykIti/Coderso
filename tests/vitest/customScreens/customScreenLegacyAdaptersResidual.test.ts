import { expect, test } from "vitest";

import {
  migrateWidgetBlockToScreenBlock,
  normalizeCustomScreenBlocks,
  screenBlockTypeFromWidgetType,
  withCustomScreenEditorViewCompat,
} from "../../../core/services/customScreens/customScreenLegacyAdapters";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenContracts";

test("normalizeCustomScreenBlocks normalizes slots with array and non-array values", () => {
  const result = normalizeCustomScreenBlocks([
    {
      id: "parent-1",
      type: "section",
      data: {},
      slots: {
        default: [{ id: "child-1", type: "text", data: {} }],
        empty: "not-an-array",
      },
    },
  ]);

  expect(result[0]?.slots?.default?.[0]).toMatchObject({ id: "child-1", type: "text" });
  expect(result[0]?.slots?.empty).toEqual([]);
});

test("normalizeCustomScreenBlocks recurses into children", () => {
  const result = normalizeCustomScreenBlocks([
    {
      id: "root-1",
      type: "columns",
      data: {},
      children: [{ id: "child-1", type: "text", data: {} }],
    },
  ]);

  expect(result[0]?.children?.[0]).toMatchObject({ id: "child-1", type: "text" });
});

test("normalizeCustomScreenBlocks rejects a non-array value", () => {
  expect(() => normalizeCustomScreenBlocks({} as never)).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("screenBlockTypeFromWidgetType maps every retired screen widget type", () => {
  expect(screenBlockTypeFromWidgetType("screen-field-group")).toBe("field-group");
  expect(screenBlockTypeFromWidgetType("screen-two-column")).toBe("columns");
  expect(screenBlockTypeFromWidgetType("screen-field-value")).toBe("field");
  expect(screenBlockTypeFromWidgetType("screen-record-header")).toBe("record-header");
  expect(screenBlockTypeFromWidgetType("text")).toBe("legacy-widget");
});

test("migrateWidgetBlockToScreenBlock migrates slot blocks", () => {
  const result = migrateWidgetBlockToScreenBlock({
    id: "parent-1",
    type: "screen-two-column",
    data: {},
    slots: {
      left: [
        {
          id: "child-1",
          type: "screen-field-value",
          data: { field: "name" },
        },
      ],
    },
  });

  expect(result.type).toBe("columns");
  expect(result.slots?.left?.[0]).toMatchObject({
    id: "child-1",
    type: "field",
  });
});

test("withCustomScreenEditorViewCompat rebuilds a v4 editor view from legacy blocks and bindings", () => {
  const definition: CustomScreenDefinition = {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry" as const,
      interactionMode: "inline" as const,
    },
  };

  const result = withCustomScreenEditorViewCompat(definition, {
    blocks: [
      {
        id: "field-1",
        type: "screen-field-value",
        data: { field: "name" },
      },
    ],
    bindings: [
      {
        id: "field-1-value",
        widgetId: "field-1",
        propPath: "value",
        field: "name",
        mode: "readwrite",
      },
    ],
    saveMode: "entry",
    interactionMode: "inline",
  });

  expect(result.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "field-1",
    type: "field",
  });
  expect(result.editorView.bindings[0]).toMatchObject({
    id: "field-1-value",
    propPath: "value",
  });
});

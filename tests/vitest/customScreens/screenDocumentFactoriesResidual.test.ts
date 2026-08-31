import { expect, test } from "vitest";

import {
  createScreenBlock,
  createScreenSection,
} from "../../../core/services/customScreens/screenDocumentFactories";

test("createScreenBlock creates a columns block with left and right slots", () => {
  const result = createScreenBlock({ type: "columns", label: "Columns" });
  expect(result.block.type).toBe("columns");
  expect(Object.keys(result.block.slots ?? {})).toEqual(["left", "right"]);
  expect(result.block.data).toMatchObject({ label: "Columns", columns: 2 });
  expect(result.bindings).toEqual([]);
});

test("createScreenBlock creates a record-header block with a title binding", () => {
  const result = createScreenBlock({
    type: "record-header",
    field: "name",
    mode: "read",
  });
  expect(result.block.type).toBe("record-header");
  expect(result.bindings[0]).toMatchObject({
    propPath: "title",
    field: "name",
    mode: "read",
  });
});

test("createScreenBlock creates a rich-text block with default copy", () => {
  const result = createScreenBlock({ type: "rich-text" });
  expect(result.block.type).toBe("rich-text");
  expect(result.block.data).toMatchObject({ tone: "muted" });
  expect(result.bindings).toEqual([]);
});

test("createScreenBlock falls back to a generic block for legacy-widget types", () => {
  const result = createScreenBlock({ type: "legacy-widget", label: "Legacy" });
  expect(result.block.type).toBe("legacy-widget");
  expect(result.block.data).toEqual({ label: "Legacy" });
  expect(result.bindings).toEqual([]);
});

test("createScreenSection defaults its title data to the label", () => {
  const section = createScreenSection({ label: "Overview" });
  expect(section).toMatchObject({
    type: "section",
    label: "Overview",
    data: { title: "Overview" },
    blocks: [],
  });
});

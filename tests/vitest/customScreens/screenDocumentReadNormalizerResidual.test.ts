import { expect, test } from "vitest";

import {
  hasCanonicalStoredTabs,
  nextRepairedTabId,
  normalizeScreenDocumentV1ForReadWithRepairAtPath,
} from "../../../core/services/customScreens/screenDocumentReadNormalizer";

test("nextRepairedTabId appends a numeric suffix until it finds an unused id", () => {
  expect(nextRepairedTabId(0, new Set(["tab-1", "tab-1-2", "tab-1-3"]))).toBe("tab-1-4");
});

test("hasCanonicalStoredTabs rejects items whose key set does not match", () => {
  expect(hasCanonicalStoredTabs({ tabs: [{ id: "tab-1" }] }, { "tab-1": [] })).toBe(false);
});

test("hasCanonicalStoredTabs accepts items with exactly id and label", () => {
  expect(
    hasCanonicalStoredTabs({ tabs: [{ id: "tab-1", label: "Overview" }] }, { "tab-1": [] })
  ).toBe(true);
});

test("normalizeScreenDocumentV1ForReadWithRepairAtPath returns an empty document for null input", () => {
  const result = normalizeScreenDocumentV1ForReadWithRepairAtPath(null, ["document"]);
  expect(result.document).toEqual({ schemaVersion: 1, sections: [] });
  expect(result.unsupportedButtonIds.size).toBe(0);
});

test("normalizeScreenDocumentV1ForReadWithRepairAtPath rejects a non-array sections value", () => {
  expect(() =>
    normalizeScreenDocumentV1ForReadWithRepairAtPath({ schemaVersion: 1, sections: "bad" }, [
      "document",
    ])
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeScreenDocumentV1ForReadWithRepairAtPath rejects more than the section cap", () => {
  const sections = Array.from({ length: 121 }, (_, index) => ({
    id: `section-${index + 1}`,
    type: "section",
    data: {},
    blocks: [],
  }));

  expect(() =>
    normalizeScreenDocumentV1ForReadWithRepairAtPath({ schemaVersion: 1, sections }, ["document"])
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeScreenDocumentV1ForReadWithRepairAtPath collects unsupported button ids", () => {
  const result = normalizeScreenDocumentV1ForReadWithRepairAtPath(
    {
      schemaVersion: 1,
      sections: [
        {
          id: "section-1",
          type: "section",
          data: {},
          blocks: [
            {
              id: "button-1",
              type: "button",
              data: { label: "Create", action: "create" },
            },
            {
              id: "text-1",
              type: "text",
              data: { content: "Body" },
            },
          ],
        },
      ],
    },
    ["document"]
  );

  expect(result.unsupportedButtonIds).toEqual(new Set(["button-1"]));
  expect(result.document.sections[0]?.blocks[0]).toMatchObject({
    id: "button-1",
    data: { action: "link" },
  });
});

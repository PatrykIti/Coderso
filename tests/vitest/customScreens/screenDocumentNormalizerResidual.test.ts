import { expect, test } from "vitest";

import {
  assertScreenFieldBindingsTargetDocument,
  normalizeScreenDocumentV1AtPath,
  normalizeScreenSection,
} from "../../../core/services/customScreens/screenDocumentNormalizer";

const emptyDocument = {
  schemaVersion: 1 as const,
  sections: [{ id: "section-1", type: "section" as const, data: {}, blocks: [] }],
};

test("normalizeScreenSection rejects a blocks collection that is not an array", () => {
  expect(() =>
    normalizeScreenSection({ id: "section-1", type: "section", blocks: "bad" }, 0, "write", [
      "sections",
      0,
    ])
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeScreenDocumentV1AtPath rejects a non-array sections value", () => {
  expect(() =>
    normalizeScreenDocumentV1AtPath({ schemaVersion: 1, sections: "bad" }, "write", ["document"])
  ).toThrow("custom_screen_definition_invalid");
});

test("assertScreenFieldBindingsTargetDocument rejects a binding for a missing block", () => {
  expect(() =>
    assertScreenFieldBindingsTargetDocument(emptyDocument, [
      {
        id: "binding-1",
        blockId: "missing-block",
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
    ])
  ).toThrow("custom_screen_definition_invalid");
});

test("assertScreenFieldBindingsTargetDocument accepts bindings for existing blocks", () => {
  const document = {
    schemaVersion: 1 as const,
    sections: [
      {
        id: "section-1",
        type: "section" as const,
        data: {},
        blocks: [{ id: "block-1", type: "field" as const, data: {} }],
      },
    ],
  };

  expect(() =>
    assertScreenFieldBindingsTargetDocument(document, [
      {
        id: "binding-1",
        blockId: "block-1",
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
    ])
  ).not.toThrow();
});

import { expect, test } from "vitest";

import {
  normalizeCustomScreenEditorViewDefinition,
  normalizeCustomScreenEditorViewDefinitionV4,
  normalizeCustomScreenEditorViewDefinitionV4ForRead,
  normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty,
} from "../../../core/services/customScreens/customScreenEditorViewNormalizer";

test("normalizeCustomScreenEditorViewDefinition returns an empty legacy view for null input", () => {
  expect(normalizeCustomScreenEditorViewDefinition(null)).toEqual({
    blocks: [],
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  });
  expect(normalizeCustomScreenEditorViewDefinition(undefined)).toEqual({
    blocks: [],
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  });
});

test("normalizeCustomScreenEditorViewDefinitionV4 returns an empty v4 view for null input", () => {
  expect(normalizeCustomScreenEditorViewDefinitionV4(undefined)).toEqual({
    document: { schemaVersion: 1, sections: [] },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  });
});

test("normalizeCustomScreenEditorViewDefinitionV4ForRead returns an empty v4 view for null input", () => {
  expect(normalizeCustomScreenEditorViewDefinitionV4ForRead(null)).toEqual({
    document: { schemaVersion: 1, sections: [] },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  });
});

test("normalizeCustomScreenEditorViewDefinitionV4 rejects a binding whose block is missing from the document", () => {
  expect(() =>
    normalizeCustomScreenEditorViewDefinitionV4({
      document: {
        schemaVersion: 1,
        sections: [],
      },
      bindings: [
        {
          id: "orphan-binding",
          blockId: "missing-block",
          propPath: "value",
          source: "entry",
          field: "name",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty falls back to an empty view on invalid input", () => {
  const result = normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty(
    "not-an-array" as unknown,
    []
  );

  expect(result).toEqual({
    document: { schemaVersion: 1, sections: [] },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  });
});

test("normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty normalizes a valid legacy editor view", () => {
  const result = normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty(
    [
      {
        id: "field-1",
        type: "screen-field-value",
        data: { field: "name" },
      },
    ],
    [
      {
        id: "field-1-value",
        widgetId: "field-1",
        propPath: "value",
        field: "name",
        mode: "readwrite",
      },
    ]
  );

  expect(result.document.sections[0]?.blocks[0]).toMatchObject({
    id: "field-1",
    type: "field",
  });
});

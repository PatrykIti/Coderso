import { expect, test } from "bun:test";

import {
  customScreenCreateSchema,
  customScreenUpdateSchema,
  normalizeCustomScreenBindings,
  normalizeCustomScreenDefinition,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

test("customScreenCreateSchema accepts minimal payload", () => {
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
    })
  ).not.toThrow();
});

test("customScreenUpdateSchema requires at least one property", () => {
  expect(() => validate(customScreenUpdateSchema, {})).toThrow("Invalid payload");
});

test("normalizeCustomScreenDefinition returns defaults", () => {
  const definition = normalizeCustomScreenDefinition();
  expect(definition.schemaVersion).toBe(1);
  expect(definition.blocks).toEqual([]);
  expect(definition.bindings).toEqual([]);
});

test("normalizeCustomScreenBindings rejects unsafe paths", () => {
  expect(() =>
    normalizeCustomScreenBindings([
      {
        widgetId: "block-1",
        propPath: "__proto__.polluted",
        field: "title",
      },
    ])
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinition normalizes blocks", () => {
  const definition = normalizeCustomScreenDefinition({
    blocks: [{ id: "section-1", type: "section", data: {} }],
    bindings: [],
  });
  expect(definition.blocks[0]?.type).toBe("section");
});

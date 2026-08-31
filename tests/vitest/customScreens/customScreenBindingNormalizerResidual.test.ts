import { expect, test } from "vitest";

import type { CustomScreenDefinitionContext } from "../../../core/services/customScreens/customScreenContracts";
import { buildScreenFieldBindingId } from "../../../core/services/customScreens/customScreenNormalizationPrimitives";
import {
  normalizeCustomScreenBindings,
  normalizeCustomScreenBindingsForRead,
} from "../../../core/services/customScreens/customScreenBindingNormalizer";

const contextWithSchema: CustomScreenDefinitionContext = {
  contentType: {
    schema: { properties: { name: { type: "string" } } },
  },
};

test("normalizeCustomScreenBindings rejects a non-array value", () => {
  expect(() => normalizeCustomScreenBindings("bad")).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenBindings rejects duplicate binding ids", () => {
  expect(() =>
    normalizeCustomScreenBindings([
      { widgetId: "block-1", propPath: "value", field: "title", mode: "readwrite" },
      { widgetId: "block-1", propPath: "value", field: "title", mode: "read" },
    ])
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenBindingsForRead retries without context after a schema-scoped failure", () => {
  const result = normalizeCustomScreenBindingsForRead(
    [
      {
        widgetId: "block-1",
        propPath: "value",
        field: "custom-name",
        mode: "readwrite",
      },
    ],
    contextWithSchema
  );

  expect(result).toEqual([
    {
      id: buildScreenFieldBindingId("block-1", "value"),
      widgetId: "block-1",
      propPath: "value",
      field: "custom-name",
      mode: "readwrite",
    },
  ]);
});

test("normalizeCustomScreenBindingsForRead drops bindings that fail with and without context", () => {
  const result = normalizeCustomScreenBindingsForRead(["bad-binding"], contextWithSchema);
  expect(result).toEqual([]);
});

import { expect, test } from "vitest";

import {
  normalizeCustomScreenListViewDefinition,
  normalizeCustomScreenListViewDefinitionForRead,
} from "../../../core/services/customScreens/customScreenListViewNormalizer";

test("normalizeCustomScreenListViewDefinition rejects a non-record defaultSort", () => {
  expect(() =>
    normalizeCustomScreenListViewDefinition({
      defaultSort: "updatedAt",
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenListViewDefinition rejects a defaultSort field outside the allowed roots", () => {
  expect(() =>
    normalizeCustomScreenListViewDefinition({
      defaultSort: { field: "bogus-field", direction: "desc" },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenListViewDefinitionForRead returns defaults for a non-record input", () => {
  const result = normalizeCustomScreenListViewDefinitionForRead("bad-input");
  expect(result).toEqual(normalizeCustomScreenListViewDefinitionForRead(undefined));
});

test("normalizeCustomScreenListViewDefinitionForRead drops invalid filters and invalid defaultSort", () => {
  const result = normalizeCustomScreenListViewDefinitionForRead({
    filters: [
      { source: "system", field: "title", operator: "equals", enabled: true },
      "bad-filter",
    ],
    defaultSort: { field: "title", direction: "bogus-direction" },
  });

  expect(result.filters).toHaveLength(1);
  expect(result.filters[0]).toMatchObject({ field: "title" });
  expect(result.defaultSort).toEqual({ field: "updatedAt", direction: "desc" });
});

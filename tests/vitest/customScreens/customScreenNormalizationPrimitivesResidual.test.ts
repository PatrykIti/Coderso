import { expect, test } from "vitest";

import {
  assertFieldAllowed,
  normalizeCustomScreenSchemaVersion,
  normalizeStringEnum,
} from "../../../core/services/customScreens/customScreenNormalizationPrimitives";

test("assertFieldAllowed rejects an unknown system field", () => {
  expect(() => assertFieldAllowed("bogus", "system")).toThrow("custom_screen_definition_invalid");
});

test("normalizeStringEnum rejects a value outside the allowed set", () => {
  expect(() => normalizeStringEnum("bogus", new Set(["asc", "desc"]), "desc")).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("normalizeCustomScreenSchemaVersion rejects non-integer and unsupported versions", () => {
  expect(() => normalizeCustomScreenSchemaVersion(2.5)).toThrow("custom_screen_definition_invalid");
  expect(() => normalizeCustomScreenSchemaVersion("4")).toThrow("custom_screen_definition_invalid");
  expect(() => normalizeCustomScreenSchemaVersion(5)).toThrow("custom_screen_definition_invalid");
});

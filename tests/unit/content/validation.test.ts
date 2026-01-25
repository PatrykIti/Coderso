import { expect, test } from "bun:test";
import {
  ContentValidationError,
  assertContentSchema,
  validateEntryData,
} from "../../../core/services/content/validation";

const baseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string" },
  },
};

test("assertContentSchema accepts strict schema", () => {
  expect(() => assertContentSchema(baseSchema)).not.toThrow();
});

test("validateEntryData rejects missing required field", () => {
  expect(() => validateEntryData("type-1", baseSchema, {})).toThrow(
    ContentValidationError
  );
});

test("validateEntryData rejects unknown fields", () => {
  expect(() =>
    validateEntryData("type-2", baseSchema, { title: "OK", extra: "no" })
  ).toThrow(ContentValidationError);
});

test("validateEntryData accepts valid payload", () => {
  expect(() =>
    validateEntryData("type-3", baseSchema, { title: "OK" })
  ).not.toThrow();
});

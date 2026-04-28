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

test("assertContentSchema accepts schema meta keywords", () => {
  const schemaWithMeta = {
    ...baseSchema,
    properties: {
      title: {
        type: "string",
        xFieldType: "text",
        xFieldConfig: { hint: "example" },
      },
      related: {
        type: "array",
        items: { type: "string" },
        xFieldType: "relation",
        xRelationTarget: "posts",
        xFieldConfig: { relation: { target: "posts", multiple: true } },
      },
      tones: {
        type: "array",
        items: { type: "string", enum: ["warm", "cool"] },
        xFieldType: "select",
        xFieldConfig: {
          select: {
            multiple: true,
            options: [
              { label: "Warm", value: "warm" },
              { label: "Cool", value: "cool" },
            ],
          },
        },
      },
      price: {
        type: "number",
        minimum: 0,
        maximum: 1000,
        multipleOf: 0.01,
        xFieldType: "number",
        xFieldConfig: { number: { format: "decimal", min: 0, max: 1000, step: 0.01 } },
      },
    },
  };

  expect(() => assertContentSchema(schemaWithMeta)).not.toThrow();
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

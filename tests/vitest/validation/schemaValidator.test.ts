import { expect, test } from "vitest";

import { validate } from "../../../core/server/validation/schemaValidator";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: { type: "string" },
    count: { type: "number" },
  },
};

test("validate accepts valid payload", () => {
  expect(() => validate(schema, { name: "Coderso", count: 2 })).not.toThrow();
});

test("validate rejects unknown fields", () => {
  expect(() => validate(schema, { name: "Coderso", extra: true })).toThrow(
    "Invalid payload"
  );
});

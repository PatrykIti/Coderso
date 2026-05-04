import { expect, test } from "vitest";

import { menuCreateSchema, menuUpdateSchema } from "../../../core/server/validation/menuSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

test("menuCreateSchema accepts draft and published lifecycle status", () => {
  expect(() =>
    validate(menuCreateSchema, {
      name: "Primary",
      location: "primary",
      status: "draft",
    })
  ).not.toThrow();

  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
      location: null,
      status: "published",
    })
  ).not.toThrow();
});

test("menuCreateSchema requires explicit nullable location and rejects unknown fields", () => {
  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
      location: null,
    })
  ).not.toThrow();

  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
    })
  ).toThrow("Invalid payload");

  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
      location: null,
      unsafe: true,
    })
  ).toThrow("Invalid payload");
});

test("menuUpdateSchema rejects unknown lifecycle statuses and empty payloads", () => {
  expect(() =>
    validate(menuUpdateSchema, {
      status: "archived",
    })
  ).toThrow("Invalid payload");

  expect(() => validate(menuUpdateSchema, {})).toThrow("Invalid payload");
});

test("menuUpdateSchema rejects unknown fields", () => {
  expect(() =>
    validate(menuUpdateSchema, {
      status: "draft",
      visibility: "public",
    })
  ).toThrow("Invalid payload");
});

import { expect, test } from "vitest";

import {
  evaluateFormFieldLogic,
  normalizeFormFieldLogic,
  normalizeFormFieldStyle,
  resolveFormFieldStyle,
} from "../../../core/services/forms/fieldSettings";

test("normalizeFormFieldLogic returns undefined for empty", () => {
  expect(normalizeFormFieldLogic(undefined)).toBeUndefined();
  expect(normalizeFormFieldLogic(null)).toBeUndefined();
});

test("normalizeFormFieldLogic keeps always operator", () => {
  expect(normalizeFormFieldLogic({ operator: "always" })).toEqual({
    operator: "always",
  });
});

test("normalizeFormFieldLogic requires field for conditional operators", () => {
  expect(() =>
    normalizeFormFieldLogic({ operator: "exists", field: "" })
  ).toThrow("form_field_invalid");
});

test("normalizeFormFieldLogic requires value for value operators", () => {
  expect(() =>
    normalizeFormFieldLogic({ operator: "equals", field: "status", value: "" })
  ).toThrow("form_field_invalid");
});

test("normalizeFormFieldStyle validates enums", () => {
  expect(
    normalizeFormFieldStyle({
      width: "half",
      labelPosition: "inline",
    })
  ).toEqual({
    width: "half",
    labelPosition: "inline",
  });

  expect(() => normalizeFormFieldStyle({ width: "wide" })).toThrow(
    "form_field_invalid"
  );
});

test("resolveFormFieldStyle returns defaults", () => {
  expect(resolveFormFieldStyle(undefined)).toEqual({
    width: "full",
    labelPosition: "above",
  });
});

test("evaluateFormFieldLogic supports value and presence operators", () => {
  expect(
    evaluateFormFieldLogic(
      {
        operator: "equals",
        field: "status",
        value: "open",
      },
      { status: "open" }
    )
  ).toBe(true);

  expect(
    evaluateFormFieldLogic(
      {
        operator: "not_contains",
        field: "title",
        value: "urgent",
      },
      { title: "Regular check" }
    )
  ).toBe(true);

  expect(
    evaluateFormFieldLogic(
      {
        operator: "exists",
        field: "email",
      },
      { email: "" }
    )
  ).toBe(false);
});

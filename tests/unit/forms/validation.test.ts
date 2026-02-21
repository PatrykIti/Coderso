import { expect, test } from "bun:test";

import {
  normalizeFormFields,
  validateSubmissionPayload,
} from "../../../core/services/forms/validation";

test("normalizeFormFields omits empty optional setting strings", () => {
  const [field] = normalizeFormFields([
    {
      type: "text",
      label: "Name",
      name: "name",
      settings: {
        placeholder: "",
        helper: "   ",
        pattern: "",
        defaultValue: "   ",
      },
    },
  ]);

  expect(field?.settings).toEqual({});
});

test("normalizeFormFields keeps trimmed optional settings", () => {
  const [field] = normalizeFormFields([
    {
      type: "select",
      label: "Service",
      name: "service",
      settings: {
        placeholder: " Pick one ",
        helper: " Select service ",
        defaultValue: " Basic ",
        options: [" Basic ", "Premium", "Premium"],
      },
    },
  ]);

  expect(field?.settings).toEqual({
    placeholder: "Pick one",
    helper: "Select service",
    defaultValue: "Basic",
    options: ["Basic", "Premium"],
  });
});

test("normalizeFormFields keeps logic and style settings", () => {
  const [field] = normalizeFormFields([
    {
      type: "text",
      label: "Issue",
      name: "issue",
      settings: {
        logic: {
          operator: "equals",
          field: "category",
          value: "support",
        },
        style: {
          width: "half",
          labelPosition: "inline",
        },
      },
    },
  ]);

  expect(field?.settings.logic).toEqual({
    operator: "equals",
    field: "category",
    value: "support",
  });
  expect(field?.settings.style).toEqual({
    width: "half",
    labelPosition: "inline",
  });
});

test("validateSubmissionPayload skips required check for hidden fields", () => {
  const fields = normalizeFormFields([
    {
      type: "select",
      label: "Category",
      name: "category",
      required: true,
      settings: {
        options: ["support", "sales"],
      },
    },
    {
      type: "text",
      label: "Support code",
      name: "support_code",
      required: true,
      settings: {
        logic: {
          operator: "equals",
          field: "category",
          value: "support",
        },
      },
    },
  ]);

  expect(
    validateSubmissionPayload(
      {
        category: "sales",
      },
      fields
    )
  ).toEqual({
    category: "sales",
  });
});

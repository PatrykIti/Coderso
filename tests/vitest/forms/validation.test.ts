import { expect, test } from "vitest";

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

test("radio fields normalize options and accept only allowlisted values", () => {
  const [field] = normalizeFormFields([
    {
      type: "radio",
      label: "Preferred contact",
      name: "contact_method",
      required: true,
      settings: {
        options: ["Email", "Phone", "Phone"],
        defaultValue: "Email",
      },
    },
  ]);

  expect(field?.settings).toEqual({
    options: ["Email", "Phone"],
    defaultValue: "Email",
  });

  expect(
    validateSubmissionPayload(
      {
        contact_method: "Phone",
      },
      [field!]
    )
  ).toEqual({
    contact_method: "Phone",
  });

  expect(() =>
    validateSubmissionPayload(
      {
        contact_method: "SMS",
      },
      [field!]
    )
  ).toThrow("form_payload_invalid");
});

test("typed fields validate number, time, range, and rating constraints", () => {
  const fields = normalizeFormFields([
    {
      type: "number",
      label: "Team size",
      name: "team_size",
      settings: {
        min: 1,
        max: 20,
        step: 1,
      },
    },
    {
      type: "time",
      label: "Preferred time",
      name: "preferred_time",
      settings: {
        defaultValue: "09:30",
      },
    },
    {
      type: "range",
      label: "Budget score",
      name: "budget_score",
      settings: {
        min: 0,
        max: 10,
        step: 2,
      },
    },
    {
      type: "rating",
      label: "Priority",
      name: "priority",
      settings: {
        max: 7,
      },
    },
  ]);

  expect(
    validateSubmissionPayload(
      {
        team_size: "8",
        preferred_time: "10:15",
        budget_score: "6",
        priority: "5",
      },
      fields
    )
  ).toEqual({
    team_size: "8",
    preferred_time: "10:15",
    budget_score: "6",
    priority: "5",
  });

  expect(() =>
    validateSubmissionPayload(
      {
        team_size: "2.5",
        preferred_time: "10:15",
        budget_score: "6",
        priority: "5",
      },
      fields
    )
  ).toThrow("form_payload_invalid");

  expect(() =>
    validateSubmissionPayload(
      {
        team_size: "8",
        preferred_time: "25:90",
        budget_score: "6",
        priority: "5",
      },
      fields
    )
  ).toThrow("form_payload_invalid");
});

test("hidden fields require a trusted default and reject tampering", () => {
  const [field] = normalizeFormFields([
    {
      type: "hidden",
      label: "Segment",
      name: "segment",
      settings: {
        defaultValue: "enterprise",
      },
    },
  ]);

  expect(field?.settings.defaultValue).toBe("enterprise");
  expect(
    validateSubmissionPayload(
      {
        segment: "enterprise",
      },
      [field!]
    )
  ).toEqual({
    segment: "enterprise",
  });

  expect(() =>
    validateSubmissionPayload(
      {
        segment: "startup",
      },
      [field!]
    )
  ).toThrow("form_payload_invalid");

  expect(() =>
    normalizeFormFields([
      {
        type: "hidden",
        label: "Missing default",
        name: "missing_default",
        settings: {},
      },
    ])
  ).toThrow("form_field_invalid");
});

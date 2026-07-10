import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import {
  assertFormFieldsWriteShape,
  compileSafeFormFieldPattern,
  fieldSettingsSchemaByType,
  FORM_FIELD_SCHEMA_LIMITS,
  FORM_FIELD_TYPE_VALUES,
  formAttachmentUploadWriteSchema,
  formFieldsWriteSchema,
  formSubmissionWriteSchema,
  isSafeFormFieldPattern,
  normalizeFormFields,
  validateSubmissionPayload,
  type FormFieldSettings,
  type FormFieldType,
} from "../../../core/services/forms/validation";

const UUID_LOWER = "11111111-2222-3333-4444-555555555555";
const UUID_UPPER = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictTypes: false,
  allowUnionTypes: true,
});
const validateFieldsShape = ajv.compile(formFieldsWriteSchema);
const validateSubmissionShape = ajv.compile(formSubmissionWriteSchema);
const validateUploadShape = ajv.compile(formAttachmentUploadWriteSchema);

const baseSettingsFor = (type: FormFieldType): Record<string, unknown> => {
  if (type === "hidden") return { defaultValue: "trusted" };
  return {};
};

const fieldFor = (
  type: FormFieldType,
  settings: Record<string, unknown> = baseSettingsFor(type)
) => ({ type, label: `Field ${type}`, settings });

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
        inputStep: 1,
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
        inputStep: 2,
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

test("normalizeFormFields splits form placement from input increment", () => {
  const fields = normalizeFormFields([
    {
      type: "number",
      label: "Legacy number",
      name: "legacy_number",
      settings: {
        step: 3,
      },
    },
    {
      type: "range",
      label: "Budget score",
      name: "budget_score",
      settings: {
        formStep: 2,
        inputStep: 0.5,
      },
    },
  ]);

  expect(fields[0]?.settings).toEqual({
    step: 3,
    formStep: 3,
  });
  expect(fields[1]?.settings).toEqual({
    formStep: 2,
    inputStep: 0.5,
  });
  expect(
    validateSubmissionPayload(
      {
        legacy_number: "2.5",
        budget_score: "4.5",
      },
      fields
    )
  ).toEqual({
    legacy_number: "2.5",
    budget_score: "4.5",
  });
  expect(() =>
    validateSubmissionPayload(
      {
        legacy_number: "2.5",
        budget_score: "4.25",
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

describe("strict field document schemas", () => {
  const foreignKeyByType: Record<FormFieldType, string> = {
    text: "options",
    email: "options",
    select: "min",
    radio: "min",
    number: "options",
    time: "min",
    range: "options",
    rating: "min",
    hidden: "options",
    checkbox: "options",
    textarea: "options",
    phone: "options",
    file: "options",
    date: "options",
  };

  test.each(FORM_FIELD_TYPE_VALUES)(
    "%s accepts the complete optional outer shape and rejects foreign/unknown settings",
    (type) => {
      const settings = baseSettingsFor(type);
      expect(
        validateFieldsShape([
          {
            id: UUID_UPPER,
            type,
            label: "Field",
            name: "field_name",
            required: false,
            orderIndex: 9_999,
            settings,
          },
        ])
      ).toBe(true);

      expect(
        validateFieldsShape([fieldFor(type, { ...settings, [foreignKeyByType[type]]: [] })])
      ).toBe(false);
      expect(validateFieldsShape([fieldFor(type, { ...settings, unknown: true })])).toBe(false);
    }
  );

  test.each(FORM_FIELD_TYPE_VALUES.filter((type) => type !== "hidden"))(
    "%s accepts omitted optional settings",
    (type) => {
      expect(validateFieldsShape([{ type, label: "No settings" }])).toBe(true);
    }
  );

  const commonSettingCases: Array<[string, (type: FormFieldType) => unknown]> = [
    ["placeholder", () => ""],
    ["helper", () => "Helpful"],
    ["pattern", () => "^[A-Z]{2}\\d{4}$"],
    ["defaultValue", (type) => (type === "checkbox" ? true : type === "time" ? "09:30" : "chosen")],
    ["formStep", () => 10],
    ["step", () => 1],
    ["logic", () => ({ operator: "equals", field: "source", value: "web" })],
    ["style", () => ({ width: "half", labelPosition: "inline" })],
  ];

  for (const type of FORM_FIELD_TYPE_VALUES) {
    for (const [key, valueFor] of commonSettingCases) {
      test(`${type} accepts common setting ${key}`, () => {
        const value = valueFor(type);
        const settings: Record<string, unknown> = {
          ...baseSettingsFor(type),
          [key]: value,
        };
        if ((type === "select" || type === "radio") && key === "defaultValue") {
          settings.options = [value];
        }
        expect(validateFieldsShape([fieldFor(type, settings)])).toBe(true);
        expect(() => assertFormFieldsWriteShape([fieldFor(type, settings)])).not.toThrow();
      });
    }
  }

  const specificSettingCases: Array<[FormFieldType, string, unknown]> = [
    ["select", "options", ["One"]],
    ["radio", "options", ["One"]],
    ["number", "min", -FORM_FIELD_SCHEMA_LIMITS.numericMagnitude],
    ["number", "max", FORM_FIELD_SCHEMA_LIMITS.numericMagnitude],
    ["number", "inputStep", 0.25],
    ["time", "inputStep", 60],
    ["range", "min", -10],
    ["range", "max", 10],
    ["range", "inputStep", 2],
    ["rating", "max", 10],
    ["file", "accept", ["IMAGE/PNG", "application/pdf"]],
    ["file", "maxSizeMb", 100],
    ["file", "multiple", true],
  ];

  test.each(specificSettingCases)("%s accepts type-specific key %s", (type, key, value) => {
    expect(validateFieldsShape([fieldFor(type, { [key]: value })])).toBe(true);
  });

  test("rejects unknown keys at field, logic, and style depth", () => {
    expect(validateFieldsShape([{ ...fieldFor("text"), position: 1 }])).toBe(false);
    expect(
      validateFieldsShape([fieldFor("text", { logic: { operator: "always", unknown: true } })])
    ).toBe(false);
    expect(
      validateFieldsShape([fieldFor("text", { style: { width: "full", unknown: true } })])
    ).toBe(false);
  });

  test("pins hidden required settings/default and supports nonblank multiline values", () => {
    expect(validateFieldsShape([{ type: "hidden", label: "Hidden" }])).toBe(false);
    expect(validateFieldsShape([fieldFor("hidden", {})])).toBe(false);
    expect(validateFieldsShape([fieldFor("hidden", { defaultValue: "" })])).toBe(false);
    expect(validateFieldsShape([fieldFor("hidden", { defaultValue: "   " })])).toBe(false);
    expect(validateFieldsShape([fieldFor("hidden", { defaultValue: "line one\nline two" })])).toBe(
      true
    );
  });

  test("pins field count, UUID, label/name, order, time, numeric, options, and MIME bounds", () => {
    const maxFields = Array.from({ length: FORM_FIELD_SCHEMA_LIMITS.fields }, (_, index) => ({
      type: "text" as const,
      label: `Field ${index}`,
    }));
    expect(validateFieldsShape(maxFields)).toBe(true);
    expect(validateFieldsShape([...maxFields, { type: "text", label: "Overflow" }])).toBe(false);
    expect(validateFieldsShape([{ type: "text", label: "Field", id: "not-a-uuid" }])).toBe(false);
    expect(validateFieldsShape([{ type: "text", label: "Field", id: ` ${UUID_LOWER}` }])).toBe(
      false
    );
    expect(validateFieldsShape([{ type: "text", label: "", name: "a" }])).toBe(false);
    expect(validateFieldsShape([{ type: "text", label: "x".repeat(240) }])).toBe(true);
    expect(validateFieldsShape([{ type: "text", label: "x".repeat(241) }])).toBe(false);
    expect(validateFieldsShape([{ type: "text", label: "Field", name: "a".repeat(120) }])).toBe(
      true
    );
    expect(validateFieldsShape([{ type: "text", label: "Field", name: "a".repeat(121) }])).toBe(
      false
    );
    expect(validateFieldsShape([{ type: "text", label: "Field", orderIndex: 10_000 }])).toBe(false);
    expect(validateFieldsShape([{ type: "unknown", label: "Field" }])).toBe(false);
    expect(validateFieldsShape([fieldFor("time", { defaultValue: "24:00" })])).toBe(false);
    expect(validateFieldsShape([fieldFor("number", { min: -1_000_000_000_001 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("number", { inputStep: 0 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("number", { inputStep: 1_000_000_000_000 })])).toBe(true);
    expect(validateFieldsShape([fieldFor("number", { inputStep: 1_000_000_000_001 })])).toBe(false);
    expect(
      validateFieldsShape([fieldFor("select", { options: Array.from({ length: 100 }, () => "x") })])
    ).toBe(true);
    expect(
      validateFieldsShape([fieldFor("select", { options: Array.from({ length: 101 }, () => "x") })])
    ).toBe(false);
    expect(validateFieldsShape([fieldFor("select", { options: ["x".repeat(2_000)] })])).toBe(true);
    expect(validateFieldsShape([fieldFor("select", { options: ["x".repeat(2_001)] })])).toBe(false);
    expect(validateFieldsShape([fieldFor("file", { accept: ["NOT MIME"] })])).toBe(false);
    expect(validateFieldsShape([fieldFor("file", { maxSizeMb: 1 })])).toBe(true);
    expect(validateFieldsShape([fieldFor("file", { maxSizeMb: 101 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("rating", { max: 3 })])).toBe(true);
  });

  test("pins every shared setting and conditional-logic string budget", () => {
    for (const key of ["placeholder", "helper", "defaultValue"] as const) {
      expect(validateFieldsShape([fieldFor("text", { [key]: "x".repeat(2_000) })])).toBe(true);
      expect(validateFieldsShape([fieldFor("text", { [key]: "x".repeat(2_001) })])).toBe(false);
    }
    expect(
      validateFieldsShape([
        fieldFor("text", {
          logic: { operator: "equals", field: "f".repeat(120), value: "v".repeat(2_000) },
        }),
      ])
    ).toBe(true);
    expect(
      validateFieldsShape([
        fieldFor("text", {
          logic: { operator: "equals", field: "f".repeat(121), value: "ok" },
        }),
      ])
    ).toBe(false);
    expect(
      validateFieldsShape([
        fieldFor("text", {
          logic: { operator: "equals", field: "field", value: "v".repeat(2_001) },
        }),
      ])
    ).toBe(false);
  });

  test("pins conditional-logic discriminator requirements", () => {
    expect(validateFieldsShape([fieldFor("text", { logic: { operator: "always" } })])).toBe(true);
    expect(
      validateFieldsShape([fieldFor("text", { logic: { operator: "always", field: "x" } })])
    ).toBe(false);
    expect(
      validateFieldsShape([fieldFor("text", { logic: { operator: "equals", field: "x" } })])
    ).toBe(false);
    expect(
      validateFieldsShape([
        fieldFor("text", { logic: { operator: "exists", field: "x", value: "no" } }),
      ])
    ).toBe(false);
    expect(validateFieldsShape([fieldFor("text", { formStep: 0 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("text", { step: 11 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("text", { style: { width: "wide" } })])).toBe(false);
  });

  test("exposes a complete per-type schema map", () => {
    expect(Object.keys(fieldSettingsSchemaByType).sort()).toEqual(
      [...FORM_FIELD_TYPE_VALUES].sort()
    );
  });

  test("direct shape assertion rejects invalid UUID and unknown outer/nested keys", () => {
    for (const fields of [
      [{ id: "bad", type: "text", label: "Bad" }],
      [{ type: "text", label: "Outer", unknown: true }],
      [{ type: "text", label: "Nested", settings: { unknown: true } }],
    ]) {
      expect(() => assertFormFieldsWriteShape(fields)).toThrow("form_field_invalid");
    }
  });
});

describe("field normalization identity and safe patterns", () => {
  test.each(FORM_FIELD_TYPE_VALUES)("%s round-trips every common authored setting", (type) => {
    const defaultValue = type === "checkbox" ? true : type === "time" ? "09:30" : "chosen";
    const settings: FormFieldSettings = {
      placeholder: " Placeholder ",
      helper: " Helper ",
      pattern: "^[A-Z]+$",
      defaultValue,
      formStep: 3,
      step: 2,
      logic: { operator: "equals", field: "source", value: "web" },
      style: { width: "half", labelPosition: "inline" },
    };
    if (type === "select" || type === "radio") settings.options = [String(defaultValue)];
    const [field] = normalizeFormFields([{ type, label: `Field ${type}`, settings }]);
    expect(field?.settings).toMatchObject({
      placeholder: "Placeholder",
      helper: "Helper",
      pattern: "^[A-Z]+$",
      defaultValue,
      formStep: 3,
      step: 2,
      logic: { operator: "equals", field: "source", value: "web" },
      style: { width: "half", labelPosition: "inline" },
    });
  });

  test("checkbox preserves boolean and compatibility string defaults", () => {
    expect(
      normalizeFormFields([
        { type: "checkbox", label: "Boolean", settings: { defaultValue: false } },
        { type: "checkbox", label: "String", settings: { defaultValue: "yes" } },
      ]).map((field) => field.settings.defaultValue)
    ).toEqual([false, "yes"]);
  });

  test("canonicalizes supplied UUIDs before duplicate detection", () => {
    expect(
      normalizeFormFields([{ id: UUID_UPPER, type: "text", label: "A", name: "a" }])[0]?.id
    ).toBe(UUID_UPPER.toLowerCase());
    expect(() =>
      normalizeFormFields([
        { id: UUID_UPPER, type: "text", label: "A", name: "a" },
        { id: UUID_UPPER.toLowerCase(), type: "text", label: "B", name: "b" },
      ])
    ).toThrow("form_field_id_duplicate");
  });

  test("caps derived names, removes a newly exposed trailing underscore, and keeps collisions", () => {
    const overlong = normalizeFormFields([{ type: "text", label: "a".repeat(130) }])[0];
    expect(overlong?.name).toHaveLength(120);

    const exposedUnderscore = normalizeFormFields([
      { type: "text", label: `${"a".repeat(119)} z` },
    ])[0];
    expect(exposedUnderscore?.name).toBe("a".repeat(119));

    const sharedPrefix = "x".repeat(120);
    expect(() =>
      normalizeFormFields([
        { type: "text", label: `${sharedPrefix} alpha` },
        { type: "text", label: `${sharedPrefix} beta` },
      ])
    ).toThrow("form_field_name_duplicate");
  });

  test("accepts simple patterns and rejects every unsafe grammar class", () => {
    const accepted = ["^[A-Z]{2}\\d{4}$", "^[a-z0-9_-]+$", "^foo|bar$", "^\\(foo\\)$"];
    for (const pattern of accepted) {
      expect(isSafeFormFieldPattern(pattern)).toBe(true);
      expect(compileSafeFormFieldPattern(pattern)).toBeInstanceOf(RegExp);
    }

    const rejected = [
      "a\u0000b",
      "a\u0085b",
      "[",
      "(?=a)a",
      "(?:ab)",
      "(a)\\1",
      "(ab)+",
      "(a+)+",
      "a++",
      "^a*a*a*a*a*a*a*a*a*a*b$",
    ];
    for (const pattern of rejected) {
      expect(isSafeFormFieldPattern(pattern)).toBe(false);
      expect(() => compileSafeFormFieldPattern(pattern, "custom_failure")).toThrow(
        "custom_failure"
      );
    }
  });

  test("uses the same Unicode character budget as JSON Schema", () => {
    const maxUnicodePattern = "😀".repeat(FORM_FIELD_SCHEMA_LIMITS.pattern);
    expect(validateFieldsShape([fieldFor("text", { pattern: maxUnicodePattern })])).toBe(true);
    expect(isSafeFormFieldPattern(maxUnicodePattern)).toBe(true);
    expect(validateFieldsShape([fieldFor("text", { pattern: `${maxUnicodePattern}😀` })])).toBe(
      false
    );
  });

  test("pins the conservative one-variable-repetition grammar", () => {
    expect(isSafeFormFieldPattern("^[A-Za-z]+$")).toBe(true);
    expect(isSafeFormFieldPattern("^\\+?[0-9]+$")).toBe(false);
  });

  test("enforces selection defaults and numeric cross-invariants in the domain", () => {
    expect(() =>
      normalizeFormFields([
        {
          type: "select",
          label: "Choice",
          settings: { options: ["One"], defaultValue: "Two" },
        },
      ])
    ).toThrow("form_field_invalid");
    expect(() =>
      normalizeFormFields([{ type: "range", label: "Range", settings: { min: 10, max: 9 } }])
    ).toThrow("form_field_invalid");
  });
});

describe("strict submission and upload envelopes", () => {
  test("accepts the bounded submission union and rejects nested/unknown shapes", () => {
    const accepted = {
      nil: null,
      bool: true,
      number: FORM_FIELD_SCHEMA_LIMITS.numericMagnitude,
      text: "x".repeat(FORM_FIELD_SCHEMA_LIMITS.submissionString),
      object: { id: UUID_LOWER },
      array: Array.from({ length: FORM_FIELD_SCHEMA_LIMITS.submissionArray }, () => UUID_LOWER),
    };
    expect(validateSubmissionShape({ data: accepted })).toBe(true);
    expect(validateSubmissionShape({ data: { nested: { value: "no" } } })).toBe(false);
    expect(validateSubmissionShape({ data: { object: { id: UUID_LOWER, extra: true } } })).toBe(
      false
    );
    expect(validateSubmissionShape({ data: { number: 1_000_000_000_001 } })).toBe(false);
    expect(validateSubmissionShape({ data: { text: "x".repeat(20_001) } })).toBe(false);
    expect(
      validateSubmissionShape({ data: { array: Array.from({ length: 21 }, () => UUID_LOWER) } })
    ).toBe(false);
  });

  test("pins data/key/property and nonce/captcha budgets", () => {
    expect(validateSubmissionShape({})).toBe(false);
    expect(validateSubmissionShape({ data: { ["x".repeat(120)]: "ok" } })).toBe(true);
    expect(validateSubmissionShape({ data: { ["x".repeat(121)]: "no" } })).toBe(false);
    expect(
      validateSubmissionShape({
        data: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`f${index}`, "x"])),
      })
    ).toBe(true);
    expect(
      validateSubmissionShape({
        data: Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`f${index}`, "x"])),
      })
    ).toBe(false);
    expect(
      validateSubmissionShape({
        data: {},
        formNonce: "n".repeat(1_024),
        captchaToken: "c".repeat(4_096),
      })
    ).toBe(true);
    expect(validateSubmissionShape({ data: {}, formNonce: "" })).toBe(false);
    expect(validateSubmissionShape({ data: {}, formNonce: "n".repeat(1_025) })).toBe(false);
    expect(validateSubmissionShape({ data: {}, captchaToken: "" })).toBe(false);
    expect(validateSubmissionShape({ data: {}, captchaToken: "c".repeat(4_097) })).toBe(false);
    expect(validateSubmissionShape({ data: {}, unknown: true })).toBe(false);
  });

  test("a capped derived name addresses both submission and upload envelopes", () => {
    const [field] = normalizeFormFields([{ type: "text", label: "x".repeat(140) }]);
    expect(field?.name).toHaveLength(FORM_FIELD_SCHEMA_LIMITS.name);
    expect(validateSubmissionShape({ data: { [field!.name]: "value" } })).toBe(true);
    expect(validateUploadShape({ fieldName: field!.name, file: {} })).toBe(true);
    expect(validateSubmissionPayload({ [field!.name]: "value" }, [field!])).toEqual({
      [field!.name]: "value",
    });
  });

  test("direct submission validation enforces the same structural budgets before field work", () => {
    const field = normalizeFormFields([{ type: "text", label: "Name", name: "name" }]);
    expect(() => validateSubmissionPayload({ name: { nested: true } }, field)).toThrow(
      "form_payload_invalid"
    );
    expect(() => validateSubmissionPayload({ name: "x".repeat(20_001) }, field)).toThrow(
      "form_payload_invalid"
    );
    expect(() =>
      validateSubmissionPayload(
        Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`field_${index}`, "x"])),
        field
      )
    ).toThrow("form_payload_invalid");
  });

  test("keeps schema-to-service type parity for numeric and text-like branches", () => {
    const fields = normalizeFormFields([
      { type: "number", label: "Count", name: "count" },
      { type: "text", label: "Name", name: "name" },
      { type: "select", label: "Choice", name: "choice", settings: { options: ["One"] } },
      { type: "time", label: "Time", name: "time" },
    ]);
    expect(validateSubmissionPayload({ count: 8 }, fields)).toEqual({ count: "8" });
    for (const payload of [{ name: true }, { choice: 1 }, { time: false }]) {
      expect(() => validateSubmissionPayload(payload, fields)).toThrow("form_payload_invalid");
    }
  });

  test("rejects a schema-valid dynamic key absent from resolved fields", () => {
    const fields = normalizeFormFields([{ type: "text", label: "Known", name: "known" }]);
    expect(() => validateSubmissionPayload({ unknown: "value" }, fields)).toThrow(
      "form_payload_unknown_field"
    );
  });

  test("rejects unsafe stored patterns before regex evaluation", () => {
    const [field] = normalizeFormFields([{ type: "text", label: "Value", name: "value" }]);
    const legacyField = {
      ...field!,
      settings: { pattern: "^a*a*a*a*a*a*a*a*a*a*b$" },
    };
    expect(() => validateSubmissionPayload({ value: "a".repeat(32) }, [legacyField])).toThrow(
      "form_payload_invalid"
    );
  });

  test("pins upload required fields and metadata budgets", () => {
    expect(validateUploadShape({ fieldName: "attachment", file: {} })).toBe(true);
    expect(validateUploadShape({ file: {} })).toBe(false);
    expect(validateUploadShape({ fieldName: "attachment" })).toBe(false);
    expect(validateUploadShape({ fieldName: "x".repeat(121), file: {} })).toBe(false);
    expect(
      validateUploadShape({
        fieldName: "attachment",
        file: {},
        formNonce: "n".repeat(1_024),
        captchaToken: "c".repeat(4_096),
      })
    ).toBe(true);
    expect(validateUploadShape({ fieldName: "attachment", file: {}, unknown: true })).toBe(false);
    expect(
      validateUploadShape({ fieldName: "attachment", file: {}, formNonce: "n".repeat(1_025) })
    ).toBe(false);
    expect(
      validateUploadShape({
        fieldName: "attachment",
        file: {},
        captchaToken: "c".repeat(4_097),
      })
    ).toBe(false);
  });
});

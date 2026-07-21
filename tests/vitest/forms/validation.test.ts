import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import { evaluateFormFieldLogic } from "../../../core/services/forms/fieldSettings";
import {
  assertFormFieldsWriteShape,
  compileSafeFormFieldPattern,
  fieldSettingsSchemaByType,
  FORM_FIELD_SCHEMA_LIMITS,
  FORM_FIELD_TYPE_VALUES,
  FORM_PLAIN_DATA_PREFLIGHT_PROFILES,
  formAttachmentUploadWriteSchema,
  formFieldsWriteSchema,
  formSubmissionWriteSchema,
  isSafeFormFieldPattern,
  normalizeFormFields,
  normalizeMediaReference,
  snapshotFormFieldsWriteShape,
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
  ownProperties: true,
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

const nullPrototypeRecord = <T extends Record<string, unknown>>(values: T): T =>
  Object.assign(Object.create(null) as Record<string, unknown>, values) as T;

const createMaximumFieldPreflightDocument = () =>
  Array.from({ length: FORM_PLAIN_DATA_PREFLIGHT_PROFILES.field.maxArrayItems }, (_, index) => ({
    type: "select" as const,
    label: `Bounded field ${index}`,
    name: `bounded_field_${index}`,
    settings: {
      options: ["yes"],
      logic: { operator: "always" as const },
      style: { width: "half" as const, labelPosition: "inline" as const },
    },
  }));

const createMaximumSubmissionPreflightFixture = (sharedReference?: Record<string, unknown>) => {
  const fields = normalizeFormFields(
    Array.from(
      { length: FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission.maxRecordProperties },
      (_, index) => ({
        type: "file" as const,
        label: `Upload ${index}`,
        name: `upload_${index}`,
        settings: { multiple: true },
      })
    )
  );
  const data = Object.fromEntries(
    fields.map((field) => [
      field.name,
      Array.from(
        { length: FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission.maxArrayItems },
        () => sharedReference ?? { id: UUID_LOWER }
      ),
    ])
  );
  return { data, fields };
};

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
        label: "Missing settings",
        name: "missing_settings",
      },
    ])
  ).toThrow("form_field_invalid");

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
    expect(validateFieldsShape([{ type: "text", label: "Field", orderIndex: -1 }])).toBe(false);
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
    expect(validateFieldsShape([fieldFor("file", { maxSizeMb: 0 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("file", { maxSizeMb: 101 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("rating", { max: 3 })])).toBe(true);
    expect(validateFieldsShape([fieldFor("rating", { max: 2 })])).toBe(false);
    expect(validateFieldsShape([fieldFor("rating", { max: 11 })])).toBe(false);
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

  test("accepts ordinary, null-prototype, and frozen field data without changing output", () => {
    const logic = nullPrototypeRecord({
      operator: "equals" as const,
      field: "source",
      value: "yes",
    });
    const style = nullPrototypeRecord({
      width: "half" as const,
      labelPosition: "inline" as const,
    });
    const settings = nullPrototypeRecord({ placeholder: " Hint ", logic, style });
    const field = nullPrototypeRecord({
      type: "text" as const,
      label: " Null prototype ",
      name: "null_prototype",
      settings,
    });
    const frozenFields = [
      Object.freeze({
        type: "text" as const,
        label: "Frozen",
        name: "frozen",
        settings: Object.freeze({ helper: " Help " }),
      }),
    ];
    Object.freeze(frozenFields);

    expect(() => assertFormFieldsWriteShape([field])).not.toThrow();
    expect(normalizeFormFields([field])).toEqual([
      expect.objectContaining({
        type: "text",
        label: "Null prototype",
        name: "null_prototype",
        settings: {
          placeholder: "Hint",
          logic: { operator: "equals", field: "source", value: "yes" },
          style: { width: "half", labelPosition: "inline" },
        },
      }),
    ]);
    expect(() => assertFormFieldsWriteShape(frozenFields)).not.toThrow();
    expect(normalizeFormFields(frozenFields)).toEqual([
      expect.objectContaining({
        type: "text",
        label: "Frozen",
        name: "frozen",
        settings: { helper: "Help" },
      }),
    ]);
  });

  test("rejects custom prototypes and accessors throughout field data without reading getters", () => {
    let fieldGetterReads = 0;
    const accessorField: Record<string, unknown> = { label: "Accessor field" };
    Object.defineProperty(accessorField, "type", {
      enumerable: true,
      get: () => {
        fieldGetterReads += 1;
        return "text";
      },
    });

    let settingsGetterReads = 0;
    const accessorSettings: Record<string, unknown> = {};
    Object.defineProperty(accessorSettings, "placeholder", {
      enumerable: true,
      get: () => {
        settingsGetterReads += 1;
        return "unsafe";
      },
    });

    let logicGetterReads = 0;
    const accessorLogic: Record<string, unknown> = { field: "source", value: "yes" };
    Object.defineProperty(accessorLogic, "operator", {
      enumerable: true,
      get: () => {
        logicGetterReads += 1;
        return "equals";
      },
    });

    let styleGetterReads = 0;
    const accessorStyle: Record<string, unknown> = {};
    Object.defineProperty(accessorStyle, "width", {
      enumerable: true,
      get: () => {
        styleGetterReads += 1;
        return "half";
      },
    });

    const inheritedRequired = Object.assign(Object.create({ type: "text" }), {
      label: "Inherited type",
    });
    const customPrototypeField = Object.assign(Object.create({ marker: true }), {
      type: "text",
      label: "Custom field prototype",
    });
    const customPrototypeSettings = Object.assign(Object.create({ marker: true }), {
      placeholder: "unsafe",
    });
    const customPrototypeLogic = Object.assign(Object.create({ marker: true }), {
      operator: "equals",
      field: "source",
      value: "yes",
    });
    const customPrototypeStyle = Object.assign(Object.create({ marker: true }), {
      width: "half",
    });
    const candidates: unknown[] = [
      inheritedRequired,
      customPrototypeField,
      { type: "text", label: "Custom settings", settings: customPrototypeSettings },
      { type: "text", label: "Custom logic", settings: { logic: customPrototypeLogic } },
      { type: "text", label: "Custom style", settings: { style: customPrototypeStyle } },
      accessorField,
      { type: "text", label: "Accessor settings", settings: accessorSettings },
      { type: "text", label: "Accessor logic", settings: { logic: accessorLogic } },
      { type: "text", label: "Accessor style", settings: { style: accessorStyle } },
    ];

    expect(validateFieldsShape([inheritedRequired])).toBe(false);
    for (const candidate of candidates) {
      expect(() => assertFormFieldsWriteShape([candidate])).toThrow("form_field_invalid");
      expect(() =>
        normalizeFormFields([candidate] as unknown as Parameters<typeof normalizeFormFields>[0])
      ).toThrow("form_field_invalid");
    }
    expect(fieldGetterReads).toBe(0);
    expect(settingsGetterReads).toBe(0);
    expect(logicGetterReads).toBe(0);
    expect(styleGetterReads).toBe(0);
  });

  test("rejects custom, symbol-bearing, and accessor field arrays before reading entries", () => {
    const validField = { type: "text", label: "Array field" };
    const customPrototypeArray = [validField];
    Object.setPrototypeOf(customPrototypeArray, Object.create(Array.prototype));
    const symbolArray = [validField];
    Object.defineProperty(symbolArray, Symbol("hidden"), { value: true, enumerable: true });
    let arrayGetterReads = 0;
    const accessorArray: unknown[] = [];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      get: () => {
        arrayGetterReads += 1;
        return validField;
      },
    });

    for (const candidate of [customPrototypeArray, symbolArray, accessorArray]) {
      expect(() => assertFormFieldsWriteShape(candidate)).toThrow("form_field_invalid");
      expect(() =>
        normalizeFormFields(candidate as unknown as Parameters<typeof normalizeFormFields>[0])
      ).toThrow("form_field_invalid");
    }
    expect(arrayGetterReads).toBe(0);
  });

  test("returns a detached validated field snapshot and maps revoked proxies to domain errors", () => {
    const source = [
      {
        type: "file" as const,
        label: "Original",
        name: "attachment",
        settings: { accept: ["image/png"], multiple: true },
      },
    ];
    const snapshot = snapshotFormFieldsWriteShape(source);
    source[0]!.label = "Mutated";
    source[0]!.settings.accept.push("application/pdf");
    source.push({
      type: "file",
      label: "Added",
      name: "added",
      settings: { accept: [], multiple: false },
    });
    expect(snapshot).toEqual([
      {
        type: "file",
        label: "Original",
        name: "attachment",
        settings: { accept: ["image/png"], multiple: true },
      },
    ]);
    expect(snapshot).not.toBe(source);
    expect(snapshot[0]).not.toBe(source[0]);
    expect(snapshot[0]?.settings).not.toBe(source[0]?.settings);

    let getterReads = 0;
    const recordTarget: Record<string, unknown> = { label: "Revoked record" };
    Object.defineProperty(recordTarget, "type", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        return "text";
      },
    });
    const revokedRecord = Proxy.revocable(recordTarget, {});
    revokedRecord.revoke();
    const revokedArray = Proxy.revocable([{ type: "text", label: "Revoked array" }], {});
    revokedArray.revoke();

    for (const value of [[revokedRecord.proxy], revokedArray.proxy]) {
      expect(() => snapshotFormFieldsWriteShape(value)).toThrow("form_field_invalid");
      expect(() => assertFormFieldsWriteShape(value)).toThrow("form_field_invalid");
      expect(() =>
        normalizeFormFields(value as unknown as Parameters<typeof normalizeFormFields>[0])
      ).toThrow("form_field_invalid");
    }
    expect(getterReads).toBe(0);
  });

  test("accepts the exact 501-node field preflight profile and rejects the first unique node over", () => {
    expect(FORM_PLAIN_DATA_PREFLIGHT_PROFILES.field).toEqual({
      maxDepth: 3,
      maxArrayItems: 100,
      maxRecordProperties: 100,
      maxNodes: 501,
    });
    const atLimit = createMaximumFieldPreflightDocument();
    expect(() => assertFormFieldsWriteShape(atLimit)).not.toThrow();
    expect(normalizeFormFields(atLimit)).toHaveLength(100);

    const overLimit = atLimit.map((field, index) =>
      index === atLimit.length - 1 ? { ...field, overflow: {} } : field
    );
    expect(() => assertFormFieldsWriteShape(overLimit)).toThrow("form_field_invalid");
    expect(() =>
      normalizeFormFields(overLimit as unknown as Parameters<typeof normalizeFormFields>[0])
    ).toThrow("form_field_invalid");
  });

  test("bounds field depth, arrays, record keys, and cycles with domain errors", () => {
    const arrayOverLimit = Array.from(
      { length: FORM_PLAIN_DATA_PREFLIGHT_PROFILES.field.maxArrayItems + 1 },
      (_, index) => ({ type: "text" as const, label: `Overflow ${index}` })
    );
    const recordAtLimit = Object.assign(
      { type: "text", label: "Record limit" },
      Object.fromEntries(Array.from({ length: 98 }, (_, index) => [`extra_${index}`, index]))
    );
    const recordOverLimit = { ...recordAtLimit, extra_98: true };
    expect(Object.keys(recordAtLimit)).toHaveLength(100);
    expect(Object.keys(recordOverLimit)).toHaveLength(101);

    const depthOverLimit = {
      type: "text",
      label: "Depth overflow",
      settings: { unknown: { nested: {} } },
    };
    const cyclicSettings: Record<string, unknown> = {};
    cyclicSettings.logic = cyclicSettings;
    const cyclicField = { type: "text", label: "Cycle", settings: cyclicSettings };
    let deeplyNested: unknown = {};
    for (let depth = 0; depth < 1_000; depth += 1) {
      deeplyNested = { nested: deeplyNested };
    }
    const deeplyNestedField = {
      type: "text",
      label: "Deep",
      settings: { unknown: deeplyNested },
    };

    expect(() => assertFormFieldsWriteShape([recordAtLimit])).toThrow("form_field_invalid");
    expect(
      normalizeFormFields([recordAtLimit] as Parameters<typeof normalizeFormFields>[0])
    ).toEqual([expect.objectContaining({ type: "text", label: "Record limit" })]);

    for (const fields of [
      arrayOverLimit,
      [recordOverLimit],
      [depthOverLimit],
      [cyclicField],
      [deeplyNestedField],
    ]) {
      expect(() => assertFormFieldsWriteShape(fields)).toThrow("form_field_invalid");
      expect(() =>
        normalizeFormFields(fields as unknown as Parameters<typeof normalizeFormFields>[0])
      ).toThrow("form_field_invalid");
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
    const accepted = [
      "^[A-Z]{2}\\d{4}$",
      "^[a-z0-9_-]+$",
      "^foo|bar$",
      "^\\(foo\\)$",
      "^\\+?[0-9]+$",
      "^\\+?[0-9()\\-.\\s]{7,20}$",
      "^[A-Z]+[0-9]+$",
      "^.*?$",
      "^[A-Z]+?[0-9]+$",
      "^a{1,3}?b+$",
      "^(cat|dog[0-9]+)$",
      "^[A-Z]+|[0-9]+$",
      "^a+(b|c)a+$",
      "^[^@]+@[^@]+$",
      "^[^,]+,[^,]+$",
      "^[^\\s@]+@[^\\s@.]+\\.[^\\s@.]+$",
    ];
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
      "(a+?)+",
      "a++",
      "^a+?a+$",
      "^(a+|b+)a+$",
      "^(a+|)a+$",
      "^.*a*$",
      "^\\d+\\w+$",
      "^\\x61*\\x61*$",
      "^[\\x61]+a+$",
      "^[\\u0061]+a+$",
      "^[\\141]+a+$",
      "^[\\1]+$",
      "^[\\c_]+$",
      "^[\\c0]+$",
      "^[\\c9]+$",
      "^[\\x7e-\\xa0]+$",
      "^[\\u007e-\\u00a0]+$",
      "^[~-\u00a0]+$",
      "^[^\\x85]+$",
      "^[^\\u0085]+$",
      "^[^\\1]+$",
      "^[^\\141]+$",
      "^[^\\c_]+$",
      "^[^\\x7e-\\xa0]+$",
      "^[\\D\\x85]+$",
      "^[\\W\\1]+$",
      "^[\\S\\c_]+$",
      "^[é-ê\\x85]+$",
      "^[\\D\\x7e-\\xa0]+$",
      "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      "^a+aa+$",
      "^a+a{2}a+$",
      "^\\x85$",
      "^\\u0085$",
      "^a*a*a*a*a*a*a*a*a*a*b$",
      `^${"(a|)".repeat(9)}b$`,
      `^${"(a|a)".repeat(9)}b$`,
      `^a*${"(|)".repeat(22)}b$`,
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

  test("allows provably disjoint repetitions and rejects overlapping or unknown atoms", () => {
    expect(isSafeFormFieldPattern("^\\+?[0-9]+$")).toBe(true);
    expect(isSafeFormFieldPattern("^\\+?[0-9()\\-.\\s]{7,20}$")).toBe(true);
    expect(isSafeFormFieldPattern("^[A-Z]+[0-9]+$")).toBe(true);
    expect(isSafeFormFieldPattern("^a*a*$")).toBe(false);
    expect(isSafeFormFieldPattern("^.*a*$")).toBe(false);
    expect(isSafeFormFieldPattern("^\\d+\\w+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\x61]+a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\u0061]+a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\141]+a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\1]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\c_]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\c0]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\c9]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\x7e-\\xa0]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[\\u007e-\\u00a0]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^[~-\u00a0]+$")).toBe(false);
    expect(isSafeFormFieldPattern("^a+aa+$")).toBe(false);
    expect(isSafeFormFieldPattern("^a+a{2}a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^(a|aa)+$")).toBe(false);
    expect(isSafeFormFieldPattern("^a+?a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^(a+|b+)a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^(a+|)a+$")).toBe(false);
    expect(isSafeFormFieldPattern("^a+ba+$")).toBe(true);
    expect(isSafeFormFieldPattern("^a+b{2}a+$")).toBe(true);
    expect(isSafeFormFieldPattern(`^${"(a|b)".repeat(8)}$`)).toBe(true);
    expect(isSafeFormFieldPattern(`^${"(a|b)".repeat(9)}$`)).toBe(false);
    expect(isSafeFormFieldPattern(`^${"((a|b)(c|d))".repeat(4)}$`)).toBe(true);
    expect(isSafeFormFieldPattern(`^${"((a|b)(c|d))".repeat(5)}$`)).toBe(false);
    expect(isSafeFormFieldPattern(`^${"(a|b)".repeat(7)}$|^${"(c|d)".repeat(7)}$`)).toBe(true);
    expect(
      isSafeFormFieldPattern(`^${"(a|b)".repeat(7)}$|^${"(c|d)".repeat(7)}$|^${"(e|f)".repeat(7)}$`)
    ).toBe(false);
    expect(isSafeFormFieldPattern(`^${"(a|)".repeat(9)}b$`)).toBe(false);
    expect(isSafeFormFieldPattern(`^${"(a|a)".repeat(9)}b$`)).toBe(false);
    expect(isSafeFormFieldPattern(`^a*${"(|)".repeat(22)}b$`)).toBe(false);
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

  test("accepts ordinary, null-prototype, and frozen submission records", () => {
    const fields = normalizeFormFields([{ type: "text", label: "Name", name: "name" }]);
    const nullPrototypePayload = nullPrototypeRecord({ name: " Null prototype " });
    const frozenPayload = Object.freeze({ name: " Frozen " });

    expect(validateSubmissionPayload({ name: " Ordinary " }, fields)).toEqual({
      name: "Ordinary",
    });
    expect(validateSubmissionPayload(nullPrototypePayload, fields)).toEqual({
      name: "Null prototype",
    });
    expect(validateSubmissionPayload(frozenPayload, fields)).toEqual({ name: "Frozen" });
  });

  test("rejects custom, symbol-bearing, and accessor submission records without getter reads", () => {
    const fields = normalizeFormFields([{ type: "text", label: "Name", name: "name" }]);
    const inheritedPayload = Object.create({ name: "inherited" });
    const customPrototypePayload = Object.assign(Object.create({ marker: true }), {
      name: "own",
    });
    const symbolPayload: Record<string | symbol, unknown> = { name: "own" };
    Object.defineProperty(symbolPayload, Symbol("hidden"), { value: true, enumerable: true });
    let payloadGetterReads = 0;
    const accessorPayload: Record<string, unknown> = {};
    Object.defineProperty(accessorPayload, "name", {
      enumerable: true,
      get: () => {
        payloadGetterReads += 1;
        return "unsafe";
      },
    });

    for (const payload of [
      inheritedPayload,
      customPrototypePayload,
      symbolPayload,
      accessorPayload,
    ]) {
      expect(() => validateSubmissionPayload(payload, fields)).toThrow("form_payload_invalid");
    }
    expect(payloadGetterReads).toBe(0);
  });

  test("requires exact own media-id records for single and multiple values", () => {
    const [single, multiple] = normalizeFormFields([
      { type: "file", label: "Single", name: "single" },
      {
        type: "file",
        label: "Multiple",
        name: "multiple",
        settings: { multiple: true },
      },
    ]);
    const ordinaryReference = { id: UUID_LOWER };
    const nullPrototypeReference = nullPrototypeRecord({ id: UUID_LOWER });
    const frozenReference = Object.freeze({ id: UUID_LOWER });
    const frozenReferences = Object.freeze([frozenReference]);

    expect(normalizeMediaReference(UUID_LOWER, {})).toBe(UUID_LOWER);
    expect(normalizeMediaReference([UUID_LOWER], { multiple: true })).toEqual([UUID_LOWER]);
    for (const reference of [ordinaryReference, nullPrototypeReference, frozenReference]) {
      expect(normalizeMediaReference(reference, {})).toBe(UUID_LOWER);
      expect(normalizeMediaReference([reference], { multiple: true })).toEqual([UUID_LOWER]);
      expect(validateSubmissionPayload({ single: reference }, [single!])).toEqual({
        single: UUID_LOWER,
      });
      expect(validateSubmissionPayload({ multiple: [reference] }, [multiple!])).toEqual({
        multiple: [UUID_LOWER],
      });
    }
    expect(normalizeMediaReference(frozenReferences, { multiple: true })).toEqual([UUID_LOWER]);
    expect(validateSubmissionPayload({ multiple: frozenReferences }, [multiple!])).toEqual({
      multiple: [UUID_LOWER],
    });

    const inheritedId = Object.create({ id: UUID_LOWER });
    const customPrototypeId = Object.assign(Object.create({ marker: true }), {
      id: UUID_LOWER,
    });
    const extraKey = { id: UUID_LOWER, extra: true };
    const symbolKey: Record<string | symbol, unknown> = { id: UUID_LOWER };
    Object.defineProperty(symbolKey, Symbol("hidden"), { value: true, enumerable: true });
    const nonEnumerableId: Record<string, unknown> = {};
    Object.defineProperty(nonEnumerableId, "id", { value: UUID_LOWER });
    let mediaIdGetterReads = 0;
    const accessorId: Record<string, unknown> = {};
    Object.defineProperty(accessorId, "id", {
      enumerable: true,
      get: () => {
        mediaIdGetterReads += 1;
        return UUID_LOWER;
      },
    });

    for (const reference of [
      inheritedId,
      customPrototypeId,
      extraKey,
      symbolKey,
      nonEnumerableId,
      accessorId,
    ]) {
      expect(normalizeMediaReference(reference, {})).toBeNull();
      expect(normalizeMediaReference([reference], { multiple: true })).toBeNull();
      expect(() => validateSubmissionPayload({ single: reference }, [single!])).toThrow(
        "form_payload_invalid"
      );
      expect(() => validateSubmissionPayload({ multiple: [reference] }, [multiple!])).toThrow(
        "form_payload_invalid"
      );
    }
    expect(mediaIdGetterReads).toBe(0);
  });

  test("rejects custom, symbol-bearing, and accessor media arrays without reading entries", () => {
    const [field] = normalizeFormFields([
      { type: "file", label: "Files", name: "files", settings: { multiple: true } },
    ]);
    const reference = { id: UUID_LOWER };
    const customPrototypeArray = [reference];
    Object.setPrototypeOf(customPrototypeArray, Object.create(Array.prototype));
    const symbolArray = [reference];
    Object.defineProperty(symbolArray, Symbol("hidden"), { value: true, enumerable: true });
    let mediaArrayGetterReads = 0;
    const accessorArray: unknown[] = [];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      get: () => {
        mediaArrayGetterReads += 1;
        return reference;
      },
    });

    for (const value of [customPrototypeArray, symbolArray, accessorArray]) {
      expect(normalizeMediaReference(value, { multiple: true })).toBeNull();
      expect(() => validateSubmissionPayload({ files: value }, [field!])).toThrow(
        "form_payload_invalid"
      );
    }
    expect(mediaArrayGetterReads).toBe(0);
  });

  test("maps revoked submission and media proxies without getter reads or raw TypeErrors", () => {
    const [single, multiple] = normalizeFormFields([
      { type: "file", label: "Single", name: "single" },
      { type: "file", label: "Multiple", name: "multiple", settings: { multiple: true } },
    ]);
    const revokedPayload = Proxy.revocable({ single: UUID_LOWER }, {});
    revokedPayload.revoke();

    let mediaGetterReads = 0;
    const mediaTarget: Record<string, unknown> = {};
    Object.defineProperty(mediaTarget, "id", {
      enumerable: true,
      get: () => {
        mediaGetterReads += 1;
        return UUID_LOWER;
      },
    });
    const revokedMedia = Proxy.revocable(mediaTarget, {});
    revokedMedia.revoke();
    const revokedMediaArray = Proxy.revocable([UUID_LOWER], {});
    revokedMediaArray.revoke();
    const revokedSettings = Proxy.revocable({ multiple: false }, {});
    revokedSettings.revoke();

    expect(() => validateSubmissionPayload(revokedPayload.proxy, [single!])).toThrow(
      "form_payload_invalid"
    );
    expect(() => validateSubmissionPayload({ single: revokedMedia.proxy }, [single!])).toThrow(
      "form_payload_invalid"
    );
    expect(() =>
      validateSubmissionPayload({ multiple: revokedMediaArray.proxy }, [multiple!])
    ).toThrow("form_payload_invalid");
    expect(normalizeMediaReference(revokedMedia.proxy, {})).toBeNull();
    expect(normalizeMediaReference(revokedMediaArray.proxy, { multiple: true })).toBeNull();
    expect(
      normalizeMediaReference(UUID_LOWER, revokedSettings.proxy as unknown as FormFieldSettings)
    ).toBeNull();
    expect(mediaGetterReads).toBe(0);
  });

  test("accepts the exact 2101-node submission preflight profile", () => {
    expect(FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission).toEqual({
      maxDepth: 2,
      maxArrayItems: 20,
      maxRecordProperties: 100,
      maxNodes: 2_101,
    });
    const { data, fields } = createMaximumSubmissionPreflightFixture();
    const normalized = validateSubmissionPayload(data, fields);
    expect(Object.keys(normalized)).toHaveLength(100);
    for (const value of Object.values(normalized)) {
      expect(value).toEqual(Array.from({ length: 20 }, () => UUID_LOWER));
    }
  });

  test("reuses a completed shared submission subtree after its first snapshot", () => {
    let ownKeysCalls = 0;
    const sharedReference = new Proxy(
      { id: UUID_LOWER },
      {
        ownKeys: (target) => {
          ownKeysCalls += 1;
          return Reflect.ownKeys(target);
        },
      }
    );
    const { data, fields } = createMaximumSubmissionPreflightFixture(sharedReference);
    const normalized = validateSubmissionPayload(data, fields);
    expect(Object.keys(normalized)).toHaveLength(100);
    expect(ownKeysCalls).toBe(1);
  });

  test("bounds submission nodes, depth, arrays, keys, and cycles with domain errors", () => {
    const textFields = normalizeFormFields(
      Array.from(
        { length: FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission.maxRecordProperties },
        (_, index) => ({
          type: "text" as const,
          label: `Text ${index}`,
          name: `text_${index}`,
        })
      )
    );
    const maximumKeys = Object.fromEntries(textFields.map((field) => [field.name, "value"]));
    expect(Object.keys(validateSubmissionPayload(maximumKeys, textFields))).toHaveLength(100);
    expect(() =>
      validateSubmissionPayload({ ...maximumKeys, overflow: "value" }, textFields)
    ).toThrow("form_payload_invalid");

    const [multiple] = normalizeFormFields([
      { type: "file", label: "Files", name: "files", settings: { multiple: true } },
    ]);
    const maximumFiles = Array.from(
      { length: FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission.maxArrayItems },
      () => ({ id: UUID_LOWER })
    );
    expect(validateSubmissionPayload({ files: maximumFiles }, [multiple!])).toEqual({
      files: Array.from({ length: 20 }, () => UUID_LOWER),
    });
    expect(() =>
      validateSubmissionPayload({ files: [...maximumFiles, { id: UUID_LOWER }] }, [multiple!])
    ).toThrow("form_payload_invalid");
    expect(() =>
      validateSubmissionPayload({ files: [{ id: { nested: UUID_LOWER } }] }, [multiple!])
    ).toThrow("form_payload_invalid");

    const firstNodeOver: Record<string, unknown> = {};
    for (let branch = 0; branch < 21; branch += 1) {
      const childCount = branch < 20 ? 100 : 80;
      firstNodeOver[`branch_${branch}`] = Object.fromEntries(
        Array.from({ length: childCount }, (_, index) => [`child_${index}`, {}])
      );
    }
    expect(() => validateSubmissionPayload(firstNodeOver, [])).toThrow("form_payload_invalid");

    const selfCycle: Record<string, unknown> = {};
    selfCycle.self = selfCycle;
    expect(() => validateSubmissionPayload(selfCycle, [])).toThrow("form_payload_invalid");

    let deeplyNested: unknown = {};
    for (let depth = 0; depth < 1_000; depth += 1) {
      deeplyNested = { nested: deeplyNested };
    }
    expect(() => validateSubmissionPayload({ deep: deeplyNested }, [])).toThrow(
      "form_payload_invalid"
    );
  });

  test("rejects a huge sparse media array before ownKeys or accessor reads", () => {
    const [field] = normalizeFormFields([
      { type: "file", label: "Files", name: "files", settings: { multiple: true } },
    ]);
    let accessorReads = 0;
    const sparse: unknown[] = [];
    Object.defineProperty(sparse, "0", {
      enumerable: true,
      configurable: true,
      get: () => {
        accessorReads += 1;
        return { id: UUID_LOWER };
      },
    });
    sparse.length = 2 ** 32 - 1;
    let ownKeysCalls = 0;
    const observedSparse = new Proxy(sparse, {
      ownKeys: (target) => {
        ownKeysCalls += 1;
        return Reflect.ownKeys(target);
      },
    });

    expect(normalizeMediaReference(observedSparse, { multiple: true })).toBeNull();
    expect(() => validateSubmissionPayload({ files: observedSparse }, [field!])).toThrow(
      "form_payload_invalid"
    );
    expect(ownKeysCalls).toBe(0);
    expect(accessorReads).toBe(0);
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

  test.each(["number", "range"] as const)(
    "%s enforces numeric magnitude for browser strings and JSON numbers",
    (type) => {
      const field = normalizeFormFields([{ type, label: "Magnitude", name: "magnitude" }]);
      const maximum = FORM_FIELD_SCHEMA_LIMITS.numericMagnitude;
      for (const value of [maximum, -maximum, String(maximum), String(-maximum)]) {
        expect(validateSubmissionPayload({ magnitude: value }, field)).toEqual({
          magnitude: String(value),
        });
      }
      for (const value of [
        maximum + 1,
        -(maximum + 1),
        String(maximum + 1),
        String(-(maximum + 1)),
      ]) {
        expect(() => validateSubmissionPayload({ magnitude: value }, field)).toThrow(
          "form_payload_invalid"
        );
      }
    }
  );

  test("treats magic field names as own data properties without prototype mutation", () => {
    const fields = normalizeFormFields([
      {
        type: "file",
        label: "Prototype files",
        name: "__proto__",
        settings: { multiple: true },
      },
      { type: "text", label: "String method", name: "toString" },
      { type: "text", label: "Constructor", name: "constructor" },
    ]);
    const payload: Record<string, unknown> = {};
    Object.defineProperty(payload, "__proto__", {
      value: [UUID_LOWER, UUID_UPPER.toLowerCase()],
      enumerable: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(payload, "toString", {
      value: "owned toString",
      enumerable: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(payload, "constructor", {
      value: "owned constructor",
      enumerable: true,
      writable: true,
      configurable: true,
    });
    const sourceDescriptors = Object.getOwnPropertyDescriptors(payload);
    const sourcePrototype = Object.getPrototypeOf(payload);
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(Object.prototype);

    const normalized = validateSubmissionPayload(payload, fields);

    expect(Object.getPrototypeOf(normalized)).toBe(Object.prototype);
    expect(Object.hasOwn(normalized, "__proto__")).toBe(true);
    expect(Object.hasOwn(normalized, "toString")).toBe(true);
    expect(Object.hasOwn(normalized, "constructor")).toBe(true);
    expect(normalized.__proto__).toEqual([UUID_LOWER, UUID_UPPER.toLowerCase()]);
    expect(normalized.toString).toBe("owned toString");
    expect(normalized.constructor).toBe("owned constructor");

    const serialized = JSON.stringify(normalized);
    const reparsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(Object.hasOwn(reparsed, "__proto__")).toBe(true);
    expect(reparsed.__proto__).toEqual([UUID_LOWER, UUID_UPPER.toLowerCase()]);
    expect(reparsed.toString).toBe("owned toString");
    expect(reparsed.constructor).toBe("owned constructor");
    expect(Object.getPrototypeOf(reparsed)).toBe(Object.prototype);

    expect(Object.getPrototypeOf(payload)).toBe(sourcePrototype);
    expect(Object.getOwnPropertyDescriptors(payload)).toEqual(sourceDescriptors);
    expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(globalPrototypeDescriptors);
  });

  test("does not read inherited magic field values when the fields are absent", () => {
    const optionalFields = normalizeFormFields([
      { type: "text", label: "Prototype", name: "__proto__" },
      { type: "text", label: "String method", name: "toString" },
      { type: "text", label: "Constructor", name: "constructor" },
    ]);
    const normalized = validateSubmissionPayload({}, optionalFields);
    expect(Object.keys(normalized)).toEqual([]);
    for (const key of ["__proto__", "toString", "constructor"]) {
      expect(Object.hasOwn(normalized, key)).toBe(false);
    }

    const requiredFields = optionalFields.map((field) => ({ ...field, required: true }));
    expect(() => validateSubmissionPayload({}, requiredFields)).toThrow("form_payload_required");
  });

  test.each(["__proto__", "toString", "constructor"])(
    "conditional logic checks own presence for magic dependency %s",
    (field) => {
      const values: Record<string, unknown> = {};
      const sourcePrototype = Object.getPrototypeOf(values);
      expect(evaluateFormFieldLogic({ operator: "exists", field }, values)).toBe(false);
      expect(evaluateFormFieldLogic({ operator: "not_exists", field }, values)).toBe(true);

      Object.defineProperty(values, field, {
        value: "present",
        enumerable: true,
        writable: true,
        configurable: true,
      });
      expect(evaluateFormFieldLogic({ operator: "exists", field }, values)).toBe(true);
      expect(evaluateFormFieldLogic({ operator: "not_exists", field }, values)).toBe(false);
      expect(Object.getPrototypeOf(values)).toBe(sourcePrototype);
    }
  );

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

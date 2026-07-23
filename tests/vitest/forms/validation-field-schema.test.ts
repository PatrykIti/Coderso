import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import {
  assertFormFieldsWriteShape,
  fieldSettingsSchemaByType,
  FORM_FIELD_SCHEMA_LIMITS,
  FORM_FIELD_TYPE_VALUES,
  FORM_PLAIN_DATA_PREFLIGHT_PROFILES,
  formFieldsWriteSchema,
  normalizeFormFields,
  snapshotFormFieldsWriteShape,
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

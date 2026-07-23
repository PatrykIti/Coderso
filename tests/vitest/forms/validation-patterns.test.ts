import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import {
  compileSafeFormFieldPattern,
  FORM_FIELD_SCHEMA_LIMITS,
  FORM_FIELD_TYPE_VALUES,
  formFieldsWriteSchema,
  isSafeFormFieldPattern,
  normalizeFormFields,
  type FormFieldSettings,
  type FormFieldType,
} from "../../../core/services/forms/validation";

const UUID_UPPER = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
const LINEAR_POLICY_REJECTED_PATTERN = "^(ab)+$";
const LINEAR_ALTERNATIVE_REJECTED_PATTERN = "^(a|b)+$";

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
      LINEAR_POLICY_REJECTED_PATTERN,
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
    expect(isSafeFormFieldPattern(LINEAR_ALTERNATIVE_REJECTED_PATTERN)).toBe(false);
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

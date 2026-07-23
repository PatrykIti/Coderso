import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import { evaluateFormFieldLogic } from "../../../core/services/forms/fieldSettings";
import {
  FORM_FIELD_SCHEMA_LIMITS,
  FORM_PLAIN_DATA_PREFLIGHT_PROFILES,
  formAttachmentUploadWriteSchema,
  formSubmissionWriteSchema,
  normalizeFormFields,
  normalizeMediaReference,
  validateSubmissionPayload,
  type FormFieldSettings,
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
const validateSubmissionShape = ajv.compile(formSubmissionWriteSchema);
const validateUploadShape = ajv.compile(formAttachmentUploadWriteSchema);

const nullPrototypeRecord = <T extends Record<string, unknown>>(values: T): T =>
  Object.assign(Object.create(null) as Record<string, unknown>, values) as T;

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
      settings: { pattern: "^(ab)+$" },
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

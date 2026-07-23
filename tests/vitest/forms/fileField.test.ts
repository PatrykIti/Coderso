import { describe, expect, test } from "vitest";

import { mimeMatchesAccept } from "../../../core/services/forms/mimeMatchesAccept";
import {
  assertFormFieldsWriteShape,
  FORM_FIELD_SCHEMA_LIMITS,
  normalizeFormFields,
  normalizeMediaReference,
  validateSubmissionPayload,
  type NormalizedFormField,
} from "../../../core/services/forms/validation";

const UUID_A = "11111111-2222-3333-4444-555555555555";
const UUID_B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const fileField = (overrides: Partial<NormalizedFormField> = {}): NormalizedFormField => ({
  id: "f1",
  type: "file",
  label: "Attachment",
  name: "attachment",
  required: false,
  orderIndex: 0,
  settings: {},
  ...overrides,
});

describe("file field settings normalization", () => {
  test("registers file as a valid field type", () => {
    const [field] = normalizeFormFields([
      { type: "file", label: "Attachment", name: "attachment" },
    ]);
    expect(field?.type).toBe("file");
    expect(field?.settings).toEqual({});
  });

  test("normalizes accept (dedupes lowercase, drops malformed mime tokens)", () => {
    const [field] = normalizeFormFields([
      {
        type: "file",
        label: "Attachment",
        name: "attachment",
        settings: {
          accept: ["IMAGE/PNG", "image/png", "application/pdf", "not-a-mime", "  ", "image/*"],
        },
      },
    ]);
    expect(field?.settings.accept).toEqual(["image/png", "application/pdf", "image/*"]);
  });

  test("clamps maxSizeMb to 1..100 and rounds", () => {
    const clamp = (value: number) =>
      normalizeFormFields([
        { type: "file", label: "A", name: "a", settings: { maxSizeMb: value } },
      ])[0]?.settings.maxSizeMb;
    expect(clamp(0)).toBe(1);
    expect(clamp(500)).toBe(100);
    expect(clamp(7.6)).toBe(8);
    expect(clamp(25)).toBe(25);
  });

  test("coerces multiple to boolean", () => {
    const [field] = normalizeFormFields([
      { type: "file", label: "A", name: "a", settings: { multiple: true } },
    ]);
    expect(field?.settings.multiple).toBe(true);
  });

  test("drops empty accept array (no key emitted)", () => {
    const [field] = normalizeFormFields([
      { type: "file", label: "A", name: "a", settings: { accept: [] } },
    ]);
    expect(field?.settings.accept).toBeUndefined();
  });

  test("strict write shape pins accept count/token and integer size bounds", () => {
    const maxToken = `${"a".repeat(115)}/${"b".repeat(11)}`;
    expect(maxToken).toHaveLength(FORM_FIELD_SCHEMA_LIMITS.mimeToken);
    expect(() =>
      assertFormFieldsWriteShape([
        {
          type: "file",
          label: "Attachment",
          settings: {
            accept: Array.from({ length: FORM_FIELD_SCHEMA_LIMITS.mimeTokens }, () => maxToken),
            maxSizeMb: 100,
            multiple: false,
          },
        },
      ])
    ).not.toThrow();
    expect(() =>
      assertFormFieldsWriteShape([
        {
          type: "file",
          label: "Attachment",
          settings: {
            accept: Array.from(
              { length: FORM_FIELD_SCHEMA_LIMITS.mimeTokens + 1 },
              () => "image/png"
            ),
          },
        },
      ])
    ).toThrow("form_field_invalid");
    expect(() =>
      assertFormFieldsWriteShape([
        {
          type: "file",
          label: "Attachment",
          settings: { accept: [`${maxToken}x`] },
        },
      ])
    ).toThrow("form_field_invalid");
    expect(() =>
      assertFormFieldsWriteShape([
        { type: "file", label: "Attachment", settings: { maxSizeMb: 1.5 } },
      ])
    ).toThrow("form_field_invalid");
  });
});

describe("normalizeMediaReference", () => {
  const single = { multiple: false };
  const many = { multiple: true };

  test("valid uuid string → id", () => {
    expect(normalizeMediaReference(UUID_A, single)).toBe(UUID_A);
  });
  test("{ id } object → id", () => {
    expect(normalizeMediaReference({ id: UUID_A }, single)).toBe(UUID_A);
  });
  test("malformed string → null", () => {
    expect(normalizeMediaReference("not-a-uuid", single)).toBeNull();
  });
  test("bare URL → null", () => {
    expect(normalizeMediaReference("https://evil.example/x.png", single)).toBeNull();
  });
  test("raw bytes / base64 → null", () => {
    expect(normalizeMediaReference("data:image/png;base64,AAAA", single)).toBeNull();
  });
  test("multiple: array of uuids → string[]", () => {
    expect(normalizeMediaReference([UUID_A, UUID_B], many)).toEqual([UUID_A, UUID_B]);
  });
  test("multiple: one bad entry → null (reject whole payload)", () => {
    expect(normalizeMediaReference([UUID_A, "bad"], many)).toBeNull();
  });
  test("multiple: empty array → null", () => {
    expect(normalizeMediaReference([], many)).toBeNull();
  });
});

describe("mimeMatchesAccept", () => {
  test("empty/undefined accept ⇒ true (no restriction)", () => {
    expect(mimeMatchesAccept("image/png")).toBe(true);
    expect(mimeMatchesAccept("image/png", [])).toBe(true);
  });
  test("exact match", () => {
    expect(mimeMatchesAccept("image/png", ["image/png"])).toBe(true);
  });
  test("wildcard match", () => {
    expect(mimeMatchesAccept("image/png", ["image/*"])).toBe(true);
  });
  test("no match", () => {
    expect(mimeMatchesAccept("image/png", ["application/pdf"])).toBe(false);
  });
  test("case-insensitive on the actual mime", () => {
    expect(mimeMatchesAccept("IMAGE/PNG", ["image/*"])).toBe(true);
  });
});

describe("validateSubmissionPayload file case", () => {
  test("present-but-malformed file value THROWS form_payload_invalid", () => {
    expect(() => validateSubmissionPayload({ attachment: "not-a-uuid" }, [fileField()])).toThrow(
      "form_payload_invalid"
    );
  });

  test("valid id stored as reference", () => {
    const out = validateSubmissionPayload({ attachment: UUID_A }, [fileField()]);
    expect(out.attachment).toBe(UUID_A);
  });

  test("{ id } object stored as bare id", () => {
    const out = validateSubmissionPayload({ attachment: { id: UUID_A } }, [fileField()]);
    expect(out.attachment).toBe(UUID_A);
  });

  test("absent optional file skipped", () => {
    const out = validateSubmissionPayload({}, [fileField()]);
    expect("attachment" in out).toBe(false);
  });

  test("optional multiple file with [] is SKIPPED (no throw)", () => {
    const out = validateSubmissionPayload({ attachment: [] }, [
      fileField({ settings: { multiple: true } }),
    ]);
    expect("attachment" in out).toBe(false);
  });

  test("required multiple file with [] THROWS form_payload_required", () => {
    expect(() =>
      validateSubmissionPayload({ attachment: [] }, [
        fileField({ required: true, settings: { multiple: true } }),
      ])
    ).toThrow("form_payload_required");
  });

  test("multiple: array of ids stored as string[]", () => {
    const out = validateSubmissionPayload({ attachment: [UUID_A, UUID_B] }, [
      fileField({ settings: { multiple: true } }),
    ]);
    expect(out.attachment).toEqual([UUID_A, UUID_B]);
  });
});

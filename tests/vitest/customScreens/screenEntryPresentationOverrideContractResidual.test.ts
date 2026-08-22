import { describe, expect, test } from "vitest";

import {
  isScreenEntryPresentationSingleMediaField,
  isScreenEntryPresentationSingleMediaSchemaDefinition,
  normalizeScreenEntryPresentationOverrideDraft,
  normalizeScreenEntryPresentationOverrideList,
  normalizeScreenEntryPresentationOverrideReplacePayload,
  normalizeScreenEntryPresentationScopeId,
} from "../../../core/services/customScreens/screenEntryPresentationOverrideContract";

type OverrideListSource = "draft-cache" | "repository-record" | "transport-response";

const mediaUuid = "9f2c1a40-3b2a-4f2e-9c2d-1a2b3c4d5e6f";

describe("isScreenEntryPresentationSingleMediaField", () => {
  test("rejects non-record values and non-media types", () => {
    expect(isScreenEntryPresentationSingleMediaField("bad")).toBe(false);
    expect(isScreenEntryPresentationSingleMediaField({ type: "text" })).toBe(false);
  });

  test("treats a media field without a media config as single", () => {
    expect(isScreenEntryPresentationSingleMediaField({ type: "media" })).toBe(true);
  });

  test("rejects a media field with a non-record media config", () => {
    expect(isScreenEntryPresentationSingleMediaField({ type: "media", media: "bad" })).toBe(false);
  });

  test("rejects a media field whose config allows multiple", () => {
    expect(
      isScreenEntryPresentationSingleMediaField({ type: "media", media: { multiple: true } })
    ).toBe(false);
  });

  test("accepts a media field whose config is single", () => {
    expect(
      isScreenEntryPresentationSingleMediaField({ type: "media", media: { multiple: false } })
    ).toBe(true);
  });
});

describe("isScreenEntryPresentationSingleMediaSchemaDefinition", () => {
  test("rejects non-record values", () => {
    expect(isScreenEntryPresentationSingleMediaSchemaDefinition(null)).toBe(false);
  });

  test("accepts a media field whose schema-level media config is single", () => {
    expect(
      isScreenEntryPresentationSingleMediaSchemaDefinition({
        type: "string",
        xFieldConfig: { media: { multiple: false } },
      })
    ).toBe(true);
  });

  test("rejects a media field whose schema-level media config allows multiple", () => {
    expect(
      isScreenEntryPresentationSingleMediaSchemaDefinition({
        type: "string",
        xFieldConfig: { media: { multiple: true } },
      })
    ).toBe(false);
  });

  test("treats an xFieldType media string field without a media config as single", () => {
    expect(
      isScreenEntryPresentationSingleMediaSchemaDefinition({
        xFieldType: "media",
        type: "string",
      })
    ).toBe(true);
  });

  test("rejects array-typed media fields", () => {
    expect(
      isScreenEntryPresentationSingleMediaSchemaDefinition({
        xFieldType: "media",
        type: "array",
      })
    ).toBe(false);
  });
});

describe("normalizeScreenEntryPresentationScopeId", () => {
  test("trims and accepts a safe scope id", () => {
    expect(normalizeScreenEntryPresentationScopeId(" screen-1 ")).toBe("screen-1");
  });

  test("rejects non-string scope ids", () => {
    expect(() => normalizeScreenEntryPresentationScopeId(123)).toThrow(
      "custom_screen_override_invalid"
    );
  });

  test("rejects scope ids that fail the safe-path charset or segment rules", () => {
    expect(() => normalizeScreenEntryPresentationScopeId("has space!")).toThrow(
      "custom_screen_override_invalid"
    );
    expect(() => normalizeScreenEntryPresentationScopeId("a..b")).toThrow(
      "custom_screen_override_invalid"
    );
    expect(() => normalizeScreenEntryPresentationScopeId("a.__proto__")).toThrow(
      "custom_screen_override_invalid"
    );
    expect(() => normalizeScreenEntryPresentationScopeId("")).toThrow(
      "custom_screen_override_invalid"
    );
  });
});

describe("normalizeScreenEntryPresentationOverrideDraft", () => {
  test("normalizes a full draft with enum and media values", () => {
    expect(
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "textSize",
        value: "lg",
      })
    ).toEqual({ blockId: "block-1", propPath: "textSize", value: "lg" });

    expect(
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "textEmphasis",
        value: "bold",
      })
    ).toMatchObject({ value: "bold" });

    expect(
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "tone",
        value: "danger",
      })
    ).toMatchObject({ value: "danger" });

    expect(
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "image",
        value: mediaUuid,
      })
    ).toMatchObject({ value: mediaUuid });
  });

  test("rejects non-record drafts and unknown keys", () => {
    expect(() => normalizeScreenEntryPresentationOverrideDraft("bad")).toThrow(
      "custom_screen_override_invalid"
    );
    expect(() =>
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "textSize",
        value: "lg",
        extra: true,
      })
    ).toThrow("custom_screen_override_invalid");
  });

  test("rejects unknown prop paths and unknown enum values", () => {
    expect(() =>
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "bogus",
        value: "lg",
      })
    ).toThrow("custom_screen_override_invalid");

    expect(() =>
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "textSize",
        value: "bogus-size",
      })
    ).toThrow("custom_screen_override_invalid");

    expect(() =>
      normalizeScreenEntryPresentationOverrideDraft({
        blockId: "block-1",
        propPath: "image",
        value: "not-a-uuid",
      })
    ).toThrow("custom_screen_override_invalid");
  });
});

describe("normalizeScreenEntryPresentationOverrideList", () => {
  const draft = { blockId: "block-1", propPath: "textSize", value: "lg" };
  const iso = "2024-01-01T00:00:00.000Z";

  test("rejects non-array input and oversized lists", () => {
    expect(() =>
      normalizeScreenEntryPresentationOverrideList("bad", { source: "draft-cache" })
    ).toThrow("custom_screen_override_invalid");

    expect(() =>
      normalizeScreenEntryPresentationOverrideList(
        Array.from({ length: 201 }, () => draft),
        { source: "draft-cache" }
      )
    ).toThrow("custom_screen_override_invalid");
  });

  test("normalizes draft-cache lists", () => {
    expect(
      normalizeScreenEntryPresentationOverrideList([draft], { source: "draft-cache" })
    ).toEqual([draft]);
  });

  test("normalizes repository-record lists", () => {
    const record = {
      ...draft,
      screenId: "screen-1",
      entryId: "entry-1",
      updatedBy: null,
      createdAt: new Date(iso),
      updatedAt: new Date(iso),
    };

    expect(
      normalizeScreenEntryPresentationOverrideList([record], {
        source: "repository-record",
      })
    ).toEqual([record]);
  });

  test("normalizes transport-response lists", () => {
    const record = {
      ...draft,
      screenId: "screen-1",
      entryId: "entry-1",
      updatedBy: mediaUuid,
      createdAt: iso,
      updatedAt: iso,
    };

    expect(
      normalizeScreenEntryPresentationOverrideList([record], {
        source: "transport-response",
      })
    ).toEqual([draft]);
  });

  test("rejects repository records with invalid dates and transport timestamps", () => {
    expect(() =>
      normalizeScreenEntryPresentationOverrideList(
        [
          {
            ...draft,
            screenId: "screen-1",
            entryId: "entry-1",
            updatedBy: null,
            createdAt: new Date("invalid"),
            updatedAt: new Date(iso),
          },
        ],
        { source: "repository-record" }
      )
    ).toThrow("custom_screen_override_invalid");

    expect(() =>
      normalizeScreenEntryPresentationOverrideList(
        [
          {
            ...draft,
            screenId: "screen-1",
            entryId: "entry-1",
            updatedBy: null,
            createdAt: "not-a-timestamp",
            updatedAt: iso,
          },
        ],
        { source: "transport-response" }
      )
    ).toThrow("custom_screen_override_invalid");
  });

  test("rejects unknown list sources defensively", () => {
    const bogusSource = "bogus" as unknown as OverrideListSource;
    expect(() => normalizeScreenEntryPresentationOverrideList([], { source: bogusSource })).toThrow(
      "custom_screen_override_invalid"
    );
  });
});

describe("normalizeScreenEntryPresentationOverrideReplacePayload", () => {
  test("normalizes a valid replace payload", () => {
    expect(
      normalizeScreenEntryPresentationOverrideReplacePayload({
        overrides: [{ blockId: "block-1", propPath: "tone", value: "primary" }],
      })
    ).toEqual({
      overrides: [{ blockId: "block-1", propPath: "tone", value: "primary" }],
    });
  });

  test("rejects payloads with unknown keys", () => {
    expect(() =>
      normalizeScreenEntryPresentationOverrideReplacePayload({
        overrides: [],
        extra: true,
      })
    ).toThrow("custom_screen_override_invalid");
  });
});

import { describe, expect, test } from "vitest";

import { storageSettingsSchema } from "../../../core/server/validation/settingsSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

describe("storageSettingsSchema quota", () => {
  test("accepts a well-formed quota object", () => {
    expect(() =>
      validate(storageSettingsSchema, {
        quota: { totalBytes: 10 * 1024 * 1024 * 1024, planLabel: "Pro" },
      })
    ).not.toThrow();
  });

  test("accepts null quota fields (unlimited / no plan)", () => {
    expect(() =>
      validate(storageSettingsSchema, { quota: { totalBytes: null, planLabel: null } })
    ).not.toThrow();
  });

  test("rejects an unknown nested quota key (additionalProperties:false)", () => {
    expect(() => validate(storageSettingsSchema, { quota: { bogus: 1 } })).toThrow(
      "Invalid payload"
    );
  });

  test("rejects an unknown top-level key", () => {
    expect(() => validate(storageSettingsSchema, { totallyUnknown: true })).toThrow(
      "Invalid payload"
    );
  });

  test("rejects a non-number totalBytes", () => {
    expect(() => validate(storageSettingsSchema, { quota: { totalBytes: "lots" } })).toThrow(
      "Invalid payload"
    );
  });
});

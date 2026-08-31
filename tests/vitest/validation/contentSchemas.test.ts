import { expect, test } from "vitest";

import { ApiError } from "../../../core/server/errorHandler";
import {
  contentEntryAllEntriesQuerySchema,
  contentEntryMetadataSchema,
} from "../../../core/server/validation/contentSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

test("content metadata accepts date-time and visibility fields", () => {
  expect(() =>
    validate(contentEntryMetadataSchema, { scheduledAt: "2026-04-24T08:00:00+02:00" })
  ).not.toThrow();
  expect(() =>
    validate(contentEntryMetadataSchema, { visibility: "password", accessPassword: "s3cret" })
  ).not.toThrow();
  expect(() => validate(contentEntryMetadataSchema, { visibility: "public" })).not.toThrow();
  expect(() => validate(contentEntryMetadataSchema, { accessPassword: null })).not.toThrow();
});

test("content metadata rejects invalid values and unknown fields", () => {
  const expectRejected = (payload: Record<string, unknown>) => {
    try {
      validate(contentEntryMetadataSchema, payload);
      throw new Error("expected_validation_error");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("validation_error");
      expect((error as ApiError).status).toBe(400);
    }
  };
  expectRejected({ visibility: "secret" });
  expectRejected({ accessPassword: "x".repeat(201) });
  expectRejected({ visibility: "private", bogusKey: true });
});

test("all content entries query schema accepts empty query and rejects unknown filters", () => {
  expect(() => validate(contentEntryAllEntriesQuerySchema, {})).not.toThrow();
  try {
    validate(contentEntryAllEntriesQuerySchema, { type: "posts" });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});

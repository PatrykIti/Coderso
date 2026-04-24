import { expect, test } from "bun:test";

import { postAutosaveSchema, postMetadataSchema } from "../../../core/server/validation/postSchemas";
import { contentEntryMetadataSchema } from "../../../core/server/validation/contentSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { ApiError } from "../../../core/server/errorHandler";

test("schema validator supports date-time metadata schemas without compile errors", () => {
  expect(() =>
    validate(postMetadataSchema, {
      tags: ["launch"],
      taxonomy: { categoryId: "cat-1" },
      seo: { robots: "index,follow" },
    })
  ).not.toThrow();

  expect(() =>
    validate(postAutosaveSchema, {
      title: "Draft title",
      tags: ["launch"],
      taxonomy: { categoryId: "cat-1" },
    })
  ).not.toThrow();

  expect(() =>
    validate(postMetadataSchema, {
      scheduledAt: "2026-04-24T08:00:00.000Z",
    })
  ).not.toThrow();

  expect(() =>
    validate(contentEntryMetadataSchema, {
      scheduledAt: "2026-04-24T08:00:00+02:00",
    })
  ).not.toThrow();
});

test("schema validator rejects invalid date-time metadata values", () => {
  try {
    validate(postMetadataSchema, {
      scheduledAt: "tomorrow",
    });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});

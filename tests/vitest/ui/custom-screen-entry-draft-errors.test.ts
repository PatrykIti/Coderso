// TASK-105-08-04 (Item B): resolveEntryFieldErrorsFromApiError residual
// branches — required/enum/type/message/fallback validation messages, nested
// instancePath resolution, non-string detail.field, and the media/relation
// detail-field error switch.

import { expect, test } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import { resolveEntryFieldErrorsFromApiError } from "../../../core/admin/ui/custom-screens/customScreenEntryDraft";

const contentType: ContentTypeSummary = {
  id: "type-house-projects",
  name: "House Projects",
  slug: "house-projects",
  status: "published",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["projectStatus"],
    properties: {
      projectStatus: { type: "string", title: "Project status", xFieldType: "select" },
      budget: { type: "number", title: "Budget", xFieldType: "number" },
      featured: { type: "boolean", title: "Featured", xFieldType: "boolean" },
      internalNotes: { type: "string", title: "Internal notes", xFieldType: "text" },
    },
  },
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const validationError = (validation: unknown[]) =>
  new ApiClientError("entry_validation_failed", "Entry validation failed.", 400, {
    validation,
  });

test("validation details resolve nested paths, missing properties, and message kinds", () => {
  // required without a missingProperty string → falls through to instancePath
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([{ keyword: "required", params: {} }]),
    })
  ).toEqual({});

  // no instancePath → null field, no error emitted
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([{ keyword: "enum" }]),
    })
  ).toEqual({});

  // nested instancePath resolves to the first path segment
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([
        { instancePath: "/budget/amount", keyword: "minLength", message: "must be positive" },
      ]),
    })
  ).toEqual({
    budget: "Budget must be positive.",
  });

  // root-only instancePath yields an empty first segment → null
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([{ instancePath: "/", keyword: "minLength" }]),
    })
  ).toEqual({});

  // enum, type, and raw-message variants
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([{ instancePath: "/featured", keyword: "enum" }]),
    })
  ).toEqual({
    featured: "Featured has an invalid value.",
  });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([{ instancePath: "/budget", keyword: "type" }]),
    })
  ).toEqual({
    budget: "Budget has an invalid value.",
  });

  // message normalization: leading "must" is kept, message suffix appended
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([
        {
          instancePath: "/projectStatus",
          keyword: "pattern",
          message: "must match required pattern",
        },
      ]),
    })
  ).toEqual({
    projectStatus: "Project Status must match required pattern.",
  });

  // unknown keyword with no message → generic fallback
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: validationError([{ instancePath: "/internalNotes", keyword: "custom" }]),
    })
  ).toEqual({
    internalNotes: "Internal Notes is invalid.",
  });
});

test("detail-field errors map media and relation codes to field labels", () => {
  const mediaError = (code: string) =>
    new ApiClientError(code, "invalid value", 400, { field: "budget" });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: mediaError("media_value_invalid"),
    })
  ).toEqual({ budget: "Budget has an invalid media value." });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: mediaError("media_asset_missing"),
    })
  ).toEqual({ budget: "Budget references a missing media asset." });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: mediaError("media_type_not_allowed"),
    })
  ).toEqual({ budget: "Budget uses a media type that is not allowed." });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: mediaError("relation_value_invalid"),
    })
  ).toEqual({ budget: "Budget has an invalid relation value." });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: mediaError("relation_entry_missing"),
    })
  ).toEqual({ budget: "Budget references a missing related entry." });

  // title-specific label
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: new ApiClientError("media_value_invalid", "invalid", 400, { field: "title" }),
    })
  ).toEqual({ title: "Title has an invalid media value." });

  // unknown code with a known field → empty (default switch branch)
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: new ApiClientError("some_other_code", "boom", 400, { field: "featured" }),
    })
  ).toEqual({});

  // non-string detail.field → no detail field, empty errors
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: new ApiClientError("media_value_invalid", "invalid", 400, { field: 42 }),
    })
  ).toEqual({});
});

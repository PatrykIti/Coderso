import { expect, test } from "vitest";

import {
  buildCmsOperationDraftJsonSchema,
  isCmsOperationDraft,
  repairCmsOperationDraft,
  normalizeCmsOperationDraft,
} from "../../../core/services/assistant/cmsOperationDraftSchema";

test("normalizeCmsOperationDraft accepts strict CMS operation drafts", () => {
  expect(
    normalizeCmsOperationDraft({
      operation: "delete",
      resourceKind: "page",
      surfaceHint: "Pages",
      filters: [
        {
          field: "status",
          operator: "eq",
          value: "published",
        },
        {
          field: "showInSidebar",
          operator: "eq",
          value: true,
        },
      ],
      targetQuery: {
        exactName: "Pysiek Mysiek",
      },
      constraints: {
        expectedCount: 1,
        destructive: true,
        requiresConfirmation: true,
      },
    })
  ).toEqual({
    operation: "delete",
    resourceKind: "page",
    surfaceHint: "Pages",
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "published",
      },
      {
        field: "showInSidebar",
        operator: "eq",
        value: true,
      },
    ],
    targetQuery: {
      exactName: "Pysiek Mysiek",
    },
    constraints: {
      expectedCount: 1,
      destructive: true,
      requiresConfirmation: true,
    },
  });
});

test("normalizeCmsOperationDraft rejects unknown fields and unsupported operations", () => {
  expect(() =>
    normalizeCmsOperationDraft({
      operation: "sql",
      resourceKind: "page",
    })
  ).toThrow("cms_operation_draft_invalid");

  expect(() =>
    normalizeCmsOperationDraft({
      operation: "delete",
      resourceKind: "page",
      command: "drop table",
    })
  ).toThrow("cms_operation_draft_invalid");

  expect(() =>
    normalizeCmsOperationDraft({
      operation: "inspect",
      resourceKind: "custom-screen",
      filters: [{ field: "database.path", operator: "eq", value: "users" }],
    })
  ).toThrow("cms_operation_draft_invalid");

  expect(() =>
    normalizeCmsOperationDraft({
      operation: "inspect",
      resourceKind: "custom-screen",
      filters: [{ field: "status", operator: "eq", value: ["active"] }],
    })
  ).toThrow("cms_operation_draft_invalid");

  expect(isCmsOperationDraft({ operation: "inspect", resourceKind: "form" })).toBe(true);
  expect(isCmsOperationDraft({ operation: "inspect", resourceKind: "secret" })).toBe(false);
});

test("repairCmsOperationDraft keeps safe fields from model-shaped drafts", () => {
  expect(
    repairCmsOperationDraft({
      operation: "inspect",
      resourceKind: "custom-screen",
      surfaceHint: "Screens",
      filters: [
        { field: "showInSidebar", operator: "eq", value: true },
        { field: "status", operator: "in", value: ["active", "published"] },
      ],
      "optional targetQuery": {
        filters: [{ field: "showInSidebar", operator: "eq", value: true }],
        exactName: "House Projects",
      },
      constraints: {
        returnFields: ["name"],
        expectedCount: 1,
      },
    })
  ).toEqual({
    operation: "inspect",
    resourceKind: "custom-screen",
    surfaceHint: "Screens",
    filters: [
      { field: "showInSidebar", operator: "eq", value: true },
      { field: "status", operator: "in", value: ["active", "published"] },
    ],
    targetQuery: {
      exactName: "House Projects",
    },
    constraints: {
      expectedCount: 1,
    },
  });

  expect(
    repairCmsOperationDraft({
      operation: "inspect",
      resourceKind: "custom-screen",
      apiKey: "never",
    })
  ).toBeNull();
});

test("buildCmsOperationDraftJsonSchema exposes provider-safe strict schema", () => {
  const schema = buildCmsOperationDraftJsonSchema();

  expect(schema).toMatchObject({
    type: "object",
    additionalProperties: false,
    required: ["operation", "resourceKind", "surfaceHint", "filters", "targetQuery", "mutation", "constraints"],
    properties: {
      operation: {
        enum: expect.arrayContaining(["inspect", "delete", "update"]),
      },
      resourceKind: {
        enum: expect.arrayContaining(["page", "custom-screen", "form"]),
      },
      filters: {
        anyOf: expect.any(Array),
      },
    },
  });
  expect(
    ((schema.properties as Record<string, unknown>).targetQuery as { anyOf: Array<Record<string, unknown>> })
      .anyOf[0]
  ).toMatchObject({
    type: "object",
    additionalProperties: false,
    required: ["text", "exactName", "prefix", "slug", "route", "active"],
  });
});

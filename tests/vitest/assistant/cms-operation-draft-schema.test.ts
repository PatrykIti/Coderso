import { expect, test } from "vitest";

import {
  buildCmsOperationDraftJsonSchema,
  isCmsOperationDraft,
  normalizeCmsOperationDraft,
  normalizeCmsOperationDraftWithPolicy,
} from "../../../core/services/assistant/cmsOperationDraftSchema";
import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";

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

  expect(isCmsOperationDraft({ operation: "inspect", resourceKind: "detail-page" })).toBe(true);
  expect(isCmsOperationDraft({ operation: "inspect", resourceKind: "form" })).toBe(true);
  expect(isCmsOperationDraft({ operation: "inspect", resourceKind: "secret" })).toBe(false);
});

test("normalizeCmsOperationDraftWithPolicy validates exact resource keys", () => {
  expect(
    normalizeCmsOperationDraftWithPolicy(
      {
        operation: "inspect",
        resourceKind: "settings-surface",
        resourceKey: "settings-api-keys",
      },
      assistantOperationPolicy
    )
  ).toMatchObject({
    operation: "inspect",
    resourceKind: "settings-surface",
    resourceKey: "settings-api-keys",
  });

  expect(() =>
    normalizeCmsOperationDraftWithPolicy(
      {
        operation: "inspect",
        resourceKind: "page",
        resourceKey: "settings-api-keys",
      },
      assistantOperationPolicy
    )
  ).toThrow("cms_operation_draft_invalid");

  expect(() =>
    normalizeCmsOperationDraftWithPolicy(
      {
        operation: "inspect",
        resourceKind: "settings-surface",
        resourceKey: "settings-missing",
      },
      assistantOperationPolicy
    )
  ).toThrow("cms_operation_draft_invalid");
});

test("normalizeCmsOperationDraftWithPolicy rejects repaired or ambiguous provider drafts", () => {
  expect(() =>
    normalizeCmsOperationDraftWithPolicy(
      {
        operation: "inspect",
        resourceKind: "custom-screen",
        actions: [{ type: "database.drop", input: {} }],
      },
      assistantOperationPolicy
    )
  ).toThrow("cms_operation_draft_invalid");

  expect(() =>
    normalizeCmsOperationDraftWithPolicy(
      {
        operation: "inspect",
        resourceKind: "settings-surface",
        resourceKey: null,
      },
      assistantOperationPolicy
    )
  ).toThrow("cms_operation_draft_invalid");
});

test("buildCmsOperationDraftJsonSchema exposes provider-safe strict schema", () => {
  const schema = buildCmsOperationDraftJsonSchema();

  expect(schema).toMatchObject({
    type: "object",
    additionalProperties: false,
    required: [
      "operation",
      "resourceKind",
      "resourceKey",
      "surfaceHint",
      "filters",
      "targetQuery",
      "mutation",
      "constraints",
    ],
    properties: {
      operation: {
        enum: expect.arrayContaining(["inspect", "delete", "update"]),
      },
      resourceKind: {
        enum: expect.arrayContaining(["page", "detail-page", "custom-screen", "form"]),
      },
      filters: {
        anyOf: expect.any(Array),
      },
    },
  });
  expect(
    (
      (schema.properties as Record<string, unknown>).targetQuery as {
        anyOf: Array<Record<string, unknown>>;
      }
    ).anyOf[0]
  ).toMatchObject({
    type: "object",
    additionalProperties: false,
    required: ["text", "exactName", "prefix", "slug", "route", "active"],
  });
});

test("buildCmsOperationDraftJsonSchema can narrow provider enums from operation policy", () => {
  const schema = buildCmsOperationDraftJsonSchema(assistantOperationPolicy);
  const properties = schema.properties as Record<string, { enum?: string[]; type?: string }>;

  expect(properties.operation?.enum).toEqual(
    expect.arrayContaining(["inspect", "find", "create", "update", "delete", "configure"])
  );
  expect(properties.resourceKind?.enum).toEqual(
    expect.arrayContaining([
      "page",
      "detail-page",
      "settings-surface",
      "solution-kit",
      "post",
      "media",
    ])
  );
  expect(properties.resourceKey).toMatchObject({ type: "string" });
  expect(properties.resourceKey?.enum).toEqual(
    expect.arrayContaining(["settings-api-keys", "settings-assistant", "page", "detail-page"])
  );
});

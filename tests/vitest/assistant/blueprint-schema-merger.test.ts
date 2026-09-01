import { expect, test } from "vitest";

import {
  BlueprintSchemaMergeError,
  mergeBlueprintSchemas,
} from "../../../core/services/assistant/blueprints/blueprintSchemaMerger";

test("mergeBlueprintSchemas merges compatible fields, enum values, and required keys", () => {
  const merged = mergeBlueprintSchemas([
    {
      type: "object",
      additionalProperties: false,
      required: ["title", "projectStatus"],
      properties: {
        title: {
          type: "string",
          title: "Title",
          xFieldType: "text",
        },
        projectStatus: {
          type: "string",
          title: "Status",
          enum: ["draft", "published"],
          xFieldType: "select",
          xFieldConfig: {
            select: {
              options: ["draft", "published"],
            },
          },
          default: "draft",
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["summary", "projectStatus"],
      properties: {
        summary: {
          type: "string",
          title: "Summary",
          xFieldType: "textarea",
        },
        projectStatus: {
          type: "string",
          title: "Lifecycle",
          enum: ["published", "archived"],
          xFieldType: "select",
          xFieldConfig: {
            layout: {
              tab: "content",
              section: "Basics",
            },
          },
          default: "draft",
        },
      },
    },
  ]);

  expect(merged).toMatchObject({
    type: "object",
    additionalProperties: false,
    required: ["title", "projectStatus", "summary"],
    properties: {
      summary: {
        type: "string",
        xFieldType: "textarea",
      },
      projectStatus: {
        title: "Status",
        enum: ["draft", "published", "archived"],
        xFieldConfig: {
          select: {
            options: ["draft", "published"],
          },
          layout: {
            tab: "content",
            section: "Basics",
          },
        },
      },
    },
  });
});

test("mergeBlueprintSchemas rejects incompatible field types", () => {
  expect(() =>
    mergeBlueprintSchemas([
      {
        type: "object",
        additionalProperties: false,
        properties: {
          priceFrom: {
            type: "number",
            title: "Price from",
            xFieldType: "number",
          },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        properties: {
          priceFrom: {
            type: "string",
            title: "Price from",
            xFieldType: "text",
          },
        },
      },
    ])
  ).toThrowError(BlueprintSchemaMergeError);
});

test("mergeBlueprintSchemas rejects secret-like defaults", () => {
  expect(() =>
    mergeBlueprintSchemas([
      {
        type: "object",
        additionalProperties: false,
        properties: {
          apiKey: {
            type: "string",
            title: "API key",
            xFieldType: "text",
            default: "sk-test-value",
          },
        },
      },
    ])
  ).toThrowError('Field "apiKey" cannot define a secret-like default value.');
});

test("mergeBlueprintSchemas preserves Mabudo-like house-project pricing and classification fields", () => {
  const merged = mergeBlueprintSchemas([
    {
      type: "object",
      additionalProperties: false,
      required: ["projectCode", "priceFrom", "garageType"],
      properties: {
        projectCode: {
          type: "string",
          title: "Project code",
          xFieldType: "text",
        },
        priceFrom: {
          type: "number",
          title: "Project price",
          xFieldType: "number",
        },
        garageType: {
          type: "string",
          title: "Garage",
          enum: ["none", "single"],
          xFieldType: "select",
          xFieldConfig: {
            select: {
              options: ["none", "single"],
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["pricePackageStart", "roofType", "houseStyle"],
      properties: {
        pricePackageStart: {
          type: "number",
          title: "Start package",
          xFieldType: "number",
        },
        roofType: {
          type: "string",
          title: "Roof type",
          enum: ["gable", "flat"],
          xFieldType: "select",
        },
        houseStyle: {
          type: "string",
          title: "Style",
          enum: ["modern", "classic"],
          xFieldType: "select",
        },
      },
    },
  ]);

  expect(merged).toMatchObject({
    required: [
      "projectCode",
      "priceFrom",
      "garageType",
      "pricePackageStart",
      "roofType",
      "houseStyle",
    ],
    properties: {
      projectCode: { type: "string" },
      priceFrom: { type: "number" },
      pricePackageStart: { type: "number" },
      roofType: { enum: ["gable", "flat"] },
      houseStyle: { enum: ["modern", "classic"] },
      garageType: { enum: ["none", "single"] },
    },
  });
});

test("mergeBlueprintSchemas rejects boolean child property definitions", () => {
  let thrown: unknown;
  try {
    mergeBlueprintSchemas([
      {
        type: "object",
        additionalProperties: false,
        properties: { enabled: true },
      },
    ]);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(BlueprintSchemaMergeError);
  expect(thrown).toMatchObject({
    code: "schema_merge_conflict",
    fieldName: "enabled",
  });
  expect((thrown as Error).message).toBe('Field "enabled" must be a JSON schema object.');
});

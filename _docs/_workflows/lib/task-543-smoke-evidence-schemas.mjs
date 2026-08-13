// TASK-543 smoke-evidence-schemas (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  POST_PAYLOAD_SCHEMA,
} from "./task-543-smoke-schema.mjs";

export const RESPONSIVE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "width",
    "matchedRowCount",
    "rowPostId",
    "fallbackMetadataVisible",
    "fallbackStatusVisible",
    "fallbackAuthorVisible",
    "fallbackDateVisible",
    "columnStatusVisible",
    "columnAuthorVisible",
    "columnDateVisible",
    "visibleStatusCopies",
    "visibleAuthorCopies",
    "visibleDateCopies",
    "titleAccessibleName",
    "checkboxAccessibleName",
    "actionAccessibleName",
    "nodes",
    "rowWidth",
    "tableWidth",
  ],
  properties: {
    width: { type: "integer" },
    matchedRowCount: { type: "integer", minimum: 0 },
    rowPostId: { type: "string" },
    fallbackMetadataVisible: { type: "boolean" },
    fallbackStatusVisible: { type: "boolean" },
    fallbackAuthorVisible: { type: "boolean" },
    fallbackDateVisible: { type: "boolean" },
    columnStatusVisible: { type: "boolean" },
    columnAuthorVisible: { type: "boolean" },
    columnDateVisible: { type: "boolean" },
    visibleStatusCopies: { type: "integer", minimum: 0 },
    visibleAuthorCopies: { type: "integer", minimum: 0 },
    visibleDateCopies: { type: "integer", minimum: 0 },
    titleAccessibleName: { type: "string" },
    checkboxAccessibleName: { type: "string" },
    actionAccessibleName: { type: "string" },
    nodes: {
      type: "object",
      additionalProperties: false,
      required: [
        "fallbackMetadata",
        "fallbackStatus",
        "fallbackAuthor",
        "fallbackDate",
        "columnStatus",
        "columnAuthor",
        "columnDate",
        "row",
        "table",
      ],
      properties: Object.fromEntries(
        [
          "fallbackMetadata",
          "fallbackStatus",
          "fallbackAuthor",
          "fallbackDate",
          "columnStatus",
          "columnAuthor",
          "columnDate",
          "row",
          "table",
        ].map((key) => [
          key,
          {
            type: "object",
            additionalProperties: false,
            required: [
              "exists",
              "display",
              "visibility",
              "opacity",
              "width",
              "height",
              "visible",
              "text",
            ],
            properties: {
              exists: { type: "boolean" },
              display: { type: "string" },
              visibility: { type: "string" },
              opacity: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              visible: { type: "boolean" },
              text: { type: "string" },
            },
          },
        ])
      ),
    },
    rowWidth: { type: "number" },
    tableWidth: { type: "number" },
  },
};

export const MUTATION_RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["method", "path", "payload"],
  properties: {
    method: { enum: ["POST", "PUT", "PATCH", "DELETE"] },
    path: { type: "string", minLength: 1 },
    payload: { anyOf: [{ type: "null" }, POST_PAYLOAD_SCHEMA] },
  },
};
export const MUTATION_ARRAY_SCHEMA = { type: "array", items: MUTATION_RECORD_SCHEMA };
export const NAVIGATION_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };


import { pageDocumentV2JsonSchema } from "../../services/pages/pageDocumentV2";

export const pageDataSchema = pageDocumentV2JsonSchema;
const pageDataSchemaDefs = {
  $defs: pageDocumentV2JsonSchema.$defs,
};

export const pageCreateSchema = {
  ...pageDataSchemaDefs,
  type: "object",
  required: ["title", "slug", "data"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    template: { type: "string" },
    data: pageDataSchema,
  },
};

export const pageUpdateSchema = {
  ...pageDataSchemaDefs,
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    data: pageDataSchema,
  },
};

export const pageAutosaveSchema = {
  ...pageDataSchemaDefs,
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    data: pageDataSchema,
  },
};

export const pagePreviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
    probe: { type: "boolean" },
  },
};

export const pagePublishSchema = {
  ...pageDataSchemaDefs,
  type: "object",
  additionalProperties: false,
  properties: {
    data: pageDataSchema,
  },
};

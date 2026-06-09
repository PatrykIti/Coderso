import { pageDocumentV2JsonSchema } from "../../services/pages/pageDocumentV2";

export const pageDataSchema = pageDocumentV2JsonSchema;

export const pageCreateSchema = {
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
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    data: pageDataSchema,
  },
};

export const pageAutosaveSchema = {
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
  type: "object",
  additionalProperties: false,
  properties: {
    data: pageDataSchema,
  },
};

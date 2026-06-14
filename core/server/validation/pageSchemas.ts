/**
 * Route-level Page v2 envelope only. The Page domain normalizer owns full
 * recursive section/block validation and unknown-field rejection; keeping AJV
 * away from the complete recursive block union avoids a large first-write
 * memory spike on small production instances.
 */
export const pageDataSchema = {
  type: "object",
  required: ["schemaVersion", "sections"],
  additionalProperties: true,
  properties: {
    schemaVersion: { const: 2 },
    sections: { type: "array" },
    blocks: false,
  },
};

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

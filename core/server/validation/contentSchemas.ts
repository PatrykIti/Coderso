export const contentTypeCreateSchema = {
  type: "object",
  required: ["name", "slug", "schema"],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    schema: { type: "object" },
  },
  additionalProperties: false,
};

export const contentTypeUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    schema: { type: "object" },
  },
  additionalProperties: false,
};

export const contentEntryCreateSchema = {
  type: "object",
  required: ["title", "slug", "data"],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const contentEntryUpdateSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const contentEntryPreviewSchema = {
  type: "object",
  properties: {
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
  },
  additionalProperties: false,
};

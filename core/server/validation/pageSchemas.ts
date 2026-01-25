export const pageCreateSchema = {
  type: "object",
  required: ["title", "slug", "data"],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const pageUpdateSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const pagePreviewSchema = {
  type: "object",
  properties: {
    ttlMinutes: { type: "number" },
  },
  additionalProperties: false,
};

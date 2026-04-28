export const taxonomyConfigSchema = {
  type: "object",
  properties: {
    categories: { type: "boolean" },
    tags: { type: "boolean" },
  },
  additionalProperties: false,
};

export const taxonomyTermCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
  },
  additionalProperties: false,
};

export const taxonomyTermUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
  },
  additionalProperties: false,
};

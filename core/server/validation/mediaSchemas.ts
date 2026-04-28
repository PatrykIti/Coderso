export const mediaUploadSchema = {
  type: "object",
  required: ["file"],
  properties: {
    file: { type: "object" },
    alt: { type: "string" },
    title: { type: "string" },
    caption: { type: "string" },
  },
  additionalProperties: false,
};

export const mediaUpdateSchema = {
  type: "object",
  properties: {
    alt: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    caption: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const mediaReplaceSchema = {
  type: "object",
  required: ["file"],
  properties: {
    file: { type: "object" },
  },
  additionalProperties: false,
};

export const mediaRecoverDimensionsSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const mediaUsageQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "string", pattern: "^[0-9]+$" },
  },
  additionalProperties: false,
};

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
    alt: { type: "string" },
    title: { type: "string" },
    caption: { type: "string" },
  },
  additionalProperties: false,
};

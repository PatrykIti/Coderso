export const integrationUpdateSchema = {
  type: "object",
  properties: {
    config: {
      type: "object",
      additionalProperties: { type: ["string", "null"] },
    },
  },
  additionalProperties: false,
};

export const integrationRequestSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    website: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

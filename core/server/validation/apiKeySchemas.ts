export const apiKeyCreateSchema = {
  type: "object",
  required: ["name", "scopes"],
  properties: {
    name: { type: "string" },
    scopes: { type: "array", items: { type: "string" }, minItems: 1 },
  },
  additionalProperties: false,
};


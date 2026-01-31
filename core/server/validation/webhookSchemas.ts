export const webhookCreateSchema = {
  type: "object",
  required: ["name", "url", "events"],
  properties: {
    name: { type: "string" },
    url: { type: "string" },
    events: { type: "array", items: { type: "string" }, minItems: 1 },
    enabled: { type: "boolean" },
    secret: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const webhookUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    url: { type: "string" },
    events: { type: "array", items: { type: "string" } },
    enabled: { type: "boolean" },
    secret: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const webhookTestSchema = {
  type: "object",
  properties: {
    event: { type: "string" },
    payload: { type: "object" },
  },
  additionalProperties: false,
};


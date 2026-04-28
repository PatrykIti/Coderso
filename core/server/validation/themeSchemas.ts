export const themeProfileCreateSchema = {
  type: "object",
  required: ["name", "themeName"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    themeName: { type: "string" },
    tokens: { type: "object" },
    isActive: { type: "boolean" },
  },
};

export const themeProfileUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    tokens: { type: "object" },
  },
};

export const themeRoutesSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["path"],
    additionalProperties: false,
    properties: {
      path: { type: "string" },
      pageId: { type: ["string", "null"] },
    },
  },
};

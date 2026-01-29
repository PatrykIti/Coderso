export const adminThemeTemplateCreateSchema = {
  type: "object",
  required: ["name", "tokens"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    tokens: { type: "object" },
  },
};

export const adminThemeTemplateUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    tokens: { type: "object" },
  },
};

export const adminThemeProfileCreateSchema = {
  type: "object",
  required: ["name", "templateId"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    templateId: { type: "string" },
    isActive: { type: "boolean" },
  },
};

export const adminThemeProfileUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    templateId: { type: "string" },
  },
};

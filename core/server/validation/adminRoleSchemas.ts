export const adminRoleCreateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "permissions"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    permissions: {
      type: "array",
      items: { type: "string" },
    },
    sourceRoleId: { type: "string" },
    sourceRoleName: { type: "string" },
  },
};

export const adminRoleUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    permissions: {
      type: "array",
      items: { type: "string" },
    },
  },
};

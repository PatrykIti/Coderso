export const adminUserCreateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "roleIds"],
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    roleIds: {
      type: "array",
      items: { type: "string" },
    },
    status: { type: "string", enum: ["active", "inactive", "pending"] },
    password: { type: "string" },
  },
};

export const adminUserUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    status: { type: "string", enum: ["active", "inactive", "pending"] },
    password: { type: "string" },
  },
};

export const adminUserRolesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["roleIds"],
  properties: {
    roleIds: {
      type: "array",
      items: { type: "string" },
    },
  },
};

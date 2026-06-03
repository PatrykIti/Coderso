const emailField = {
  type: "string",
  minLength: 3,
  pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
};

export const adminUserCreateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "roleIds"],
  properties: {
    name: { type: "string", minLength: 1 },
    email: emailField,
    roleIds: {
      type: "array",
      items: { type: "string" },
    },
    status: { type: "string", enum: ["active", "inactive", "pending"] },
  },
};

export const adminUserUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    email: emailField,
    status: { type: "string", enum: ["active", "inactive", "pending"] },
  },
};

export const adminUserInviteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "roleIds", "sendSetPasswordInvite"],
  properties: {
    name: { type: "string", minLength: 1 },
    email: emailField,
    roleIds: {
      type: "array",
      items: { type: "string" },
    },
    sendSetPasswordInvite: { const: true },
  },
};

export const adminUserPasswordResetSchema = {
  type: "object",
  additionalProperties: false,
  required: ["delivery"],
  properties: {
    delivery: { const: "email" },
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

export const authLoginSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string" },
    password: { type: "string", minLength: 8 },
  },
  additionalProperties: false,
};

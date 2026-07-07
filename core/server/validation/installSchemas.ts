// Schema owner for the pre-auth installer writes (TASK-482-02-L02). The route
// module re-uses this schema and never re-declares it. Strict (reject-unknown)
// keys, argon2-compatible password floor aligned with `authResetConfirmSchema`.
export const installAdminSchema = {
  type: "object",
  required: ["name", "email", "password"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 200 },
    email: {
      type: "string",
      minLength: 3,
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    },
    password: { type: "string", minLength: 8 },
  },
  additionalProperties: false,
};

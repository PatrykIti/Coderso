export const sessionRevokeAllSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    userId: { type: "string" },
  },
};

export const accessLogQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit"],
  properties: {
    limit: { type: "number", minimum: 1, maximum: 200 },
    status: { type: "string", enum: ["success", "failed"] },
    q: { type: "string", minLength: 1, maxLength: 200 },
    userId: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
  },
};

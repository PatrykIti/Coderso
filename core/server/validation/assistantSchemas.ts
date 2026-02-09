export const assistantChatSchema = {
  type: "object",
  required: ["message"],
  additionalProperties: false,
  properties: {
    message: { type: "string", minLength: 1, maxLength: 2000 },
    mode: { type: "string", enum: ["docs-only", "llm-rag"] },
    context: {
      type: "object",
      additionalProperties: false,
      properties: {
        page: { type: "string", minLength: 1, maxLength: 200 },
        locale: { type: "string", minLength: 2, maxLength: 16 },
      },
    },
  },
};

export const assistantReindexSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    force: { type: "boolean" },
  },
};

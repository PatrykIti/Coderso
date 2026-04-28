export const formActionsUpdateSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["type", "config"],
    properties: {
      id: { type: "string" },
      type: {
        enum: ["email", "webhook", "entry_sync", "redirect", "success_message"],
      },
      label: { type: "string" },
      enabled: { type: "boolean" },
      continueOnError: { type: "boolean" },
      condition: { type: "object" },
      config: { type: "object" },
      orderIndex: { type: "integer", minimum: 0 },
    },
    additionalProperties: false,
  },
};

export const formActionRunsQuerySchema = {
  type: "object",
  properties: {
    status: {
      enum: ["success", "failed", "skipped"],
    },
    limit: { type: "integer", minimum: 1, maximum: 200 },
  },
  additionalProperties: false,
};

export const formActionRetrySchema = {
  type: "object",
  additionalProperties: false,
};

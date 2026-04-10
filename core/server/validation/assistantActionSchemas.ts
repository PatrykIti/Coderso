export const assistantActionPlanRequestSchema = {
  type: "object",
  required: ["prompt"],
  additionalProperties: false,
  properties: {
    prompt: {
      type: "string",
      minLength: 1,
      maxLength: 2000,
    },
    context: {
      type: "object",
      additionalProperties: false,
      properties: {
        page: { type: "string", minLength: 1, maxLength: 200 },
        locale: { type: "string", minLength: 2, maxLength: 16 },
      },
    },
  },
} as const;

export const assistantActionDryRunRequestSchema = {
  type: "object",
  required: ["plan"],
  additionalProperties: false,
  properties: {
    plan: {
      type: "object",
      additionalProperties: true,
    },
  },
} as const;

export const assistantActionExecuteRequestSchema = {
  type: "object",
  required: ["plan", "idempotencyKey"],
  additionalProperties: false,
  properties: {
    plan: {
      type: "object",
      additionalProperties: true,
    },
    idempotencyKey: {
      type: "string",
      minLength: 8,
      maxLength: 120,
    },
  },
} as const;

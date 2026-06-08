import { ASSISTANT_TRANSPORT_MAX_CHARS } from "../../services/assistant/promptLimits";

export const assistantChatSchema = {
  type: "object",
  required: ["message"],
  additionalProperties: false,
  properties: {
    message: { type: "string", minLength: 1, maxLength: ASSISTANT_TRANSPORT_MAX_CHARS },
    mode: { type: "string", enum: ["docs-only", "llm-guide", "llm-rag"] },
    detailLevel: {
      type: "string",
      enum: ["basic", "medium", "instruction", "advanced"],
    },
    guideMode: {
      type: "string",
      enum: ["default", "troubleshooting", "decision_guide", "checklist", "security"],
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
};

export const assistantReindexSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    force: { type: "boolean" },
  },
};

export const assistantModelMetadataSchema = {
  type: "object",
  required: ["provider", "model"],
  additionalProperties: false,
  properties: {
    provider: { type: "string", enum: ["openai", "openrouter", "none"] },
    model: { type: "string", minLength: 1, maxLength: 200 },
  },
};

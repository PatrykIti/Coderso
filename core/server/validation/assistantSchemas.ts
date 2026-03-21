import {
  siteBuilderBusinessTypes,
  siteBuilderGoals,
  siteBuilderPlanStepIds,
  solutionKitIds,
} from "../../services/kits/solutionKitTypes";

const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

export const assistantChatSchema = {
  type: "object",
  required: ["message"],
  additionalProperties: false,
  properties: {
    message: { type: "string", minLength: 1, maxLength: 2000 },
    mode: { type: "string", enum: ["docs-only", "llm-rag"] },
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

const siteBuilderBaseSchema = {
  type: "object",
  required: ["businessType", "goals", "locale"],
  properties: {
    businessType: {
      type: "string",
      enum: [...siteBuilderBusinessTypes],
    },
    goals: {
      type: "array",
      minItems: 1,
      maxItems: siteBuilderGoals.length,
      items: {
        type: "string",
        enum: [...siteBuilderGoals],
      },
      uniqueItems: true,
    },
    locale: {
      type: "string",
      minLength: 2,
      maxLength: 16,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    region: {
      type: ["string", "null"],
      minLength: 0,
      maxLength: 80,
    },
    siteName: {
      type: ["string", "null"],
      minLength: 0,
      maxLength: 120,
    },
    preferredKitId: {
      anyOf: [{ type: "string", enum: [...solutionKitIds] }, { type: "null" }],
    },
    selectedKitId: {
      anyOf: [{ type: "string", enum: [...solutionKitIds] }, { type: "null" }],
    },
    enabledStepIds: {
      type: "array",
      minItems: 1,
      maxItems: siteBuilderPlanStepIds.length,
      items: {
        type: "string",
        enum: [...siteBuilderPlanStepIds],
      },
      uniqueItems: true,
    },
  },
  additionalProperties: false,
} as const;

export const assistantSiteBuilderPlanSchema = siteBuilderBaseSchema;

export const assistantSiteBuilderExecuteSchema = {
  ...siteBuilderBaseSchema,
  properties: {
    ...siteBuilderBaseSchema.properties,
    dryRun: { type: "boolean" },
    continueOnError: { type: "boolean" },
    notes: {
      type: "array",
      maxItems: 20,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 240,
      },
    },
    settingsPatch: {
      type: "object",
      additionalProperties: true,
    },
  },
} as const;

export const assistantSiteBuilderValidateSchema = {
  type: "object",
  required: ["runId"],
  properties: {
    runId: {
      type: "string",
      pattern: uuidPattern,
    },
  },
  additionalProperties: false,
} as const;

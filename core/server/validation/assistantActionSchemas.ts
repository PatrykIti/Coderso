import {
  siteBuilderBusinessTypes,
  siteBuilderGoals,
  siteBuilderPlanStepIds,
  solutionKitIds,
} from "../../services/kits/solutionKitTypes";

const siteKitPlanContextSchema = {
  type: "object",
  required: ["businessType", "goals", "locale"],
  additionalProperties: false,
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
} as const;

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
        siteKit: siteKitPlanContextSchema,
        includeResourceCatalog: { type: "boolean" },
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

import {
  siteBuilderBusinessTypes,
  siteBuilderGoals,
  solutionKitIds,
} from "../../services/kits/solutionKitTypes";

const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

export const solutionKitIdSchema = {
  type: "string",
  enum: [...solutionKitIds],
} as const;

export const solutionKitPlanRequestSchema = {
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
      anyOf: [solutionKitIdSchema, { type: "null" }],
    },
  },
  additionalProperties: false,
} as const;

export const solutionKitApplyRequestSchema = {
  type: "object",
  properties: {
    dryRun: { type: "boolean" },
    continueOnError: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const solutionKitRollbackRequestSchema = {
  type: "object",
  properties: {
    sourceRunId: { type: "string", pattern: uuidPattern },
    continueOnError: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const solutionKitRunsQuerySchema = {
  type: "object",
  properties: {
    kitId: {
      type: "string",
      enum: [...solutionKitIds],
    },
    mode: {
      type: "string",
      enum: ["dry_run", "apply", "rollback"],
    },
    limit: {
      type: "string",
      pattern: "^\\d{1,3}$",
    },
  },
  additionalProperties: false,
} as const;

export const solutionKitRunIdSchema = {
  type: "string",
  pattern: uuidPattern,
} as const;

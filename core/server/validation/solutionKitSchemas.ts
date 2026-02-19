import {
  siteBuilderBusinessTypes,
  siteBuilderGoals,
  solutionKitIds,
} from "../../services/kits/solutionKitTypes";

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

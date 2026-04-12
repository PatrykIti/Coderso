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

const runtimeSnapshotSelectedResourceSchema = {
  anyOf: [
    {
      type: "object",
      required: ["kind", "id"],
      additionalProperties: false,
      properties: {
        kind: { type: "string", minLength: 1, maxLength: 80 },
        id: { type: "string", minLength: 1, maxLength: 200 },
      },
    },
    { type: "null" },
  ],
} as const;

const runtimeSnapshotVisibleActionSchema = {
  type: "object",
  required: ["id", "label", "kind", "href", "requiredPermission"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    kind: {
      type: "string",
      enum: ["navigate", "create", "edit", "publish", "delete", "execute", "configure"],
    },
    href: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 240 }, { type: "null" }],
    },
    requiredPermission: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 120 }, { type: "null" }],
    },
  },
} as const;

const runtimeSnapshotSchema = {
  type: "object",
  required: [
    "schemaVersion",
    "route",
    "activeHref",
    "area",
    "codersoModule",
    "selectedResource",
    "visibleActions",
    "permissionHints",
  ],
  additionalProperties: false,
  properties: {
    schemaVersion: { enum: [1] },
    route: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 240 }, { type: "null" }],
    },
    activeHref: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 240 }, { type: "null" }],
    },
    area: {
      type: "string",
      enum: ["dashboard", "pages", "posts", "coderso", "settings", "other"],
    },
    codersoModule: {
      anyOf: [
        {
          type: "string",
          enum: [
            "engine",
            "entries",
            "custom-screens",
            "widgets",
            "forms",
            "listings",
            "booking",
            "commerce",
            "other",
          ],
        },
        { type: "null" },
      ],
    },
    selectedResource: runtimeSnapshotSelectedResourceSchema,
    visibleActions: {
      type: "array",
      maxItems: 40,
      items: runtimeSnapshotVisibleActionSchema,
    },
    permissionHints: {
      type: "object",
      required: ["known", "requiredForVisibleActions", "reason"],
      additionalProperties: false,
      properties: {
        known: { type: "boolean" },
        requiredForVisibleActions: {
          type: "array",
          maxItems: 80,
          items: { type: "string", minLength: 1, maxLength: 120 },
          uniqueItems: true,
        },
        reason: {
          type: "string",
          enum: ["frontend_user_has_no_permissions", "server_enriched", "not_available"],
        },
      },
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
        runtimeSnapshot: runtimeSnapshotSchema,
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

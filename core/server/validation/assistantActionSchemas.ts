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

const runtimeSnapshotAdvancedModuleSchema = {
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
} as const;

const runtimeSnapshotV2Schema = {
  type: "object",
  required: [
    "schemaVersion",
    "route",
    "activeHref",
    "area",
    "advancedModule",
    "selectedResource",
    "visibleActions",
    "permissionHints",
  ],
  additionalProperties: false,
  properties: {
    schemaVersion: { enum: [2] },
    route: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 240 }, { type: "null" }],
    },
    activeHref: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 240 }, { type: "null" }],
    },
    area: {
      type: "string",
      enum: ["dashboard", "pages", "posts", "advanced", "settings", "other"],
    },
    advancedModule: runtimeSnapshotAdvancedModuleSchema,
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

const runtimeSnapshotV1LegacySchema = {
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
    codersoModule: runtimeSnapshotAdvancedModuleSchema,
    selectedResource: runtimeSnapshotSelectedResourceSchema,
    visibleActions: {
      type: "array",
      maxItems: 40,
      items: runtimeSnapshotVisibleActionSchema,
    },
    permissionHints: runtimeSnapshotV2Schema.properties.permissionHints,
  },
} as const;

const runtimeSnapshotSchema = {
  anyOf: [runtimeSnapshotV2Schema, runtimeSnapshotV1LegacySchema],
} as const;

const activeSurfaceBlockSchema = {
  type: "object",
  required: [
    "id",
    "type",
    "label",
    "path",
    "childCount",
    "slotKeys",
    "templateId",
    "templateName",
  ],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    type: { type: "string", minLength: 1, maxLength: 120 },
    label: { anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }] },
    path: { type: "string", minLength: 1, maxLength: 240 },
    childCount: { type: "integer", minimum: 0, maximum: 999 },
    slotKeys: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 120 },
      uniqueItems: true,
    },
    templateId: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
    },
    templateName: {
      anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
    },
  },
} as const;

const activeSurfaceSchema = {
  anyOf: [
    {
      type: "object",
      required: ["kind", "page", "selectedBlockId", "blocks", "warnings"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["page"] },
        page: {
          type: "object",
          required: ["id", "title", "slug", "status", "template"],
          additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1, maxLength: 160 },
            title: { type: "string", minLength: 1, maxLength: 240 },
            slug: { type: "string", minLength: 1, maxLength: 240 },
            status: { type: "string", minLength: 1, maxLength: 80 },
            template: {
              anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
            },
          },
        },
        selectedBlockId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 120 }, { type: "null" }],
        },
        blocks: {
          type: "array",
          maxItems: 80,
          items: activeSurfaceBlockSchema,
        },
        warnings: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1, maxLength: 160 },
          uniqueItems: true,
        },
      },
    },
    {
      type: "object",
      required: ["kind", "template", "selectedBlockId", "blocks", "settings", "warnings"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["widget-template"] },
        template: {
          type: "object",
          required: ["id", "name", "status", "category"],
          additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1, maxLength: 160 },
            name: { type: "string", minLength: 1, maxLength: 240 },
            status: { type: "string", minLength: 1, maxLength: 80 },
            category: { type: "string", minLength: 1, maxLength: 120 },
          },
        },
        selectedBlockId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 120 }, { type: "null" }],
        },
        blocks: {
          type: "array",
          maxItems: 80,
          items: activeSurfaceBlockSchema,
        },
        settings: {
          type: "object",
          required: ["wrapperContainer", "sectionGap", "hasBackgroundMedia"],
          additionalProperties: false,
          properties: {
            wrapperContainer: {
              anyOf: [{ type: "string", minLength: 1, maxLength: 80 }, { type: "null" }],
            },
            sectionGap: {
              anyOf: [{ type: "string", minLength: 1, maxLength: 80 }, { type: "null" }],
            },
            hasBackgroundMedia: { type: "boolean" },
          },
        },
        warnings: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1, maxLength: 160 },
          uniqueItems: true,
        },
      },
    },
    {
      type: "object",
      required: [
        "kind",
        "screen",
        "selectedEntryId",
        "selectedBlockId",
        "blocks",
        "bindings",
        "writableBindingFields",
        "warnings",
      ],
      additionalProperties: false,
      properties: {
        kind: { enum: ["custom-screen"] },
        screen: {
          type: "object",
          required: [
            "id",
            "name",
            "status",
            "contentTypeId",
            "showInSidebar",
            "sidebarLabel",
            "mode",
          ],
          additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1, maxLength: 160 },
            name: { type: "string", minLength: 1, maxLength: 240 },
            status: { type: "string", minLength: 1, maxLength: 80 },
            contentTypeId: { type: "string", minLength: 1, maxLength: 160 },
            showInSidebar: { type: "boolean" },
            sidebarLabel: {
              anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
            },
            mode: { type: "string", minLength: 1, maxLength: 80 },
          },
        },
        selectedEntryId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
        },
        selectedBlockId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 120 }, { type: "null" }],
        },
        blocks: {
          type: "array",
          maxItems: 80,
          items: activeSurfaceBlockSchema,
        },
        bindings: {
          type: "array",
          maxItems: 80,
          items: {
            type: "object",
            required: ["widgetId", "field", "propPath", "mode"],
            additionalProperties: false,
            properties: {
              widgetId: { type: "string", minLength: 1, maxLength: 120 },
              field: { type: "string", minLength: 1, maxLength: 120 },
              propPath: { type: "string", minLength: 1, maxLength: 160 },
              mode: { type: "string", enum: ["read", "write", "readwrite"] },
            },
          },
        },
        writableBindingFields: {
          type: "array",
          maxItems: 80,
          items: { type: "string", minLength: 1, maxLength: 120 },
          uniqueItems: true,
        },
        warnings: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1, maxLength: 160 },
          uniqueItems: true,
        },
      },
    },
    { type: "null" },
  ],
} as const;

const planningStateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "candidates", "createdAt", "expiresAt"],
  properties: {
    schemaVersion: { const: 1 },
    sourcePlanId: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    route: { type: ["string", "null"], minLength: 1, maxLength: 240 },
    resourceKind: { type: ["string", "null"], minLength: 1, maxLength: 80 },
    operation: { type: ["string", "null"], minLength: 1, maxLength: 80 },
    query: { type: ["string", "null"], minLength: 1, maxLength: 240 },
    candidates: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "id", "label"],
        properties: {
          kind: { type: "string", minLength: 1, maxLength: 80 },
          id: { type: "string", minLength: 1, maxLength: 160 },
          label: { type: "string", minLength: 1, maxLength: 200 },
          slug: { type: ["string", "null"], minLength: 1, maxLength: 240 },
          status: { type: ["string", "null"], minLength: 1, maxLength: 80 },
        },
      },
    },
    createdAt: { type: "string", minLength: 10, maxLength: 80 },
    expiresAt: { type: "string", minLength: 10, maxLength: 80 },
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
        activeSurface: activeSurfaceSchema,
        planningState: {
          anyOf: [planningStateSchema, { type: "null" }],
        },
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

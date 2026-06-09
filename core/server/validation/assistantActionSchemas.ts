import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  assistantSiteBuilderAdvancedHeroVariantIds,
  assistantSiteBuilderAdvancedMenuBehaviorIds,
  assistantSiteBuilderAdvancedSectionVariantIds,
  assistantSiteBuilderContentEngineIds,
  assistantSiteBuilderDesignPresetIds,
  assistantSiteBuilderHeroPresetIds,
  assistantSiteBuilderIntakeModes,
  assistantSiteBuilderIntakeStepIds,
  assistantSiteBuilderMediaPolicyIds,
  assistantSiteBuilderMenuPresetIds,
  assistantSiteBuilderPageRoleIds,
  assistantSiteBuilderReviewStateIds,
  assistantSiteBuilderSectionRoleIds,
} from "../../services/assistant/assistantSiteBuilderIntakeTypes";
import { ASSISTANT_TRANSPORT_MAX_CHARS } from "../../services/assistant/promptLimits";

const intakeTextSchema = (maxLength: number) =>
  ({
    type: "string",
    maxLength,
  }) as const;

const intakeTextListSchema = (maxItems: number, maxLength: number) =>
  ({
    type: "array",
    maxItems,
    items: intakeTextSchema(maxLength),
    uniqueItems: true,
  }) as const;

const intakeEnumSchema = <TValue extends string>(values: readonly TValue[]) =>
  ({
    type: "string",
    enum: [...values],
  }) as const;

const nullableIntakeEnumSchema = <TValue extends string>(values: readonly TValue[]) =>
  ({
    anyOf: [intakeEnumSchema(values), { type: "null" }],
  }) as const;

const intakeEnumListSchema = <TValue extends string>(values: readonly TValue[], maxItems: number) =>
  ({
    type: "array",
    maxItems,
    items: intakeEnumSchema(values),
    uniqueItems: true,
  }) as const;

const intakePageRoleLabelMapSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    assistantSiteBuilderPageRoleIds.map((roleId) => [roleId, intakeTextSchema(80)])
  ),
} as const;

const siteBuilderIntakeAnswerSchemas = [
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "business-profile" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          siteName: intakeTextSchema(120),
          entityName: intakeTextSchema(120),
          topic: intakeTextSchema(160),
          vertical: intakeTextSchema(120),
          audience: intakeTextSchema(240),
          locale: intakeTextSchema(16),
          region: intakeTextSchema(80),
          summary: intakeTextSchema(500),
          offerSummary: intakeTextSchema(500),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "site-goals" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          goals: intakeTextListSchema(8, 120),
          primaryGoal: intakeTextSchema(160),
          notes: intakeTextSchema(360),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "site-map" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          pageRoles: intakeEnumListSchema(assistantSiteBuilderPageRoleIds, 14),
          customLabels: intakePageRoleLabelMapSchema,
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "menu" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          menuPreset: intakeEnumSchema(assistantSiteBuilderMenuPresetIds),
          primaryActionLabel: intakeTextSchema(80),
          primaryActionPageRole: nullableIntakeEnumSchema(assistantSiteBuilderPageRoleIds),
          advancedMenuBehaviorIds: intakeEnumListSchema(
            assistantSiteBuilderAdvancedMenuBehaviorIds,
            6
          ),
          advancedCtaTargetPageRole: nullableIntakeEnumSchema(assistantSiteBuilderPageRoleIds),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "hero" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          heroPreset: intakeEnumSchema(assistantSiteBuilderHeroPresetIds),
          headline: intakeTextSchema(160),
          subheadline: intakeTextSchema(280),
          primaryCallToAction: intakeTextSchema(80),
          advancedHeroVariantId: nullableIntakeEnumSchema(
            assistantSiteBuilderAdvancedHeroVariantIds
          ),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "homepage-sections" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          sectionRoles: intakeEnumListSchema(assistantSiteBuilderSectionRoleIds, 12),
          advancedSectionVariantIds: intakeEnumListSchema(
            assistantSiteBuilderAdvancedSectionVariantIds,
            14
          ),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "subpages" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          pageRoles: intakeEnumListSchema(assistantSiteBuilderPageRoleIds, 14),
          customLabels: intakePageRoleLabelMapSchema,
          notes: intakeTextSchema(360),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "media-policy" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          mediaPolicy: intakeEnumSchema(assistantSiteBuilderMediaPolicyIds),
          notes: intakeTextSchema(360),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "content-engine" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          contentEngines: intakeEnumListSchema(assistantSiteBuilderContentEngineIds, 10),
          notes: intakeTextSchema(360),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "design-preset" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          designPresetId: nullableIntakeEnumSchema(assistantSiteBuilderDesignPresetIds),
          designBrief: intakeTextSchema(700),
          tone: intakeTextSchema(160),
          colorNotes: intakeTextSchema(240),
          layoutNotes: intakeTextSchema(360),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "reference-intake" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          referenceNotes: intakeTextSchema(700),
          referenceLabels: intakeTextListSchema(8, 120),
          referenceIds: intakeTextListSchema(8, 80),
          mediaAssetIds: intakeTextListSchema(12, 80),
          temporaryReferenceIds: intakeTextListSchema(8, 80),
          textBrief: intakeTextSchema(700),
        },
      },
    },
  },
  {
    type: "object",
    required: ["stepId", "values"],
    additionalProperties: false,
    properties: {
      stepId: { const: "review" },
      updatedAt: intakeTextSchema(64),
      values: {
        type: "object",
        additionalProperties: false,
        properties: {
          reviewState: nullableIntakeEnumSchema(assistantSiteBuilderReviewStateIds),
          confirmed: { type: "boolean" },
          confirmedReviewHash: intakeTextSchema(64),
          notes: intakeTextSchema(360),
        },
      },
    },
  },
] as const;

const siteBuilderIntakeSessionSchema = {
  type: "object",
  required: ["version", "mode", "currentStepId", "answers"],
  additionalProperties: false,
  properties: {
    version: { const: ASSISTANT_SITE_BUILDER_INTAKE_VERSION },
    mode: intakeEnumSchema(assistantSiteBuilderIntakeModes),
    currentStepId: {
      type: "string",
      enum: [...assistantSiteBuilderIntakeStepIds],
    },
    answers: {
      type: "array",
      maxItems: siteBuilderIntakeAnswerSchemas.length,
      items: {
        anyOf: siteBuilderIntakeAnswerSchemas,
      },
    },
  },
} as const;

const siteBuilderIntakeStateSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        requestedMode: {
          anyOf: [intakeEnumSchema(assistantSiteBuilderIntakeModes), { type: "null" }],
        },
        activeSession: {
          anyOf: [siteBuilderIntakeSessionSchema, { type: "null" }],
        },
      },
    },
    { type: "null" },
  ],
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
  required: ["id", "type", "label", "path", "childCount", "slotKeys", "templateId", "templateName"],
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

const activeSurfacePageSectionSchema = {
  type: "object",
  required: ["id", "type", "name", "path", "blockCount", "blocks"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    type: { type: "string", minLength: 1, maxLength: 120 },
    name: { type: "string", minLength: 1, maxLength: 160 },
    path: { type: "string", minLength: 1, maxLength: 240 },
    blockCount: { type: "integer", minimum: 0, maximum: 999 },
    blocks: {
      type: "array",
      maxItems: 40,
      items: activeSurfaceBlockSchema,
    },
  },
} as const;

const activeSurfaceSchema = {
  anyOf: [
    {
      type: "object",
      required: ["kind", "page", "selectedSectionId", "selectedBlockId", "sections", "warnings"],
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
        selectedSectionId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 120 }, { type: "null" }],
        },
        selectedBlockId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 120 }, { type: "null" }],
        },
        sections: {
          type: "array",
          maxItems: 40,
          items: activeSurfacePageSectionSchema,
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
    {
      type: "object",
      required: ["kind", "detailPage", "sampleEntryId", "selectedBlockId", "blocks", "warnings"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["detail-page"] },
        detailPage: {
          type: "object",
          required: ["id", "name", "status", "contentTypeId", "contentTypeSlug", "titlePattern"],
          additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1, maxLength: 160 },
            name: { type: "string", minLength: 1, maxLength: 240 },
            status: { type: "string", minLength: 1, maxLength: 80 },
            contentTypeId: { type: "string", minLength: 1, maxLength: 160 },
            contentTypeSlug: { type: "string", minLength: 1, maxLength: 240 },
            titlePattern: { type: "string", minLength: 1, maxLength: 240 },
          },
        },
        sampleEntryId: {
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

const collectionWorkspaceHintSchema = {
  anyOf: [
    {
      type: "object",
      required: ["contentTypeId"],
      additionalProperties: false,
      properties: {
        contentTypeId: { type: "string", minLength: 1, maxLength: 160 },
        activeDetailPageId: {
          anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
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
      maxLength: ASSISTANT_TRANSPORT_MAX_CHARS,
    },
    context: {
      type: "object",
      additionalProperties: false,
      properties: {
        page: { type: "string", minLength: 1, maxLength: 200 },
        locale: { type: "string", minLength: 2, maxLength: 16 },
        siteBuilderIntakeState: siteBuilderIntakeStateSchema,
        includeResourceCatalog: { type: "boolean" },
        runtimeSnapshot: runtimeSnapshotSchema,
        activeSurface: activeSurfaceSchema,
        collectionWorkspaceHint: collectionWorkspaceHintSchema,
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

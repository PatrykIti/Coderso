import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../pages/pageDocumentV2";
import {
  SCREEN_BLOCK_COLLECTION_MAX,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  SCREEN_DOCUMENT_SECTIONS_MAX,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  SCREEN_TAB_ID,
  SCREEN_TAB_LABEL_MAX,
  compatibilityScreenBlockTypes,
  customScreenBindingModes,
  customScreenCollectionRoleValues,
  customScreenCreateModes,
  customScreenListColumnSources,
  customScreenListFilterOperators,
  customScreenListFormatters,
  customScreenRowClickModes,
  customScreenSortDirections,
  customScreenStatusValues,
  screenBlockAligns,
  screenBlockWidths,
  screenSectionColumnPresets,
} from "./customScreenContracts";
import type { FixedScreenBlockType } from "./customScreenContracts";
import {
  SCREEN_BINDING_ID_MAX,
  SCREEN_BINDING_ID_PATTERN_SOURCE,
  SCREEN_PATH_BODY_PATTERN_SOURCE,
  SCREEN_PATH_MAX,
  SCREEN_PATH_PATTERN_SOURCE,
  SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE,
} from "./customScreenNormalizationPrimitives";

export const customScreenBindingSchema = {
  type: "object",
  required: ["widgetId", "propPath", "field"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    widgetId: { type: "string", minLength: 1, maxLength: 160 },
    propPath: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    field: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    mode: { enum: customScreenBindingModes },
  },
  additionalProperties: false,
} as const;

export const _customScreenLegacyDefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "blocks", "bindings"],
  properties: {
    schemaVersion: { enum: [1] },
    blocks: {
      type: "array",
      maxItems: 500,
      items: { type: "object" },
    },
    bindings: {
      type: "array",
      maxItems: 200,
      items: customScreenBindingSchema,
    },
  },
  additionalProperties: false,
} as const;

export const customScreenListColumnSchema = {
  type: "object",
  required: ["source", "field", "label"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    source: { enum: customScreenListColumnSources },
    field: { type: "string", minLength: 1, maxLength: 160 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    formatter: { enum: customScreenListFormatters },
    visible: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const customScreenListFilterSchema = {
  type: "object",
  required: ["source", "field", "label"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    source: { enum: customScreenListColumnSources },
    field: { type: "string", minLength: 1, maxLength: 160 },
    label: { type: "string", minLength: 1, maxLength: 160 },
    operator: { enum: customScreenListFilterOperators },
    enabled: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const _customScreenV2DefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { enum: [2] },
    listView: {
      type: "object",
      required: ["columns", "filters", "defaultSort", "rowClick", "createMode", "bulkActions"],
      properties: {
        columns: {
          type: "array",
          maxItems: 50,
          items: customScreenListColumnSchema,
        },
        filters: {
          type: "array",
          maxItems: 30,
          items: customScreenListFilterSchema,
        },
        defaultSort: {
          type: "object",
          required: ["field", "direction"],
          properties: {
            field: { type: "string", minLength: 1, maxLength: 160 },
            direction: { enum: customScreenSortDirections },
          },
          additionalProperties: false,
        },
        rowClick: { enum: customScreenRowClickModes },
        createMode: { enum: customScreenCreateModes },
        bulkActions: {
          type: "object",
          required: ["delete", "publish", "unpublish"],
          properties: {
            delete: { type: "boolean" },
            publish: { type: "boolean" },
            unpublish: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    editorView: {
      type: "object",
      required: ["blocks", "bindings", "saveMode"],
      properties: {
        blocks: {
          type: "array",
          maxItems: 500,
          items: { type: "object" },
        },
        bindings: {
          type: "array",
          maxItems: 200,
          items: customScreenBindingSchema,
        },
        saveMode: { enum: ["entry"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const customScreenV3DefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { enum: [3] },
    listView: {
      type: "object",
      required: ["columns", "filters", "defaultSort", "bulkActions"],
      properties: {
        columns: {
          type: "array",
          maxItems: 50,
          items: customScreenListColumnSchema,
        },
        filters: {
          type: "array",
          maxItems: 30,
          items: customScreenListFilterSchema,
        },
        defaultSort: {
          type: "object",
          required: ["field", "direction"],
          properties: {
            field: { type: "string", minLength: 1, maxLength: 160 },
            direction: { enum: customScreenSortDirections },
          },
          additionalProperties: false,
        },
        bulkActions: {
          type: "object",
          required: ["delete", "publish", "unpublish"],
          properties: {
            delete: { type: "boolean" },
            publish: { type: "boolean" },
            unpublish: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    editorView: {
      type: "object",
      required: ["blocks", "bindings", "saveMode", "interactionMode"],
      properties: {
        blocks: {
          type: "array",
          maxItems: 500,
          items: { type: "object" },
        },
        bindings: {
          type: "array",
          maxItems: 200,
          items: customScreenBindingSchema,
        },
        saveMode: { enum: ["entry"] },
        interactionMode: { enum: ["inline"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const nonEmptyScreenPathSchema = {
  type: "string",
  minLength: 1,
  maxLength: SCREEN_PATH_MAX,
  pattern: SCREEN_PATH_PATTERN_SOURCE,
  not: { pattern: SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE },
} as const;

export const emptyOrScreenPathSchema = {
  type: "string",
  maxLength: SCREEN_PATH_MAX,
  pattern: `^(?:${SCREEN_PATH_BODY_PATTERN_SOURCE})?$`,
  not: { pattern: SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE },
} as const;

export const screenFieldBindingSchema = {
  type: "object",
  required: ["blockId", "propPath", "source", "field"],
  properties: {
    id: {
      type: "string",
      minLength: 1,
      maxLength: SCREEN_BINDING_ID_MAX,
      pattern: SCREEN_BINDING_ID_PATTERN_SOURCE,
    },
    blockId: nonEmptyScreenPathSchema,
    propPath: nonEmptyScreenPathSchema,
    source: { enum: ["entry"] },
    field: nonEmptyScreenPathSchema,
    mode: { enum: customScreenBindingModes },
  },
  additionalProperties: false,
} as const;

// TASK-503-01: Ajv mirror of ScreenBlockStyleV1 — references the SAME exported
// constants as the normalizer (zero drift). The route layer REJECTS out-of-range /
// float / unknown-key style payloads (additionalProperties: false); stored documents
// read through the coercing normalizer. Both reference identical constants.
export const screenBlockBoxSpacingSchema = {
  type: "object",
  properties: {
    top: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
    right: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
    bottom: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
    left: {
      type: "integer",
      minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max,
    },
  },
  additionalProperties: false,
} as const;

export const screenBlockStyleV1Schema = {
  type: "object",
  properties: {
    width: { enum: screenBlockWidths },
    minHeight: {
      type: "integer",
      minimum: SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
      maximum: SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max,
    },
    margin: screenBlockBoxSpacingSchema,
    padding: screenBlockBoxSpacingSchema,
    align: { enum: screenBlockAligns },
  },
  additionalProperties: false,
} as const;

export const clearableScreenDataLabelSchema = { type: "string" } as const;

export const fixedScreenBlockDataSchemas = {
  heading: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      text: { type: "string" },
      level: { type: "integer", minimum: 1, maximum: 3 },
      align: { enum: ["left", "center", "right"] },
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
  text: {
    type: "object",
    properties: {
      content: { type: "string" },
      tone: { enum: ["default", "muted"] },
      label: clearableScreenDataLabelSchema,
    },
    additionalProperties: false,
  },
  stat: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      format: { enum: ["number", "percent", "money"] },
      trend: { enum: ["auto", "up", "down", "flat"] },
      deltaField: emptyOrScreenPathSchema,
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
  divider: {
    type: "object",
    properties: {
      variant: { enum: ["line", "space", "label"] },
      label: clearableScreenDataLabelSchema,
    },
    additionalProperties: false,
  },
  image: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      fit: { enum: ["cover", "contain"] },
      ratio: { type: "string" },
      field: nonEmptyScreenPathSchema,
      src: { type: "string" },
    },
    additionalProperties: false,
  },
  "related-list": {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      target: emptyOrScreenPathSchema,
      displayField: emptyOrScreenPathSchema,
      variant: { enum: ["checklist", "activity", "cards"] },
      limit: { type: "integer", minimum: 1, maximum: 50 },
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
  tabs: {
    type: "object",
    required: ["tabs"],
    properties: {
      label: clearableScreenDataLabelSchema,
      tabs: {
        type: "array",
        minItems: SCREEN_TABS_MIN,
        maxItems: SCREEN_TABS_MAX,
        items: {
          type: "object",
          required: ["id", "label"],
          properties: {
            id: { type: "string", pattern: SCREEN_TAB_ID.source },
            label: {
              type: "string",
              minLength: 1,
              maxLength: SCREEN_TAB_LABEL_MAX,
              pattern: "\\S",
            },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  button: {
    type: "object",
    properties: {
      label: clearableScreenDataLabelSchema,
      action: { enum: ["link"] },
      variant: { enum: ["primary", "secondary", "ghost"] },
      href: { type: "string" },
      field: nonEmptyScreenPathSchema,
    },
    additionalProperties: false,
  },
} as const satisfies Record<FixedScreenBlockType, object>;

// TASK-505-01: Ajv mirror of ScreenSectionStyleV1 — references the SAME exported constants
// as normalizeScreenSectionStyle (zero drift). Rejects out-of-range gap / unknown key at the
// route edge (additionalProperties:false); stored docs read through the coercing normalizer.
export const screenSectionStyleV1Schema = {
  type: "object",
  properties: {
    columns: { enum: screenSectionColumnPresets },
    columnGap: {
      type: "integer",
      minimum: SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
      maximum: SCREEN_SECTION_COLUMN_GAP_CLAMP.max,
    },
  },
  additionalProperties: false,
} as const;

export const localScreenBlockRef = { $ref: "#/$defs/customScreenV4ScreenBlock" } as const;

export const localScreenDocumentRef = { $ref: "#/$defs/customScreenV4ScreenDocument" } as const;

export const localScreenDefinitionRef = { $ref: "#/$defs/customScreenV4Definition" } as const;

export const screenBlockBranch = (type: string, dataSchema: object) => ({
  type: "object",
  required: ["id", "type", "data"],
  properties: {
    id: nonEmptyScreenPathSchema,
    type: { const: type },
    label: { type: "string", minLength: 1, maxLength: 160 },
    variant: { type: "string", minLength: 1, maxLength: 80 },
    style: screenBlockStyleV1Schema,
    data: dataSchema,
    layout: { type: "object" },
    visibility: { type: "object" },
    editor: { type: "object" },
    legacyWidgetType: { type: "string", minLength: 1, maxLength: 160 },
    children: {
      type: "array",
      maxItems: SCREEN_BLOCK_COLLECTION_MAX,
      items: localScreenBlockRef,
    },
    slots: {
      type: "object",
      additionalProperties: {
        type: "array",
        maxItems: SCREEN_BLOCK_COLLECTION_MAX,
        items: localScreenBlockRef,
      },
    },
  },
  additionalProperties: false,
});

export const screenSectionSchemaUsing = (blockRef: object) => ({
  type: "object",
  required: ["id", "type", "data", "blocks"],
  properties: {
    id: nonEmptyScreenPathSchema,
    type: { const: "section" },
    label: { type: "string", minLength: 1, maxLength: 160 },
    data: { type: "object" },
    layout: { type: "object" },
    visibility: { type: "object" },
    style: screenSectionStyleV1Schema,
    blocks: {
      type: "array",
      maxItems: SCREEN_BLOCK_COLLECTION_MAX,
      items: blockRef,
    },
  },
  additionalProperties: false,
});

export const customScreenV4ListViewSchemaUsing = (documentRef: object) => ({
  ...customScreenV3DefinitionSchema.properties.listView,
  properties: {
    ...customScreenV3DefinitionSchema.properties.listView.properties,
    rowTemplate: {
      type: "object",
      required: ["document", "bindings"],
      properties: {
        document: documentRef,
        bindings: {
          type: "array",
          maxItems: 200,
          items: screenFieldBindingSchema,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
});

export const customScreenV4DefinitionSchemaUsing = (documentRef: object) => ({
  type: "object",
  required: ["schemaVersion", "listView", "editorView"],
  properties: {
    schemaVersion: { const: 4 },
    listView: customScreenV4ListViewSchemaUsing(documentRef),
    editorView: {
      type: "object",
      required: ["document", "bindings", "saveMode", "interactionMode"],
      properties: {
        document: documentRef,
        bindings: {
          type: "array",
          maxItems: 200,
          items: screenFieldBindingSchema,
        },
        saveMode: { const: "entry" },
        interactionMode: { const: "inline" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
});

export const buildCustomScreenV4Defs = () => ({
  customScreenV4ScreenBlock: {
    oneOf: [
      ...Object.entries(fixedScreenBlockDataSchemas).map(([type, dataSchema]) =>
        screenBlockBranch(type, dataSchema)
      ),
      ...compatibilityScreenBlockTypes.map((type) => screenBlockBranch(type, { type: "object" })),
    ],
  },
  customScreenV4ScreenDocument: {
    type: "object",
    required: ["schemaVersion", "sections"],
    properties: {
      schemaVersion: { const: 1 },
      sections: {
        type: "array",
        maxItems: SCREEN_DOCUMENT_SECTIONS_MAX,
        items: screenSectionSchemaUsing(localScreenBlockRef),
      },
    },
    additionalProperties: false,
  },
  customScreenV4Definition: customScreenV4DefinitionSchemaUsing(localScreenDocumentRef),
});

export const buildStandaloneCustomScreenDefinitionSchema = () => {
  const $defs = buildCustomScreenV4Defs();
  return { ...$defs.customScreenV4Definition, $defs };
};

export const buildCustomScreenMutationProperties = () => ({
  name: { type: "string", minLength: 1, maxLength: 160 },
  contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
  status: { enum: customScreenStatusValues },
  collectionRole: {
    anyOf: [{ enum: customScreenCollectionRoleValues }, { type: "null" }],
  },
  compositionKey: {
    anyOf: [
      { type: "string", minLength: 1, maxLength: 160, pattern: "^[a-zA-Z0-9_.-]+$" },
      { type: "null" },
    ],
  },
  showInSidebar: { type: "boolean" },
  sidebarLabel: {
    anyOf: [{ type: "string", minLength: 1, maxLength: 160 }, { type: "null" }],
  },
  schemaVersion: { const: 4 },
  definition: localScreenDefinitionRef,
});

export const buildCustomScreenMutationSchema = (kind: "create" | "update") => ({
  type: "object",
  $defs: buildCustomScreenV4Defs(),
  ...(kind === "create" ? { required: ["name", "contentTypeId"] } : { minProperties: 1 }),
  properties: buildCustomScreenMutationProperties(),
  additionalProperties: false,
});

export const customScreenDefinitionSchema = buildStandaloneCustomScreenDefinitionSchema();

export const customScreenCreateSchema = buildCustomScreenMutationSchema("create");

export const customScreenUpdateSchema = buildCustomScreenMutationSchema("update");

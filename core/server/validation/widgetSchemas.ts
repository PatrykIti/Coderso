const containerTokens = ["default", "narrow", "full"] as const;
const spacingTokens = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
const pageMaxWidthTokens = ["4xl", "5xl", "6xl", "7xl"] as const;

const containerTokenSchema = {
  type: "string",
  enum: [...containerTokens],
};

const spacingTokenSchema = {
  type: "string",
  enum: [...spacingTokens],
};

const blockLayoutSchema = {
  type: "object",
  required: ["container", "padding", "margin", "background"],
  additionalProperties: false,
  properties: {
    container: { type: "string" },
    padding: {
      type: "object",
      required: ["top", "bottom"],
      additionalProperties: false,
      properties: {
        top: { type: "string" },
        bottom: { type: "string" },
      },
    },
    margin: {
      type: "object",
      required: ["top", "bottom"],
      additionalProperties: false,
      properties: {
        top: { type: "string" },
        bottom: { type: "string" },
      },
    },
    background: {
      type: "object",
      required: ["color"],
      additionalProperties: false,
      properties: {
        color: { type: "string" },
        image: { type: ["string", "null"] },
      },
    },
  },
};

const templateLayoutDefaultsSchema = {
  type: "object",
  required: ["container", "padding", "margin"],
  additionalProperties: false,
  properties: {
    container: containerTokenSchema,
    padding: {
      type: "object",
      required: ["top", "bottom"],
      additionalProperties: false,
      properties: {
        top: spacingTokenSchema,
        bottom: spacingTokenSchema,
      },
    },
    margin: {
      type: "object",
      required: ["top", "bottom"],
      additionalProperties: false,
      properties: {
        top: spacingTokenSchema,
        bottom: spacingTokenSchema,
      },
    },
  },
};

const templateLayoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    wrapper: {
      type: "object",
      additionalProperties: false,
      properties: {
        container: containerTokenSchema,
        maxWidth: { type: "string", enum: [...pageMaxWidthTokens] },
        padding: {
          type: "object",
          additionalProperties: false,
          properties: {
            top: spacingTokenSchema,
            bottom: spacingTokenSchema,
          },
        },
        background: {
          type: "object",
          additionalProperties: false,
          properties: {
            color: { type: "string" },
            image: { type: ["string", "null"] },
          },
        },
      },
    },
    sections: {
      type: "object",
      additionalProperties: false,
      properties: {
        gap: spacingTokenSchema,
        defaults: templateLayoutDefaultsSchema,
      },
    },
    typographyPreset: { type: "string" },
    applyDefaultsToNewBlocks: { type: "boolean" },
  },
};

const templateSettingsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    layout: templateLayoutSchema,
  },
};

const blockVisibilitySchema = {
  type: "object",
  required: ["devices", "enabled"],
  additionalProperties: false,
  properties: {
    devices: { type: "array", items: { type: "string" } },
    enabled: { type: "boolean" },
  },
};

const blockEditorSchema = {
  type: "object",
  required: ["mode", "wizardCompleted"],
  additionalProperties: false,
  properties: {
    mode: { type: "string" },
    wizardCompleted: { type: "boolean" },
  },
};

const blockSchema = {
  $id: "widgetTemplateBlock",
  type: "object",
  required: ["id", "type", "data", "layout", "visibility", "editor"],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    variant: { type: "string" },
    data: { type: "object" },
    layout: blockLayoutSchema,
    visibility: blockVisibilitySchema,
    editor: blockEditorSchema,
    slots: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { $ref: "widgetTemplateBlock" },
      },
    },
    children: {
      type: "array",
      items: { $ref: "widgetTemplateBlock" },
    },
  },
};

const templateSchema = {
  type: "object",
  required: ["name", "category", "blocks"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    category: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["draft", "published"] },
    blocks: { type: "array", items: blockSchema },
    settings: templateSettingsSchema,
  },
};

export const widgetTemplateCreateSchema = templateSchema;

export const widgetTemplateUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    category: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["draft", "published"] },
    blocks: { type: "array", items: blockSchema },
    settings: templateSettingsSchema,
  },
};

export const widgetTemplateCategoryCreateSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
  },
};

export const widgetTemplateCategoryUpdateSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
  },
};

export const widgetTemplatePreviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
    device: { type: "string", enum: ["desktop", "tablet", "mobile"] },
    viewport: {
      type: "object",
      required: ["width", "height"],
      additionalProperties: false,
      properties: {
        width: { type: "number", minimum: 1 },
        height: { type: "number", minimum: 1 },
      },
    },
  },
};

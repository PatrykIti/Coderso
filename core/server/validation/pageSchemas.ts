const containerTokens = ["default", "narrow", "full"] as const;
const spacingTokens = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
const pageMaxWidthTokens = ["4xl", "5xl", "6xl", "7xl"] as const;

const containerTokenSchema = {
  type: "string",
  enum: [...containerTokens],
};

const inheritableContainerTokenSchema = {
  type: "string",
  enum: [...containerTokens, "inherit"],
};

const spacingTokenSchema = {
  type: "string",
  enum: [...spacingTokens],
};

const inheritableSpacingTokenSchema = {
  type: "string",
  enum: [...spacingTokens, "inherit"],
};

const blockLayoutSchema = {
  type: "object",
  required: ["container", "padding", "margin", "background"],
  additionalProperties: false,
  properties: {
    container: inheritableContainerTokenSchema,
    padding: {
      type: "object",
      required: ["top", "bottom"],
      additionalProperties: false,
      properties: {
        top: inheritableSpacingTokenSchema,
        bottom: inheritableSpacingTokenSchema,
      },
    },
    margin: {
      type: "object",
      required: ["top", "bottom"],
      additionalProperties: false,
      properties: {
        top: inheritableSpacingTokenSchema,
        bottom: inheritableSpacingTokenSchema,
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
  $id: "pageBlock",
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
        items: { $ref: "pageBlock" },
      },
    },
    children: {
      type: "array",
      items: { $ref: "pageBlock" },
    },
  },
};

const pageLayoutDefaultsSchema = {
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

const pageLayoutSchema = {
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
        defaults: pageLayoutDefaultsSchema,
      },
    },
    typographyPreset: { type: "string" },
    applyDefaultsToNewBlocks: { type: "boolean" },
  },
};

const pageDataSchema = {
  type: "object",
  required: ["blocks"],
  additionalProperties: false,
  properties: {
    blocks: { type: "array", items: blockSchema },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        image: { type: ["string", "null"] },
      },
    },
    settings: {
      type: "object",
      additionalProperties: false,
      properties: {
        template: { type: "string" },
        showInNav: { type: "boolean" },
        layout: pageLayoutSchema,
      },
    },
  },
};

export const pageCreateSchema = {
  type: "object",
  required: ["title", "slug", "data"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    template: { type: "string" },
    data: pageDataSchema,
  },
};

export const pageUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    data: pageDataSchema,
  },
};

export const pagePreviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
  },
};

export const pagePublishSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    data: pageDataSchema,
  },
};

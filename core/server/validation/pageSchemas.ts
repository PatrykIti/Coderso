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

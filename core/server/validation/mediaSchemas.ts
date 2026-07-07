export const mediaUploadSchema = {
  type: "object",
  required: ["file"],
  properties: {
    file: { type: "object" },
    alt: { type: "string" },
    title: { type: "string" },
    caption: { type: "string" },
  },
  additionalProperties: false,
};

export const mediaUpdateSchema = {
  type: "object",
  properties: {
    alt: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    caption: { type: ["string", "null"] },
    folderId: { type: ["string", "null"] },
    tags: { type: "array", items: { type: "string" } },
    focalX: { type: ["number", "null"] },
    focalY: { type: ["number", "null"] },
    description: { type: ["string", "null"] },
    credit: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const mediaFolderCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    parentId: { type: ["string", "null"] },
    orderIndex: { type: "number" },
  },
  additionalProperties: false,
};

export const mediaFolderUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    parentId: { type: ["string", "null"] },
    orderIndex: { type: "number" },
  },
  additionalProperties: false,
};

export const mediaFolderReorderSchema = {
  type: "object",
  required: ["orders"],
  properties: {
    orders: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "orderIndex"],
        properties: {
          id: { type: "string" },
          orderIndex: { type: "number" },
          parentId: { type: ["string", "null"] },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const mediaReplaceSchema = {
  type: "object",
  required: ["file"],
  properties: {
    file: { type: "object" },
  },
  additionalProperties: false,
};

export const mediaRecoverDimensionsSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const mediaUsageQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "string", pattern: "^[0-9]+$" },
  },
  additionalProperties: false,
};

export const postCreateSchema = {
  type: "object",
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    slug: { type: "string", minLength: 1, maxLength: 200 },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const postUpdateSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    slug: { type: "string", minLength: 1, maxLength: 200 },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const postMetadataSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["draft", "published", "scheduled", "archived"],
    },
    scheduledAt: { type: ["string", "null"], format: "date-time" },
    tags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 24 },
    },
    taxonomy: {
      type: "object",
      properties: {
        categoryId: { type: ["string", "null"] },
        tagIds: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1 },
        },
      },
      additionalProperties: false,
    },
    seo: {
      type: "object",
      properties: {
        title: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        canonicalUrl: { type: ["string", "null"] },
        robots: { type: ["string", "null"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const postPreviewSchema = {
  type: "object",
  properties: {
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
  },
  additionalProperties: false,
};

export const postAutosaveSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    slug: { type: "string", minLength: 1, maxLength: 200 },
    data: { type: "object" },
    tags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 24 },
    },
    taxonomy: {
      type: "object",
      properties: {
        categoryId: { type: ["string", "null"] },
        tagIds: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1 },
        },
      },
      additionalProperties: false,
    },
    seo: {
      type: "object",
      properties: {
        title: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        canonicalUrl: { type: ["string", "null"] },
        robots: { type: ["string", "null"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const postBackfillSchema = {
  type: "object",
  properties: {
    dryRun: { type: "boolean" },
    shadowRead: { type: "boolean" },
    entryIds: {
      type: "array",
      maxItems: 500,
      items: { type: "string", minLength: 1 },
    },
  },
  additionalProperties: false,
};

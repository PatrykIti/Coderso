export const contentTypeCreateSchema = {
  type: "object",
  required: ["name", "slug", "schema"],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    schema: { type: "object" },
  },
  additionalProperties: false,
};

export const contentTypeUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    schema: { type: "object" },
  },
  additionalProperties: false,
};

export const contentEntryCreateSchema = {
  type: "object",
  required: ["title", "slug", "data"],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const contentEntryUpdateSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    data: { type: "object" },
  },
  additionalProperties: false,
};

export const contentEntryPreviewSchema = {
  type: "object",
  properties: {
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
  },
  additionalProperties: false,
};

export const contentEntryMetadataSchema = {
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
        title: { type: "string" },
        description: { type: "string" },
        canonicalUrl: { type: "string" },
        robots: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

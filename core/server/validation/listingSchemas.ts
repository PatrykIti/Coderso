export const listingSources = ["entries", "posts", "users", "taxonomies"] as const;

export const listingFilterOperators = [
  "eq",
  "neq",
  "in",
  "nin",
  "contains",
  "startsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "exists",
] as const;

export const listingLayouts = ["grid", "list", "table", "calendar", "map"] as const;

const listingFilterValueSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
    {
      type: "array",
      maxItems: 100,
      items: {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          { type: "null" },
        ],
      },
    },
  ],
} as const;

export const listingFilterSchema = {
  type: "object",
  required: ["field", "op"],
  properties: {
    field: {
      type: "string",
      minLength: 1,
      maxLength: 128,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    op: {
      enum: listingFilterOperators,
    },
    value: listingFilterValueSchema,
  },
  additionalProperties: false,
} as const;

export const listingSortSchema = {
  type: "object",
  required: ["field", "dir"],
  properties: {
    field: {
      type: "string",
      minLength: 1,
      maxLength: 128,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    dir: {
      enum: ["asc", "desc"],
    },
  },
  additionalProperties: false,
} as const;

export const listingPaginationSchema = {
  type: "object",
  required: ["limit", "offset"],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100 },
    offset: { type: "integer", minimum: 0, maximum: 5000 },
  },
  additionalProperties: false,
} as const;

export const listingQuerySchema = {
  type: "object",
  required: ["source", "sourceConfig", "filters", "sort", "pagination", "fields"],
  properties: {
    source: {
      enum: listingSources,
    },
    sourceConfig: {
      type: "object",
      properties: {
        contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
        taxonomyId: { type: "string", minLength: 1, maxLength: 64 },
        includeDrafts: { type: "boolean" },
      },
      additionalProperties: false,
    },
    filters: {
      type: "array",
      maxItems: 20,
      items: listingFilterSchema,
    },
    sort: {
      type: "array",
      maxItems: 3,
      items: listingSortSchema,
    },
    pagination: listingPaginationSchema,
    fields: {
      type: "array",
      maxItems: 40,
      uniqueItems: true,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 128,
        pattern: "^[a-zA-Z0-9_.-]+$",
      },
    },
  },
  additionalProperties: false,
} as const;

export const listingQueryCreateSchema = {
  type: "object",
  required: ["name", "query"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 600 },
    query: listingQuerySchema,
  },
  additionalProperties: false,
} as const;

export const listingQueryUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 600 },
    query: listingQuerySchema,
  },
  additionalProperties: false,
} as const;

export const listingQueryPreviewSchema = listingQuerySchema;

export const listingTemplateCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 600 },
    layout: { enum: listingLayouts },
    config: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const listingTemplateUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 600 },
    layout: { enum: listingLayouts },
    config: { type: "object" },
  },
  additionalProperties: false,
} as const;

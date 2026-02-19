import {
  commerceFilterOperators,
  commerceProductStatuses,
  commerceSortFields,
  commerceStockStates,
} from "../../services/commerce/commerceTypes";

const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const slugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const currencyPattern = "^[A-Z]{3}$";
const metadataFieldPattern = "^[a-zA-Z0-9_.-]+$";

const primitiveValueSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
  ],
} as const;

export const commerceMoneySchema = {
  type: "object",
  required: ["amount", "currency"],
  properties: {
    amount: { type: "integer", minimum: 0, maximum: 1000000000 },
    currency: { type: "string", pattern: currencyPattern },
    compareAtAmount: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: 1000000000,
    },
  },
  additionalProperties: false,
} as const;

export const commerceStockSchema = {
  type: "object",
  required: ["state"],
  properties: {
    state: { enum: commerceStockStates },
    quantity: { type: ["integer", "null"], minimum: 0, maximum: 1000000 },
  },
  additionalProperties: false,
} as const;

export const commerceVariantSchema = {
  type: "object",
  required: ["title", "pricing", "stock"],
  properties: {
    id: { type: "string", pattern: uuidPattern },
    sku: { type: ["string", "null"], maxLength: 128 },
    title: { type: "string", minLength: 1, maxLength: 200 },
    pricing: commerceMoneySchema,
    stock: commerceStockSchema,
    attributes: {
      type: "object",
      maxProperties: 50,
      patternProperties: {
        [metadataFieldPattern]: { type: "string", maxLength: 200 },
      },
      additionalProperties: false,
    },
    isDefault: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

const commerceProductBaseProperties = {
  title: { type: "string", minLength: 1, maxLength: 200 },
  slug: { type: ["string", "null"], minLength: 1, maxLength: 200, pattern: slugPattern },
  status: { enum: commerceProductStatuses },
  excerpt: { type: ["string", "null"], maxLength: 1000 },
  description: { type: ["string", "null"], maxLength: 20000 },
  pricing: commerceMoneySchema,
  stock: commerceStockSchema,
  collectionIds: {
    type: "array",
    maxItems: 100,
    uniqueItems: true,
    items: { type: "string", pattern: uuidPattern },
  },
  mediaIds: {
    type: "array",
    maxItems: 100,
    uniqueItems: true,
    items: { type: "string", pattern: uuidPattern },
  },
  variants: {
    type: "array",
    maxItems: 100,
    items: commerceVariantSchema,
  },
  metadata: { type: "object" },
  data: { type: "object" },
} as const;

export const commerceProductCreateSchema = {
  type: "object",
  required: ["title", "pricing", "stock"],
  properties: commerceProductBaseProperties,
  additionalProperties: false,
} as const;

export const commerceProductUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: commerceProductBaseProperties,
  additionalProperties: false,
} as const;

const commerceFilterValueSchema = {
  anyOf: [
    primitiveValueSchema,
    {
      type: "array",
      maxItems: 100,
      items: primitiveValueSchema,
    },
  ],
} as const;

export const commerceQueryFilterSchema = {
  type: "object",
  required: ["field", "op"],
  properties: {
    field: {
      type: "string",
      minLength: 1,
      maxLength: 128,
      pattern: metadataFieldPattern,
    },
    op: { enum: commerceFilterOperators },
    value: commerceFilterValueSchema,
  },
  additionalProperties: false,
} as const;

export const commerceQuerySortSchema = {
  type: "object",
  required: ["field", "dir"],
  properties: {
    field: { enum: commerceSortFields },
    dir: { enum: ["asc", "desc"] },
  },
  additionalProperties: false,
} as const;

export const commerceQueryPaginationSchema = {
  type: "object",
  required: ["limit", "offset"],
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100 },
    offset: { type: "integer", minimum: 0, maximum: 5000 },
  },
  additionalProperties: false,
} as const;

export const commerceQuerySchema = {
  type: "object",
  required: ["filters", "sort", "pagination"],
  properties: {
    filters: {
      type: "array",
      maxItems: 20,
      items: commerceQueryFilterSchema,
    },
    sort: {
      type: "array",
      maxItems: 3,
      items: commerceQuerySortSchema,
    },
    pagination: commerceQueryPaginationSchema,
    status: {
      type: "array",
      maxItems: 3,
      uniqueItems: true,
      items: { enum: commerceProductStatuses },
    },
    collectionIds: {
      type: "array",
      maxItems: 20,
      uniqueItems: true,
      items: { type: "string", pattern: uuidPattern },
    },
    search: { type: ["string", "null"], maxLength: 160 },
  },
  additionalProperties: false,
} as const;

export const commerceCollectionCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160, pattern: slugPattern },
    description: { type: ["string", "null"], maxLength: 1000 },
  },
  additionalProperties: false,
} as const;

export const commerceCollectionUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160, pattern: slugPattern },
    description: { type: ["string", "null"], maxLength: 1000 },
  },
  additionalProperties: false,
} as const;

import { reviewStatuses } from "../../services/reviews/reviewTypes";

const entityTypePattern = "^[a-z0-9_-]{2,64}$";

const reviewBaseProperties = {
  entityType: { type: "string", pattern: entityTypePattern },
  entityId: { type: "string", minLength: 1, maxLength: 128 },
  status: { enum: reviewStatuses },
  rating: { type: "integer", minimum: 1, maximum: 5 },
  title: { type: ["string", "null"], maxLength: 240 },
  body: { type: ["string", "null"], maxLength: 10000 },
  authorName: { type: "string", minLength: 1, maxLength: 160 },
  authorEmail: { type: ["string", "null"], maxLength: 320 },
  metadata: { type: "object" },
} as const;

export const reviewCreateSchema = {
  type: "object",
  required: ["entityType", "entityId", "rating", "authorName"],
  properties: reviewBaseProperties,
  additionalProperties: false,
} as const;

export const reviewUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    rating: reviewBaseProperties.rating,
    title: reviewBaseProperties.title,
    body: reviewBaseProperties.body,
    authorName: reviewBaseProperties.authorName,
    authorEmail: reviewBaseProperties.authorEmail,
    metadata: reviewBaseProperties.metadata,
  },
  additionalProperties: false,
} as const;

export const reviewStatusSchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: { enum: reviewStatuses },
  },
  additionalProperties: false,
} as const;

export const reviewListQuerySchema = {
  type: "object",
  properties: {
    entityType: { type: "string", pattern: entityTypePattern },
    entityId: { type: "string", minLength: 1, maxLength: 128 },
    status: { enum: reviewStatuses },
    limit: { type: "integer", minimum: 1, maximum: 200 },
    offset: { type: "integer", minimum: 0, maximum: 5000 },
  },
  additionalProperties: false,
} as const;

import { HOUSE_PROJECT_CATEGORIES, HOUSE_PROJECT_RESOURCE_KEY } from "./constants";

export const HOUSE_PROJECT_SCHEMA_LIMITS = {
  key: 64,
  slug: 64,
  title: 160,
  cardDescription: 240,
  seoDescription: 320,
  area: { min: 40, max: 500 },
  categories: { min: 1, max: 4 },
  referenceOrder: { min: 0, max: 5 },
  detailEyebrow: 80,
  detailLead: 1_000,
  detailStats: { count: 4, id: 64, value: 32, label: 80 },
  assumptionsEyebrow: 80,
  assumptionsTitle: 240,
  assumptionsLead: 1_000,
  assumptions: { count: 3, id: 64, title: 160, description: 500 },
} as const;

const boundedString = (maxLength: number) => ({
  type: "string" as const,
  minLength: 1,
  maxLength,
});

export const HOUSE_PROJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "cardDescription",
    "cardHref",
    "area",
    "categories",
    "referenceOrder",
    "seoDescription",
  ],
  properties: {
    cardDescription: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.cardDescription),
    cardHref: { type: "string", enum: ["/projekty/aurora", "/projekty"] },
    area: {
      type: "number",
      minimum: HOUSE_PROJECT_SCHEMA_LIMITS.area.min,
      maximum: HOUSE_PROJECT_SCHEMA_LIMITS.area.max,
    },
    categories: {
      type: "array",
      minItems: HOUSE_PROJECT_SCHEMA_LIMITS.categories.min,
      maxItems: HOUSE_PROJECT_SCHEMA_LIMITS.categories.max,
      uniqueItems: true,
      items: { type: "string", enum: [...HOUSE_PROJECT_CATEGORIES] },
    },
    referenceOrder: {
      type: "integer",
      minimum: HOUSE_PROJECT_SCHEMA_LIMITS.referenceOrder.min,
      maximum: HOUSE_PROJECT_SCHEMA_LIMITS.referenceOrder.max,
    },
    seoDescription: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.seoDescription),
    detailEyebrow: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.detailEyebrow),
    detailLead: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.detailLead),
    detailStats: {
      type: "array",
      minItems: HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.count,
      maxItems: HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.count,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "value", "label"],
        properties: {
          id: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.id),
          value: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.value),
          label: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.label),
        },
      },
    },
    assumptionsEyebrow: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.assumptionsEyebrow),
    assumptionsTitle: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.assumptionsTitle),
    assumptionsLead: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.assumptionsLead),
    assumptions: {
      type: "array",
      minItems: HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.count,
      maxItems: HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.count,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "description"],
        properties: {
          id: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.id),
          title: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.title),
          description: boundedString(HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.description),
        },
      },
    },
  },
} as const;

export const buildHouseProjectTypeDesired = (status: "published" = "published") => ({
  name: "Projekty domów",
  slug: HOUSE_PROJECT_RESOURCE_KEY,
  status,
  schema: HOUSE_PROJECT_SCHEMA,
});

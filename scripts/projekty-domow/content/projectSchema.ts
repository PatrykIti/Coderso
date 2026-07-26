import { HOUSE_PROJECT_RESOURCE_KEY } from "./constants";

export const HOUSE_PROJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "area",
    "style",
    "storeys",
    "rooms",
    "energyClass",
    "category",
    "assumptions",
    "zones",
    "visualLabel",
  ],
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 500 },
    area: { type: "number", minimum: 40, maximum: 500 },
    style: { type: "string", enum: ["minimal", "natural", "classic"] },
    storeys: { type: "integer", minimum: 1, maximum: 3 },
    rooms: { type: "integer", minimum: 2, maximum: 12 },
    energyClass: { type: "string", enum: ["A+", "A", "B"] },
    category: { type: "string", enum: ["modern", "barn", "traditional"] },
    assumptions: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    zones: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 80 },
    },
    visualLabel: { type: "string", minLength: 1, maxLength: 80 },
  },
} as const;

export const buildHouseProjectTypeDesired = () => ({
  name: "Projekty domów",
  slug: HOUSE_PROJECT_RESOURCE_KEY,
  status: "published" as const,
  schema: HOUSE_PROJECT_SCHEMA,
});

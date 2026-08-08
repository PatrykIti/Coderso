export const HOUSE_PROJECT_RESOURCE_KEY = "house-project";

export const HOUSE_PROJECT_CATEGORIES = ["barn", "villa", "single", "eco"] as const;

export type HouseProjectCategory = (typeof HOUSE_PROJECT_CATEGORIES)[number];

import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
} from "../actionPlanTypes";
import { buildCatalogFamilyPlan } from "./catalogFamilyBlueprint";
import { HOUSE_PROJECTS_CATALOG_PRESET } from "./catalogFamilyPresets";

export const buildHouseProjectsCatalogPlan = (options?: {
  promptKind?: AssistantPromptKind;
  intentFamily?: AssistantIntentFamily;
}): AssistantActionPlan =>
  buildCatalogFamilyPlan(HOUSE_PROJECTS_CATALOG_PRESET, options);

export const HOUSE_PROJECTS_CATALOG_BLUEPRINT = {
  contentTypeSlug: HOUSE_PROJECTS_CATALOG_PRESET.contentTypeSlug,
  catalogPageSlug: HOUSE_PROJECTS_CATALOG_PRESET.catalogPageSlug,
  catalogHiddenListPath: HOUSE_PROJECTS_CATALOG_PRESET.catalogHiddenListPath,
  detailPath: HOUSE_PROJECTS_CATALOG_PRESET.detailPath,
  listingQueryName: HOUSE_PROJECTS_CATALOG_PRESET.listingQueryName,
  listingTemplateSlug: HOUSE_PROJECTS_CATALOG_PRESET.listingTemplateSlug,
  customScreenName: HOUSE_PROJECTS_CATALOG_PRESET.customScreenName,
};

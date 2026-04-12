import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";
import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type { CatalogFamilyPreset } from "./catalogFamilyBlueprint";
import { buildCatalogFamilyPlan } from "./catalogFamilyBlueprint";
import { CATALOG_FAMILY_PRESETS } from "./catalogFamilyPresets";

export type AssistantBusinessBlueprintSurface =
  | "content-type"
  | "custom-screen"
  | "listing-query"
  | "listing-template"
  | "page"
  | "form"
  | "menu"
  | "site-kit";

export type AssistantBusinessBlueprintPack = {
  id: string;
  title: string;
  intentFamily: AssistantIntentFamily;
  status: "ready" | "requires-prerequisite";
  surfaces: AssistantBusinessBlueprintSurface[];
  actionTypes: AssistantPlannedAction["type"][];
  assumptions: string[];
  buildPlan: (options?: {
    promptKind?: AssistantPromptKind;
    intentFamily?: AssistantIntentFamily;
  }) => AssistantActionPlan;
};

const catalogActionTypes: AssistantPlannedAction["type"][] = [
  "setting.content-route.upsert",
  "content-type.upsert",
  "custom-screen.upsert",
  "listing-query.upsert",
  "listing-template.upsert",
  "page.upsert",
];

const catalogSurfaces: AssistantBusinessBlueprintSurface[] = [
  "content-type",
  "custom-screen",
  "listing-query",
  "listing-template",
  "page",
];

type CatalogBusinessBlueprintIntentFamily = keyof typeof CATALOG_FAMILY_PRESETS;

const createCatalogBlueprintPack = (
  intentFamily: CatalogBusinessBlueprintIntentFamily,
  preset: CatalogFamilyPreset
): AssistantBusinessBlueprintPack => ({
  id: preset.intentId,
  title: preset.title,
  intentFamily,
  status: "ready",
  surfaces: [...catalogSurfaces],
  actionTypes: [...catalogActionTypes],
  assumptions: [...preset.assumptions],
  buildPlan: (options) =>
    normalizeAssistantActionPlan(
      buildCatalogFamilyPlan(preset, {
        promptKind: options?.promptKind,
        intentFamily: options?.intentFamily ?? intentFamily,
      })
    ),
});

export const catalogBusinessBlueprintPacks = Object.fromEntries(
  Object.entries(CATALOG_FAMILY_PRESETS).map(([intentFamily, preset]) => [
    intentFamily,
    createCatalogBlueprintPack(
      intentFamily as keyof typeof CATALOG_FAMILY_PRESETS,
      preset
    ),
  ])
) as {
  [K in keyof typeof CATALOG_FAMILY_PRESETS]: AssistantBusinessBlueprintPack;
};

export const listBusinessBlueprintPacks = () =>
  Object.values(catalogBusinessBlueprintPacks);

export const getBusinessBlueprintPack = (intentFamily: AssistantIntentFamily) =>
  intentFamily in catalogBusinessBlueprintPacks
    ? catalogBusinessBlueprintPacks[intentFamily as keyof typeof catalogBusinessBlueprintPacks]
    : null;

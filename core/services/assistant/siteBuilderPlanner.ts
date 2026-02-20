import {
  businessTypeMatchesKit,
  goalMatchesKit,
  listSolutionKitsCatalog,
} from "../kits/solutionKitsCatalog";
import {
  type SiteBuilderPlanApplyInput,
  type SiteBuilderPlanInput,
  type SiteBuilderPlanOutput,
  type SiteBuilderPlanStepId,
  type SiteBuilderPlanStep,
  type SolutionKitDefinition,
  type SolutionKitId,
  siteBuilderPlanStepIds,
} from "../kits/solutionKitTypes";

const normalizeLocale = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "en";
};

const normalizeSiteName = (value: string | null | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const rankKit = (kit: SolutionKitDefinition, input: SiteBuilderPlanInput) => {
  let score = 0;
  const reasons: string[] = [];

  if (businessTypeMatchesKit(kit, input.businessType)) {
    score += 4;
    reasons.push("Business type directly matches this kit.");
  }

  for (const goal of input.goals) {
    if (goalMatchesKit(kit, goal)) {
      score += 2;
      reasons.push(`Supports goal: ${goal.replaceAll("_", " ")}.`);
    }
  }

  if (input.preferredKitId && input.preferredKitId === kit.id) {
    score += 1;
    reasons.push("Preferred kit selected by user.");
  }

  return {
    kitId: kit.id,
    score,
    reasons,
  };
};

const mapBlueprintSummary = (kit: SolutionKitDefinition) => {
  const pagesCount = kit.resourceBlueprint.pages.length;
  const formsCount = kit.resourceBlueprint.forms.length;
  const contentTypeCount = kit.resourceBlueprint.contentTypes.length;
  return `${pagesCount} pages, ${formsCount} forms, ${contentTypeCount} content types`;
};

const buildPlanSteps = (kit: SolutionKitDefinition): SiteBuilderPlanStep[] => [
  {
    id: "settings",
    type: "settings",
    title: "Configure site basics",
    description: "Apply locale, branding defaults, and initial site configuration.",
    editable: false,
    affectsResources: [],
  },
  {
    id: "content-model",
    type: "content-model",
    title: "Create content model",
    description: `Provision content structure for ${kit.title.toLowerCase()}.`,
    editable: true,
    affectsResources: ["content_type"],
  },
  {
    id: "pages",
    type: "pages",
    title: "Create starter pages",
    description: `Install starter page set (${kit.resourceBlueprint.pages.length} pages).`,
    editable: true,
    affectsResources: ["page"],
  },
  {
    id: "forms",
    type: "forms",
    title: "Configure forms",
    description: `Install and wire form definitions (${kit.resourceBlueprint.forms.length} forms).`,
    editable: true,
    affectsResources: ["form"],
  },
  {
    id: "navigation",
    type: "navigation",
    title: "Apply navigation",
    description: "Create or update primary/footer menus for the kit.",
    editable: true,
    affectsResources: ["menu"],
  },
  {
    id: "qa",
    type: "qa",
    title: "Review and publish",
    description: "Run final checks and publish selected starter resources.",
    editable: false,
    affectsResources: [],
  },
];

const cloneKitDefinition = (kit: SolutionKitDefinition): SolutionKitDefinition => ({
  ...kit,
  businessTypes: [...kit.businessTypes],
  defaultGoals: [...kit.defaultGoals],
  recommendedModules: [...kit.recommendedModules],
  features: [...kit.features],
  resourceBlueprint: {
    contentTypes: kit.resourceBlueprint.contentTypes.map((item) => ({ ...item })),
    forms: kit.resourceBlueprint.forms.map((item) => ({ ...item })),
    pages: kit.resourceBlueprint.pages.map((item) => ({ ...item })),
    menus: kit.resourceBlueprint.menus.map((item) => ({ ...item })),
  },
});

const toEnabledStepSet = (
  input: SiteBuilderPlanApplyInput | undefined
): Set<SiteBuilderPlanStepId> => {
  const enabled = input?.enabledStepIds;
  if (!enabled || enabled.length === 0) {
    return new Set(siteBuilderPlanStepIds);
  }
  return new Set(enabled);
};

export const filterKitDefinitionByPlan = (
  kit: SolutionKitDefinition,
  plan: SiteBuilderPlanApplyInput | undefined
): SolutionKitDefinition => {
  const enabled = toEnabledStepSet(plan);
  const normalized = cloneKitDefinition(kit);

  if (!enabled.has("content-model")) normalized.resourceBlueprint.contentTypes = [];
  if (!enabled.has("pages")) normalized.resourceBlueprint.pages = [];
  if (!enabled.has("forms")) normalized.resourceBlueprint.forms = [];
  if (!enabled.has("navigation")) normalized.resourceBlueprint.menus = [];

  return normalized;
};

export function buildSiteBuilderPlan(input: SiteBuilderPlanInput): SiteBuilderPlanOutput {
  const kits = listSolutionKitsCatalog();
  const ranked = kits
    .map((kit) => rankKit(kit, input))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.kitId.localeCompare(right.kitId);
    });

  const selectedId: SolutionKitId =
    ranked[0]?.kitId ?? kits[0]?.id ?? "automotive-workshop";
  const selectedKit = kits.find((kit) => kit.id === selectedId) ?? kits[0];

  if (!selectedKit) {
    throw new Error("solution_kit_catalog_empty");
  }

  const confidenceRaw = 40 + (ranked[0]?.score ?? 0) * 10;
  const confidence = Math.max(45, Math.min(99, confidenceRaw));

  return {
    recommendedKitId: selectedKit.id,
    confidence,
    recommendations: ranked,
    steps: buildPlanSteps(selectedKit),
    settingsPatch: {
      "site.locale": normalizeLocale(input.locale),
      "site.name": normalizeSiteName(input.siteName, selectedKit.title),
    },
    notes: [
      `Recommended kit: ${selectedKit.title}.`,
      `Starter resources: ${mapBlueprintSummary(selectedKit)}.`,
      "Plan is editable before execution and deterministic for identical input.",
    ],
  };
}

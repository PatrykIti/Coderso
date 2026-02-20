export const solutionKitIds = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "services-directory",
  "small-ecommerce",
] as const;

export type SolutionKitId = (typeof solutionKitIds)[number];

export const siteBuilderBusinessTypes = [
  "automotive_workshop",
  "medical_clinic",
  "beauty_salon",
  "services_directory",
  "small_ecommerce",
  "custom",
] as const;

export type SiteBuilderBusinessType = (typeof siteBuilderBusinessTypes)[number];

export const siteBuilderGoals = [
  "lead_generation",
  "online_booking",
  "catalog_showcase",
  "reviews_social_proof",
  "sell_products",
  "collect_qualified_leads",
] as const;

export type SiteBuilderGoal = (typeof siteBuilderGoals)[number];

export type SolutionKitResourceBlueprint = {
  pages: Array<{ slug: string; title: string; status: "draft" | "published" }>;
  forms: Array<{ slug: string; name: string; status: "draft" | "published" }>;
  contentTypes: Array<{ slug: string; name: string }>;
  menus: Array<{ location: "primary" | "footer"; name: string }>;
};

export type SolutionKitDefinition = {
  id: SolutionKitId;
  title: string;
  shortDescription: string;
  longDescription: string;
  businessTypes: SiteBuilderBusinessType[];
  defaultGoals: SiteBuilderGoal[];
  recommendedModules: string[];
  features: string[];
  resourceBlueprint: SolutionKitResourceBlueprint;
};

export type SolutionKitSummary = {
  id: SolutionKitId;
  title: string;
  shortDescription: string;
  recommendedModules: string[];
  features: string[];
};

export type SiteBuilderPlanInput = {
  businessType: SiteBuilderBusinessType;
  goals: SiteBuilderGoal[];
  locale: string;
  region?: string | null;
  siteName?: string | null;
  preferredKitId?: SolutionKitId | null;
};

export const siteBuilderPlanStepIds = [
  "settings",
  "content-model",
  "pages",
  "forms",
  "navigation",
  "qa",
] as const;

export type SiteBuilderPlanStepId = (typeof siteBuilderPlanStepIds)[number];

export type SiteBuilderPlanStepType =
  | "settings"
  | "content-model"
  | "pages"
  | "forms"
  | "navigation"
  | "qa";

export type SiteBuilderPlanStep = {
  id: SiteBuilderPlanStepId;
  type: SiteBuilderPlanStepType;
  title: string;
  description: string;
  editable: boolean;
  affectsResources: Array<"content_type" | "form" | "page" | "menu">;
};

export type SiteBuilderPlanApplyInput = {
  enabledStepIds?: SiteBuilderPlanStepId[];
  settingsPatch?: Record<string, unknown>;
  notes?: string[];
};

export type SiteBuilderRecommendation = {
  kitId: SolutionKitId;
  score: number;
  reasons: string[];
};

export type SiteBuilderPlanOutput = {
  recommendedKitId: SolutionKitId;
  confidence: number;
  recommendations: SiteBuilderRecommendation[];
  steps: SiteBuilderPlanStep[];
  settingsPatch: Record<string, unknown>;
  notes: string[];
};

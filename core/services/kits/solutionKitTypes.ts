import type { SolutionKitManifest } from "./kitManifest";

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

export type SolutionKitSeoDefaults = {
  title?: string;
  description?: string;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type SolutionKitTaxonomyTerm = {
  name: string;
  slug?: string;
};

export type SolutionKitContentTypeTaxonomy = {
  categories?: SolutionKitTaxonomyTerm[];
  tags?: SolutionKitTaxonomyTerm[];
};

export type SolutionKitContentTypeBlueprint = {
  slug: string;
  name: string;
  status?: "draft" | "published";
  schema?: Record<string, unknown>;
  taxonomy?: SolutionKitContentTypeTaxonomy;
};

export type SolutionKitFormFieldBlueprint = {
  id?: string;
  type: "text" | "email" | "select" | "checkbox" | "textarea" | "phone" | "date";
  label: string;
  name?: string;
  required?: boolean;
  orderIndex?: number;
  settings?: Record<string, unknown>;
};

export type SolutionKitFormBlueprint = {
  slug: string;
  name: string;
  status: "draft" | "published";
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  settings?: Record<string, unknown>;
  fields?: SolutionKitFormFieldBlueprint[];
};

export type SolutionKitPageBlueprint = {
  slug: string;
  title: string;
  status: "draft" | "published";
  template?: string;
  data?: Record<string, unknown>;
  seo?: SolutionKitSeoDefaults;
};

export type SolutionKitMenuItemBlueprint = {
  key: string;
  label: string;
  href?: string;
  pageSlug?: string;
  parentKey?: string | null;
  orderIndex?: number;
  settings?: Record<string, unknown>;
};

export type SolutionKitMenuBlueprint = {
  location: "primary" | "footer";
  name: string;
  items?: SolutionKitMenuItemBlueprint[];
};

export type SolutionKitTemplateBlueprint = {
  key: string;
  name?: string;
  description?: string | null;
  category?: string;
  status?: "draft" | "published";
  sourcePageSlug?: string | null;
  blocks?: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
};

export type SolutionKitResourceBlueprint = {
  pages: SolutionKitPageBlueprint[];
  forms: SolutionKitFormBlueprint[];
  contentTypes: SolutionKitContentTypeBlueprint[];
  menus: SolutionKitMenuBlueprint[];
  templates?: SolutionKitTemplateBlueprint[];
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
  manifest?: SolutionKitManifest;
};

export type SolutionKitSummary = {
  id: SolutionKitId;
  title: string;
  shortDescription: string;
  recommendedModules: string[];
  features: string[];
  manifest?: SolutionKitManifest;
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

import type { SiteBuilderPlanStepId } from "../kits/solutionKitTypes";

export const ASSISTANT_SITE_BUILDER_INTAKE_VERSION = 1 as const;

export const assistantSiteBuilderIntakeModes = ["basic", "advanced"] as const;

export type AssistantSiteBuilderIntakeMode = (typeof assistantSiteBuilderIntakeModes)[number];

export const assistantSiteBuilderIntakeStepIds = [
  "business-profile",
  "site-goals",
  "site-map",
  "menu",
  "homepage-sections",
  "hero",
  "subpages",
  "media-policy",
  "content-engine",
  "design-preset",
  "reference-intake",
  "review",
] as const;

export type AssistantSiteBuilderIntakeStepId = (typeof assistantSiteBuilderIntakeStepIds)[number];

export const assistantSiteBuilderIntakeOptionRegistryIds = [
  "pageRoles",
  "menuPresets",
  "heroPresets",
  "sectionRoles",
  "mediaPolicies",
  "reviewStates",
] as const;

export type AssistantSiteBuilderIntakeOptionRegistryId =
  (typeof assistantSiteBuilderIntakeOptionRegistryIds)[number];

export const assistantSiteBuilderPageRoleIds = [
  "home",
  "about",
  "services",
  "products",
  "portfolio",
  "case-studies",
  "pricing",
  "testimonials",
  "blog",
  "faq",
  "team",
  "locations",
  "contact",
  "legal",
] as const;

export type AssistantSiteBuilderPageRoleId = (typeof assistantSiteBuilderPageRoleIds)[number];

export const assistantSiteBuilderMenuPresetIds = [
  "simple",
  "grouped",
  "conversion-focused",
  "content-heavy",
  "location-aware",
] as const;

export type AssistantSiteBuilderMenuPresetId = (typeof assistantSiteBuilderMenuPresetIds)[number];

export const assistantSiteBuilderHeroPresetIds = [
  "copy-first",
  "media-first",
  "split-feature",
  "offer-with-proof",
  "location-led",
] as const;

export type AssistantSiteBuilderHeroPresetId = (typeof assistantSiteBuilderHeroPresetIds)[number];

export const assistantSiteBuilderSectionRoleIds = [
  "value-proposition",
  "services-overview",
  "featured-items",
  "proof",
  "process",
  "benefits",
  "comparison",
  "pricing",
  "faq",
  "lead-capture",
  "contact",
  "content-feed",
  "call-to-action",
] as const;

export type AssistantSiteBuilderSectionRoleId = (typeof assistantSiteBuilderSectionRoleIds)[number];

export const assistantSiteBuilderMediaPolicyIds = ["curated", "library", "placeholder"] as const;

export type AssistantSiteBuilderMediaPolicyId = (typeof assistantSiteBuilderMediaPolicyIds)[number];

export const assistantSiteBuilderReviewStateIds = [
  "draft",
  "needs-input",
  "ready",
  "confirmed",
  "blocked",
] as const;

export type AssistantSiteBuilderReviewStateId = (typeof assistantSiteBuilderReviewStateIds)[number];

export type AssistantSiteBuilderIntakeOptionDefinition<TId extends string = string> = {
  id: TId;
  label: string;
  description: string;
};

export type AssistantSiteBuilderIntakeModeDefinition = {
  id: AssistantSiteBuilderIntakeMode;
  label: string;
  description: string;
  defaultStepId: AssistantSiteBuilderIntakeStepId;
};

export type AssistantSiteBuilderIntakeStepDefinition = {
  id: AssistantSiteBuilderIntakeStepId;
  label: string;
  description: string;
  required: boolean;
  modeAvailability: readonly AssistantSiteBuilderIntakeMode[];
  optionRegistryId?: AssistantSiteBuilderIntakeOptionRegistryId;
};

export type AssistantSiteBuilderIntakeAnswer = {
  stepId: AssistantSiteBuilderIntakeStepId;
  values: Record<string, unknown>;
  updatedAt?: string;
};

export type AssistantSiteBuilderIntakeFacts = {
  siteName?: string | null;
  entityName?: string | null;
  topic?: string | null;
  vertical?: string | null;
  audience?: string | null;
  locale?: string | null;
  region?: string | null;
  goals?: readonly string[];
  pageRoles?: readonly AssistantSiteBuilderPageRoleId[];
  sectionRoles?: readonly AssistantSiteBuilderSectionRoleId[];
  menuPreset?: AssistantSiteBuilderMenuPresetId | null;
  heroPreset?: AssistantSiteBuilderHeroPresetId | null;
  mediaPolicy?: AssistantSiteBuilderMediaPolicyId | null;
  reviewState?: AssistantSiteBuilderReviewStateId;
  siteKitPlanStepIds?: readonly SiteBuilderPlanStepId[];
};

export type AssistantSiteBuilderIntakeSession = {
  version: typeof ASSISTANT_SITE_BUILDER_INTAKE_VERSION;
  mode: AssistantSiteBuilderIntakeMode;
  currentStepId: AssistantSiteBuilderIntakeStepId;
  answers: AssistantSiteBuilderIntakeAnswer[];
  facts?: AssistantSiteBuilderIntakeFacts;
  reviewState?: AssistantSiteBuilderReviewStateId;
};

export type AssistantSiteBuilderIntakeRegistryErrorCode =
  | "intake_mode_invalid"
  | "intake_step_invalid"
  | "intake_option_registry_invalid"
  | "intake_option_invalid"
  | "intake_registry_duplicate"
  | "intake_registry_invalid";

export class AssistantSiteBuilderIntakeRegistryError extends Error {
  readonly code: AssistantSiteBuilderIntakeRegistryErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: AssistantSiteBuilderIntakeRegistryErrorCode,
    details: Readonly<Record<string, unknown>> = {}
  ) {
    super(code);
    this.name = "AssistantSiteBuilderIntakeRegistryError";
    this.code = code;
    this.details = details;
  }
}

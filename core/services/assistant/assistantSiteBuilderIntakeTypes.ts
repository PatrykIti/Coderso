import {
  AssistantSiteBuilderIntakeError,
  type AssistantSiteBuilderIntakeErrorCode,
} from "./assistantSiteBuilderIntakeErrors";
import type { SiteBuilderPlanStepId } from "../kits/solutionKitTypes";

import type { DesignTokenOverrides } from "../theme/tokenTypes";

export const ASSISTANT_SITE_BUILDER_INTAKE_VERSION = 1 as const;

export const assistantSiteBuilderIntakeModes = ["basic", "advanced"] as const;

export type AssistantSiteBuilderIntakeMode = (typeof assistantSiteBuilderIntakeModes)[number];

export const assistantSiteBuilderIntakeStepIds = [
  "business-profile",
  "site-goals",
  "site-map",
  "menu",
  "hero",
  "homepage-sections",
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
  "designPresets",
  "sectionRoles",
  "mediaPolicies",
  "contentEngines",
  "reviewStates",
] as const;

export type AssistantSiteBuilderIntakeOptionRegistryId =
  (typeof assistantSiteBuilderIntakeOptionRegistryIds)[number];

export const assistantSiteBuilderIntakeAnswerFieldControls = [
  "text",
  "textarea",
  "text_list",
  "label_map",
  "select",
  "multi_select",
  "checkbox",
] as const;

export type AssistantSiteBuilderIntakeAnswerFieldControl =
  (typeof assistantSiteBuilderIntakeAnswerFieldControls)[number];

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

export const assistantSiteBuilderDesignPresetIds = [
  "modern",
  "editorial",
  "retro",
  "minimal",
  "bold",
  "luxury",
  "utilitarian",
] as const;

export type AssistantSiteBuilderDesignPresetId =
  (typeof assistantSiteBuilderDesignPresetIds)[number];

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

export const assistantSiteBuilderDesignToneIds = [
  "clean",
  "editorial",
  "warm",
  "minimal",
  "expressive",
  "premium",
  "work-focused",
] as const;

export type AssistantSiteBuilderDesignToneId = (typeof assistantSiteBuilderDesignToneIds)[number];

export const assistantSiteBuilderDesignContrastIds = ["low", "medium", "high"] as const;

export type AssistantSiteBuilderDesignContrastId =
  (typeof assistantSiteBuilderDesignContrastIds)[number];

export const assistantSiteBuilderDesignDensityIds = ["compact", "balanced", "spacious"] as const;

export type AssistantSiteBuilderDesignDensityId =
  (typeof assistantSiteBuilderDesignDensityIds)[number];

export const assistantSiteBuilderDesignTypographyIds = [
  "sans",
  "serif-accent",
  "display-accent",
] as const;

export type AssistantSiteBuilderDesignTypographyId =
  (typeof assistantSiteBuilderDesignTypographyIds)[number];

export const assistantSiteBuilderDesignImageTreatmentIds = [
  "crisp",
  "editorial-crop",
  "duotone",
  "quiet",
  "high-contrast",
  "cinematic",
  "functional",
] as const;

export type AssistantSiteBuilderDesignImageTreatmentId =
  (typeof assistantSiteBuilderDesignImageTreatmentIds)[number];

export const assistantSiteBuilderDesignSpacingIds = ["sm", "md", "lg", "xl"] as const;

export type AssistantSiteBuilderDesignSpacingId =
  (typeof assistantSiteBuilderDesignSpacingIds)[number];

export const assistantSiteBuilderDesignCornerRadiusIds = ["sm", "md", "lg"] as const;

export type AssistantSiteBuilderDesignCornerRadiusId =
  (typeof assistantSiteBuilderDesignCornerRadiusIds)[number];

export const assistantSiteBuilderDesignAccentIds = [
  "subtle-accent",
  "single-accent",
  "warm-accent",
  "strong-accent",
  "muted-premium",
  "status-accent",
] as const;

export type AssistantSiteBuilderDesignAccentId =
  (typeof assistantSiteBuilderDesignAccentIds)[number];

export type AssistantSiteBuilderDesignPresetTokenFacts = {
  toneId: AssistantSiteBuilderDesignToneId;
  contrastId: AssistantSiteBuilderDesignContrastId;
  densityId: AssistantSiteBuilderDesignDensityId;
  typographyId: AssistantSiteBuilderDesignTypographyId;
  imageTreatmentId: AssistantSiteBuilderDesignImageTreatmentId;
  spacingId: AssistantSiteBuilderDesignSpacingId;
  cornerRadiusId: AssistantSiteBuilderDesignCornerRadiusId;
  accentId: AssistantSiteBuilderDesignAccentId;
};

export type AssistantSiteBuilderDesignPresetFacts = {
  presetId: AssistantSiteBuilderDesignPresetId;
  label: string;
  tokens: AssistantSiteBuilderDesignPresetTokenFacts;
  themeTokenHints: DesignTokenOverrides;
  supportedSectionRoleIds: readonly AssistantSiteBuilderSectionRoleId[];
  gapCodes: readonly string[];
};

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

export const assistantSiteBuilderContentEngineIds = [
  "services",
  "products",
  "portfolio",
  "case-studies",
  "blog",
  "team",
  "locations",
  "faq",
  "testimonials",
] as const;

export type AssistantSiteBuilderContentEngineId =
  (typeof assistantSiteBuilderContentEngineIds)[number];

export type AssistantSiteBuilderBasicPageRouteDefault = {
  roleId: AssistantSiteBuilderPageRoleId;
  label: string;
  path: string;
  menuLabel: string;
};

export type AssistantSiteBuilderBasicMenuItemDefault = {
  key: string;
  roleId: AssistantSiteBuilderPageRoleId | null;
  label: string;
  href: string | null;
  parentKey: string | null;
  orderIndex: number;
};

export type AssistantSiteBuilderBasicDefaultsFacts = {
  pageRoles: readonly AssistantSiteBuilderPageRoleId[];
  pageRoutes: readonly AssistantSiteBuilderBasicPageRouteDefault[];
  menuPreset: AssistantSiteBuilderMenuPresetId;
  menuItems: readonly AssistantSiteBuilderBasicMenuItemDefault[];
  homepageSectionRoles: readonly AssistantSiteBuilderSectionRoleId[];
  goalSignals: readonly string[];
};

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

export type AssistantSiteBuilderIntakeAnswerFieldDefinition = {
  key: string;
  label: string;
  description: string;
  control: AssistantSiteBuilderIntakeAnswerFieldControl;
  required: boolean;
  requiredGroupId?: string | null;
  maxLength?: number;
  maxItems?: number;
  optionRegistryId?: AssistantSiteBuilderIntakeOptionRegistryId;
};

export type AssistantSiteBuilderIntakeStepDefinition = {
  id: AssistantSiteBuilderIntakeStepId;
  label: string;
  description: string;
  required: boolean;
  modeAvailability: readonly AssistantSiteBuilderIntakeMode[];
  optionRegistryId?: AssistantSiteBuilderIntakeOptionRegistryId;
  answerFields: readonly AssistantSiteBuilderIntakeAnswerFieldDefinition[];
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
  summary?: string | null;
  offerSummary?: string | null;
  goals?: readonly string[];
  primaryGoal?: string | null;
  pageRoles?: readonly AssistantSiteBuilderPageRoleId[];
  pageRoleLabels?: Partial<Record<AssistantSiteBuilderPageRoleId, string>>;
  sectionRoles?: readonly AssistantSiteBuilderSectionRoleId[];
  menuPreset?: AssistantSiteBuilderMenuPresetId | null;
  heroPreset?: AssistantSiteBuilderHeroPresetId | null;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  mediaPolicy?: AssistantSiteBuilderMediaPolicyId | null;
  mediaNotes?: string | null;
  contentEngines?: readonly AssistantSiteBuilderContentEngineId[];
  designPresetId?: AssistantSiteBuilderDesignPresetId | null;
  designPreset?: AssistantSiteBuilderDesignPresetFacts;
  designBrief?: string | null;
  referenceNotes?: string | null;
  reviewState?: AssistantSiteBuilderReviewStateId;
  reviewNotes?: string | null;
  answeredStepIds?: readonly AssistantSiteBuilderIntakeStepId[];
  missingRequiredStepIds?: readonly AssistantSiteBuilderIntakeStepId[];
  missingReviewInputStepIds?: readonly AssistantSiteBuilderIntakeStepId[];
  readyForReview?: boolean;
  readyForExecution?: boolean;
  redactionApplied?: boolean;
  siteKitPlanStepIds?: readonly SiteBuilderPlanStepId[];
  basicDefaults?: AssistantSiteBuilderBasicDefaultsFacts;
};

export type AssistantSiteBuilderIntakeSession = {
  version: typeof ASSISTANT_SITE_BUILDER_INTAKE_VERSION;
  mode: AssistantSiteBuilderIntakeMode;
  currentStepId: AssistantSiteBuilderIntakeStepId;
  answers: AssistantSiteBuilderIntakeAnswer[];
  facts?: AssistantSiteBuilderIntakeFacts;
  reviewState?: AssistantSiteBuilderReviewStateId;
};

export type AssistantSiteBuilderIntakeRegistryErrorCode = Extract<
  AssistantSiteBuilderIntakeErrorCode,
  | "intake_mode_invalid"
  | "intake_step_invalid"
  | "intake_option_registry_invalid"
  | "intake_option_invalid"
  | "intake_registry_duplicate"
  | "intake_registry_invalid"
>;

export class AssistantSiteBuilderIntakeRegistryError extends AssistantSiteBuilderIntakeError {
  constructor(
    code: AssistantSiteBuilderIntakeRegistryErrorCode,
    details: Readonly<Record<string, unknown>> = {}
  ) {
    super(code, details);
    this.name = "AssistantSiteBuilderIntakeRegistryError";
  }
}

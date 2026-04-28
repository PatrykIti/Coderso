import type {
  SiteBuilderBusinessType,
  SiteBuilderGoal,
  SiteBuilderPlanOutput,
  SiteBuilderPlanStepId,
  SolutionKitPlanApplyInput,
} from "@/services/solutionKitsClient";

export type AiSiteWizardStep = 1 | 2 | 3 | 4 | 5;

export type AiSiteWizardDraft = {
  businessType: SiteBuilderBusinessType;
  locale: string;
  siteName: string;
  goals: SiteBuilderGoal[];
};

export type AiSiteWizardStepValidationInput = {
  step: AiSiteWizardStep;
  draft: AiSiteWizardDraft;
  plan: SiteBuilderPlanOutput | null;
  enabledStepIds: SiteBuilderPlanStepId[];
};

const stepIds: SiteBuilderPlanStepId[] = [
  "settings",
  "content-model",
  "pages",
  "forms",
  "navigation",
  "qa",
];

const isStepId = (value: unknown): value is SiteBuilderPlanStepId =>
  typeof value === "string" && stepIds.includes(value as SiteBuilderPlanStepId);

const normalizeLocale = (value: string) => value.trim();

export const AI_SITE_WIZARD_DEFAULT_DRAFT: AiSiteWizardDraft = {
  businessType: "automotive_workshop",
  locale: "en",
  siteName: "",
  goals: ["lead_generation", "online_booking"],
};

export const getDefaultEnabledStepIds = (
  plan: SiteBuilderPlanOutput | null
): SiteBuilderPlanStepId[] => {
  if (!plan) return stepIds;
  const editable = plan.steps.filter((step) => step.editable !== false).map((step) => step.id);
  if (editable.length === 0) return stepIds;
  const fixed = plan.steps.filter((step) => step.editable === false).map((step) => step.id);
  return [...new Set([...fixed, ...editable])].filter(isStepId);
};

export const normalizeEnabledStepIds = (
  plan: SiteBuilderPlanOutput | null,
  input: SiteBuilderPlanStepId[]
): SiteBuilderPlanStepId[] => {
  const allowed = new Set((plan?.steps.map((step) => step.id) ?? stepIds).filter(isStepId));
  const normalized = input.filter((step) => allowed.has(step));
  const fixed = (plan?.steps ?? [])
    .filter((step) => step.editable === false)
    .map((step) => step.id)
    .filter(isStepId);
  return [...new Set([...fixed, ...normalized])];
};

export const validateAiSiteWizardStep = (
  input: AiSiteWizardStepValidationInput
): string | null => {
  if (input.step === 1) {
    if (!normalizeLocale(input.draft.locale)) {
      return "Locale is required.";
    }
    return null;
  }

  if (input.step === 2) {
    if (input.draft.goals.length === 0) {
      return "Select at least one goal before continuing.";
    }
    return null;
  }

  if (input.step === 3) {
    if (!input.plan) {
      return "Generate a recommendation plan first.";
    }
    return null;
  }

  if (input.step === 4) {
    if (!input.plan) {
      return "Generate a recommendation plan first.";
    }

    const hasEditable = input.plan.steps.some((step) => step.editable !== false);
    if (hasEditable && input.enabledStepIds.length === 0) {
      return "Enable at least one execution step before running apply.";
    }
    return null;
  }

  if (!input.plan) {
    return "Generate and review the plan before execution.";
  }

  return null;
};

export const toPlanApplyInput = (
  plan: SiteBuilderPlanOutput | null,
  enabledStepIds: SiteBuilderPlanStepId[]
): SolutionKitPlanApplyInput | undefined => {
  if (!plan) return undefined;

  return {
    enabledStepIds: normalizeEnabledStepIds(plan, enabledStepIds),
    settingsPatch: plan.settingsPatch,
    notes: plan.notes,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const readWizardPlanFromRunOptions = (
  value: unknown
): SolutionKitPlanApplyInput | null => {
  if (!isRecord(value)) return null;
  const wizard = value.wizard;
  if (!isRecord(wizard)) return null;

  const enabled = toStringArray(wizard.enabledStepIds).filter(isStepId);
  const settingsPatch = isRecord(wizard.settingsPatch) ? wizard.settingsPatch : {};
  const notes = toStringArray(wizard.notes);

  return {
    enabledStepIds: enabled.length > 0 ? enabled : undefined,
    settingsPatch,
    notes,
  };
};

export const mergeDraftFromRunOptions = (
  currentEnabledStepIds: SiteBuilderPlanStepId[],
  options: SolutionKitPlanApplyInput | null
): SiteBuilderPlanStepId[] => {
  if (!options?.enabledStepIds || options.enabledStepIds.length === 0) {
    return currentEnabledStepIds;
  }
  return options.enabledStepIds;
};

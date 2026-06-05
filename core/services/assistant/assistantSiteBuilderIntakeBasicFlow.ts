import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantSiteBuilderIntakeAnswerFieldMetadata,
  AssistantPlanQuestion,
  AssistantSiteBuilderIntakePlanMetadata,
  AssistantSiteBuilderIntakeStepMetadata,
} from "./actionPlanTypes";
import { classifyAssistantPrompt } from "./actionPlanHeuristics";
import { redactAssistantText } from "./assistantRedaction";
import { normalizeAssistantSiteBuilderIntakeSession } from "./assistantSiteBuilderIntakeNormalizer";
import {
  listSiteBuilderIntakeOptions,
  listSiteBuilderIntakeStepDefinitionsForMode,
} from "./assistantSiteBuilderIntakeRegistry";
import type {
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderIntakeMode,
  AssistantSiteBuilderIntakeSession,
  AssistantSiteBuilderIntakeStepId,
} from "./assistantSiteBuilderIntakeTypes";
import { ASSISTANT_SITE_BUILDER_INTAKE_VERSION } from "./assistantSiteBuilderIntakeTypes";

const advancedOnlyStepIds = new Set<AssistantSiteBuilderIntakeStepId>([
  "content-engine",
  "design-preset",
  "reference-intake",
]);

const isBasicStepId = (
  stepId: AssistantSiteBuilderIntakeStepId
): stepId is AssistantSiteBuilderBasicIntakeStepId => !advancedOnlyStepIds.has(stepId);

export const BASIC_SITE_BUILDER_INTAKE_STEP_IDS = Object.freeze(
  listSiteBuilderIntakeStepDefinitionsForMode("basic")
    .map((definition) => definition.id)
    .filter(isBasicStepId)
) as readonly AssistantSiteBuilderBasicIntakeStepId[];

export type AssistantSiteBuilderBasicIntakeStepId = Exclude<
  AssistantSiteBuilderIntakeStepId,
  "content-engine" | "design-preset" | "reference-intake"
>;

export type AssistantSiteBuilderBasicStepMetadata = AssistantSiteBuilderIntakeStepMetadata & {
  id: AssistantSiteBuilderBasicIntakeStepId;
};

export type AssistantSiteBuilderBasicProgression = {
  schemaVersion: 1;
  mode: "basic";
  status: "needs_input" | "ready_for_execution";
  currentStepId: AssistantSiteBuilderIntakeStepId;
  nextStepId: AssistantSiteBuilderBasicIntakeStepId | null;
  nextStep: AssistantSiteBuilderBasicStepMetadata | null;
  question: AssistantPlanQuestion | null;
  visibleStepIds: readonly AssistantSiteBuilderBasicIntakeStepId[];
  answeredStepIds: AssistantSiteBuilderIntakeStepId[];
  missingRequiredStepIds: AssistantSiteBuilderBasicIntakeStepId[];
  canReview: boolean;
  canExecute: boolean;
};

export type AssistantSiteBuilderBasicStartInput = {
  prompt: string;
  requestedMode?: AssistantSiteBuilderIntakeMode | null;
  existingSession?: AssistantSiteBuilderIntakeSession | null;
  context?: AssistantActionContext | null;
};

const requiredBasicStepIds = new Set<AssistantSiteBuilderBasicIntakeStepId>([
  "business-profile",
  "site-goals",
  "site-map",
  "menu",
  "hero",
  "homepage-sections",
  "media-policy",
  "review",
]);

const basicStartIntentFamilies = new Set<string>([
  "catalog_showcase",
  "product_catalog",
  "portfolio_projects",
  "services_directory",
  "service_business_full_site",
  "lead_capture_site",
  "booking_service",
  "editorial_content_hub",
]);

const broadSitePatterns = [
  /\b(strona|strone|stronę)\s+(dla|firmowa|firmową|internetowa|internetową)\b/u,
  /\b(serwis|landing)\s+dla\b/u,
  /\b(website|site|business website|company website)\s+for\b/u,
  /\bfull[-\s]?service\b/u,
  /\b(pelnoprawny|pełnoprawny|pelny serwis|pełny serwis|kompletny serwis)\b/u,
] as const;

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasItems = (value: readonly unknown[] | undefined): boolean =>
  Array.isArray(value) && value.length > 0;

const normalizePrompt = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const hasBroadSiteSetupSignal = (prompt: string) => {
  const normalized = normalizePrompt(prompt);
  return broadSitePatterns.some((pattern) => pattern.test(normalized));
};

const isBasicStepRequired = (stepId: AssistantSiteBuilderBasicIntakeStepId) =>
  requiredBasicStepIds.has(stepId);

const buildAnswerFieldMetadata = (
  field: ReturnType<
    typeof listSiteBuilderIntakeStepDefinitionsForMode
  >[number]["answerFields"][number]
): AssistantSiteBuilderIntakeAnswerFieldMetadata => {
  const optionRegistryId = field.optionRegistryId ?? null;

  return {
    key: field.key,
    label: field.label,
    description: field.description,
    control: field.control,
    required: field.required,
    requiredGroupId: field.requiredGroupId ?? null,
    maxLength: field.maxLength ?? null,
    maxItems: field.maxItems ?? null,
    optionRegistryId,
    options: optionRegistryId
      ? listSiteBuilderIntakeOptions(optionRegistryId).map((option) => ({
          id: option.id,
          label: option.label,
          description: option.description,
        }))
      : [],
  };
};

export const getBasicSiteBuilderIntakeStepMetadata = (
  stepId: AssistantSiteBuilderBasicIntakeStepId
): AssistantSiteBuilderBasicStepMetadata => {
  const definitions = listSiteBuilderIntakeStepDefinitionsForMode("basic");
  const definition = definitions.find((item) => item.id === stepId);
  if (!definition) {
    throw new Error("assistant_basic_step_invalid");
  }
  return {
    id: stepId,
    label: definition.label,
    description: definition.description,
    required: isBasicStepRequired(stepId),
    optionRegistryId: definition.optionRegistryId ?? null,
    position: BASIC_SITE_BUILDER_INTAKE_STEP_IDS.indexOf(stepId) + 1,
    total: BASIC_SITE_BUILDER_INTAKE_STEP_IDS.length,
    answerFields: definition.answerFields.map(buildAnswerFieldMetadata),
  };
};

export const listBasicSiteBuilderIntakeStepMetadata = (): AssistantSiteBuilderBasicStepMetadata[] =>
  BASIC_SITE_BUILDER_INTAKE_STEP_IDS.map(getBasicSiteBuilderIntakeStepMetadata);

const isBasicStepSatisfiedFromFacts = (
  facts: AssistantSiteBuilderIntakeFacts,
  stepId: AssistantSiteBuilderBasicIntakeStepId
) => {
  switch (stepId) {
    case "business-profile":
      return (
        [facts.siteName, facts.entityName, facts.topic, facts.summary].some(hasText) &&
        hasText(facts.locale)
      );
    case "site-goals":
      return hasItems(facts.goals);
    case "site-map":
      return hasItems(facts.pageRoles);
    case "menu":
      return Boolean(facts.menuPreset);
    case "hero":
      return Boolean(facts.heroPreset);
    case "homepage-sections":
      return hasItems(facts.sectionRoles);
    case "subpages":
      return true;
    case "media-policy":
      return Boolean(facts.mediaPolicy);
    case "review":
      return facts.readyForExecution === true;
  }
};

export const createInitialBasicSiteBuilderIntakeSession =
  (): AssistantSiteBuilderIntakeSession => ({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "basic",
    currentStepId: "business-profile",
    answers: [],
  });

export const isBasicSiteBuilderIntakeStepSatisfied = (
  session: AssistantSiteBuilderIntakeSession,
  stepId: AssistantSiteBuilderBasicIntakeStepId
): boolean => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  return isBasicStepSatisfiedFromFacts(normalized.facts ?? {}, stepId);
};

const buildQuestionForStep = (
  step: AssistantSiteBuilderBasicStepMetadata
): AssistantPlanQuestion => ({
  id: `site-builder-intake.${step.id}`,
  label: step.label,
  description: step.description,
  required: step.required,
});

const getMissingRequiredBasicStepIds = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderBasicIntakeStepId[] =>
  BASIC_SITE_BUILDER_INTAKE_STEP_IDS.filter(
    (stepId) => isBasicStepRequired(stepId) && !isBasicStepSatisfiedFromFacts(facts, stepId)
  );

export const resolveBasicNextStep = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteBuilderBasicProgression => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession({
    ...session,
    mode: "basic",
  });
  const facts = normalized.facts ?? {};
  const missingRequiredStepIds = getMissingRequiredBasicStepIds(facts);
  const nextStepId = missingRequiredStepIds[0] ?? null;
  const nextStep = nextStepId ? getBasicSiteBuilderIntakeStepMetadata(nextStepId) : null;
  const missingBeforeReview = missingRequiredStepIds.filter((stepId) => stepId !== "review");
  const canExecute = missingRequiredStepIds.length === 0 && facts.readyForExecution === true;

  return {
    schemaVersion: 1,
    mode: "basic",
    status: canExecute ? "ready_for_execution" : "needs_input",
    currentStepId: normalized.currentStepId,
    nextStepId,
    nextStep,
    question: nextStep ? buildQuestionForStep(nextStep) : null,
    visibleStepIds: BASIC_SITE_BUILDER_INTAKE_STEP_IDS,
    answeredStepIds: [...(facts.answeredStepIds ?? [])],
    missingRequiredStepIds,
    canReview: missingBeforeReview.length === 0,
    canExecute,
  };
};

const buildSiteBuilderIntakePlanMetadata = (
  progression: AssistantSiteBuilderBasicProgression
): AssistantSiteBuilderIntakePlanMetadata => ({
  schemaVersion: 1,
  mode: progression.mode,
  status: progression.status,
  currentStepId: progression.currentStepId,
  nextStepId: progression.nextStepId,
  visibleStepIds: [...progression.visibleStepIds],
  answeredStepIds: progression.answeredStepIds,
  missingRequiredStepIds: progression.missingRequiredStepIds,
  canReview: progression.canReview,
  canExecute: progression.canExecute,
  steps: listBasicSiteBuilderIntakeStepMetadata(),
});

export const buildBasicSiteBuilderNeedsInputPlan = (input: {
  session?: AssistantSiteBuilderIntakeSession | null;
}): AssistantActionPlan => {
  const progression = resolveBasicNextStep(
    input.session ?? createInitialBasicSiteBuilderIntakeSession()
  );
  const question = progression.question ?? {
    id: "site-builder-intake.review",
    label: "Review site setup",
    description: "Review the guided setup before any site plan is created.",
    required: true,
  };

  return {
    id: "site-builder-basic-intake-needs-input",
    status: "needs_input",
    intentId: "site-builder-basic-intake",
    responseKind: "needs_input",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    metadata: {
      planner: "local",
      providerDraftUsed: false,
      siteBuilderIntake: buildSiteBuilderIntakePlanMetadata(progression),
    },
    title: "Need site details before building",
    answer:
      "I will guide this setup step by step before creating any pages, content models, media choices, or executable actions.",
    summary: "The Basic site-builder intake needs more information before planning actions.",
    confidence: 0.8,
    assumptions: [
      redactAssistantText(
        "Basic guided site-builder intake is required before executable planning.",
        160
      ),
    ],
    questions: [question],
    actions: [],
  };
};

export const shouldStartBasicSiteBuilderGuide = (
  input: AssistantSiteBuilderBasicStartInput
): boolean => {
  const requestedMode =
    input.requestedMode ?? input.context?.siteBuilderIntakeState?.requestedMode ?? null;
  const existingSession =
    input.existingSession ?? input.context?.siteBuilderIntakeState?.activeSession ?? null;

  if (requestedMode === "advanced") return false;
  if (existingSession) return false;
  if (input.context?.siteKit) return false;

  const classification = classifyAssistantPrompt(input.prompt);
  if (classification.promptKind !== "setup_request") return false;
  if (!hasBroadSiteSetupSignal(input.prompt)) return false;
  return (
    basicStartIntentFamilies.has(classification.intentFamily) ||
    classification.intentFamily === "unknown"
  );
};

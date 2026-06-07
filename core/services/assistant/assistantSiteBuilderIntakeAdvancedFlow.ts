import type {
  AssistantActionPlan,
  AssistantPlanQuestion,
  AssistantSiteBuilderIntakePlanMetadata,
  AssistantSiteBuilderIntakeStepMetadata,
} from "./actionPlanTypes";
import { redactAssistantText } from "./assistantRedaction";
import { normalizeAssistantSiteBuilderIntakeSession } from "./assistantSiteBuilderIntakeNormalizer";
import { listSiteBuilderIntakeStepDefinitionsForMode } from "./assistantSiteBuilderIntakeRegistry";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeFacts,
  type AssistantSiteBuilderIntakeSession,
  type AssistantSiteBuilderIntakeStepId,
} from "./assistantSiteBuilderIntakeTypes";
import { buildSiteBuilderIntakeAnswerFieldMetadata } from "./assistantSiteBuilderIntakePlanMetadata";

export const ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS = Object.freeze(
  listSiteBuilderIntakeStepDefinitionsForMode("advanced").map((definition) => definition.id)
) as readonly AssistantSiteBuilderIntakeStepId[];

export type AssistantSiteBuilderAdvancedProgression = {
  schemaVersion: 1;
  mode: "advanced";
  status: "needs_input" | "ready_for_execution";
  currentStepId: AssistantSiteBuilderIntakeStepId;
  nextStepId: AssistantSiteBuilderIntakeStepId | null;
  nextStep: AssistantSiteBuilderIntakeStepMetadata | null;
  question: AssistantPlanQuestion | null;
  visibleStepIds: readonly AssistantSiteBuilderIntakeStepId[];
  answeredStepIds: AssistantSiteBuilderIntakeStepId[];
  missingRequiredStepIds: AssistantSiteBuilderIntakeStepId[];
  canReview: boolean;
  canExecute: boolean;
};

const requiredAdvancedStepIds = new Set<AssistantSiteBuilderIntakeStepId>(
  listSiteBuilderIntakeStepDefinitionsForMode("advanced")
    .filter((definition) => definition.required)
    .map((definition) => definition.id)
);

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasItems = (value: readonly unknown[] | undefined): boolean =>
  Array.isArray(value) && value.length > 0;

const isAdvancedStepRequired = (stepId: AssistantSiteBuilderIntakeStepId) =>
  requiredAdvancedStepIds.has(stepId);

export const getAdvancedSiteBuilderIntakeStepMetadata = (
  stepId: AssistantSiteBuilderIntakeStepId
): AssistantSiteBuilderIntakeStepMetadata => {
  const definitions = listSiteBuilderIntakeStepDefinitionsForMode("advanced");
  const definition = definitions.find((item) => item.id === stepId);
  if (!definition) {
    throw new Error("assistant_advanced_step_invalid");
  }

  return {
    id: stepId,
    label: definition.label,
    description: definition.description,
    required: isAdvancedStepRequired(stepId),
    optionRegistryId: definition.optionRegistryId ?? null,
    position: ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS.indexOf(stepId) + 1,
    total: ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS.length,
    answerFields: definition.answerFields.map(buildSiteBuilderIntakeAnswerFieldMetadata),
  };
};

export const listAdvancedSiteBuilderIntakeStepMetadata =
  (): AssistantSiteBuilderIntakeStepMetadata[] =>
    ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS.map(getAdvancedSiteBuilderIntakeStepMetadata);

const isAdvancedStepSatisfiedFromFacts = (
  facts: AssistantSiteBuilderIntakeFacts,
  stepId: AssistantSiteBuilderIntakeStepId
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
    case "media-policy":
      return Boolean(facts.mediaPolicy);
    case "review":
      return facts.readyForExecution === true;
    case "subpages":
    case "content-engine":
    case "design-preset":
    case "reference-intake":
      return true;
  }
};

export const createInitialAdvancedSiteBuilderIntakeSession =
  (): AssistantSiteBuilderIntakeSession => ({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "advanced",
    currentStepId: "business-profile",
    answers: [],
  });

export const isAdvancedSiteBuilderIntakeStepSatisfied = (
  session: AssistantSiteBuilderIntakeSession,
  stepId: AssistantSiteBuilderIntakeStepId
): boolean => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession({
    ...session,
    mode: "advanced",
  });
  return isAdvancedStepSatisfiedFromFacts(normalized.facts ?? {}, stepId);
};

const buildQuestionForStep = (
  step: AssistantSiteBuilderIntakeStepMetadata
): AssistantPlanQuestion => ({
  id: `site-builder-intake.${step.id}`,
  label: step.label,
  description: step.description,
  required: step.required,
});

const getMissingRequiredAdvancedStepIds = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderIntakeStepId[] =>
  ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS.filter(
    (stepId) => isAdvancedStepRequired(stepId) && !isAdvancedStepSatisfiedFromFacts(facts, stepId)
  );

const resolveAdvancedNextStepId = (
  currentStepId: AssistantSiteBuilderIntakeStepId,
  missingRequiredStepIds: readonly AssistantSiteBuilderIntakeStepId[],
  canReview: boolean,
  canExecute: boolean
): AssistantSiteBuilderIntakeStepId | null => {
  if (canExecute) return null;
  const missingBeforeReview = missingRequiredStepIds.filter((stepId) => stepId !== "review");
  if (missingBeforeReview.length > 0) return missingBeforeReview[0] ?? null;
  if (canReview && !isAdvancedStepRequired(currentStepId)) return currentStepId;
  return missingRequiredStepIds.includes("review") ? "review" : null;
};

export const resolveAdvancedNextStep = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteBuilderAdvancedProgression => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession({
    ...session,
    mode: "advanced",
  });
  const facts = normalized.facts ?? {};
  const missingRequiredStepIds = getMissingRequiredAdvancedStepIds(facts);
  const missingBeforeReview = missingRequiredStepIds.filter((stepId) => stepId !== "review");
  const canReview = missingBeforeReview.length === 0;
  const canExecute = missingRequiredStepIds.length === 0 && facts.readyForExecution === true;
  const nextStepId = resolveAdvancedNextStepId(
    normalized.currentStepId,
    missingRequiredStepIds,
    canReview,
    canExecute
  );
  const nextStep = nextStepId ? getAdvancedSiteBuilderIntakeStepMetadata(nextStepId) : null;

  return {
    schemaVersion: 1,
    mode: "advanced",
    status: canExecute ? "ready_for_execution" : "needs_input",
    currentStepId: normalized.currentStepId,
    nextStepId,
    nextStep,
    question: nextStep ? buildQuestionForStep(nextStep) : null,
    visibleStepIds: ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS,
    answeredStepIds: [...(facts.answeredStepIds ?? [])],
    missingRequiredStepIds,
    canReview,
    canExecute,
  };
};

const buildSiteBuilderIntakePlanMetadata = (
  progression: AssistantSiteBuilderAdvancedProgression
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
  steps: listAdvancedSiteBuilderIntakeStepMetadata(),
});

export const buildAdvancedSiteBuilderNeedsInputPlan = (input: {
  session?: AssistantSiteBuilderIntakeSession | null;
}): AssistantActionPlan => {
  const progression = resolveAdvancedNextStep(
    input.session ?? createInitialAdvancedSiteBuilderIntakeSession()
  );
  const question = progression.question ?? {
    id: "site-builder-intake.review",
    label: "Review site setup",
    description: "Review the guided setup before any site plan is created.",
    required: true,
  };

  return {
    id: "site-builder-advanced-intake-needs-input",
    status: "needs_input",
    intentId: "site-builder-advanced-intake",
    responseKind: "needs_input",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    metadata: {
      planner: "local",
      providerDraftUsed: false,
      siteBuilderIntake: buildSiteBuilderIntakePlanMetadata(progression),
    },
    title: "Need advanced site details before building",
    answer:
      "I will keep the advanced setup structured and reviewed before creating pages, content models, media choices, or executable actions.",
    summary: "The Advanced site-builder intake needs reviewed information before planning actions.",
    confidence: 0.8,
    assumptions: [
      redactAssistantText(
        "Advanced guided site-builder intake is required before executable planning.",
        160
      ),
    ],
    questions: [question],
    actions: [],
  };
};

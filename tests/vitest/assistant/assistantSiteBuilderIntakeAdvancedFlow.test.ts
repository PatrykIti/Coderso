import { expect, test } from "vitest";

import {
  ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS,
  buildAdvancedSiteBuilderNeedsInputPlan,
  listAdvancedSiteBuilderIntakeStepMetadata,
  resolveAdvancedNextStep,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeAdvancedFlow";
import {
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeAnswer,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

const advancedAnswer = (
  stepId: AssistantSiteBuilderIntakeAnswer["stepId"],
  values: Record<string, unknown>
): AssistantSiteBuilderIntakeAnswer => ({
  stepId,
  values,
});

const createAdvancedSession = (
  answers: AssistantSiteBuilderIntakeAnswer[],
  currentStepId: AssistantSiteBuilderIntakeSession["currentStepId"] = "business-profile"
): AssistantSiteBuilderIntakeSession => ({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "advanced",
  currentStepId,
  answers,
});

const completeAdvancedRequiredAnswers = (): AssistantSiteBuilderIntakeAnswer[] => [
  advancedAnswer("business-profile", {
    siteName: "Studio Lokalne",
    topic: "uslugi, poradniki i kontakt",
    locale: "pl",
  }),
  advancedAnswer("site-goals", {
    goals: ["pokazac oferte", "zbierac zapytania"],
    primaryGoal: "zbierac zapytania",
  }),
  advancedAnswer("site-map", {
    pageRoles: ["home", "services", "blog", "contact"],
  }),
  advancedAnswer("menu", {
    menuPreset: "simple",
    primaryActionPageRole: "contact",
    advancedMenuBehaviorIds: ["sticky", "mobile-drawer"],
    advancedCtaTargetPageRole: "contact",
  }),
  advancedAnswer("hero", {
    heroPreset: "copy-first",
    headline: "Prosta strona dla lokalnej firmy",
    advancedHeroVariantId: "split",
  }),
  advancedAnswer("homepage-sections", {
    sectionRoles: ["value-proposition", "services-overview", "lead-capture"],
    advancedSectionVariantIds: ["services-overview-cards", "lead-capture-standard"],
  }),
  advancedAnswer("media-policy", {
    mediaPolicy: "curated",
  }),
];

test("Advanced intake exposes full server-owned visible step order", () => {
  expect(ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS).toEqual([
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
  ]);

  expect(listAdvancedSiteBuilderIntakeStepMetadata()).toMatchObject([
    { id: "business-profile", position: 1, required: true },
    { id: "site-goals", position: 2, required: true },
    { id: "site-map", position: 3, required: true },
    { id: "menu", position: 4, required: true },
    { id: "hero", position: 5, required: true },
    { id: "homepage-sections", position: 6, required: true },
    { id: "subpages", position: 7, required: false },
    { id: "media-policy", position: 8, required: true },
    { id: "content-engine", position: 9, required: false },
    { id: "design-preset", position: 10, required: false },
    { id: "reference-intake", position: 11, required: false },
    { id: "review", position: 12, required: true },
  ]);
});

test("Advanced intake metadata includes controlled Advanced fields and option catalogs", () => {
  const metadata = listAdvancedSiteBuilderIntakeStepMetadata();
  const menu = metadata.find((step) => step.id === "menu");
  const hero = metadata.find((step) => step.id === "hero");
  const sections = metadata.find((step) => step.id === "homepage-sections");
  const designPreset = metadata.find((step) => step.id === "design-preset");
  const reference = metadata.find((step) => step.id === "reference-intake");

  expect(menu?.answerFields.map((field) => field.key)).toContain("advancedMenuBehaviorIds");
  expect(
    menu?.answerFields.find((field) => field.key === "advancedMenuBehaviorIds")?.options
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "sticky",
      }),
    ])
  );
  expect(hero?.answerFields.map((field) => field.key)).toContain("advancedHeroVariantId");
  expect(sections?.answerFields.map((field) => field.key)).toContain("advancedSectionVariantIds");
  expect(designPreset?.answerFields.find((field) => field.key === "designPresetId")).toMatchObject({
    control: "select",
    optionRegistryId: "designPresets",
  });
  expect(reference?.answerFields.map((field) => field.key)).toEqual([
    "referenceNotes",
    "referenceLabels",
    "referenceIds",
    "mediaAssetIds",
    "temporaryReferenceIds",
    "textBrief",
  ]);
});

test("resolveAdvancedNextStep allows optional Advanced controls after required review inputs", () => {
  const progression = resolveAdvancedNextStep(
    createAdvancedSession(completeAdvancedRequiredAnswers(), "design-preset")
  );

  expect(progression).toMatchObject({
    schemaVersion: 1,
    mode: "advanced",
    status: "needs_input",
    currentStepId: "design-preset",
    nextStepId: "design-preset",
    canReview: true,
    canExecute: false,
  });
  expect(progression.missingRequiredStepIds).toEqual(["review"]);
  expect(progression.question).toMatchObject({
    id: "site-builder-intake.design-preset",
    required: false,
  });
});

test("buildAdvancedSiteBuilderNeedsInputPlan normalizes typed Advanced metadata", () => {
  const plan = normalizeAssistantActionPlan(buildAdvancedSiteBuilderNeedsInputPlan({}));

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "needs_input",
    actions: [],
    metadata: {
      planner: "local",
      providerDraftUsed: false,
      siteBuilderIntake: {
        schemaVersion: 1,
        mode: "advanced",
        nextStepId: "business-profile",
        canExecute: false,
      },
    },
  });
  expect(plan.metadata?.siteBuilderIntake?.steps.map((step) => step.id)).toEqual([
    ...ADVANCED_SITE_BUILDER_INTAKE_STEP_IDS,
  ]);
});

test("planAssistantActions starts and continues explicit Advanced intake state", () => {
  const requestedAdvancedPlan = planAssistantActions({
    prompt: "create a website for my clinic",
    context: {
      siteBuilderIntakeState: {
        requestedMode: "advanced",
      },
    },
  });

  expect(requestedAdvancedPlan.intentId).toBe("site-builder-advanced-intake");
  expect(requestedAdvancedPlan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "advanced",
    nextStepId: "business-profile",
  });

  const activeAdvancedPlan = planAssistantActions({
    prompt: "continue the reviewed advanced setup",
    context: {
      siteBuilderIntakeState: {
        activeSession: createAdvancedSession(completeAdvancedRequiredAnswers(), "design-preset"),
      },
    },
  });

  expect(activeAdvancedPlan.intentId).toBe("site-builder-advanced-intake");
  expect(activeAdvancedPlan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "advanced",
    currentStepId: "design-preset",
    nextStepId: "design-preset",
  });
});

test("planAssistantActionsWithProviderDraft honors explicit Advanced intake state", async () => {
  const advancedPlan = await planAssistantActionsWithProviderDraft({
    prompt: "create a website for my clinic",
    context: {
      siteBuilderIntakeState: {
        requestedMode: "advanced",
      },
    },
    provider: null,
    llmAvailable: false,
  });

  expect(advancedPlan.intentId).toBe("site-builder-advanced-intake");
  expect(advancedPlan.metadata?.siteBuilderIntake?.mode).toBe("advanced");
});

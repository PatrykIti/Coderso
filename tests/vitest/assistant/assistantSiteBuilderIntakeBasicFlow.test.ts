import { expect, test } from "vitest";

import {
  BASIC_SITE_BUILDER_INTAKE_STEP_IDS,
  buildBasicSiteBuilderNeedsInputPlan,
  listBasicSiteBuilderIntakeStepMetadata,
  resolveBasicNextStep,
  shouldStartBasicSiteBuilderGuide,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
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

const basicAnswer = (
  stepId: AssistantSiteBuilderIntakeAnswer["stepId"],
  values: Record<string, unknown>
): AssistantSiteBuilderIntakeAnswer => ({
  stepId,
  values,
});

const createBasicSession = (
  answers: AssistantSiteBuilderIntakeAnswer[],
  currentStepId: AssistantSiteBuilderIntakeSession["currentStepId"] = "business-profile"
): AssistantSiteBuilderIntakeSession => ({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "basic",
  currentStepId,
  answers,
});

const completeBasicAnswers = (): AssistantSiteBuilderIntakeAnswer[] => [
  basicAnswer("business-profile", {
    siteName: "Studio Lokalne",
    topic: "uslugi, poradniki i kontakt",
    locale: "pl",
  }),
  basicAnswer("site-goals", {
    goals: ["pokazac oferte", "zbierac zapytania"],
    primaryGoal: "zbierac zapytania",
  }),
  basicAnswer("site-map", {
    pageRoles: ["home", "services", "blog", "contact"],
  }),
  basicAnswer("menu", {
    menuPreset: "simple",
    primaryActionPageRole: "contact",
  }),
  basicAnswer("hero", {
    heroPreset: "copy-first",
    headline: "Prosta strona dla lokalnej firmy",
  }),
  basicAnswer("homepage-sections", {
    sectionRoles: ["value-proposition", "services-overview", "lead-capture"],
  }),
  basicAnswer("media-policy", {
    mediaPolicy: "curated",
  }),
];

test("Basic intake exposes beginner-safe visible step order", () => {
  expect(BASIC_SITE_BUILDER_INTAKE_STEP_IDS).toEqual([
    "business-profile",
    "site-goals",
    "site-map",
    "menu",
    "hero",
    "homepage-sections",
    "subpages",
    "media-policy",
    "review",
  ]);

  expect(listBasicSiteBuilderIntakeStepMetadata()).toMatchObject([
    { id: "business-profile", position: 1, required: true },
    { id: "site-goals", position: 2, required: true },
    { id: "site-map", position: 3, required: true },
    { id: "menu", position: 4, required: true },
    { id: "hero", position: 5, required: true },
    { id: "homepage-sections", position: 6, required: true },
    { id: "subpages", position: 7, required: false },
    { id: "media-policy", position: 8, required: true },
    { id: "review", position: 9, required: true },
  ]);
});

test("Basic intake metadata exposes answer fields and registry options for UI rendering", () => {
  const metadata = listBasicSiteBuilderIntakeStepMetadata();
  const businessProfile = metadata.find((step) => step.id === "business-profile");
  const siteMap = metadata.find((step) => step.id === "site-map");
  const review = metadata.find((step) => step.id === "review");

  expect(businessProfile?.answerFields.map((field) => field.key)).toEqual([
    "siteName",
    "entityName",
    "topic",
    "vertical",
    "audience",
    "locale",
    "region",
    "summary",
    "offerSummary",
  ]);
  expect(businessProfile?.answerFields.find((field) => field.key === "locale")).toMatchObject({
    control: "text",
    required: true,
    maxLength: 16,
  });
  expect(
    businessProfile?.answerFields
      .filter((field) => field.requiredGroupId === "profileIdentity")
      .map((field) => field.key)
  ).toEqual(["siteName", "entityName", "topic", "summary"]);

  expect(siteMap?.answerFields).toHaveLength(2);
  expect(siteMap?.answerFields[0]).toMatchObject({
    key: "pageRoles",
    control: "multi_select",
    required: true,
    optionRegistryId: "pageRoles",
  });
  expect(siteMap?.answerFields[0]?.options.map((option) => option.id)).toContain("services");
  expect(siteMap?.answerFields[1]).toMatchObject({
    key: "customLabels",
    control: "label_map",
    required: false,
    optionRegistryId: "pageRoles",
  });

  expect(review?.answerFields.find((field) => field.key === "confirmed")).toMatchObject({
    control: "checkbox",
    required: true,
  });
});

test("resolveBasicNextStep starts empty sessions at business profile", () => {
  const progression = resolveBasicNextStep(createBasicSession([]));

  expect(progression).toMatchObject({
    schemaVersion: 1,
    mode: "basic",
    status: "needs_input",
    nextStepId: "business-profile",
    canReview: false,
    canExecute: false,
  });
  expect(progression.question).toMatchObject({
    id: "site-builder-intake.business-profile",
    required: true,
  });
});

test("resolveBasicNextStep advances through missing required Basic steps", () => {
  const progression = resolveBasicNextStep(
    createBasicSession([completeBasicAnswers()[0], completeBasicAnswers()[1]])
  );

  expect(progression.nextStepId).toBe("site-map");
  expect(progression.missingRequiredStepIds).toEqual([
    "site-map",
    "menu",
    "hero",
    "homepage-sections",
    "media-policy",
    "review",
  ]);
  expect(progression.canReview).toBe(false);
});

test("resolveBasicNextStep keeps profile open until locale is available", () => {
  const progression = resolveBasicNextStep(
    createBasicSession([
      basicAnswer("business-profile", {
        siteName: "Studio bez locale",
        topic: "local services",
      }),
      ...completeBasicAnswers().slice(1),
    ])
  );

  expect(progression.nextStepId).toBe("business-profile");
  expect(progression.missingRequiredStepIds).toContain("business-profile");
  expect(progression.canReview).toBe(false);
});

test("resolveBasicNextStep routes complete Basic answers to review before execution", () => {
  const progression = resolveBasicNextStep(createBasicSession(completeBasicAnswers(), "review"));

  expect(progression).toMatchObject({
    status: "needs_input",
    nextStepId: "review",
    canReview: true,
    canExecute: false,
  });
  expect(progression.missingRequiredStepIds).toEqual(["review"]);
  expect(progression.question).toMatchObject({
    id: "site-builder-intake.review",
  });
});

test("resolveBasicNextStep is execution-ready only after explicit review confirmation", () => {
  const progression = resolveBasicNextStep(
    createBasicSession(
      [
        ...completeBasicAnswers(),
        basicAnswer("review", {
          confirmed: true,
        }),
      ],
      "review"
    )
  );

  expect(progression).toMatchObject({
    status: "ready_for_execution",
    nextStepId: null,
    nextStep: null,
    question: null,
    missingRequiredStepIds: [],
    canReview: true,
    canExecute: true,
  });
});

test("shouldStartBasicSiteBuilderGuide starts broad nontechnical setup prompts", () => {
  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "zrob mi pelny serwis dla salonu fryzjerskiego, nie znam cms",
    })
  ).toBe(true);

  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "create a website for my ceramics workshops",
    })
  ).toBe(true);
});

test("shouldStartBasicSiteBuilderGuide does not steal advanced, resumed, siteKit, or docs prompts", () => {
  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "create a website for my clinic",
      requestedMode: "advanced",
    })
  ).toBe(false);

  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "create a website for my clinic",
      existingSession: createBasicSession([]),
    })
  ).toBe(false);

  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "create a website for my clinic",
      context: {
        siteKit: {
          businessType: "custom",
          goals: ["lead_generation"],
          locale: "en",
        },
      },
    })
  ).toBe(false);

  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "potrzebuje katalogu produktow",
    })
  ).toBe(false);

  expect(
    shouldStartBasicSiteBuilderGuide({
      prompt: "gdzie zmienie kolory hero widgetu?",
    })
  ).toBe(false);
});

test("buildBasicSiteBuilderNeedsInputPlan normalizes typed site-builder intake metadata", () => {
  const plan = normalizeAssistantActionPlan(buildBasicSiteBuilderNeedsInputPlan({}));

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "needs_input",
    actions: [],
    metadata: {
      planner: "local",
      providerDraftUsed: false,
      siteBuilderIntake: {
        schemaVersion: 1,
        mode: "basic",
        nextStepId: "business-profile",
        canExecute: false,
      },
    },
  });
  expect(plan.metadata?.siteBuilderIntake?.steps.map((step) => step.id)).toEqual([
    ...BASIC_SITE_BUILDER_INTAKE_STEP_IDS,
  ]);
  const menu = plan.metadata?.siteBuilderIntake?.steps.find((step) => step.id === "menu");
  const hero = plan.metadata?.siteBuilderIntake?.steps.find((step) => step.id === "hero");
  const sections = plan.metadata?.siteBuilderIntake?.steps.find(
    (step) => step.id === "homepage-sections"
  );
  expect(menu?.answerFields.map((field) => field.key)).not.toContain("advancedMenuBehaviorIds");
  expect(hero?.answerFields.map((field) => field.key)).not.toContain("advancedHeroVariantId");
  expect(sections?.answerFields.map((field) => field.key)).not.toContain(
    "advancedSectionVariantIds"
  );
});

test("planAssistantActions routes broad Basic setup prompts to needs_input without actions or secret echoes", () => {
  const plan = planAssistantActions({
    prompt: "zrob mi strone dla salonu, api key: sk-or-v1-1234567890abcdef",
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
  expect(plan.actions).toEqual([]);
  expect(plan.questions[0]?.id).toBe("site-builder-intake.business-profile");
  expect(plan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "basic",
    nextStepId: "business-profile",
    canExecute: false,
  });
  expect(serialized).not.toContain("sk-or-v1-1234567890abcdef");
});

test("planAssistantActions continues an active Basic intake session instead of restarting it", () => {
  const plan = planAssistantActions({
    prompt: "dalej zrob mi pelny serwis dla tej firmy",
    context: {
      siteBuilderIntakeState: {
        activeSession: createBasicSession([completeBasicAnswers()[0]], "site-goals"),
      },
    },
  });

  expect(plan.intentId).toBe("site-builder-basic-intake");
  expect(plan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "basic",
    currentStepId: "site-goals",
    nextStepId: "site-goals",
  });
});

test("planAssistantActions routes explicit Advanced intake state before Basic broad-prompt routing", () => {
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
    prompt: "create a website for my clinic",
    context: {
      siteBuilderIntakeState: {
        activeSession: {
          version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
          mode: "advanced",
          currentStepId: "design-preset",
          answers: [],
        },
      },
    },
  });

  expect(activeAdvancedPlan.intentId).toBe("site-builder-advanced-intake");
  expect(activeAdvancedPlan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "advanced",
    currentStepId: "design-preset",
    nextStepId: "business-profile",
  });
});

test("planAssistantActionsWithProviderDraft honors Advanced and active Basic intake state", async () => {
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

  const basicPlan = await planAssistantActionsWithProviderDraft({
    prompt: "dalej zrob mi pelny serwis dla tej firmy",
    context: {
      siteBuilderIntakeState: {
        activeSession: createBasicSession([completeBasicAnswers()[0]], "site-goals"),
      },
    },
    provider: null,
    llmAvailable: false,
  });

  expect(basicPlan.intentId).toBe("site-builder-basic-intake");
  expect(basicPlan.metadata?.siteBuilderIntake?.nextStepId).toBe("site-goals");
});

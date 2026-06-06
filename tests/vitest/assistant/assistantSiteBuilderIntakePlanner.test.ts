import { expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import {
  buildActionPlanRequestFromReviewedIntake,
  buildSiteBuilderIntakeCompileResult,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
import { buildReviewedContentEngineActionPlanFromIntake } from "../../../core/services/assistant/assistantSiteBuilderIntakeContentEnginePlans";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  buildReviewedSiteKitStaticPlan,
  type AssistantSiteBuilderStaticPlanResult,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeStaticActions";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";

const reviewedServicesDirectorySession = withConfirmedSiteBuilderIntakeReview({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "advanced",
  currentStepId: "review",
  answers: [
    {
      stepId: "business-profile",
      values: {
        siteName: "Provider Finder",
        topic: "local service providers with a searchable directory",
        vertical: "services directory",
        audience: "people comparing verified local providers",
        locale: "en",
        region: "Austin",
        summary: "Create a practical directory that non-technical editors can maintain.",
      },
    },
    {
      stepId: "site-goals",
      values: {
        goals: ["show services", "collect qualified leads", "publish provider listings"],
        primaryGoal: "collect qualified leads",
      },
    },
    {
      stepId: "site-map",
      values: {
        pageRoles: ["home", "services", "locations", "contact"],
      },
    },
    {
      stepId: "menu",
      values: {
        menuPreset: "location-aware",
        primaryActionLabel: "Submit request",
        primaryActionPageRole: "contact",
      },
    },
    {
      stepId: "homepage-sections",
      values: {
        sectionRoles: ["value-proposition", "services-overview", "featured-items", "lead-capture"],
      },
    },
    {
      stepId: "hero",
      values: {
        heroPreset: "location-led",
        headline: "Find the right local provider",
      },
    },
    {
      stepId: "subpages",
      values: {
        pageRoles: ["about", "faq"],
      },
    },
    {
      stepId: "media-policy",
      values: {
        mediaPolicy: "placeholder",
      },
    },
    {
      stepId: "content-engine",
      values: {
        contentEngines: ["services", "locations", "faq"],
      },
    },
  ],
} satisfies AssistantSiteBuilderIntakeSession);

const buildReviewedPlan = (): AssistantSiteBuilderStaticPlanResult => {
  const request = buildActionPlanRequestFromReviewedIntake(reviewedServicesDirectorySession);
  const plan = planAssistantActions(request);
  return buildReviewedSiteKitStaticPlan(plan, request.context.siteKit);
};

const samePlanLocators = (result: AssistantSiteBuilderStaticPlanResult) =>
  result.coverage.samePlanResourceKeys;

test("reviewed intake siteKit plan is strict and idempotent", () => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(reviewedServicesDirectorySession);
  const compileResult = buildSiteBuilderIntakeCompileResult(normalized.facts ?? {});
  const request = buildActionPlanRequestFromReviewedIntake(reviewedServicesDirectorySession);
  const first = buildReviewedPlan();
  const second = buildReviewedPlan();
  const serializedPlan = JSON.stringify(first.plan);

  expect(compileResult.gates).toEqual([]);
  expect(compileResult.reviewFacts.contentEngineDecisions.decisions.map((item) => item.id)).toEqual(
    ["services", "locations", "faq"]
  );
  expect(
    compileResult.reviewFacts.customScreenDecisions.candidates.map(
      (candidate) => candidate.engineId
    )
  ).toEqual(["services", "locations", "faq"]);
  expect(request.context.siteKit).toEqual({
    businessType: "services_directory",
    goals: ["lead_generation", "catalog_showcase", "collect_qualified_leads"],
    locale: "en",
    region: "Austin",
    siteName: "Provider Finder",
    preferredKitId: "services-directory",
    selectedKitId: "services-directory",
    enabledStepIds: ["settings", "content-model", "pages", "forms", "navigation", "qa"],
  });
  expect(normalizeAssistantActionPlan(first.plan)).toEqual(first.plan);
  expect(first.coverage).toEqual(second.coverage);
  expect(first.plan.actions).toEqual(second.plan.actions);
  expect(samePlanLocators(first)).toEqual(samePlanLocators(second));
  expect(new Set(samePlanLocators(first)).size).toBe(first.coverage.samePlanResourceKeys.length);
  expect(first.coverage.samePlanResourceKeys).toEqual(
    expect.arrayContaining([
      "content_type:provider",
      "page:directory",
      "form:directory-inquiry",
      "menu:primary",
    ])
  );
  expect(serializedPlan).not.toContain("contentEngineDecisions");
  expect(serializedPlan).not.toContain("customScreenDecisions");
  expect(serializedPlan).not.toContain("non-technical editors");
});

test("reviewed intake content-engine decisions select an executable catalog plan", () => {
  const result = buildReviewedContentEngineActionPlanFromIntake(reviewedServicesDirectorySession);

  expect(result.engineId).toBe("services");
  expect(
    result.compileResult.reviewFacts.contentEngineDecisions.decisions.map((item) => item.id)
  ).toEqual(["services", "locations", "faq"]);
  expect(normalizeAssistantActionPlan(result.plan)).toEqual(result.plan);
  expect(result.plan.intentId).toBe("services-directory");
  expect(result.plan.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
});

test("reviewed intake generated install payloads reject unknown fields before dry-run", () => {
  const result = buildReviewedPlan();
  const planWithUnknownPreviewField = JSON.parse(JSON.stringify(result.plan));
  const installAction = planWithUnknownPreviewField.actions.find(
    (action: { type?: string }) => action.type === "site-kit.install"
  );

  installAction.input.unexpected = true;

  expect(() => normalizeAssistantActionPlan(planWithUnknownPreviewField)).toThrow(
    "assistant_action_plan_invalid"
  );
});

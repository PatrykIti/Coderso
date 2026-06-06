import { expect, test } from "bun:test";

import { dryRunAssistantActionPlan } from "../../../core/services/assistant/actionExecutorService";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildActionPlanRequestFromReviewedIntake } from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
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

test("reviewed intake siteKit dry-run is idempotent", async () => {
  const request = buildActionPlanRequestFromReviewedIntake(reviewedServicesDirectorySession);
  const plan = planAssistantActions(request);
  const first = await dryRunAssistantActionPlan({ plan });
  const second = await dryRunAssistantActionPlan({ plan });

  expect(first.readyToExecute).toBe(true);
  expect(first.plan).toEqual(second.plan);
  expect(first.warnings).toEqual(second.warnings);
  expect(first.changes).toEqual(second.changes);
  expect(first.changes.map((change) => change.targetType)).toEqual(["site-kit", "site-kit"]);
  expect(first.changes.map((change) => change.targetKey)).toEqual([
    "services-directory",
    "services-directory",
  ]);
  expect(first.changes.every((change) => change.conflicts.length === 0)).toBe(true);
});

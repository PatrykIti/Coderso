import { expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import {
  buildReviewedSiteKitStaticPlan,
  type AssistantSiteBuilderStaticCoverageGate,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeStaticActions";
import { AssistantSiteBuilderIntakeError } from "../../../core/services/assistant/assistantSiteBuilderIntakeErrors";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
  AssistantSiteKitPlanInput,
} from "../../../core/services/assistant/actionPlanTypes";
import type { GuidedSiteBuilderAction } from "../../../core/services/assistant/siteBuilderPlanAdapter";

const servicesDirectorySiteKit = {
  businessType: "services_directory",
  goals: ["lead_generation", "catalog_showcase", "collect_qualified_leads"],
  locale: "pl",
  region: "Krakow",
  siteName: "Mapa Kawy",
  preferredKitId: "services-directory",
  selectedKitId: "services-directory",
  enabledStepIds: ["settings", "content-model", "pages", "forms", "navigation", "qa"],
} satisfies AssistantSiteKitPlanInput;

type SiteKitInstallAction = Extract<AssistantPlannedAction, { type: "site-kit.install" }>;

const getInstallAction = (plan: AssistantActionPlan): SiteKitInstallAction => {
  const action = plan.actions.find((candidate) => candidate.type === "site-kit.install");
  if (!action || action.type !== "site-kit.install") {
    throw new Error("site_kit_install_action_missing");
  }
  return action;
};

const planSiteKitActions = (siteKit: AssistantSiteKitPlanInput = servicesDirectorySiteKit) =>
  planAssistantActions({
    prompt: "Create a complete reviewed site from the selected SiteKit.",
    context: { siteKit },
  });

const clonePlan = (plan: AssistantActionPlan): AssistantActionPlan =>
  JSON.parse(JSON.stringify(plan)) as AssistantActionPlan;

const buildCoverageFromProductionPlan = (
  siteKit: AssistantSiteKitPlanInput = servicesDirectorySiteKit
) => {
  const plan = planSiteKitActions(siteKit);
  return buildReviewedSiteKitStaticPlan(plan, siteKit);
};

const expectStaticCoverageGate = (
  plan: AssistantActionPlan,
  expected: Partial<AssistantSiteBuilderStaticCoverageGate>
) => {
  try {
    buildReviewedSiteKitStaticPlan(plan, servicesDirectorySiteKit);
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantSiteBuilderIntakeError);
    const gates = (error as AssistantSiteBuilderIntakeError).details
      .gates as AssistantSiteBuilderStaticCoverageGate[];

    expect(gates).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
    return;
  }

  throw new Error("Expected static coverage gate.");
};

test("buildReviewedSiteKitStaticPlan covers static pages navigation lead capture and SEO through site-kit actions", () => {
  const result = buildCoverageFromProductionPlan();
  const installAction = getInstallAction(result.plan);
  const preview = installAction.input.preview;

  expect(result.plan.actions.map((action) => action.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
  expect(normalizeAssistantActionPlan(result.plan)).toEqual(result.plan);
  expect(result.gates).toEqual([]);
  expect(result.coverage).toMatchObject({
    schemaVersion: 1,
    selectedKitId: "services-directory",
    enabledStepIds: ["settings", "content-model", "pages", "forms", "navigation", "qa"],
  });
  expect(result.coverage.targets).toEqual([
    "content_type",
    "form",
    "menu",
    "page",
    "qa",
    "settings",
    "template",
  ]);
  expect(result.coverage.pageResourceKeys).toEqual(["directory", "home", "submit"]);
  expect(result.coverage.menuResourceKeys).toEqual(["footer", "primary"]);
  expect(result.coverage.formResourceKeys).toEqual(["directory-inquiry"]);
  expect(result.coverage.seoPageSlugs).toEqual(["directory", "home", "submit"]);
  expect(result.coverage.samePlanResourceKeys).toHaveLength(preview.actions.length);
  expect(result.coverage.samePlanResourceKeys).toEqual(
    expect.arrayContaining(["page:home", "menu:primary", "menu:footer", "form:directory-inquiry"])
  );
});

test("buildReviewedSiteKitStaticPlan is idempotent and keeps raw intake facts out of the strict action payload", () => {
  const siteKitWithExtraFact = {
    ...servicesDirectorySiteKit,
    mediaPolicy: "curated",
    siteBuilderIntake: { rawPrompt: "Prepare reviewed static site shell from guided intake." },
  } as AssistantSiteKitPlanInput;

  const first = buildCoverageFromProductionPlan(siteKitWithExtraFact);
  const second = buildCoverageFromProductionPlan(siteKitWithExtraFact);
  const installAction = getInstallAction(first.plan);
  const serializedPlan = JSON.stringify(first.plan);

  expect(first.coverage).toEqual(second.coverage);
  expect(first.plan.actions.map((action) => action.id)).toEqual(
    second.plan.actions.map((action) => action.id)
  );
  expect(first.coverage.actionIds).toEqual(second.coverage.actionIds);
  expect(installAction.input).not.toHaveProperty("mediaPolicy");
  expect(serializedPlan).not.toContain("siteBuilderIntake");
  expect(serializedPlan).not.toContain("rawPrompt");
  expect(serializedPlan).not.toContain("Prepare reviewed static site shell");
});

test("buildReviewedSiteKitStaticPlan output still rejects unknown install fields through strict schemas", () => {
  const result = buildCoverageFromProductionPlan();
  const planWithUnknownInstallField = JSON.parse(
    JSON.stringify(result.plan)
  ) as AssistantActionPlan;
  const installAction = getInstallAction(planWithUnknownInstallField);

  (installAction.input as Record<string, unknown>).unknown = true;

  expect(() => normalizeAssistantActionPlan(planWithUnknownInstallField)).toThrow(
    "assistant_action_plan_invalid"
  );
});

test("planAssistantActions wires static coverage gates into production siteKit planning", () => {
  try {
    planSiteKitActions({
      ...servicesDirectorySiteKit,
      enabledStepIds: ["settings", "content-model", "pages", "navigation", "qa"],
    });
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantSiteBuilderIntakeError);
    const gates = (error as AssistantSiteBuilderIntakeError).details
      .gates as AssistantSiteBuilderStaticCoverageGate[];

    expect(gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "static_lead_capture_missing",
          severity: "error",
          target: "form",
        }),
      ])
    );
    return;
  }

  throw new Error("Expected lead-capture drift gate.");
});

test("buildReviewedSiteKitStaticPlan gates partial page menu and form preview drift", () => {
  const validPlan = planSiteKitActions();
  const cases: Array<{
    name: string;
    mutate: (actions: GuidedSiteBuilderAction[]) => GuidedSiteBuilderAction[];
    expected: Partial<AssistantSiteBuilderStaticCoverageGate>;
  }> = [
    {
      name: "missing one static page",
      mutate: (actions) =>
        actions.filter(
          (action) => !(action.target === "page" && action.resourceKey === "directory")
        ),
      expected: {
        code: "static_pages_missing",
        target: "page",
        missingResourceKeys: ["directory"],
      },
    },
    {
      name: "missing primary menu",
      mutate: (actions) =>
        actions.filter((action) => !(action.target === "menu" && action.resourceKey === "primary")),
      expected: {
        code: "static_navigation_missing",
        target: "menu",
        missingResourceKeys: ["primary"],
      },
    },
    {
      name: "missing one lead form",
      mutate: (actions) =>
        actions.filter(
          (action) => !(action.target === "form" && action.resourceKey === "directory-inquiry")
        ),
      expected: {
        code: "static_lead_capture_missing",
        target: "form",
        missingResourceKeys: ["directory-inquiry"],
      },
    },
  ];

  for (const item of cases) {
    const driftedPlan = clonePlan(validPlan);
    const installAction = getInstallAction(driftedPlan);
    installAction.input.preview.actions = item.mutate(installAction.input.preview.actions);

    expectStaticCoverageGate(driftedPlan, item.expected);
  }
});

test("buildReviewedSiteKitStaticPlan gates generated pages without SEO defaults", () => {
  const driftedPlan = clonePlan(planSiteKitActions());
  const installAction = getInstallAction(driftedPlan);
  const homePageAction = installAction.input.preview.actions.find(
    (action) => action.target === "page" && action.resourceKey === "home"
  );

  if (!homePageAction) throw new Error("home_page_action_missing");

  installAction.input.preview.actions = [
    ...installAction.input.preview.actions,
    {
      ...homePageAction,
      id: "pages:page:campaign",
      resourceKey: "campaign",
      title: "Upsert page: Campaign",
    },
  ];

  expectStaticCoverageGate(driftedPlan, {
    code: "static_seo_defaults_missing",
    target: "seo",
    missingResourceKeys: ["campaign"],
  });
});

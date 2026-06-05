import type {
  AssistantActionPlan,
  AssistantPlannedAction,
  AssistantSiteKitPlanInput,
} from "./actionPlanTypes";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import type {
  GuidedSiteBuilderAction,
  GuidedSiteBuilderActionTarget,
  GuidedSiteBuilderPlanResult,
} from "./siteBuilderPlanAdapter";
import { getSolutionKitFromCatalog } from "../kits/solutionKitsCatalog";
import type {
  SiteBuilderGoal,
  SiteBuilderPlanStepId,
  SolutionKitDefinition,
} from "../kits/solutionKitTypes";

export type AssistantSiteBuilderStaticCoverageGate = {
  code:
    | "static_sitekit_plan_not_ready"
    | "static_pages_missing"
    | "static_navigation_missing"
    | "static_lead_capture_missing"
    | "static_seo_defaults_missing"
    | "static_locator_unstable";
  severity: "error";
  message: string;
  target?: GuidedSiteBuilderActionTarget | "seo";
  missingResourceKeys?: string[];
};

export type AssistantSiteBuilderStaticCoverage = {
  schemaVersion: 1;
  selectedKitId: GuidedSiteBuilderPlanResult["selectedKitId"];
  enabledStepIds: SiteBuilderPlanStepId[];
  actionIds: string[];
  targets: GuidedSiteBuilderActionTarget[];
  pageResourceKeys: string[];
  menuResourceKeys: string[];
  formResourceKeys: string[];
  seoPageSlugs: string[];
  samePlanResourceKeys: string[];
};

export type AssistantSiteBuilderStaticPlanResult = {
  plan: AssistantActionPlan;
  coverage: AssistantSiteBuilderStaticCoverage;
  gates: AssistantSiteBuilderStaticCoverageGate[];
};

const uniqueSorted = (values: readonly string[]) => [...new Set(values)].sort();

const missingValues = (expected: readonly string[], actual: readonly string[]) => {
  const actualValues = new Set(actual);
  return expected.filter((value) => !actualValues.has(value));
};

const leadCaptureGoals = new Set<SiteBuilderGoal>(["lead_generation", "collect_qualified_leads"]);

const hasLeadCaptureGoal = (goals: readonly SiteBuilderGoal[]) =>
  goals.some((goal) => leadCaptureGoals.has(goal));

const getSiteKitInstallAction = (
  actions: readonly AssistantPlannedAction[]
): Extract<AssistantPlannedAction, { type: "site-kit.install" }> | null => {
  const action = actions.find((item) => item.type === "site-kit.install");
  return action?.type === "site-kit.install" ? action : null;
};

const requireReadySiteKitInstallAction = (
  plan: AssistantActionPlan
): Extract<AssistantPlannedAction, { type: "site-kit.install" }> => {
  const installAction = getSiteKitInstallAction(plan.actions);
  if (plan.status === "ready" && installAction) {
    return installAction;
  }

  return throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
    reason: "static_site_kit_plan_unavailable",
    gates: [
      {
        code: "static_sitekit_plan_not_ready",
        severity: "error",
        message: "The SiteKit planner did not return a ready install action.",
      },
    ],
  });
};

const requireSolutionKit = (
  selectedKitId: GuidedSiteBuilderPlanResult["selectedKitId"]
): SolutionKitDefinition => {
  const kit = getSolutionKitFromCatalog(selectedKitId);
  if (kit) return kit;

  return throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
    reason: "static_site_kit_not_found",
    selectedKitId,
  });
};

const getActionsByTarget = (
  actions: readonly GuidedSiteBuilderAction[],
  target: GuidedSiteBuilderActionTarget
) => actions.filter((action) => action.target === target);

const pageSlugToResourceKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "home";
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "") || "home";
};

const getSeoPageSlugs = (kit: SolutionKitDefinition) =>
  kit.resourceBlueprint.pages
    .filter((page) => Boolean(page.seo))
    .map((page) => pageSlugToResourceKey(page.slug))
    .sort();

const getExpectedPageResourceKeys = (kit: SolutionKitDefinition) =>
  uniqueSorted(kit.resourceBlueprint.pages.map((page) => pageSlugToResourceKey(page.slug)));

const getExpectedMenuResourceKeys = (kit: SolutionKitDefinition) =>
  uniqueSorted(kit.resourceBlueprint.menus.map((menu) => menu.location ?? menu.name));

const getExpectedFormResourceKeys = (kit: SolutionKitDefinition) =>
  uniqueSorted(kit.resourceBlueprint.forms.map((form) => form.slug));

const collectStaticCoverageGates = (
  preview: GuidedSiteBuilderPlanResult,
  kit: SolutionKitDefinition,
  coverage: AssistantSiteBuilderStaticCoverage,
  siteKit: AssistantSiteKitPlanInput
): AssistantSiteBuilderStaticCoverageGate[] => {
  const enabled = new Set(preview.enabledStepIds);
  const gates: AssistantSiteBuilderStaticCoverageGate[] = [];
  const expectedPageResourceKeys = getExpectedPageResourceKeys(kit);
  const expectedMenuResourceKeys = getExpectedMenuResourceKeys(kit);
  const expectedFormResourceKeys = getExpectedFormResourceKeys(kit);

  const missingPageResourceKeys = enabled.has("pages")
    ? missingValues(expectedPageResourceKeys, coverage.pageResourceKeys)
    : [];
  if (missingPageResourceKeys.length > 0) {
    gates.push({
      code: "static_pages_missing",
      severity: "error",
      target: "page",
      missingResourceKeys: missingPageResourceKeys,
      message: "Selected site kit is missing page actions for the static shell.",
    });
  }

  const missingMenuResourceKeys = enabled.has("navigation")
    ? missingValues(expectedMenuResourceKeys, coverage.menuResourceKeys)
    : [];
  if (missingMenuResourceKeys.length > 0) {
    gates.push({
      code: "static_navigation_missing",
      severity: "error",
      target: "menu",
      missingResourceKeys: missingMenuResourceKeys,
      message: "Selected site kit is missing primary/footer menu actions.",
    });
  }

  const formsRequired = enabled.has("forms") || hasLeadCaptureGoal(siteKit.goals);
  const missingFormResourceKeys =
    formsRequired && expectedFormResourceKeys.length > 0
      ? missingValues(expectedFormResourceKeys, coverage.formResourceKeys)
      : [];
  if (
    formsRequired &&
    (missingFormResourceKeys.length > 0 ||
      (expectedFormResourceKeys.length === 0 && hasLeadCaptureGoal(siteKit.goals)))
  ) {
    gates.push({
      code: "static_lead_capture_missing",
      severity: "error",
      target: "form",
      missingResourceKeys:
        missingFormResourceKeys.length > 0 ? missingFormResourceKeys : ["lead-capture-form"],
      message: "Lead-capture goals require a supported form action before execution.",
    });
  }

  const expectedSeoPageSlugs = enabled.has("pages")
    ? uniqueSorted([...expectedPageResourceKeys, ...coverage.pageResourceKeys])
    : [];
  const missingSeoPageSlugs = missingValues(expectedSeoPageSlugs, coverage.seoPageSlugs);
  if (missingSeoPageSlugs.length > 0) {
    gates.push({
      code: "static_seo_defaults_missing",
      severity: "error",
      target: "seo",
      missingResourceKeys: missingSeoPageSlugs,
      message: "Every generated static page must carry SEO defaults in the selected kit.",
    });
  }

  if (
    coverage.samePlanResourceKeys.length !== preview.actions.length ||
    coverage.actionIds.length !== preview.actions.length
  ) {
    gates.push({
      code: "static_locator_unstable",
      severity: "error",
      message: "Static site actions must expose unique same-plan target/resource locators.",
    });
  }

  return gates;
};

const buildCoverage = (
  preview: GuidedSiteBuilderPlanResult,
  kit: SolutionKitDefinition
): AssistantSiteBuilderStaticCoverage => {
  const actions = preview.actions;
  return {
    schemaVersion: 1,
    selectedKitId: preview.selectedKitId,
    enabledStepIds: [...preview.enabledStepIds],
    actionIds: uniqueSorted(actions.map((action) => action.id)),
    targets: uniqueSorted(
      actions.map((action) => action.target)
    ) as GuidedSiteBuilderActionTarget[],
    pageResourceKeys: uniqueSorted(
      getActionsByTarget(actions, "page").map((action) => action.resourceKey)
    ),
    menuResourceKeys: uniqueSorted(
      getActionsByTarget(actions, "menu").map((action) => action.resourceKey)
    ),
    formResourceKeys: uniqueSorted(
      getActionsByTarget(actions, "form").map((action) => action.resourceKey)
    ),
    seoPageSlugs: getSeoPageSlugs(kit),
    samePlanResourceKeys: uniqueSorted(
      actions.map((action) => `${action.target}:${action.resourceKey}`)
    ),
  };
};

export const buildReviewedSiteKitStaticPlan = (
  plan: AssistantActionPlan,
  siteKit: AssistantSiteKitPlanInput
): AssistantSiteBuilderStaticPlanResult => {
  const installAction = requireReadySiteKitInstallAction(plan);
  const preview = installAction.input.preview;
  const kit = requireSolutionKit(preview.selectedKitId);

  const coverage = buildCoverage(preview, kit);
  const gates = collectStaticCoverageGates(preview, kit, coverage, siteKit);
  if (gates.length > 0) {
    throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "static_site_kit_coverage_blocked",
      gates,
      selectedKitId: preview.selectedKitId,
    });
  }

  return {
    plan,
    coverage,
    gates,
  };
};

export const assertReviewedSiteKitStaticCoverage = (
  plan: AssistantActionPlan,
  siteKit: AssistantSiteKitPlanInput
) => buildReviewedSiteKitStaticPlan(plan, siteKit).coverage;

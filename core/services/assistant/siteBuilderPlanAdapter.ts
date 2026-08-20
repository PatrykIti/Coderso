import {
  type SiteBuilderPlanInput,
  type SiteBuilderPlanOutput,
  type SiteBuilderPlanStepId,
  type SolutionKitDefinition,
  type SolutionKitId,
  solutionKitIds,
  siteBuilderPlanStepIds,
} from "../kits/solutionKitTypes";
import { getSolutionKitFromCatalog } from "../kits/solutionKitsCatalog";
import { buildSiteBuilderPlan } from "./siteBuilderPlanner";
import type { AssistantSiteKitAdvancedRuntimeOverrides } from "./siteBuilderAdvancedRuntimeOverrides";

export type GuidedSiteBuilderPlanInput = SiteBuilderPlanInput & {
  selectedKitId?: SolutionKitId | null;
  enabledStepIds?: SiteBuilderPlanStepId[];
  advancedRuntimeOverrides?: AssistantSiteKitAdvancedRuntimeOverrides;
};

export type GuidedSiteBuilderActionTarget =
  "settings" | "content_type" | "form" | "page" | "menu" | "qa";

export type GuidedSiteBuilderAction = {
  id: string;
  stepId: SiteBuilderPlanStepId;
  title: string;
  description: string;
  target: GuidedSiteBuilderActionTarget;
  resourceKey: string;
  required: boolean;
};

export type GuidedSiteBuilderPlanResult = {
  plan: SiteBuilderPlanOutput;
  selectedKitId: SolutionKitId;
  selectedKitTitle: string;
  enabledStepIds: SiteBuilderPlanStepId[];
  actions: GuidedSiteBuilderAction[];
  modules: {
    required: string[];
    optional: string[];
    recommended: string[];
  };
};

export type SiteBuilderPlanAdapterDeps = {
  buildPlan: typeof buildSiteBuilderPlan;
  getKitById: (id: SolutionKitId) => SolutionKitDefinition | null;
};

export const defaultSiteBuilderPlanAdapterDeps: SiteBuilderPlanAdapterDeps = {
  buildPlan: buildSiteBuilderPlan,
  getKitById: getSolutionKitFromCatalog,
};

const stepOrder = new Map<SiteBuilderPlanStepId, number>(
  siteBuilderPlanStepIds.map((id, index) => [id, index])
);

const isStepId = (value: unknown): value is SiteBuilderPlanStepId =>
  typeof value === "string" && siteBuilderPlanStepIds.includes(value as SiteBuilderPlanStepId);

export const isSolutionKitId = (value: unknown): value is SolutionKitId =>
  typeof value === "string" && solutionKitIds.includes(value as SolutionKitId);

export const normalizeGuidedSiteBuilderList = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.sort((left, right) => left.localeCompare(right));
};

const normalizeStepIds = (
  plan: SiteBuilderPlanOutput,
  input: SiteBuilderPlanStepId[] | undefined
) => {
  const allowed = new Set(plan.steps.map((step) => step.id).filter(isStepId));
  const preferred = Array.isArray(input) ? input.filter((step) => allowed.has(step)) : [];
  const fixed = plan.steps
    .filter((step) => step.editable === false)
    .map((step) => step.id)
    .filter(isStepId);
  const merged = [...new Set([...fixed, ...preferred])];
  if (merged.length > 0) {
    return merged.sort(
      (left, right) => (stepOrder.get(left) ?? 999) - (stepOrder.get(right) ?? 999)
    );
  }

  const defaultSteps = plan.steps.map((step) => step.id).filter(isStepId);
  if (defaultSteps.length > 0) return defaultSteps;
  return [...siteBuilderPlanStepIds];
};

const slugToDisplay = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "home";
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "") || "home";
};

const buildActionId = (
  stepId: SiteBuilderPlanStepId,
  target: GuidedSiteBuilderActionTarget,
  resourceKey: string
) => `${stepId}:${target}:${resourceKey}`;

const createAction = (
  stepId: SiteBuilderPlanStepId,
  target: GuidedSiteBuilderActionTarget,
  resourceKey: string,
  title: string,
  description: string,
  required: boolean
): GuidedSiteBuilderAction => ({
  id: buildActionId(stepId, target, resourceKey),
  stepId,
  target,
  resourceKey,
  title,
  description,
  required,
});

const buildActions = (
  plan: SiteBuilderPlanOutput,
  kit: SolutionKitDefinition,
  enabledStepIds: SiteBuilderPlanStepId[]
): GuidedSiteBuilderAction[] => {
  const enabled = new Set(enabledStepIds);
  const byStep = new Map(plan.steps.map((step) => [step.id, step]));
  const actions: GuidedSiteBuilderAction[] = [];

  if (enabled.has("settings")) {
    const step = byStep.get("settings");
    const required = step?.editable === false;
    const keys = Object.keys(plan.settingsPatch).sort((left, right) => left.localeCompare(right));
    if (keys.length === 0) {
      actions.push(
        createAction(
          "settings",
          "settings",
          "site.defaults",
          "Apply default site settings",
          "No explicit settings patch keys were generated for this input.",
          required
        )
      );
    } else {
      for (const key of keys) {
        actions.push(
          createAction(
            "settings",
            "settings",
            key,
            `Patch setting: ${key}`,
            "Apply planner-recommended setting override.",
            required
          )
        );
      }
    }
  }

  if (enabled.has("content-model")) {
    const step = byStep.get("content-model");
    const required = step?.editable === false;
    for (const item of kit.resourceBlueprint.contentTypes) {
      actions.push(
        createAction(
          "content-model",
          "content_type",
          item.slug,
          `Upsert content type: ${item.name}`,
          "Create or update schema and taxonomy defaults.",
          required
        )
      );
    }
  }

  if (enabled.has("forms")) {
    const step = byStep.get("forms");
    const required = step?.editable === false;
    for (const form of kit.resourceBlueprint.forms) {
      actions.push(
        createAction(
          "forms",
          "form",
          form.slug,
          `Upsert form: ${form.name}`,
          "Sync form settings and fields.",
          required
        )
      );
    }
  }

  if (enabled.has("pages")) {
    const step = byStep.get("pages");
    const required = step?.editable === false;
    for (const page of kit.resourceBlueprint.pages) {
      actions.push(
        createAction(
          "pages",
          "page",
          slugToDisplay(page.slug),
          `Upsert page: ${page.title}`,
          "Sync page data, publish state, and SEO defaults.",
          required
        )
      );
    }
  }

  if (enabled.has("navigation")) {
    const step = byStep.get("navigation");
    const required = step?.editable === false;
    for (const menu of kit.resourceBlueprint.menus) {
      const key = menu.location ?? menu.name;
      actions.push(
        createAction(
          "navigation",
          "menu",
          key,
          `Upsert menu: ${menu.name}`,
          "Sync menu items and hierarchy.",
          required
        )
      );
    }
  }

  if (enabled.has("qa")) {
    const step = byStep.get("qa");
    const required = step?.editable === false;
    actions.push(
      createAction(
        "qa",
        "qa",
        "post-install-checks",
        "Run post-install checks",
        "Verify install summary and unresolved issues before publish.",
        required
      )
    );
  }

  return actions.sort((left, right) => {
    const leftStep = stepOrder.get(left.stepId) ?? 999;
    const rightStep = stepOrder.get(right.stepId) ?? 999;
    if (leftStep !== rightStep) return leftStep - rightStep;
    return left.id.localeCompare(right.id);
  });
};

const resolveKit = (
  deps: SiteBuilderPlanAdapterDeps,
  plan: SiteBuilderPlanOutput,
  selectedKitId?: SolutionKitId | null
): SolutionKitDefinition => {
  const requestedId = selectedKitId ?? plan.recommendedKitId;
  const selected = deps.getKitById(requestedId);
  if (!selected) {
    throw new Error("site_builder_kit_not_found");
  }
  return selected;
};

export const buildGuidedSiteBuilderPlanResult = (
  input: GuidedSiteBuilderPlanInput,
  deps: SiteBuilderPlanAdapterDeps = defaultSiteBuilderPlanAdapterDeps
): GuidedSiteBuilderPlanResult => {
  const plan = deps.buildPlan(input);
  const selectedKit = resolveKit(deps, plan, input.selectedKitId);
  const enabledStepIds = normalizeStepIds(plan, input.enabledStepIds);
  const actions = buildActions(plan, selectedKit, enabledStepIds);

  return {
    plan,
    selectedKitId: selectedKit.id,
    selectedKitTitle: selectedKit.title,
    enabledStepIds,
    actions,
    modules: {
      required: normalizeGuidedSiteBuilderList(selectedKit.manifest?.requiredModules ?? []),
      optional: normalizeGuidedSiteBuilderList(selectedKit.manifest?.optionalModules ?? []),
      recommended: normalizeGuidedSiteBuilderList(selectedKit.recommendedModules ?? []),
    },
  };
};

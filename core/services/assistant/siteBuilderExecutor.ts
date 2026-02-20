import {
  type SiteBuilderPlanInput,
  type SiteBuilderPlanOutput,
  type SiteBuilderPlanStepId,
  type SolutionKitDefinition,
  type SolutionKitId,
  solutionKitIds,
  siteBuilderPlanStepIds,
  type SiteBuilderPlanApplyInput,
} from "../kits/solutionKitTypes";
import {
  applySolutionKitInstall,
  getSolutionKitInstallRun,
  listSolutionKitInstallItems,
} from "../kits/solutionKitsService";
import {
  buildSiteBuilderPlan,
  filterKitDefinitionByPlan,
} from "./siteBuilderPlanner";
import { getSolutionKitFromCatalog } from "../kits/solutionKitsCatalog";
import type {
  SolutionKitInstallItemRecord,
  SolutionKitInstallRunRecord,
} from "../kits/solutionKitsInstallService";

export type GuidedSiteBuilderPlanInput = SiteBuilderPlanInput & {
  selectedKitId?: SolutionKitId | null;
  enabledStepIds?: SiteBuilderPlanStepId[];
};

export type GuidedSiteBuilderActionTarget =
  | "settings"
  | "content_type"
  | "form"
  | "page"
  | "menu"
  | "template"
  | "qa";

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

export type GuidedSiteBuilderValidationCheckStatus = "ok" | "warning" | "failed";

export type GuidedSiteBuilderValidationCheck = {
  id: string;
  label: string;
  status: GuidedSiteBuilderValidationCheckStatus;
  details: string;
};

export type GuidedSiteBuilderValidationResult = {
  runId: string;
  status: GuidedSiteBuilderValidationCheckStatus;
  unresolvedItems: string[];
  checks: GuidedSiteBuilderValidationCheck[];
};

export type GuidedSiteBuilderExecuteInput = GuidedSiteBuilderPlanInput & {
  actorId?: string | null;
  dryRun?: boolean;
  continueOnError?: boolean;
  notes?: string[];
  settingsPatch?: Record<string, unknown>;
};

export type GuidedSiteBuilderExecuteResult = GuidedSiteBuilderPlanResult & {
  execution: Awaited<ReturnType<typeof applySolutionKitInstall>>;
  validation: GuidedSiteBuilderValidationResult;
};

export type GuidedSiteBuilderValidateRunInput = {
  runId: string;
};

type SiteBuilderExecutorDeps = {
  buildPlan: typeof buildSiteBuilderPlan;
  getKitById: (id: SolutionKitId) => SolutionKitDefinition | null;
  apply: typeof applySolutionKitInstall;
  getRun: typeof getSolutionKitInstallRun;
  listItems: typeof listSolutionKitInstallItems;
};

const defaultDeps: SiteBuilderExecutorDeps = {
  buildPlan: buildSiteBuilderPlan,
  getKitById: getSolutionKitFromCatalog,
  apply: applySolutionKitInstall,
  getRun: getSolutionKitInstallRun,
  listItems: listSolutionKitInstallItems,
};

const stepOrder = new Map<SiteBuilderPlanStepId, number>(
  siteBuilderPlanStepIds.map((id, index) => [id, index])
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isStepId = (value: unknown): value is SiteBuilderPlanStepId =>
  typeof value === "string" && siteBuilderPlanStepIds.includes(value as SiteBuilderPlanStepId);

const isSolutionKitId = (value: unknown): value is SolutionKitId =>
  typeof value === "string" && solutionKitIds.includes(value as SolutionKitId);

const normalizeList = (values: Array<string | null | undefined>) => {
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
    return merged.sort((left, right) => (stepOrder.get(left) ?? 999) - (stepOrder.get(right) ?? 999));
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

const collectTemplateKeys = (kit: SolutionKitDefinition) => {
  const fromPages = kit.resourceBlueprint.pages.map((page) => page.template ?? null);
  const fromBlueprint = (kit.resourceBlueprint.templates ?? []).map((template) => template.key ?? null);
  return normalizeList([...fromPages, ...fromBlueprint]);
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
  const byStep = new Map(
    plan.steps.map((step) => [step.id, step])
  );
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
    for (const templateKey of collectTemplateKeys(kit)) {
      actions.push(
        createAction(
          "pages",
          "template",
          templateKey,
          `Upsert template seed: ${templateKey}`,
          "Sync reusable widget template seed for this kit.",
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
  deps: SiteBuilderExecutorDeps,
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

const mergeNotes = (base: string[], extra: string[] | undefined) =>
  normalizeList([...(base ?? []), ...(extra ?? [])]);

const isTemplateSummary = (
  value: unknown
): value is { total: number; success: number; failed: number; planned: number } =>
  isRecord(value) &&
  typeof value.total === "number" &&
  typeof value.success === "number" &&
  typeof value.failed === "number" &&
  typeof value.planned === "number";

const deriveValidationStatus = (checks: GuidedSiteBuilderValidationCheck[]) => {
  if (checks.some((check) => check.status === "failed")) return "failed" as const;
  if (checks.some((check) => check.status === "warning")) return "warning" as const;
  return "ok" as const;
};

const buildValidation = (input: {
  run: SolutionKitInstallRunRecord;
  items: SolutionKitInstallItemRecord[];
  selectedKit: SolutionKitDefinition | null;
  enabledStepIds: SiteBuilderPlanStepId[];
  templateSummary: { total: number; success: number; failed: number; planned: number } | null;
}): GuidedSiteBuilderValidationResult => {
  const checks: GuidedSiteBuilderValidationCheck[] = [];
  const unresolvedItems: string[] = [];

  const failedItems = input.items.filter((item) => item.status === "failed");
  if (failedItems.length > 0) {
    const detail = `${failedItems.length} install item(s) failed.`;
    checks.push({
      id: "run.failed-items",
      label: "Install items",
      status: "failed",
      details: detail,
    });
    unresolvedItems.push(detail);
  } else {
    checks.push({
      id: "run.failed-items",
      label: "Install items",
      status: "ok",
      details: "No failed install items.",
    });
  }

  if (input.run.status === "failed") {
    const detail = "Install run finished with failed status.";
    checks.push({
      id: "run.status",
      label: "Run status",
      status: "failed",
      details: detail,
    });
    unresolvedItems.push(detail);
  } else {
    checks.push({
      id: "run.status",
      label: "Run status",
      status: "ok",
      details: `Run status is ${input.run.status}.`,
    });
  }

  const enabled = new Set(input.enabledStepIds);
  const kit = input.selectedKit;

  const successByType = (type: SolutionKitInstallItemRecord["resourceType"]) =>
    input.items.filter((item) => item.resourceType === type && item.status !== "failed").length;

  if (kit && enabled.has("content-model") && kit.resourceBlueprint.contentTypes.length > 0) {
    const count = successByType("content_type");
    if (count === 0) {
      const detail = "No content type operations were applied.";
      checks.push({
        id: "step.content-model",
        label: "Content model step",
        status: "warning",
        details: detail,
      });
      unresolvedItems.push(detail);
    } else {
      checks.push({
        id: "step.content-model",
        label: "Content model step",
        status: "ok",
        details: `${count} content type operation(s) completed.`,
      });
    }
  }

  if (kit && enabled.has("forms") && kit.resourceBlueprint.forms.length > 0) {
    const count = successByType("form");
    if (count === 0) {
      const detail = "No form operations were applied.";
      checks.push({
        id: "step.forms",
        label: "Forms step",
        status: "warning",
        details: detail,
      });
      unresolvedItems.push(detail);
    } else {
      checks.push({
        id: "step.forms",
        label: "Forms step",
        status: "ok",
        details: `${count} form operation(s) completed.`,
      });
    }
  }

  if (kit && enabled.has("pages") && kit.resourceBlueprint.pages.length > 0) {
    const pageCount = successByType("page");
    if (pageCount === 0) {
      const detail = "No page operations were applied.";
      checks.push({
        id: "step.pages",
        label: "Pages step",
        status: "warning",
        details: detail,
      });
      unresolvedItems.push(detail);
    } else {
      checks.push({
        id: "step.pages",
        label: "Pages step",
        status: "ok",
        details: `${pageCount} page operation(s) completed.`,
      });
    }

    const expectedTemplates = collectTemplateKeys(kit).length;
    if (expectedTemplates > 0) {
      if (input.templateSummary && input.templateSummary.failed > 0) {
        const detail = `${input.templateSummary.failed} template operation(s) failed.`;
        checks.push({
          id: "step.templates",
          label: "Template seeds",
          status: "warning",
          details: detail,
        });
        unresolvedItems.push(detail);
      } else {
        checks.push({
          id: "step.templates",
          label: "Template seeds",
          status: "ok",
          details: input.templateSummary
            ? `${input.templateSummary.success + input.templateSummary.planned} template operation(s) recorded.`
            : "Template summary unavailable for this run.",
        });
      }
    }
  }

  if (kit && enabled.has("navigation") && kit.resourceBlueprint.menus.length > 0) {
    const count = successByType("menu");
    if (count === 0) {
      const detail = "No navigation/menu operations were applied.";
      checks.push({
        id: "step.navigation",
        label: "Navigation step",
        status: "warning",
        details: detail,
      });
      unresolvedItems.push(detail);
    } else {
      checks.push({
        id: "step.navigation",
        label: "Navigation step",
        status: "ok",
        details: `${count} menu operation(s) completed.`,
      });
    }
  }

  if (enabled.has("qa")) {
    const detail = unresolvedItems.length > 0
      ? "QA detected unresolved items. Review checklist before publish."
      : "QA checks passed without unresolved items.";
    checks.push({
      id: "step.qa",
      label: "QA step",
      status: unresolvedItems.length > 0 ? "warning" : "ok",
      details: detail,
    });
  }

  return {
    runId: input.run.id,
    status: deriveValidationStatus(checks),
    unresolvedItems,
    checks,
  };
};

const readEnabledStepsFromRunOptions = (value: unknown): SiteBuilderPlanStepId[] => {
  if (!isRecord(value)) return [...siteBuilderPlanStepIds];

  const assistant = isRecord(value.assistantSiteBuilder)
    ? value.assistantSiteBuilder
    : null;
  const wizard = isRecord(value.wizard) ? value.wizard : null;

  const fromAssistant = Array.isArray(assistant?.enabledStepIds)
    ? assistant?.enabledStepIds
    : [];
  const fromWizard = Array.isArray(wizard?.enabledStepIds)
    ? wizard?.enabledStepIds
    : [];

  const normalized = [...new Set([...fromAssistant, ...fromWizard].filter(isStepId))];
  return normalized.length > 0 ? normalized : [...siteBuilderPlanStepIds];
};

const readTemplateSummaryFromRunOptions = (
  value: unknown
): { total: number; success: number; failed: number; planned: number } | null => {
  if (!isRecord(value)) return null;
  const installer = isRecord(value.kitInstaller) ? value.kitInstaller : null;
  const summary = installer?.templateInstallSummary;
  return isTemplateSummary(summary) ? summary : null;
};

const buildPlanResult = (
  deps: SiteBuilderExecutorDeps,
  input: GuidedSiteBuilderPlanInput
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
      required: normalizeList(selectedKit.manifest?.requiredModules ?? []),
      optional: normalizeList(selectedKit.manifest?.optionalModules ?? []),
      recommended: normalizeList(selectedKit.recommendedModules ?? []),
    },
  };
};

export const previewGuidedSiteBuilderPlan = (
  input: GuidedSiteBuilderPlanInput,
  deps: SiteBuilderExecutorDeps = defaultDeps
): GuidedSiteBuilderPlanResult => buildPlanResult(deps, input);

export const executeGuidedSiteBuilder = async (
  input: GuidedSiteBuilderExecuteInput,
  deps: SiteBuilderExecutorDeps = defaultDeps
): Promise<GuidedSiteBuilderExecuteResult> => {
  const preview = buildPlanResult(deps, input);
  const selectedKit = deps.getKitById(preview.selectedKitId);
  if (!selectedKit) throw new Error("site_builder_kit_not_found");

  const notes = mergeNotes(preview.plan.notes, input.notes);
  const settingsPatch = {
    ...preview.plan.settingsPatch,
    ...(input.settingsPatch ?? {}),
  };

  const planPayload: SiteBuilderPlanApplyInput = {
    enabledStepIds: preview.enabledStepIds,
    settingsPatch,
    notes,
  };

  const filtered = filterKitDefinitionByPlan(selectedKit, planPayload);

  const execution = await deps.apply({
    kitId: selectedKit.id,
    actorId: input.actorId ?? null,
    dryRun: input.dryRun,
    continueOnError: input.continueOnError,
    kitDefinitionOverride: filtered,
    runOptions: {
      assistantSiteBuilder: {
        selectedKitId: selectedKit.id,
        enabledStepIds: preview.enabledStepIds,
        actions: preview.actions.map((action) => ({
          id: action.id,
          stepId: action.stepId,
          target: action.target,
          resourceKey: action.resourceKey,
          required: action.required,
        })),
      },
    },
  });

  const validation = buildValidation({
    run: execution.run,
    items: execution.items,
    selectedKit,
    enabledStepIds: preview.enabledStepIds,
    templateSummary: execution.templateInstall ? execution.templateInstall.summary : null,
  });

  return {
    ...preview,
    execution,
    validation,
  };
};

export const validateGuidedSiteBuilderRun = async (
  input: GuidedSiteBuilderValidateRunInput,
  deps: SiteBuilderExecutorDeps = defaultDeps
): Promise<GuidedSiteBuilderValidationResult> => {
  const run = await deps.getRun(input.runId);
  if (!run) throw new Error("site_builder_run_not_found");

  const items = await deps.listItems(run.id);
  const selectedKitId = isRecord(run.options)
    ? isRecord(run.options.assistantSiteBuilder) &&
      isSolutionKitId(run.options.assistantSiteBuilder.selectedKitId)
      ? run.options.assistantSiteBuilder.selectedKitId
      : null
    : null;
  const kitId = selectedKitId ?? (isSolutionKitId(run.kitId) ? run.kitId : null);
  const kit = kitId ? deps.getKitById(kitId) : null;

  const enabledStepIds = readEnabledStepsFromRunOptions(run.options);
  const templateSummary = readTemplateSummaryFromRunOptions(run.options);

  return buildValidation({
    run,
    items,
    selectedKit: kit,
    enabledStepIds,
    templateSummary,
  });
};

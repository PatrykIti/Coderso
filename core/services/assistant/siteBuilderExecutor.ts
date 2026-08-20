import {
  type SiteBuilderPlanStepId,
  type SolutionKitDefinition,
  siteBuilderPlanStepIds,
  type SiteBuilderPlanApplyInput,
} from "../kits/solutionKitTypes";
import {
  applySolutionKitInstall,
  getSolutionKitInstallRun,
  listSolutionKitInstallItems,
} from "../kits/solutionKitsService";
import { filterKitDefinitionByPlan } from "./siteBuilderPlanner";
import { applyAdvancedRuntimeOverridesToKit } from "./siteBuilderAdvancedRuntimeOverrides";
import type {
  SolutionKitInstallItemRecord,
  SolutionKitInstallRunRecord,
} from "../kits/solutionKitsInstallService";
import {
  buildGuidedSiteBuilderPlanResult,
  defaultSiteBuilderPlanAdapterDeps,
  isSolutionKitId,
  normalizeGuidedSiteBuilderList,
  type GuidedSiteBuilderPlanInput,
  type GuidedSiteBuilderPlanResult,
  type SiteBuilderPlanAdapterDeps,
} from "./siteBuilderPlanAdapter";

export type {
  GuidedSiteBuilderAction,
  GuidedSiteBuilderActionTarget,
  GuidedSiteBuilderPlanInput,
  GuidedSiteBuilderPlanResult,
} from "./siteBuilderPlanAdapter";

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

type SiteBuilderExecutorDeps = SiteBuilderPlanAdapterDeps & {
  apply: typeof applySolutionKitInstall;
  getRun: typeof getSolutionKitInstallRun;
  listItems: typeof listSolutionKitInstallItems;
};

const defaultDeps: SiteBuilderExecutorDeps = {
  ...defaultSiteBuilderPlanAdapterDeps,
  apply: applySolutionKitInstall,
  getRun: getSolutionKitInstallRun,
  listItems: listSolutionKitInstallItems,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isStepId = (value: unknown): value is SiteBuilderPlanStepId =>
  typeof value === "string" && siteBuilderPlanStepIds.includes(value as SiteBuilderPlanStepId);

const mergeNotes = (base: string[], extra: string[] | undefined) =>
  normalizeGuidedSiteBuilderList([...(base ?? []), ...(extra ?? [])]);

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
    const detail =
      unresolvedItems.length > 0
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

  const assistant = isRecord(value.assistantSiteBuilder) ? value.assistantSiteBuilder : null;
  const wizard = isRecord(value.wizard) ? value.wizard : null;

  const fromAssistant = Array.isArray(assistant?.enabledStepIds) ? assistant?.enabledStepIds : [];
  const fromWizard = Array.isArray(wizard?.enabledStepIds) ? wizard?.enabledStepIds : [];

  const normalized = [...new Set([...fromAssistant, ...fromWizard].filter(isStepId))];
  return normalized.length > 0 ? normalized : [...siteBuilderPlanStepIds];
};

export const previewGuidedSiteBuilderPlan = (
  input: GuidedSiteBuilderPlanInput,
  deps: SiteBuilderExecutorDeps = defaultDeps
): GuidedSiteBuilderPlanResult => buildGuidedSiteBuilderPlanResult(input, deps);

export const executeGuidedSiteBuilder = async (
  input: GuidedSiteBuilderExecuteInput,
  deps: SiteBuilderExecutorDeps = defaultDeps
): Promise<GuidedSiteBuilderExecuteResult> => {
  const preview = buildGuidedSiteBuilderPlanResult(input, deps);
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
  const executableKit = applyAdvancedRuntimeOverridesToKit(
    filtered,
    input.advancedRuntimeOverrides
  );

  const execution = await deps.apply({
    kitId: selectedKit.id,
    actorId: input.actorId ?? null,
    dryRun: input.dryRun,
    continueOnError: input.continueOnError,
    kitDefinitionOverride: executableKit,
    runOptions: {
      assistantSiteBuilder: {
        selectedKitId: selectedKit.id,
        enabledStepIds: preview.enabledStepIds,
        ...(input.advancedRuntimeOverrides
          ? { advancedRuntimeOverrides: input.advancedRuntimeOverrides }
          : {}),
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

  return buildValidation({
    run,
    items,
    selectedKit: kit,
    enabledStepIds,
  });
};

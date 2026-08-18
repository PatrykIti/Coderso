// Action-executor widget-template + site-kit previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import type { getWidgetTemplate } from "../widgets/widgetTemplateService";
import { normalizeWidgetTemplateSettings } from "../widgets/widgetTemplateSettings";
import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantWidgetTemplateDeleteAction,
  AssistantWidgetTemplateUpdateAction,
  AssistantWidgetTemplateBlockPatchAction,
  AssistantSiteKitInstallAction,
  AssistantSiteKitRecommendAction,
  AssistantSiteKitValidateAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import { applyPageWidgetDataPatch } from "./pageWidgetPatch";
import type { ActionExecutorDeps } from "./actionExecutorTypes";
import { normalizeAssistantPagePatchBlock } from "./actionExecutorScreenOps";

export const buildWidgetTemplateDeletePreview = async (
  action: AssistantWidgetTemplateDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const matches = existing?.name === action.input.name;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  const statusMatches = !expectedStatus || existing?.status === expectedStatus;
  const categoryMatches = !expectedCategory || existing?.category === expectedCategory;

  return createPreviewChange({
    action,
    targetType: "widget-template",
    targetKey: action.input.name,
    operation: "delete",
    summary: `Delete widget template "${action.input.name}"`,
    warnings: [
      "This reusable widget template may be referenced by pages or other templates.",
      ...(existing?.status === "published" ? ["This widget template is published."] : []),
    ],
    conflicts:
      existing && matches && statusMatches && categoryMatches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Widget template no longer matches the planned delete target."
                : "Widget template was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          status: existing.status,
          category: existing.category,
        }
      : null,
    nextValue: null,
  });
};

const applyWidgetTemplateSettingsPatch = (
  settings: unknown,
  patch: NonNullable<AssistantWidgetTemplateUpdateAction["input"]["patch"]["settings"]>
) => {
  const normalized = normalizeWidgetTemplateSettings(settings);
  return {
    ...normalized,
    layout: {
      ...normalized.layout,
      wrapper: {
        ...normalized.layout.wrapper,
        ...(patch.wrapperContainer !== undefined ? { container: patch.wrapperContainer } : {}),
      },
      sections: {
        ...normalized.layout.sections,
        ...(patch.sectionGap !== undefined ? { gap: patch.sectionGap } : {}),
      },
    },
  };
};

const applyWidgetTemplateUpdatePatch = (
  existing: Awaited<ReturnType<typeof getWidgetTemplate>>,
  patch: AssistantWidgetTemplateUpdateAction["input"]["patch"]
) => {
  if (!existing) return null;
  return {
    name: patch.name ?? existing.name,
    description:
      patch.description !== undefined ? patch.description : (existing.description ?? null),
    category: patch.category ?? existing.category,
    status: (patch.status ?? existing.status) as "draft" | "published",
    settings: patch.settings
      ? applyWidgetTemplateSettingsPatch(existing.settings, patch.settings)
      : existing.settings,
  };
};

export const buildWidgetTemplateUpdatePreview = async (
  action: AssistantWidgetTemplateUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    (!expectedStatus || existing.status === expectedStatus) &&
    (!expectedCategory || existing.category === expectedCategory);
  const nextValue = applyWidgetTemplateUpdatePatch(existing, action.input.patch);

  return createPreviewChange({
    action,
    targetType: "widget-template",
    targetKey: action.input.name,
    summary: `Update widget template "${action.input.name}"`,
    warnings:
      existing?.status === "published" || action.input.patch.status === "published"
        ? ["This reusable widget template may affect pages that reference it."]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Widget template no longer matches the planned update target."
                : "Widget template was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          description: existing.description,
          category: existing.category,
          status: existing.status,
          settings: existing.settings,
        }
      : null,
    nextValue,
  });
};

export const buildWidgetTemplateBlockPatchPreview = async (
  action: AssistantWidgetTemplateBlockPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name && (!expectedStatus || existing.status === expectedStatus);
  const patch =
    existing && matches
      ? applyPageWidgetDataPatch(existing.blocks, {
          blockId: action.input.blockId,
          expectedBlockType: action.input.expectedBlockType,
          dataPath: action.input.dataPath,
          value: action.input.value,
        })
      : null;
  const conflictMessage =
    patch?.status === "missing_block"
      ? "Selected widget template block was not found."
      : patch?.status === "type_mismatch"
        ? "Selected widget template block type changed."
        : patch?.status === "missing_path"
          ? "Selected widget template block data path does not exist."
          : existing
            ? "Widget template no longer matches the planned block patch target."
            : "Widget template was not found.";

  return createPreviewChange({
    action,
    targetType: "widget-template",
    targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    summary: `Patch widget template block "${action.input.blockId}"`,
    warnings:
      existing?.status === "published"
        ? ["This reusable widget template may affect pages that reference it."]
        : [],
    conflicts:
      existing && matches && patch?.status === "ok"
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: conflictMessage,
            },
          ],
    beforeValue:
      existing && patch?.status === "ok"
        ? {
            blockId: action.input.blockId,
            dataPath: action.input.dataPath,
            value: patch.beforeValue,
          }
        : null,
    nextValue:
      existing && patch?.status === "ok"
        ? {
            blockId: action.input.blockId,
            dataPath: action.input.dataPath,
            value: patch.nextValue,
          }
        : null,
  });
};

export const buildSiteKitRecommendPreview = async (
  action: AssistantSiteKitRecommendAction,
  deps: ActionExecutorDeps
) => {
  const preview = deps.previewSiteKitPlan(action.input);
  return createPreviewChange({
    action,
    targetType: "site-kit",
    targetKey: preview.selectedKitId,
    summary: `Recommend site kit "${preview.selectedKitTitle}"`,
    beforeValue: preview.selectedKitId,
    nextValue: preview.selectedKitId,
    details: {
      siteKit: {
        plan: preview,
      },
    },
  });
};

export const buildSiteKitInstallPreview = async (
  action: AssistantSiteKitInstallAction,
  deps: ActionExecutorDeps
) => {
  const preview = deps.previewSiteKitPlan(action.input);
  return createPreviewChange({
    action,
    targetType: "site-kit",
    targetKey: preview.selectedKitId,
    summary: `Install site kit "${preview.selectedKitTitle}" with ${preview.enabledStepIds.length} selected step(s)`,
    beforeValue: null,
    nextValue: {
      selectedKitId: preview.selectedKitId,
      enabledStepIds: preview.enabledStepIds,
      dryRun: action.input.dryRun === true,
    },
    details: {
      siteKit: {
        plan: preview,
      },
    },
  });
};

export const buildSiteKitValidatePreview = async (action: AssistantSiteKitValidateAction) =>
  createPreviewChange({
    action,
    targetType: "site-kit-run",
    targetKey: action.input.runId,
    summary: `Validate site kit run ${action.input.runId}`,
    beforeValue: action.input.runId,
    nextValue: action.input.runId,
  });

export const executeWidgetTemplateDeleteAction = async (
  action: AssistantWidgetTemplateDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus) ||
    (expectedCategory && existing.category !== expectedCategory)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const deleted = await deps.deleteWidgetTemplate(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "widget-template",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/widgets",
    publicHref: null,
    message: `Deleted widget template "${deleted.name}".`,
  };
};

export const executeWidgetTemplateUpdateAction = async (
  action: AssistantWidgetTemplateUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedCategory = action.input.expectedCategory?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus) ||
    (expectedCategory && existing.category !== expectedCategory)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextValue = applyWidgetTemplateUpdatePatch(existing, action.input.patch);
  if (!nextValue) throw new Error("assistant_action_dependency_missing");
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateWidgetTemplate(
          existing.id,
          {
            name: nextValue.name,
            description: nextValue.description,
            category: nextValue.category,
            status: nextValue.status,
            settings: nextValue.settings,
          },
          actorId
        );
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "widget-template",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/widgets/templates/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Widget template already matched the planned patch."
        : `Updated widget template "${updated.name}".`,
  };
};

export const executeWidgetTemplateBlockPatchAction = async (
  action: AssistantWidgetTemplateBlockPatchAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getWidgetTemplate(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const patch = applyPageWidgetDataPatch(existing.blocks, {
    blockId: action.input.blockId,
    expectedBlockType: action.input.expectedBlockType,
    dataPath: action.input.dataPath,
    value: action.input.value,
  });
  if (patch.status !== "ok") throw new Error("assistant_action_dependency_missing");
  normalizeAssistantPagePatchBlock(patch.block!);
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateWidgetTemplate(
          existing.id,
          {
            blocks: patch.blocks,
          },
          actorId
        );
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "widget-template",
    targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/widgets/templates/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Widget template block already matched the planned patch."
        : `Patched widget template block "${action.input.blockId}".`,
  };
};

export const executeSiteKitRecommendAction = async (
  action: AssistantSiteKitRecommendAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const plan = deps.previewSiteKitPlan(action.input);
  return {
    actionId: action.id,
    type: action.type,
    targetType: "site-kit",
    targetKey: plan.selectedKitId,
    operation: preview.operation,
    status: "success",
    resourceId: plan.selectedKitId,
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: `Recommended ${plan.selectedKitTitle} for the requested setup.`,
    details: {
      siteKit: {
        plan,
      },
    },
  };
};

export const executeSiteKitInstallAction = async (
  action: AssistantSiteKitInstallAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const execution = await deps.executeSiteKit({
    businessType: action.input.businessType,
    goals: [...action.input.goals],
    locale: action.input.locale,
    region: action.input.region,
    siteName: action.input.siteName,
    preferredKitId: action.input.preferredKitId,
    selectedKitId: action.input.selectedKitId,
    enabledStepIds: action.input.enabledStepIds ? [...action.input.enabledStepIds] : undefined,
    advancedRuntimeOverrides: action.input.advancedRuntimeOverrides,
    dryRun: action.input.dryRun,
    continueOnError: action.input.continueOnError,
    settingsPatch: action.input.settingsPatch,
    notes: action.input.notes,
    actorId,
  });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "site-kit",
    targetKey: execution.selectedKitId,
    operation: preview.operation,
    status: "success",
    resourceId: execution.execution.run.id,
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: `Site kit ${execution.selectedKitTitle} finished with ${execution.validation.status} validation status.`,
    details: {
      siteKit: {
        plan: execution,
        execution,
        validation: execution.validation,
      },
    },
  };
};

export const executeSiteKitValidateAction = async (
  action: AssistantSiteKitValidateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const validation = await deps.validateSiteKitRun(action.input);
  return {
    actionId: action.id,
    type: action.type,
    targetType: "site-kit-run",
    targetKey: action.input.runId,
    operation: preview.operation,
    status: "success",
    resourceId: action.input.runId,
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: `Site kit run validation finished with ${validation.status} status.`,
    details: {
      siteKit: {
        validation,
      },
    },
  };
};

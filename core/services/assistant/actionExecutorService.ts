// Action-executor public entry: dryRunAssistantActionPlan + executeAssistantActionPlan (TASK-569-01).

import { getSetting, setSetting } from "../settings/settingsService";
import {
  createContentType,
  getContentType,
  deleteContentType,
  getContentTypeBySlug,
  updateContentType,
} from "../content/typeService";
import {
  createCustomScreen,
  deleteCustomScreen,
  getCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../customScreens/customScreenService";
import {
  createListingQuery,
  deleteListingQuery,
  listListingQueries,
  updateListingQuery,
} from "../content/listingQueriesService";
import {
  createListingTemplate,
  deleteListingTemplate,
  listListingTemplates,
  updateListingTemplate,
} from "../content/listingTemplatesService";
import {
  getDetailPageDocument,
  prepareDetailPageDocumentUpsert,
  upsertDetailPageDocument,
} from "../content/detailPageDocumentService";
import {
  createEntry,
  deleteEntry,
  getEntry,
  getEntryBySlug,
  publishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../content/entryService";
import {
  createPage,
  deletePage,
  getPage,
  getPageBySlug,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
} from "../pages/pageService";
import {
  deleteSeoDocument,
  getSeoDocument,
  getSeoDocumentByTarget,
  updateSeoDocumentById,
  upsertSeoDocument,
} from "../seo/seoService";
import {
  countFormSubmissions,
  createForm,
  deleteForm,
  getForm,
  listForms,
  setFormFields,
  updateForm,
} from "../forms/formsService";
import { listFormActions, setFormActions } from "../forms/formActionsService";
import {
  createMenu,
  deleteMenuItem,
  listMenus,
  listMenuItems,
  replaceMenuItems,
  updateMenu,
} from "../menus/menuService";
import { getMediaById } from "../media/mediaService";
import { logAudit } from "../audit/auditService";
import {
  type AssistantActionDryRunResult,
  type AssistantActionExecuteResult,
  type AssistantActionExecutionItem,
  type AssistantActionPlan,
  type AssistantActionPreviewChange,
  type AssistantPlannedAction,
  isAssistantActionPlan,
} from "./actionPlanTypes";
import { getAssistantActionHandler } from "./actionRegistry";
import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "./siteBuilderExecutor";
import {
  getAssistantActionExecutionByIdempotencyKey,
  hashAssistantActionPlan,
  saveAssistantActionExecutionResult,
  withAssistantActionExecutionReplayMetadata,
} from "./actionExecutionStore";
import { recordAssistantActionMetric } from "./assistantMetrics";
import { buildAssistantUndoManifestItems } from "./actionUndoManifest";
import type { ActionExecutorDeps, ActionHandlerContext } from "./actionExecutorTypes";
import {
  executionCache,
  cleanupExecutionCache,
  readMemoryExecutionResult,
  countExecutionOperations,
  reconcileLaunchReadinessAfterExecution,
} from "./actionExecutorCache";
import {
  actionHandlers,
  buildPreviewForAction,
  hasBlockingPreviewConflicts,
} from "./actionExecutorRegistry";

const defaultDeps: ActionExecutorDeps = {
  getSetting,
  setSetting,
  getContentType,
  getContentTypeBySlug,
  getDetailPageDocument,
  prepareDetailPageDocumentUpsert,
  upsertDetailPageDocument,
  createContentType,
  deleteContentType,
  updateContentType,
  listCustomScreens,
  createCustomScreen,
  updateCustomScreen,
  getCustomScreen,
  deleteCustomScreen,
  listListingQueries,
  createListingQuery,
  deleteListingQuery,
  updateListingQuery,
  listListingTemplates,
  createListingTemplate,
  deleteListingTemplate,
  updateListingTemplate,
  getPageBySlug,
  getPage,
  listPages,
  createPage,
  deletePage,
  updatePage,
  publishPage,
  unpublishPage,
  getForm,
  listForms,
  countFormSubmissions,
  createForm,
  deleteForm,
  updateForm,
  setFormFields,
  listFormActions,
  setFormActions,
  getEntryBySlug,
  createEntry,
  deleteEntry,
  updateEntry,
  publishEntry,
  updateEntryMetadata,
  getEntry,
  listMenus,
  createMenu,
  updateMenu,
  deleteMenuItem,
  listMenuItems,
  replaceMenuItems,
  getSeoDocument,
  deleteSeoDocument,
  getSeoDocumentByTarget,
  updateSeoDocumentById,
  upsertSeoDocument,
  getMediaById,
  logAudit,
  previewSiteKitPlan: previewGuidedSiteBuilderPlan,
  executeSiteKit: executeGuidedSiteBuilder,
  validateSiteKitRun: validateGuidedSiteBuilderRun,
  getExecutionResult: getAssistantActionExecutionByIdempotencyKey,
  saveExecutionResult: saveAssistantActionExecutionResult,
};

const assertAssistantActionPlan = (value: unknown): AssistantActionPlan => {
  if (!isAssistantActionPlan(value)) {
    throw new Error("assistant_action_plan_invalid");
  }
  return value;
};

export const dryRunAssistantActionPlan = async (
  input: { plan: AssistantActionPlan },
  deps: ActionExecutorDeps = defaultDeps
): Promise<AssistantActionDryRunResult> => {
  const plan = assertAssistantActionPlan(input.plan);
  const changes: AssistantActionPreviewChange[] = [];
  for (const [index, action] of plan.actions.entries()) {
    changes.push(await buildPreviewForAction(action, deps, plan.actions, index));
  }

  return {
    plan,
    changes,
    warnings: changes.flatMap((change) => change.warnings),
    readyToExecute:
      plan.status === "ready" &&
      plan.questions.length === 0 &&
      plan.actions.length > 0 &&
      !hasBlockingPreviewConflicts(changes),
  };
};

const executeAction = async (
  action: AssistantPlannedAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex" | "priorResults">
): Promise<AssistantActionExecutionItem> =>
  getAssistantActionHandler(actionHandlers, action.type).execute(action, preview, {
    deps,
    actorId,
    planActions: ctx.planActions,
    actionIndex: ctx.actionIndex,
    priorResults: ctx.priorResults,
  });

export const executeAssistantActionPlan = async (
  input: {
    plan: AssistantActionPlan;
    actorId: string;
    idempotencyKey: string;
  },
  deps: ActionExecutorDeps = defaultDeps
): Promise<AssistantActionExecuteResult> => {
  const plan = assertAssistantActionPlan(input.plan);
  if (!input.actorId?.trim()) {
    throw new Error("assistant_action_actor_required");
  }
  if (!input.idempotencyKey?.trim()) {
    throw new Error("assistant_action_idempotency_required");
  }

  const planHash = hashAssistantActionPlan(plan);
  cleanupExecutionCache();
  const cached = deps.getExecutionResult
    ? await deps.getExecutionResult({
        idempotencyKey: input.idempotencyKey,
        actorId: input.actorId,
        planId: plan.id,
        planHash,
      })
    : readMemoryExecutionResult({
        idempotencyKey: input.idempotencyKey,
        actorId: input.actorId,
        planId: plan.id,
        planHash,
      });
  if (cached) {
    recordAssistantActionMetric({
      failedCount: cached.summary.failed,
      replayed: true,
    });
    return withAssistantActionExecutionReplayMetadata(cached, true);
  }

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  if (!preview.readyToExecute) {
    throw new Error("assistant_action_plan_not_ready");
  }

  const results: AssistantActionExecutionItem[] = [];
  const priorResults = new Map<string, AssistantActionExecutionItem>();
  for (const [index, change] of preview.changes.entries()) {
    const action = plan.actions.find((entry) => entry.id === change.actionId);
    if (!action) {
      throw new Error("assistant_action_plan_invalid");
    }
    try {
      const result = await executeAction(action, change, input.actorId, deps, {
        planActions: plan.actions,
        actionIndex: index,
        priorResults,
      });
      results.push(result);
      priorResults.set(action.id, result);
    } catch (error) {
      const result: AssistantActionExecutionItem = {
        actionId: action.id,
        type: action.type,
        targetType: change.targetType,
        targetKey: change.targetKey,
        operation: change.operation,
        status: "failed",
        resourceId: null,
        adminHref: null,
        publicHref: null,
        message: error instanceof Error ? error.message : "Assistant action failed.",
        errorCode: error instanceof Error ? error.message : "assistant_action_failed",
      };
      results.push(result);
      priorResults.set(action.id, result);
    }
  }

  const summary = countExecutionOperations(results);
  const idempotency = {
    replayed: false,
    scope: "actor_plan_hash" as const,
  };
  recordAssistantActionMetric({
    failedCount: summary.failed,
    replayed: false,
  });

  await deps.logAudit({
    actorId: input.actorId,
    action: "assistant.actions.execute",
    targetType: "assistant-action-plan",
    targetId: plan.id,
    metadata: {
      actionIds: plan.actions.map((action) => action.id),
      idempotency,
      summary,
    },
  });

  const executedPlan = reconcileLaunchReadinessAfterExecution(plan, results);
  const result: AssistantActionExecuteResult = {
    plan: executedPlan,
    preview,
    results,
    idempotency,
    summary,
  };
  const undoItems = buildAssistantUndoManifestItems({ plan, preview, results });

  if (deps.saveExecutionResult) {
    await deps.saveExecutionResult({
      idempotencyKey: input.idempotencyKey,
      actorId: input.actorId,
      planId: plan.id,
      planHash,
      result,
      undoItems,
    });
  } else {
    executionCache.set(input.idempotencyKey, {
      result,
      actorId: input.actorId,
      planId: plan.id,
      planHash,
      savedAt: Date.now(),
    });
  }

  return result;
};

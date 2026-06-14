import canonicalize from "canonicalize";
import { createHash } from "node:crypto";

import type {
  AssistantActionDryRunResult,
  AssistantActionExecutionItem,
  AssistantActionOperation,
  AssistantActionPlan,
  AssistantPlannedAction,
} from "./actionPlanTypes";
import { redactAssistantMetadata } from "./assistantRedaction";

export type AssistantUndoOperation = AssistantActionOperation | "attach" | "patch";

export type AssistantUndoStrategy =
  | "delete"
  | "archive"
  | "detach"
  | "restore-snapshot"
  | "restore-tree"
  | "rollback-site-kit"
  | "blocked";

export type AssistantUndoItemStatus = "available" | "blocked" | "already-undone" | "manual-only";

export type AssistantUndoManifestItem = {
  actionId: string;
  actionType: AssistantPlannedAction["type"];
  operation: AssistantUndoOperation;
  resourceType: string;
  resourceId: string | null;
  resourceKey: string;
  resourceLabel: string | null;
  createdByAssistant: boolean;
  undoStrategy: AssistantUndoStrategy;
  status: AssistantUndoItemStatus;
  dependencyKeys: string[];
  publicImpact: string[];
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  afterFingerprint: string | null;
  metadata: Record<string, unknown>;
};

const patchActionTypes = new Set<AssistantPlannedAction["type"]>([
  "listing-query.filters.patch",
  "listing-template.card.patch",
  "widget-template.block.patch",
  "custom-screen.widget.patch",
  "form.automation.upsert",
]);

const restoreOnlyActionTypes = new Set<AssistantPlannedAction["type"]>([
  "setting.content-route.upsert",
  "listing-query.filters.patch",
  "listing-template.card.patch",
  "widget-template.block.patch",
  "custom-screen.widget.patch",
]);

const nonMutatingActionTypes = new Set<AssistantPlannedAction["type"]>([
  "site-kit.recommend",
  "site-kit.validate",
]);

const sanitizeRecord = (value: Record<string, unknown>) =>
  redactAssistantMetadata(value) as Record<string, unknown>;

const fingerprintRecord = (value: Record<string, unknown>) => {
  const canonical = canonicalize(value);
  if (!canonical) return null;
  return createHash("sha256").update(canonical).digest("hex");
};

const inferUndoOperation = (
  action: AssistantPlannedAction,
  result: AssistantActionExecutionItem
): AssistantUndoOperation => {
  if (action.type === "media.reference.attach") return "attach";
  if (patchActionTypes.has(action.type)) return "patch";
  return result.operation;
};

const inferUndoStrategy = (
  action: AssistantPlannedAction,
  result: AssistantActionExecutionItem
): AssistantUndoStrategy => {
  if (nonMutatingActionTypes.has(action.type) || result.operation === "noop") {
    return "blocked";
  }
  if (action.type === "site-kit.install") return "rollback-site-kit";
  if (action.type === "media.reference.attach") return "detach";
  if (action.type === "menu.item.upsert" && result.operation === "update") {
    return "restore-tree";
  }
  if (result.operation === "create") return "delete";
  if (restoreOnlyActionTypes.has(action.type) || result.operation === "update") {
    return "restore-snapshot";
  }
  return "blocked";
};

const inferStatus = (
  result: AssistantActionExecutionItem,
  strategy: AssistantUndoStrategy
): AssistantUndoItemStatus => {
  if (result.status !== "success") return "blocked";
  if (strategy === "blocked") return "manual-only";
  return "available";
};

const dependencyKeysFor = (
  result: AssistantActionExecutionItem,
  preview: AssistantActionDryRunResult
) =>
  preview.changes
    .find((change) => change.actionId === result.actionId)
    ?.dependencies.map((dependency) => `${dependency.targetType}:${dependency.targetKey}`) ?? [];

const publicImpactFor = (result: AssistantActionExecutionItem) => {
  const impact: string[] = [];
  if (result.publicHref) impact.push(`publicHref:${result.publicHref}`);
  if (result.targetType === "page") impact.push("public-page");
  if (result.targetType === "detail-page") impact.push("public-detail-page");
  if (result.targetType === "form" && result.operation === "create") {
    impact.push("public-form-contract");
  }
  return impact;
};

const buildAfterSnapshot = (action: AssistantPlannedAction, result: AssistantActionExecutionItem) =>
  sanitizeRecord({
    actionInput: action.input,
    result: {
      actionId: result.actionId,
      type: result.type,
      targetType: result.targetType,
      targetKey: result.targetKey,
      operation: result.operation,
      status: result.status,
      resourceId: result.resourceId,
      adminHref: result.adminHref,
      publicHref: result.publicHref,
      details: result.details,
    },
  });

export function buildAssistantUndoManifestItems(input: {
  plan: AssistantActionPlan;
  preview: AssistantActionDryRunResult;
  results: AssistantActionExecutionItem[];
}): AssistantUndoManifestItem[] {
  return input.results.map((result) => {
    const action = input.plan.actions.find((entry) => entry.id === result.actionId);
    if (!action) throw new Error("assistant_action_plan_invalid");

    const operation = inferUndoOperation(action, result);
    const undoStrategy = inferUndoStrategy(action, result);
    const afterSnapshot = buildAfterSnapshot(action, result);
    const status = inferStatus(result, undoStrategy);

    return {
      actionId: result.actionId,
      actionType: action.type,
      operation,
      resourceType: result.targetType,
      resourceId: result.resourceId,
      resourceKey: result.targetKey,
      resourceLabel: result.message,
      createdByAssistant: result.status === "success" && result.operation === "create",
      undoStrategy,
      status,
      dependencyKeys: dependencyKeysFor(result, input.preview),
      publicImpact: publicImpactFor(result),
      beforeSnapshot: null,
      afterSnapshot,
      afterFingerprint: fingerprintRecord(afterSnapshot),
      metadata: sanitizeRecord({
        planId: input.plan.id,
        intentId: input.plan.intentId,
        promptKind: input.plan.promptKind,
        intentFamily: input.plan.intentFamily,
      }),
    };
  });
}

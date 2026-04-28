import canonicalize from "canonicalize";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { assistantActionExecutions, assistantActionUndoItems } from "../../db/schema";
import { sanitizeMetadata } from "../audit/auditService";
import type { AssistantActionExecuteResult, AssistantActionPlan } from "./actionPlanTypes";
import type { AssistantUndoManifestItem } from "./actionUndoManifest";

export type AssistantActionExecutionLookup = {
  idempotencyKey: string;
  actorId: string;
  planId: string;
  planHash: string;
};

export type AssistantActionExecutionSaveInput = AssistantActionExecutionLookup & {
  result: AssistantActionExecuteResult;
  undoItems?: AssistantUndoManifestItem[];
};

export const hashAssistantActionPlan = (plan: AssistantActionPlan) => {
  const canonical = canonicalize(plan);
  if (!canonical) throw new Error("assistant_action_plan_invalid");
  return createHash("sha256").update(canonical).digest("hex");
};

const sanitizeExecutionResult = (result: AssistantActionExecuteResult) =>
  sanitizeMetadata({ result }).result as AssistantActionExecuteResult;

export const withAssistantActionExecutionReplayMetadata = (
  result: AssistantActionExecuteResult,
  replayed: boolean
): AssistantActionExecuteResult => ({
  ...result,
  idempotency: {
    replayed,
    scope: "actor_plan_hash",
  },
});

export async function getAssistantActionExecutionByIdempotencyKey(
  input: AssistantActionExecutionLookup
): Promise<AssistantActionExecuteResult | null> {
  const [row] = await db
    .select()
    .from(assistantActionExecutions)
    .where(eq(assistantActionExecutions.idempotencyKey, input.idempotencyKey));

  if (!row) return null;
  if (
    row.actorId !== input.actorId ||
    row.planId !== input.planId ||
    row.planHash !== input.planHash
  ) {
    throw new Error("assistant_action_idempotency_conflict");
  }

  return withAssistantActionExecutionReplayMetadata(
    row.result as AssistantActionExecuteResult,
    true
  );
}

export async function saveAssistantActionExecutionResult(
  input: AssistantActionExecutionSaveInput
) {
  const result = sanitizeExecutionResult(
    withAssistantActionExecutionReplayMetadata(input.result, false)
  );
  const [inserted] = await db
    .insert(assistantActionExecutions)
    .values({
      idempotencyKey: input.idempotencyKey,
      actorId: input.actorId,
      planId: input.planId,
      planHash: input.planHash,
      result,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({
      target: assistantActionExecutions.idempotencyKey,
    })
    .returning();

  const execution =
    inserted ??
    (
      await db
        .select()
        .from(assistantActionExecutions)
        .where(eq(assistantActionExecutions.idempotencyKey, input.idempotencyKey))
    )[0];

  if (!execution || !input.undoItems?.length) return;

  await db
    .insert(assistantActionUndoItems)
    .values(
      input.undoItems.map((item) => ({
        executionId: execution.id,
        actionId: item.actionId,
        actionType: item.actionType,
        operation: item.operation,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        resourceKey: item.resourceKey,
        resourceLabel: item.resourceLabel,
        createdByAssistant: item.createdByAssistant,
        undoStrategy: item.undoStrategy,
        status: item.status,
        dependencyKeys: item.dependencyKeys,
        publicImpact: item.publicImpact,
        beforeSnapshot: item.beforeSnapshot,
        afterSnapshot: item.afterSnapshot,
        afterFingerprint: item.afterFingerprint,
        metadata: item.metadata,
        updatedAt: new Date(),
      }))
    )
    .onConflictDoNothing({
      target: [
        assistantActionUndoItems.executionId,
        assistantActionUndoItems.actionId,
        assistantActionUndoItems.resourceType,
        assistantActionUndoItems.resourceKey,
      ],
    });
}

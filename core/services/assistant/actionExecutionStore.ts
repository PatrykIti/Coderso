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

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AssistantActionExecutionRow = typeof assistantActionExecutions.$inferSelect;

const insertOrLoadIdempotentExecution = async (
  input: AssistantActionExecutionSaveInput,
  tx: DbTransaction
): Promise<AssistantActionExecutionRow | undefined> => {
  const result = sanitizeExecutionResult(
    withAssistantActionExecutionReplayMetadata(input.result, false)
  );
  const [inserted] = await tx
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

  return (
    inserted ??
    (
      await tx
        .select()
        .from(assistantActionExecutions)
        .where(eq(assistantActionExecutions.idempotencyKey, input.idempotencyKey))
    )[0]
  );
};

const assertSameActorPlanHash = (
  execution: AssistantActionExecutionRow,
  input: AssistantActionExecutionSaveInput
): void => {
  if (
    execution.actorId !== input.actorId ||
    execution.planId !== input.planId ||
    execution.planHash !== input.planHash
  ) {
    throw new Error("assistant_action_idempotency_conflict");
  }
};

const insertUndoItems = async (
  executionId: string,
  undoItems: AssistantUndoManifestItem[] | undefined,
  tx: DbTransaction
): Promise<void> => {
  if (!undoItems?.length) return;

  await tx
    .insert(assistantActionUndoItems)
    .values(
      undoItems.map((item) => ({
        executionId,
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
};

// Execution and undo-manifest persistence is one transaction: a failure
// between the two statements leaves neither row behind, and a racing save
// that loses the idempotency insert rejects on the stored actor/plan identity
// instead of appending its undo items to another actor's execution.
export async function saveAssistantActionExecutionResult(input: AssistantActionExecutionSaveInput) {
  await db.transaction(async (tx) => {
    const execution = await insertOrLoadIdempotentExecution(input, tx);
    if (!execution) return;
    assertSameActorPlanHash(execution, input);
    await insertUndoItems(execution.id, input.undoItems, tx);
  });
}

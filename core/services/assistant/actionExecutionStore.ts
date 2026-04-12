import canonicalize from "canonicalize";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { assistantActionExecutions } from "../../db/schema";
import { sanitizeMetadata } from "../audit/auditService";
import type { AssistantActionExecuteResult, AssistantActionPlan } from "./actionPlanTypes";

export type AssistantActionExecutionLookup = {
  idempotencyKey: string;
  actorId: string;
  planId: string;
  planHash: string;
};

export type AssistantActionExecutionSaveInput = AssistantActionExecutionLookup & {
  result: AssistantActionExecuteResult;
};

export const hashAssistantActionPlan = (plan: AssistantActionPlan) => {
  const canonical = canonicalize(plan);
  if (!canonical) throw new Error("assistant_action_plan_invalid");
  return createHash("sha256").update(canonical).digest("hex");
};

const sanitizeExecutionResult = (result: AssistantActionExecuteResult) =>
  sanitizeMetadata({ result }).result as AssistantActionExecuteResult;

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

  return row.result as AssistantActionExecuteResult;
}

export async function saveAssistantActionExecutionResult(
  input: AssistantActionExecutionSaveInput
) {
  const result = sanitizeExecutionResult(input.result);
  await db
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
    });
}

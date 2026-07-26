import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { formActionRuns, formActions } from "../../db/schema";
import {
  normalizeFormActionsForWrite,
  normalizeFormActionCondition,
  parseFormActionConfigByType,
  type FormActionCondition,
  type FormActionConfig,
  type FormActionType,
  type NormalizedFormAction,
} from "./formActionsContract";
import { getForm } from "./formsService";

export type FormActionRecord = {
  id: string;
  formId: string;
  type: FormActionType;
  label: string;
  enabled: boolean;
  continueOnError: boolean;
  condition: FormActionCondition;
  config: FormActionConfig;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FormActionRunStatus = "success" | "failed" | "skipped";
export type FormActionRunTrigger = "submission" | "retry";

export type FormActionRunRecord = {
  id: string;
  formId: string;
  submissionId: string | null;
  actionId: string | null;
  actionType: FormActionType;
  actionLabel: string;
  status: FormActionRunStatus;
  attempt: number;
  trigger: FormActionRunTrigger;
  errorCode: string | null;
  errorMessage: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  actionCondition: FormActionCondition;
  actionConfig: FormActionConfig;
  submissionPayload: Record<string, unknown>;
  retryOfId: string | null;
  createdAt: Date;
};

export type CreateFormActionRunInput = {
  formId: string;
  submissionId?: string | null;
  actionId?: string | null;
  actionType: FormActionType;
  actionLabel: string;
  status: FormActionRunStatus;
  attempt?: number;
  trigger?: FormActionRunTrigger;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  actionCondition: FormActionCondition;
  actionConfig: FormActionConfig;
  submissionPayload: Record<string, unknown>;
  retryOfId?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeActionRow = (row: typeof formActions.$inferSelect): FormActionRecord => ({
  id: row.id,
  formId: row.formId,
  type: row.type as FormActionType,
  label: row.label,
  enabled: row.enabled,
  continueOnError: row.continueOnError,
  condition: normalizeFormActionCondition(row.condition),
  config: parseFormActionConfigByType(row.type as FormActionType, row.config),
  orderIndex: row.orderIndex,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const normalizeRunRow = (row: typeof formActionRuns.$inferSelect): FormActionRunRecord => {
  const actionType = row.actionType as FormActionType;
  return {
    id: row.id,
    formId: row.formId,
    submissionId: row.submissionId,
    actionId: row.actionId,
    actionType,
    actionLabel: row.actionLabel,
    status: row.status as FormActionRunStatus,
    attempt: row.attempt,
    trigger: row.trigger as FormActionRunTrigger,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    requestPayload: isRecord(row.requestPayload)
      ? (row.requestPayload as Record<string, unknown>)
      : null,
    responsePayload: isRecord(row.responsePayload)
      ? (row.responsePayload as Record<string, unknown>)
      : null,
    actionCondition: normalizeFormActionCondition(row.actionCondition),
    actionConfig: parseFormActionConfigByType(actionType, row.actionConfig),
    submissionPayload: isRecord(row.submissionPayload)
      ? (row.submissionPayload as Record<string, unknown>)
      : {},
    retryOfId: row.retryOfId,
    createdAt: row.createdAt,
  };
};

const normalizeActionLabel = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function listFormActions(formId: string) {
  const rows = await db
    .select()
    .from(formActions)
    .where(eq(formActions.formId, formId))
    .orderBy(asc(formActions.orderIndex), asc(formActions.createdAt));

  return rows.map(normalizeActionRow);
}

export async function setFormActions(formId: string, input: unknown) {
  const form = await getForm(formId);
  if (!form) throw new Error("form_not_found");

  const normalized = normalizeFormActionsForWrite(input);

  const now = new Date();

  const inserted = await db.transaction(async (tx) => {
    await tx.delete(formActions).where(eq(formActions.formId, formId));
    if (normalized.length === 0) {
      return [] as (typeof formActions.$inferSelect)[];
    }

    return tx
      .insert(formActions)
      .values(
        normalized.map((action) => ({
          id: action.id,
          formId,
          type: action.type,
          label: action.label,
          enabled: action.enabled,
          continueOnError: action.continueOnError,
          condition: action.condition,
          config: action.config,
          orderIndex: action.orderIndex,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
  });

  return inserted.map(normalizeActionRow);
}

export async function getFormActionById(actionId: string) {
  const [row] = await db.select().from(formActions).where(eq(formActions.id, actionId));

  return row ? normalizeActionRow(row) : null;
}

export async function createFormActionRun(input: CreateFormActionRunInput) {
  const actionLabel = normalizeActionLabel(input.actionLabel);
  if (!actionLabel) throw new Error("form_action_invalid_label");

  const [row] = await db
    .insert(formActionRuns)
    .values({
      formId: input.formId,
      submissionId: input.submissionId ?? null,
      actionId: input.actionId ?? null,
      actionType: input.actionType,
      actionLabel,
      status: input.status,
      attempt: input.attempt ?? 1,
      trigger: input.trigger ?? "submission",
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      requestPayload: input.requestPayload ?? null,
      responsePayload: input.responsePayload ?? null,
      actionCondition: input.actionCondition,
      actionConfig: input.actionConfig,
      submissionPayload: input.submissionPayload,
      retryOfId: input.retryOfId ?? null,
    })
    .returning();

  if (!row) throw new Error("form_action_run_create_failed");
  return normalizeRunRow(row);
}

export async function listFormActionRuns(
  formId: string,
  options?: { status?: FormActionRunStatus; limit?: number }
) {
  const filters = [eq(formActionRuns.formId, formId)];
  if (options?.status) {
    filters.push(eq(formActionRuns.status, options.status));
  }

  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(Math.round(options.limit), 200))
      : 100;

  const rows = await db
    .select()
    .from(formActionRuns)
    .where(and(...filters))
    .orderBy(desc(formActionRuns.createdAt))
    .limit(limit);

  return rows.map(normalizeRunRow);
}

export async function getFormActionRun(runId: string) {
  const [row] = await db.select().from(formActionRuns).where(eq(formActionRuns.id, runId));

  return row ? normalizeRunRow(row) : null;
}

export async function resolveNextActionAttempt(params: {
  formId: string;
  submissionId?: string | null;
  actionId?: string | null;
}) {
  const whereFilters = [eq(formActionRuns.formId, params.formId)];
  if (params.submissionId) {
    whereFilters.push(eq(formActionRuns.submissionId, params.submissionId));
  }
  if (params.actionId) {
    whereFilters.push(eq(formActionRuns.actionId, params.actionId));
  }

  const [row] = await db
    .select({ maxAttempt: sql<number>`max(${formActionRuns.attempt})` })
    .from(formActionRuns)
    .where(and(...whereFilters));

  const maxAttempt = row?.maxAttempt ?? 0;
  return maxAttempt + 1;
}

export function toFormActionForRunner(row: FormActionRecord): NormalizedFormAction {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    enabled: row.enabled,
    continueOnError: row.continueOnError,
    condition: row.condition,
    config: row.config,
    orderIndex: row.orderIndex,
  };
}

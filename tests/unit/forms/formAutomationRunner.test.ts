import { expect, test } from "bun:test";

import {
  retryFormAutomationRun,
  runFormAutomation,
} from "../../../core/services/forms/formAutomationRunner";
import type {
  CreateFormActionRunInput,
  FormActionRecord,
  FormActionRunRecord,
} from "../../../core/services/forms/formActionsService";

const now = new Date("2026-02-18T10:00:00.000Z");

const createAction = (
  overrides: Partial<FormActionRecord>
): FormActionRecord => ({
  id: overrides.id ?? "action-1",
  formId: overrides.formId ?? "form-1",
  type: overrides.type ?? "success_message",
  label: overrides.label ?? "Action",
  enabled: overrides.enabled ?? true,
  continueOnError: overrides.continueOnError ?? true,
  condition: overrides.condition ?? { operator: "always" },
  config: overrides.config ?? { message: "Done" },
  orderIndex: overrides.orderIndex ?? 0,
  createdAt: overrides.createdAt ?? now,
  updatedAt: overrides.updatedAt ?? now,
});

const createRunRecord = (
  input: CreateFormActionRunInput,
  index: number
): FormActionRunRecord => ({
  id: `run-${index + 1}`,
  formId: input.formId,
  submissionId: input.submissionId ?? null,
  actionId: input.actionId ?? null,
  actionType: input.actionType,
  actionLabel: input.actionLabel,
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
  createdAt: now,
});

test("runFormAutomation executes ordered actions and merges runtime outcome", async () => {
  const logs: CreateFormActionRunInput[] = [];

  const result = await runFormAutomation(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        name: "Patryk",
      },
      submittedAt: now,
    },
    {
      listActions: async () => [
        createAction({
          id: "message",
          type: "success_message",
          label: "Success message",
          config: { message: "Thanks {{submission.name}}" },
          orderIndex: 0,
        }),
        createAction({
          id: "redirect",
          type: "redirect",
          label: "Redirect",
          config: { url: "/thanks?name={{submission.name}}" },
          orderIndex: 1,
        }),
      ],
      resolveNextAttempt: async () => 1,
      createRun: async (input) => {
        logs.push(input);
        return createRunRecord(input, logs.length - 1);
      },
    }
  );

  expect(result.successMessage).toBe("Thanks Patryk");
  expect(result.redirectUrl).toBe("/thanks?name=Patryk");
  expect(result.runs).toHaveLength(2);
  expect(logs[0]?.status).toBe("success");
  expect(logs[1]?.status).toBe("success");
});

test("runFormAutomation skips action when condition is not met", async () => {
  const logs: CreateFormActionRunInput[] = [];

  const result = await runFormAutomation(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        intent: "support",
      },
    },
    {
      listActions: async () => [
        createAction({
          id: "conditional",
          type: "redirect",
          config: { url: "/quote" },
          condition: {
            operator: "equals",
            field: "intent",
            value: "quote",
          },
        }),
      ],
      resolveNextAttempt: async () => 1,
      createRun: async (input) => {
        logs.push(input);
        return createRunRecord(input, logs.length - 1);
      },
    }
  );

  expect(result.redirectUrl).toBeNull();
  expect(result.runs).toHaveLength(1);
  expect(result.runs[0]?.status).toBe("skipped");
  expect(logs[0]?.responsePayload).toEqual({ reason: "condition_not_met" });
});

test("runFormAutomation stops when action fails and continueOnError is false", async () => {
  const logs: CreateFormActionRunInput[] = [];

  const result = await runFormAutomation(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        email: "lead@example.com",
      },
    },
    {
      listActions: async () => [
        createAction({
          id: "email",
          type: "email",
          continueOnError: false,
          config: {
            to: "{{submission.email}}",
            subject: "Lead",
            text: "Body",
          },
        }),
        createAction({
          id: "next",
          type: "success_message",
          config: { message: "Should not run" },
          orderIndex: 1,
        }),
      ],
      resolveNextAttempt: async () => 1,
      createRun: async (input) => {
        logs.push(input);
        return createRunRecord(input, logs.length - 1);
      },
    }
  );

  expect(result.runs).toHaveLength(1);
  expect(result.runs[0]?.status).toBe("failed");
});

test("retryFormAutomationRun reruns failed action snapshot", async () => {
  const runInputs: CreateFormActionRunInput[] = [];

  const sourceRun = createRunRecord(
    {
      formId: "form-1",
      submissionId: "submission-1",
      actionId: "action-1",
      actionType: "success_message",
      actionLabel: "Success message",
      status: "failed",
      attempt: 1,
      trigger: "submission",
      actionCondition: { operator: "always" },
      actionConfig: { message: "Retry {{submission.name}}" },
      submissionPayload: { name: "Patryk" },
      errorCode: "form_action_failed",
      errorMessage: "Action execution failed",
    },
    0
  );

  const retry = await retryFormAutomationRun("run-1", {
    getRunById: async () => sourceRun,
    resolveNextAttempt: async () => 2,
    createRun: async (input) => {
      runInputs.push(input);
      return createRunRecord(input, runInputs.length);
    },
  });

  expect(retry.run.status).toBe("success");
  expect(retry.run.trigger).toBe("retry");
  expect(retry.result.successMessage).toBe("Retry Patryk");
  expect(runInputs[0]?.retryOfId).toBe("run-1");
});

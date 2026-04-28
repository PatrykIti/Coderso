import { expect, test, vi } from "vitest";

import {
  retryFormAutomationRunCore,
  runFormAutomationCore,
  type FormAutomationRunnerCoreDeps,
} from "../../../core/services/forms/formAutomationRunnerCore";
import type { NormalizedFormAction } from "../../../core/services/forms/formActionsContract";
import type {
  CreateFormActionRunInput,
  FormActionRunRecord,
} from "../../../core/services/forms/formActionsService";

const now = new Date("2026-02-18T10:00:00.000Z");

const createAction = (
  overrides: Partial<NormalizedFormAction>
): NormalizedFormAction => ({
  id: overrides.id ?? "action-1",
  type: overrides.type ?? "success_message",
  label: overrides.label ?? "Action",
  enabled: overrides.enabled ?? true,
  continueOnError: overrides.continueOnError ?? true,
  condition: overrides.condition ?? { operator: "always" },
  config: overrides.config ?? { message: "Done" },
  orderIndex: overrides.orderIndex ?? 0,
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

const createCoreDeps = (
  overrides: Partial<FormAutomationRunnerCoreDeps> = {}
): FormAutomationRunnerCoreDeps => ({
  listActions: async () => [],
  createRun: async (input) => createRunRecord(input, 0),
  resolveNextAttempt: async () => 1,
  getRunById: async () => null,
  getFormSettingsById: async () => null,
  getEmailSettings: async () => ({
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer@example.com",
      password: "secret",
    },
    from: {
      name: "Coderso",
      email: "hello@example.com",
    },
  }),
  createEmailTransport: async () => ({
    sendMail: async () => ({
      messageId: "message-1",
      response: "queued",
    }),
  }),
  getEntryBySlug: async () => null,
  createEntry: async () => ({ id: "entry-1" }),
  updateEntry: async () => ({ id: "entry-1" }),
  fetchFn: async () => new Response("ok", { status: 200 }),
  sleep: async () => undefined,
  ...overrides,
});

test("runFormAutomationCore executes ordered actions and merges runtime outcome", async () => {
  const logs: CreateFormActionRunInput[] = [];

  const result = await runFormAutomationCore(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        name: "Patryk",
      },
      submittedAt: now,
    },
    createCoreDeps({
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
    })
  );

  expect(result.successMessage).toBe("Thanks Patryk");
  expect(result.redirectUrl).toBe("/thanks?name=Patryk");
  expect(result.runs).toHaveLength(2);
  expect(logs[0]?.status).toBe("success");
  expect(logs[1]?.status).toBe("success");
});

test("runFormAutomationCore renders email actions with configured sender defaults", async () => {
  const deliveries: Array<Record<string, string | undefined>> = [];

  const result = await runFormAutomationCore(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        email: "lead@example.com",
        name: "Patryk",
      },
      submittedAt: now,
    },
    createCoreDeps({
      listActions: async () => [
        createAction({
          id: "email",
          type: "email",
          label: "Send email",
          config: {
            to: "{{submission.email}}",
            subject: "Lead {{submission.name}}",
            text: "Body for {{submission.name}}",
          },
        }),
      ],
      createEmailTransport: async () => ({
        sendMail: async (message) => {
          deliveries.push(message);
          return {
            messageId: "message-1",
            response: "queued",
          };
        },
      }),
    })
  );

  expect(result.runs).toHaveLength(1);
  expect(result.runs[0]?.status).toBe("success");
  expect(deliveries).toEqual([
    {
      from: "Coderso <hello@example.com>",
      to: "lead@example.com",
      subject: "Lead Patryk",
      text: "Body for Patryk",
    },
  ]);
});

test("runFormAutomationCore skips action when condition is not met", async () => {
  const logs: CreateFormActionRunInput[] = [];

  const result = await runFormAutomationCore(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        intent: "support",
      },
    },
    createCoreDeps({
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
    })
  );

  expect(result.redirectUrl).toBeNull();
  expect(result.runs).toHaveLength(1);
  expect(result.runs[0]?.status).toBe("skipped");
  expect(logs[0]?.responsePayload).toEqual({ reason: "condition_not_met" });
});

test("runFormAutomationCore stops when action fails and continueOnError is false", async () => {
  const logs: CreateFormActionRunInput[] = [];

  const result = await runFormAutomationCore(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: {
        email: "lead@example.com",
      },
    },
    createCoreDeps({
      listActions: async () => [
        createAction({
          id: "webhook",
          type: "webhook",
          continueOnError: false,
          config: {
            url: "https://example.com/hook",
            method: "POST",
            headers: {},
            includeSubmission: true,
            timeoutMs: 1000,
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
      fetchFn: async () => new Response("failed", { status: 500 }),
    })
  );

  expect(result.runs).toHaveLength(1);
  expect(result.runs[0]?.status).toBe("failed");
});

test("runFormAutomationCore retries failed action when retry policy is enabled", async () => {
  const logs: CreateFormActionRunInput[] = [];
  const sleep = vi.fn(async () => undefined);
  let fetchCalls = 0;
  let attemptCounter = 0;

  const result = await runFormAutomationCore(
    {
      formId: "form-1",
      submissionId: "submission-1",
      submissionPayload: { name: "Patryk" },
      settings: {
        automationRetry: {
          enabled: true,
          maxAttempts: 2,
          baseDelayMs: 1,
          maxDelayMs: 1,
        },
      },
    },
    createCoreDeps({
      listActions: async () => [
        createAction({
          id: "webhook",
          type: "webhook",
          label: "Webhook",
          config: {
            url: "https://example.com/hook",
            method: "POST",
            headers: {},
            includeSubmission: true,
            timeoutMs: 1000,
          },
        }),
      ],
      resolveNextAttempt: async () => {
        attemptCounter += 1;
        return attemptCounter;
      },
      createRun: async (input) => {
        logs.push(input);
        return createRunRecord(input, logs.length - 1);
      },
      fetchFn: async () => {
        fetchCalls += 1;
        if (fetchCalls === 1) {
          return new Response("failed", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
      sleep,
    })
  );

  expect(result.runs).toHaveLength(2);
  expect(result.runs[0]?.status).toBe("failed");
  expect(result.runs[1]?.status).toBe("success");
  expect(result.runs[1]?.attempt).toBe(2);
  expect(logs[0]?.responsePayload).toEqual({ retryScheduled: true, retryDelayMs: 50 });
  expect(sleep).toHaveBeenCalledWith(50);
});

test("retryFormAutomationRunCore reruns failed action snapshot", async () => {
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

  const retry = await retryFormAutomationRunCore(
    "run-1",
    createCoreDeps({
      getRunById: async () => sourceRun,
      getFormSettingsById: async () => null,
      resolveNextAttempt: async () => 2,
      createRun: async (input) => {
        runInputs.push(input);
        return createRunRecord(input, runInputs.length);
      },
    })
  );

  expect(retry.run.status).toBe("success");
  expect(retry.run.trigger).toBe("retry");
  expect(retry.result.successMessage).toBe("Retry Patryk");
  expect(runInputs[0]?.retryOfId).toBe("run-1");
});

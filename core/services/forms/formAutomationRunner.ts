import {
  createEntry,
  getEntryBySlug,
  updateEntry,
  type EntryData,
} from "../content/entryService";
import { createTransport } from "../email/emailProvider";
import { getEmailSettingsInternal } from "../email/emailSettingsService";
import { getForm } from "./formsService";
import {
  normalizeFormSettings,
  type FormAutomationRetrySettings,
} from "./formSettings";
import {
  matchesFormActionCondition,
  type FormActionConfig,
  type FormActionEntrySyncConfig,
  type NormalizedFormAction,
} from "./formActionsContract";
import {
  createFormActionRun,
  getFormActionRun,
  listFormActions,
  resolveNextActionAttempt,
  toFormActionForRunner,
  type FormActionRunRecord,
  type FormActionRunStatus,
} from "./formActionsService";
import {
  renderTemplateRecord,
  renderTemplateString,
  type FormActionTemplateContext,
} from "./formActionTemplating";

export type RunFormAutomationInput = {
  formId: string;
  submissionId?: string | null;
  submissionPayload: Record<string, unknown>;
  submittedAt?: Date;
  settings?: unknown;
};

export type FormAutomationResult = {
  successMessage: string | null;
  redirectUrl: string | null;
  runs: FormActionRunRecord[];
};

type ActionExecutionResult = {
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  successMessage?: string | null;
  redirectUrl?: string | null;
};

type RunnerDeps = {
  listActions: typeof listFormActions;
  createRun: typeof createFormActionRun;
  resolveNextAttempt: typeof resolveNextActionAttempt;
  getRunById: typeof getFormActionRun;
  getFormById: typeof getForm;
  fetchFn: typeof fetch;
};

const runnerDeps: RunnerDeps = {
  listActions: listFormActions,
  createRun: createFormActionRun,
  resolveNextAttempt: resolveNextActionAttempt,
  getRunById: getFormActionRun,
  getFormById: getForm,
  fetchFn: fetch,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSubmissionPayload = (value: unknown) => {
  if (!isRecord(value)) return {};
  return value;
};

const normalizeSlug = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  if (!slug) throw new Error("form_action_entry_sync_slug_invalid");
  return slug;
};

const toTemplateContext = (
  input: RunFormAutomationInput,
  submissionId: string | null
): FormActionTemplateContext => ({
  formId: input.formId,
  submissionId: submissionId ?? "",
  submission: normalizeSubmissionPayload(input.submissionPayload),
  meta: {
    createdAt: (input.submittedAt ?? new Date()).toISOString(),
  },
});

const resolveActionErrorCode = (error: unknown) => {
  if (error instanceof Error) {
    return error.message || "form_action_failed";
  }
  return "form_action_failed";
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Action execution failed";
};

const parseTemplateJson = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed) as Record<string, unknown> | unknown[];
    } catch {
      return null;
    }
  }
  return null;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const resolveRetryDelayMs = (
  retry: FormAutomationRetrySettings,
  attemptNumber: number
) => {
  const factor = Math.max(0, attemptNumber - 1);
  const delay = retry.baseDelayMs * 2 ** factor;
  return Math.min(retry.maxDelayMs, delay);
};

const executeEmailAction = async (
  config: FormActionConfig,
  context: FormActionTemplateContext
): Promise<ActionExecutionResult> => {
  if (config && "to" in config && "subject" in config) {
    const renderedTo = renderTemplateString(config.to, context);
    const renderedSubject = renderTemplateString(config.subject, context);
    const renderedText = config.text ? renderTemplateString(config.text, context) : undefined;
    const renderedHtml = config.html ? renderTemplateString(config.html, context) : undefined;

    const settings = await getEmailSettingsInternal();
    if (
      !settings.smtp.host ||
      !settings.smtp.port ||
      !settings.smtp.user ||
      !settings.smtp.password
    ) {
      throw new Error("email_not_configured");
    }

    const fromEmail =
      (config.fromEmail ? renderTemplateString(config.fromEmail, context) : null) ??
      settings.from.email ??
      settings.smtp.user;
    if (!fromEmail) throw new Error("email_not_configured");

    const fromName =
      (config.fromName ? renderTemplateString(config.fromName, context) : null) ??
      settings.from.name ??
      "Nextless";

    const transport = await createTransport({
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      user: settings.smtp.user,
      password: settings.smtp.password,
    });

    const delivery = await transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: renderedTo,
      subject: renderedSubject,
      ...(renderedText ? { text: renderedText } : {}),
      ...(renderedHtml ? { html: renderedHtml } : {}),
    });

    return {
      requestPayload: {
        to: renderedTo,
        subject: renderedSubject,
      },
      responsePayload: {
        messageId: delivery.messageId,
        response: delivery.response ?? null,
      },
    };
  }

  throw new Error("form_action_invalid_config");
};

const executeWebhookAction = async (
  config: FormActionConfig,
  context: FormActionTemplateContext,
  fetchFn: typeof fetch
): Promise<ActionExecutionResult> => {
  if (
    !config ||
    !("url" in config) ||
    !("method" in config) ||
    !("headers" in config)
  ) {
    throw new Error("form_action_invalid_config");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  const renderedUrl = renderTemplateString(config.url, context);
  const renderedHeaders = renderTemplateRecord(config.headers, context);

  const body: Record<string, unknown> = {};
  if (config.includeSubmission) {
    body.submission = context.submission;
    body.submissionId = context.submissionId;
    body.formId = context.formId;
  }

  if (config.bodyTemplate) {
    const renderedBodyTemplate = renderTemplateString(config.bodyTemplate, context);
    const parsedBody = parseTemplateJson(renderedBodyTemplate);
    body.template = parsedBody ?? renderedBodyTemplate;
  }

  try {
    const response = await fetchFn(renderedUrl, {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...renderedHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`form_action_webhook_failed_${response.status}`);
    }

    return {
      requestPayload: {
        url: renderedUrl,
        method: config.method,
      },
      responsePayload: {
        status: response.status,
        body: responseText.slice(0, 4_000),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};

const buildEntryDataFromMapping = (
  config: FormActionEntrySyncConfig,
  context: FormActionTemplateContext
): EntryData => {
  const data: Record<string, unknown> = {};
  for (const [field, template] of Object.entries(config.dataMapping)) {
    data[field] = renderTemplateString(template, context);
  }
  return data;
};

const executeEntrySyncAction = async (
  config: FormActionConfig,
  context: FormActionTemplateContext
): Promise<ActionExecutionResult> => {
  if (
    !config ||
    !("contentTypeId" in config) ||
    !("mode" in config) ||
    !("titleTemplate" in config) ||
    !("slugTemplate" in config)
  ) {
    throw new Error("form_action_invalid_config");
  }

  const title = renderTemplateString(config.titleTemplate, context).trim();
  if (!title) throw new Error("form_action_entry_sync_title_required");
  const slug = normalizeSlug(renderTemplateString(config.slugTemplate, context));

  const data = buildEntryDataFromMapping(config, context);

  if (config.mode === "upsert_by_slug") {
    const existing = await getEntryBySlug(config.contentTypeId, slug);
    if (existing) {
      const updated = await updateEntry(existing.id, {
        title,
        slug,
        data,
      });
      return {
        requestPayload: {
          mode: config.mode,
          slug,
        },
        responsePayload: {
          entryId: updated?.id ?? existing.id,
          operation: "update",
        },
      };
    }
  }

  const created = await createEntry(config.contentTypeId, {
    title,
    slug,
    data,
  });

  return {
    requestPayload: {
      mode: config.mode,
      slug,
    },
    responsePayload: {
      entryId: created?.id ?? null,
      operation: "create",
    },
  };
};

const executeRedirectAction = async (
  config: FormActionConfig,
  context: FormActionTemplateContext
): Promise<ActionExecutionResult> => {
  if (!config || !("url" in config)) {
    throw new Error("form_action_invalid_config");
  }

  return {
    redirectUrl: renderTemplateString(config.url, context),
  };
};

const executeSuccessMessageAction = async (
  config: FormActionConfig,
  context: FormActionTemplateContext
): Promise<ActionExecutionResult> => {
  if (!config || !("message" in config)) {
    throw new Error("form_action_invalid_config");
  }

  return {
    successMessage: renderTemplateString(config.message, context),
  };
};

const executeAction = async (
  action: NormalizedFormAction,
  context: FormActionTemplateContext,
  deps: RunnerDeps
) => {
  if (action.type === "email") {
    return executeEmailAction(action.config, context);
  }
  if (action.type === "webhook") {
    return executeWebhookAction(action.config, context, deps.fetchFn);
  }
  if (action.type === "entry_sync") {
    return executeEntrySyncAction(action.config, context);
  }
  if (action.type === "redirect") {
    return executeRedirectAction(action.config, context);
  }
  return executeSuccessMessageAction(action.config, context);
};

const runOneAction = async (
  action: NormalizedFormAction,
  input: RunFormAutomationInput,
  context: FormActionTemplateContext,
  deps: RunnerDeps,
  retrySettings: FormAutomationRetrySettings,
  options?: {
    trigger?: "submission" | "retry";
    retryOfId?: string | null;
    forceRun?: boolean;
  }
) => {
  const submissionPayload = normalizeSubmissionPayload(input.submissionPayload);
  const attempt = await deps.resolveNextAttempt({
    formId: input.formId,
    submissionId: input.submissionId,
    actionId: action.id,
  });

  const shouldRun = options?.forceRun
    ? true
    : action.enabled && matchesFormActionCondition(action.condition, submissionPayload);

  if (!shouldRun) {
    const run = await deps.createRun({
      formId: input.formId,
      submissionId: input.submissionId,
      actionId: action.id,
      actionType: action.type,
      actionLabel: action.label,
      status: "skipped",
      attempt,
      trigger: options?.trigger ?? "submission",
      actionCondition: action.condition,
      actionConfig: action.config,
      submissionPayload,
      responsePayload: {
        reason: action.enabled ? "condition_not_met" : "disabled",
      },
      retryOfId: options?.retryOfId ?? null,
    });

    return {
      runs: [run],
      outcome: {
        successMessage: null,
        redirectUrl: null,
      },
    };
  }

  const maxAttempts = retrySettings.enabled
    ? Math.max(1, retrySettings.maxAttempts)
    : 1;
  const runs: FormActionRunRecord[] = [];
  let attemptCounter = attempt;

  for (let executionIndex = 0; executionIndex < maxAttempts; executionIndex += 1) {
    if (executionIndex > 0) {
      attemptCounter = await deps.resolveNextAttempt({
        formId: input.formId,
        submissionId: input.submissionId,
        actionId: action.id,
      });
    }

    try {
      const execution = await executeAction(action, context, deps);
      const successRun = await deps.createRun({
        formId: input.formId,
        submissionId: input.submissionId,
        actionId: action.id,
        actionType: action.type,
        actionLabel: action.label,
        status: "success",
        attempt: attemptCounter,
        trigger: options?.trigger ?? "submission",
        actionCondition: action.condition,
        actionConfig: action.config,
        submissionPayload,
        requestPayload: execution.requestPayload ?? null,
        responsePayload: execution.responsePayload ?? null,
        retryOfId: options?.retryOfId ?? null,
      });
      runs.push(successRun);

      return {
        runs,
        outcome: {
          successMessage: execution.successMessage ?? null,
          redirectUrl: execution.redirectUrl ?? null,
        },
      };
    } catch (error) {
      const hasMoreAttempts = executionIndex + 1 < maxAttempts;
      const retryDelayMs = hasMoreAttempts
        ? resolveRetryDelayMs(retrySettings, executionIndex + 1)
        : null;
      const failedRun = await deps.createRun({
        formId: input.formId,
        submissionId: input.submissionId,
        actionId: action.id,
        actionType: action.type,
        actionLabel: action.label,
        status: "failed",
        attempt: attemptCounter,
        trigger: options?.trigger ?? "submission",
        actionCondition: action.condition,
        actionConfig: action.config,
        submissionPayload,
        errorCode: resolveActionErrorCode(error),
        errorMessage: toErrorMessage(error),
        responsePayload:
          hasMoreAttempts && retryDelayMs !== null
            ? {
                retryScheduled: true,
                retryDelayMs,
              }
            : null,
        retryOfId: options?.retryOfId ?? null,
      });
      runs.push(failedRun);

      if (hasMoreAttempts && retryDelayMs !== null) {
        await sleep(retryDelayMs);
        continue;
      }

      return {
        runs,
        outcome: {
          successMessage: null,
          redirectUrl: null,
        },
        error,
      };
    }
  }

  return {
    runs,
    outcome: {
      successMessage: null,
      redirectUrl: null,
    },
  };
};

const mergeResult = (
  result: FormAutomationResult,
  outcome: { successMessage: string | null; redirectUrl: string | null }
) => {
  if (outcome.successMessage) {
    result.successMessage = outcome.successMessage;
  }
  if (outcome.redirectUrl) {
    result.redirectUrl = outcome.redirectUrl;
  }
};

export async function runFormAutomation(
  input: RunFormAutomationInput,
  deps: Partial<RunnerDeps> = {}
): Promise<FormAutomationResult> {
  const resolvedDeps: RunnerDeps = { ...runnerDeps, ...deps };
  const rows = await resolvedDeps.listActions(input.formId);
  const actions = rows
    .map(toFormActionForRunner)
    .sort((left, right) => left.orderIndex - right.orderIndex);

  const result: FormAutomationResult = {
    successMessage: null,
    redirectUrl: null,
    runs: [],
  };

  if (actions.length === 0) {
    return result;
  }

  const context = toTemplateContext(input, input.submissionId ?? null);
  const normalizedSettings = normalizeFormSettings(input.settings);
  const retrySettings = normalizedSettings.automationRetry;

  for (const action of actions) {
    const execution = await runOneAction(
      action,
      input,
      context,
      resolvedDeps,
      retrySettings
    );
    result.runs.push(...execution.runs);
    mergeResult(result, execution.outcome);

    if (execution.error && !action.continueOnError) {
      break;
    }
  }

  return result;
}

export async function retryFormAutomationRun(
  runId: string,
  deps: Partial<RunnerDeps> = {}
): Promise<{ run: FormActionRunRecord; result: FormAutomationResult }> {
  const resolvedDeps: RunnerDeps = { ...runnerDeps, ...deps };
  const sourceRun = await resolvedDeps.getRunById(runId);
  if (!sourceRun) throw new Error("form_action_run_not_found");
  if (sourceRun.status !== "failed") {
    throw new Error("form_action_run_retry_invalid_status");
  }

  const action: NormalizedFormAction = {
    id: sourceRun.actionId ?? sourceRun.id,
    type: sourceRun.actionType,
    label: sourceRun.actionLabel,
    enabled: true,
    continueOnError: true,
    condition: sourceRun.actionCondition,
    config: sourceRun.actionConfig,
    orderIndex: 0,
  };

  const input: RunFormAutomationInput = {
    formId: sourceRun.formId,
    submissionId: sourceRun.submissionId,
    submissionPayload: sourceRun.submissionPayload,
    submittedAt: sourceRun.createdAt,
  };
  const context = toTemplateContext(input, sourceRun.submissionId ?? null);
  const form = await resolvedDeps.getFormById(sourceRun.formId);
  const retrySettings = normalizeFormSettings(form?.settings).automationRetry;

  const execution = await runOneAction(
    action,
    input,
    context,
    resolvedDeps,
    retrySettings,
    {
      trigger: "retry",
      retryOfId: sourceRun.id,
      forceRun: true,
    }
  );
  const run = execution.runs[execution.runs.length - 1];
  if (!run) {
    throw new Error("form_action_retry_failed");
  }

  const result: FormAutomationResult = {
    successMessage: execution.outcome.successMessage,
    redirectUrl: execution.outcome.redirectUrl,
    runs: execution.runs,
  };

  return {
    run,
    result,
  };
}

export function summarizeAutomationRunStatus(runs: FormActionRunRecord[]) {
  return runs.reduce(
    (acc, run) => {
      if (run.status === "success") acc.success += 1;
      if (run.status === "failed") acc.failed += 1;
      if (run.status === "skipped") acc.skipped += 1;
      return acc;
    },
    { success: 0, failed: 0, skipped: 0 }
  );
}

export function isFormActionRunStatus(value: unknown): value is FormActionRunStatus {
  return value === "success" || value === "failed" || value === "skipped";
}

import {
  retryFormAutomationRunCore,
  runFormAutomationCore,
  summarizeAutomationRunStatus,
  isFormActionRunStatus,
  type AutomationEntryLookup,
  type FormAutomationRunnerCoreDeps,
  type RunFormAutomationInput,
  type FormAutomationResult,
} from "./formAutomationRunnerCore";
import type { NormalizedFormAction } from "./formActionsContract";

type ActionRowLike = {
  id: string;
  type: NormalizedFormAction["type"];
  label: string;
  enabled: boolean;
  continueOnError: boolean;
  condition: NormalizedFormAction["condition"];
  config: NormalizedFormAction["config"];
  orderIndex: number;
};

const toRunnerAction = (row: ActionRowLike): NormalizedFormAction => ({
  id: row.id,
  type: row.type,
  label: row.label,
  enabled: row.enabled,
  continueOnError: row.continueOnError,
  condition: row.condition,
  config: row.config,
  orderIndex: row.orderIndex,
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const getEntryBySlug = async (
  contentTypeId: string,
  slug: string
): Promise<AutomationEntryLookup> => {
  const { getEntryBySlug: readEntryBySlug } = await import("../content/entryService");
  return readEntryBySlug(contentTypeId, slug);
};

const runtimeDeps: FormAutomationRunnerCoreDeps = {
  listActions: async (formId) => {
    const { listFormActions } = await import("./formActionsService");
    return (await listFormActions(formId)).map(toRunnerAction);
  },
  createRun: async (input) => {
    const { createFormActionRun } = await import("./formActionsService");
    return createFormActionRun(input);
  },
  resolveNextAttempt: async (params) => {
    const { resolveNextActionAttempt } = await import("./formActionsService");
    return resolveNextActionAttempt(params);
  },
  getRunById: async (runId) => {
    const { getFormActionRun } = await import("./formActionsService");
    return getFormActionRun(runId);
  },
  getFormSettingsById: async (formId) => {
    const { getForm } = await import("./formsService");
    return (await getForm(formId))?.settings;
  },
  sendEmail: async (message) => {
    const { sendSystemEmail } = await import("../email/emailSettingsService");
    return sendSystemEmail(message);
  },
  getEntryBySlug,
  createEntry: async (contentTypeId, input) => {
    const { createEntry } = await import("../content/entryService");
    return createEntry(contentTypeId, input);
  },
  updateEntry: async (entryId, input) => {
    const { updateEntry } = await import("../content/entryService");
    return updateEntry(entryId, input);
  },
  fetchFn: fetch,
  sleep,
};

export type { FormAutomationResult, RunFormAutomationInput };
export { summarizeAutomationRunStatus, isFormActionRunStatus };

export async function runFormAutomation(
  input: RunFormAutomationInput,
  deps: Partial<FormAutomationRunnerCoreDeps> = {}
): Promise<FormAutomationResult> {
  return runFormAutomationCore(input, { ...runtimeDeps, ...deps });
}

export async function retryFormAutomationRun(
  runId: string,
  deps: Partial<FormAutomationRunnerCoreDeps> = {}
) {
  return retryFormAutomationRunCore(runId, { ...runtimeDeps, ...deps });
}

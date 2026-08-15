import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";
import {
  getDefaultFormSettings,
  normalizeFormSettings,
  type FormFormTheme as SharedFormFormTheme,
  type FormPresetId as SharedFormPresetId,
} from "../../services/forms/formSettings";
import type { FormStatus as SharedFormStatus } from "../../services/forms/formStatus";

export type FormStatus = SharedFormStatus;
// Re-export the form theme model so admin consumers (516-03) import it from the
// client boundary: `import type { FormFormTheme } from "@/services/formsClient"`.
export type FormFormTheme = SharedFormFormTheme;

export type FormRecord = {
  id: string;
  name: string;
  slug: string;
  status: FormStatus;
  description: string | null;
  successMessage: string | null;
  successRedirectUrl: string | null;
  submissionAccess: "public" | "internal";
  settings: FormSettings;
  createdAt: string;
  updatedAt: string;
};

export type FormLayoutMode = "single" | "multi_step";

export type FormAutomationRetrySettings = {
  enabled: boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export type FormPresetId = SharedFormPresetId;

export type FormSettings = {
  layoutMode: FormLayoutMode;
  saveProgress: boolean;
  stepTitles: string[];
  preset: FormPresetId;
  automationRetry: FormAutomationRetrySettings;
  theme?: FormFormTheme;
};

export type FormField = {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  settings: Record<string, unknown>;
  orderIndex: number;
};

export type FormDetail = {
  form: FormRecord;
  fields: FormField[];
};

export type FormSubmission = {
  id: string;
  formId: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
};

export type FormSubmissionsExportFormat = "csv" | "json";

export type FormSubmissionsExport = {
  fileName: string;
  contentType: "text/csv" | "application/json";
  content: string;
  totalRows: number;
};

export type FormCreateInput = {
  name: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  settings?: FormSettings;
};

export type FormUpdateInput = {
  name?: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  settings?: FormSettings;
};

export type FormFieldInput = {
  id?: string;
  type: string;
  label: string;
  name?: string;
  required?: boolean;
  orderIndex?: number;
  settings?: Record<string, unknown>;
};

export type FormActionType = "email" | "webhook" | "entry_sync" | "redirect" | "success_message";

export type FormActionCondition =
  | { operator: "always" }
  | { operator: "equals" | "not_equals"; field: string; value: string | number | boolean | null }
  | { operator: "exists" | "not_exists"; field: string };

export type FormAction = {
  id: string;
  formId: string;
  type: FormActionType;
  label: string;
  enabled: boolean;
  continueOnError: boolean;
  condition: FormActionCondition;
  config: Record<string, unknown>;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type FormActionInput = {
  id?: string;
  type: FormActionType;
  label?: string;
  enabled?: boolean;
  continueOnError?: boolean;
  condition?: FormActionCondition;
  config: Record<string, unknown>;
  orderIndex?: number;
};

export type FormActionRunStatus = "success" | "failed" | "skipped";

export type FormActionRun = {
  id: string;
  formId: string;
  submissionId: string | null;
  actionId: string | null;
  actionType: FormActionType;
  actionLabel: string;
  status: FormActionRunStatus;
  attempt: number;
  trigger: "submission" | "retry";
  errorCode: string | null;
  errorMessage: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  actionCondition: FormActionCondition;
  actionConfig: Record<string, unknown>;
  submissionPayload: Record<string, unknown>;
  retryOfId: string | null;
  createdAt: string;
};

export type FormSubmissionRuntime = {
  successMessage: string | null;
  redirectUrl: string | null;
};

export type FormSubmissionResponse = FormSubmission & {
  runtime?: FormSubmissionRuntime;
};

let cachedForms: FormRecord[] | null = null;
let cachedFormsPromise: Promise<FormRecord[]> | null = null;
const cachedFormActionsPromises = new Map<string, Promise<FormAction[]>>();

const isFormList = (value: unknown): value is FormRecord[] => Array.isArray(value);

const isFormDetail = (value: unknown): value is FormDetail =>
  Boolean(value && typeof value === "object" && "form" in value && "fields" in value);

const isFormActionList = (value: unknown): value is FormAction[] => Array.isArray(value);

const readFormsCache = () => readLocalCache(cacheKeys.formsList, cacheTtlMs.list, isFormList);

const readFormDetailCache = (id: string) =>
  readLocalCache(cacheKeys.formDetail(id), cacheTtlMs.detail, isFormDetail);

const readFormActionsCache = (id: string) =>
  readLocalCache(cacheKeys.formActions(id), cacheTtlMs.detail, isFormActionList);

const writeFormDetailCache = (detail: FormDetail) => {
  writeLocalCache(cacheKeys.formDetail(detail.form.id), detail);
};

const writeFormActionsCache = (formId: string, actions: FormAction[]) => {
  writeLocalCache(cacheKeys.formActions(formId), actions);
};

const primeFormsCacheInternal = (items: FormRecord[]) => {
  cachedForms = items;
  cachedFormsPromise = null;
  writeLocalCache(cacheKeys.formsList, items);
};

const normalizeFormRecord = (record: FormRecord): FormRecord => ({
  ...record,
  settings: normalizeFormSettings((record as { settings?: unknown }).settings),
});

const normalizeFormList = (items: FormRecord[]) => items.map(normalizeFormRecord);

const normalizeFormDetail = (detail: FormDetail): FormDetail => ({
  ...detail,
  form: normalizeFormRecord(detail.form),
});

const upsertCachedFormSummary = (form: FormRecord) => {
  const normalizedForm = normalizeFormRecord(form);
  const current = cachedForms ?? readFormsCache() ?? [];
  const index = current.findIndex((item) => item.id === normalizedForm.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(normalizedForm);
  } else {
    next[index] = { ...next[index], ...normalizedForm };
  }
  primeFormsCacheInternal(next);
};

const upsertCachedFormDetail = (detail: FormDetail) => {
  const normalizedDetail = normalizeFormDetail(detail);
  upsertCachedFormSummary(normalizedDetail.form);
  writeFormDetailCache(normalizedDetail);
};

const removeCachedForm = (id: string) => {
  const current = cachedForms ?? readFormsCache();
  if (!current) return;
  primeFormsCacheInternal(current.filter((item) => item.id !== id));
  clearLocalCache(cacheKeys.formDetail(id));
  clearLocalCache(cacheKeys.formActions(id));
  clearLocalCache(cacheKeys.formActionRuns(id));
  cachedFormActionsPromises.delete(id);
};

export const getCachedForms = () => {
  if (cachedForms) return cachedForms;
  const cached = readFormsCache();
  if (cached) cachedForms = cached;
  return cachedForms ? normalizeFormList(cachedForms) : null;
};

export const getCachedFormDetail = (id: string) => {
  const detail = readFormDetailCache(id);
  return detail ? normalizeFormDetail(detail) : null;
};
export const getCachedFormActions = (id: string) => readFormActionsCache(id);

export const clearFormsCache = () => {
  cachedForms = null;
  cachedFormsPromise = null;
  clearLocalCache(cacheKeys.formsList);
};

export async function listForms() {
  return apiRequest<FormRecord[]>("/forms", { method: "GET" });
}

export async function listFormsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedForms();
    if (cached) return normalizeFormList(cached);
    if (cachedFormsPromise) return cachedFormsPromise;
  }
  const request = listForms();
  cachedFormsPromise = request;
  const items = normalizeFormList(await request);
  primeFormsCacheInternal(items);
  return items;
}

export async function getForm(id: string) {
  const form = await apiRequest<FormRecord>(`/forms/${id}`, { method: "GET" });
  return normalizeFormRecord(form);
}

export async function getFormDetail(id: string) {
  const [form, fields] = await Promise.all([getForm(id), listFormFields(id)]);
  if (!form) return null;
  return normalizeFormDetail({ form, fields } as FormDetail);
}

export async function getFormDetailCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readFormDetailCache(id);
    if (cached) return cached;
  }
  const detail = await getFormDetail(id);
  if (detail) upsertCachedFormDetail(detail);
  return detail;
}

export async function createForm(input: FormCreateInput) {
  const payload = {
    ...input,
    settings: normalizeFormSettings(input.settings ?? getDefaultFormSettings()),
  };
  const created = await apiRequest<FormRecord>(
    "/forms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    const normalizedCreated = normalizeFormRecord(created);
    upsertCachedFormSummary(normalizedCreated);
    writeFormDetailCache({ form: normalizedCreated, fields: [] });
    broadcastCacheEvent({ key: cacheKeys.formsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.formDetail(normalizedCreated.id), action: "update" });
    return normalizedCreated;
  }
  return created;
}

export async function updateForm(id: string, input: FormUpdateInput) {
  const payload = {
    ...input,
    ...(input.settings ? { settings: normalizeFormSettings(input.settings) } : {}),
  };
  const updated = await apiRequest<FormRecord>(
    `/forms/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    const normalizedUpdated = normalizeFormRecord(updated);
    upsertCachedFormSummary(normalizedUpdated);
    const detail = readFormDetailCache(id);
    if (detail) {
      writeFormDetailCache({
        ...detail,
        form: normalizeFormRecord({ ...detail.form, ...normalizedUpdated }),
      });
    }
    broadcastCacheEvent({ key: cacheKeys.formsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.formDetail(normalizedUpdated.id), action: "update" });
    return normalizedUpdated;
  }
  return updated;
}

export async function deleteForm(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/forms/${id}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedForm(id);
    broadcastCacheEvent({ key: cacheKeys.formsList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.formDetail(id), action: "invalidate" });
  }
  return result;
}

export async function listFormFields(formId: string) {
  return apiRequest<FormField[]>(`/forms/${formId}/fields`, { method: "GET" });
}

export async function updateFormFields(formId: string, fields: FormFieldInput[]) {
  const result = await apiRequest<FormField[]>(
    `/forms/${formId}/fields`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
    { withCsrf: true }
  );
  const detail = readFormDetailCache(formId);
  if (detail && result) {
    writeFormDetailCache({ ...detail, fields: result });
  }
  broadcastCacheEvent({ key: cacheKeys.formsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.formDetail(formId), action: "update" });
  return result;
}

export async function listFormSubmissions(formId: string) {
  return apiRequest<FormSubmission[]>(`/forms/${formId}/submissions`, {
    method: "GET",
  });
}

export async function exportFormSubmissions(
  formId: string,
  format: FormSubmissionsExportFormat = "csv"
) {
  const params = new URLSearchParams({ format });
  return apiRequest<FormSubmissionsExport>(`/forms/${formId}/submissions/export?${params}`, {
    method: "GET",
  });
}

export async function submitForm(
  formId: string,
  data: Record<string, unknown>,
  options?: { formNonce?: string; captchaToken?: string }
) {
  const body: Record<string, unknown> = { data };
  if (options?.formNonce) {
    body.formNonce = options.formNonce;
  }
  if (options?.captchaToken) {
    body.captchaToken = options.captchaToken;
  }
  return apiRequest<FormSubmissionResponse>(
    `/forms/${formId}/submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { withCsrf: true }
  );
}

export async function listFormActions(formId: string) {
  return apiRequest<FormAction[]>(`/forms/${formId}/actions`, {
    method: "GET",
  });
}

export async function listFormActionsCached(formId: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readFormActionsCache(formId);
    if (cached) return cached;
    const inFlight = cachedFormActionsPromises.get(formId);
    if (inFlight) return inFlight;
  }

  const request = listFormActions(formId);
  cachedFormActionsPromises.set(formId, request);
  try {
    const actions = await request;
    writeFormActionsCache(formId, actions);
    return actions;
  } finally {
    cachedFormActionsPromises.delete(formId);
  }
}

export async function updateFormActions(formId: string, actions: FormActionInput[]) {
  const result = await apiRequest<FormAction[]>(
    `/forms/${formId}/actions`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actions),
    },
    { withCsrf: true }
  );
  writeFormActionsCache(formId, result);
  broadcastCacheEvent({ key: cacheKeys.formActions(formId), action: "update" });
  broadcastCacheEvent({ key: cacheKeys.formActionRuns(formId), action: "invalidate" });
  return result;
}

export async function listFormActionRuns(
  formId: string,
  options?: { status?: FormActionRunStatus; limit?: number }
) {
  const query = new URLSearchParams();
  if (options?.status) query.set("status", options.status);
  if (typeof options?.limit === "number") query.set("limit", String(options.limit));
  const queryString = query.toString();
  const route = queryString
    ? `/forms/${formId}/action-runs?${queryString}`
    : `/forms/${formId}/action-runs`;

  const result = await apiRequest<FormActionRun[]>(route, { method: "GET" });
  writeLocalCache(cacheKeys.formActionRuns(formId), result);
  return result;
}

export async function retryFormActionRun(runId: string) {
  const result = await apiRequest<{
    run: FormActionRun;
    result: {
      successMessage: string | null;
      redirectUrl: string | null;
      runs: FormActionRun[];
    };
  }>(
    `/forms/action-runs/${runId}/retry`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { withCsrf: true }
  );
  const formId = result?.run?.formId;
  if (formId) {
    broadcastCacheEvent({ key: cacheKeys.formActionRuns(formId), action: "update" });
  }
  return result;
}

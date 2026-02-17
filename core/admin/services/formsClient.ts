import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type FormStatus = "draft" | "published" | "archived";

export type FormRecord = {
  id: string;
  name: string;
  slug: string;
  status: FormStatus;
  description: string | null;
  successMessage: string | null;
  successRedirectUrl: string | null;
  createdAt: string;
  updatedAt: string;
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

export type FormCreateInput = {
  name: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
};

export type FormUpdateInput = {
  name?: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
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

let cachedForms: FormRecord[] | null = null;
let cachedFormsPromise: Promise<FormRecord[]> | null = null;

const isFormList = (value: unknown): value is FormRecord[] => Array.isArray(value);

const isFormDetail = (value: unknown): value is FormDetail =>
  Boolean(value && typeof value === "object" && "form" in value && "fields" in value);

const readFormsCache = () =>
  readLocalCache(cacheKeys.formsList, cacheTtlMs.list, isFormList);

const readFormDetailCache = (id: string) =>
  readLocalCache(cacheKeys.formDetail(id), cacheTtlMs.detail, isFormDetail);

const writeFormDetailCache = (detail: FormDetail) => {
  writeLocalCache(cacheKeys.formDetail(detail.form.id), detail);
};

const primeFormsCacheInternal = (items: FormRecord[]) => {
  cachedForms = items;
  cachedFormsPromise = null;
  writeLocalCache(cacheKeys.formsList, items);
};

const upsertCachedFormSummary = (form: FormRecord) => {
  const current = cachedForms ?? readFormsCache() ?? [];
  const index = current.findIndex((item) => item.id === form.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(form);
  } else {
    next[index] = { ...next[index], ...form };
  }
  primeFormsCacheInternal(next);
};

const upsertCachedFormDetail = (detail: FormDetail) => {
  upsertCachedFormSummary(detail.form);
  writeFormDetailCache(detail);
};

const removeCachedForm = (id: string) => {
  const current = cachedForms ?? readFormsCache();
  if (!current) return;
  primeFormsCacheInternal(current.filter((item) => item.id !== id));
  clearLocalCache(cacheKeys.formDetail(id));
};

export const getCachedForms = () => {
  if (cachedForms) return cachedForms;
  const cached = readFormsCache();
  if (cached) cachedForms = cached;
  return cachedForms;
};

export const getCachedFormDetail = (id: string) => readFormDetailCache(id);

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
    if (cached) return cached;
    if (cachedFormsPromise) return cachedFormsPromise;
  }
  const request = listForms();
  cachedFormsPromise = request;
  const items = await request;
  primeFormsCacheInternal(items);
  return items;
}

export async function getForm(id: string) {
  return apiRequest<FormRecord>(`/forms/${id}`, { method: "GET" });
}

export async function getFormDetail(id: string) {
  const [form, fields] = await Promise.all([getForm(id), listFormFields(id)]);
  if (!form) return null;
  return { form, fields } as FormDetail;
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
  const created = await apiRequest<FormRecord>(
    "/forms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedFormSummary(created);
    writeFormDetailCache({ form: created, fields: [] });
    broadcastCacheEvent({ key: cacheKeys.formsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.formDetail(created.id), action: "update" });
  }
  return created;
}

export async function updateForm(id: string, input: FormUpdateInput) {
  const updated = await apiRequest<FormRecord>(
    `/forms/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedFormSummary(updated);
    const detail = readFormDetailCache(id);
    if (detail) {
      writeFormDetailCache({ ...detail, form: { ...detail.form, ...updated } });
    }
    broadcastCacheEvent({ key: cacheKeys.formsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.formDetail(updated.id), action: "update" });
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

export async function submitForm(formId: string, data: Record<string, unknown>) {
  return apiRequest<FormSubmission>(
    `/forms/${formId}/submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
    { withCsrf: true }
  );
}

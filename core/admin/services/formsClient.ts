import { apiRequest } from "./apiClient";

export type FormStatus = "draft" | "published" | "archived";

export type FormRecord = {
  id: string;
  name: string;
  slug: string;
  status: FormStatus;
  description: string | null;
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
};

export type FormUpdateInput = {
  name?: string;
  slug?: string | null;
  status?: FormStatus;
  description?: string | null;
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

export async function listForms() {
  return apiRequest<FormRecord[]>("/forms", { method: "GET" });
}

export async function getForm(id: string) {
  return apiRequest<FormRecord>(`/forms/${id}`, { method: "GET" });
}

export async function createForm(input: FormCreateInput) {
  return apiRequest<FormRecord>(
    "/forms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
}

export async function updateForm(id: string, input: FormUpdateInput) {
  return apiRequest<FormRecord>(
    `/forms/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
}

export async function deleteForm(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/forms/${id}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
}

export async function listFormFields(formId: string) {
  return apiRequest<FormField[]>(`/forms/${formId}/fields`, { method: "GET" });
}

export async function updateFormFields(formId: string, fields: FormFieldInput[]) {
  return apiRequest<FormField[]>(
    `/forms/${formId}/fields`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
    { withCsrf: true }
  );
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

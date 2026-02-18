import { getForm, listFormFields, toFieldRecord } from "./formsService";
import { createFormSubmissionNonce } from "./submissionNonce";
import { normalizeSubmissionAccess } from "./submissionAccess";
import { getDefaultFormSettings, normalizeFormSettings } from "./formSettings";

export type FormRuntimeResolution = {
  formId: string;
  formName: string;
  description: string | null;
  status: string;
  successMessage: string | null;
  successRedirectUrl: string | null;
  settings: ReturnType<typeof getDefaultFormSettings>;
  submissionAccess: "public" | "internal";
  submissionNonce?: string | null;
  fields: ReturnType<typeof toFieldRecord>[];
  error?: string;
};

export const resolveFormSubmissionAccess = (value: unknown) =>
  normalizeSubmissionAccess(value, "public");

export async function resolveFormRuntimeData(
  formId: string,
  options: { preview: boolean }
): Promise<FormRuntimeResolution> {
  const form = await getForm(formId);
  if (!form) {
    return {
      formId,
      formName: "",
      description: null,
      status: "missing",
      successMessage: null,
      successRedirectUrl: null,
      settings: getDefaultFormSettings(),
      submissionAccess: "public",
      submissionNonce: null,
      fields: [],
      error: "form_not_found",
    };
  }

  if (!options.preview && form.status !== "published") {
    const submissionAccess = resolveFormSubmissionAccess(form.submissionAccess);
    const settings = normalizeFormSettings(form.settings);
    return {
      formId,
      formName: form.name,
      description: form.description ?? null,
      status: form.status,
      successMessage: form.successMessage ?? null,
      successRedirectUrl: form.successRedirectUrl ?? null,
      settings,
      submissionAccess,
      submissionNonce:
        submissionAccess === "public" ? createFormSubmissionNonce(form.id) : null,
      fields: [],
      error: "form_unpublished",
    };
  }

  const fields = await listFormFields(formId);
  const submissionAccess = resolveFormSubmissionAccess(form.submissionAccess);
  const settings = normalizeFormSettings(form.settings);
  return {
    formId,
    formName: form.name,
    description: form.description ?? null,
    status: form.status,
    successMessage: form.successMessage ?? null,
    successRedirectUrl: form.successRedirectUrl ?? null,
    settings,
    submissionAccess,
    submissionNonce:
      submissionAccess === "public" ? createFormSubmissionNonce(form.id) : null,
    fields: fields.map((field) => toFieldRecord(field)),
  };
}

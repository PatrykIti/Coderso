import { createFormSubmissionNonce } from "./submissionNonce";
import { normalizeSubmissionAccess } from "./submissionAccess";
import { getDefaultFormSettings, normalizeFormSettings } from "./formSettings";
import type { FormRuntimeResolution } from "./formRuntimeContract";

export const resolveFormSubmissionAccess = (value: unknown) =>
  normalizeSubmissionAccess(value, "public");

async function resolveBotProtectionProjection(
  submissionAccess: "public" | "internal"
): Promise<FormRuntimeResolution["botProtection"]> {
  if (submissionAccess !== "public") return null;

  const { getSecuritySettingsPublic } = await import("../settings/securitySettings");
  const settings = await getSecuritySettingsPublic();
  if (!settings.botProtection.enabled || !settings.botProtection.siteKey) {
    return null;
  }

  return {
    provider: settings.botProtection.provider,
    siteKey: settings.botProtection.siteKey,
    action: "public_write",
  };
}

export async function resolveFormRuntimeData(
  formId: string,
  options: { preview: boolean }
): Promise<FormRuntimeResolution> {
  const { getForm, listFormFields, toFieldRecord } = await import("./formsService");
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
      botProtection: null,
      fields: [],
      error: "form_not_found",
    };
  }

  if (!options.preview && form.status !== "published") {
    const submissionAccess = resolveFormSubmissionAccess(form.submissionAccess);
    const settings = normalizeFormSettings(form.settings);
    const botProtection = await resolveBotProtectionProjection(submissionAccess);
    return {
      formId,
      formName: form.name,
      description: form.description ?? null,
      status: form.status,
      successMessage: form.successMessage ?? null,
      successRedirectUrl: form.successRedirectUrl ?? null,
      settings,
      submissionAccess,
      submissionNonce: submissionAccess === "public" ? createFormSubmissionNonce(form.id) : null,
      botProtection,
      fields: [],
      error: "form_unpublished",
    };
  }

  const submissionAccess = resolveFormSubmissionAccess(form.submissionAccess);
  const settings = normalizeFormSettings(form.settings);
  if (!options.preview && submissionAccess === "internal") {
    return {
      formId,
      formName: form.name,
      description: form.description ?? null,
      status: form.status,
      successMessage: form.successMessage ?? null,
      successRedirectUrl: form.successRedirectUrl ?? null,
      settings,
      submissionAccess,
      submissionNonce: null,
      botProtection: null,
      fields: [],
      error: "public_submission_disabled",
    };
  }

  const fields = await listFormFields(formId);
  const botProtection = await resolveBotProtectionProjection(submissionAccess);
  return {
    formId,
    formName: form.name,
    description: form.description ?? null,
    status: form.status,
    successMessage: form.successMessage ?? null,
    successRedirectUrl: form.successRedirectUrl ?? null,
    settings,
    submissionAccess,
    submissionNonce: submissionAccess === "public" ? createFormSubmissionNonce(form.id) : null,
    botProtection,
    fields: fields.map((field) => toFieldRecord(field)),
  };
}

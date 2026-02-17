import { getForm, listFormFields, toFieldRecord } from "./formsService";

export type FormRuntimeResolution = {
  formId: string;
  formName: string;
  description: string | null;
  status: string;
  fields: ReturnType<typeof toFieldRecord>[];
  error?: string;
};

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
      fields: [],
      error: "form_not_found",
    };
  }

  if (!options.preview && form.status !== "published") {
    return {
      formId,
      formName: form.name,
      description: form.description ?? null,
      status: form.status,
      fields: [],
      error: "form_unpublished",
    };
  }

  const fields = await listFormFields(formId);
  return {
    formId,
    formName: form.name,
    description: form.description ?? null,
    status: form.status,
    fields: fields.map((field) => toFieldRecord(field)),
  };
}

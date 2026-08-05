import type { ApiClientError } from "@/services/apiClient";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type {
  EntryData,
  EntryDataValue,
  EntryDetail,
  EntryPayload,
} from "@/services/entriesClient";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import type { ContentField } from "@/ui/content-types/SchemaBuilder";
import type {
  CustomScreenEditorViewDefinition,
  CustomScreenEditorViewDefinitionV4,
} from "../../../services/customScreens/customScreenSchemas";
import { collectWritableBindingFields } from "../../../services/customScreens/bindingResolver";

export type CustomScreenEntryDraft = {
  title: string;
  slug: string;
  data: EntryData;
  editableFields: string[];
  originalData: EntryData;
  fieldErrors: Record<string, string>;
};

type RuntimeEditorView = CustomScreenEditorViewDefinition | CustomScreenEditorViewDefinitionV4;

type ApiValidationDetail = {
  instancePath?: string;
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
};

const readEntryDataValue = (data: EntryData, field: string): EntryDataValue | undefined =>
  data[field];

const pickPresentEntryData = (data: EntryData, fields: string[]): EntryData =>
  fields.reduce<EntryData>((result, field) => {
    const value = readEntryDataValue(data, field);
    if (value !== undefined) result[field] = value;
    return result;
  }, {});

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

function resolveDefaultValue(field: ContentField): EntryDataValue | undefined {
  if (field.defaultValue === undefined || field.defaultValue === "") return undefined;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (field.type === "boolean") return field.defaultValue === "true";
  return field.defaultValue;
}

function fallbackValueForField(field: ContentField): EntryDataValue {
  const defaultValue = resolveDefaultValue(field);
  if (defaultValue !== undefined) return defaultValue;
  if (field.type === "boolean") return false;
  if (field.type === "media" && field.media?.multiple) return [];
  if (field.type === "relation" && field.relation?.multiple) return [];
  if (field.type === "select" && field.multiple) return [];
  if (field.type === "number") return null;
  return "";
}

export function collectEditorViewWritableFields(
  editorView: RuntimeEditorView,
  contentType: ContentTypeSummary
) {
  const schemaFields = fieldsFromSchema(contentType.schema).map((field) => field.name);
  const allowed = new Set(schemaFields);
  const configuredFields =
    "document" in editorView
      ? Array.from(
          new Set(
            editorView.bindings
              .filter((binding) => binding.mode === "write" || binding.mode === "readwrite")
              .map((binding) => binding.field)
          )
        )
      : collectWritableBindingFields(editorView.bindings, {
          blocks: editorView.blocks,
          fallbackToModeOnly: false,
        });
  const configured = configuredFields.filter((field) => allowed.has(field));
  return configured;
}

export function buildSchemaDefaultData(input: {
  contentType: ContentTypeSummary;
  fields: string[];
}): EntryData {
  const fieldSet = new Set(input.fields);
  return fieldsFromSchema(input.contentType.schema).reduce<EntryData>((result, field) => {
    if (!fieldSet.has(field.name)) return result;
    result[field.name] = fallbackValueForField(field);
    return result;
  }, {});
}

export function buildInitialEntryDraft(input: {
  contentType: ContentTypeSummary;
  editorView: RuntimeEditorView;
}): CustomScreenEntryDraft {
  const editableFields = collectEditorViewWritableFields(input.editorView, input.contentType);
  return {
    title: "",
    slug: "",
    data: buildSchemaDefaultData({
      contentType: input.contentType,
      fields: editableFields,
    }),
    editableFields,
    originalData: {},
    fieldErrors: {},
  };
}

export function hydrateEditorViewDraft(input: {
  contentType: ContentTypeSummary;
  editorView: RuntimeEditorView;
  entry: EntryDetail;
}): CustomScreenEntryDraft {
  const editableFields = collectEditorViewWritableFields(input.editorView, input.contentType);
  const defaults = buildSchemaDefaultData({
    contentType: input.contentType,
    fields: editableFields,
  });
  return {
    title: input.entry.title,
    slug: input.entry.slug,
    data: {
      ...defaults,
      ...Object.fromEntries(
        editableFields
          .filter((field) => input.entry.data?.[field] !== undefined)
          .map((field) => [field, input.entry.data?.[field]])
      ),
    },
    editableFields,
    originalData: input.entry.data ?? {},
    fieldErrors: {},
  };
}

export function validateEntryDraft(input: {
  contentType: ContentTypeSummary;
  draft: CustomScreenEntryDraft;
}) {
  const errors: Record<string, string> = {};
  if (!input.draft.title.trim()) errors.title = "Title is required.";
  if (!input.draft.slug.trim()) errors.slug = "Slug is required.";

  const required = new Set(input.contentType.schema.required ?? []);
  for (const field of fieldsFromSchema(input.contentType.schema)) {
    if (!required.has(field.name)) continue;
    if (!input.draft.editableFields.includes(field.name)) continue;
    if (isEmptyValue(input.draft.data[field.name])) {
      errors[field.name] = `${field.label} is required.`;
    }
  }

  return errors;
}

export function buildEditorViewCreatePayload(input: {
  contentType: ContentTypeSummary;
  draft: CustomScreenEntryDraft;
}): EntryPayload {
  const data = pickPresentEntryData(input.draft.data, input.draft.editableFields);
  return {
    title: input.draft.title.trim(),
    slug: input.draft.slug.trim(),
    data,
  };
}

export function buildEditorViewUpdatePayload(input: {
  contentType: ContentTypeSummary;
  draft: CustomScreenEntryDraft;
}): EntryPayload {
  const editedData = pickPresentEntryData(input.draft.data, input.draft.editableFields);
  return {
    title: input.draft.title.trim(),
    slug: input.draft.slug.trim(),
    data: {
      ...input.draft.originalData,
      ...editedData,
    },
  };
}

const resolveFieldLabelMap = (contentType: ContentTypeSummary) =>
  new Map(fieldsFromSchema(contentType.schema).map((field) => [field.name, field.label] as const));

const resolveValidationField = (detail: ApiValidationDetail): string | null => {
  if (detail.keyword === "required" && typeof detail.params?.missingProperty === "string") {
    return detail.params.missingProperty;
  }

  if (!detail.instancePath) return null;
  const path = detail.instancePath.replace(/^\//, "").split("/")[0];
  return path ? path.trim() : null;
};

const resolveValidationMessage = (fieldLabel: string, detail: ApiValidationDetail) => {
  if (detail.keyword === "required") {
    return `${fieldLabel} is required.`;
  }
  if (detail.keyword === "enum") {
    return `${fieldLabel} has an invalid value.`;
  }
  if (detail.keyword === "type") {
    return `${fieldLabel} has an invalid value.`;
  }
  if (detail.message) {
    const normalized = detail.message.replace(/^must\s+/i, "must ");
    return `${fieldLabel} ${normalized}.`;
  }
  return `${fieldLabel} is invalid.`;
};

export function resolveEntryFieldErrorsFromApiError(input: {
  contentType: ContentTypeSummary;
  error: ApiClientError;
}) {
  const fieldErrors: Record<string, string> = {};
  const fieldLabels = resolveFieldLabelMap(input.contentType);

  if (input.error.code === "entry_slug_conflict") {
    fieldErrors.slug = "Slug already exists.";
    return fieldErrors;
  }

  if (input.error.code === "entry_validation_failed") {
    const details = input.error.details;
    const validationDetails = Array.isArray((details as { validation?: unknown })?.validation)
      ? (((details as { validation?: unknown }).validation as ApiValidationDetail[]) ?? [])
      : [];

    validationDetails.forEach((detail) => {
      const field = resolveValidationField(detail);
      if (!field || fieldErrors[field]) return;
      const fieldLabel =
        field === "title" ? "Title" : field === "slug" ? "Slug" : (fieldLabels.get(field) ?? field);
      fieldErrors[field] = resolveValidationMessage(fieldLabel, detail);
    });
    return fieldErrors;
  }

  const detailField =
    typeof (input.error.details as { field?: unknown } | undefined)?.field === "string"
      ? ((input.error.details as { field?: string }).field ?? null)
      : null;
  if (!detailField) return fieldErrors;

  const fieldLabel =
    detailField === "title"
      ? "Title"
      : detailField === "slug"
        ? "Slug"
        : (fieldLabels.get(detailField) ?? detailField);

  switch (input.error.code) {
    case "media_value_invalid":
      fieldErrors[detailField] = `${fieldLabel} has an invalid media value.`;
      break;
    case "media_asset_missing":
      fieldErrors[detailField] = `${fieldLabel} references a missing media asset.`;
      break;
    case "media_type_not_allowed":
      fieldErrors[detailField] = `${fieldLabel} uses a media type that is not allowed.`;
      break;
    case "relation_value_invalid":
      fieldErrors[detailField] = `${fieldLabel} has an invalid relation value.`;
      break;
    case "relation_entry_missing":
      fieldErrors[detailField] = `${fieldLabel} references a missing related entry.`;
      break;
    default:
      break;
  }

  return fieldErrors;
}

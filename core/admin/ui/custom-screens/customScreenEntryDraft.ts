import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type { EntryDetail, EntryPayload } from "@/services/entriesClient";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import type { ContentField } from "@/ui/content-types/SchemaBuilder";
import type { CustomScreenEditorViewDefinition } from "../../../services/customScreens/customScreenSchemas";
import { collectWritableBindingFields } from "../../../services/customScreens/bindingResolver";

export type CustomScreenEntryDraft = {
  title: string;
  slug: string;
  data: Record<string, unknown>;
  editableFields: string[];
  originalData: Record<string, unknown>;
  fieldErrors: Record<string, string>;
};

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

function resolveDefaultValue(field: ContentField) {
  if (field.defaultValue === undefined || field.defaultValue === "") return undefined;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (field.type === "boolean") return field.defaultValue === "true";
  return field.defaultValue;
}

function fallbackValueForField(field: ContentField) {
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
  editorView: CustomScreenEditorViewDefinition,
  contentType: ContentTypeSummary
) {
  const schemaFields = fieldsFromSchema(contentType.schema).map((field) => field.name);
  const allowed = new Set(schemaFields);
  const configured = collectWritableBindingFields(editorView.bindings).filter((field) =>
    allowed.has(field)
  );
  return configured.length > 0 ? configured : schemaFields;
}

export function buildSchemaDefaultData(input: {
  contentType: ContentTypeSummary;
  fields: string[];
}) {
  const fieldSet = new Set(input.fields);
  return fieldsFromSchema(input.contentType.schema).reduce<Record<string, unknown>>(
    (result, field) => {
      if (!fieldSet.has(field.name)) return result;
      result[field.name] = fallbackValueForField(field);
      return result;
    },
    {}
  );
}

export function buildInitialEntryDraft(input: {
  contentType: ContentTypeSummary;
  editorView: CustomScreenEditorViewDefinition;
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
  editorView: CustomScreenEditorViewDefinition;
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
  const data = Object.fromEntries(
    input.draft.editableFields.map((field) => [field, input.draft.data[field]])
  );
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
  const editedData = Object.fromEntries(
    input.draft.editableFields.map((field) => [field, input.draft.data[field]])
  );
  return {
    title: input.draft.title.trim(),
    slug: input.draft.slug.trim(),
    data: {
      ...input.draft.originalData,
      ...editedData,
    },
  };
}

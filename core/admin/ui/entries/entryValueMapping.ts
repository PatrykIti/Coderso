import type { EntryData, EntryDataValue, EntryDetail } from "@/services/entriesClient";
import { isEntryData } from "@/services/entryData";

import type { ContentField } from "../content-types/SchemaBuilder";
import { buildSchemaFromFields } from "../content-types/schemaMapping";
import {
  ENTRY_LINKED_FIELD_NAMES,
  isEntryLinkedFieldName,
  type EntryLinkedColumnValues,
} from "./entryLinkedFields";

/**
 * Translation between a content type's schema fields and an entry's `data` record.
 * Both directions live together because they have to agree on which keys exist and
 * on how a field default materializes: `buildInitialValues` maps a fetched snapshot
 * into editor values on hydration, `buildEntryPayloadData` maps editor values back
 * into the `updateEntry` body on save (including the hidden keys the schema no longer
 * exposes but the entry must keep). They also have to agree about the LINKED names
 * (`entryLinkedFields`), where the entry column and the schema field are two homes for
 * one value: both resolve those from the column, so the field can never display a value
 * the next save silently replaces.
 */

function resolveDefaultValue(field: ContentField): EntryDataValue {
  if (field.defaultValue === undefined || field.defaultValue === "") return null;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.type === "boolean") {
    return field.defaultValue === "true";
  }
  return field.defaultValue;
}

export function buildInitialValues(
  fields: ContentField[],
  data: EntryData,
  columns: EntryLinkedColumnValues
): EntryData {
  return fields.reduce<EntryData>((acc, field) => {
    // A linked name has two homes and one authority. Hydrating this copy from `data` would
    // show whatever the last writer of THAT half left there, while `buildEntryPayloadData`
    // below writes the column into `data` on the next save regardless.
    if (isEntryLinkedFieldName(field.name)) {
      acc[field.name] = columns[field.name];
      return acc;
    }
    if (data[field.name] !== undefined) {
      acc[field.name] = data[field.name];
      return acc;
    }
    const fallback = field.type === "boolean" ? false : "";
    acc[field.name] = resolveDefaultValue(field) ?? fallback;
    return acc;
  }, {});
}

/**
 * Merges a fetched snapshot's values with the ones the user still owns: `baseValues`
 * wins everywhere except the field names `isEditedFieldName` claims. Keeping the whole
 * current record instead (`{ ...baseValues, ...currentValues }`) let a value hydrated
 * from an OLDER snapshot shadow a newer one, because "present in state" is not the same
 * fact as "edited by the user".
 */
export function mergeEditedFieldValues(
  baseValues: EntryData,
  currentValues: EntryData,
  isEditedFieldName: (fieldName: string) => boolean
): EntryData {
  const merged: EntryData = { ...baseValues };
  Object.keys(currentValues).forEach((fieldName) => {
    if (isEditedFieldName(fieldName)) merged[fieldName] = currentValues[fieldName];
  });
  return merged;
}

export type EntryPayloadDataInput = Readonly<{
  fields: ContentField[];
  values: EntryData;
  entry: EntryDetail | null;
  columns: EntryLinkedColumnValues;
  hiddenFieldNames: ReadonlySet<string>;
  schemaFieldNames: ReadonlySet<string>;
}>;

export function buildEntryPayloadData({
  fields,
  values,
  entry,
  columns,
  hiddenFieldNames,
  schemaFieldNames,
}: EntryPayloadDataInput): EntryData {
  const schema = buildSchemaFromFields(fields);
  const data: EntryData = {};
  if (isEntryData(entry?.data)) {
    hiddenFieldNames.forEach((key) => {
      if (entry.data[key] !== undefined) {
        data[key] = entry.data[key];
      }
    });
  }
  Object.keys(schema.properties).forEach((key) => {
    if (values[key] !== undefined) data[key] = values[key];
  });
  // The column is the authority for every linked name the schema exposes, exactly as it is in
  // `buildInitialValues`. Iterated rather than written out per name so a name added to
  // `ENTRY_LINKED_FIELD_NAMES` cannot be honoured by hydration and forgotten by the payload.
  ENTRY_LINKED_FIELD_NAMES.forEach((name) => {
    if (schemaFieldNames.has(name)) data[name] = columns[name];
  });
  return data;
}

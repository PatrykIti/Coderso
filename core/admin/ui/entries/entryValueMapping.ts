import type { EntryDetail } from "@/services/entriesClient";

import type { ContentField } from "../content-types/SchemaBuilder";
import { buildSchemaFromFields } from "../content-types/schemaMapping";

/**
 * Translation between a content type's schema fields and an entry's `data` record.
 * Both directions live together because they have to agree on which keys exist and
 * on how a field default materializes: `buildInitialValues` maps a fetched snapshot
 * into editor values on hydration, `buildEntryPayloadData` maps editor values back
 * into the `updateEntry` body on save (including the hidden keys the schema no longer
 * exposes but the entry must keep).
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function resolveDefaultValue(field: ContentField) {
  if (field.defaultValue === undefined || field.defaultValue === "") return null;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (field.type === "boolean") {
    return field.defaultValue === "true";
  }
  return field.defaultValue;
}

export function buildInitialValues(fields: ContentField[], data: Record<string, unknown>) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    if (data[field.name] !== undefined) {
      acc[field.name] = data[field.name];
      return acc;
    }
    const fallback = field.type === "boolean" ? false : "";
    acc[field.name] = resolveDefaultValue(field) ?? fallback;
    return acc;
  }, {});
}

export type EntryPayloadDataInput = Readonly<{
  fields: ContentField[];
  values: Record<string, unknown>;
  entry: EntryDetail | null;
  title: string;
  slug: string;
  hiddenFieldNames: ReadonlySet<string>;
  schemaFieldNames: ReadonlySet<string>;
}>;

export function buildEntryPayloadData({
  fields,
  values,
  entry,
  title,
  slug,
  hiddenFieldNames,
  schemaFieldNames,
}: EntryPayloadDataInput): Record<string, unknown> {
  const schema = buildSchemaFromFields(fields);
  const data: Record<string, unknown> = {};
  if (isRecord(entry?.data)) {
    hiddenFieldNames.forEach((key) => {
      if (entry.data[key] !== undefined) {
        data[key] = entry.data[key];
      }
    });
  }
  Object.keys(schema.properties).forEach((key) => {
    if (values[key] !== undefined) data[key] = values[key];
  });
  if (schemaFieldNames.has("title")) data.title = title;
  if (schemaFieldNames.has("slug")) data.slug = slug;
  return data;
}

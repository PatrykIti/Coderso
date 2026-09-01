import { expect, test } from "vitest";

import type { EntryData, EntryDetail } from "../../../core/admin/services/entriesClient";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";
import type { EntryLinkedColumnValues } from "../../../core/admin/ui/entries/entryLinkedFields";

import {
  buildEntryPayloadData,
  buildInitialValues,
} from "../../../core/admin/ui/entries/entryValueMapping";

const field = (name: string, type: ContentField["type"], defaultValue?: string): ContentField => ({
  id: `field-${name}`,
  name,
  type,
  label: name,
  required: false,
  ...(defaultValue !== undefined ? { defaultValue } : {}),
});

const emptyData = (): EntryData => ({});

const emptyColumns: EntryLinkedColumnValues = { title: "", slug: "" };

const entryWithData = (data: EntryData): EntryDetail => ({
  id: "entry-1",
  typeId: "type-post",
  title: "New title",
  slug: "new-title",
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data,
  createdAt: "2026-03-11T10:00:00.000Z",
  updatedAt: "2026-03-11T10:00:00.000Z",
});

test("buildInitialValues parses a finite number default", () => {
  const values = buildInitialValues([field("count", "number", "42")], emptyData(), emptyColumns);
  expect(values.count).toBe(42);
});

test("buildInitialValues falls back to an empty string for a non-finite number default", () => {
  const values = buildInitialValues(
    [field("count", "number", "not-a-number")],
    emptyData(),
    emptyColumns
  );
  expect(values.count).toBe("");
});

test("buildInitialValues honors a boolean default true", () => {
  const values = buildInitialValues(
    [field("featured", "boolean", "true")],
    emptyData(),
    emptyColumns
  );
  expect(values.featured).toBe(true);
});

test("buildInitialValues treats a non-true boolean default as false", () => {
  const values = buildInitialValues(
    [field("featured", "boolean", "false")],
    emptyData(),
    emptyColumns
  );
  expect(values.featured).toBe(false);
});

test("buildInitialValues falls through with the raw default for text fields", () => {
  const values = buildInitialValues(
    [field("headline", "text", "Hello")],
    emptyData(),
    emptyColumns
  );
  expect(values.headline).toBe("Hello");
});

test("buildInitialValues preserves a supported richtext default", () => {
  const values = buildInitialValues(
    [field("summary", "richtext", "<p>Hello</p>")],
    emptyData(),
    emptyColumns
  );
  expect(values.summary).toBe("<p>Hello</p>");
});

test("buildInitialValues copies authored data and linked column values", () => {
  const values = buildInitialValues(
    [field("title", "text"), field("slug", "slug")],
    { title: "Old title" },
    { title: "New title", slug: "new-title" }
  );
  expect(values.title).toBe("New title");
  expect(values.slug).toBe("new-title");
});

test("buildEntryPayloadData carries hidden fields forward from the entry data", () => {
  const payload = buildEntryPayloadData({
    fields: [field("body", "text")],
    values: { body: "New body" },
    entry: entryWithData({ hidden_legacy: "kept", present_value: 1 }),
    columns: { title: "New title", slug: "new-title" },
    hiddenFieldNames: new Set(["hidden_legacy", "present_value", "absent_value"]),
    schemaFieldNames: new Set(["body"]),
  });
  expect(payload).toEqual({
    body: "New body",
    hidden_legacy: "kept",
    present_value: 1,
  });
});

test("buildEntryPayloadData drops hidden fields missing from the entry data", () => {
  const payload = buildEntryPayloadData({
    fields: [field("body", "text")],
    values: { body: "New body" },
    entry: entryWithData({ kept: 1 }),
    columns: { title: "New title", slug: "new-title" },
    hiddenFieldNames: new Set(["kept", "missing"]),
    schemaFieldNames: new Set(["body"]),
  });
  expect(payload).toEqual({ body: "New body", kept: 1 });
});

test("buildEntryPayloadData writes linked column values for schema-exposed linked names", () => {
  const payload = buildEntryPayloadData({
    fields: [field("title", "text"), field("slug", "slug")],
    values: { title: "From values", slug: "from-values" },
    entry: null,
    columns: { title: "From column", slug: "from-column" },
    hiddenFieldNames: new Set(),
    schemaFieldNames: new Set(["title", "slug"]),
  });
  expect(payload).toEqual({
    title: "From column",
    slug: "from-column",
  });
});

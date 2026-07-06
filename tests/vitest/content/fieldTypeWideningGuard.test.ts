import { describe, expect, it } from "vitest";
import {
  buildSchemaFromFields,
  fieldsFromSchema,
  countSchemaFields,
} from "@/ui/content-types/schemaMapping";
import type { ContentField } from "@/ui/content-types/SchemaBuilder";
import { buildEntryChecklist } from "@/ui/entries/entryChecklist";

// TASK-513-06 downstream-consumer guard: proves the 513-02 FieldType union widening
// (adds "date"/"slug") does not throw or misbehave in non-owned ContentField consumers.
// Pure — no Bun/DB import; imports the real mapping + checklist only (no EntryEditor.tsx,
// which would drag React/jsdom into the pure lane).
const fields: ContentField[] = [
  { id: "field-title", name: "title", label: "Title", type: "text", required: true },
  {
    id: "field-publishedAt",
    name: "publishedAt",
    label: "Published at",
    type: "date",
    required: true,
    date: { includeTime: false },
  },
  {
    id: "field-urlSlug",
    name: "urlSlug",
    label: "Slug",
    type: "slug",
    required: false,
    slug: { source: "title", editable: false },
  },
];

describe("date/slug widening — downstream ContentField consumers", () => {
  it("survives build→fields round-trip preserving type + config", () => {
    const back = fieldsFromSchema(buildSchemaFromFields(fields));
    expect(back.map((f) => f.type)).toEqual(["text", "date", "slug"]);
    // slug config round-trips (present-only); date.includeTime:false is DROPPED (falsy → present-only).
    expect(back.find((f) => f.name === "urlSlug")?.slug).toEqual({
      source: "title",
      editable: false,
    });
    expect(countSchemaFields(buildSchemaFromFields(fields))).toBe(3);
  });

  it("buildEntryChecklist does not throw and treats a filled date/slug value as complete", () => {
    const run = () =>
      buildEntryChecklist({
        title: "Hello",
        slug: "hello",
        status: "draft",
        scheduledAt: "",
        fields,
        values: { title: "Hello", publishedAt: "2026-07-05", urlSlug: "hello" },
      });
    expect(run).not.toThrow();
    // date/slug strings counted as filled (isValueFilled string branch)
    expect(run().missingRequiredFields).toEqual([]);
  });

  it("flags an empty required date field as missing (no crash on unknown type)", () => {
    const cl = buildEntryChecklist({
      title: "Hello",
      slug: "hello",
      status: "draft",
      scheduledAt: "",
      fields,
      values: { title: "Hello", publishedAt: "", urlSlug: "hello" },
    });
    expect(cl.missingRequiredFields.map((m) => m.name)).toContain("publishedAt");
  });
});

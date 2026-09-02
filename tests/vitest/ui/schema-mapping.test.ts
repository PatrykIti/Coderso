import { expect, test } from "vitest";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

import {
  buildSchemaFromFields,
  fieldsFromSchema,
  type ContentSchema,
} from "../../../core/admin/ui/content-types/schemaMapping";

test("schema mapping preserves relation metadata", () => {
  const fields = [
    {
      id: "field-title",
      name: "title",
      type: "text",
      label: "Title",
      required: true,
    },
    {
      id: "field-meta",
      name: "seo-title",
      type: "text",
      label: "SEO title",
      required: false,
      layout: {
        tab: "SEO",
        section: "Metadata",
        width: "half",
        display: "compact",
      },
    },
    {
      id: "field-related",
      name: "related-post",
      type: "relation",
      label: "Related post",
      required: false,
      relation: { target: "posts", multiple: true },
    },
    {
      id: "field-body",
      name: "body",
      type: "richtext",
      label: "Body",
      required: false,
    },
    {
      id: "field-category",
      name: "category",
      type: "select",
      label: "Category",
      required: false,
      options: [
        { id: "option-news", label: "News", value: "news" },
        { id: "option-press", label: "Press", value: "press" },
      ],
      multiple: true,
    },
    {
      id: "field-price",
      name: "price",
      type: "number",
      label: "Price",
      required: false,
      number: { format: "decimal", min: 0, max: 1000, step: 0.01 },
    },
    {
      id: "field-gallery",
      name: "gallery",
      type: "media",
      label: "Gallery",
      required: false,
      media: {
        multiple: true,
        accept: ["image/*"],
        maxItems: 6,
      },
    },
  ] as const;

  const schema = buildSchemaFromFields(fields as unknown as ContentField[]);
  const seoSchema = schema.properties["seo-title"];
  expect(
    (
      seoSchema?.xFieldConfig as {
        layout?: { tab?: string; section?: string; width?: string; display?: string };
      }
    )?.layout
  ).toEqual({
    tab: "SEO",
    section: "Metadata",
    width: "half",
    display: "compact",
  });
  const relationSchema = schema.properties["related-post"];
  expect(relationSchema?.xFieldType).toBe("relation");
  expect(relationSchema?.xRelationTarget).toBe("posts");
  expect(relationSchema?.type).toBe("array");
  expect(relationSchema?.items).toEqual({ type: "string" });
  expect(
    (
      relationSchema?.xFieldConfig as {
        relation?: { target?: string; multiple?: boolean };
      }
    )?.relation?.target
  ).toBe("posts");
  expect(
    (
      relationSchema?.xFieldConfig as {
        relation?: { target?: string; multiple?: boolean };
      }
    )?.relation?.multiple
  ).toBe(true);

  const mediaSchema = schema.properties["gallery"];
  expect(mediaSchema?.type).toBe("array");
  expect(mediaSchema?.items).toEqual({ type: "string" });
  expect(mediaSchema?.maxItems).toBe(6);
  expect(
    (
      mediaSchema?.xFieldConfig as {
        media?: { multiple?: boolean; accept?: string[]; maxItems?: number };
      }
    )?.media?.multiple
  ).toBe(true);

  const schemaWithoutRelationKeyword = {
    ...schema,
    properties: {
      ...schema.properties,
      "related-post": {
        ...schema.properties["related-post"],
        xRelationTarget: undefined,
      },
    },
  };
  const parsed = fieldsFromSchema(schemaWithoutRelationKeyword);

  const relationField = parsed.find((field) => field.name === "related-post");
  expect(relationField?.type).toBe("relation");
  expect(relationField?.relation?.target).toBe("posts");
  expect(relationField?.relation?.multiple).toBe(true);

  const richtextField = parsed.find((field) => field.name === "body");
  expect(richtextField?.type).toBe("richtext");

  const selectField = parsed.find((field) => field.name === "category");
  expect(selectField?.type).toBe("select");
  expect(selectField?.multiple).toBe(true);
  expect(selectField?.options).toEqual([
    { id: "option-0-news", label: "News", value: "news" },
    { id: "option-1-press", label: "Press", value: "press" },
  ]);

  const priceSchema = schema.properties["price"];
  expect(priceSchema?.type).toBe("number");
  expect(priceSchema?.minimum).toBe(0);
  expect(priceSchema?.maximum).toBe(1000);
  expect(priceSchema?.multipleOf).toBe(0.01);

  const priceField = parsed.find((field) => field.name === "price");
  expect(priceField?.number).toEqual({
    format: "decimal",
    min: 0,
    max: 1000,
    step: 0.01,
  });

  const mediaField = parsed.find((field) => field.name === "gallery");
  expect(mediaField?.type).toBe("media");
  expect(mediaField?.media?.multiple).toBe(true);
  expect(mediaField?.media?.accept).toEqual(["image/*"]);
  expect(mediaField?.media?.maxItems).toBe(6);

  const seoField = parsed.find((field) => field.name === "seo-title");
  expect(seoField?.layout).toEqual({
    tab: "SEO",
    section: "Metadata",
    width: "half",
    display: "compact",
  });
});

test("schema mapping normalizes defaults per field type", () => {
  const fields = [
    { id: "f1", name: "count", type: "number", label: "Count", defaultValue: "5" },
    { id: "f2", name: "bad-number", type: "number", label: "Bad", defaultValue: "abc" },
    { id: "f6", name: "empty-number", type: "number", label: "Empty", defaultValue: "" },
    { id: "f3", name: "flagged", type: "boolean", label: "Flag", defaultValue: "true" },
    { id: "f4", name: "unflagged", type: "boolean", label: "Flag2", defaultValue: "false" },
    { id: "f5", name: "excerpt", type: "text", label: "Excerpt", defaultValue: "hello" },
  ] as const;

  const schema = buildSchemaFromFields(fields as unknown as ContentField[]);
  expect(schema.properties["count"]?.default).toBe(5);
  expect(schema.properties["bad-number"]?.default).toBeUndefined();
  expect(schema.properties["flagged"]?.default).toBe(true);
  expect(schema.properties["unflagged"]?.default).toBe(false);
  expect(schema.properties["excerpt"]?.default).toBe("hello");
  expect(schema.properties["empty-number"]?.default).toBeUndefined();

  const parsed = fieldsFromSchema(schema);
  expect(parsed.find((field) => field.name === "count")?.defaultValue).toBe("5");
  expect(parsed.find((field) => field.name === "flagged")?.defaultValue).toBe("true");
  expect(parsed.find((field) => field.name === "unflagged")?.defaultValue).toBe("false");
  expect(parsed.find((field) => field.name === "excerpt")?.defaultValue).toBe("hello");
});

test("schema mapping reads relation metadata from config fallbacks", () => {
  // xFieldType missing but xFieldConfig.relation.target present → relation type.
  const schema: ContentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      related: {
        type: "array",
        items: { type: "string" },
        xRelationTarget: "posts",
        xFieldConfig: { relation: { target: "posts", multiple: true } },
      },
      configOnlyRelation: {
        type: "string",
        xFieldConfig: { relation: { target: "posts", multiple: true } },
      },
      oddRelation: {
        type: "string",
        xRelationTarget: "posts",
        xFieldConfig: { relation: { multiple: "yes" } },
      },
      noRelation: {
        type: "string",
        xRelationTarget: "posts",
        xFieldConfig: { relation: "not-an-object" },
      },
      unrelated: {
        type: "string",
        xFieldConfig: { select: "not-an-object" },
      },
    },
  };
  const parsed = fieldsFromSchema(schema);
  const related = parsed.find((field) => field.name === "related");
  expect(related?.type).toBe("relation");
  expect(related?.relation?.target).toBe("posts");
  expect(related?.relation?.multiple).toBe(true);
  const configOnlyRelation = parsed.find((field) => field.name === "configOnlyRelation");
  expect(configOnlyRelation?.type).toBe("relation");
  expect(configOnlyRelation?.relation).toBeUndefined();
  const oddRelation = parsed.find((field) => field.name === "oddRelation");
  expect(oddRelation?.type).toBe("relation");
  expect(oddRelation?.relation?.multiple).toBe(false);
  const noRelation = parsed.find((field) => field.name === "noRelation");
  expect(noRelation?.type).toBe("relation");
  const unrelated = parsed.find((field) => field.name === "unrelated");
  expect(unrelated?.type).toBe("text");
});

test("schema mapping reads string and record select options", () => {
  const schema: ContentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      tags: {
        type: "string",
        xFieldConfig: {
          select: {
            options: [
              "news",
              "",
              "Press",
              { id: "opt-1", label: "Featured", value: "featured" },
              42,
            ],
            multiple: true,
          },
        },
      },
      notSelect: {
        type: "string",
        xFieldConfig: { select: "broken" },
      },
    },
  };
  const parsed = fieldsFromSchema(schema);
  const tags = parsed.find((field) => field.name === "tags");
  expect(tags?.type).toBe("select");
  expect(tags?.multiple).toBe(true);
  expect(tags?.options?.map((option) => option.value)).toEqual(["news", "Press", "featured"]);

  const notSelect = parsed.find((field) => field.name === "notSelect");
  expect(notSelect?.type).toBe("text");
});

test("schema mapping drops empty number config and reads date/slug configs", () => {
  const schema: ContentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      price: {
        type: "number",
        xFieldConfig: {
          number: { format: undefined, min: undefined, max: undefined, step: undefined },
        },
      },
      launch: {
        type: "string",
        xFieldConfig: { date: { includeTime: true } },
      },
      noTime: {
        type: "string",
        xFieldConfig: { date: { includeTime: false } },
      },
      slugField: {
        type: "string",
        xFieldConfig: { slug: { source: "title", editable: false } },
      },
      emptySlug: {
        type: "string",
        xFieldConfig: { slug: { source: "   ", editable: true } },
      },
      brokenSlug: {
        type: "string",
        xFieldConfig: { slug: "nope" },
      },
    },
  };
  const parsed = fieldsFromSchema(schema);
  const price = parsed.find((field) => field.name === "price");
  expect(price?.type).toBe("number");
  expect(price?.number).toEqual({ format: "decimal" });
  expect(parsed.find((field) => field.name === "launch")?.date).toEqual({ includeTime: true });
  expect(parsed.find((field) => field.name === "noTime")?.date).toBeUndefined();
  const slugField = parsed.find((field) => field.name === "slugField");
  expect(slugField?.slug).toEqual({ source: "title", editable: false });
  expect(parsed.find((field) => field.name === "emptySlug")?.slug).toBeUndefined();
  expect(parsed.find((field) => field.name === "brokenSlug")?.slug).toBeUndefined();
});

test("schema mapping emits integer, single select, date, slug, and layout configs", () => {
  const fields = [
    { id: "f1", name: "age", type: "number", label: "Age", number: { format: "integer" } },
    {
      id: "f2",
      name: "tone",
      type: "select",
      label: "Tone",
      options: [
        { id: "opt-a", label: "A", value: "a" },
        { id: "opt-b", label: "B", value: "b" },
      ],
    },
    { id: "f3", name: "publishedAt", type: "date", label: "Date", date: { includeTime: true } },
    {
      id: "f4",
      name: "slug",
      type: "slug",
      label: "Slug",
      slug: { source: "title", editable: false },
    },
  ] as const;

  const schema = buildSchemaFromFields(fields as unknown as ContentField[]);
  expect(schema.properties["age"]?.type).toBe("integer");
  expect(schema.properties["tone"]?.type).toBe("string");
  expect(schema.properties["tone"]?.enum).toEqual(["a", "b"]);
  expect(schema.properties["tone"]?.xFieldConfig).toEqual({
    select: {
      options: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
    },
    order: 1,
  });
  expect(
    (schema.properties["publishedAt"]?.xFieldConfig as { date?: { includeTime?: boolean } })?.date
  ).toEqual({ includeTime: true });
  expect(schema.properties["slug"]?.xFieldConfig).toEqual({
    slug: { source: "title", editable: false },
    order: 3,
  });
});

test("schema mapping round-trips enum arrays and legacy string options", () => {
  const schema: ContentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      multiTag: {
        type: "array",
        items: { type: "string", enum: ["news", "press"] },
      },
      legacySelect: {
        type: "string",
        enum: ["featured", "hidden"],
      },
      stringOptions: {
        type: "string",
        xFieldConfig: {
          select: {
            options: ["news", "", "press"],
          },
        },
      },
    },
  };
  const parsed = fieldsFromSchema(schema);
  const multiTag = parsed.find((field) => field.name === "multiTag");
  expect(multiTag?.type).toBe("select");
  expect(multiTag?.multiple).toBe(true);
  expect(multiTag?.options?.map((option) => option.value)).toEqual(["news", "press"]);
  const legacySelect = parsed.find((field) => field.name === "legacySelect");
  expect(legacySelect?.type).toBe("select");
  expect(
    legacySelect?.options?.map((option) => ({ label: option.label, value: option.value }))
  ).toEqual([
    { label: "Featured", value: "featured" },
    { label: "Hidden", value: "hidden" },
  ]);
  const stringOptions = parsed.find((field) => field.name === "stringOptions");
  expect(stringOptions?.options?.map((option) => option.value)).toEqual(["news", "press"]);
});

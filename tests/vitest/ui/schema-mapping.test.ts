import { expect, test } from "vitest";

import {
  buildSchemaFromFields,
  fieldsFromSchema,
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
      options: ["news", "press"],
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

  const schema = buildSchemaFromFields(fields);
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
  expect(selectField?.options).toEqual(["news", "press"]);

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

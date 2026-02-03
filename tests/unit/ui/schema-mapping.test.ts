import { expect, test } from "bun:test";

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
      id: "field-related",
      name: "related-post",
      type: "relation",
      label: "Related post",
      required: false,
      relation: { target: "posts" },
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
  ] as const;

  const schema = buildSchemaFromFields(fields);
  const relationSchema = schema.properties["related-post"];
  expect(relationSchema?.xFieldType).toBe("relation");
  expect(relationSchema?.xRelationTarget).toBe("posts");
  expect(
    (relationSchema?.xFieldConfig as { relation?: { target?: string } })?.relation
      ?.target
  ).toBe("posts");

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

  const richtextField = parsed.find((field) => field.name === "body");
  expect(richtextField?.type).toBe("richtext");

  const selectField = parsed.find((field) => field.name === "category");
  expect(selectField?.type).toBe("select");
  expect(selectField?.options).toEqual(["news", "press"]);
});

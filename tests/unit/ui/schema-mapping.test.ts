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
  ] as const;

  const schema = buildSchemaFromFields(fields);
  const parsed = fieldsFromSchema(schema);

  const relationField = parsed.find((field) => field.name === "related-post");
  expect(relationField?.type).toBe("relation");
  expect(relationField?.relation?.target).toBe("posts");

  const richtextField = parsed.find((field) => field.name === "body");
  expect(richtextField?.type).toBe("richtext");
});

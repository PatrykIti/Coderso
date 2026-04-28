import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import {
  SchemaBuilder,
  validateFieldName,
  type ContentField,
} from "../../../core/admin/ui/content-types/SchemaBuilder";

const fields: ContentField[] = [
  {
    id: "title",
    name: "title",
    type: "text",
    label: "Title",
    required: true,
  },
  {
    id: "summary",
    name: "summary",
    type: "richtext",
    label: "Summary",
  },
];

test("validateFieldName enforces kebab-case and uniqueness", () => {
  expect(validateFieldName("", fields)).toBe("Field name is required.");
  expect(validateFieldName("Title", fields)).toBe(
    "Use kebab-case (e.g. hero-title)."
  );
  expect(validateFieldName("title", fields, "other")).toBe(
    "Field name must be unique."
  );
  expect(validateFieldName("hero-title", fields)).toBeNull();
  expect(validateFieldName("title", fields, "title")).toBeNull();
});

test("SchemaBuilder renders field editor", () => {
  const html = renderAdminUi(
    <SchemaBuilder
      fields={fields}
      selectedId={fields[0]?.id ?? null}
      onSelect={() => {}}
      onChange={() => {}}
    />
  );

  expect(html).toContain("Field settings");
  expect(html).toContain("Field name");
});

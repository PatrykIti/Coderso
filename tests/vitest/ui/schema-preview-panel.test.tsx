import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { SchemaPreviewPanel } from "../../../core/admin/ui/content-types/SchemaPreviewPanel";
import type { ContentSchema } from "../../../core/admin/ui/content-types/schemaMapping";

const schema: ContentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", title: "Title" },
  },
};

test("SchemaPreviewPanel renders the copy button and formatted JSON", () => {
  const html = renderToString(<SchemaPreviewPanel schema={schema} />);
  expect(html).toContain("Schema Preview");
  expect(html).toContain("Copy JSON");
  expect(html).toContain("Generated JSON schema for the API.");
  expect(html).toContain("&quot;type&quot;: &quot;object&quot;");
  expect(html).toContain("Preview updates live as you edit fields.");
});

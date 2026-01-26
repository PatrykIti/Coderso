import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SchemaBuilderPage } from "../../../core/admin/ui/content-types/SchemaBuilderPage";

test("SchemaBuilderPage renders schema builder sections", () => {
  const html = renderToString(<SchemaBuilderPage />);

  expect(html).toContain("Schema Builder");
  expect(html).toContain("Schema Preview");
  expect(html).toContain("Add new field");
});

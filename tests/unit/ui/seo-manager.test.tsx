import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SeoManagerPage } from "../../../core/admin/ui/seo/SeoManagerPage";

test("SeoManagerPage renders table and drawer", () => {
  const html = renderToString(<SeoManagerPage />);

  expect(html).toContain("SEO Manager");
  expect(html).toContain("Run Full Audit");
  expect(html).toContain("SEO Score");
  expect(html).toContain("Quick SEO Edit");
  expect(html).toContain("Search Engine Preview");
});

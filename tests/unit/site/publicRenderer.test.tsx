import { expect, test } from "bun:test";

import { renderPublicPageHtml } from "../../../core/site/renderPublicPage";

test("renderPublicPageHtml renders title and preview banner", () => {
  const html = renderPublicPageHtml({
    title: "About Us",
    blocks: [],
    cssHref: "/admin/assets/index.css",
    isPreview: true,
  });

  expect(html).toContain("<title>About Us</title>");
  expect(html).toContain("Preview mode");
  expect(html).toContain("/admin/assets/index.css");
});

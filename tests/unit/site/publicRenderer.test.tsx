import { expect, test } from "bun:test";

import { renderPublicPageHtml } from "../../../core/site/renderPublicPage";

test("renderPublicPageHtml renders title and preview banner", () => {
  const html = renderPublicPageHtml({
    title: "About Us",
    blocks: [],
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
    isPreview: true,
  });

  expect(html).toContain("<title>About Us</title>");
  expect(html).toContain("Preview mode");
  expect(html).toContain("/site/assets/site.css");
  expect(html).toContain("--color-bg:#ffffff");
});

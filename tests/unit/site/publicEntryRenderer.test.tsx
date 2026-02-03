import { expect, test } from "bun:test";

import {
  renderPublicEntryDetailHtml,
  renderPublicEntryListHtml,
} from "../../../core/site/renderPublicEntry";

test("renderPublicEntryListHtml renders entries and preview banner", () => {
  const html = renderPublicEntryListHtml({
    title: "Blog",
    items: [{ id: "1", title: "Hello", href: "/blog/hello" }],
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
    isPreview: true,
  });

  expect(html).toContain("<title>Blog</title>");
  expect(html).toContain("Preview mode");
  expect(html).toContain("/blog/hello");
  expect(html).toContain("/site/assets/site.css");
});

test("renderPublicEntryDetailHtml renders entry data", () => {
  const html = renderPublicEntryDetailHtml({
    title: "Hello",
    entryTitle: "Hello",
    entryData: { summary: "World" },
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
  });

  expect(html).toContain("<title>Hello</title>");
  expect(html).toContain("Hello");
  expect(html).toContain("&quot;summary&quot;: &quot;World&quot;");
});

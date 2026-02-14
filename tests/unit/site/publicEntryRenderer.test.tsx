import { afterEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  renderPublicEntryDetailHtml,
  renderPublicEntryListHtml,
} from "../../../core/site/renderPublicEntry";
import { resetThemeRegistry } from "../../../core/themes/registry";

const baseEntry = {
  id: "entry-1",
  typeId: "type-1",
  title: "Hello",
  slug: "hello",
  status: "published",
  data: { summary: "World" },
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  author: null,
  seo: null,
};

const baseContentType = {
  id: "type-1",
  name: "Blog",
  slug: "blog",
};

afterEach(() => {
  delete process.env.THEMES_DIR;
  resetThemeRegistry();
});

test("renderPublicEntryListHtml renders entries and preview banner", async () => {
  const html = await renderPublicEntryListHtml({
    title: "Blog",
    contentType: baseContentType,
    items: [
      {
        id: "1",
        title: "Hello",
        href: "/blog/hello",
        entry: baseEntry,
      },
    ],
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
    isPreview: true,
  });

  expect(html).toContain("<title>Blog</title>");
  expect(html).toContain("Preview mode");
  expect(html).toContain("/blog/hello");
  expect(html).toContain("/site/assets/site.css");
  expect(html).toContain("rel=\"preload\"");
  expect(html).toContain("as=\"style\"");
  expect(html).toContain("body{opacity:0}");
  expect(html).toContain("data-template=\"content-list\"");
});

test("renderPublicEntryListHtml hides preview until load when using dev modules", async () => {
  const html = await renderPublicEntryListHtml({
    title: "Blog",
    contentType: baseContentType,
    items: [
      {
        id: "1",
        title: "Hello",
        href: "/blog/hello",
        entry: baseEntry,
      },
    ],
    inlineCss: ":root{--color-bg:#ffffff;}",
    isPreview: true,
    devModuleScripts: [
      "http://localhost:5174/site/@vite/client",
      "http://localhost:5174/site/main.ts",
    ],
  });

  expect(html).toContain("body{opacity:0}");
  expect(html).toContain('window.addEventListener("load"');
});

test("renderPublicEntryDetailHtml renders entry data", async () => {
  const html = await renderPublicEntryDetailHtml({
    title: "Hello",
    contentType: baseContentType,
    entry: baseEntry,
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
  });

  expect(html).toContain("<title>Hello</title>");
  expect(html).toContain("Hello");
  expect(html).toContain("data-template=\"content-detail\"");
  expect(html).toContain("summary");
  expect(html).toContain("World");
});

test("renderPublicEntryListHtml prefers theme templates when available", async () => {
  const templatesDir = path.resolve(
    process.cwd(),
    "themes",
    "admin-default",
    "templates"
  );
  const templatesDirExists = existsSync(templatesDir);
  const templatePath = path.join(templatesDir, "content-blog-list.tsx");
  await mkdir(templatesDir, { recursive: true });
  await writeFile(
    templatePath,
    `export default function PreviewTemplate() { return <main data-template=\"theme-list\">Theme list</main>; }`
  );

  try {
    const html = await renderPublicEntryListHtml({
      title: "Blog",
      contentType: baseContentType,
      items: [
        {
          id: "1",
          title: "Hello",
          href: "/blog/hello",
          entry: baseEntry,
        },
      ],
      themeName: "admin-default",
    });

    expect(html).toContain("data-template=\"theme-list\"");
  } finally {
    await rm(templatePath, { force: true });
    if (!templatesDirExists) {
      await rm(templatesDir, { recursive: true, force: true });
    }
  }
});

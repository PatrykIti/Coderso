import { expect, test } from "bun:test";

import { renderPublicEntryDetailHtml } from "../../../core/site/renderPublicEntry";
import type { EntryDetail } from "../../../core/services/content/entryService";

const createPostEntryDetail = (data: Record<string, unknown>): EntryDetail => ({
  id: "entry-1",
  typeId: "post-type",
  title: "Runtime parity post",
  slug: "runtime-parity-post",
  status: "published",
  data,
  tags: [],
  taxonomy: undefined,
  scheduledAt: null,
  publishedAt: new Date("2026-02-21T10:00:00.000Z"),
  createdAt: new Date("2026-02-21T08:00:00.000Z"),
  updatedAt: new Date("2026-02-21T10:00:00.000Z"),
  author: null,
  seo: null,
});

test("post detail rendering uses the same block runtime for preview and published", async () => {
  const entry = createPostEntryDetail({
    document: {
      version: 1,
      blocks: [
        {
          id: "heading-1",
          type: "heading",
          attrs: { level: 2 },
          content: "<h2>Runtime heading</h2>",
        },
        {
          id: "paragraph-1",
          type: "paragraph",
          attrs: {},
          content: "<p>Runtime paragraph for preview parity.</p>",
        },
      ],
      meta: {},
    },
  });

  const base = {
    title: entry.title,
    contentType: {
      id: "post-type",
      name: "Post",
      slug: "post",
    },
    entry,
    cssHref: null,
    inlineCss: null,
    devModuleScripts: null,
    themeName: null,
  };

  const publishedHtml = await renderPublicEntryDetailHtml({
    ...base,
    isPreview: false,
  });
  const previewHtml = await renderPublicEntryDetailHtml({
    ...base,
    isPreview: true,
  });

  expect(publishedHtml).toContain("post-runtime-blocks");
  expect(previewHtml).toContain("post-runtime-blocks");
  expect(publishedHtml).toContain("Runtime heading");
  expect(previewHtml).toContain("Runtime heading");
  expect(previewHtml).toContain("Preview mode");
  expect(publishedHtml).not.toContain("Preview mode");
  expect(publishedHtml).not.toContain("<dl class=\"space-y-4\">");
});

test("legacy post data still renders through runtime fallback", async () => {
  const entry = createPostEntryDetail({
    content: "<p>Legacy post body fallback.</p>",
  });

  const html = await renderPublicEntryDetailHtml({
    title: entry.title,
    contentType: {
      id: "post-type",
      name: "Post",
      slug: "post",
    },
    entry,
    cssHref: null,
    inlineCss: null,
    devModuleScripts: null,
    themeName: null,
    isPreview: false,
  });

  expect(html).toContain("Legacy post body fallback.");
  expect(html).toContain("post-runtime-blocks");
});

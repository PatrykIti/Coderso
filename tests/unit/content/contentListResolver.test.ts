import { expect, test } from "bun:test";

import { mapEntriesToContentListItems } from "../../../core/services/content/contentListResolver";

const createEntry = (data: Record<string, unknown>) => ({
  id: "entry-1",
  typeId: "post-type",
  title: "Entry title",
  slug: "entry-title",
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

test("mapEntriesToContentListItems resolves excerpt from post block document", async () => {
  const [item] = await mapEntriesToContentListItems(
    [
      createEntry({
        document: {
          version: 1,
          blocks: [
            {
              id: "block-1",
              type: "paragraph",
              attrs: {},
              content: "<p>Excerpt from block document runtime text.</p>",
            },
          ],
          meta: {},
        },
      }),
    ],
    { detailPathPattern: "/blog/:slug", showImage: false }
  );

  expect(item?.excerpt).toContain("Excerpt from block document runtime text.");
  expect(item?.href).toBe("/blog/entry-title");
});

test("mapEntriesToContentListItems keeps explicit excerpt priority", async () => {
  const [item] = await mapEntriesToContentListItems(
    [
      createEntry({
        excerpt: "Explicit excerpt wins.",
        document: {
          version: 1,
          blocks: [
            {
              id: "block-1",
              type: "paragraph",
              attrs: {},
              content: "<p>Document fallback should not override explicit excerpt.</p>",
            },
          ],
          meta: {},
        },
      }),
    ],
    { detailPathPattern: "/blog/:slug", showImage: false }
  );

  expect(item?.excerpt).toBe("Explicit excerpt wins.");
});

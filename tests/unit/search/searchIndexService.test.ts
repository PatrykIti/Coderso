import { expect, test } from "bun:test";

import {
  parsePublicSearchSources,
  searchPublicIndex,
  type SearchPublicIndexDeps,
} from "../../../core/services/search/searchIndexService";

test("parsePublicSearchSources normalizes values and falls back to defaults", () => {
  expect(parsePublicSearchSources(undefined)).toEqual(["pages", "entries", "posts"]);
  expect(parsePublicSearchSources("pages,entries,entries,unknown")).toEqual([
    "pages",
    "entries",
  ]);
  expect(parsePublicSearchSources("unknown")).toEqual(["pages", "entries", "posts"]);
});

test("searchPublicIndex returns empty result for short query", async () => {
  const result = await searchPublicIndex("a");
  expect(result.items).toEqual([]);
  expect(result.query).toBe("a");
});

test("searchPublicIndex maps hrefs and sorts by updatedAt", async () => {
  const deps: SearchPublicIndexDeps = {
    listPages: async () => [
      {
        id: "page-1",
        title: "About",
        slug: "about",
        updatedAt: "2026-02-10T10:00:00.000Z",
      },
    ],
    listContent: async () => [
      {
        id: "entry-1",
        title: "Service A",
        slug: "service-a",
        updatedAt: "2026-02-11T10:00:00.000Z",
        typeSlug: "services",
      },
      {
        id: "post-1",
        title: "News update",
        slug: "news-update",
        updatedAt: "2026-02-12T10:00:00.000Z",
        typeSlug: "post",
      },
    ],
  };

  const result = await searchPublicIndex(
    "service",
    {
      sources: "pages,entries,posts",
      contentRoutes: [
        {
          type: "services",
          listPath: "/services",
          detailPath: "/services/:slug",
          enabled: true,
        },
      ],
    },
    deps
  );

  expect(result.items.map((item) => item.id)).toEqual(["post-1", "entry-1", "page-1"]);
  expect(result.items.find((item) => item.id === "entry-1")?.href).toBe(
    "/services/service-a"
  );
  expect(result.items.find((item) => item.id === "post-1")?.source).toBe("posts");
});

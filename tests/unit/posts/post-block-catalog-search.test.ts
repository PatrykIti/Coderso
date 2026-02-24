import { expect, test } from "bun:test";

import {
  groupPostBlockCatalogByCategory,
  POST_BLOCK_CATEGORY_ORDER,
  resolveMostUsedPostBlocks,
  searchPostBlockCatalog,
} from "../../../core/admin/ui/posts/editor/blocks/blockCatalog";

test("searchPostBlockCatalog finds blocks by label and keywords", () => {
  const byLabel = searchPostBlockCatalog("heading");
  const byKeyword = searchPostBlockCatalog("cta");

  expect(byLabel.some((item) => item.type === "heading")).toBe(true);
  expect(byKeyword.some((item) => item.type === "button")).toBe(true);
});

test("searchPostBlockCatalog filters by category", () => {
  const mediaResults = searchPostBlockCatalog("", { category: "media" });

  expect(mediaResults.length).toBeGreaterThan(0);
  expect(mediaResults.every((item) => item.category === "media")).toBe(true);
});

test("groupPostBlockCatalogByCategory keeps deterministic category order", () => {
  const groups = groupPostBlockCatalogByCategory(searchPostBlockCatalog(""));
  const categories = groups.map((group) => group.category);

  expect(categories).toEqual(POST_BLOCK_CATEGORY_ORDER);
});

test("resolveMostUsedPostBlocks keeps source order and removes duplicates", () => {
  const mostUsed = resolveMostUsedPostBlocks([
    "heading",
    "image",
    "heading",
    "button",
  ]);

  expect(mostUsed.map((item) => item.type)).toEqual([
    "heading",
    "image",
    "button",
  ]);
});

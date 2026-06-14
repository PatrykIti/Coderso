import { expect, test } from "bun:test";

import {
  buildSiteCacheKey,
  clearSiteCache,
  configureSiteCache,
  getSiteCacheEntry,
  invalidateLinkedDetailPageRouteCaches,
  invalidateSiteCachePath,
  resolveSiteCacheSearchSignature,
  resolveContentEntryPaths,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";

test("site cache stores and expires entries based on ttl", () => {
  clearSiteCache();
  configureSiteCache(2);

  const key = buildSiteCacheKey("profile-1", "/blog");
  setSiteCacheEntry(key, "<html />", 2, 0);

  expect(getSiteCacheEntry(key, 1500)).toBe("<html />");
  expect(getSiteCacheEntry(key, 2500)).toBe(null);
});

test("invalidateSiteCachePath clears all profiles for a path", () => {
  clearSiteCache();
  configureSiteCache(10);

  const keyOne = buildSiteCacheKey("profile-1", "/blog");
  const keyTwo = buildSiteCacheKey("profile-2", "/blog");
  const keyOther = buildSiteCacheKey("profile-2", "/about");

  setSiteCacheEntry(keyOne, "one", 10, 0);
  setSiteCacheEntry(keyTwo, "two", 10, 0);
  setSiteCacheEntry(keyOther, "other", 10, 0);

  invalidateSiteCachePath("/blog");

  expect(getSiteCacheEntry(keyOne, 1)).toBe(null);
  expect(getSiteCacheEntry(keyTwo, 1)).toBe(null);
  expect(getSiteCacheEntry(keyOther, 1)).toBe("other");
});

test("site cache search signature accepts only bounded runtime query grammar", () => {
  const canonical = resolveSiteCacheSearchSignature(
    new URLSearchParams(
      "lq.query-1.data.rooms.in=3&lq.query-1.__sort=data.rooms%3Aasc&cl.block_1.page=2&page=3&sort=title"
    )
  );
  expect(canonical.cacheable).toBe(true);
  expect(canonical.signature).toBe(
    "cl.block_1.page=2&lq.query-1.__sort=data.rooms%3Aasc&lq.query-1.data.rooms.in=3&page=3&sort=title"
  );

  expect(
    resolveSiteCacheSearchSignature(new URLSearchParams("lq.query-1.not-a-token=value")).cacheable
  ).toBe(false);
  expect(
    resolveSiteCacheSearchSignature(new URLSearchParams("lq.query-1.data.rooms.nope=3")).cacheable
  ).toBe(false);
  expect(resolveSiteCacheSearchSignature(new URLSearchParams("rooms=3")).cacheable).toBe(false);
});

test("resolveContentEntryPaths builds list and detail paths", () => {
  const routes = [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
    },
  ];

  const paths = resolveContentEntryPaths({
    routes,
    typeSlug: "blog",
    entrySlug: "hello",
    entryId: "entry-1",
  });

  expect(paths?.listPath).toBe("/blog");
  expect(paths?.detailPath).toBe("/blog/hello");
});

test("invalidateLinkedDetailPageRouteCaches clears only linked detail routes", async () => {
  clearSiteCache();
  configureSiteCache(10);

  const linkedList = buildSiteCacheKey("profile-1", "/products");
  const linkedDetail = buildSiteCacheKey("profile-1", "/products/example");
  const unlinkedList = buildSiteCacheKey("profile-1", "/blog");

  setSiteCacheEntry(linkedList, "linked-list", 10, 0);
  setSiteCacheEntry(linkedDetail, "linked-detail", 10, 0);
  setSiteCacheEntry(unlinkedList, "unlinked-list", 10, 0);

  await invalidateLinkedDetailPageRouteCaches([
    {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: "detail-page-1",
    },
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
    },
  ]);

  expect(getSiteCacheEntry(linkedList, 1)).toBe(null);
  expect(getSiteCacheEntry(linkedDetail, 1)).toBe(null);
  expect(getSiteCacheEntry(unlinkedList, 1)).toBe("unlinked-list");
});

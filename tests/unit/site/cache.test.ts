import { expect, test } from "bun:test";

import {
  buildSiteCacheKey,
  clearSiteCache,
  configureSiteCache,
  getSiteCacheEntry,
  invalidateSiteCachePath,
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

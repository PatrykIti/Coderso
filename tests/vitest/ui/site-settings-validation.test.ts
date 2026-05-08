import { expect, test } from "vitest";

import {
  mergeContentRoutes,
  normalizeRouteInput,
  validateContentRoutes,
  type SiteContentRouteForm,
} from "../../../core/admin/ui/site/siteSettingsValidation";

test("normalizeRouteInput prefixes leading slash", () => {
  expect(normalizeRouteInput("blog", true)).toBe("/blog");
  expect(normalizeRouteInput("/blog/", true)).toBe("/blog");
  expect(normalizeRouteInput("/", true)).toBe("/");
  expect(normalizeRouteInput("/", false)).toBeNull();
});

test("validateContentRoutes flags invalid and conflicting paths", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/item",
      enabled: true,
    },
    {
      type: "news",
      listPath: "/blog",
      detailPath: "/news/:slug",
      enabled: true,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  expect(result.errorsByType.blog?.detailPath).toBeDefined();
  expect(result.errorsByType.news?.listPath).toBeDefined();
});

test("mergeContentRoutes preserves existing detailPageId metadata", () => {
  const routes = mergeContentRoutes(
    [
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
        detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      },
    ],
    [{ slug: "blog" }]
  );

  expect(routes[0]?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

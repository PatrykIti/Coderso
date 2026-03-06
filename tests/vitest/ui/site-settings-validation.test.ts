import { expect, test } from "vitest";

import {
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

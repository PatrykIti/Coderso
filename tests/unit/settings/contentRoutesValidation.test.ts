import { expect, test } from "bun:test";

import { normalizeContentRoutes } from "../../../core/services/settings/settingsService";

test("normalizeContentRoutes normalizes paths and defaults enabled", () => {
  const routes = normalizeContentRoutes([
    {
      type: "blog",
      listPath: "blog/",
      detailPath: "/blog/:slug/",
      detailPageId: "4DD7F4D4-48D8-53F7-A9E6-0D01F6B89E6C",
    },
  ]);

  expect(routes).toHaveLength(1);
  expect(routes[0]?.listPath).toBe("/blog");
  expect(routes[0]?.detailPath).toBe("/blog/:slug");
  expect(routes[0]?.enabled).toBe(true);
  expect(routes[0]?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test("normalizeContentRoutes rejects duplicate types", () => {
  expect(() =>
    normalizeContentRoutes([
      { type: "blog", listPath: "/blog", detailPath: "/blog/:slug" },
      { type: "blog", listPath: "/news", detailPath: "/news/:slug" },
    ])
  ).toThrow();
});

test("normalizeContentRoutes rejects invalid detailPageId values", () => {
  expect(() =>
    normalizeContentRoutes([
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        detailPageId: "not-a-uuid",
      },
    ])
  ).toThrow();
});

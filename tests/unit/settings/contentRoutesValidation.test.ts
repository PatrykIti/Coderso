import { expect, test } from "bun:test";

import { normalizeContentRoutes } from "../../../core/services/settings/settingsService";

test("normalizeContentRoutes normalizes paths and defaults enabled", () => {
  const routes = normalizeContentRoutes([
    {
      type: "blog",
      listPath: "blog/",
      detailPath: "/blog/:slug/",
    },
  ]);

  expect(routes).toHaveLength(1);
  expect(routes[0]?.listPath).toBe("/blog");
  expect(routes[0]?.detailPath).toBe("/blog/:slug");
  expect(routes[0]?.enabled).toBe(true);
});

test("normalizeContentRoutes rejects duplicate types", () => {
  expect(() =>
    normalizeContentRoutes([
      { type: "blog", listPath: "/blog", detailPath: "/blog/:slug" },
      { type: "blog", listPath: "/news", detailPath: "/news/:slug" },
    ])
  ).toThrow();
});

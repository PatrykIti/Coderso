import { expect, test } from "bun:test";

import { matchContentRoute } from "../../../core/site/contentRouteMatcher";

const routes = [
  {
    type: "blog",
    listPath: "/blog",
    detailPath: "/blog/:slug",
    enabled: true,
    detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
  },
];

test("matchContentRoute matches list routes", () => {
  const match = matchContentRoute("/blog", routes);
  expect(match?.mode).toBe("list");
  expect(match?.type).toBe("blog");
  expect(match?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test("matchContentRoute matches detail routes and params", () => {
  const match = matchContentRoute("/blog/hello-world", routes);
  expect(match?.mode).toBe("detail");
  expect(match?.params.slug).toBe("hello-world");
  expect(match?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test("matchContentRoute ignores disabled routes", () => {
  const match = matchContentRoute("/blog", [{ ...routes[0], enabled: false }]);
  expect(match).toBe(null);
});

test("matchContentRoute prefers exact list routes over generic detail routes", () => {
  const match = matchContentRoute("/products", [
    {
      type: "generic",
      listPath: "/generic",
      detailPath: "/:slug",
      enabled: true,
    },
    {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
    },
  ]);

  expect(match).toEqual({
    type: "products",
    mode: "list",
    params: {},
    listPath: "/products",
    detailPath: "/products/:slug",
    detailPageId: null,
  });
});

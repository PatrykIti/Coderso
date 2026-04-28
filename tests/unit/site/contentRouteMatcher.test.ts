import { expect, test } from "bun:test";

import { matchContentRoute } from "../../../core/site/contentRouteMatcher";

const routes = [
  {
    type: "blog",
    listPath: "/blog",
    detailPath: "/blog/:slug",
    enabled: true,
  },
];

test("matchContentRoute matches list routes", () => {
  const match = matchContentRoute("/blog", routes);
  expect(match?.mode).toBe("list");
  expect(match?.type).toBe("blog");
});

test("matchContentRoute matches detail routes and params", () => {
  const match = matchContentRoute("/blog/hello-world", routes);
  expect(match?.mode).toBe("detail");
  expect(match?.params.slug).toBe("hello-world");
});

test("matchContentRoute ignores disabled routes", () => {
  const match = matchContentRoute("/blog", [
    { ...routes[0], enabled: false },
  ]);
  expect(match).toBe(null);
});

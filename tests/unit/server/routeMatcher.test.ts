import { expect, test } from "bun:test";

import { matchRoute } from "../../../core/server/router";

test("matchRoute matches params", () => {
  const result = matchRoute("/pages/:id", "/pages/123");
  expect(result.matched).toBe(true);
  expect(result.params.id).toBe("123");
});

test("matchRoute handles trailing slash", () => {
  const result = matchRoute("/admin", "/admin/");
  expect(result.matched).toBe(true);
});

test("matchRoute rejects mismatch", () => {
  const result = matchRoute("/pages/:id", "/media/123");
  expect(result.matched).toBe(false);
});

import { expect, test } from "bun:test";

import {
  DEFAULT_ADMIN_PATH,
  resolveAdminBasePath,
  stripAdminBasePath,
  withAdminBasePath,
  resolveAdminHref,
} from "../../../core/admin/utils/adminPaths";

test("resolveAdminBasePath uses first path segment", () => {
  expect(resolveAdminBasePath("/admin/pages")).toBe("/admin");
  expect(resolveAdminBasePath("/cms/pages/123")).toBe("/cms");
  expect(resolveAdminBasePath("/")).toBe(DEFAULT_ADMIN_PATH);
  expect(resolveAdminBasePath("/admin/")).toBe("/admin");
});

test("stripAdminBasePath removes admin base prefix", () => {
  expect(stripAdminBasePath("/admin", "/admin")).toBe("/");
  expect(stripAdminBasePath("/admin/pages", "/admin")).toBe("/pages");
  expect(stripAdminBasePath("/cms/pages", "/admin")).toBe("/cms/pages");
});

test("withAdminBasePath normalizes admin links", () => {
  expect(withAdminBasePath("/cms", "/pages")).toBe("/cms/pages");
  expect(withAdminBasePath("/cms", "pages")).toBe("/cms/pages");
  expect(withAdminBasePath("/cms", "/admin/pages")).toBe("/cms/pages");
  expect(withAdminBasePath("/cms", "/cms/pages")).toBe("/cms/pages");
});

test("resolveAdminHref preserves external urls", () => {
  expect(resolveAdminHref("/admin", "https://example.com")).toBe(
    "https://example.com"
  );
});

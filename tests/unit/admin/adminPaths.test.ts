import { expect, test } from "bun:test";

import {
  DEFAULT_ADMIN_PATH,
  isAdminHrefActive,
  resolveAdminRoutePath,
  resolveAdminBasePath,
  resolveAdminHref,
  withAdminBasePath,
  stripAdminBasePath,
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

test("resolveAdminRoutePath aliases legacy paths to coderso", () => {
  expect(resolveAdminRoutePath("/content-types")).toBe("/coderso/engine");
  expect(resolveAdminRoutePath("/content-types/type-1/schema")).toBe(
    "/coderso/engine/type-1/schema"
  );
  expect(resolveAdminRoutePath("/entries")).toBe("/coderso/entries");
  expect(resolveAdminRoutePath("/entries/articles/entry-1")).toBe(
    "/coderso/entries/articles/entry-1"
  );
  expect(resolveAdminRoutePath("/widgets/templates/new")).toBe(
    "/coderso/widgets/templates/new"
  );
  expect(resolveAdminRoutePath("/forms/form-1")).toBe("/coderso/forms/form-1");
  expect(resolveAdminRoutePath("/listings/query-1")).toBe(
    "/coderso/listings/query-1"
  );
  expect(resolveAdminRoutePath("/coderso/widgets")).toBe("/coderso/widgets");
});

test("resolveAdminHref canonicalizes admin links", () => {
  expect(resolveAdminHref("/admin", "/admin/content-types")).toBe(
    "/admin/coderso/engine"
  );
  expect(resolveAdminHref("/admin", "/forms/abc")).toBe(
    "/admin/coderso/forms/abc"
  );
  expect(resolveAdminHref("/admin", "/widgets?view=templates")).toBe(
    "/admin/coderso/widgets?view=templates"
  );
  expect(resolveAdminHref("/admin", "/listings")).toBe("/admin/coderso/listings");
});

test("isAdminHrefActive checks canonical and nested matches", () => {
  expect(
    isAdminHrefActive(
      "/admin",
      "/admin/coderso/engine",
      "/admin/content-types/type-1"
    )
  ).toBe(true);
  expect(
    isAdminHrefActive(
      "/admin",
      "/admin/coderso/forms",
      "/admin/coderso/forms/form-1"
    )
  ).toBe(true);
  expect(
    isAdminHrefActive(
      "/admin",
      "/admin/coderso/widgets",
      "/admin/coderso/forms"
    )
  ).toBe(false);
});

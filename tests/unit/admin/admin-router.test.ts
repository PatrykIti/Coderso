import { expect, test } from "bun:test";

import {
  resolveAdminHref,
  resolveAdminRoutePath,
} from "../../../core/admin/utils/adminPaths";

test("legacy admin paths resolve to canonical coderso routes", () => {
  expect(resolveAdminRoutePath("/content-types")).toBe("/coderso/engine");
  expect(resolveAdminRoutePath("/content")).toBe("/coderso/entries");
  expect(resolveAdminRoutePath("/widgets/templates/template-1")).toBe(
    "/coderso/widgets/templates/template-1"
  );
  expect(resolveAdminRoutePath("/listings")).toBe("/coderso/listings");
  expect(resolveAdminRoutePath("/reviews")).toBe("/coderso/reviews");
  expect(resolveAdminRoutePath("/popups")).toBe("/coderso/popups");
  expect(resolveAdminRoutePath("/solution-kits")).toBe(
    "/coderso/solution-kits"
  );
});

test("route alias resolution is idempotent", () => {
  const canonical = resolveAdminRoutePath("/entries/article/entry-1");
  expect(canonical).toBe("/coderso/entries/article/entry-1");
  expect(resolveAdminRoutePath(canonical)).toBe(canonical);
});

test("resolveAdminHref respects custom admin base path during aliasing", () => {
  expect(resolveAdminHref("/cms", "/admin/forms/form-1")).toBe(
    "/cms/coderso/forms/form-1"
  );
});

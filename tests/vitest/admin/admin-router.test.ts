import { expect, test } from "vitest";

import { resolveAdminHref, resolveAdminRoutePath } from "../../../core/admin/utils/adminPaths";

test("legacy admin paths resolve to canonical advanced routes", () => {
  expect(resolveAdminRoutePath("/content-types")).toBe("/advanced/engine");
  expect(resolveAdminRoutePath("/content")).toBe("/advanced/entries");
  expect(resolveAdminRoutePath("/widgets/templates/template-1")).toBe(
    "/widgets/templates/template-1"
  );
  expect(resolveAdminRoutePath("/listings")).toBe("/advanced/listings");
  expect(resolveAdminRoutePath("/reviews")).toBe("/advanced/reviews");
  expect(resolveAdminRoutePath("/popups")).toBe("/advanced/popups");
  expect(resolveAdminRoutePath("/solution-kits")).toBe("/advanced/solution-kits");
  expect(resolveAdminRoutePath("/coderso/forms/form-1")).toBe("/advanced/forms/form-1");
});

test("route alias resolution is idempotent", () => {
  const canonical = resolveAdminRoutePath("/entries/article/entry-1");
  expect(canonical).toBe("/advanced/entries/article/entry-1");
  expect(resolveAdminRoutePath(canonical)).toBe(canonical);
});

test("resolveAdminHref respects custom admin base path during aliasing", () => {
  expect(resolveAdminHref("/cms", "/admin/forms/form-1")).toBe("/cms/advanced/forms/form-1");
});

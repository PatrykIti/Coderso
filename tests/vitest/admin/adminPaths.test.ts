import { expect, test } from "vitest";

import {
  DEFAULT_ADMIN_PATH,
  isAdminHrefActive,
  mapNavItems,
  mapNavSections,
  resolveAdminBasePath,
  resolveAdminHref,
  resolveAdminRoutePath,
  stripAdminBasePath,
  withAdminBasePath,
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
  expect(resolveAdminHref("/admin", "https://example.com")).toBe("https://example.com");
});

test("resolveAdminRoutePath aliases legacy paths to advanced", () => {
  expect(resolveAdminRoutePath("/content-types")).toBe("/advanced/engine");
  expect(resolveAdminRoutePath("/content-types/type-1/schema")).toBe(
    "/advanced/engine/type-1/schema"
  );
  expect(resolveAdminRoutePath("/entries")).toBe("/advanced/entries");
  expect(resolveAdminRoutePath("/entries/articles/entry-1")).toBe(
    "/advanced/entries/articles/entry-1"
  );
  expect(resolveAdminRoutePath("/widgets/templates/new")).toBe("/widgets/templates/new");
  expect(resolveAdminRoutePath("/forms/form-1")).toBe("/advanced/forms/form-1");
  expect(resolveAdminRoutePath("/custom-screens")).toBe("/advanced/custom-screens");
  expect(resolveAdminRoutePath("/custom-screens/screen-1")).toBe(
    "/advanced/custom-screens/screen-1"
  );
  expect(resolveAdminRoutePath("/listings/query-1")).toBe("/advanced/listings/query-1");
  expect(resolveAdminRoutePath("/booking")).toBe("/advanced/booking");
  expect(resolveAdminRoutePath("/booking/resources")).toBe("/advanced/booking/resources");
  expect(resolveAdminRoutePath("/reviews")).toBe("/advanced/reviews");
  expect(resolveAdminRoutePath("/reviews/review-1")).toBe("/advanced/reviews/review-1");
  expect(resolveAdminRoutePath("/commerce")).toBe("/advanced/commerce");
  expect(resolveAdminRoutePath("/commerce/product-1")).toBe("/advanced/commerce/product-1");
  expect(resolveAdminRoutePath("/popups")).toBe("/advanced/popups");
  expect(resolveAdminRoutePath("/popups/popup-1")).toBe("/advanced/popups/popup-1");
  expect(resolveAdminRoutePath("/solution-kits")).toBe("/advanced/solution-kits");
  expect(resolveAdminRoutePath("/advanced/widgets")).toBe("/advanced/widgets");
  expect(resolveAdminRoutePath("/coderso/widgets")).toBe("/advanced/widgets");
  expect(resolveAdminRoutePath("/coderso/widgets/templates/template-1")).toBe(
    "/advanced/widgets/templates/template-1"
  );
  expect(resolveAdminRoutePath("/coderso/posts/post-1")).toBe("/posts/post-1");
});

test("resolveAdminHref canonicalizes admin links", () => {
  expect(resolveAdminHref("/admin", "/admin/content-types")).toBe("/admin/advanced/engine");
  expect(resolveAdminHref("/admin", "/forms/abc")).toBe("/admin/advanced/forms/abc");
  expect(resolveAdminHref("/admin", "/widgets?view=templates")).toBe(
    "/admin/widgets?view=templates"
  );
  expect(resolveAdminHref("/admin", "/custom-screens")).toBe("/admin/advanced/custom-screens");
  expect(resolveAdminHref("/admin", "/listings")).toBe("/admin/advanced/listings");
  expect(resolveAdminHref("/admin", "/booking")).toBe("/admin/advanced/booking");
  expect(resolveAdminHref("/admin", "/reviews")).toBe("/admin/advanced/reviews");
  expect(resolveAdminHref("/admin", "/commerce")).toBe("/admin/advanced/commerce");
  expect(resolveAdminHref("/admin", "/popups")).toBe("/admin/advanced/popups");
  expect(resolveAdminHref("/admin", "/solution-kits")).toBe("/admin/advanced/solution-kits");
  expect(resolveAdminHref("/admin", "/admin/coderso/widgets")).toBe("/admin/advanced/widgets");
});

test("isAdminHrefActive checks canonical and nested matches", () => {
  expect(isAdminHrefActive("/admin", "/admin/advanced/engine", "/admin/content-types/type-1")).toBe(
    true
  );
  expect(isAdminHrefActive("/admin", "/admin/advanced/forms", "/admin/advanced/forms/form-1")).toBe(
    true
  );
  expect(isAdminHrefActive("/admin", "/admin/advanced/widgets", "/admin/advanced/forms")).toBe(
    false
  );
  expect(
    isAdminHrefActive(
      "/admin",
      "/admin/advanced/custom-screens",
      "/admin/advanced/custom-screens/screen-1/entries"
    )
  ).toBe(false);
  expect(
    isAdminHrefActive(
      "/admin",
      "/admin/advanced/custom-screens/screen-1/entries",
      "/admin/advanced/custom-screens/screen-1/entries/entry-1"
    )
  ).toBe(true);
});

test("resolveAdminHref preserves hash and query suffix order", () => {
  expect(resolveAdminHref("/admin", "/pages?view=grid#section")).toBe(
    "/admin/pages?view=grid#section"
  );
  expect(resolveAdminHref("/admin", "/pages#section")).toBe("/admin/pages#section");
});

test("mapNavItems and mapNavSections canonicalize hrefs across items, groups, and trailing items", () => {
  const items = mapNavItems([{ href: "/pages", label: "Pages" }], "/admin");
  expect(items[0]?.href).toBe("/admin/pages");

  const sections = mapNavSections(
    [
      {
        id: "primary",
        items: [{ href: "/forms/abc", label: "Forms" }],
        itemsAfterGroups: [{ href: "/booking", label: "Booking" }],
        groups: [{ label: "Group", items: [{ href: "/reviews", label: "Reviews" }] }],
      },
      { id: "empty" },
    ],
    "/admin"
  );

  expect(sections[0]?.items?.[0]?.href).toBe("/admin/advanced/forms/abc");
  expect(sections[0]?.itemsAfterGroups?.[0]?.href).toBe("/admin/advanced/booking");
  expect(sections[0]?.groups?.[0]?.items[0]?.href).toBe("/admin/advanced/reviews");
  expect(sections[1]?.items).toBeUndefined();
  expect(sections[1]?.itemsAfterGroups).toBeUndefined();
  expect(sections[1]?.groups).toBeUndefined();
});

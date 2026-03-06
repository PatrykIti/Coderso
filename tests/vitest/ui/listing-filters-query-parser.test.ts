import { expect, test } from "vitest";

import { extractListingQueryIdFromQueryString } from "../../../core/admin/ui/listings/ListingFiltersPage";

test("extractListingQueryIdFromQueryString returns id from valid token", () => {
  expect(
    extractListingQueryIdFromQueryString("lq.listing-query-1.status.eq=published")
  ).toBe("listing-query-1");
});

test("extractListingQueryIdFromQueryString supports leading question mark", () => {
  expect(
    extractListingQueryIdFromQueryString("?lq.listing-query-2.__q=about")
  ).toBe("listing-query-2");
});

test("extractListingQueryIdFromQueryString returns null for mixed query ids", () => {
  expect(
    extractListingQueryIdFromQueryString(
      "lq.listing-a.__q=about&lq.listing-b.status.eq=published"
    )
  ).toBeNull();
});

test("extractListingQueryIdFromQueryString returns null when no listing tokens", () => {
  expect(extractListingQueryIdFromQueryString("status=published")).toBeNull();
});

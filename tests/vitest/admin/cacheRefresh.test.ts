import { expect, test } from "vitest";

import { resolveCacheRefreshBackground } from "../../../core/admin/utils/cacheRefresh";

test("resolveCacheRefreshBackground respects explicit override", () => {
  expect(
    resolveCacheRefreshBackground({
      explicitBackground: true,
      hasHydrated: false,
    })
  ).toBe(true);

  expect(
    resolveCacheRefreshBackground({
      explicitBackground: false,
      hasHydrated: true,
    })
  ).toBe(false);
});

test("resolveCacheRefreshBackground falls back to hydration state", () => {
  expect(
    resolveCacheRefreshBackground({
      hasHydrated: true,
    })
  ).toBe(true);

  expect(
    resolveCacheRefreshBackground({
      hasHydrated: false,
    })
  ).toBe(false);
});

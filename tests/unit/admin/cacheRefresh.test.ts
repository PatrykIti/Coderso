import { expect, test } from "bun:test";

import { resolveCacheRefreshBackground } from "../../../core/admin/utils/cacheRefresh";

test("resolveCacheRefreshBackground respects explicit override", () => {
  expect(
    resolveCacheRefreshBackground({
      explicitBackground: true,
      hasHydrated: false,
    })
  ).toBeTrue();

  expect(
    resolveCacheRefreshBackground({
      explicitBackground: false,
      hasHydrated: true,
    })
  ).toBeFalse();
});

test("resolveCacheRefreshBackground falls back to hydration state", () => {
  expect(
    resolveCacheRefreshBackground({
      hasHydrated: true,
    })
  ).toBeTrue();

  expect(
    resolveCacheRefreshBackground({
      hasHydrated: false,
    })
  ).toBeFalse();
});


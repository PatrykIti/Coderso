import { expect, test } from "vitest";

import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "../../../core/admin/utils/cacheRefresh";
import { resolveCommerceListMountRefreshOptions } from "../../../core/admin/ui/commerce/hooks/useCommerceCatalog";

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

test("resolveListMountRefreshOptions forces only missing-cache mounts", () => {
  expect(resolveListMountRefreshOptions(true)).toEqual({
    force: false,
    background: true,
  });
  expect(resolveListMountRefreshOptions(false)).toEqual({
    force: true,
    background: false,
  });
});

test("commerce catalog list mount options reuse shared cache refresh policy", () => {
  expect(resolveCommerceListMountRefreshOptions(true)).toEqual({
    force: false,
    background: true,
  });
  expect(resolveCommerceListMountRefreshOptions(false)).toEqual({
    force: true,
    background: false,
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const all: Record<string, ReturnType<typeof vi.fn>> = {};
  const make = (name: string) => {
    const fn = vi.fn();
    all[name] = fn;
    return fn;
  };
  return {
    all,
    listContentTypesCached: make("listContentTypesCached"),
    getContentTypeCollectionWorkspaceCached: make("getContentTypeCollectionWorkspaceCached"),
    getDetailPageCached: make("getDetailPageCached"),
    listAllEntriesCached: make("listAllEntriesCached"),
    listEntriesCached: make("listEntriesCached"),
    listMenusCached: make("listMenusCached"),
    listMediaCached: make("listMediaCached"),
    listPagesCached: make("listPagesCached"),
    listFormsCached: make("listFormsCached"),
    listBookingBlackoutsCached: make("listBookingBlackoutsCached"),
    listBookingReservationsCached: make("listBookingReservationsCached"),
    listBookingResourcesCached: make("listBookingResourcesCached"),
    listBookingServicesCached: make("listBookingServicesCached"),
    listListingQueriesCached: make("listListingQueriesCached"),
    listListingTemplatesCached: make("listListingTemplatesCached"),
    listCommerceCollectionsCached: make("listCommerceCollectionsCached"),
    listCommerceProductsCached: make("listCommerceProductsCached"),
    listPopupsCached: make("listPopupsCached"),
    listReviewsCached: make("listReviewsCached"),
    listSolutionKitRunsCached: make("listSolutionKitRunsCached"),
    listSolutionKitsCached: make("listSolutionKitsCached"),
    listAdminThemeProfilesCached: make("listAdminThemeProfilesCached"),
    listAdminThemeTemplatesCached: make("listAdminThemeTemplatesCached"),
    getOverviewCached: make("getOverviewCached"),
    getTopContentCached: make("getTopContentCached"),
    getTopPagesCached: make("getTopPagesCached"),
    getTrafficOverviewCached: make("getTrafficOverviewCached"),
    getBackupScheduleCached: make("getBackupScheduleCached"),
    listBackupsCached: make("listBackupsCached"),
    listImportHistoryCached: make("listImportHistoryCached"),
    listRedirectsCached: make("listRedirectsCached"),
    listRecentSearchesCached: make("listRecentSearchesCached"),
    listSeoCached: make("listSeoCached"),
    getSettingsCached: make("getSettingsCached"),
    getSiteSettingsCached: make("getSiteSettingsCached"),
    listPageTemplatesCached: make("listPageTemplatesCached"),
    prefetchCustomScreenWorkspaceData: make("prefetchCustomScreenWorkspaceData"),
    prefetchCustomScreenListData: make("prefetchCustomScreenListData"),
  };
});

vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: mocks.listContentTypesCached,
  getContentTypeCollectionWorkspaceCached: mocks.getContentTypeCollectionWorkspaceCached,
}));
vi.mock("@/services/detailPagesClient", () => ({
  getDetailPageCached: mocks.getDetailPageCached,
}));
vi.mock("@/services/entriesClient", () => ({
  listAllEntriesCached: mocks.listAllEntriesCached,
  listEntriesCached: mocks.listEntriesCached,
}));
vi.mock("@/services/menusClient", () => ({ listMenusCached: mocks.listMenusCached }));
vi.mock("@/services/mediaClient", () => ({ listMediaCached: mocks.listMediaCached }));
vi.mock("@/services/pagesClient", () => ({ listPagesCached: mocks.listPagesCached }));
vi.mock("@/services/formsClient", () => ({ listFormsCached: mocks.listFormsCached }));
vi.mock("@/services/bookingClient", () => ({
  listBookingBlackoutsCached: mocks.listBookingBlackoutsCached,
  listBookingReservationsCached: mocks.listBookingReservationsCached,
  listBookingResourcesCached: mocks.listBookingResourcesCached,
  listBookingServicesCached: mocks.listBookingServicesCached,
}));
vi.mock("@/services/listingsClient", () => ({
  listListingQueriesCached: mocks.listListingQueriesCached,
  listListingTemplatesCached: mocks.listListingTemplatesCached,
}));
vi.mock("@/services/commerceClient", () => ({
  listCommerceCollectionsCached: mocks.listCommerceCollectionsCached,
  listCommerceProductsCached: mocks.listCommerceProductsCached,
}));
vi.mock("@/services/popupsClient", () => ({ listPopupsCached: mocks.listPopupsCached }));
vi.mock("@/services/reviewsClient", () => ({ listReviewsCached: mocks.listReviewsCached }));
vi.mock("@/services/solutionKitsClient", () => ({
  listSolutionKitRunsCached: mocks.listSolutionKitRunsCached,
  listSolutionKitsCached: mocks.listSolutionKitsCached,
}));
vi.mock("@/services/adminThemeClient", () => ({
  listAdminThemeProfilesCached: mocks.listAdminThemeProfilesCached,
  listAdminThemeTemplatesCached: mocks.listAdminThemeTemplatesCached,
}));
vi.mock("@/services/analyticsClient", () => ({
  getOverviewCached: mocks.getOverviewCached,
  getTopContentCached: mocks.getTopContentCached,
  getTopPagesCached: mocks.getTopPagesCached,
  getTrafficOverviewCached: mocks.getTrafficOverviewCached,
}));
vi.mock("@/services/backupsClient", () => ({
  getBackupScheduleCached: mocks.getBackupScheduleCached,
  listBackupsCached: mocks.listBackupsCached,
}));
vi.mock("@/services/importExportClient", () => ({
  listImportHistoryCached: mocks.listImportHistoryCached,
}));
vi.mock("@/services/redirectsClient", () => ({ listRedirectsCached: mocks.listRedirectsCached }));
vi.mock("@/services/searchClient", () => ({
  listRecentSearchesCached: mocks.listRecentSearchesCached,
}));
vi.mock("@/services/seoClient", () => ({ listSeoCached: mocks.listSeoCached }));
vi.mock("@/services/settingsClient", () => ({ getSettingsCached: mocks.getSettingsCached }));
vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettingsCached: mocks.getSiteSettingsCached,
}));
vi.mock("@/services/pageTemplatesClient", () => ({
  listPageTemplatesCached: mocks.listPageTemplatesCached,
}));
vi.mock("@/utils/adminPrefetchCustomScreens", () => ({
  prefetchCustomScreenWorkspaceData: mocks.prefetchCustomScreenWorkspaceData,
  prefetchCustomScreenListData: mocks.prefetchCustomScreenListData,
}));

import {
  createAdminPrefetcher,
  prefetchAdminRoute,
  resolveCollectionWorkspacePrefetchTarget,
  resolveDetailTemplatePrefetchTarget,
} from "../../../core/admin/utils/adminPrefetch";

const withWindow = async (fn: () => Promise<void> | void) => {
  const original = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {};
  try {
    await fn();
  } finally {
    if (original === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = original;
    }
  }
};

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  vi.resetAllMocks();
  for (const fn of Object.values(mocks.all)) {
    fn.mockResolvedValue(undefined);
  }
});

describe("default route prefetch entries", () => {
  test("warms every default entry's caches", async () => {
    await withWindow(async () => {
      prefetchAdminRoute("/pages", "/admin");
      prefetchAdminRoute("/advanced/page-templates", "/admin");
      prefetchAdminRoute("/advanced/engine", "/admin");
      prefetchAdminRoute("/advanced/entries", "/admin");
      prefetchAdminRoute("/advanced/forms", "/admin");
      prefetchAdminRoute("/advanced/listings", "/admin");
      prefetchAdminRoute("/advanced/filters", "/admin");
      prefetchAdminRoute("/advanced/search", "/admin");
      prefetchAdminRoute("/advanced/booking", "/admin");
      prefetchAdminRoute("/advanced/commerce", "/admin");
      prefetchAdminRoute("/advanced/popups", "/admin");
      prefetchAdminRoute("/advanced/reviews", "/admin");
      prefetchAdminRoute("/advanced/solution-kits", "/admin");
      prefetchAdminRoute("/menus", "/admin");
      prefetchAdminRoute("/media", "/admin");
      prefetchAdminRoute("/themes", "/admin");
      prefetchAdminRoute("/search", "/admin");
      prefetchAdminRoute("/seo", "/admin");
      prefetchAdminRoute("/analytics", "/admin");
      prefetchAdminRoute("/backups", "/admin");
      prefetchAdminRoute("/tools/import-export", "/admin");
      prefetchAdminRoute("/redirects", "/admin");
      prefetchAdminRoute("/settings/site", "/admin");
      prefetchAdminRoute("/settings/general", "/admin");
      await flushAsync();
      expect(mocks.listPagesCached).toHaveBeenCalled();
      expect(mocks.listPageTemplatesCached).toHaveBeenCalled();
      expect(mocks.listContentTypesCached).toHaveBeenCalled();
      expect(mocks.listAllEntriesCached).toHaveBeenCalled();
      expect(mocks.listFormsCached).toHaveBeenCalled();
      expect(mocks.listListingQueriesCached).toHaveBeenCalled();
      expect(mocks.listListingTemplatesCached).toHaveBeenCalled();
      expect(mocks.listBookingResourcesCached).toHaveBeenCalled();
      expect(mocks.listBookingServicesCached).toHaveBeenCalled();
      expect(mocks.listBookingReservationsCached).toHaveBeenCalled();
      expect(mocks.listBookingBlackoutsCached).toHaveBeenCalled();
      expect(mocks.listCommerceProductsCached).toHaveBeenCalled();
      expect(mocks.listCommerceCollectionsCached).toHaveBeenCalled();
      expect(mocks.listPopupsCached).toHaveBeenCalled();
      expect(mocks.listReviewsCached).toHaveBeenCalled();
      expect(mocks.listSolutionKitsCached).toHaveBeenCalled();
      expect(mocks.listSolutionKitRunsCached).toHaveBeenCalled();
      expect(mocks.listMenusCached).toHaveBeenCalled();
      expect(mocks.listMediaCached).toHaveBeenCalled();
      expect(mocks.listAdminThemeTemplatesCached).toHaveBeenCalled();
      expect(mocks.listAdminThemeProfilesCached).toHaveBeenCalled();
      expect(mocks.listRecentSearchesCached).toHaveBeenCalled();
      expect(mocks.listSeoCached).toHaveBeenCalled();
      expect(mocks.getOverviewCached).toHaveBeenCalled();
      expect(mocks.getTopContentCached).toHaveBeenCalled();
      expect(mocks.getTrafficOverviewCached).toHaveBeenCalled();
      expect(mocks.getTopPagesCached).toHaveBeenCalled();
      expect(mocks.listBackupsCached).toHaveBeenCalled();
      expect(mocks.getBackupScheduleCached).toHaveBeenCalled();
      expect(mocks.listImportHistoryCached).toHaveBeenCalled();
      expect(mocks.listRedirectsCached).toHaveBeenCalled();
      expect(mocks.getSiteSettingsCached).toHaveBeenCalled();
      expect(mocks.getSettingsCached).toHaveBeenCalled();
    });
  });

  test("prefetches the detail template editor pipeline", async () => {
    mocks.getContentTypeCollectionWorkspaceCached.mockRejectedValueOnce(new Error("boom"));
    mocks.getDetailPageCached.mockResolvedValueOnce({ contentTypeSlug: "products" });
    await withWindow(async () => {
      prefetchAdminRoute("/advanced/engine/ct-1/collection/detail-template/dp-1", "/admin");
      await flushAsync();
      expect(mocks.getContentTypeCollectionWorkspaceCached).toHaveBeenCalled();
      expect(mocks.getDetailPageCached).toHaveBeenCalled();
      expect(mocks.listEntriesCached).toHaveBeenCalledWith("products", { force: false });
    });
  });

  test("skips entry prefetch when the detail page has no slug", async () => {
    mocks.getContentTypeCollectionWorkspaceCached.mockRejectedValueOnce(new Error("boom"));
    mocks.getDetailPageCached.mockResolvedValueOnce({ detailPageId: "dp-1" });
    await withWindow(async () => {
      prefetchAdminRoute("/advanced/engine/ct-1/collection/detail-template/dp-2", "/admin");
      await flushAsync();
      expect(mocks.listEntriesCached).not.toHaveBeenCalled();
    });
  });

  test("prefetches the detail template editor when the detail page lookup fails", async () => {
    mocks.getDetailPageCached.mockRejectedValueOnce(new Error("boom"));
    await withWindow(async () => {
      prefetchAdminRoute("/advanced/engine/ct-1/collection/detail-template/dp-3", "/admin");
      await flushAsync();
      expect(mocks.getDetailPageCached).toHaveBeenCalled();
      expect(mocks.listEntriesCached).not.toHaveBeenCalled();
    });
  });

  test("prefetches the collection workspace pipeline", async () => {
    mocks.getContentTypeCollectionWorkspaceCached.mockRejectedValueOnce(new Error("boom"));
    await withWindow(async () => {
      prefetchAdminRoute("/advanced/engine/ct-1/collection", "/admin");
      await flushAsync();
      expect(mocks.listContentTypesCached).toHaveBeenCalled();
      expect(mocks.getContentTypeCollectionWorkspaceCached).toHaveBeenCalledWith("ct-1", {
        force: false,
      });
    });
  });

  test("prefetches a custom screen workspace target", async () => {
    await withWindow(async () => {
      prefetchAdminRoute("/advanced/custom-screens/scr-1/entries/e-9", "/admin");
      await flushAsync();
      expect(mocks.prefetchCustomScreenWorkspaceData).toHaveBeenCalledWith(
        "/advanced/custom-screens/scr-1/entries/e-9",
        { force: false }
      );
    });
  });

  test("prefetches the custom screens list for a non-workspace path", async () => {
    await withWindow(async () => {
      prefetchAdminRoute("/advanced/custom-screens", "/admin");
      await flushAsync();
      expect(mocks.prefetchCustomScreenListData).toHaveBeenCalledWith({ force: false });
    });
  });
});

describe("prefetcher runtime behavior", () => {
  test("schedules through requestIdleCallback when available", async () => {
    const original = (globalThis as { window?: unknown }).window;
    let idleRan = false;
    (globalThis as { window?: unknown }).window = {
      requestIdleCallback: (callback: () => void) => {
        idleRan = true;
        callback();
      },
    };
    const run = vi.fn();
    const prefetch = createAdminPrefetcher([{ match: "/idle", run }]);
    try {
      prefetch("/idle", "/admin");
      await flushAsync();
      expect(idleRan).toBe(true);
      expect(run).toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = original;
      }
    }
  });

  test("swallows run failures", async () => {
    const run = vi.fn().mockRejectedValue(new Error("prefetch failed"));
    const prefetch = createAdminPrefetcher([{ match: "/boom", run }]);
    await withWindow(async () => {
      prefetch("/boom", "/admin");
      await flushAsync();
      expect(run).toHaveBeenCalled();
    });
  });

  test("dedupes a queued key before it drains", async () => {
    const run = vi.fn();
    const prefetch = createAdminPrefetcher([{ match: "/items", run }], {
      cooldownMs: 0,
      schedule: (callback) => setTimeout(callback, 0),
    });
    await withWindow(async () => {
      prefetch("/items", "/admin");
      prefetch("/items", "/admin");
      await flushAsync();
      expect(run).toHaveBeenCalledTimes(1);
    });
  });

  test("skips a key inside its fresh window", async () => {
    const run = vi.fn();
    const prefetch = createAdminPrefetcher([{ match: "/fresh", run }], {
      schedule: (callback) => setTimeout(callback, 0),
    });
    await withWindow(async () => {
      prefetch("/fresh", "/admin");
      await flushAsync();
      prefetch("/fresh", "/admin");
      await flushAsync();
      expect(run).toHaveBeenCalledTimes(1);
    });
  });

  test("skips prefetching when the active entry matches and has no resolve key", async () => {
    await withWindow(async () => {
      prefetchAdminRoute("/pages", "/admin", { activeHref: "/admin/pages/123" });
      await flushAsync();
      expect(mocks.listPagesCached).not.toHaveBeenCalled();
    });
  });

  test("ignores empty and external hrefs", async () => {
    await withWindow(async () => {
      prefetchAdminRoute("");
      prefetchAdminRoute("https://example.com/x");
      await flushAsync();
      expect(mocks.listPagesCached).not.toHaveBeenCalled();
    });
  });
});

describe("workspace target decode fallbacks", () => {
  test("collection target falls back to the raw id on malformed encoding", () => {
    expect(resolveCollectionWorkspacePrefetchTarget("/advanced/engine/%zz/collection")).toEqual({
      contentTypeId: "%zz",
    });
  });

  test("detail template target falls back to raw ids on malformed encoding", () => {
    expect(
      resolveDetailTemplatePrefetchTarget("/advanced/engine/%zz/collection/detail-template/%yy")
    ).toEqual({ contentTypeId: "%zz", detailPageId: "%yy" });
  });

  test("valid targets decode percent-encoding", () => {
    expect(
      resolveCollectionWorkspacePrefetchTarget("/advanced/engine/blog%20post/collection")
    ).toEqual({ contentTypeId: "blog post" });
    expect(
      resolveDetailTemplatePrefetchTarget(
        "/advanced/engine/blog%20post/collection/detail-template/dp%201"
      )
    ).toEqual({ contentTypeId: "blog post", detailPageId: "dp 1" });
  });
});

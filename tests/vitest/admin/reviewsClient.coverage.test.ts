import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    resetLocalCache: () => {
      localCacheStore.clear();
    },
    primeLocalCache: (key: string, value: unknown) => {
      localCacheStore.set(key, value);
    },
    readLocalCacheValue: (key: string) => localCacheStore.get(key) ?? null,
  };
});

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("@/utils/storageCache", () => ({
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  createMemoryBackedLocalCache: () => ({
    read: readLocalCache,
    write: writeLocalCache,
    clear: clearLocalCache,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearReviewsCache,
  createReview,
  deleteReview,
  getCachedReview,
  getCachedReviews,
  getReview,
  getReviewCached,
  listReviews,
  listReviewsCached,
  updateReview,
  updateReviewStatus,
} from "../../../core/admin/services/reviewsClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const review = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "review-1",
  entityType: "listing",
  entityId: "listing-1",
  status: "pending",
  rating: 5,
  title: "Great",
  body: "Loved it",
  authorName: "Patryk",
  authorEmail: "test@example.com",
  metadata: {},
  moderatedBy: null,
  moderatedAt: null,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  publishedAt: null,
  ...overrides,
});

const json = (init: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  ...init,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  readLocalCache.mockImplementation(
    (key: string, _ttlMs: number, validate?: (value: unknown) => boolean) => {
      const value = readLocalCacheValue(key);
      if (value === null) return null;
      if (validate && !validate(value)) return null;
      return value;
    }
  );
  writeLocalCache.mockImplementation((key: string, value: unknown) => {
    primeLocalCache(key, value);
  });
  clearLocalCache.mockImplementation((key: string) => {
    primeLocalCache(key, undefined);
  });
  clearReviewsCache();
});

describe("reviews cache helpers", () => {
  test("getCachedReviews hydrates from local cache and returns null on miss", () => {
    expect(getCachedReviews()).toBeNull();
    writeLocalCache(cacheKeys.reviewsList, [review()]);
    expect(getCachedReviews()).toEqual([review()]);
    expect(getCachedReviews()).toEqual([review()]);
  });

  test("getCachedReview prefers memory then the detail cache", () => {
    writeLocalCache(cacheKeys.reviewsList, [review({ id: "review-1" })]);
    writeLocalCache(cacheKeys.reviewDetail("review-2"), review({ id: "review-2" }));
    getCachedReviews();
    expect(getCachedReview("review-1")).toEqual(review({ id: "review-1" }));
    expect(getCachedReview("review-2")).toEqual(review({ id: "review-2" }));
    expect(getCachedReview("review-3")).toBeNull();
  });

  test("clearReviewsCache drops the in-memory state and local key", () => {
    writeLocalCache(cacheKeys.reviewsList, [review()]);
    getCachedReviews();
    clearReviewsCache();
    expect(getCachedReviews()).toBeNull();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.reviewsList);
  });
});

describe("review lists", () => {
  test("listReviews builds query strings and defaults items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listReviews()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/reviews", { method: "GET" });

    apiRequest.mockResolvedValueOnce({ items: [review()] });
    await expect(
      listReviews({
        entityType: " listing ",
        entityId: " listing-1 ",
        status: "approved",
        limit: 25.6,
        offset: 0,
      })
    ).resolves.toEqual([review()]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/reviews?entityType=listing&entityId=listing-1&status=approved&limit=25&offset=0",
      { method: "GET" }
    );
  });

  test("listReviews skips invalid params and handles blank strings", async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });
    await expect(
      listReviews({ entityType: "   ", entityId: "", status: undefined, limit: 0, offset: -1 })
    ).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/reviews", { method: "GET" });
  });

  test("listReviewsCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.reviewsList, [review()]);
    await expect(listReviewsCached()).resolves.toEqual([review()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearReviewsCache();

    apiRequest.mockResolvedValueOnce({ items: [review()] });
    const first = listReviewsCached();
    const second = listReviewsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[review()], [review()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.reviewsList, [review()]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.reviewDetail("review-1"), review());

    apiRequest.mockResolvedValueOnce({ items: [review({ id: "review-9" })] });
    await expect(listReviewsCached({ force: true })).resolves.toEqual([review({ id: "review-9" })]);
  });
});

describe("review detail", () => {
  test("getReview fetches a single review", async () => {
    apiRequest.mockResolvedValueOnce(review());
    await expect(getReview("review-1")).resolves.toEqual(review());
    expect(apiRequest).toHaveBeenCalledWith("/reviews/review-1", { method: "GET" });
  });

  test("getReviewCached reads memory/detail cache and upserts on fetch", async () => {
    writeLocalCache(cacheKeys.reviewsList, [review({ rating: 5 })]);
    getCachedReviews();
    expect(getCachedReview("review-1")).toEqual(review({ rating: 5 }));
    await expect(getReviewCached("review-1")).resolves.toEqual(review({ rating: 5 }));
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce(review({ rating: 3 }));
    await expect(getReviewCached("review-1", { force: true })).resolves.toEqual(
      review({ rating: 3 })
    );
    expect(getCachedReviews()).toEqual([review({ rating: 3 })]);
  });

  test("getReviewCached falls back to the list on fetch failure", async () => {
    apiRequest.mockRejectedValueOnce({ code: "review_not_found", status: 404 });
    apiRequest.mockResolvedValueOnce({ items: [review(), review({ id: "review-2" })] });
    await expect(getReviewCached("review-2")).resolves.toEqual(review({ id: "review-2" }));
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.reviewDetail("review-2"),
      review({ id: "review-2" })
    );

    apiRequest.mockRejectedValueOnce({ code: "review_not_found", status: 404 });
    apiRequest.mockResolvedValueOnce({ items: [review()] });
    await expect(getReviewCached("review-404")).resolves.toBeNull();
  });
});

describe("review mutations", () => {
  test("createReview posts with CSRF, upserts and broadcasts", async () => {
    const created = review();
    apiRequest.mockResolvedValueOnce(created);
    await createReview({
      entityType: "listing",
      entityId: "listing-1",
      rating: 5,
      authorName: "Patryk",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/reviews",
      json({
        method: "POST",
        body: JSON.stringify({
          entityType: "listing",
          entityId: "listing-1",
          rating: 5,
          authorName: "Patryk",
        }),
      }),
      { withCsrf: true }
    );
    expect(getCachedReviews()).toEqual([created]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.reviewsList,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.reviewDetail(created.id),
      action: "update",
    });
  });

  test("upsertCachedReview sorts by createdAt and merges existing entries", async () => {
    writeLocalCache(cacheKeys.reviewsList, [
      review({ id: "review-old", createdAt: "2026-01-01T00:00:00.000Z" }),
      review({ id: "review-new", createdAt: "2026-03-01T00:00:00.000Z" }),
    ]);
    apiRequest.mockResolvedValueOnce(review({ rating: 1 }));
    await updateReview("review-1", { rating: 1 });
    const cached = getCachedReviews();
    expect(cached?.[0]?.id).toBe("review-new");
    expect(cached?.[1]?.id).toBe("review-1");
  });

  test("updateReview patches and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(review({ rating: 4 }));
    await updateReview("review-1", { rating: 4 });
    expect(apiRequest).toHaveBeenCalledWith(
      "/reviews/review-1",
      json({ method: "PATCH", body: JSON.stringify({ rating: 4 }) }),
      { withCsrf: true }
    );
    expect(getCachedReview("review-1")).toEqual(review({ rating: 4 }));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.reviewsList,
      action: "update",
    });
  });

  test("updateReviewStatus patches status and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(review({ status: "approved" }));
    await updateReviewStatus("review-1", "approved");
    expect(apiRequest).toHaveBeenCalledWith(
      "/reviews/review-1/status",
      json({ method: "PATCH", body: JSON.stringify({ status: "approved" }) }),
      { withCsrf: true }
    );
    expect(getCachedReview("review-1")).toEqual(review({ status: "approved" }));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.reviewDetail("review-1"),
      action: "update",
    });
  });

  test("deleteReview removes the entry and broadcasts", async () => {
    writeLocalCache(cacheKeys.reviewsList, [review(), review({ id: "review-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteReview("review-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/reviews/review-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedReviews()).toEqual([review({ id: "review-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.reviewDetail("review-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.reviewsList,
      action: "invalidate",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.reviewDetail("review-1"),
      action: "invalidate",
    });
  });

  test("deleteReview with falsy response skips invalidation", async () => {
    apiRequest.mockResolvedValueOnce(undefined);
    await deleteReview("review-1");
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });
});

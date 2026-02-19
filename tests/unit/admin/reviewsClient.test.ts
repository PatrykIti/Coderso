import { expect, test } from "bun:test";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  clearReviewsCache,
  listReviews,
  listReviewsCached,
  updateReviewStatus,
} from "../../../core/admin/services/reviewsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("listReviews hits GET /reviews", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearReviewsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listReviews();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/reviews");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
    clearReviewsCache();
  }
});

test("listReviewsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearReviewsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.reviewsList,
      JSON.stringify({
        value: [
          {
            id: "review-1",
            entityType: "service",
            entityId: "svc-1",
            status: "pending",
            rating: 5,
            title: "Great",
            body: "Fast and professional",
            authorName: "Alice",
            authorEmail: "alice@example.com",
            metadata: {},
            moderatedBy: null,
            moderatedAt: null,
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
            publishedAt: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listReviewsCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.authorName).toBe("Alice");
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearReviewsCache();
  }
});

test("updateReviewStatus patches moderation route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearReviewsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "review-1",
      entityType: "service",
      entityId: "svc-1",
      status: "approved",
      rating: 5,
      title: "Great",
      body: "Fast and professional",
      authorName: "Alice",
      authorEmail: "alice@example.com",
      metadata: {},
      moderatedBy: "admin-1",
      moderatedAt: "2026-02-19T00:00:00.000Z",
      createdAt: "2026-02-19T00:00:00.000Z",
      updatedAt: "2026-02-19T00:00:00.000Z",
      publishedAt: "2026-02-19T00:00:00.000Z",
    });
  };

  try {
    resetCsrfToken();
    await updateReviewStatus("review-1", "approved");

    expect(calls[1]?.input).toBe("/admin/api/reviews/review-1/status");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
    clearReviewsCache();
  }
});
